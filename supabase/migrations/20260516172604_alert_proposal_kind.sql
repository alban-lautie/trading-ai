-- Trading AI — link an alert to the position-action proposal it came from.
-- `proposal_kind` is null for alerts created manually, and set (take_profit,
-- stop_loss, reinforce…) for alerts armed from a proposal switch.

alter table public.alerts add column proposal_kind text;

-- At most one alert per (position, proposal kind).
create unique index alerts_proposal_unique
  on public.alerts (position_id, proposal_kind)
  where proposal_kind is not null;
