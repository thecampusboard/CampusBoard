-- ============================================================================
-- CampusBoard — global advertisement popup.
--
-- 1. public.advertisements — poster + click-through URL + schedule + order.
-- 2. site_settings row 'ad_popup' — how long each ad is shown (2, 3 or 5 s).
--
-- Security (all enforced here, not just in React):
--   * Public (anon + authenticated) can SELECT only ELIGIBLE ads:
--       is_active AND has a poster AND start_at <= now() <= end_at.
--     A disabled, scheduled, expired or poster-less ad is invisible to them.
--   * Admin can SELECT every ad, and is the only role that can insert,
--     update or delete (public.is_admin()).
--   * The duration setting is publicly readable (site_settings_select_public,
--     007) and writable only by Admin (site_settings_admin_*, 007). A trigger
--     additionally guarantees the stored duration can only ever be 2, 3 or 5.
--   * Posters live in the existing public `content-images` bucket under
--     ads/{adId}/..., which already restricts writes to Admin, to image MIME
--     types and to 5 MB (002_storage.sql, 006). No new bucket/policy needed.
--
-- Safe to run on top of 001-020 (needs public.touch_updated_at from 018).
-- ============================================================================

create table public.advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  image_path text,                                  -- object path in `content-images`
  href text not null check (href ~* '^https?://[^[:space:]]+$'),
  start_at timestamptz not null,
  end_at timestamptz not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint advertisements_window_check check (end_at > start_at)
);

create index advertisements_eligibility_idx
  on public.advertisements (is_active, start_at, end_at, display_order);

create trigger advertisements_touch_updated_at
  before update on public.advertisements
  for each row execute function public.touch_updated_at();

alter table public.advertisements enable row level security;

create policy advertisements_select_public on public.advertisements
  for select to anon, authenticated
  using (
    is_active
    and image_path is not null
    and start_at <= now()
    and end_at >= now()
  );

create policy advertisements_select_admin on public.advertisements
  for select to authenticated
  using (public.is_admin());

create policy advertisements_admin_insert on public.advertisements
  for insert to authenticated
  with check (public.is_admin());

create policy advertisements_admin_update on public.advertisements
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy advertisements_admin_delete on public.advertisements
  for delete to authenticated
  using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Popup duration setting: only 2, 3 or 5 seconds, default 3.
-- ----------------------------------------------------------------------------
create or replace function public.validate_ad_popup_setting()
returns trigger
language plpgsql
as $fn$
begin
  if new.key = 'ad_popup' then
    if jsonb_typeof(new.value -> 'durationSeconds') is distinct from 'number'
       or (new.value ->> 'durationSeconds') not in ('2', '3', '5') then
      raise exception 'Popup duration must be 2, 3 or 5 seconds.';
    end if;
  end if;
  return new;
end;
$fn$;

create trigger site_settings_validate_ad_popup
  before insert or update on public.site_settings
  for each row execute function public.validate_ad_popup_setting();

insert into public.site_settings (key, value)
values ('ad_popup', '{"durationSeconds": 3}'::jsonb)
on conflict (key) do nothing;
