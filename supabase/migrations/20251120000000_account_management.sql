-- Account Management System
-- Supports: Personal accounts, Account clusters, Joint accounts, Business accounts, and Sub-accounts

-- Account types enum
CREATE TYPE account_type AS ENUM ('personal', 'cluster', 'joint', 'business', 'sub');

-- Main accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    type account_type NOT NULL DEFAULT 'personal',
    parent_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- For sub-accounts
    owner_wallet TEXT NOT NULL, -- Primary owner/creator
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_address)
);

-- Account clusters - groups of accounts
CREATE TABLE account_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_wallet TEXT NOT NULL,
    description TEXT,
    account_ids UUID[] DEFAULT ARRAY[]::UUID[], -- Array of account IDs in cluster
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Joint account members - for shared accounts
CREATE TABLE joint_account_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    member_wallet TEXT NOT NULL,
    permissions TEXT[] DEFAULT ARRAY['view']::TEXT[], -- 'view', 'transfer', 'manage', 'admin'
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by TEXT NOT NULL,
    UNIQUE(account_id, member_wallet)
);

-- Business account details
CREATE TABLE business_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    registration_number TEXT,
    tax_id TEXT,
    business_type TEXT, -- 'corporation', 'llc', 'partnership', etc.
    contact_email TEXT,
    contact_phone TEXT,
    address JSONB, -- Structured address data
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id)
);

-- Sub-account relationships (hierarchical)
CREATE TABLE sub_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    child_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'sub', -- 'sub', 'department', 'division', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_account_id, child_account_id),
    CHECK (parent_account_id != child_account_id) -- Prevent self-reference
);

-- Account balances cache (linked to user_balances)
CREATE TABLE account_balances (
    account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL REFERENCES accounts(wallet_address) ON DELETE CASCADE,
    xbgl_balance NUMERIC DEFAULT 0,
    chaos_balance NUMERIC DEFAULT 0,
    sc_balance NUMERIC DEFAULT 0,
    avax_balance NUMERIC DEFAULT 0,
    last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accounts_owner ON accounts(owner_wallet);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_parent ON accounts(parent_id);
CREATE INDEX idx_accounts_wallet ON accounts(wallet_address);
CREATE INDEX idx_account_clusters_owner ON account_clusters(owner_wallet);
CREATE INDEX idx_joint_account_members_account ON joint_account_members(account_id);
CREATE INDEX idx_joint_account_members_member ON joint_account_members(member_wallet);
CREATE INDEX idx_business_accounts_account ON business_accounts(account_id);
CREATE INDEX idx_sub_accounts_parent ON sub_accounts(parent_account_id);
CREATE INDEX idx_sub_accounts_child ON sub_accounts(child_account_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accounts
CREATE POLICY "Users can view all accounts" ON accounts
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own accounts" ON accounts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their accounts" ON accounts
    FOR UPDATE USING (
        owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        OR id IN (
            SELECT account_id FROM joint_account_members 
            WHERE member_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND 'admin' = ANY(permissions)
        )
    );

CREATE POLICY "Owners can delete their accounts" ON accounts
    FOR DELETE USING (
        owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- RLS Policies for account_clusters
CREATE POLICY "Users can view all clusters" ON account_clusters
    FOR SELECT USING (true);

CREATE POLICY "Users can create their own clusters" ON account_clusters
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their clusters" ON account_clusters
    FOR UPDATE USING (
        owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

CREATE POLICY "Owners can delete their clusters" ON account_clusters
    FOR DELETE USING (
        owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
    );

-- RLS Policies for joint_account_members
CREATE POLICY "Users can view joint account members" ON joint_account_members
    FOR SELECT USING (true);

CREATE POLICY "Account owners can manage members" ON joint_account_members
    FOR ALL USING (
        account_id IN (
            SELECT id FROM accounts 
            WHERE owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
        OR account_id IN (
            SELECT account_id FROM joint_account_members 
            WHERE member_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
            AND 'admin' = ANY(permissions)
        )
    );

-- RLS Policies for business_accounts
CREATE POLICY "Users can view business accounts" ON business_accounts
    FOR SELECT USING (true);

CREATE POLICY "Account owners can manage business details" ON business_accounts
    FOR ALL USING (
        account_id IN (
            SELECT id FROM accounts 
            WHERE owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

-- RLS Policies for sub_accounts
CREATE POLICY "Users can view sub-account relationships" ON sub_accounts
    FOR SELECT USING (true);

CREATE POLICY "Account owners can manage sub-accounts" ON sub_accounts
    FOR ALL USING (
        parent_account_id IN (
            SELECT id FROM accounts 
            WHERE owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
    );

-- RLS Policies for account_balances
CREATE POLICY "Users can view all account balances" ON account_balances
    FOR SELECT USING (true);

CREATE POLICY "System can manage balances" ON account_balances
    FOR ALL USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_clusters_updated_at BEFORE UPDATE ON account_clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_accounts_updated_at BEFORE UPDATE ON business_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

