-- Per-order print counter so agents/admins can see how many times a label was printed
alter table if exists public.orders
  add column if not exists print_count integer not null default 0;

-- Backfill: any order already marked printed counts as at least 1 print
update public.orders
  set print_count = 1
  where printed = true and print_count = 0;
