-- ============================================================================
-- CampusBoard — hardening pass
--
-- Three independent fixes, each safe to run on top of 001-003:
--
-- 1. buy_sell_listings_public was masking seller_phone for non-owner/
--    non-admin callers but still passing payment_screenshot_path straight
--    through. The private-bucket storage RLS means the *image* can't
--    actually be fetched by anyone but the owner/Admin, but the *path*
--    itself is a needless leak (bucket layout, filenames, upload cadence)
--    to anonymous/public callers. Mask it the same way seller_phone is
--    masked.
--
-- 2. Bulk-insert analytics events but never bumped the per-row views /
--    apply_clicks / register_clicks / contact_reveals counters anywhere —
--    those columns existed in the schema and were shown nowhere. Replace
--    the raw client-side insert with a single security-definer RPC that
--    logs the event AND atomically increments the right counter on the
--    right table, in one round trip.
--
-- 3. handle_new_user granted admin to any signup whose email started with
--    "admin" — a demo convenience that was explicitly flagged as unsafe to
--    ship. Every new signup now always starts as 'student'; promote real
--    admins by hand (see README).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Mask payment_screenshot_path in the public listing view.
-- ----------------------------------------------------------------------------
create or replace view public.buy_sell_listings_public
with (security_invoker = true) as
select
  id,
  owner_id,
  listing_type,
  title,
  price,
  condition,
  category,
  description,
  seller_name,
  case
    when auth.uid() = owner_id or public.is_admin() then seller_phone
    else null
  end as seller_phone,
  images,
  case
    when auth.uid() = owner_id or public.is_admin() then payment_screenshot_path
    else null
  end as payment_screenshot_path,
  status,
  fee,
  submitted_at,
  approved_at,
  rejected_at,
  expires_at,
  views,
  contact_reveals,
  created_at,
  updated_at
from public.buy_sell_listings;

grant select on public.buy_sell_listings_public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. record_analytics_event — logs the event and bumps the matching counter
-- column on the source-of-truth table in a single call. Mirrors the enum
-- values already defined in 001 (analytics_entity / analytics_event_type).
-- Clubs intentionally have no counter column (there's nothing to promote on
-- the clubs listing page), so a 'club' view still gets logged for the Admin
-- dashboard total but doesn't update any row.
-- ----------------------------------------------------------------------------
create or replace function public.record_analytics_event(
  p_entity_type analytics_entity,
  p_entity_id text,
  p_event_type analytics_event_type
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.analytics_events (entity_type, entity_id, event_type, user_id)
  values (p_entity_type, p_entity_id, p_event_type, auth.uid());

  if p_event_type = 'view' then
    case p_entity_type
      when 'notice' then
        update public.notices set views = views + 1 where id = p_entity_id;
      when 'event' then
        update public.events set views = views + 1 where id = p_entity_id;
      when 'opportunity' then
        update public.opportunities set views = views + 1 where id = p_entity_id;
      when 'listing' then
        update public.buy_sell_listings set views = views + 1 where id = p_entity_id;
      else
        null; -- 'club' has no counter column
    end case;
  elsif p_event_type = 'register_click' and p_entity_type = 'event' then
    update public.events set register_clicks = register_clicks + 1 where id = p_entity_id;
  elsif p_event_type = 'apply_click' and p_entity_type = 'opportunity' then
    update public.opportunities set apply_clicks = apply_clicks + 1 where id = p_entity_id;
  elsif p_event_type = 'contact_reveal' and p_entity_type = 'listing' then
    update public.buy_sell_listings set contact_reveals = contact_reveals + 1 where id = p_entity_id;
  end if;
end;
$$;

-- Anonymous visitors can log views/clicks the same way they could insert
-- directly before (analytics_insert_any policy already permits this); the
-- RPC just does more work per call, it doesn't grant anything new.
grant execute on function public.record_analytics_event(analytics_entity, text, analytics_event_type)
  to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. New signups always start as 'student'. Promote an admin manually:
--      update public.profiles set role = 'admin' where email = '...';
--    (must be run as a Supabase admin/service-role — the profiles_guard_role
--    trigger from 001 still blocks a student from ever doing this to
--    themselves.)
-- ----------------------------------------------------------------------------
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
    'student'
  );
  return new;
end;
$$;
