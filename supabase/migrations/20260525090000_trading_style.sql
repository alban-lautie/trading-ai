-- Trading style: per-row marker that switches the AI recommendation prompts
-- between a swing/long horizon (the existing behavior) and a day-trading
-- horizon (entries near the current price, tighter exits aimed at 5–10% gains
-- on the session, possibly via breakouts above the recent high).

create type public.trading_style as enum ('day_trading', 'swing');

alter table public.positions
  add column trading_style public.trading_style not null default 'swing';

alter table public.watchlist
  add column trading_style public.trading_style not null default 'swing';
