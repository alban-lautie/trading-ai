-- Trading AI — schedule the market-open recommendation recompute.
--
-- Adds a cron job, on the same 5-minute cadence as the other jobs, that calls
-- POST /api/cron/recompute-recommendations. The endpoint detects when the US
-- or EU market has just opened and, if so, recomputes the AI sell
-- recommendations for the positions of that region and refreshes the affected
-- daily summaries. Outside the opening windows the endpoint is a no-op.

select cron.schedule(
  'recompute-recommendations',
  '*/5 * * * *',
  $$ select private.post_to_app('/api/cron/recompute-recommendations') $$
);
