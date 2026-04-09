-- ============================================================
-- Wallet, USD billing & withdraw system
-- All money columns are USD. KES is display-only via rate.
-- ============================================================

-- Per-seller fee config (set on create, editable later)
alter table public.sellers add column if not exists confirmation_fee_usd numeric(10,2) not null default 0;
alter table public.sellers add column if not exists upsell_fee_usd       numeric(10,2) not null default 0;
alter table public.sellers add column if not exists cross_sell_fee_usd   numeric(10,2) not null default 0;
alter table public.sellers add column if not exists shipping_fee_usd     numeric(10,2) not null default 0;

-- Wallet (one row per seller)
create table if not exists public.seller_wallets (
  seller_id  uuid primary key references public.sellers(id) on delete cascade,
  balance_usd numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- Wallet transaction log
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  type text not null check (type in ('invoice','withdraw','adjust')),
  amount_usd numeric(12,2) not null,           -- positive credit / negative debit
  ref_id uuid,                                 -- invoice id or withdraw id
  note text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_seller_idx on public.wallet_transactions (seller_id, created_at desc);

-- Invoices (USD only, weekly statement that credits the wallet)
create table if not exists public.seller_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  seller_id uuid not null references public.sellers(id) on delete cascade,
  seller_name text,
  seller_email text,
  period_start date not null,
  period_end   date not null,
  delivered_count integer not null default 0,
  orders jsonb not null default '[]'::jsonb,
  total_sales_usd numeric(12,2) not null default 0,
  confirmation_fees_usd numeric(12,2) not null default 0,
  upsell_fees_usd numeric(12,2) not null default 0,
  cross_sell_fees_usd numeric(12,2) not null default 0,
  shipping_fees_usd numeric(12,2) not null default 0,
  total_fees_usd numeric(12,2) not null default 0,
  net_usd numeric(12,2) not null default 0,
  status text not null default 'sent' check (status in ('draft','sent')),
  created_at timestamptz not null default now()
);
create index if not exists seller_invoices_seller_idx on public.seller_invoices (seller_id, created_at desc);

-- Withdraw requests
create table if not exists public.withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  seller_name text,
  amount_usd numeric(12,2) not null check (amount_usd > 0),
  method text not null check (method in ('binance','redotpay')),
  account_details text not null,
  status text not null default 'pending' check (status in ('pending','validated','rejected')),
  note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by text
);
create index if not exists withdraw_status_idx on public.withdraw_requests (status, requested_at desc);

-- Order-level fee/upsell flags (so an order can be tagged for fees)
alter table public.orders add column if not exists is_upsell boolean not null default false;
alter table public.orders add column if not exists is_cross_sell boolean not null default false;

-- Permissions
alter table public.seller_wallets       disable row level security;
alter table public.wallet_transactions  disable row level security;
alter table public.seller_invoices      disable row level security;
alter table public.withdraw_requests    disable row level security;

grant all on
  public.seller_wallets, public.wallet_transactions,
  public.seller_invoices, public.withdraw_requests
  to anon, authenticated;
