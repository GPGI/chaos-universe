import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/contexts/WalletContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  spawnStarSystem as apiSpawnStarSystem,
  spawnPlanet as apiSpawnPlanet,
  getForgeToolsStatus,
  listStarSystems as apiListStarSystems,
  getStarSystem as apiGetStarSystem,
  listPlanets as apiListPlanets,
  getPlanet as apiGetPlanet,
  updateStarSystemStatus as apiUpdateStarSystemStatus,
  updatePlanetStatus as apiUpdatePlanetStatus,
  deployStarSystem as apiDeployStarSystem,
} from "@/lib/api";

type StarSystemRow = Database['public']['Tables']['star_systems']['Row'];
type PlanetRow = Database['public']['Tables']['planets']['Row'];

export interface StarSystem {
  id: string;
  name: string;
  subnet_id: string | null;
  owner_wallet: string;
  treasury_balance: any;
  planets: string[];
  created_at: string;
  rpc_url?: string | null;
  chain_id?: number | null;
  status?: string | null;
}

export interface Planet {
  id: string;
  name: string;
  star_system_id: string;
  node_type: "master" | "validator";
  owner_wallet: string;
  ip_address?: string;
  status: "active" | "deploying" | "inactive";
  created_at: string;
}

export function useCelestialForge() {
  const { address, signer, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [starSystems, setStarSystems] = useState<StarSystem[]>([]);
  const [userStarSystems, setUserStarSystems] = useState<StarSystem[]>([]);

  // Cost constants (in AVAX)
  const STAR_SYSTEM_COST = 10000; // 10,000 AVAX for a new subnet
  const PLANET_COST = 2000; // 2,000 AVAX for a master node

  const fetchStarSystems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('star_systems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const systems = (data || []) as StarSystem[];
      setStarSystems(systems);

      // Filter user's systems
      if (address) {
        const userSystems = systems.filter(
          (sys) => sys.owner_wallet?.toLowerCase() === address.toLowerCase()
        );
        setUserStarSystems(userSystems);
      }
    } catch (error) {
      console.error('Error fetching star systems:', error);
    }
  }, [address]);

  const spawnStarSystem = async (name: string, tributePercent: number = 5) => {
    if (!signer || !address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    try {
      // Validate inputs
      if (!name || name.length < 3) {
        throw new Error("Star system name must be at least 3 characters");
      }
      if (tributePercent < 0 || tributePercent > 20) {
        throw new Error("Tribute must be between 0-20%");
      }

      // Check for duplicate names
      const { data: existingSystem } = await supabase
        .from('star_systems')
        .select('id')
        .eq('name', name)
        .single();

      if (existingSystem) {
        throw new Error('Star system name already exists');
      }

      // Balance check removed - allowing mock star system creation

      toast.info("Creating star system with Avalanche CLI...");

      // Call backend API to create subnet using Avalanche CLI (real mode)
      let apiResult;
      try {
        apiResult = await apiSpawnStarSystem({
          name,
          owner_wallet: address,
          tribute_percent: tributePercent,
          mock: false, // Use real Avalanche CLI to create actual subnets
        });
      } catch (error: any) {
        // Network error - backend might not be running
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(
            "Backend API is not reachable. Please start the backend server:\n" +
            "cd backend && uvicorn app:app --reload\n\n" +
            "Then ensure it's running on http://localhost:5001"
          );
        }
        throw error;
      }

      if (!apiResult.success) {
        throw new Error(apiResult.error || "Failed to create star system");
      }

      const starSystemData = apiResult.star_system;

      // Create star system record in Supabase with real subnet info
      const { data: newSystem, error } = await supabase
        .from('star_systems')
        .insert({
          name: starSystemData.name,
          owner_wallet: starSystemData.owner_wallet,
          subnet_id: starSystemData.subnet_id,
          chain_id: starSystemData.chain_id,
          rpc_url: starSystemData.rpc_url,
          tribute_percent: starSystemData.tribute_percent,
          status: starSystemData.status || 'deploying',
          treasury_balance: { xBGL: 0, AVAX: STAR_SYSTEM_COST },
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        `Star system "${name}" creation initiated! ${apiResult.message || ''}`
      );

      // Show next steps if available
      if (apiResult.next_steps && apiResult.next_steps.length > 0) {
        toast.info(`Next: ${apiResult.next_steps[0]}`);
      }

      await fetchStarSystems();
      return newSystem;
    } catch (error: any) {
      console.error("Error spawning star system:", error);
      toast.error(error.message || "Failed to spawn star system");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const spawnPlanet = async (
    starSystemId: string,
    planetName: string,
    planetType: "habitable" | "resource" | "research" | "military"
  ) => {
    if (!signer || !address) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    try {
      // Validate inputs
      if (!planetName || planetName.length < 3) {
        throw new Error("Planet name must be at least 3 characters");
      }

      // Check ownership
      const starSystem = starSystems.find(sys => sys.id === starSystemId);
      if (!starSystem) {
        throw new Error("Star system not found");
      }
      if (starSystem.owner_wallet?.toLowerCase() !== address.toLowerCase()) {
        throw new Error("You don't own this star system");
      }

      // Check for duplicate planet names in same system
      const { data: existingPlanet } = await supabase
        .from('planets')
        .select('id')
        .eq('star_system_id', starSystemId)
        .eq('name', planetName)
        .single();

      if (existingPlanet) {
        throw new Error('Planet name already exists in this star system');
      }

      // Balance check removed - allowing mock planet creation

      toast.info("Creating planet with Avalanche CLI...");

      // Call backend API to create planet/validator node (real mode)
      let apiResult;
      try {
        apiResult = await apiSpawnPlanet({
          name: planetName,
          star_system_id: starSystemId,
          star_system_name: starSystem.name,
          owner_wallet: address,
          planet_type: planetType,
          mock: false, // Use real Avalanche CLI to create actual nodes
        });
      } catch (error: any) {
        // Network error - backend might not be running
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(
            "Backend API is not reachable. Please start the backend server:\n" +
            "cd backend && uvicorn app:app --reload\n\n" +
            "Then ensure it's running on http://localhost:5001"
          );
        }
        throw error;
      }

      if (!apiResult.success) {
        throw new Error(apiResult.error || "Failed to create planet");
      }

      const planetData = apiResult.planet;

      // Generate node configuration
      const nodeIp = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      // Create planet record in Supabase
      const { data: newPlanet, error: insertError } = await supabase
        .from('planets')
        .insert({
          name: planetData.name,
          star_system_id: planetData.star_system_id,
          owner_wallet: planetData.owner_wallet,
          planet_type: planetData.planet_type,
          node_type: planetData.node_type || 'master',
          ip_address: nodeIp,
          status: planetData.status || 'deploying',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Show next steps if available
      if (apiResult.next_steps && apiResult.next_steps.length > 0) {
        toast.info(`Next: ${apiResult.next_steps[0]}`);
      }

      // Update star system's planets array
      const updatedPlanets = [...(starSystem.planets || []), newPlanet.id];
      const { error: updateError } = await supabase
        .from('star_systems')
        .update({ planets: updatedPlanets })
        .eq('id', starSystemId);

      if (updateError) {
        console.error('Error updating star system planets:', updateError);
      }

      toast.success(`Planet "${planetName}" created successfully!`);
      await fetchStarSystems();
      return newPlanet;
    } catch (error: any) {
      console.error("Error spawning planet:", error);
      toast.error(error.message || "Failed to spawn planet");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Interaction functions
  const updateStarSystemStatus = async (systemId: string, status: "active" | "deploying" | "inactive") => {
    setLoading(true);
    try {
      await apiUpdateStarSystemStatus(systemId, status);
      toast.success(`Star system status updated to ${status}`);
      await fetchStarSystems();
    } catch (error: any) {
      console.error("Error updating star system status:", error);
      toast.error(error.message || "Failed to update star system status");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePlanetStatus = async (planetId: string, status: "active" | "deploying" | "inactive") => {
    setLoading(true);
    try {
      await apiUpdatePlanetStatus(planetId, status);
      toast.success(`Planet status updated to ${status}`);
      await fetchStarSystems();
    } catch (error: any) {
      console.error("Error updating planet status:", error);
      toast.error(error.message || "Failed to update planet status");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deployStarSystem = async (systemId: string) => {
    setLoading(true);
    try {
      const result = await apiDeployStarSystem(systemId);
      toast.success(result.message || "Star system deployment initiated");
      await fetchStarSystems();
      return result;
    } catch (error: any) {
      console.error("Error deploying star system:", error);
      toast.error(error.message || "Failed to deploy star system");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getStarSystemDetails = async (systemId: string) => {
    try {
      const result = await apiGetStarSystem(systemId);
      return result;
    } catch (error: any) {
      console.error("Error getting star system details:", error);
      throw error;
    }
  };

  const getPlanetDetails = async (planetId: string) => {
    try {
      const result = await apiGetPlanet(planetId);
      return result;
    } catch (error: any) {
      console.error("Error getting planet details:", error);
      throw error;
    }
  };

  return {
    loading,
    starSystems,
    userStarSystems,
    STAR_SYSTEM_COST,
    PLANET_COST,
    spawnStarSystem,
    spawnPlanet,
    fetchStarSystems,
    updateStarSystemStatus,
    updatePlanetStatus,
    deployStarSystem,
    getStarSystemDetails,
    getPlanetDetails,
  };
}
