-- Add wallet_key_name field to accounts table to link to Avalanche CLI keys
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS wallet_key_name TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_wallet_key ON accounts(wallet_key_name);

-- Add comment
COMMENT ON COLUMN accounts.wallet_key_name IS 'Name of the Avalanche CLI key assigned to this account';

