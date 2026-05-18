-- Trading AI — move scheduled jobs from pg_cron to Vercel Cron.
--
-- The four cron jobs are now declared in vercel.json and invoked directly by
-- Vercel, which attaches the CRON_SECRET bearer token automatically. The
-- pg_cron mechanism is therefore removed: the scheduled jobs, the shared
-- helper private.post_to_app and the private.cron_config table.
--
-- The pg_cron / pg_net extensions are left installed but unused, so the
-- removal stays trivially reversible.

select cron.unschedule('refresh-quotes');
select cron.unschedule('evaluate-alerts');
select cron.unschedule('daily-summary');
select cron.unschedule('recompute-recommendations');

drop function if exists private.post_to_app(text);
drop table if exists private.cron_config;
drop schema if exists private;
