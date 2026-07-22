ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
UPDATE orders SET status_changed_at = COALESCE(last_call_at, shipped_to_agent_at, shipped_at, delivered_at, returned_at, created_at) WHERE status_changed_at IS NULL;
