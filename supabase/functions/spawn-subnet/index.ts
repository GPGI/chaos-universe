import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { name, owner_wallet, tribute_percent, payment_amount } = await req.json();

    console.log('Spawning star system:', { name, owner_wallet, tribute_percent });

    // Validate inputs
    if (!name || name.length < 3) {
      throw new Error('Star system name must be at least 3 characters');
    }
    if (!owner_wallet || !owner_wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address');
    }
    if (tribute_percent < 0 || tribute_percent > 20) {
      throw new Error('Tribute must be between 0-20%');
    }

    // Check for duplicate names
    const { data: existingSystem } = await supabaseClient
      .from('star_systems')
      .select('id')
      .eq('name', name)
      .single();

    if (existingSystem) {
      throw new Error('Star system name already exists');
    }

    // Generate subnet configuration
    // In production, this would call Avalanche APIs to create actual subnet
    const subnetId = `subnet-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const chainId = 100000 + Math.floor(Math.random() * 900000); // Random chain ID
    const rpcUrl = `https://subnet-${subnetId}.avalanche-mainnet.io/ext/bc/C/rpc`;

    // Create star system record
    const { data: starSystem, error: insertError } = await supabaseClient
      .from('star_systems')
      .insert({
        name,
        owner_wallet,
        subnet_id: subnetId,
        chain_id: chainId,
        rpc_url: rpcUrl,
        tribute_percent,
        status: 'deploying',
        treasury_balance: { xBGL: 0, AVAX: payment_amount },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log('Star system created:', starSystem);

    // In production, trigger actual Avalanche subnet deployment here
    // This would involve:
    // 1. Calling Avalanche API to create subnet
    // 2. Deploying validator nodes
    // 3. Configuring network parameters
    // 4. Setting up bridge to primary network

    // Simulate async deployment - update status after "deployment"
    setTimeout(async () => {
      try {
        const { error: updateError } = await supabaseClient
          .from('star_systems')
          .update({ status: 'active' })
          .eq('id', starSystem.id);
        
        if (updateError) {
          console.error('Error updating star system status:', updateError);
        } else {
          console.log('Star system activated:', starSystem.id);
        }
      } catch (error) {
        console.error('Error in async update:', error);
      }
    }, 5000);

    return new Response(
      JSON.stringify({
        success: true,
        star_system: starSystem,
        message: `Star system "${name}" deployment initiated`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error spawning subnet:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
