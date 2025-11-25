import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { getTreasuryContract, getERC20Contract, CONTRACT_ADDRESSES, hasTreasuryContract } from "@/lib/contracts";
import { toast } from "sonner";

export interface TreasuryBalances {
  avax: string;
  tokens: Record<string, { balance: string; symbol: string; decimals: number }>;
}

export function useTreasury() {
  const [balances, setBalances] = useState<TreasuryBalances>({
    avax: "0",
    tokens: {},
  });
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    // Check if treasury contract address is available (check both function and direct property)
    const hasTreasury = hasTreasuryContract() && CONTRACT_ADDRESSES.treasury && CONTRACT_ADDRESSES.treasury.trim() !== "";
    
    if (!hasTreasury) {
      console.debug("Treasury contract address not set, skipping balance fetch");
      setBalances({
        avax: "0",
        tokens: {},
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Double-check before calling to avoid errors
      if (!CONTRACT_ADDRESSES.treasury || CONTRACT_ADDRESSES.treasury.trim() === "") {
        throw new Error("Treasury contract address not set");
      }
      
      // Verify contract is deployed by checking if code exists
      const { getRpcProvider } = await import("@/lib/wallet");
      const provider = getRpcProvider();
      if (provider) {
        try {
          // Add timeout to code check
          const codeCheckPromise = provider.getCode(CONTRACT_ADDRESSES.treasury);
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Code check timeout")), 5000)
          );
          const code = await Promise.race([codeCheckPromise, timeoutPromise]);
          if (!code || code === "0x") {
            console.debug("Treasury contract not deployed at address:", CONTRACT_ADDRESSES.treasury);
            setBalances({
              avax: "0",
              tokens: {},
            });
            setLoading(false);
            return;
          }
        } catch (codeError: any) {
          // Handle timeout or deployment errors gracefully
          if (codeError.message?.includes("not deployed") || 
              codeError.message?.includes("timeout") ||
              codeError.message?.includes("Code check timeout")) {
            console.debug("Treasury contract not deployed at address:", CONTRACT_ADDRESSES.treasury);
            setBalances({
              avax: "0",
              tokens: {},
            });
            setLoading(false);
            return;
          }
          // Re-throw unexpected errors
          throw codeError;
        }
      }
      
      const treasuryContract = getTreasuryContract();
      
      // Fetch AVAX balance with error handling for BAD_DATA and timeouts
      let avaxBalance = 0n;
      try {
        // Add timeout to balanceAVAX call
        const balancePromise = treasuryContract.balanceAVAX();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Contract call timeout")), 10000)
        );
        avaxBalance = await Promise.race([balancePromise, timeoutPromise]);
      } catch (error: any) {
        // Handle BAD_DATA errors and timeouts (contract not deployed or function doesn't exist)
        const isTimeout = error.message?.includes("timeout") || error.message?.includes("Contract call timeout");
        const isBadData = error.code === "BAD_DATA" || error.message?.includes("could not decode");
        
        if (isBadData || isTimeout) {
          console.debug("Treasury contract balanceAVAX() function unavailable, contract not deployed, or call timed out");
          setBalances({
            avax: "0",
            tokens: {},
          });
          setLoading(false);
          return;
        }
        throw error;
      }
      
      // Fetch token balances if dummy token address is available
      const tokenBalances: Record<string, { balance: string; symbol: string; decimals: number }> = {};
      
      if (CONTRACT_ADDRESSES.dummyToken) {
        try {
          const tokenContract = getERC20Contract(CONTRACT_ADDRESSES.dummyToken);
          const [balance, decimals, symbol] = await Promise.all([
            treasuryContract.balanceERC20(CONTRACT_ADDRESSES.dummyToken),
            tokenContract.decimals(),
            tokenContract.symbol(),
          ]);
          
          tokenBalances[CONTRACT_ADDRESSES.dummyToken] = {
            balance: ethers.formatUnits(balance, decimals),
            symbol: symbol || "TOKEN",
            decimals: Number(decimals),
          };
        } catch (error) {
          console.warn("Could not fetch token balance:", error);
        }
      }

      setBalances({
        avax: ethers.formatEther(avaxBalance),
        tokens: tokenBalances,
      });
    } catch (error: any) {
      // Handle BAD_DATA errors (contract not deployed or function doesn't exist)
      if (error.code === "BAD_DATA" || error.message?.includes("could not decode")) {
        console.debug("Treasury contract balanceAVAX() function unavailable or contract not deployed");
        setBalances({
          avax: "0",
          tokens: {},
        });
        setLoading(false);
        return;
      }
      
      // Only show error toast if it's not a missing address error
      if (!error.message?.includes("not set") && !error.message?.includes("not deployed")) {
        console.error("Error fetching treasury balances:", error);
        // Don't show toast for expected errors
        if (!error.message?.includes("timeout")) {
          console.warn("Treasury balance fetch failed:", error.message);
        }
      } else {
        console.debug("Treasury contract not available:", error.message);
      }
      // Set default balances on error
      setBalances({
        avax: "0",
        tokens: {},
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [fetchBalances]);

  return {
    balances,
    loading,
    refresh: fetchBalances,
  };
}


