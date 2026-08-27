-- CampusBoard production hardening: security, integrity, storage privacy and abuse resistance.

-- 1. Maintenance RPC must not be callable from the browser.
revoke execute on function public.expire_stale_listings() from public, anon, authenticated;
grant execute on function public.expire_stale_listings() to service_role;

-- 2. Public listing view never exposes private owner/contact/payment fields to other users.
create or replace view public.buy_sell_listings_public
with (security_invoker = true) as
select
  id,
  case when auth.uid() = owner_id or public.is_admin() then owner_id else null end as owner_id,
  listing_type, title, price, condition, category, description, seller_name,
  case when auth.uid() = owner_id or public.is_admin() then seller_phone else null end as seller_phone,
  images,
  case when auth.uid() = owner_id or public.is_admin() then payment_screenshot_path else null end as payment_screenshot_path,
  status, fee, submitted_at, approved_at, rejected_at, expires_at, views, contact_reveals, created_at, updated_at,
  rejection_reason
from public.buy_sell_listings;

-- 3. Tighten analytics RPC: no forged private/pending/rejected metrics and no
--    mismatched action/entity combinations.
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
      if not exists (select 1 from public.events where id = p_entity_id) then raise exception 'Unknown event.'; end if;
    when 'club' then
      if not exists (select 1 from public.clubs where id = p_entity_id) then raise exception 'Unknown club.'; end if;
    when 'opportunity' then
      if not exists (select 1 from public.opportunities where id = p_entity_id) then raise exception 'Unknown opportunity.'; end if;
    when 'listing' then
      if not exists (select 1 from public.buy_sell_listings where id = p_entity_id and status = 'approved' and (expires_at is null or expires_at > now())) then raise exception 'Unknown listing.'; end if;
  end case;

  insert into public.analytics_events (entity_type, entity_id, event_type, user_id)
  values (p_entity_type, p_entity_id, p_event_type, auth.uid());

  if p_event_type = 'view' then
    case p_entity_type
      when 'notice' then update public.notices set views = views + 1 where id = p_entity_id and status = 'approved';
      when 'event' then update public.events set views = views + 1 where id = p_entity_id;
      when 'opportunity' then update public.opportunities set views = views + 1 where id = p_entity_id;
      when 'listing' then update public.buy_sell_listings set views = views + 1 where id = p_entity_id and status = 'approved' and (expires_at is null or expires_at > now());
      else null;
    end case;
  elsif p_event_type = 'register_click' then
    update public.events set register_clicks = register_clicks + 1 where id = p_entity_id;
  elsif p_event_type = 'apply_click' then
    update public.opportunities set apply_clicks = apply_clicks + 1 where id = p_entity_id;
  end if;
end;
$$;

-- 4. URL/date integrity at the database boundary. Clean invalid legacy rows first.
update public.notices set external_url = null where external_url is not null and external_url <> '#' and external_url !~* '^https?://[^[:space:]]+$';
update public.events set registration_url = '#' where registration_url is null or (registration_url <> '#' and registration_url !~* '^https?://[^[:space:]]+$');
update public.opportunities set apply_url = '#' where apply_url is null or (apply_url <> '#' and apply_url !~* '^https?://[^[:space:]]+$');
update public.events set end_time = null where date = coalesce(end_date, date) and start_time is not null and end_time is not null and end_time <= start_time;
update public.events set registration_deadline = null where registration_deadline is not null and registration_deadline > date;

alter table public.notices drop constraint if exists notices_external_url_http_check;
alter table public.notices add constraint notices_external_url_http_check check (external_url is null or external_url = '#' or external_url ~* '^https?://[^[:space:]]+$');
alter table public.events drop constraint if exists events_registration_url_http_check;
alter table public.events add constraint events_registration_url_http_check check (registration_url = '#' or registration_url ~* '^https?://[^[:space:]]+$');
alter table public.opportunities drop constraint if exists opportunities_apply_url_http_check;
alter table public.opportunities add constraint opportunities_apply_url_http_check check (apply_url = '#' or apply_url ~* '^https?://[^[:space:]]+$');
alter table public.events drop constraint if exists events_same_day_time_order_check;
alter table public.events add constraint events_same_day_time_order_check check (date <> coalesce(end_date, date) or start_time is null or end_time is null or end_time > start_time);
alter table public.events drop constraint if exists events_registration_deadline_check;
alter table public.events add constraint events_registration_deadline_check check (registration_deadline is null or registration_deadline <= date);

-- 5. Social URLs are restricted to http(s).
create or replace function public.socials_are_safe(p_socials jsonb) returns boolean
language sql immutable security definer set search_path = public
as $$
  select jsonb_typeof(coalesce(p_socials, '[]'::jsonb)) = 'array'
    and not exists (select 1 from jsonb_array_elements(coalesce(p_socials, '[]'::jsonb)) item
      where item ? 'url' and coalesce(item ->> 'url', '') <> '' and (item ->> 'url') !~* '^https?://[^[:space:]]+$');
$$;
update public.clubs set socials = '[]'::jsonb where jsonb_typeof(socials) <> 'array';
alter table public.clubs drop constraint if exists clubs_socials_safe_urls_check;
alter table public.clubs add constraint clubs_socials_safe_urls_check check (public.socials_are_safe(socials));
revoke execute on function public.socials_are_safe(jsonb) from public, anon, authenticated;

-- 6. Lock marketplace content after payment submission and require storage paths to belong to the listing owner/id.
create or replace function public.listing_image_paths_are_owned(p_owner_id uuid, p_listing_id text, p_images text[]) returns boolean
language sql immutable security definer set search_path = public
as $$
  select not exists (select 1 from unnest(coalesce(p_images, '{}'::text[])) image_path
    where image_path is null or left(image_path, length(p_owner_id::text || '/' || p_listing_id || '/')) <> (p_owner_id::text || '/' || p_listing_id || '/'));
$$;
revoke execute on function public.listing_image_paths_are_owned(uuid, text, text[]) from public, anon, authenticated;

create or replace function public.enforce_listing_transition() returns trigger
language plpgsql security definer set search_path = public
as $$
declare v_prefix text := new.owner_id::text || '/' || new.id || '/';
begin
  if not public.listing_image_paths_are_owned(new.owner_id, new.id, new.images) then raise exception 'Listing images must belong to this listing.'; end if;
  if new.payment_screenshot_path is not null and left(new.payment_screenshot_path, length(v_prefix)) <> v_prefix then raise exception 'Payment screenshot must belong to this listing.'; end if;
  if public.is_admin() then
    if new.status = 'approved' and old.status is distinct from 'approved' then new.approved_at := now(); new.expires_at := now() + interval '30 days'; new.rejected_at := null; new.rejection_reason := null;
    elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
      if new.rejection_reason is null or btrim(new.rejection_reason) = '' then raise exception 'Provide a rejection reason.'; end if;
      new.rejected_at := now(); new.approved_at := null; new.expires_at := null;
    end if;
    new.updated_at := now(); return new;
  end if;
  if new.owner_id is distinct from old.owner_id then raise exception 'owner_id cannot be changed.'; end if;
  if new.approved_at is distinct from old.approved_at or new.rejected_at is distinct from old.rejected_at or new.expires_at is distinct from old.expires_at or new.rejection_reason is distinct from old.rejection_reason then raise exception 'Only Admin can approve or reject a listing.'; end if;
  if old.status <> 'payment_pending' then
    if new.listing_type is distinct from old.listing_type or new.title is distinct from old.title or new.price is distinct from old.price or new.condition is distinct from old.condition or new.category is distinct from old.category or new.description is distinct from old.description or new.seller_name is distinct from old.seller_name or new.seller_phone is distinct from old.seller_phone or new.images is distinct from old.images then raise exception 'Listing content is locked after payment submission.'; end if;
  end if;
  if new.status is distinct from old.status then
    if old.status = 'payment_pending' and new.status = 'payment_submitted' then null;
    elsif old.status = 'payment_submitted' and new.status = 'pending_approval' then if new.payment_screenshot_path is null then raise exception 'Upload a payment screenshot before submitting for approval.'; end if;
    else raise exception 'Only Admin can approve, reject or otherwise change that status.'; end if;
  end if;
  if new.payment_screenshot_path is distinct from old.payment_screenshot_path and not (old.status = 'payment_submitted' and new.status = 'pending_approval') then raise exception 'payment_screenshot_path can only be set when submitting for approval.'; end if;
  new.updated_at := now(); return new;
end;
$$;
drop policy if exists buy_sell_update_own_or_admin on public.buy_sell_listings;
create policy buy_sell_update_own_or_admin on public.buy_sell_listings for update to authenticated
using (public.is_admin() or (owner_id = auth.uid() and status in ('payment_pending','payment_submitted')))
with check (owner_id = auth.uid() or public.is_admin());

-- 7. Notice attachments are private. Approved notices are still accessible via short-lived signed URLs.
update storage.buckets set public = false where id = 'notice-files';

-- 8. Never infer Admin from an email prefix. Every new Auth user starts as a student; Admin promotion is trusted/admin-only.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 'student'::user_role);
  return new;
end;
$$;

-- 9. Do not expose profile mutation through PostgREST. Role and identity changes
--    stay in trusted SQL/service-role administration; this removes an unnecessary
--    browser-write surface while the role guard still blocks self-escalation.
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;

-- 10. Enforce storage limits at the database boundary too, so a modified client
--     cannot bypass the browser-side size/MIME validation.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id in ('content-images', 'listing-images', 'payment-screenshots');

update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp']
where id = 'notice-files';

-- 10. README/setup must run through this migration before seeding.