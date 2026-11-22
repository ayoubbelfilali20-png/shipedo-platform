-- The original orders_status_check constraint predates the agent follow-up
-- statuses, so updates to 'delivered_by_agent' / 'paid_by_agent' were rejected.
-- Recreate it with the full status list. NOT VALID so legacy rows with any
-- odd status values don't block the migration.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',
    'confirmed',
    'prepared',
    'shipped',
    'shipped_to_agent',
    'delivered',
    'delivered_by_agent',
    'paid_by_agent',
    'returned',
    'cancelled'
  )) NOT VALID;
