-- ============================================================================
-- CampusBoard — Chapters
--
-- CampusBoard has two kinds of student communities:
--   * Clubs    — managed by SEE (Student Engagement & Experience). Existing
--                public.clubs table, untouched apart from the optional
--                join_url column added below.
--   * Chapters — run by students, regulated by faculty mentors and chapter
--                heads. A SEPARATE content type with its own table (this
--                migration), not a flag on public.clubs.
--
-- Security model mirrors public.clubs exactly: everyone can read, only Admin
-- can insert/update/delete (enforced by RLS via public.is_admin()).
--
-- Safe to run on top of 001-017.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Optional external "Join" link on clubs (Admin-provided; CampusBoard does
--    not manage membership — see 019_community_interests.sql).
-- ----------------------------------------------------------------------------
alter table public.clubs add column join_url text;
alter table public.clubs add constraint clubs_join_url_check
  check (join_url is null or join_url ~* '^https?://[^[:space:]]+$');

-- ----------------------------------------------------------------------------
-- 2. chapters
-- ----------------------------------------------------------------------------
create table public.chapters (
  id text primary key,
  name text not null,
  tagline text not null default '',
  about text not null default '',
  accent text not null default 'navy',
  members integer not null default 0 check (members >= 0),
  founded text,
  recruitment text,
  faculty_mentor text not null default '',
  chapter_heads text[] not null default '{}',
  join_url text check (join_url is null or join_url ~* '^https?://[^[:space:]]+$'),
  announcements text[] not null default '{}',
  gallery text[] not null default '{}', -- storage object paths in `content-images`
  socials jsonb not null default '[]',
  past_events jsonb not null default '[]',
  image_path text,                      -- storage object path in `content-images`
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chapters_socials_safe_urls_check check (public.socials_are_safe(socials))
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

create trigger chapters_touch_updated_at
  before update on public.chapters
  for each row execute function public.touch_updated_at();

alter table public.chapters enable row level security;

create policy chapters_select_public on public.chapters
  for select to anon, authenticated
  using (true);

create policy chapters_admin_insert on public.chapters
  for insert to authenticated
  with check (public.is_admin());

create policy chapters_admin_update on public.chapters
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy chapters_admin_delete on public.chapters
  for delete to authenticated
  using (public.is_admin());

-- Images reuse the existing public `content-images` bucket and its
-- Admin-only write / public-read storage policies (002_storage.sql).
-- Path convention: chapters/{chapterId}/{filename}.
