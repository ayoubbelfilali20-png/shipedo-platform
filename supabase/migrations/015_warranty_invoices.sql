CREATE TABLE IF NOT EXISTS warranty_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  product_name text NOT NULL,
  product_price numeric NOT NULL DEFAULT 0,
  warranty_text text NOT NULL,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  warranty_start timestamptz NOT NULL DEFAULT now(),
  warranty_end timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  created_at timestamptz NOT NULL DEFAULT now()
);
