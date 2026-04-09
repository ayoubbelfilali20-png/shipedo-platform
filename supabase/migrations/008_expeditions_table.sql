-- Expeditions: shared between sellers (creators) and admin (acceptors)
create table if not exists public.expeditions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  origin text not null,
  origin_city text not null,
  destination text not null default 'Kenya',
  status text not null default 'pending',
  products jsonb not null default '[]'::jsonb,
  total_items integer not null default 0,
  total_cost numeric not null default 0,
  shipping_cost numeric not null default 0,
  customs_fee numeric not null default 0,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  tracking_number text,
  carrier text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expeditions_created_by_idx on public.expeditions (created_by);
create index if not exists expeditions_status_idx on public.expeditions (status);
