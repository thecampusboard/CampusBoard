-- ============================================================================
-- CampusBoard — remove demo/seed data
-- Run this in the Supabase SQL Editor when you want to remove ONLY the rows
-- created by supabase/seed.sql.
--
-- This deliberately does NOT touch:
--   * auth.users / public.profiles
--   * user-created Buy & Sell listings
--   * site_settings (the appearance row is application configuration)
--   * storage objects
--
-- Analytics rows are removed for the seeded entity IDs as well, so the
-- analytics dashboard cannot retain references to deleted demo content.
-- ============================================================================

begin;

-- Analytics has no foreign key to content tables, so remove it explicitly.
delete from public.analytics_events
where (entity_type = 'notice' and entity_id in (
  'tcs-placement-drive',
  'end-sem-schedule',
  'cse-cyber-seminar',
  'library-timings',
  'hackathon-circular',
  'scholarship-forms'
))
or (entity_type = 'event' and entity_id in (
  'technova-2k26',
  'robowars',
  'open-mic-night',
  'code-clash-3',
  'ai-workshop',
  'photography-auditions',
  'basketball-trials',
  'blood-donation-camp'
))
or (entity_type = 'club' and entity_id in (
  'robominds',
  'cybersentinels',
  'pratibimbh',
  'avishkarnam',
  'nss',
  'sports-council'
))
or (entity_type = 'opportunity' and entity_id in (
  'microsoft-internship-2026',
  'google-summer-internship',
  'amazon-fresher-hiring',
  'national-coding-hackathon',
  'iisc-research-fellowship',
  'design-sprint-workshop'
));

-- Delete in dependency order: events reference clubs.
delete from public.events
where id in (
  'technova-2k26',
  'robowars',
  'open-mic-night',
  'code-clash-3',
  'ai-workshop',
  'photography-auditions',
  'basketball-trials',
  'blood-donation-camp'
);

delete from public.notices
where id in (
  'tcs-placement-drive',
  'end-sem-schedule',
  'cse-cyber-seminar',
  'library-timings',
  'hackathon-circular',
  'scholarship-forms'
);

delete from public.opportunities
where id in (
  'microsoft-internship-2026',
  'google-summer-internship',
  'amazon-fresher-hiring',
  'national-coding-hackathon',
  'iisc-research-fellowship',
  'design-sprint-workshop'
);

delete from public.clubs
where id in (
  'robominds',
  'cybersentinels',
  'pratibimbh',
  'avishkarnam',
  'nss',
  'sports-council'
);

commit;

-- Optional verification:
-- select 'clubs' as table_name, count(*) from public.clubs
-- where id in ('robominds','cybersentinels','pratibimbh','avishkarnam','nss','sports-council')
-- union all
-- select 'notices', count(*) from public.notices
-- where id in ('tcs-placement-drive','end-sem-schedule','cse-cyber-seminar','library-timings','hackathon-circular','scholarship-forms')
-- union all
-- select 'events', count(*) from public.events
-- where id in ('technova-2k26','robowars','open-mic-night','code-clash-3','ai-workshop','photography-auditions','basketball-trials','blood-donation-camp')
-- union all
-- select 'opportunities', count(*) from public.opportunities
-- where id in ('microsoft-internship-2026','google-summer-internship','amazon-fresher-hiring','national-coding-hackathon','iisc-research-fellowship','design-sprint-workshop');
