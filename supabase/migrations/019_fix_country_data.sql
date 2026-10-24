-- Fix existing country data: old orders have country='Kenya' (full name) instead of 'KE' (code)
UPDATE orders SET country = 'KE' WHERE country = 'Kenya' OR country IS NULL OR country = '';
UPDATE orders SET country = 'TZ' WHERE country = 'Tanzania';

-- Products are shared across all countries — remove the country column from products
ALTER TABLE products DROP COLUMN IF EXISTS country;
DROP INDEX IF EXISTS idx_products_country;
