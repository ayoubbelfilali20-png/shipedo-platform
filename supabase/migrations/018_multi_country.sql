-- Multi-country support: Kenya (KE) + Tanzania (TZ)
-- Add country column to all main tables, default KE for existing data

ALTER TABLE orders ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE team_leaders ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE delivery_agents ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE storage_agents ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
ALTER TABLE products ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';

-- Index for fast country filtering
CREATE INDEX IF NOT EXISTS idx_orders_country ON orders(country);
CREATE INDEX IF NOT EXISTS idx_sellers_country ON sellers(country);
CREATE INDEX IF NOT EXISTS idx_agents_country ON agents(country);
CREATE INDEX IF NOT EXISTS idx_products_country ON products(country);
