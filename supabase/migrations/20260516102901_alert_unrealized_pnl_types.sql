-- Trading AI — alert types for unrealized P/L against the purchase price.
-- 'unrealized_gain_above': triggers when the position is up by >= threshold %.
-- 'unrealized_loss_above': triggers when the position is down by >= threshold %.

alter type public.alert_type add value if not exists 'unrealized_gain_above';
alter type public.alert_type add value if not exists 'unrealized_loss_above';
