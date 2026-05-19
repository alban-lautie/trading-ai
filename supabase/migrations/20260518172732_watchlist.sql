-- Trading AI — watchlist: stocks the user follows but has not bought yet.
--
-- For each watched symbol the AI recommends an entry point. The recommendation
-- is stored inline on the row (a 1:1 relation, unlike position_recommendations
-- which is a separate table). An optional price alert fires on Telegram when
-- the quote reaches the recommended entry price.

create type public.entry_action as enum ('buy_now', 'wait');

create table public.watchlist (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users (id) on delete cascade,
  symbol                      text not null,
  name                        text,
  currency                    text not null default 'USD',
  -- Gain the user is aiming for once bought; informs the entry recommendation.
  target_gain_percent         numeric(10, 4)
    check (target_gain_percent is null or target_gain_percent > 0),
  notes                       text,
  -- AI entry recommendation, filled on demand (null until first generated).
  entry_action                public.entry_action,
  recommended_entry_price     numeric(20, 8),
  conviction                  public.conviction_level,
  rationale                   text,
  recommendation_generated_at timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index watchlist_user_id_idx on public.watchlist (user_id);

create trigger watchlist_set_updated_at
  before update on public.watchlist
  for each row execute function public.set_updated_at();

alter table public.watchlist enable row level security;

create policy "Users manage their own watchlist"
  on public.watchlist for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Entry-price alert: an alert tied to a watchlist item rather than a position.
-- It carries a null position_id; removing the watchlist item drops the alert.
alter table public.alerts
  add column watchlist_id uuid references public.watchlist (id) on delete cascade;
