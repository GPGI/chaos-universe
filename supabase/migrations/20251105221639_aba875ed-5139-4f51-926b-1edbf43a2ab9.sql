-- Create enum for portfolio status
CREATE TYPE portfolio_status AS ENUM ('active', 'paused', 'closed');

-- Create enum for automation types
CREATE TYPE automation_type AS ENUM ('auto_reinvest', 'recurring_deposit', 'rebalance');

-- Create enum for manager application status
CREATE TYPE manager_status AS ENUM ('pending', 'approved', 'rejected');

-- Portfolios table
CREATE TABLE portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  initial_investment NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  roi_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status portfolio_status DEFAULT 'active',
  risk_level TEXT DEFAULT 'moderate',
  auto_reinvest_enabled BOOLEAN DEFAULT false,
  auto_reinvest_percent NUMERIC DEFAULT 0,
  performance_history JSONB DEFAULT '[]'::jsonb
);

-- Portfolio managers table
CREATE TABLE portfolio_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT,
  verified BOOLEAN DEFAULT false,
  approval_status manager_status DEFAULT 'pending',
  roi_annualized NUMERIC DEFAULT 0,
  sharpe_ratio NUMERIC DEFAULT 0,
  total_followers INTEGER DEFAULT 0,
  performance_start_date TIMESTAMP WITH TIME ZONE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  track_record JSONB DEFAULT '[]'::jsonb,
  management_fee_percent NUMERIC DEFAULT 0
);

-- Portfolio followers (social investing)
CREATE TABLE portfolio_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_wallet TEXT NOT NULL,
  manager_wallet TEXT NOT NULL,
  allocation_amount NUMERIC DEFAULT 0,
  copy_percent NUMERIC DEFAULT 100,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  active BOOLEAN DEFAULT true,
  UNIQUE(follower_wallet, manager_wallet)
);

-- Automation settings
CREATE TABLE automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_wallet TEXT NOT NULL,
  portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
  automation_type automation_type NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_executed TIMESTAMP WITH TIME ZONE
);

-- Recurring payments
CREATE TABLE recurring_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_wallet TEXT NOT NULL,
  to_wallet TEXT,
  amount NUMERIC NOT NULL,
  token_type TEXT DEFAULT 'xBGL',
  frequency TEXT NOT NULL,
  next_payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_payment_date TIMESTAMP WITH TIME ZONE,
  payment_count INTEGER DEFAULT 0
);

-- Marketplace listings
CREATE TABLE marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_wallet TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  token_type TEXT DEFAULT 'xBGL',
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sold_at TIMESTAMP WITH TIME ZONE,
  buyer_wallet TEXT,
  status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Users can view all portfolios"
  ON portfolios FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own portfolios"
  ON portfolios FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own portfolios"
  ON portfolios FOR UPDATE
  USING (owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for portfolio_managers
CREATE POLICY "Anyone can view approved managers"
  ON portfolio_managers FOR SELECT
  USING (approval_status = 'approved' OR wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can apply as managers"
  ON portfolio_managers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can update their profile"
  ON portfolio_managers FOR UPDATE
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for portfolio_followers
CREATE POLICY "Users can view all followers"
  ON portfolio_followers FOR SELECT
  USING (true);

CREATE POLICY "Users can follow managers"
  ON portfolio_followers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage their follows"
  ON portfolio_followers FOR UPDATE
  USING (follower_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for automation_settings
CREATE POLICY "Users can view their automation settings"
  ON automation_settings FOR SELECT
  USING (owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can create automation settings"
  ON automation_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their automation settings"
  ON automation_settings FOR UPDATE
  USING (owner_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for recurring_payments
CREATE POLICY "Users can view their recurring payments"
  ON recurring_payments FOR SELECT
  USING (from_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

CREATE POLICY "Users can create recurring payments"
  ON recurring_payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their recurring payments"
  ON recurring_payments FOR UPDATE
  USING (from_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- RLS Policies for marketplace_listings
CREATE POLICY "Anyone can view active listings"
  ON marketplace_listings FOR SELECT
  USING (true);

CREATE POLICY "Users can create listings"
  ON marketplace_listings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sellers can update their listings"
  ON marketplace_listings FOR UPDATE
  USING (seller_wallet = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create trigger for updating portfolios updated_at
CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON portfolios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();