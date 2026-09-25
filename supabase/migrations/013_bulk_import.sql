-- ============================================================================
-- CampusBoard — Admin bulk Excel import
--
-- Notices already have a real approval workflow (status defaults to
-- 'pending' for anything not immediately reviewed — see
-- 006_notice_workflow_and_club_images.sql), so a bulk-imported notice
-- reuses that unchanged: it lands at status = 'pending' and only becomes
-- public once Admin reviews it, exactly like a student submission.
--
-- events/opportunities/clubs have no such concept — every row has always
-- been public the instant it's inserted. Bulk-importing 40 rows of raw
-- spreadsheet data straight onto the live site (before Admin has even
-- opened them once to check/attach images) would be a real regression, so
-- this migration gives those three tables the same "not public yet" idea
-- notices already have, scoped as narrowly as possible:
--
--   1. events/opportunities/clubs get a new `is_draft` column (default
--      false — every existing row, and every row created through the
--      normal "New …" form, is completely unaffected). A row only ever
--      starts `is_draft = true` when the client sets it explicitly, which
--      only the new bulk-import code path does.
--   2. Their public SELECT policy is re-scoped the same way
--      notices_select_approved / notices_select_admin were split in
--      006_notice_workflow_and_club_images.sql: anon/authenticated see
--      `is_draft = false` rows, Admin sees everything (Postgres ORs
--      permissive policies together).
--   3. Saving a draft through the EXISTING edit dialog is what publishes
--      it — enforced in the application layer (updateEvent/updateClub/
--      updateOpportunity in src/lib/content.tsx always set is_draft =
--      false on save), not by anything in this migration. The admin-only
--      INSERT/UPDATE/DELETE policies on these tables are untouched and
--      already cover writing a draft row exactly the same as any other
--      Admin write.
--   4. record_analytics_event() is re-defined (same pattern as
--      004 → 005 → 011) so a draft event/opportunity/club can't rack up a
--      forged "view" via a guessed id before Admin ever publishes it —
--      mirrors the `status = 'approved'` scoping 011 already gave notices
--      and listings.
--
-- Separately, `import_batches` is a small admin-only bookkeeping table
-- used purely to detect "this exact file was already imported" (matched
-- by a client-computed file hash) before a re-upload creates duplicate
-- rows — it does not participate in RLS for any content table and nothing
-- else reads it.
--
-- No schema change is needed for the Admin user list feature: `profiles`
-- already has name/email/role/created_at, and profiles_select_own (from
-- 001_initial_schema.sql, never dropped) already lets an Admin session
-- select every profile row — see README for how that policy is used.
--
-- Safe to run on top of 001-012.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. is_draft columns
-- ----------------------------------------------------------------------------
alter table public.events add column is_draft boolean not null default false;
alter table public.opportunities add column is_draft boolean not null default false;
alter table public.clubs add column is_draft boolean not null default false;

create index events_is_draft_idx on public.events (is_draft);
create index opportunities_is_draft_idx on public.opportunities (is_draft);
create index clubs_is_draft_idx on public.clubs (is_draft);

-- ----------------------------------------------------------------------------
-- 2. Re-scope public SELECT on events/opportunities/clubs.
-- ----------------------------------------------------------------------------
drop policy events_select_public on public.events;

create policy events_select_public on public.events
  for select to anon, authenticated
  using (is_draft = false);

create policy events_select_admin on public.events
  for select to authenticated
  using (public.is_admin());

drop policy opportunities_select_public on public.opportunities;

create policy opportunities_select_public on public.opportunities
  for select to anon, authenticated
  using (is_draft = false);

create policy opportunities_select_admin on public.opportunities
  for select to authenticated
  using (public.is_admin());

drop policy clubs_select_public on public.clubs;

create policy clubs_select_public on public.clubs
  for select to anon, authenticated
  using (is_draft = false);

create policy clubs_select_admin on public.clubs
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. record_analytics_event() — a draft row can't accumulate a forged view
-- count before Admin publishes it. Identical to the 011 version otherwise.
-- ----------------------------------------------------------------------------
create or replace function public.record_analytics_event(
  p_entity_type analytics_entity,
  p_entity_id text,
  p_event_type analytics_event_type
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type = 'contact_reveal' then
    raise exception 'contact_reveal is only recorded by reveal_seller_phone().';
  end if;
  if p_event_type = 'register_click' and p_entity_type is distinct from 'event' then
    raise exception 'register_click only applies to events.';
  end if;
  if p_event_type = 'apply_click' and p_entity_type is distinct from 'opportunity' then
    raise exception 'apply_click only applies to opportunities.';
  end if;

  case p_entity_type
    when 'notice' then
      if not exists (select 1 from public.notices where id = p_entity_id and status = 'approved') then raise exception 'Unknown notice.'; end if;
    when 'event' then
      if not exists (select 1 from public.events where id = p_entity_id and is_draft = false) then raise exception 'Unknown event.'; end if;
    when 'club' then
      if not exists (select 1 from public.clubs where id = p_entity_id and is_draft = false) then raise exception 'Unknown club.'; end if;
    when 'opportunity' then
      if not exists (select 1 from public.opportunities where id = p_entity_id and is_draft = false) then raise exception 'Unknown opportunity.'; end if;
    when 'listing' then
      if not exists (select 1 from public.buy_sell_listings where id = p_entity_id and status = 'approved' and (expires_at is null or expires_at > now())) then raise exception 'Unknown listing.'; end if;
  end case;

  insert into public.analytics_events (entity_type, entity_id, event_type, user_id)
  values (p_entity_type, p_entity_id, p_event_type, auth.uid());

  if p_event_type = 'view' then
    case p_entity_type
      when 'notice' then update public.notices set views = views + 1 where id = p_entity_id and status = 'approved';
      when 'event' then update public.events set views = views + 1 where id = p_entity_id and is_draft = false;
      when 'opportunity' then update public.opportunities set views = views + 1 where id = p_entity_id and is_draft = false;
      when 'listing' then update public.buy_sell_listings set views = views + 1 where id = p_entity_id and status = 'approved' and (expires_at is null or expires_at > now());
      else null;
    end case;
  elsif p_event_type = 'register_click' then
    update public.events set register_clicks = register_clicks + 1 where id = p_entity_id and is_draft = false;
  elsif p_event_type = 'apply_click' then
    update public.opportunities set apply_clicks = apply_clicks + 1 where id = p_entity_id and is_draft = false;
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. import_batches — admin-only bookkeeping so re-uploading the exact same
-- file can be caught and warned on before it creates duplicate rows. Not
-- referenced by any content table; the content rows it produced are found
-- afterwards the same way any other draft/pending row is (is_draft = true /
-- status = 'pending' in the existing Admin list for that content type).
-- ----------------------------------------------------------------------------
create type import_entity as enum ('notices', 'events', 'opportunities', 'clubs');

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  entity_type import_entity not null,
  file_name text not null,
  file_hash text not null,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  imported_rows integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index import_batches_hash_idx on public.import_batches (entity_type, file_hash);

alter table public.import_batches enable row level security;

create policy import_batches_admin_select on public.import_batches
  for select to authenticated
  using (public.is_admin());

create policy import_batches_admin_insert on public.import_batches
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy import_batches_admin_update on public.import_batches
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy import_batches_admin_delete on public.import_batches
  for delete to authenticated
  using (public.is_admin());
