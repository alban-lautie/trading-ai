-- Position intentions
-- Records, per position, what the user wants out of the holding so the AI can
-- produce sell recommendations aligned with that intent rather than with a
-- one-size-fits-all heuristic.

create type public.position_objective as enum ('quick_gain', 'long_term', 'income');
create type public.position_horizon as enum ('short', 'medium', 'long');
create type public.risk_tolerance as enum ('low', 'medium', 'high');

alter table public.positions
  add column objective           public.position_objective not null default 'long_term',
  add column horizon             public.position_horizon   not null default 'medium',
  add column risk_tolerance      public.risk_tolerance     not null default 'medium',
  add column target_gain_percent numeric(10, 4)
    check (target_gain_percent is null or target_gain_percent > 0);
