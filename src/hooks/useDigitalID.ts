import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { getDigitalIDContract, hasDigitalIDContract } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { getRpcProvider } from "@/lib/wallet";
import { toast } from "sonner";

export interface DigitalIDInfo {
  firstName: string;
  lastName: string;
  email: string;
  avatarURI: string;
  registeredAt: bigint;
  active: boolean;
}

export function useDigitalID() {
  const { address, signer, isConnected } = useWallet();
  const [digitalID, setDigitalID] = useState<DigitalIDInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addressesLoadAttemptedRef = useRef(false);

  // Helper to add timeout to contract calls
  const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Contract call timeout")), timeoutMs)
      ),
    ]);
  };

  const checkDigitalID = async (userAddress?: string) => {
    const addr = userAddress || address;
    if (!addr || !isConnected) {
      setDigitalID(null);
      return;
    }

    // Try to load contract addresses if not already loaded
    if (!hasDigitalIDContract() && !addressesLoadAttemptedRef.current) {
      addressesLoadAttemptedRef.current = true;
      try {
        const { loadContractAddresses } = await import("@/lib/contracts");
        await loadContractAddresses();
      } catch (error) {
        // Contract addresses not available yet
      }
    }

    if (!hasDigitalIDContract()) {
      setDigitalID(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Verify contract is deployed by checking code
      const provider = getRpcProvider();
      if (provider) {
        try {
          const { CONTRACT_ADDRESSES } = await import("@/lib/contracts");
          const contractAddress = CONTRACT_ADDRESSES.digitalID;
          if (contractAddress) {
            const code = await withTimeout(provider.getCode(contractAddress), 5000);
            if (!code || code === "0x") {
              console.debug("Digital ID contract not deployed at:", contractAddress);
              setDigitalID(null);
              setLoading(false);
              return;
            }
          }
        } catch (codeError: any) {
          console.debug("Failed to verify Digital ID contract code:", codeError.message);
          setDigitalID(null);
          setLoading(false);
          return;
        }
      }

      const contract = getDigitalIDContract();
      const idData = await withTimeout(contract.ids(addr), 10000);
      
      if (idData.active) {
        setDigitalID({
          firstName: idData.firstName,
          lastName: idData.lastName,
          email: idData.email,
          avatarURI: idData.avatarURI,
          registeredAt: idData.registeredAt,
          active: idData.active,
        });
      } else {
        setDigitalID(null);
      }
    } catch (err: any) {
      // Handle decode errors gracefully (contract might not be deployed)
      if (err.code === "BAD_DATA" || err.message?.includes("could not decode")) {
        console.debug("Digital ID contract may not be deployed or unavailable:", err.message);
        setDigitalID(null);
      } else {
      console.error("Error checking digital ID:", err);
      setError(err.message);
      setDigitalID(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const registerDigitalID = async (firstName: string, lastName: string, email: string, avatarURI: string) => {
    if (!signer) {
      throw new Error("Wallet not connected. Please connect your wallet to register a Digital ID on Chaos Star Network.");
    }

    if (!hasDigitalIDContract()) {
      throw new Error("Digital ID contract not available on Chaos Star Network. Please ensure the contract is deployed.");
    }

    setLoading(true);
    setError(null);
    try {
      // Verify contract is deployed
      const provider = getRpcProvider();
      if (provider) {
        const { CONTRACT_ADDRESSES } = await import("@/lib/contracts");
        const contractAddress = CONTRACT_ADDRESSES.digitalID;
        if (contractAddress) {
          const code = await withTimeout(provider.getCode(contractAddress), 5000);
          if (!code || code === "0x") {
            throw new Error("Digital ID contract not deployed on Chaos Star Network");
          }
        }
      }

      const contract = getDigitalIDContract(signer);
      const tx = await contract.registerID(firstName, lastName, email, avatarURI);
      toast.success(`Transaction sent! Hash: ${tx.hash.slice(0, 10)}...`);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success("Digital ID registered successfully on Chaos Star Network!");
      } else {
        throw new Error("Transaction failed");
      }
      
      // Refresh digital ID after registration
      await checkDigitalID();
      return receipt.hash;
    } catch (err: any) {
      console.error("Error registering digital ID on blockchain:", err);
      const errorMessage = err.reason || err.message || "Failed to register Digital ID on Chaos Star Network";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deactivateDigitalID = async () => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasDigitalIDContract()) {
      throw new Error("Digital ID contract not available");
    }

    setLoading(true);
    setError(null);
    try {
      const contract = getDigitalIDContract(signer);
      const tx = await contract.deactivateID();
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success("Digital ID deactivated on Chaos Star Network");
      }
      
      await checkDigitalID();
      return receipt.hash;
    } catch (err: any) {
      console.error("Error deactivating digital ID:", err);
      const errorMessage = err.reason || err.message || "Failed to deactivate Digital ID";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && isConnected) {
      checkDigitalID();
    } else {
      setDigitalID(null);
    }
  }, [address, isConnected]);

  return {
    digitalID,
    hasDigitalID: digitalID?.active || false,
    loading,
    error,
    checkDigitalID,
    registerDigitalID,
    deactivateDigitalID,
    refresh: () => checkDigitalID(),
    hasContract: hasDigitalIDContract(),
  };
}


