-- Position recommendations
-- Stores the AI sell recommendation for each position: the suggested action,
-- the price levels (sell target and protective stop) and a conviction level.
-- One row per position; recomputed at each market open and on demand.

create type public.recommendation_action as enum (
  'sell_now',
  'hold',
  'reinforce'
);

create type public.conviction_level as enum ('low', 'medium', 'high');

create table public.position_recommendations (
  id                uuid primary key default gen_random_uuid(),
  position_id       uuid not null unique
                      references public.positions (id) on delete cascade,
  user_id           uuid not null references auth.users (id) on delete cascade,
  action            public.recommendation_action not null,
  sell_target_price numeric(20, 8),
  stop_loss_price   numeric(20, 8),
  conviction        public.conviction_level not null,
  generated_at      timestamptz not null default now()
);

create index position_recommendations_user_id_idx
  on public.position_recommendations (user_id);

alter table public.position_recommendations enable row level security;

create policy "Users manage their own recommendations"
  on public.position_recommendations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
