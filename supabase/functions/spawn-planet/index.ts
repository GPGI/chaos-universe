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

    const { star_system_id, name, type, owner_wallet, payment_amount } = await req.json();

    console.log('Spawning planet:', { star_system_id, name, type, owner_wallet });

    // Validate inputs
    if (!name || name.length < 3) {
      throw new Error('Planet name must be at least 3 characters');
    }
    if (!owner_wallet || !owner_wallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address');
    }
    if (!['habitable', 'resource', 'research', 'military'].includes(type)) {
      throw new Error('Invalid planet type');
    }

    // Verify star system exists and user owns it
    const { data: starSystem, error: systemError } = await supabaseClient
      .from('star_systems')
      .select('*')
      .eq('id', star_system_id)
      .single();

    if (systemError || !starSystem) {
      throw new Error('Star system not found');
    }

    if (starSystem.owner_wallet.toLowerCase() !== owner_wallet.toLowerCase()) {
      throw new Error('You do not own this star system');
    }

    // Check for duplicate planet names in the same system
    const { data: existingPlanet } = await supabaseClient
      .from('planets')
      .select('id')
      .eq('star_system_id', star_system_id)
      .eq('name', name)
      .single();

    if (existingPlanet) {
      throw new Error('Planet name already exists in this star system');
    }

    // Generate node configuration
    // In production, this would deploy actual validator node
    const nodeIp = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    // Create planet record
    const { data: planet, error: insertError } = await supabaseClient
      .from('planets')
      .insert({
        name,
        star_system_id,
        owner_wallet,
        planet_type: type,
        node_type: 'master',
        ip_address: nodeIp,
        status: 'deploying',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update star system's planets array
    const updatedPlanets = [...(starSystem.planets || []), planet.id];
    const { error: updateError } = await supabaseClient
      .from('star_systems')
      .update({ planets: updatedPlanets })
      .eq('id', star_system_id);

    if (updateError) {
      console.error('Error updating star system planets:', updateError);
    }

    console.log('Planet created:', planet);

    // In production, trigger actual master node deployment here
    // This would involve:
    // 1. Provisioning server infrastructure
    // 2. Installing Avalanche node software
    // 3. Configuring as subnet validator
    // 4. Syncing blockchain data
    // 5. Starting validation

    // Simulate async deployment - update status after "deployment"
    setTimeout(async () => {
      try {
        const { error: statusError } = await supabaseClient
          .from('planets')
          .update({ status: 'active' })
          .eq('id', planet.id);
        
        if (statusError) {
          console.error('Error updating planet status:', statusError);
        } else {
          console.log('Planet activated:', planet.id);
        }
      } catch (error) {
        console.error('Error in async update:', error);
      }
    }, 3000);

    return new Response(
      JSON.stringify({
        success: true,
        planet,
        message: `Planet "${name}" master node deployment initiated`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error spawning planet:', error);
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
