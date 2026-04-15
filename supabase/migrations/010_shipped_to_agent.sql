-- Adds timestamp for when an order is shipped to the delivery agent
alter table if exists public.orders
  add column if not exists shipped_to_agent_at timestamptz;

create index if not exists orders_shipped_to_agent_at_idx
  on public.orders (shipped_to_agent_at);
