-- ============================================================================
-- CampusBoard — student event & opportunity submissions.
--
-- Mirrors the notices approval workflow introduced in
-- 006_notice_workflow_and_club_images.sql exactly: a student can submit an
-- event or an opportunity, it lands as 'pending', and only becomes visible
-- on the public site once Admin approves it. Admin-authored rows keep
-- publishing immediately (status defaults to 'approved').
--
-- Reuses the existing `notice_status` enum ('pending' | 'approved' |
-- 'rejected') — same three states, no reason for a second type.
--
-- Safe to run on top of 001-016. Every new column defaults such that
-- pre-existing (Admin-authored) events/opportunities stay exactly as public
-- as they are today.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. events — approval workflow
-- ----------------------------------------------------------------------------
alter table public.events
  add column status notice_status not null default 'approved',
  add column rejection_reason text,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index events_status_idx on public.events (status);
create index events_created_by_idx on public.events (created_by);

-- Re-scope public SELECT: approved + not-draft + not-expired (same cutoff as
-- 015_content_expiry.sql), plus the author's own row at any status, plus
-- Admin (events_select_admin from 013, unaffected).
drop policy events_select_public on public.events;

create policy events_select_approved on public.events
  for select to anon, authenticated
  using (
    is_draft = false
    and status = 'approved'
    and coalesce(end_date, date) >= public.content_expiry_cutoff()
  );

create policy events_select_own on public.events
  for select to authenticated
  using (created_by = auth.uid());

-- events_admin_write (insert, from 001) is untouched — Admin can still
-- insert an event at any status, defaulting to 'approved' so Admin-authored
-- events keep publishing immediately.

-- New: a student may insert their OWN event, but only ever landing at
-- 'pending' — never 'approved'/'rejected', never pre-marked as reviewed,
-- and never as a bulk-import draft.
create policy events_student_insert on public.events
  for insert to authenticated
  with check (
    not public.is_admin()
    and created_by = auth.uid()
    and status = 'pending'
    and is_draft = false
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

-- Deliberately NO update policy for non-admins: only events_admin_update
-- (from 001, unchanged) can UPDATE an events row. A student can withdraw
-- their own submission while it's still pending (below), or resubmit by
-- going through the admin-only update path — enforced entirely server-side.
create policy events_delete_own_pending on public.events
  for delete to authenticated
  using (created_by = auth.uid() and status = 'pending');

create or replace function public.enforce_event_review()
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

create trigger events_guard_review
  before update on public.events
  for each row execute function public.enforce_event_review();

-- ----------------------------------------------------------------------------
-- 2. opportunities — identical shape.
-- ----------------------------------------------------------------------------
alter table public.opportunities
  add column status notice_status not null default 'approved',
  add column rejection_reason text,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index opportunities_status_idx on public.opportunities (status);
create index opportunities_created_by_idx on public.opportunities (created_by);

drop policy opportunities_select_public on public.opportunities;

create policy opportunities_select_approved on public.opportunities
  for select to anon, authenticated
  using (
    is_draft = false
    and status = 'approved'
    and deadline >= public.content_expiry_cutoff()
  );

create policy opportunities_select_own on public.opportunities
  for select to authenticated
  using (created_by = auth.uid());

create policy opportunities_student_insert on public.opportunities
  for insert to authenticated
  with check (
    not public.is_admin()
    and created_by = auth.uid()
    and status = 'pending'
    and is_draft = false
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

create policy opportunities_delete_own_pending on public.opportunities
  for delete to authenticated
  using (created_by = auth.uid() and status = 'pending');

create or replace function public.enforce_opportunity_review()
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

create trigger opportunities_guard_review
  before update on public.opportunities
  for each row execute function public.enforce_opportunity_review();
