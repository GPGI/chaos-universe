import { useCallback, useState } from "react";
import { ethers } from "ethers";
import { getPlotRegistryContract } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

export function usePlotRegistry() {
  const { signer, address } = useWallet();
  const [loading, setLoading] = useState(false);

  const getOwner = useCallback(async (plotId: number): Promise<string | null> => {
    try {
      const c = getPlotRegistryContract();
      const owner = await c.ownerOfPlot(plotId);
      if (owner && owner !== ethers.ZeroAddress) return owner;
      return null;
    } catch {
      return null;
    }
  }, []);

  const isActivated = useCallback(async (plotId: number): Promise<boolean> => {
    try {
      const c = getPlotRegistryContract();
      return await c.activated(plotId);
    } catch {
      return false;
    }
  }, []);

  const getUri = useCallback(async (plotId: number): Promise<string> => {
    try {
      const c = getPlotRegistryContract();
      return await c.uri(plotId);
    } catch {
      return "";
    }
  }, []);

  const requestTransfer = useCallback(async (plotId: number, newOwner: string) => {
    if (!signer) throw new Error("Wallet not connected");
    setLoading(true);
    try {
      const c = getPlotRegistryContract(signer);
      const tx = await c.requestTransfer(plotId, newOwner);
      await tx.wait();
      toast.success(`Transfer requested for plot #${plotId}`);
      return tx.hash;
    } catch (e: any) {
      toast.error(e.reason || e.message || "Failed to request transfer");
      throw e;
    } finally {
      setLoading(false);
    }
  }, [signer]);

  const isOwner = useCallback(async (plotId: number): Promise<boolean> => {
    if (!address) return false;
    const owner = await getOwner(plotId);
    return !!owner && owner.toLowerCase() === address.toLowerCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return {
    loading,
    getOwner,
    isActivated,
    getUri,
    isOwner,
    requestTransfer,
  };
}


