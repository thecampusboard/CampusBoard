-- ============================================================================
-- CampusBoard — site_settings (admin-managed hero banner + campus gallery)
--
-- Safe to run on top of 001-006. Adds exactly one new table; nothing existing
-- is altered.
--
-- Backs two pieces of previously-hardcoded UI:
--   - The homepage hero banner background image (was a bundled static asset
--     with no way for Admin to change it).
--   - The homepage "Our Campus" card, which only ever showed one static
--     image — now a real multi-image auto-slider (src/components/
--     image-gallery.tsx already supported this; nothing fed it real data).
--
-- Both are stored as object paths in the existing public `content-images`
-- bucket (002_storage.sql) — no new bucket, no new storage policy needed.
-- A single row (key = 'appearance') keeps the read side to one query; the
-- jsonb value holds both fields so they can be updated independently from
-- the client without clobbering each other (see updateSiteSettings in
-- src/lib/content.tsx, which merges rather than overwrites).
-- ============================================================================

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Readable by everyone — this is what renders the public homepage.
create policy site_settings_select_public on public.site_settings
  for select to anon, authenticated
  using (true);

-- Only Admin may create or change a setting.
create policy site_settings_admin_write on public.site_settings
  for insert to authenticated
  with check (public.is_admin());

create policy site_settings_admin_update on public.site_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy site_settings_admin_delete on public.site_settings
  for delete to authenticated
  using (public.is_admin());

-- Keep updated_at/updated_by honest regardless of which client writes.
create or replace function public.touch_site_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_site_settings();

-- Seed the single row the app reads. `value` starts empty — the app falls
-- back to its bundled illustration/no-gallery state until an Admin uploads
-- something real, so nothing fake is ever shown as if it were production
-- content.
insert into public.site_settings (key, value)
values ('appearance', '{"heroImagePath": null, "campusGalleryPaths": []}'::jsonb)
on conflict (key) do nothing;
