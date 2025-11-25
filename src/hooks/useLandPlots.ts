import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getLandContract, hasLandContract } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

export interface PlotInfo {
  plotId: number;
  isOwned: boolean;
  owner: string | null;
  price: bigint;
}

export function useLandPlots() {
  const { address, signer, isConnected } = useWallet();
  const [plots, setPlots] = useState<PlotInfo[]>([]);
  const [plotsSold, setPlotsSold] = useState<bigint>(0n);
  const [totalPlots, setTotalPlots] = useState<bigint>(100000n); // Updated to 100k
  const [priceInAVAX, setPriceInAVAX] = useState<bigint>(0n);
  
  // Price calculation: 100 xBGL for first 10k, 400 xBGL for 10k-100k
  const getPriceInXBGL = useCallback((plotId: number, soldCount: number): number => {
    // If plot is in first 10,000 range and less than 10k sold, price is 100 xBGL
    if (plotId <= 10000 && soldCount < 10000) {
      return 100;
    }
    // After 10k plots sold, price is 400 xBGL (for plots 10,001 to 100,000)
    return 400;
  }, []);
  
  // Get current price based on plots sold
  const getCurrentPriceInXBGL = useCallback((): number => {
    const sold = Number(plotsSold);
    if (sold < 10000) {
      return 100; // First 10k plots
    }
    return 400; // After 10k plots sold
  }, [plotsSold]);
  const [salesActive, setSalesActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userPlots, setUserPlots] = useState<number[]>([]);
  const [pendingPlots, setPendingPlots] = useState<number[]>([]);

  // Track if we've tried loading addresses to avoid repeated console messages
  const addressesLoadAttemptedRef = useRef(false);
  // Track if we've already logged the contract deployment warning
  const contractWarningLoggedRef = useRef(false);

  // Helper to add timeout to contract calls
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Contract call timeout")), timeoutMs)
      ),
    ]);
  };

  const fetchLandData = useCallback(async () => {
    // Always try to fetch if we have an address, even if not "connected" via MetaMask
    // This allows fetching for Avalanche keys and other wallet types
    if (!address) return;

    // Try to load contract addresses once if not already loaded
    if (!hasLandContract() && !addressesLoadAttemptedRef.current) {
      addressesLoadAttemptedRef.current = true;
      try {
        const { loadContractAddresses } = await import("@/lib/contracts");
        await loadContractAddresses();
      } catch (error) {
        // Contract addresses not available yet - silently handle
      }
    }

    // Check again after loading attempt - silently return if not available
    if (!hasLandContract()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const contract = getLandContract();
      
      // Verify contract exists at address by checking code
      const provider = contract.provider;
      if (provider) {
        try {
          const code = await withTimeout(provider.getCode(contract.target), 5000);
          if (!code || code === "0x") {
            // Only log once to avoid console spam
            if (!contractWarningLoggedRef.current) {
              console.debug("No contract code found at address:", contract.target);
              contractWarningLoggedRef.current = true;
            }
            setLoading(false);
            return;
          }
        } catch (error: any) {
          // Only log once to avoid console spam
          if (!contractWarningLoggedRef.current) {
            console.debug("Failed to verify contract code:", error.message);
            contractWarningLoggedRef.current = true;
          }
          setLoading(false);
          return;
        }
      }
      
      // Fetch contract state with individual error handling and timeouts
      let total: bigint;
      let sold: bigint = 0n;
      let price: bigint = 0n;
      let active: boolean = false;
      
      try {
        total = await withTimeout(contract.TOTAL_PLOTS(), 10000);
        // Validate that we got a valid result (not empty)
        if (total === undefined || total === null) {
          throw new Error("TOTAL_PLOTS returned empty result");
        }
      } catch (error: any) {
        // If TOTAL_PLOTS fails, check if it's a decode error or timeout (contract might not be deployed)
        const isTimeout = error.message?.includes("timeout") || error.message?.includes("Contract call timeout");
        const isBadData = error.code === "BAD_DATA" || error.message?.includes("could not decode");
        
        if (isBadData || isTimeout) {
          const contractAddress = contract.target;
          // Only log once to avoid console spam - use debug level for expected errors
          if (!contractWarningLoggedRef.current) {
            if (isTimeout) {
              console.debug(
                `Contract call timeout for TOTAL_PLOTS at address ${contractAddress}. ` +
                `This is expected if the contract hasn't been deployed yet or the RPC is slow.`
              );
            } else {
              console.debug(
                `Contract may not be deployed at address ${contractAddress} or TOTAL_PLOTS function unavailable. ` +
                `This is expected if the contract hasn't been deployed yet.`
              );
            }
            contractWarningLoggedRef.current = true;
          }
          // Don't show toast for this - it's expected if contract isn't deployed yet
          setLoading(false);
          return;
        }
        throw error;
      }
      
      try {
        const [soldResult, priceResult, activeResult] = await Promise.all([
          withTimeout(contract.plotsSold(), 10000),
          withTimeout(contract.priceInAVAX(), 10000),
          withTimeout(contract.salesActive(), 10000),
      ]);
        sold = soldResult;
        price = priceResult;
        active = activeResult;
      } catch (error: any) {
        // If other calls fail, use default values already set above
        // Only log if it's not a timeout or BAD_DATA error (expected errors)
        const isExpectedError = error.message?.includes("timeout") || 
                                error.message?.includes("Contract call timeout") ||
                                error.code === "BAD_DATA" ||
                                error.message?.includes("could not decode");
        if (!isExpectedError) {
          console.debug("Some contract calls failed, using defaults:", error.message);
        }
      }

      setTotalPlots(total);
      setPlotsSold(sold);
      setPriceInAVAX(price);
      setSalesActive(active);

      // Fetch user's plots if connected
      if (address) {
        const ownedPlots: number[] = [];
        const pendingPlotsList: number[] = [];
        
        // Check ownership for first 1000 plots (can be optimized)
        const batchSize = 100;
        const checks = [];
        
        for (let i = 1; i <= 1000 && i <= Number(total); i += batchSize) {
          const ids = Array.from({ length: Math.min(batchSize, Number(total) - i + 1) }, (_, idx) => i + idx);
          const accounts = new Array(ids.length).fill(address);
          checks.push(withTimeout(contract.balanceOfBatch(accounts, ids), 10000));
        }

        const results = await Promise.all(checks);
        let plotId = 1;
        for (const batch of results) {
          for (const balance of batch) {
            if (balance > 0n) {
              ownedPlots.push(plotId);
            }
            plotId++;
          }
        }
        setUserPlots(ownedPlots);
        
        // Also check for pending purchases (limit to first 500 plots to avoid too many calls)
        try {
          // Check pending buyers for plots the user has purchased but not yet activated
          const maxPendingCheck = Math.min(500, Number(total));
          const pendingChecks = [];
          for (let i = 1; i <= maxPendingCheck; i++) {
            pendingChecks.push(
              withTimeout(contract.pendingBuyer(i), 3000)
                .then((buyer) => ({ id: i, buyer }))
                .catch(() => ({ id: i, buyer: null }))
            );
          }
          const pendingResults = await Promise.all(pendingChecks);
          for (const { id, buyer } of pendingResults) {
            if (buyer && buyer.toLowerCase() === address.toLowerCase()) {
              // Also check if it's not already minted
              try {
                const minted = await withTimeout(contract.plotMinted(id), 3000);
                if (!minted) {
                  pendingPlotsList.push(id);
                }
              } catch {
                // Skip if check fails
              }
            }
          }
          setPendingPlots(pendingPlotsList);
        } catch (error) {
          console.warn("Failed to fetch pending plots:", error);
          setPendingPlots([]);
        }
      } else {
        setPendingPlots([]);
      }
    } catch (error: any) {
      console.error("Error fetching land data:", error);
      toast.error("Failed to fetch land data");
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  const buyPlot = async (plotId: number) => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasLandContract()) {
      throw new Error("Land contract address not set");
    }

    setLoading(true);
    try {
      const contract = getLandContract(signer);
      const tx = await contract.buyPlot(plotId, { value: priceInAVAX });
      await tx.wait();
      
      toast.success(`Plot ${plotId} purchased successfully!`);
      await fetchLandData();
      return tx.hash;
    } catch (error: any) {
      console.error("Error buying plot:", error);
      toast.error(error.reason || error.message || "Failed to buy plot");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const buyPlotPhase1AVAX = async (plotId: number) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!hasLandContract()) {
      throw new Error("Land contract address not set");
    }
    setLoading(true);
    try {
      const contract = getLandContract(signer);
      const price = await contract.phase1PriceAVAX();
      const tx = await contract.buyPlotWithAVAX(plotId, { value: price });
      const receipt = await tx.wait();
      toast.success(`Payment received for plot ${plotId}. Pending activation.`);
      // Wait a bit for the transaction to be fully processed, then refresh
      setTimeout(async () => {
      await fetchLandData();
      }, 2000);
      return tx.hash;
    } catch (error: any) {
      console.error("Error buying plot (Phase1 AVAX):", error);
      toast.error(error.reason || error.message || "Failed to pay for plot");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const buyPlotPhase1USDC = async (plotId: number, amountOverride?: bigint) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!hasLandContract()) {
      throw new Error("Land contract address not set");
    }
    setLoading(true);
    try {
      const contract = getLandContract(signer);
      const amount = amountOverride ?? (await contract.phase1PriceUSDC());
      const usdcAddr = await contract.usdcToken?.().catch(() => undefined);
      if (!usdcAddr || usdcAddr === "0x0000000000000000000000000000000000000000") {
        throw new Error("USDC token not set");
      }
      const { getERC20Contract } = await import("@/lib/contracts");
      const erc20 = getERC20Contract(usdcAddr as string, signer);
      const allowance = await erc20.allowance?.(await signer.getAddress(), contract.target).catch(() => 0n);
      if (!allowance || allowance < amount) {
        const approveTx = await erc20.approve(contract.target, amount);
        await approveTx.wait();
      }
      const tx = await contract.buyPlotWithUSDC(plotId, amount);
      const receipt = await tx.wait();
      toast.success(`Payment received (USDC) for plot ${plotId}. Pending activation.`);
      // Wait a bit for the transaction to be fully processed, then refresh
      setTimeout(async () => {
      await fetchLandData();
      }, 2000);
      return tx.hash;
    } catch (error: any) {
      console.error("Error buying plot (Phase1 USDC):", error);
      toast.error(error.reason || error.message || "Failed to pay with USDC");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const buyPlotPhase1CSN = async (plotId: number) => {
    if (!signer) throw new Error("Wallet not connected");
    if (!hasLandContract()) {
      throw new Error("Land contract address not set");
    }
    setLoading(true);
    try {
      // Ensure we're using Chaos Star Network RPC
      // The signer should already be connected to Chaos Star Network RPC if using Avalanche Keys
      // For MetaMask, this won't work (as we disabled it in ChaosVault)
      const { getRpcProvider } = await import("@/lib/wallet");
      const provider = getRpcProvider();
      if (!provider) {
        throw new Error("Chaos Star Network RPC not available");
      }
      
      // Verify the signer's provider is using Chaos Star Network
      const signerProvider = signer.provider;
      if (signerProvider) {
        const network = await signerProvider.getNetwork();
        console.log("Purchasing plot with CSN on network:", network);
      }
      
      const contract = getLandContract(signer);
      // Plot price is fixed at 100 CSN
      const PLOT_PRICE_CSN = ethers.parseEther("100");
      
      // Buy plot with native CSN (100 CSN per plot)
      // The contract's buyPlotWithAVAX function accepts native coin (CSN on Chaos Star Network)
      const tx = await contract.buyPlotWithAVAX(plotId, { value: PLOT_PRICE_CSN });
      const receipt = await tx.wait();
      toast.success(`Payment received (100 CSN) for plot ${plotId}. Pending activation.`);
      // Wait a bit for the transaction to be fully processed, then refresh
      setTimeout(async () => {
      await fetchLandData();
      }, 2000);
      return tx.hash;
    } catch (error: any) {
      console.error("Error buying plot (Phase1 CSN):", error);
      toast.error(error.reason || error.message || "Failed to pay with CSN. Ensure you're using an Avalanche Key connected to Chaos Star Network.");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const buyPlotsBatch = async (plotIds: number[]) => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasLandContract()) {
      throw new Error("Land contract address not set");
    }

    setLoading(true);
    try {
      const contract = getLandContract(signer);
      // Plot price is fixed at 100 CSN per plot
      const PLOT_PRICE_CSN = ethers.parseEther("100");
      const totalPrice = PLOT_PRICE_CSN * BigInt(plotIds.length);
      const tx = await contract.buyPlotsBatch(plotIds, { value: totalPrice });
      const receipt = await tx.wait();
      
      toast.success(`${plotIds.length} plots purchased successfully for ${plotIds.length * 100} CSN!`);
      // Wait a bit for the transaction to be fully processed, then refresh
      setTimeout(async () => {
      await fetchLandData();
      }, 2000);
      return tx.hash;
    } catch (error: any) {
      console.error("Error buying plots:", error);
      toast.error(error.reason || error.message || "Failed to buy plots");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load contract addresses first
    const initialize = async () => {
      if (!hasLandContract()) {
        try {
          const { loadContractAddresses } = await import("@/lib/contracts");
          await loadContractAddresses();
        } catch (error) {
          // Contract addresses not available
          console.debug("Contract addresses not available yet");
        }
      }
      // Fetch plots if we have an address (MetaMask or other wallet)
      if (address) {
      fetchLandData();
      }
    };
    
    initialize();
    
    // Refresh every 30 seconds if we have an address
    const interval = setInterval(() => {
      if (hasLandContract() && address) {
        fetchLandData();
      }
    }, 30000);
    
    // Set up event listeners for real-time updates
    let cleanup: (() => void) | undefined;
    try {
      if (!hasLandContract()) {
        return () => clearInterval(interval);
      }
      const contract = getLandContract();
      
      const handleLandMinted = (plotId: bigint, owner: string) => {
        console.log("New plot minted:", Number(plotId), owner);
        // Refresh data when new plot is minted (if it's for our address)
        if (address) {
        fetchLandData();
        }
      };
      
      contract.on("LandMinted", handleLandMinted);
      
      cleanup = () => {
        contract.removeAllListeners("LandMinted");
      };
    } catch (error) {
      // Contract not available, skip event listeners
    }
    
    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, [fetchLandData, address]);

  return {
    plots,
    userPlots,
    pendingPlots,
    plotsSold: Number(plotsSold),
    totalPlots: Number(totalPlots),
    plotsRemaining: Number(totalPlots) - Number(plotsSold),
    priceInAVAX: ethers.formatEther(priceInAVAX),
    priceInXBGL: getCurrentPriceInXBGL(), // Current price in xBGL
    getPriceInXBGL, // Function to get price for specific plot
    salesActive,
    loading,
    buyPlot,
    buyPlotPhase1AVAX,
    buyPlotPhase1USDC,
    buyPlotPhase1CSN,
    buyPlotsBatch,
    refresh: fetchLandData,
  };
}


