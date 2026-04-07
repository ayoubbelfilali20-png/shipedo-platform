-- Adds call tracking fields used by the agent call center
alter table if exists public.orders
  add column if not exists call_attempts integer not null default 0,
  add column if not exists reminded_at timestamptz,
  add column if not exists last_call_at timestamptz,
  add column if not exists last_call_note text,
  add column if not exists last_call_agent_id uuid;

create index if not exists orders_reminded_at_idx on public.orders (reminded_at);
create index if not exists orders_status_idx on public.orders (status);
