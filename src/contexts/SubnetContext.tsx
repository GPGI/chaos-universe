import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as accountApi from "@/lib/api";
import { toast } from "sonner";

interface SubnetInfo {
  name: string;
  rpc_url?: string;
  blockchain_id?: string;
  subnet_id?: string;
  status?: "connected" | "disconnected" | "unknown";
}

interface SubnetContextType {
  currentSubnet: SubnetInfo | null;
  availableSubnets: any[];
  loading: boolean;
  loadSubnets: () => Promise<void>;
  selectSubnet: (subnetName: string) => Promise<void>;
  subnetStatus: "connected" | "disconnected" | "unknown";
  refreshSubnetInfo: () => Promise<void>;
}

const SubnetContext = createContext<SubnetContextType | undefined>(undefined);

export function SubnetProvider({ children }: { children: ReactNode }) {
  const [currentSubnet, setCurrentSubnet] = useState<SubnetInfo | null>(null);
  const [availableSubnets, setAvailableSubnets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subnetStatus, setSubnetStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");

  const loadSubnets = async () => {
    setLoading(true);
    try {
      const result = await accountApi.listAvalancheSubnets();
      setAvailableSubnets(result.subnets || []);
      
      // Auto-select first subnet or ChaosStarNetwork if available
      const subnets = result.subnets || [];
      const preferredSubnet = subnets.find((s: any) => 
        s.name === "ChaosStarNetwork" || s.name.toLowerCase().includes("chaos")
      ) || subnets[0];
      
      if (preferredSubnet && !currentSubnet) {
        await selectSubnet(preferredSubnet.name);
      }
    } catch (error: any) {
      console.error("Failed to load subnets:", error);
      setAvailableSubnets([]);
    } finally {
      setLoading(false);
    }
  };

  const selectSubnet = async (subnetName: string) => {
    try {
      setLoading(true);
      const details = await accountApi.describeAvalancheSubnet(subnetName);
      
      if (details.success && details.parsed) {
        const subnetInfo: SubnetInfo = {
          name: subnetName,
          rpc_url: details.parsed.rpc_urls?.localhost || details.parsed.wallet_connection?.network_rpc_url,
          blockchain_id: details.parsed.avalanche_blockchain_id,
          subnet_id: details.parsed.avalanche_subnet_id,
          status: "connected",
        };
        
        setCurrentSubnet(subnetInfo);
        setSubnetStatus("connected");
        
        // Store in localStorage for persistence
        localStorage.setItem("selected_subnet", JSON.stringify(subnetInfo));
        
        toast.success(`Connected to ${subnetName}`);
      } else {
        setSubnetStatus("disconnected");
        toast.error(`Failed to connect to ${subnetName}`);
      }
    } catch (error: any) {
      console.error("Failed to select subnet:", error);
      setSubnetStatus("disconnected");
      toast.error(`Error connecting to subnet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubnetInfo = async () => {
    if (!currentSubnet) return;
    await selectSubnet(currentSubnet.name);
  };

  // Load subnets on mount
  useEffect(() => {
    loadSubnets();
    
    // Try to restore from localStorage
    try {
      const stored = localStorage.getItem("selected_subnet");
      if (stored) {
        const subnetInfo = JSON.parse(stored);
        setCurrentSubnet(subnetInfo);
        setSubnetStatus(subnetInfo.status || "unknown");
      }
    } catch (error) {
      console.error("Failed to restore subnet from storage:", error);
    }
  }, []);

  return (
    <SubnetContext.Provider
      value={{
        currentSubnet,
        availableSubnets,
        loading,
        loadSubnets,
        selectSubnet,
        subnetStatus,
        refreshSubnetInfo,
      }}
    >
      {children}
    </SubnetContext.Provider>
  );
}

export function useSubnet() {
  const context = useContext(SubnetContext);
  if (context === undefined) {
    throw new Error("useSubnet must be used within a SubnetProvider");
  }
  return context;
}

