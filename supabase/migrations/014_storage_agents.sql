CREATE TABLE IF NOT EXISTS storage_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  password text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE storage_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_full_access" ON storage_agents FOR ALL USING (true) WITH CHECK (true);
