-- Trading AI — record realized sales of a position.
--
-- A sale captures a partial or full exit on a position: how many shares
-- were sold, at what price and when. The average buy price is snapshotted
-- on the sale row so the realized P/L stays correct even if the parent
-- position is edited afterwards. The remaining quantity on `positions`
-- is decremented by the application code when a sale is recorded; fully
-- exited positions (quantity = 0) are filtered out of the active list by
-- the queries.

create table public.position_sales (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  position_id         uuid not null references public.positions (id) on delete cascade,
  quantity            numeric(20, 8) not null check (quantity > 0),
  sell_price          numeric(20, 8) not null check (sell_price >= 0),
  -- Snapshot of the position's average buy price at sale time. Used to
  -- compute the realized P/L without depending on the parent row.
  average_buy_price   numeric(20, 8) not null check (average_buy_price >= 0),
  currency            text not null,
  sold_at             date not null default current_date,
  notes               text,
  created_at          timestamptz not null default now()
);

create index position_sales_user_id_idx
  on public.position_sales (user_id, sold_at desc);
create index position_sales_position_id_idx
  on public.position_sales (position_id);

alter table public.position_sales enable row level security;

create policy "Users manage their own sales"
  on public.position_sales for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
