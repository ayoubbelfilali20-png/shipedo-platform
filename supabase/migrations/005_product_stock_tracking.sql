-- Stock tracking columns used by expedition acceptance + order fulfillment
alter table if exists public.products
  add column if not exists stock integer not null default 0,
  add column if not exists total_quantity integer not null default 0,
  add column if not exists defective_quantity integer not null default 0;
