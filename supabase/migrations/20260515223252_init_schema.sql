-- Trading AI — initial schema
-- Tables: positions, alerts, ai_monitoring_config, ai_reports.
-- Every table is scoped to the authenticated user via Row Level Security.

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at in sync on every UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.alert_type as enum (
  'price_above',
  'price_below',
  'change_percent_above',
  'change_percent_below'
);

create type public.ai_frequency as enum ('daily', 'weekly', 'monthly');

create type public.ai_delivery as enum ('email', 'in_app', 'both');

-- ---------------------------------------------------------------------------
-- positions: a holding bought by the user.
-- ---------------------------------------------------------------------------
create table public.positions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  symbol          text not null,
  name            text,
  quantity        numeric(20, 8) not null check (quantity > 0),
  average_price   numeric(20, 8) not null check (average_price >= 0),
  currency        text not null default 'USD',
  opened_at       date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index positions_user_id_idx on public.positions (user_id);

create trigger positions_set_updated_at
  before update on public.positions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- alerts: a price/variation threshold watched for a symbol.
-- ---------------------------------------------------------------------------
create table public.alerts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  position_id   uuid references public.positions (id) on delete cascade,
  symbol        text not null,
  type          public.alert_type not null,
  threshold     numeric(20, 8) not null,
  is_active     boolean not null default true,
  triggered_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index alerts_user_id_idx on public.alerts (user_id);
create index alerts_active_idx on public.alerts (is_active) where is_active;

create trigger alerts_set_updated_at
  before update on public.alerts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_monitoring_config: one configurable AI monitoring profile per user.
-- ---------------------------------------------------------------------------
create table public.ai_monitoring_config (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  is_enabled    boolean not null default false,
  frequency     public.ai_frequency not null default 'weekly',
  tone          text not null default 'neutral',
  focus_areas   text[] not null default array['risk', 'diversification', 'opportunities'],
  delivery      public.ai_delivery not null default 'email',
  last_run_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger ai_monitoring_config_set_updated_at
  before update on public.ai_monitoring_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_reports: AI analyses generated for the user's portfolio.
-- ---------------------------------------------------------------------------
create table public.ai_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index ai_reports_user_id_idx on public.ai_reports (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user can only read/write their own rows.
-- ---------------------------------------------------------------------------
alter table public.positions enable row level security;
alter table public.alerts enable row level security;
alter table public.ai_monitoring_config enable row level security;
alter table public.ai_reports enable row level security;

create policy "Users manage their own positions"
  on public.positions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own alerts"
  on public.alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own AI config"
  on public.ai_monitoring_config for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read their own AI reports"
  on public.ai_reports for select
  using (auth.uid() = user_id);

create policy "Users insert their own AI reports"
  on public.ai_reports for insert
  with check (auth.uid() = user_id);
