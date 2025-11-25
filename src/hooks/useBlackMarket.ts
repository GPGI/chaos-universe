import { useState, useEffect, useCallback } from "react";
import { getApiBase } from "@/lib/api";

export interface BlackMarketStatus {
  planetId: string;
  planetName: string;
  enabled: boolean;
  isMainMarket: boolean; // For Zarathis - black market is the main market
  activationCondition?: {
    type: "plot_sales";
    threshold: number;
    current: number;
    locked: boolean; // For Octavia - keep locked until user unlocks
  };
  liquidity: {
    XMR: number;
    Xen: number;
    SC?: number;
  };
  networkEnabled: boolean; // Can establish network across multiple worlds
}

/**
 * Hook to manage black market module per planet
 * Black market can be toggled based on government politics
 */
export function useBlackMarket() {
  const [blackMarkets, setBlackMarkets] = useState<Record<string, BlackMarketStatus>>({});
  const [loading, setLoading] = useState(true);

  const fetchBlackMarketStatus = useCallback(async () => {
    setLoading(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/governance/black-market/status`);
      
      if (res.ok) {
        const data = await res.json();
        // Transform backend data to frontend format
        const markets: Record<string, BlackMarketStatus> = {};
        
        // Process planets from backend response
        if (data.planets) {
          for (const [planetId, planetData] of Object.entries(data.planets)) {
            const planet = planetData as any;
            markets[planetId] = {
              planetId: planet.planet_id || planetId,
              planetName: planet.planet_name || planetId,
              enabled: planet.enabled || false,
              isMainMarket: planet.is_main_market || false,
              activationCondition: planet.activation_condition ? {
                type: planet.activation_condition.type || "plot_sales",
                threshold: planet.activation_condition.threshold || 100000,
                current: planet.activation_condition.current || 0,
                locked: planet.activation_condition.locked !== undefined ? planet.activation_condition.locked : true,
              } : undefined,
              liquidity: data.liquidity || { XMR: 0, Xen: 0 },
              networkEnabled: planet.network_enabled || false,
            };
          }
        } else {
          // Fallback: Zarathis (Zythera) - always enabled, main market
          markets["zythera"] = {
            planetId: "zythera",
            planetName: "Zythera",
            enabled: true,
            isMainMarket: true,
            liquidity: data.liquidity || { XMR: 0, Xen: 0 },
            networkEnabled: true, // Can scale across multiple worlds
          };

          // Octavia (Sarakt Prime) - conditional activation (locked for now)
          markets["sarakt-prime"] = {
            planetId: "sarakt-prime",
            planetName: "Sarakt Prime",
            enabled: false, // Disabled until 100k plots sold AND unlocked
            isMainMarket: false,
            activationCondition: {
              type: "plot_sales",
              threshold: 100000,
              current: data.octavia_plots_sold || 0,
              locked: true, // Keep locked until user unlocks
            },
            liquidity: { XMR: 0, Xen: 0 },
            networkEnabled: false,
          };
        }

        setBlackMarkets(markets);
      } else {
        // Fallback to default values
        setBlackMarkets({
          "zythera": {
            planetId: "zythera",
            planetName: "Zythera",
            enabled: true,
            isMainMarket: true,
            liquidity: { XMR: 0, Xen: 0 },
            networkEnabled: true,
          },
          "sarakt-prime": {
            planetId: "sarakt-prime",
            planetName: "Sarakt Prime",
            enabled: false,
            isMainMarket: false,
            activationCondition: {
              type: "plot_sales",
              threshold: 100000,
              current: 0,
              locked: true,
            },
            liquidity: { XMR: 0, Xen: 0 },
            networkEnabled: false,
          },
        });
      }
    } catch (error) {
      console.debug("Could not fetch black market status:", error);
      // Fallback to default values
      setBlackMarkets({
        "zythera": {
          planetId: "zythera",
          planetName: "Zythera",
          enabled: true,
          isMainMarket: true,
          liquidity: { XMR: 0, Xen: 0 },
          networkEnabled: true,
        },
        "sarakt-prime": {
          planetId: "sarakt-prime",
          planetName: "Sarakt Prime",
          enabled: false,
          isMainMarket: false,
          activationCondition: {
            type: "plot_sales",
            threshold: 100000,
            current: 0,
            locked: true,
          },
          liquidity: { XMR: 0, Xen: 0 },
          networkEnabled: false,
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBlackMarketStatus();
    const interval = setInterval(fetchBlackMarketStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchBlackMarketStatus]);

  const getBlackMarketStatus = useCallback((planetId: string): BlackMarketStatus | null => {
    return blackMarkets[planetId] || null;
  }, [blackMarkets]);

  const isBlackMarketEnabled = useCallback((planetId: string): boolean => {
    const status = blackMarkets[planetId];
    if (!status) return false;
    
    // Zarathis is always enabled
    if (planetId === "zythera") return true;
    
    // For other planets, check if enabled and conditions met
    if (!status.enabled) return false;
    
    // Check activation conditions if they exist
    if (status.activationCondition) {
      if (status.activationCondition.locked) return false;
      if (status.activationCondition.current < status.activationCondition.threshold) return false;
    }
    
    return true;
  }, [blackMarkets]);

  return {
    blackMarkets,
    loading,
    getBlackMarketStatus,
    isBlackMarketEnabled,
    refresh: fetchBlackMarketStatus,
  };
}

