-- =============================================================
-- Shipedo — Fix missing columns in NEW project before migration
-- Run this in: New Project → SQL Editor → Run
-- All statements use IF NOT EXISTS — safe to run multiple times
-- =============================================================

-- ── sellers ──────────────────────────────────────────────────
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS city                 text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS password             text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS notes                text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS payment_methods      jsonb    NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS address              text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS sheet_ingest_token   text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS confirmation_fee_usd numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS upsell_fee_usd       numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS cross_sell_fee_usd   numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS shipping_fee_usd     numeric(10,2) NOT NULL DEFAULT 0;

-- ── agents ───────────────────────────────────────────────────
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS password  text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS notes     text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS city      text;

-- ── products ─────────────────────────────────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category           text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description        text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS origin             text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS buying_price       numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS selling_price      numeric NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_link       text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code               text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variant_code       text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_video_link text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url          text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_quantity     integer NOT NULL DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS defective_quantity integer NOT NULL DEFAULT 0;

-- ── orders ───────────────────────────────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cod_amount          numeric          NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country             text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS items               jsonb            NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS seller_name         text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source              text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS subuser             text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status      text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancel_reason       text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS printed             boolean          NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS returned_at         timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at          timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at        timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_total      numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_to_agent_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS print_count         integer          NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS call_attempts       integer          NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reminded_at         timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_call_at        timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_call_note      text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_call_agent_id  uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS assigned_agent_id   uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_upsell           boolean          NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_cross_sell       boolean          NOT NULL DEFAULT false;

-- ── call_logs ────────────────────────────────────────────────
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS reminded_at   timestamptz;

-- ── Grant permissions (in case RLS blocks migration) ─────────
ALTER TABLE public.sellers      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products     DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs    DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.sellers      TO anon, authenticated;
GRANT ALL ON public.agents       TO anon, authenticated;
GRANT ALL ON public.products     TO anon, authenticated;
GRANT ALL ON public.orders       TO anon, authenticated;
GRANT ALL ON public.call_logs    TO anon, authenticated;
