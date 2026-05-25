-- Trading AI — allow positions to hit quantity = 0 after a full sale.
--
-- The original schema required quantity > 0. Once the sales feature was
-- added, a full exit (selling the entire position) decrements quantity
-- to 0 and trips the check. The active portfolio view filters out 0-qty
-- rows already, so keeping them is safe and lets position_sales rows
-- stay anchored to their parent.

alter table public.positions
  drop constraint positions_quantity_check;

alter table public.positions
  add constraint positions_quantity_check check (quantity >= 0);
