-- ============================================================================
-- CampusBoard — personal engagement tracking for the student dashboard.
--
-- The redesigned student dashboard shows "Registered events", "Saved
-- opportunities" and "Joined clubs" with real per-user data. None of that
-- existed before this migration (an event's "Register Now" / an
-- opportunity's "Apply Now" is an external link — a Google Form, a
-- portal — CampusBoard itself never recorded who clicked it). These three
-- tables let a signed-in student mark "I'm going" / "save this" / "I'm a
-- member of this club" from within the app, independent of that external
-- link, so the dashboard has something real to show.
--
-- Each is a simple join table: one row per (item, user). A student can only
-- ever see, create or remove their own rows (`user_id = auth.uid()`) — this
-- is personal bookkeeping, not a public RSVP count or club roster, so there
-- is no public/Admin SELECT policy here by design.
-- ----------------------------------------------------------------------------

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id text not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.opportunity_saves (
  id uuid primary key default gen_random_uuid(),
  opportunity_id text not null references public.opportunities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);

create table public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id text not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (club_id, user_id)
);

create index event_registrations_user_idx on public.event_registrations (user_id);
create index event_registrations_event_idx on public.event_registrations (event_id);
create index opportunity_saves_user_idx on public.opportunity_saves (user_id);
create index opportunity_saves_opportunity_idx on public.opportunity_saves (opportunity_id);
create index club_memberships_user_idx on public.club_memberships (user_id);
create index club_memberships_club_idx on public.club_memberships (club_id);

alter table public.event_registrations enable row level security;
alter table public.opportunity_saves enable row level security;
alter table public.club_memberships enable row level security;

create policy event_registrations_own on public.event_registrations
  for select to authenticated
  using (user_id = auth.uid());

create policy event_registrations_insert_own on public.event_registrations
  for insert to authenticated
  with check (user_id = auth.uid());

create policy event_registrations_delete_own on public.event_registrations
  for delete to authenticated
  using (user_id = auth.uid());

create policy opportunity_saves_own on public.opportunity_saves
  for select to authenticated
  using (user_id = auth.uid());

create policy opportunity_saves_insert_own on public.opportunity_saves
  for insert to authenticated
  with check (user_id = auth.uid());

create policy opportunity_saves_delete_own on public.opportunity_saves
  for delete to authenticated
  using (user_id = auth.uid());

create policy club_memberships_own on public.club_memberships
  for select to authenticated
  using (user_id = auth.uid());

create policy club_memberships_insert_own on public.club_memberships
  for insert to authenticated
  with check (user_id = auth.uid());

create policy club_memberships_delete_own on public.club_memberships
  for delete to authenticated
  using (user_id = auth.uid());
