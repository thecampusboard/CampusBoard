-- ============================================================================
-- CampusBoard — analytics integrity fixes
--
-- Two problems in 004_hardening.sql's record_analytics_event(), found before
-- continuing development:
--
-- 1. Double-counted contact reveals. reveal_seller_phone() (003) already
--    increments buy_sell_listings.contact_reveals server-side as part of a
--    successful reveal. The client also called
--    logEvent("listing", id, "contact_reveal") right after, which — once
--    004 routed logEvent() through record_analytics_event() — incremented
--    the *same* counter a second time. Every reveal was counted twice.
--
-- 2. Integrity/security gap in record_analytics_event() itself:
--      a. It's granted to `anon` and took entity_id/event_type on faith —
--         nothing checked the entity actually existed, so any caller could
--         write arbitrary rows into analytics_events for made-up ids.
--      b. Nothing validated that the event_type made sense for the given
--         entity_type (e.g. an "apply_click" logged against a notice).
--      c. Worst: because it also accepted event_type = 'contact_reveal' for
--         listings, anyone — including a signed-out anon caller — could
--         call the RPC directly (bypassing reveal_seller_phone() entirely,
--         with none of its login/status/expiry checks) and inflate
--         contact_reveals without ever actually revealing a phone number.
--         That's a forgeable metric, not just a double-counted one.
--
-- Fix: reveal_seller_phone() becomes the sole owner of the "contact reveal"
-- action end to end — it already gates on auth + listing status/expiry, so
-- it now also writes the analytics_events row itself, atomically, in the
-- same statement as the counter increment. record_analytics_event() no
-- longer accepts contact_reveal for listings at all (it raises rather than
-- silently no-op'ing, so a caller relying on the old path finds out
-- immediately), validates the entity exists, and only accepts event_type/
-- entity_type combinations that actually mean something.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- reveal_seller_phone — now the single place contact_reveals is touched.
-- Logic is unchanged from 003 except for the added analytics_events insert.
-- ----------------------------------------------------------------------------
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

  insert into public.analytics_events (entity_type, entity_id, event_type, user_id)
  values ('listing', p_listing_id, 'contact_reveal', auth.uid());

  return v_phone;
end;
$$;

-- ----------------------------------------------------------------------------
-- record_analytics_event — entity-existence + combination validation added;
-- contact_reveal/listing removed (owned by reveal_seller_phone above).
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
  -- Only combinations that correspond to a real action on a real entity are
  -- accepted; everything else is rejected outright rather than silently
  -- logged as a no-op row.
  if p_event_type = 'contact_reveal' then
    raise exception 'contact_reveal is only recorded by reveal_seller_phone().';
  elsif p_event_type = 'register_click' and p_entity_type is distinct from 'event' then
    raise exception 'register_click only applies to events.';
  elsif p_event_type = 'apply_click' and p_entity_type is distinct from 'opportunity' then
    raise exception 'apply_click only applies to opportunities.';
  end if;

  -- Confirm the entity actually exists before logging or incrementing
  -- anything against it — closes off analytics_events being fillable with
  -- rows for arbitrary/made-up ids.
  case p_entity_type
    when 'notice' then
      if not exists (select 1 from public.notices where id = p_entity_id) then
        raise exception 'Unknown notice.';
      end if;
    when 'event' then
      if not exists (select 1 from public.events where id = p_entity_id) then
        raise exception 'Unknown event.';
      end if;
    when 'club' then
      if not exists (select 1 from public.clubs where id = p_entity_id) then
        raise exception 'Unknown club.';
      end if;
    when 'opportunity' then
      if not exists (select 1 from public.opportunities where id = p_entity_id) then
        raise exception 'Unknown opportunity.';
      end if;
    when 'listing' then
      if not exists (select 1 from public.buy_sell_listings where id = p_entity_id) then
        raise exception 'Unknown listing.';
      end if;
  end case;

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
        null; -- 'club' has no counter column, the row above is enough for it
    end case;
  elsif p_event_type = 'register_click' then
    update public.events set register_clicks = register_clicks + 1 where id = p_entity_id;
  elsif p_event_type = 'apply_click' then
    update public.opportunities set apply_clicks = apply_clicks + 1 where id = p_entity_id;
  end if;
end;
$$;

grant execute on function public.record_analytics_event(analytics_entity, text, analytics_event_type)
  to anon, authenticated;
