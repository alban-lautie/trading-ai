-- Trading AI — restrict the recommendation recompute to weekdays.
--
-- The recompute logic is already a no-op outside market hours (it is gated by
-- justOpened/isMarketOpen, which only return true Monday–Friday). The cron
-- itself, however, still fired its HTTP request every 5 minutes on weekends.
-- Limiting the schedule to Monday–Friday drops those useless weekend calls.
-- Re-scheduling with the same job name updates the existing job.

select cron.schedule(
  'recompute-recommendations',
  '*/5 * * * 1-5',
  $$ select private.post_to_app('/api/cron/recompute-recommendations') $$
);
