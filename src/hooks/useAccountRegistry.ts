import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { getAccountRegistryContract, hasAccountRegistryContract } from "@/lib/contracts";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";

export enum AccountType {
  Personal = 0,
  Cluster = 1,
  Joint = 2,
  Business = 3,
  Sub = 4,
}

export interface BlockchainAccount {
  id: bigint;
  name: string;
  walletAddress: string;
  accountType: AccountType;
  ownerWallet: string;
  description: string;
  parentAccount: string;
  isActive: boolean;
  createdAt: bigint;
  updatedAt: bigint;
}

export function useAccountRegistry() {
  const { address, signer, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<BlockchainAccount[]>([]);
  const [primaryAccountId, setPrimaryAccountId] = useState<bigint | null>(null);
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

  const loadAccounts = useCallback(async () => {
    if (!isConnected || !address) {
      setAccounts([]);
      return;
    }

    // Try to load contract addresses if not already loaded
    if (!hasAccountRegistryContract() && !addressesLoadAttemptedRef.current) {
      addressesLoadAttemptedRef.current = true;
      try {
        const { loadContractAddresses } = await import("@/lib/contracts");
        await loadContractAddresses();
      } catch (error) {
        // Contract addresses not available yet
      }
    }

    if (!hasAccountRegistryContract()) {
      setAccounts([]);
      return;
    }

    setLoading(true);
    try {
      const contract = getAccountRegistryContract();
      
      // Get all account IDs for this wallet
      const accountIds = await withTimeout(contract.getAccountsByWallet(address), 10000);
      
      // Get primary account
      try {
        const primaryId = await withTimeout(contract.getPrimaryAccount(address), 5000);
        setPrimaryAccountId(primaryId > 0n ? primaryId : null);
      } catch {
        setPrimaryAccountId(null);
      }

      // Fetch account details for each ID
      const accountPromises = accountIds.map((id: bigint) =>
        withTimeout(contract.getAccount(id), 5000).catch(() => null)
      );
      
      const accountResults = await Promise.all(accountPromises);
      const validAccounts = accountResults
        .filter((acc): acc is BlockchainAccount => acc !== null)
        .map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          walletAddress: acc.walletAddress,
          accountType: Number(acc.accountType) as AccountType,
          ownerWallet: acc.ownerWallet,
          description: acc.description,
          parentAccount: acc.parentAccount,
          isActive: acc.isActive,
          createdAt: acc.createdAt,
          updatedAt: acc.updatedAt,
        }));

      setAccounts(validAccounts);
    } catch (error: any) {
      console.debug("Failed to load blockchain accounts:", error.message);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  const createAccount = useCallback(async (
    name: string,
    walletAddress: string,
    accountType: AccountType,
    description: string = "",
    parentAccountId: bigint = 0n
  ): Promise<bigint> => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasAccountRegistryContract()) {
      throw new Error("Account Registry contract address not set");
    }

    setLoading(true);
    try {
      const contract = getAccountRegistryContract(signer);
      const tx = await contract.createAccount(
        name,
        walletAddress,
        accountType,
        description,
        parentAccountId
      );
      const receipt = await tx.wait();
      
      // Find the AccountCreated event to get the account ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "AccountCreated";
        } catch {
          return false;
        }
      });

      let accountId: bigint;
      if (event) {
        const parsed = contract.interface.parseLog(event);
        accountId = parsed?.args.accountId || 0n;
      } else {
        // Fallback: get the latest account ID
        const total = await contract.totalAccounts();
        accountId = total;
      }

      toast.success(`Account "${name}" created on blockchain!`);
      await loadAccounts();
      return accountId;
    } catch (error: any) {
      console.error("Error creating account on blockchain:", error);
      toast.error(error.reason || error.message || "Failed to create account on blockchain");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [signer, loadAccounts]);

  const updateAccount = useCallback(async (
    accountId: bigint,
    name: string = "",
    description: string = ""
  ): Promise<void> => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasAccountRegistryContract()) {
      throw new Error("Account Registry contract address not set");
    }

    setLoading(true);
    try {
      const contract = getAccountRegistryContract(signer);
      const tx = await contract.updateAccount(accountId, name, description);
      await tx.wait();
      
      toast.success("Account updated on blockchain!");
      await loadAccounts();
    } catch (error: any) {
      console.error("Error updating account on blockchain:", error);
      toast.error(error.reason || error.message || "Failed to update account on blockchain");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [signer, loadAccounts]);

  const deactivateAccount = useCallback(async (accountId: bigint): Promise<void> => {
    if (!signer) {
      throw new Error("Wallet not connected");
    }

    if (!hasAccountRegistryContract()) {
      throw new Error("Account Registry contract address not set");
    }

    setLoading(true);
    try {
      const contract = getAccountRegistryContract(signer);
      const tx = await contract.deactivateAccount(accountId);
      await tx.wait();
      
      toast.success("Account deactivated on blockchain!");
      await loadAccounts();
    } catch (error: any) {
      console.error("Error deactivating account on blockchain:", error);
      toast.error(error.reason || error.message || "Failed to deactivate account on blockchain");
      throw error;
    } finally {
      setLoading(false);
    }
  }, [signer, loadAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  return {
    accounts,
    primaryAccountId,
    loading,
    createAccount,
    updateAccount,
    deactivateAccount,
    refresh: loadAccounts,
    hasContract: hasAccountRegistryContract(),
  };
}

