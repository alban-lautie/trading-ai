-- Trading AI — schedule the alert evaluation job.
--
-- Adds a second cron job, on the same 5-minute cadence as the quote refresh,
-- that calls POST /api/cron/evaluate-alerts. The endpoint checks every active
-- alert against the latest stored quote and notifies the user on Telegram.

-- Generalize cron_config: hold the app base URL, not a single endpoint URL,
-- so several cron endpoints can share it.
alter table private.cron_config rename column endpoint_url to app_base_url;
update private.cron_config
  set app_base_url = regexp_replace(app_base_url, '/api/cron/refresh-quotes$', '');

-- Shared helper: POST to an app endpoint with the bearer cron secret.
drop function if exists private.refresh_quotes_job();

create or replace function private.post_to_app(path text)
returns void
language plpgsql
security definer
as $$
declare
  cfg private.cron_config;
begin
  select * into cfg from private.cron_config where id;

  if cfg.cron_secret is null or cfg.cron_secret = '' then
    raise notice 'private.cron_config.cron_secret is not set; skipping %', path;
    return;
  end if;

  perform net.http_post(
    url := cfg.app_base_url || path,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.cron_secret
    )
  );
end;
$$;

-- Re-point the existing quote refresh job at the shared helper.
select cron.schedule(
  'refresh-quotes',
  '*/5 * * * *',
  $$ select private.post_to_app('/api/cron/refresh-quotes') $$
);

-- Evaluate alerts every 5 minutes.
select cron.schedule(
  'evaluate-alerts',
  '*/5 * * * *',
  $$ select private.post_to_app('/api/cron/evaluate-alerts') $$
);
