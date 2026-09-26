-- ============================================================================
-- CampusBoard — auto-expire notices/events/opportunities from public view.
--
-- Mirrors the pattern 012_auto_expire_listings.sql already established for
-- Buy & Sell (RLS hides the row once it's past its relevant date; nothing
-- is ever hard-deleted). This applies the same idea to the three other
-- public content types, each keyed off its own "relevant date":
--   - notices:       notices.date               (the notice's own date)
--   - events:        coalesce(end_date, date)    (end date, or date if the
--                                                  event has no end_date)
--   - opportunities: opportunities.deadline      (the application deadline)
--
-- A public/anon or authenticated-non-admin/non-author caller can no longer
-- SELECT a row more than EXPIRY_GRACE_DAYS days past that date — so this
-- applies uniformly to every read path (home page, listings, search,
-- calendar, a club's related notices/events, a direct link to the item),
-- since they all ultimately go through the same PostgREST/Supabase client
-- query and the same RLS policy. Nothing is hard-deleted: notices_select_own
-- (author) and the three *_select_admin (Admin) policies are untouched, so
-- the author and Admin keep full history exactly as before.
--
-- The client-side publicNotices()/publicEvents()/publicOpportunities()
-- helpers in src/lib/data.ts apply the identical cutoff so that an Admin
-- session (which fetches every row, expired or not, for the admin panel)
-- still doesn't see expired items on the *public-facing* pages while
-- browsing the live site — RLS alone can't do that, since it can't tell
-- "Admin looking at /admin/notices" from "Admin looking at /notices" apart.
-- ----------------------------------------------------------------------------

-- Single place to change the grace period and the timezone the cutoff is
-- computed in. Campus-local (Asia/Kolkata) rather than the database
-- session's timezone (UTC on Supabase), because notices.date /
-- events.date / events.end_date / opportunities.deadline are plain `date`
-- columns with no time-of-day or timezone of their own — they represent a
-- campus-local calendar day, so "5 days after" has to be measured against
-- the campus's own calendar date, not UTC's (which is up to ~5.5 hours
-- behind IST and would flip the cutoff a day early for part of each day).
create or replace function public.content_expiry_cutoff()
returns date
language sql
stable
as $$
  select ((now() at time zone 'Asia/Kolkata')::date - 5);
$$;

comment on function public.content_expiry_cutoff() is
  'Campus-local (Asia/Kolkata) date, 5 days ago. A notice/event/opportunity '
  'whose relevant date falls before this is expired from public view.';

-- notices: extend the existing "approved" public policy with the cutoff.
-- notices_select_own / notices_select_admin (unaffected) still give the
-- author and Admin full access to an expired notice.
drop policy notices_select_approved on public.notices;

create policy notices_select_approved on public.notices
  for select to anon, authenticated
  using (status = 'approved' and date >= public.content_expiry_cutoff());

-- events: extend the existing "not a draft" public policy with the cutoff.
-- events_select_admin (unaffected) still gives Admin full history.
drop policy events_select_public on public.events;

create policy events_select_public on public.events
  for select to anon, authenticated
  using (
    is_draft = false
    and coalesce(end_date, date) >= public.content_expiry_cutoff()
  );

-- opportunities: same shape, keyed off the application deadline.
-- opportunities_select_admin (unaffected) still gives Admin full history.
drop policy opportunities_select_public on public.opportunities;

create policy opportunities_select_public on public.opportunities
  for select to anon, authenticated
  using (
    is_draft = false
    and deadline >= public.content_expiry_cutoff()
  );

-- (notices.date and opportunities.deadline are already indexed from 001.)
