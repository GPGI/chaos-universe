import { useState, useEffect, useCallback } from "react";
import { useLandPlots } from "./useLandPlots";
import { useTreasury } from "./useTreasury";
import { listPlanets, getStarSystem, getSubnetStatus, getStarSystem as apiGetStarSystem } from "@/lib/api";

export interface RealPlanetStats {
  name: string;
  status: string;
  population: number; // Based on plots sold
  coverage: number; // Based on plots sold / total plots
  tier: string;
  color: string;
  locked: boolean;
  description: string;
  districts?: any[];
  features?: string[];
  // Real blockchain data
  plotsSold: number;
  totalPlots: number;
  treasuryBalance: string;
  rpc_url?: string;
  chain_id?: number;
  subnet_id?: string;
}

/**
 * Hook to get real planet stats from blockchain contracts
 * Replaces hardcoded planetsData with actual on-chain data
 */
export function useRealPlanetStats() {
  const { plotsSold, totalPlots, plotsRemaining } = useLandPlots();
  const { balances } = useTreasury();
  const [planets, setPlanets] = useState<Record<string, RealPlanetStats>>({});
  const [loading, setLoading] = useState(true);

  const fetchRealPlanetStats = useCallback(async () => {
    setLoading(true);
    try {
      // Get Sarakt Prime stats from contracts (main planet)
      const saraktPrimeStats: RealPlanetStats = {
        name: "Sarakt Prime",
        status: "Habitable",
        population: Math.round((plotsSold / totalPlots) * 100), // Population based on plot coverage
        coverage: Math.round((plotsSold / totalPlots) * 100), // Coverage percentage
        tier: "Capital",
        color: "primary",
        locked: false,
        description: "Cliff-carved capital overlooking the Sapphire Sea. Vertical architecture, Treasury Tower, xBGL economy hub.",
        plotsSold,
        totalPlots,
        treasuryBalance: balances.avax,
        features: ["Treasury Tower", "Vertical Architecture", "Sapphire Sea Access", "Underground Mines"],
        districts: [{
          name: "Octavia Capital City",
          plots: totalPlots,
          price: 75,
          type: "Capital",
          description: "The grand capital city of Octavia, heart of the Sarakt Prime planet. Home to the Treasury Tower, vertical architecture, and the central xBGL economy hub."
        }]
      };

      // Try to get Zythera from real API/blockchain
      // For now, calculate from contracts (could be a separate subnet/contract)
      const zytheraStats: RealPlanetStats = {
        name: "Zythera",
        status: "Isolated",
        population: Math.round((plotsSold / totalPlots) * 18), // Approximate for frontier
        coverage: Math.round((plotsSold / totalPlots) * 8),
        tier: "Frontier",
        color: "destructive",
        locked: false,
        description: "Bioluminescent nanofiber ecosystem. Black market research, ShadowCoin trades, chaotic frontier.",
        plotsSold: Math.round(plotsSold * 0.18), // Approximate
        totalPlots: Math.round(totalPlots * 0.18),
        treasuryBalance: "0", // Separate treasury for frontier
        features: ["Nanofiber Web", "Bioluminescent Flora", "Black Market", "Chaos Energy"],
        districts: [{
          name: "Capital city of Zarathis",
          plots: Math.round(totalPlots * 0.18),
          price: 75,
          type: "Frontier",
          description: "Zarathis - the notorious black market capital of Zythera. A lawless frontier city where ShadowCoin flows freely and nanofiber tech deals are made in the shadows."
        }]
      };

      // Try to fetch real planets from API
      try {
        const planetsResponse = await listPlanets();
        if (planetsResponse?.planets && Array.isArray(planetsResponse.planets)) {
          // Map real planets from API
          const realPlanets: Record<string, RealPlanetStats> = {};

          for (const planet of planetsResponse.planets) {
            // Try to get subnet info for the planet's star system
            let subnetInfo = null;
            if (planet.star_system_id) {
              try {
                const systemResponse = await apiGetStarSystem(planet.star_system_id);
                if (systemResponse?.star_system?.subnet_id) {
                  subnetInfo = await getSubnetStatus(systemResponse.star_system.subnet_id).catch(() => null);
                }
              } catch (e) {
                console.warn("Could not fetch subnet info for planet:", e);
              }
            }

            // Calculate stats from contract data or subnet info
            const planetCoverage = planet.planet_type === "habitable"
              ? (plotsSold / totalPlots) * 100
              : (plotsSold / totalPlots) * 18;

            realPlanets[planet.id] = {
              name: planet.name,
              status: planet.status === "active" ? "Habitable" : planet.status === "deploying" ? "Deploying" : "Inactive",
              population: Math.round(planetCoverage),
              coverage: Math.round(planetCoverage),
              tier: planet.planet_type === "habitable" ? "Capital" : planet.planet_type === "resource" ? "Resource" : "Frontier",
              color: planet.planet_type === "habitable" ? "primary" : planet.planet_type === "resource" ? "secondary" : "destructive",
              locked: planet.status !== "active",
              description: `${planet.name} - ${planet.planet_type || "Unknown"} planet in the Sarakt system.`,
              plotsSold: Math.round(plotsSold * (planet.planet_type === "habitable" ? 1 : 0.18)),
              totalPlots: planet.planet_type === "habitable" ? totalPlots : Math.round(totalPlots * 0.18),
              treasuryBalance: subnetInfo?.treasury_balance || "0",
              rpc_url: subnetInfo?.rpc_url || planet.rpc_url,
              chain_id: subnetInfo?.chain_id || planet.chain_id,
              subnet_id: subnetInfo?.subnet_id || planet.subnet_id,
              features: [],
              districts: [{
                name: "Octavia Capital City",
                plots: planet.planet_type === "habitable" ? totalPlots : Math.round(totalPlots * 0.18),
                price: 75,
                type: planet.planet_type === "habitable" ? "Capital" : planet.planet_type === "resource" ? "Resource" : "Frontier",
                description: `The main settlement on ${planet.name}.`
              }]
            };
          }

          // Merge with calculated stats
          setPlanets({
            "sarakt-prime": saraktPrimeStats,
            "zythera": zytheraStats,
            ...realPlanets
          });
        } else {
          // Fallback to calculated stats
          setPlanets({
            "sarakt-prime": saraktPrimeStats,
            "zythera": zytheraStats
          });
        }
      } catch (error) {
        // Suppress timeout errors - backend might not be available
        const isTimeoutError = error.name === "AbortError" ||
          error.name === "DOMException" ||
          error.message?.includes("timeout") ||
          error.message?.includes("Failed to fetch");
        if (!isTimeoutError) {
          console.warn("Could not fetch planets from API, using calculated stats:", error);
        } else {
          console.debug("Planets API request timed out - backend may not be available");
        }
        // Fallback to calculated stats from contracts
        setPlanets({
          "sarakt-prime": saraktPrimeStats,
          "zythera": zytheraStats
        });
      }
    } catch (error) {
      console.error("Error fetching real planet stats:", error);
      // Set empty stats on error
      setPlanets({});
    } finally {
      setLoading(false);
    }
  }, [plotsSold, totalPlots, balances.avax]);

  useEffect(() => {
    fetchRealPlanetStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchRealPlanetStats, 30000);
    return () => clearInterval(interval);
  }, [fetchRealPlanetStats]);

  return {
    planets,
    loading,
    refresh: fetchRealPlanetStats
  };
}
