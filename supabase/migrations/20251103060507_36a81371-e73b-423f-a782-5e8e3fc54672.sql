-- Fix RLS policies to not use user_metadata directly
-- Drop insecure policies
DROP POLICY IF EXISTS "Owners can update their star systems" ON star_systems;
DROP POLICY IF EXISTS "Owners can update their planets" ON planets;

-- Create security definer function to verify wallet ownership in public schema
CREATE OR REPLACE FUNCTION public.is_wallet_owner(wallet_addr TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (raw_user_meta_data->>'wallet_address')::text = wallet_addr
  );
$$;

-- Create new secure policies
CREATE POLICY "Owners can update their star systems" ON star_systems
  FOR UPDATE USING (public.is_wallet_owner(owner_wallet));

CREATE POLICY "Owners can update their planets" ON planets
  FOR UPDATE USING (public.is_wallet_owner(owner_wallet));