-- Create star_systems table for Avalanche subnets
CREATE TABLE IF NOT EXISTS star_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  subnet_id TEXT UNIQUE,
  owner_wallet TEXT NOT NULL,
  treasury_balance JSONB DEFAULT '{"xBGL": 0, "AVAX": 0}'::jsonb,
  planets TEXT[] DEFAULT ARRAY[]::TEXT[],
  rpc_url TEXT,
  chain_id INTEGER,
  tribute_percent NUMERIC DEFAULT 5,
  status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create planets table for master nodes
CREATE TABLE IF NOT EXISTS planets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  star_system_id UUID REFERENCES star_systems(id) ON DELETE CASCADE,
  node_type TEXT DEFAULT 'master' CHECK (node_type IN ('master', 'validator')),
  owner_wallet TEXT NOT NULL,
  ip_address TEXT,
  status TEXT DEFAULT 'deploying' CHECK (status IN ('active', 'deploying', 'inactive')),
  planet_type TEXT CHECK (planet_type IN ('habitable', 'resource', 'research', 'military')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(star_system_id, name)
);

-- Enable RLS
ALTER TABLE star_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE planets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for star_systems
CREATE POLICY "Star systems viewable by everyone" ON star_systems
  FOR SELECT USING (true);

CREATE POLICY "Users can create star systems" ON star_systems
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their star systems" ON star_systems
  FOR UPDATE USING (owner_wallet = (auth.jwt() ->> 'user_metadata')::jsonb ->> 'wallet_address');

-- RLS Policies for planets
CREATE POLICY "Planets viewable by everyone" ON planets
  FOR SELECT USING (true);

CREATE POLICY "Users can create planets" ON planets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their planets" ON planets
  FOR UPDATE USING (owner_wallet = (auth.jwt() ->> 'user_metadata')::jsonb ->> 'wallet_address');

-- Create indexes for performance
CREATE INDEX idx_star_systems_owner ON star_systems(owner_wallet);
CREATE INDEX idx_star_systems_status ON star_systems(status);
CREATE INDEX idx_planets_star_system ON planets(star_system_id);
CREATE INDEX idx_planets_owner ON planets(owner_wallet);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_star_systems_updated_at
  BEFORE UPDATE ON star_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planets_updated_at
  BEFORE UPDATE ON planets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();