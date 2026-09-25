-- CampusBoard — automatically mark approved Buy & Sell listings as expired.
-- The public marketplace already hides listings at expires_at <= now(); this
-- scheduled job keeps the stored status in sync for owners and Admins too.

create extension if not exists pg_cron;

-- Bring any already-expired approved listings into the correct stored state immediately.
select public.expire_stale_listings();

-- Safe to re-run during local migration work.
select cron.unschedule(jobid)
from cron.job
where jobname = 'campusboard-expire-listings';

select cron.schedule(
  'campusboard-expire-listings',
  '*/15 * * * *',
  $$select public.expire_stale_listings();$$
);
