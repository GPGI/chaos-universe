/**
 * Mock Celestial Forge Hook
 * Generates mock star systems and planets without database or chain
 * Data is stored in localStorage for persistence across sessions
 */

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";

export interface MockStarSystem {
  id: string;
  name: string;
  subnet_id: string;
  owner_wallet: string;
  rpc_url: string;
  chain_id: number;
  tribute_percent: number;
  status: "active" | "deploying" | "inactive";
  treasury_balance: { xBGL: number; AVAX: number };
  planets: string[];
  created_at: string;
  mock: true;
}

export interface MockPlanet {
  id: string;
  name: string;
  star_system_id: string;
  star_system_name: string;
  node_type: "master" | "validator";
  owner_wallet: string;
  ip_address: string;
  status: "active" | "deploying" | "inactive";
  planet_type: "habitable" | "resource" | "research" | "military";
  created_at: string;
  mock: true;
}

const STORAGE_KEY_STAR_SYSTEMS = "mock_star_systems";
const STORAGE_KEY_PLANETS = "mock_planets";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateMockSubnetId(name: string): string {
  const timestamp = Date.now();
  return `mock-${name.toLowerCase().replace(/\s+/g, "-")}-${timestamp}`;
}

function generateMockChainId(): number {
  return 900000 + Math.floor(Math.random() * 99999);
}

function generateMockIp(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateMockRpcUrl(subnetId: string): string {
  // Always use Chaos Star Network RPC - never use port 9650
  return "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc";
}

export function useMockCelestialForge() {
  const [loading, setLoading] = useState(false);
  const [starSystems, setStarSystems] = useState<MockStarSystem[]>([]);
  const [planets, setPlanets] = useState<MockPlanet[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedSystems = localStorage.getItem(STORAGE_KEY_STAR_SYSTEMS);
      const storedPlanets = localStorage.getItem(STORAGE_KEY_PLANETS);
      
      if (storedSystems) {
        setStarSystems(JSON.parse(storedSystems));
      }
      if (storedPlanets) {
        setPlanets(JSON.parse(storedPlanets));
      }
    } catch (error) {
      console.error("Error loading mock data:", error);
    }
  }, []);

  // Save to localStorage whenever data changes
  const saveToStorage = useCallback((systems: MockStarSystem[], planetsData: MockPlanet[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_STAR_SYSTEMS, JSON.stringify(systems));
      localStorage.setItem(STORAGE_KEY_PLANETS, JSON.stringify(planetsData));
    } catch (error) {
      console.error("Error saving mock data:", error);
    }
  }, []);

  // Create a mock star system
  const createStarSystem = useCallback((name: string, tributePercent: number = 5, ownerWallet: string = "0x0000000000000000000000000000000000000000") => {
    setLoading(true);
    try {
      // Validate
      if (!name || name.length < 3) {
        throw new Error("Star system name must be at least 3 characters");
      }
      if (tributePercent < 0 || tributePercent > 20) {
        throw new Error("Tribute must be between 0-20%");
      }

      // Check for duplicates
      if (starSystems.some(sys => sys.name === name)) {
        throw new Error(`Star system "${name}" already exists`);
      }

      // Generate mock data
      const subnetId = generateMockSubnetId(name);
      const chainId = generateMockChainId();
      const rpcUrl = generateMockRpcUrl(subnetId);
      const id = generateId();

      const newSystem: MockStarSystem = {
        id,
        name,
        subnet_id: subnetId,
        owner_wallet: ownerWallet,
        rpc_url: rpcUrl,
        chain_id: chainId,
        tribute_percent: tributePercent,
        status: "active",
        treasury_balance: { xBGL: 0, AVAX: 10000 },
        planets: [],
        created_at: new Date().toISOString(),
        mock: true,
      };

      const updatedSystems = [...starSystems, newSystem];
      setStarSystems(updatedSystems);
      saveToStorage(updatedSystems, planets);

      toast.success(`Mock star system "${name}" created!`);
      return newSystem;
    } catch (error: any) {
      console.error("Error creating mock star system:", error);
      toast.error(error.message || "Failed to create star system");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Create a mock planet
  const createPlanet = useCallback((
    starSystemId: string,
    planetName: string,
    planetType: "habitable" | "resource" | "research" | "military" = "habitable",
    ownerWallet: string = "0x0000000000000000000000000000000000000000"
  ) => {
    setLoading(true);
    try {
      // Validate
      if (!planetName || planetName.length < 3) {
        throw new Error("Planet name must be at least 3 characters");
      }

      const starSystem = starSystems.find(sys => sys.id === starSystemId);
      if (!starSystem) {
        throw new Error("Star system not found");
      }

      // Check for duplicates in this star system
      const existingPlanet = planets.find(
        p => p.star_system_id === starSystemId && p.name === planetName
      );
      if (existingPlanet) {
        throw new Error(`Planet "${planetName}" already exists in this star system`);
      }

      // Generate mock data
      const id = generateId();
      const ipAddress = generateMockIp();

      const newPlanet: MockPlanet = {
        id,
        name: planetName,
        star_system_id: starSystemId,
        star_system_name: starSystem.name,
        node_type: "master",
        owner_wallet: ownerWallet,
        ip_address: ipAddress,
        status: "active",
        planet_type: planetType,
        created_at: new Date().toISOString(),
        mock: true,
      };

      const updatedPlanets = [...planets, newPlanet];
      setPlanets(updatedPlanets);

      // Update star system planets list
      const updatedSystems = starSystems.map(sys => {
        if (sys.id === starSystemId) {
          return { ...sys, planets: [...sys.planets, id] };
        }
        return sys;
      });
      setStarSystems(updatedSystems);
      saveToStorage(updatedSystems, updatedPlanets);

      toast.success(`Mock planet "${planetName}" created!`);
      return newPlanet;
    } catch (error: any) {
      console.error("Error creating mock planet:", error);
      toast.error(error.message || "Failed to create planet");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Generate random test data
  const generateRandomData = useCallback((numSystems: number = 3, planetsPerSystem: number = 2) => {
    setLoading(true);
    try {
      const planetTypes: Array<"habitable" | "resource" | "research" | "military"> = 
        ["habitable", "resource", "research", "military"];
      
      const newSystems: MockStarSystem[] = [];
      const newPlanets: MockPlanet[] = [];

      for (let i = 0; i < numSystems; i++) {
        const systemName = `TestSystem${i + 1}`;
        const subnetId = generateMockSubnetId(systemName);
        const chainId = generateMockChainId();
        const rpcUrl = generateMockRpcUrl(subnetId);
        const systemId = generateId();

        const system: MockStarSystem = {
          id: systemId,
          name: systemName,
          subnet_id: subnetId,
          owner_wallet: "0x0000000000000000000000000000000000000000",
          rpc_url: rpcUrl,
          chain_id: chainId,
          tribute_percent: 5 + Math.floor(Math.random() * 15),
          status: "active",
          treasury_balance: { xBGL: 0, AVAX: 10000 },
          planets: [],
          created_at: new Date().toISOString(),
          mock: true,
        };

        newSystems.push(system);

        // Generate planets for this system
        for (let j = 0; j < planetsPerSystem; j++) {
          const planetName = `${systemName}Planet${j + 1}`;
          const planetId = generateId();
          const planetType = planetTypes[Math.floor(Math.random() * planetTypes.length)];

          const planet: MockPlanet = {
            id: planetId,
            name: planetName,
            star_system_id: systemId,
            star_system_name: systemName,
            node_type: "master",
            owner_wallet: "0x0000000000000000000000000000000000000000",
            ip_address: generateMockIp(),
            status: "active",
            planet_type: planetType,
            created_at: new Date().toISOString(),
            mock: true,
          };

          newPlanets.push(planet);
          system.planets.push(planetId);
        }
      }

      const updatedSystems = [...starSystems, ...newSystems];
      const updatedPlanets = [...planets, ...newPlanets];

      setStarSystems(updatedSystems);
      setPlanets(updatedPlanets);
      saveToStorage(updatedSystems, updatedPlanets);

      toast.success(`Generated ${numSystems} mock star systems with ${planetsPerSystem} planets each!`);
    } catch (error: any) {
      console.error("Error generating random data:", error);
      toast.error(error.message || "Failed to generate random data");
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Clear all mock data
  const clearAll = useCallback(() => {
    setStarSystems([]);
    setPlanets([]);
    localStorage.removeItem(STORAGE_KEY_STAR_SYSTEMS);
    localStorage.removeItem(STORAGE_KEY_PLANETS);
    toast.success("All mock data cleared!");
  }, []);

  // Get planets for a star system
  const getPlanetsForSystem = useCallback((systemId: string) => {
    return planets.filter(p => p.star_system_id === systemId);
  }, [planets]);

  // Get user star systems (filtered by wallet)
  const getUserStarSystems = useCallback((wallet: string) => {
    return starSystems.filter(sys => sys.owner_wallet.toLowerCase() === wallet.toLowerCase());
  }, [starSystems]);

  // Update star system
  const updateStarSystem = useCallback((systemId: string, updates: Partial<MockStarSystem>) => {
    setLoading(true);
    try {
      const updatedSystems = starSystems.map(sys => {
        if (sys.id === systemId) {
          return { ...sys, ...updates };
        }
        return sys;
      });
      
      setStarSystems(updatedSystems);
      saveToStorage(updatedSystems, planets);
      toast.success("Star system updated!");
    } catch (error: any) {
      console.error("Error updating star system:", error);
      toast.error(error.message || "Failed to update star system");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Update planet
  const updatePlanet = useCallback((planetId: string, updates: Partial<MockPlanet>) => {
    setLoading(true);
    try {
      const updatedPlanets = planets.map(planet => {
        if (planet.id === planetId) {
          return { ...planet, ...updates };
        }
        return planet;
      });
      
      setPlanets(updatedPlanets);
      saveToStorage(starSystems, updatedPlanets);
      toast.success("Planet updated!");
    } catch (error: any) {
      console.error("Error updating planet:", error);
      toast.error(error.message || "Failed to update planet");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Delete star system (and its planets)
  const deleteStarSystem = useCallback((systemId: string) => {
    setLoading(true);
    try {
      const updatedSystems = starSystems.filter(sys => sys.id !== systemId);
      const updatedPlanets = planets.filter(planet => planet.star_system_id !== systemId);
      
      setStarSystems(updatedSystems);
      setPlanets(updatedPlanets);
      saveToStorage(updatedSystems, updatedPlanets);
      toast.success("Star system deleted!");
    } catch (error: any) {
      console.error("Error deleting star system:", error);
      toast.error(error.message || "Failed to delete star system");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Delete planet
  const deletePlanet = useCallback((planetId: string) => {
    setLoading(true);
    try {
      const planet = planets.find(p => p.id === planetId);
      if (!planet) {
        throw new Error("Planet not found");
      }

      const updatedPlanets = planets.filter(p => p.id !== planetId);
      setPlanets(updatedPlanets);

      // Update star system planets list
      const updatedSystems = starSystems.map(sys => {
        if (sys.id === planet.star_system_id) {
          return { ...sys, planets: sys.planets.filter(pId => pId !== planetId) };
        }
        return sys;
      });
      setStarSystems(updatedSystems);
      saveToStorage(updatedSystems, updatedPlanets);
      toast.success("Planet deleted!");
    } catch (error: any) {
      console.error("Error deleting planet:", error);
      toast.error(error.message || "Failed to delete planet");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [starSystems, planets, saveToStorage]);

  // Get star system by ID
  const getStarSystem = useCallback((systemId: string) => {
    return starSystems.find(sys => sys.id === systemId);
  }, [starSystems]);

  // Get planet by ID
  const getPlanet = useCallback((planetId: string) => {
    return planets.find(planet => planet.id === planetId);
  }, [planets]);

  return {
    loading,
    starSystems,
    planets,
    createStarSystem,
    createPlanet,
    generateRandomData,
    clearAll,
    getPlanetsForSystem,
    getUserStarSystems,
    updateStarSystem,
    updatePlanet,
    deleteStarSystem,
    deletePlanet,
    getStarSystem,
    getPlanet,
  };
}

