-- ============================================================================
-- CampusBoard — structured event start/end time
--
-- Found during the second-pass audit: `events.time` was a free-text column
-- (e.g. "5:00 PM – 7:00 PM") that couldn't be parsed reliably, so
-- googleCalendarUrl() (src/lib/auth.tsx) could only ever create an all-day
-- calendar entry — even for an event with a perfectly well-known start
-- time — and put the real time in the event description as a workaround.
--
-- Fix: add real `start_time` / `end_time` columns (Postgres `time`, no
-- timezone — campus events are all in the campus's local time, same as
-- every date column already on this table). The legacy `time` text column
-- is kept, now nullable, as a display fallback for any row written before
-- an Admin edits it under the new form; going forward every Admin-created
-- event sets start_time (end_time optional), and the UI derives its display
-- string from those instead of trusting free text.
--
-- Safe to run on top of 001-007. No existing row loses data: `time` is
-- untouched, the two new columns simply default to null.
-- ============================================================================

alter table public.events
  add column start_time time,
  add column end_time time,
  alter column time drop not null;

comment on column public.events.time is
  'Legacy free-text time range (e.g. "5:00 PM – 7:00 PM"). Display fallback only for rows created before start_time existed — new/edited rows should set start_time/end_time instead.';
comment on column public.events.start_time is 'Event start time, campus-local. Required going forward for every Admin-created/edited event.';
comment on column public.events.end_time is 'Event end time, campus-local. Optional — omit for an open-ended/unspecified end.';
