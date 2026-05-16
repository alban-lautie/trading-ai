-- Trading AI — daily AI portfolio summary.
-- One generated summary per user per day, cached so it is produced once.

create table public.daily_summaries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  summary_date  date not null default current_date,
  content       text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, summary_date)
);

create index daily_summaries_user_idx
  on public.daily_summaries (user_id, summary_date desc);

alter table public.daily_summaries enable row level security;

create policy "Users manage their own daily summaries"
  on public.daily_summaries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
