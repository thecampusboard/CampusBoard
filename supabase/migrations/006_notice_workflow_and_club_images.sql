-- ============================================================================
-- CampusBoard — student notice submissions, club-notice relationship,
-- custom club images, and a few audit-driven hardening fixes.
--
-- Safe to run on top of 001-005. Nothing here touches existing rows in a
-- breaking way: every new notices column defaults such that pre-existing
-- (Admin-authored) notices stay exactly as public as they are today.
--
-- Run this once, in full, in the Supabase SQL Editor (or via the CLI) —
-- there is nothing to edit or re-run in 001-005.
--
-- Contents:
--   1. notices — add status/club_id/rejection_reason/reviewed_by/reviewed_at,
--      re-scope RLS so pending/rejected notices are only visible to their
--      author and Admin, and add a student-submission RLS path enforced
--      entirely in Postgres (not the client).
--   1b. notice-files storage — a scoped write policy so a student can attach
--      a file to their own notice submission (the column already existed,
--      nothing wrote to it).
--   2. clubs — add image_path (Admin-only custom club image, stored in the
--      existing public `content-images` bucket — no new bucket needed).
--   3. Storage hardening — file size / MIME-type limits on the buckets that
--      accept uploads (club/listing photos, payment screenshots, notice
--      files), found missing during the audit.
--   4. analytics_events — remove the raw client-insert policy. Every insert
--      now has to go through record_analytics_event()/reveal_seller_phone()
--      (both SECURITY DEFINER, so they still work fine) — closes a gap
--      where a direct PostgREST insert could write analytics rows for
--      entities that don't exist, or event_type/entity_type combinations
--      record_analytics_event() itself would reject, inflating the Admin
--      dashboard's counts.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. notices — approval workflow
-- ----------------------------------------------------------------------------
create type notice_status as enum ('pending', 'approved', 'rejected');

alter table public.notices
  add column status notice_status not null default 'approved',
  add column club_id text references public.clubs (id) on delete set null,
  add column rejection_reason text,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index notices_status_idx on public.notices (status);
create index notices_club_idx on public.notices (club_id);
create index notices_created_by_idx on public.notices (created_by);

-- Existing rows (all Admin-authored, under the old admin-only-write model)
-- default to 'approved' above, so nothing that's public today becomes
-- hidden by this migration.

-- Re-scope who can SELECT a notice: everyone can see approved notices, the
-- author can always see their own (whatever status), and Admin sees
-- everything. Postgres ORs permissive policies together, so this is
-- strictly wider than "approved only" for the two extra cases, and
-- strictly narrower than the old `using (true)` for a public/anon caller.
drop policy notices_select_public on public.notices;

create policy notices_select_approved on public.notices
  for select to anon, authenticated
  using (status = 'approved');

create policy notices_select_own on public.notices
  for select to authenticated
  using (created_by = auth.uid());

create policy notices_select_admin on public.notices
  for select to authenticated
  using (public.is_admin());

-- notices_admin_write (insert, is_admin() only) already exists from 001 and
-- is untouched — Admin can still insert a notice at any status, defaulting
-- to 'approved' so Admin-authored notices keep publishing immediately.

-- New: a student may insert their OWN notice, but only ever landing at
-- 'pending' — never 'approved'/'rejected', and never with review fields
-- already set. This is the entire server-side enforcement of "students
-- cannot self-approve" and "cannot impersonate another owner"; the React
-- form has no say in it.
create policy notices_student_insert on public.notices
  for insert to authenticated
  with check (
    not public.is_admin()
    and created_by = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

-- Deliberately NO update policy for non-admins: only notices_admin_update
-- (from 001, unchanged) can UPDATE a notices row, at all. A student can
-- create their own pending submission and later delete it while it's still
-- pending (below), but cannot edit it, cannot touch another student's row,
-- and cannot flip status/club_id/anything else themselves — there is no
-- policy path that would let them, regardless of what the client sends.

-- Let a student withdraw their own submission while it's still awaiting
-- review (existing notices_admin_delete from 001 already covers Admin).
create policy notices_delete_own_pending on public.notices
  for delete to authenticated
  using (created_by = auth.uid() and status = 'pending');

-- Server-side review bookkeeping — runs on the UPDATE path, which only
-- Admin can reach (see above), but kept as its own trigger (mirroring
-- enforce_listing_transition's style) so the reviewed_by/reviewed_at
-- columns are always consistent no matter which client/tool performs the
-- update, and so a rejection can never be saved without a reason.
create or replace function public.enforce_notice_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed.';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'approved' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
      new.rejection_reason := null;
    elsif new.status = 'rejected' then
      if new.rejection_reason is null or btrim(new.rejection_reason) = '' then
        raise exception 'Provide a rejection reason.';
      end if;
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    elsif new.status = 'pending' then
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.rejection_reason := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger notices_guard_review
  before update on public.notices
  for each row execute function public.enforce_notice_review();

-- ----------------------------------------------------------------------------
-- 1b. notice-files — let a student attach a file to their OWN notice
-- submission. The bucket was already public-read + Admin-write (002); this
-- adds a narrowly-scoped student write path, same convention already used
-- for listing-images: the first path segment must be the caller's own uid,
-- so a student can never write into another student's (or Admin's) prefix.
-- `notices.file_path` already existed as a column since 001 but nothing in
-- the app ever read or wrote it — found during the audit.
-- ----------------------------------------------------------------------------
create policy notice_files_owner_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'notice-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy notice_files_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'notice-files'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- The original public-read policy (002) let anyone read any object in this
-- bucket regardless of the owning notice's status. That was fine when only
-- Admin could write here (every notice was public by definition), but now a
-- student's pending/rejected submission can have a file attached too — its
-- row is hidden by notices RLS, but the file itself was still fetchable by
-- anyone who had (or guessed) the URL. Re-scope read access to match the
-- notice it belongs to.
drop policy notice_files_read on storage.objects;

create policy notice_files_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'notice-files'
    and exists (
      select 1 from public.notices n
      where n.file_path = storage.objects.name
        and (n.status = 'approved' or n.created_by = auth.uid() or public.is_admin())
    )
  );

-- ----------------------------------------------------------------------------
-- 2. clubs — custom image
-- Reuses the existing public `content-images` bucket and its Admin-only
-- write / public-read policies from 002_storage.sql — no new bucket, no new
-- storage policy needed. Path convention: clubs/{clubId}/{filename}.
-- ----------------------------------------------------------------------------
alter table public.clubs add column image_path text;

-- ----------------------------------------------------------------------------
-- 3. Storage hardening — size/MIME limits found missing during the audit.
-- Guarded behind information_schema checks so this migration doesn't fail
-- outright on a Supabase/Postgres version where these storage.buckets
-- columns don't exist (they're standard on current Supabase projects).
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    update storage.buckets set file_size_limit = 5242880 -- 5 MB
      where id in ('content-images', 'listing-images', 'payment-screenshots');
    update storage.buckets set file_size_limit = 10485760 -- 10 MB, notice PDFs
      where id = 'notice-files';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'allowed_mime_types'
  ) then
    update storage.buckets
      set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      where id in ('content-images', 'listing-images');
    update storage.buckets
      set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
      where id = 'payment-screenshots';
    update storage.buckets
      set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      where id = 'notice-files';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 4. analytics_events — remove the raw insert policy; RPC-only from here.
-- record_analytics_event() and reveal_seller_phone() are both
-- SECURITY DEFINER (see 004/005), so logging still works for every existing
-- caller (including anon, for record_analytics_event) — this only closes
-- off inserting a row directly via PostgREST, bypassing the entity-exists /
-- event-type-matches-entity-type checks those functions already enforce.
-- ----------------------------------------------------------------------------
drop policy analytics_insert_any on public.analytics_events;
