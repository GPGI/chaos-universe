-- Add subnet assignment fields to star_systems and planets
ALTER TABLE star_systems 
ADD COLUMN IF NOT EXISTS subnet_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_subnet_id TEXT,
ADD COLUMN IF NOT EXISTS native_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS native_coin_symbol TEXT DEFAULT 'CSN';

ALTER TABLE planets 
ADD COLUMN IF NOT EXISTS subnet_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_subnet_id TEXT,
ADD COLUMN IF NOT EXISTS node_id TEXT,
ADD COLUMN IF NOT EXISTS native_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS native_coin_symbol TEXT DEFAULT 'CSN';

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_star_systems_subnet ON star_systems(assigned_subnet_id);
CREATE INDEX IF NOT EXISTS idx_planets_subnet ON planets(assigned_subnet_id);
CREATE INDEX IF NOT EXISTS idx_planets_node ON planets(node_id);

-- Add comments
COMMENT ON COLUMN star_systems.subnet_name IS 'Name of the Avalanche subnet assigned to this star system';
COMMENT ON COLUMN star_systems.assigned_subnet_id IS 'ID of the Avalanche subnet assigned to this star system';
COMMENT ON COLUMN star_systems.native_balance IS 'Native coin balance for this star system';
COMMENT ON COLUMN star_systems.native_coin_symbol IS 'Symbol of the native coin (e.g., CSN)';
COMMENT ON COLUMN planets.subnet_name IS 'Name of the Avalanche subnet assigned to this planet';
COMMENT ON COLUMN planets.assigned_subnet_id IS 'ID of the Avalanche subnet assigned to this planet';
COMMENT ON COLUMN planets.node_id IS 'Avalanche node ID for this planet';
COMMENT ON COLUMN planets.native_balance IS 'Native coin balance for this planet';
COMMENT ON COLUMN planets.native_coin_symbol IS 'Symbol of the native coin (e.g., CSN)';

