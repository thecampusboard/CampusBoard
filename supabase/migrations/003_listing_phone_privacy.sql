-- ============================================================================
-- CampusBoard — seller phone privacy
-- RLS is row-level: the base buy_sell_listings SELECT policies correctly
-- gate which *rows* are visible, but every visible row's every column
-- (including seller_phone) would otherwise go to the client in one shot —
-- including to anonymous/public requests, since approved+active listings are
-- publicly readable. That's a real leak, not just a UI-hidden field: the
-- original app only hid the phone number in the React layer.
--
-- Fix: bulk listing reads go through this view, which nulls out
-- seller_phone unless the caller is the owner or Admin. Revealing it for
-- everyone else goes through reveal_seller_phone(), a security-definer RPC
-- that requires a signed-in session, only returns the number for approved
-- + still-active listings, and increments contact_reveals — this is the
-- server-side counterpart of the "contactReveals" tracking already modelled
-- on the table.
-- ============================================================================

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
  payment_screenshot_path,
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

create or replace function public.reveal_seller_phone(p_listing_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if auth.uid() is null then
    raise exception 'Login to view seller contact.';
  end if;

  update public.buy_sell_listings
  set contact_reveals = contact_reveals + 1
  where id = p_listing_id
    and status = 'approved'
    and (expires_at is null or expires_at > now())
  returning seller_phone into v_phone;

  if v_phone is null then
    raise exception 'This listing is not available.';
  end if;

  return v_phone;
end;
$$;

grant execute on function public.reveal_seller_phone(text) to authenticated;
