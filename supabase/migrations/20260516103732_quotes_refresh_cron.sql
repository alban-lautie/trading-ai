-- Trading AI — stored quotes and the scheduled refresh job.
--
-- A cron (pg_cron) calls the /api/cron/refresh-quotes endpoint every 5 minutes.
-- That endpoint fetches live prices and upserts them into public.quotes, which
-- the dashboard reads instead of hitting the provider on every page view.

-- ---------------------------------------------------------------------------
-- quotes: latest market quote per symbol (shared, non-user-scoped data).
-- ---------------------------------------------------------------------------
create table public.quotes (
  symbol          text primary key,
  name            text,
  price           numeric(20, 8) not null,
  change          numeric(20, 8) not null default 0,
  change_percent  numeric(12, 4) not null default 0,
  currency        text not null default 'USD',
  updated_at      timestamptz not null default now()
);

alter table public.quotes enable row level security;

-- Any authenticated user may read quotes. Writes happen only through the
-- service role (the cron endpoint), which bypasses RLS.
create policy "Authenticated users can read quotes"
  on public.quotes for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Scheduled refresh via pg_cron + pg_net.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Private schema: not exposed through the API.
create schema if not exists private;

-- Single-row config holding the endpoint URL and the shared cron secret.
-- The secret is intentionally empty here; it is set per environment and must
-- match CRON_SECRET in the application's environment.
create table private.cron_config (
  id            boolean primary key default true,
  endpoint_url  text not null,
  cron_secret   text not null default '',
  constraint cron_config_singleton check (id)
);

insert into private.cron_config (id, endpoint_url)
  values (true, 'http://host.docker.internal:3000/api/cron/refresh-quotes')
  on conflict (id) do nothing;

-- Posts to the refresh endpoint with the bearer secret.
create or replace function private.refresh_quotes_job()
returns void
language plpgsql
security definer
as $$
declare
  cfg private.cron_config;
begin
  select * into cfg from private.cron_config where id;

  if cfg.cron_secret is null or cfg.cron_secret = '' then
    raise notice 'private.cron_config.cron_secret is not set; skipping refresh';
    return;
  end if;

  perform net.http_post(
    url := cfg.endpoint_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.cron_secret
    )
  );
end;
$$;

-- Run every 5 minutes. Re-scheduling with the same name updates the job.
select cron.schedule(
  'refresh-quotes',
  '*/5 * * * *',
  $$ select private.refresh_quotes_job() $$
);
