-- Trading AI — schedule the daily AI summary.
--
-- Runs every weekday at 14:45 UTC, shortly after the US market opens
-- (year-round, accounting for daylight saving), and calls
-- POST /api/cron/daily-summary which generates the summary for every user.

select cron.schedule(
  'daily-summary',
  '45 14 * * 1-5',
  $$ select private.post_to_app('/api/cron/daily-summary') $$
);
