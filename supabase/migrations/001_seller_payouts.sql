-- ============================================================
-- Shipedo — Seller Payouts table
-- One row per (seller, billing period). Created when admin
-- clicks "Send invoices" on the weekly billing page.
-- The same row drives:
--   • the email sent to the seller
--   • the seller's invoices/payouts history
--   • the seller wallet balance (sum of net_amount where status='sent')
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.seller_payouts (
  id                uuid primary key default gen_random_uuid(),

  seller_id         text        not null,
  seller_name       text        not null,
  seller_email      text        not null,

  period_start      date        not null,
  period_end        date        not null,

  delivered_count   integer     not null default 0,
  gross_amount      numeric(12,2) not null default 0,   -- sum of delivered orders
  delivery_fee      numeric(12,2) not null default 0,   -- per-order fee × delivered_count
  net_amount        numeric(12,2) not null default 0,   -- gross - delivery_fee

  currency          text        not null default 'MAD',

  status            text        not null default 'sent'
                      check (status in ('sent','failed','pending')),

  email_message_id  text,
  email_error       text,

  sent_by           text,                                -- admin user id / name
  sent_at           timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

create index if not exists seller_payouts_seller_idx
  on public.seller_payouts (seller_id, period_end desc);

create index if not exists seller_payouts_period_idx
  on public.seller_payouts (period_start, period_end);

-- Prevent the same seller from being billed twice for the same period
create unique index if not exists seller_payouts_unique_period
  on public.seller_payouts (seller_id, period_start, period_end)
  where status = 'sent';

-- ============================================================
-- Optional: a view that exposes a wallet summary per seller,
-- handy for the seller dashboard.
-- ============================================================
create or replace view public.seller_wallet_summary as
select
  seller_id,
  seller_name,
  count(*)                                       as payout_count,
  coalesce(sum(net_amount), 0)                   as total_paid,
  coalesce(max(sent_at), null)                   as last_payout_at
from public.seller_payouts
where status = 'sent'
group by seller_id, seller_name;

-- ============================================================
-- RLS — keep this table locked down. Only the service role
-- (used by /api/admin/* routes) can write. Sellers read their
-- own rows by seller_id which we validate from localStorage on
-- the client; if you later add Supabase Auth, replace the read
-- policy with: using (seller_id = auth.uid()::text)
-- ============================================================
alter table public.seller_payouts enable row level security;

drop policy if exists "seller_payouts_admin_all" on public.seller_payouts;
create policy "seller_payouts_admin_all"
  on public.seller_payouts
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "seller_payouts_anon_read" on public.seller_payouts;
create policy "seller_payouts_anon_read"
  on public.seller_payouts
  for select
  to anon
  using (true);
