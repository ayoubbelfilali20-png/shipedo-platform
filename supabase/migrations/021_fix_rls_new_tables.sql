-- Fix RLS policies for product_stock and seller_countries
-- These tables need anon/authenticated access for client-side queries

ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to product_stock" ON product_stock
  FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON product_stock TO anon, authenticated;

ALTER TABLE seller_countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to seller_countries" ON seller_countries
  FOR ALL USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON seller_countries TO anon, authenticated;
