-- Trading AI — per-position monitoring toggle.
--
-- Lets the user pause everything that "watches" a position: alert evaluation,
-- AI sell recommendations (manual and scheduled), and inclusion in the daily
-- AI summary. Defaults to true so existing positions keep behaving as before.

alter table public.positions
  add column monitoring_enabled boolean not null default true;
