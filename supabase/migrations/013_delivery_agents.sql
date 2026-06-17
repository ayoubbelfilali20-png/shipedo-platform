-- Delivery agents table
CREATE TABLE IF NOT EXISTS delivery_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  password text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON delivery_agents FOR ALL USING (true) WITH CHECK (true);
