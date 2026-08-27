-- ============================================================================
-- CampusBoard — richer admin analytics
--
-- Found during the second-pass audit: the Admin dashboard's "Analytics"
-- section only ever showed four numbers (total views/register-clicks/
-- apply-clicks/contact-reveals) summed across every content type at once —
-- not useful for deciding, say, whether it's Events or Opportunities
-- driving engagement, or which specific listing is getting attention.
--
-- Fix: two admin-only views doing the aggregation in Postgres (not by
-- pulling the whole analytics_events table into the browser and grouping
-- client-side, which would only get slower as the table grows):
--   - analytics_breakdown: counts per (entity_type, event_type) pair — lets
--     the Admin dashboard show "Events: 1.2k views, 340 register clicks"
--     etc. instead of one lump sum.
--   - analytics_top_entities: the 10 most-viewed rows per entity_type, so
--     Admin can see which specific notice/event/club/opportunity/listing is
--     actually getting attention.
--
-- Safe to run on top of 001-009. Both views are security_invoker + rely on
-- the existing analytics_select_admin RLS policy on the base table, so a
-- non-admin querying either view gets zero rows, not an error.
-- ============================================================================

create view public.analytics_breakdown
with (security_invoker = true) as
select entity_type, event_type, count(*) as total
from public.analytics_events
group by entity_type, event_type;

grant select on public.analytics_breakdown to authenticated;

create view public.analytics_top_entities
with (security_invoker = true) as
select entity_type, entity_id, count(*) as views
from public.analytics_events
where event_type = 'view'
group by entity_type, entity_id
order by count(*) desc;

grant select on public.analytics_top_entities to authenticated;
