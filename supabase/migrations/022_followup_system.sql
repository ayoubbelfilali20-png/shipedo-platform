-- Follow-up agents table
CREATE TABLE IF NOT EXISTS followup_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  password text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  country text NOT NULL DEFAULT 'TZ',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE followup_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON followup_agents FOR ALL USING (true) WITH CHECK (true);

-- Follow-up notes table (multi-note system per order)
CREATE TABLE IF NOT EXISTS followup_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  agent_name text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE followup_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON followup_notes FOR ALL USING (true) WITH CHECK (true);

-- Add new timestamp columns to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_by_agent_at timestamptz;
