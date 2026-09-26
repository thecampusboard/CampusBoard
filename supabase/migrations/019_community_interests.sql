-- ============================================================================
-- CampusBoard — "Interested to Join" submissions for Clubs and Chapters.
--
-- CampusBoard does NOT manage real membership. The old "Join Club" toggle
-- (public.club_memberships, 016) is replaced in the UI by an expression of
-- interest that Admin can review; nothing here adds anyone to a club/chapter.
-- (club_memberships is left in place — historical migrations are never
-- edited — but the app no longer reads or writes it.)
--
-- One row per (student, club) or (student, chapter). Exactly one of
-- club_id / chapter_id is set, matching `kind`.
--
-- Security:
--   * A student can INSERT only their own row, and can only SELECT their own
--     rows (so the UI can show "Interest submitted"). They can never UPDATE
--     or DELETE — there is no policy for it.
--   * student_name / student_email are overwritten from public.profiles by a
--     trigger, so a client cannot forge who submitted the interest.
--   * Admin may change ONLY `status`; a trigger rejects edits to anything
--     else, and rejects any update from a non-admin.
--   * Admin can read, update the status of, and delete every row.
-- Safe to run on top of 001-018 (needs public.chapters from 018).
-- ============================================================================

create table public.community_interests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('club', 'chapter')),
  club_id text references public.clubs (id) on delete cascade,
  chapter_id text references public.chapters (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  student_name text not null default '',
  student_email text not null default '',
  phone text check (phone is null or char_length(phone) <= 30),
  course_year text check (course_year is null or char_length(course_year) <= 100),
  message text check (message is null or char_length(message) <= 1000),
  status text not null default 'new' check (status in ('new', 'contacted', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint community_interests_target_check check (
    (kind = 'club' and club_id is not null and chapter_id is null)
    or (kind = 'chapter' and chapter_id is not null and club_id is null)
  )
);

-- Duplicate protection at the database level.
create unique index community_interests_user_club_key
  on public.community_interests (user_id, club_id) where club_id is not null;
create unique index community_interests_user_chapter_key
  on public.community_interests (user_id, chapter_id) where chapter_id is not null;

create index community_interests_created_idx on public.community_interests (created_at desc);
create index community_interests_club_idx on public.community_interests (club_id);
create index community_interests_chapter_idx on public.community_interests (chapter_id);

-- Insert guard: identity comes from the profile, never from the client, and a
-- fresh row always starts as 'new'.
create or replace function public.community_interests_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_name text;
  v_email text;
begin
  select name, email into v_name, v_email from public.profiles where id = new.user_id;
  if not found then
    raise exception 'Unknown user.';
  end if;
  new.student_name := v_name;
  new.student_email := v_email;
  new.status := 'new';
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger community_interests_guard_insert
  before insert on public.community_interests
  for each row execute function public.community_interests_before_insert();

-- Update guard: the only thing Admin may change is `status`.
create or replace function public.community_interests_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'Only Admin can update an interest submission.';
  end if;
  if new.id is distinct from old.id
     or new.kind is distinct from old.kind
     or new.club_id is distinct from old.club_id
     or new.chapter_id is distinct from old.chapter_id
     or new.user_id is distinct from old.user_id
     or new.student_name is distinct from old.student_name
     or new.student_email is distinct from old.student_email
     or new.phone is distinct from old.phone
     or new.course_year is distinct from old.course_year
     or new.message is distinct from old.message
     or new.created_at is distinct from old.created_at then
    raise exception 'Only the status of an interest submission can be changed.';
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger community_interests_guard_update
  before update on public.community_interests
  for each row execute function public.community_interests_before_update();

alter table public.community_interests enable row level security;

create policy community_interests_select_own on public.community_interests
  for select to authenticated
  using (user_id = auth.uid());

create policy community_interests_select_admin on public.community_interests
  for select to authenticated
  using (public.is_admin());

create policy community_interests_insert_own on public.community_interests
  for insert to authenticated
  with check (user_id = auth.uid());

create policy community_interests_admin_update on public.community_interests
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy community_interests_admin_delete on public.community_interests
  for delete to authenticated
  using (public.is_admin());
