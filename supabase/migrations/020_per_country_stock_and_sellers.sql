-- ============================================================
-- Per-country stock: products are shared, stock is per country
-- ============================================================
CREATE TABLE IF NOT EXISTS product_stock (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  country text NOT NULL DEFAULT 'KE',
  stock integer NOT NULL DEFAULT 0,
  total_quantity integer NOT NULL DEFAULT 0,
  defective_quantity integer NOT NULL DEFAULT 0,
  UNIQUE(product_id, country)
);

CREATE INDEX IF NOT EXISTS idx_product_stock_product ON product_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_country ON product_stock(country);

-- Migrate existing product stock to Kenya row
INSERT INTO product_stock (product_id, country, stock, total_quantity, defective_quantity)
SELECT id, 'KE', COALESCE(stock, 0), COALESCE(total_quantity, 0), COALESCE(defective_quantity, 0)
FROM products
ON CONFLICT (product_id, country) DO NOTHING;

-- ============================================================
-- Expeditions per country
-- ============================================================
ALTER TABLE expeditions ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'KE';
CREATE INDEX IF NOT EXISTS idx_expeditions_country ON expeditions(country);

-- ============================================================
-- Sellers multi-country: same seller can work in multiple countries
-- ============================================================
CREATE TABLE IF NOT EXISTS seller_countries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL,
  country text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, country)
);

CREATE INDEX IF NOT EXISTS idx_seller_countries_seller ON seller_countries(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_countries_country ON seller_countries(country);

-- Migrate: all existing active sellers → their current country
INSERT INTO seller_countries (seller_id, country, status)
SELECT id, COALESCE(country, 'KE'), 'active'
FROM sellers
WHERE status = 'active'
ON CONFLICT (seller_id, country) DO NOTHING;
