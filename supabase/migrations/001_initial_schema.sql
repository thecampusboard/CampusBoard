-- ============================================================================
-- CampusBoard — initial schema
-- Mirrors the data models in src/lib/data.ts, src/lib/content.tsx and the
-- Buy & Sell approval workflow. Source of truth for content moves from
-- localStorage to Postgres; Admin permissions are enforced with RLS + a
-- status-transition trigger, not just in the React client.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type user_role as enum ('student', 'admin');

create type notice_category as enum
  ('Academic', 'Examination', 'Placement', 'Department', 'General', 'Other');

create type notice_file_type as enum ('PDF', 'Image', 'Link', 'Text');

create type opportunity_type as enum
  ('Internship', 'Job', 'Hackathon', 'Competition', 'Research', 'Fellowship', 'Workshop', 'Conference');

create type listing_type as enum ('Buy', 'Sell');

create type listing_condition as enum
  ('Like New', 'Excellent Condition', 'Good Condition', 'Fair Condition');

create type listing_category as enum ('Books', 'Electronics', 'Stationery', 'Hostel', 'Other');

create type listing_status as enum
  ('payment_pending', 'payment_submitted', 'pending_approval', 'approved', 'rejected', 'expired');

create type analytics_entity as enum ('notice', 'event', 'club', 'opportunity', 'listing');
create type analytics_event_type as enum ('view', 'register_click', 'apply_click', 'contact_reveal');

-- ----------------------------------------------------------------------------
-- profiles — one row per auth.users row, holds the app role.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default 'Student',
  role user_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper used throughout RLS policies. security definer + a fixed search_path
-- so it can read `profiles` regardless of the calling role's own RLS grants,
-- without being hijackable via search_path tricks.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile when a new auth user signs up. Role is decided here,
-- server-side, and can only be changed later by an existing admin (see the
-- prevent_role_self_escalation trigger below) — never by the client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    -- Demo convenience carried over from the original prototype: an email
    -- starting with "admin" gets the admin role. This now happens in a
    -- server-side trigger instead of client-side string matching, so it
    -- can't be spoofed by editing local state. Replace with real admin
    -- provisioning before shipping this to production.
    case when new.email ilike 'admin%' then 'admin'::user_role else 'student'::user_role end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A student must never be able to grant themselves admin via `update profiles`.
-- Bootstrap note: this also blocks the FIRST admin promotion, since
-- is_admin() is false for everyone before any admin exists — including a
-- plain `update profiles set role = 'admin' ...` run by the project owner
-- in the SQL Editor. The SQL Editor (and any service-role connection)
-- always runs without a Supabase Auth session, so auth.uid() is null there
-- — unlike every request that goes through PostgREST as `anon` or
-- `authenticated`, which always carries a real auth.uid(). That gap is
-- exactly what public.bootstrap_first_admin() below uses to allow the
-- one-time bootstrap without ever weakening this trigger for real sessions.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only Admin can change a profile role.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ----------------------------------------------------------------------------
-- bootstrap_first_admin — the ONLY supported way to create the first Admin.
--
-- Call once, from the Supabase SQL Editor or a trusted server-side script
-- using the service-role key, after the person has signed up once as a
-- normal student:
--
--   select public.bootstrap_first_admin('someone@example.edu');
--
-- Safe by construction, on top of the auth.uid()-is-null bootstrap path in
-- prevent_role_self_escalation() above:
--   - REVOKEd from anon/authenticated below, so no browser client — signed
--     in or not — can call it through the app's anon key. Only a
--     service-role connection (which the browser never has) can reach it.
--   - Refuses to run at all once a single admin already exists, so it can't
--     be reused to mint further admins even by someone holding the
--     service-role key — use `update public.profiles set role = 'admin'
--     where email = '...'` as an existing Admin (or via the SQL Editor)
--     for that instead.
-- ----------------------------------------------------------------------------
create or replace function public.bootstrap_first_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.profiles where role = 'admin') then
    raise exception 'An Admin already exists. Promote further admins as an existing Admin instead.';
  end if;

  update public.profiles set role = 'admin' where email = p_email;

  if not found then
    raise exception 'No profile found for %. That person must sign up in the app first.', p_email;
  end if;
end;
$$;

revoke execute on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to service_role;

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No insert/delete policies for regular users: rows are created only by the
-- handle_new_user trigger (security definer, bypasses RLS) and admins may
-- delete via the service role if ever needed.

-- ----------------------------------------------------------------------------
-- notices
-- ----------------------------------------------------------------------------
create table public.notices (
  id text primary key,
  title text not null,
  description text not null,
  category notice_category not null default 'General',
  department text not null,
  years text[] not null default '{}',
  semesters text[] not null default '{}',
  date date not null default current_date,
  file_type notice_file_type not null default 'Text',
  file_label text,
  external_url text,
  file_path text, -- storage object path in the `notice-files` bucket
  featured boolean not null default false,
  views integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notices_date_idx on public.notices (date desc);
create index notices_category_idx on public.notices (category);

alter table public.notices enable row level security;

create policy notices_select_public on public.notices
  for select to anon, authenticated
  using (true);

create policy notices_admin_write on public.notices
  for insert to authenticated
  with check (public.is_admin());

create policy notices_admin_update on public.notices
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy notices_admin_delete on public.notices
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- clubs
-- ----------------------------------------------------------------------------
create table public.clubs (
  id text primary key,
  name text not null,
  tagline text not null default '',
  about text not null default '',
  accent text not null default 'navy',
  members integer not null default 0,
  founded text,
  recruitment text,
  announcements text[] not null default '{}',
  gallery text[] not null default '{}', -- storage object paths in `content-images`
  socials jsonb not null default '[]',
  past_events jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clubs enable row level security;

create policy clubs_select_public on public.clubs
  for select to anon, authenticated
  using (true);

create policy clubs_admin_write on public.clubs
  for insert to authenticated
  with check (public.is_admin());

create policy clubs_admin_update on public.clubs
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy clubs_admin_delete on public.clubs
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
create table public.events (
  id text primary key,
  title text not null,
  organizer text not null,
  club_id text references public.clubs (id) on delete set null,
  date date not null,
  end_date date,
  time text not null,
  venue text not null,
  description text not null,
  eligibility text not null default 'Open to all students',
  registration_deadline date,
  registration_url text not null default '#',
  contact text,
  accent text not null default 'sky',
  featured boolean not null default false,
  views integer not null default 0,
  register_clicks integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_date_after_date check (end_date is null or end_date >= date)
);

create index events_date_idx on public.events (date);
create index events_club_idx on public.events (club_id);

alter table public.events enable row level security;

create policy events_select_public on public.events
  for select to anon, authenticated
  using (true);

create policy events_admin_write on public.events
  for insert to authenticated
  with check (public.is_admin());

create policy events_admin_update on public.events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy events_admin_delete on public.events
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- opportunities
-- ----------------------------------------------------------------------------
create table public.opportunities (
  id text primary key,
  title text not null,
  organization text not null,
  position text not null,
  type opportunity_type not null,
  location text not null default 'On campus',
  eligibility text not null default 'Open to all students',
  years_branches text not null default 'All years',
  description text not null,
  skills text[] not null default '{}',
  stipend text,
  deadline date not null,
  apply_url text not null default '#',
  accent text not null default 'orange',
  featured boolean not null default false,
  views integer not null default 0,
  apply_clicks integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_deadline_idx on public.opportunities (deadline);
create index opportunities_type_idx on public.opportunities (type);

alter table public.opportunities enable row level security;

create policy opportunities_select_public on public.opportunities
  for select to anon, authenticated
  using (true);

create policy opportunities_admin_write on public.opportunities
  for insert to authenticated
  with check (public.is_admin());

create policy opportunities_admin_update on public.opportunities
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy opportunities_admin_delete on public.opportunities
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- buy_sell_listings — ₹20 / 30-day manual-UPI approval workflow.
-- ----------------------------------------------------------------------------
create table public.buy_sell_listings (
  id text primary key,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  listing_type listing_type not null,
  title text not null,
  price numeric(10, 2) not null check (price > 0),
  condition listing_condition not null,
  category listing_category not null,
  description text not null,
  seller_name text not null,
  seller_phone text not null,
  images text[] not null default '{}', -- storage object paths in `listing-images`
  payment_screenshot_path text,        -- storage object path in the PRIVATE `payment-screenshots` bucket
  status listing_status not null default 'payment_pending',
  -- Fixed ₹20 fee, enforced at the database level so no client (malicious
  -- or buggy) can insert/update a listing with a different fee — there is
  -- currently only one fee tier, so this is a hard constraint rather than
  -- something the application layer is trusted to get right.
  fee numeric(10, 2) not null default 20 check (fee = 20),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  -- 30-day active window. Not a generated column (approved_at + interval is
  -- not IMMUTABLE, since interval arithmetic depends on the session's
  -- timezone setting — Postgres rejects that as a generation expression).
  -- Instead this is a normal column, set explicitly to now() + 30 days by
  -- enforce_listing_transition() at the moment a listing is approved (see
  -- below), and left null otherwise.
  expires_at timestamptz,
  views integer not null default 0,
  contact_reveals integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index buy_sell_status_idx on public.buy_sell_listings (status);
create index buy_sell_owner_idx on public.buy_sell_listings (owner_id);
create index buy_sell_expires_idx on public.buy_sell_listings (expires_at);

-- Only Admin may set status straight to approved/rejected, and only Admin may
-- backdate/alter approved_at or rejected_at. Everyone else can only walk the
-- listing forward through the manual-payment steps on their own row.
create or replace function public.enforce_listing_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    if new.status = 'approved' and old.status is distinct from 'approved' then
      new.approved_at := now();
      new.expires_at := now() + interval '30 days';
      new.rejected_at := null;
    elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
      new.rejected_at := now();
      new.approved_at := null;
      new.expires_at := null;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- Non-admin (must also be the owner — RLS's USING clause already enforces
  -- that for the update policy, this is defence in depth).
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id cannot be changed.';
  end if;
  -- expires_at was a GENERATED column before this fix, so Postgres itself
  -- refused any direct write to it. Now that it's a normal column, that
  -- protection has to be enforced here explicitly, or an owner could grant
  -- their own listing an arbitrarily long (or renewed) active window by
  -- updating expires_at directly.
  if new.approved_at is distinct from old.approved_at
     or new.rejected_at is distinct from old.rejected_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'Only Admin can approve or reject a listing.';
  end if;
  if new.status is distinct from old.status then
    if old.status = 'payment_pending' and new.status = 'payment_submitted' then
      null; -- "I've paid" step — no extra requirement yet, screenshot comes next.
    elsif old.status = 'payment_submitted' and new.status = 'pending_approval' then
      -- The whole point of this status: a client cannot reach
      -- pending_approval — and therefore cannot appear in Admin's approval
      -- queue — without actually attaching payment proof in the same update.
      if new.payment_screenshot_path is null then
        raise exception 'Upload a payment screenshot before submitting for approval.';
      end if;
    else
      raise exception 'Only Admin can approve, reject or otherwise change that status.';
    end if;
  end if;
  -- payment_screenshot_path may only be *set* by a non-admin at the exact
  -- moment they submit for approval (above) — never edited or cleared
  -- afterwards, and never attached while sitting at any other status.
  if new.payment_screenshot_path is distinct from old.payment_screenshot_path
     and not (old.status = 'payment_submitted' and new.status = 'pending_approval') then
    raise exception 'payment_screenshot_path can only be set when submitting for approval.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger buy_sell_guard_transition
  before update on public.buy_sell_listings
  for each row execute function public.enforce_listing_transition();

alter table public.buy_sell_listings enable row level security;

-- Public + logged-in students only ever see approved, still-active listings…
create policy buy_sell_select_public on public.buy_sell_listings
  for select to anon, authenticated
  using (status = 'approved' and (expires_at is null or expires_at > now()));

-- …except the owner, who can track their own submission through every status…
create policy buy_sell_select_own on public.buy_sell_listings
  for select to authenticated
  using (owner_id = auth.uid());

-- …and Admin, who needs to see everything (including payment_screenshot_path).
create policy buy_sell_select_admin on public.buy_sell_listings
  for select to authenticated
  using (public.is_admin());

create policy buy_sell_insert_own on public.buy_sell_listings
  for insert to authenticated
  with check (owner_id = auth.uid() and status = 'payment_pending');

create policy buy_sell_update_own_or_admin on public.buy_sell_listings
  for update to authenticated
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy buy_sell_delete_own_or_admin on public.buy_sell_listings
  for delete to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- analytics_events — lightweight view/click tracking.
-- Anonymous inserts are intentionally allowed (page views come from signed-out
-- visitors too); the enum CHECKs and the "own user_id only" WITH CHECK keep it
-- from being usable to write anything sensitive. Only Admin can read it back.
-- ----------------------------------------------------------------------------
create table public.analytics_events (
  id bigint generated always as identity primary key,
  entity_type analytics_entity not null,
  entity_id text not null,
  event_type analytics_event_type not null,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index analytics_entity_idx on public.analytics_events (entity_type, entity_id);

alter table public.analytics_events enable row level security;

create policy analytics_insert_any on public.analytics_events
  for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

create policy analytics_select_admin on public.analytics_events
  for select to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Housekeeping: expire listings whose 30-day window has passed.
-- Call periodically (e.g. from a scheduled Edge Function / pg_cron job) —
-- expiry is also enforced live by the `expires_at > now()` check in
-- buy_sell_select_public above, so this is a convenience for the Admin
-- dashboard's status column rather than something correctness depends on.
-- ----------------------------------------------------------------------------
create or replace function public.expire_stale_listings()
returns void
language sql
security definer
set search_path = public
as $$
  update public.buy_sell_listings
  set status = 'expired'
  where status = 'approved' and expires_at <= now();
$$;
