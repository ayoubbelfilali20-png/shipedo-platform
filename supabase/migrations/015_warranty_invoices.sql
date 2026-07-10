CREATE TABLE IF NOT EXISTS warranty_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  product_name text NOT NULL,
  product_price numeric NOT NULL DEFAULT 0,
  warranty_text text NOT NULL DEFAULT 'This product is covered under warranty. We are not responsible if the product stops working. The issue is from us, not a client problem. We can replace it if it is no longer working.',
  invoice_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
