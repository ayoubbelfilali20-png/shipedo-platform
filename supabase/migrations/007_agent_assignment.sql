-- Per-order agent assignment for round-robin distribution
alter table public.orders
  add column if not exists assigned_agent_id uuid references public.agents(id);

create index if not exists orders_assigned_agent_id_idx
  on public.orders (assigned_agent_id);

-- Full call history (one row per call attempt)
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  agent_id uuid references public.agents(id),
  agent_name text,
  action text not null,        -- confirmed | not_reached | cancelled | rescheduled | recall
  note text,
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists call_logs_order_id_idx on public.call_logs (order_id);
create index if not exists call_logs_agent_id_idx on public.call_logs (agent_id);
create index if not exists call_logs_created_at_idx on public.call_logs (created_at desc);
