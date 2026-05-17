-- Trading AI — tiered sell targets.
--
-- A recommendation can now carry several sell targets (scaling out) instead
-- of a single price: each target sells a share of the position at its level.
-- The AI decides how many tiers (1 to 3) make sense given the position size.
-- Each alert armed from a tier carries the percentage to sell when it fires.

alter table public.position_recommendations
  drop column sell_target_price,
  add column sell_targets jsonb not null default '[]'::jsonb;

alter table public.alerts
  add column tranche_percent numeric(6, 2)
    check (tranche_percent is null or (tranche_percent > 0 and tranche_percent <= 100));
