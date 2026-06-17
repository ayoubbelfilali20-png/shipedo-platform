-- Add delivery company tracking number to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_tracking text;
