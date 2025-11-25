-- Phase 1: Core Database Schema for Sarakt Project

-- 1. Plots table (off-chain cache of blockchain state)
CREATE TABLE plots (
    id INTEGER PRIMARY KEY CHECK (id >= 0 AND id < 10000),
    owner_wallet TEXT,
    zone_type TEXT CHECK (zone_type IN ('residential', 'business', 'industrial')),
    building_stage INTEGER DEFAULT 0 CHECK (building_stage >= 0 AND building_stage <= 3),
    coord_x INTEGER NOT NULL,
    coord_y INTEGER NOT NULL,
    metadata_cid TEXT,
    production_rate NUMERIC DEFAULT 0,
    workers JSONB DEFAULT '[]'::jsonb,
    last_tick TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NPCs table
CREATE TABLE npcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id INTEGER UNIQUE,
    employer_wallet TEXT,
    assigned_plot_id INTEGER REFERENCES plots(id),
    personality_vector JSONB DEFAULT '{
        "aggression": 50,
        "loyalty": 50,
        "ambition": 50,
        "skill_affinity": 50,
        "social": 50
    }'::jsonb,
    skills JSONB DEFAULT '{
        "woodcutting": 0,
        "hunting": 0,
        "farming": 0,
        "water_gathering": 0,
        "crafting": 0,
        "trading": 0,
        "combat": 0
    }'::jsonb,
    loyalty_score INTEGER DEFAULT 50 CHECK (loyalty_score >= 0 AND loyalty_score <= 100),
    employment_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Digital identities table
CREATE TABLE digital_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    identity_type TEXT CHECK (identity_type IN ('personal', 'corporate', 'organization')),
    avatar_cid TEXT,
    metadata_cid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Factions table
CREATE TABLE factions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    founder_wallet TEXT NOT NULL,
    governance_model TEXT CHECK (governance_model IN ('corporation', 'city_state', 'tribe')),
    treasury_balance JSONB DEFAULT '{
        "xBGL": 0,
        "Chaos": 0,
        "SC": 0
    }'::jsonb,
    member_wallets TEXT[] DEFAULT ARRAY[]::TEXT[],
    plot_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions table (off-chain cache)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash TEXT UNIQUE NOT NULL,
    block_number BIGINT,
    type TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    amount NUMERIC,
    token_type TEXT,
    metadata JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Economy ticks table (production tracking)
CREATE TABLE economy_ticks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tick_number BIGINT NOT NULL,
    plot_id INTEGER REFERENCES plots(id),
    resources_generated JSONB,
    chaos_tokens_generated NUMERIC DEFAULT 0,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. User balances table (cached from blockchain)
CREATE TABLE user_balances (
    wallet_address TEXT PRIMARY KEY,
    xbgl_balance NUMERIC DEFAULT 0,
    chaos_balance NUMERIC DEFAULT 0,
    sc_balance NUMERIC DEFAULT 0,
    avax_balance NUMERIC DEFAULT 0,
    last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Black market invites table
CREATE TABLE black_market_invites (
    wallet_address TEXT PRIMARY KEY,
    invited_by TEXT,
    invite_code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    invited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_plots_owner ON plots(owner_wallet);
CREATE INDEX idx_npcs_employer ON npcs(employer_wallet);
CREATE INDEX idx_npcs_plot ON npcs(assigned_plot_id);
CREATE INDEX idx_transactions_from ON transactions(from_address);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_economy_ticks_plot ON economy_ticks(plot_id);
CREATE INDEX idx_user_balances_last_synced ON user_balances(last_synced);

-- Enable RLS
ALTER TABLE plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE npcs ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE black_market_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE economy_ticks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Plots
CREATE POLICY "Plots are viewable by everyone" ON plots FOR SELECT USING (true);
CREATE POLICY "System can insert plots" ON plots FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update plots" ON plots FOR UPDATE USING (true);

-- RLS Policies: NPCs
CREATE POLICY "NPCs viewable by everyone" ON npcs FOR SELECT USING (true);
CREATE POLICY "System can manage NPCs" ON npcs FOR ALL USING (true);

-- RLS Policies: Digital IDs
CREATE POLICY "Digital IDs viewable by everyone" ON digital_identities FOR SELECT USING (true);
CREATE POLICY "Anyone can create identity" ON digital_identities FOR INSERT WITH CHECK (true);

-- RLS Policies: Factions
CREATE POLICY "Factions viewable by everyone" ON factions FOR SELECT USING (true);
CREATE POLICY "Anyone can create faction" ON factions FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update factions" ON factions FOR UPDATE USING (true);

-- RLS Policies: Transactions
CREATE POLICY "Transactions viewable by everyone" ON transactions FOR SELECT USING (true);
CREATE POLICY "System can insert transactions" ON transactions FOR INSERT WITH CHECK (true);

-- RLS Policies: User balances
CREATE POLICY "Balances viewable by everyone" ON user_balances FOR SELECT USING (true);
CREATE POLICY "System can manage balances" ON user_balances FOR ALL USING (true);

-- RLS Policies: Black market
CREATE POLICY "Anyone can view their invite" ON black_market_invites FOR SELECT USING (true);
CREATE POLICY "System can manage invites" ON black_market_invites FOR ALL USING (true);

-- RLS Policies: Economy ticks
CREATE POLICY "Economy ticks viewable by everyone" ON economy_ticks FOR SELECT USING (true);
CREATE POLICY "System can insert ticks" ON economy_ticks FOR INSERT WITH CHECK (true);

-- Seed initial 10,000 plots
INSERT INTO plots (id, zone_type, coord_x, coord_y, building_stage)
SELECT 
    id,
    CASE 
        WHEN id % 3 = 0 THEN 'residential'
        WHEN id % 3 = 1 THEN 'business'
        ELSE 'industrial'
    END as zone_type,
    (id % 100) as coord_x,
    (id / 100) as coord_y,
    0 as building_stage
FROM generate_series(0, 9999) as id;