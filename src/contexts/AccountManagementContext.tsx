import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as accountApi from "@/lib/api";
import { toast } from "sonner";
import { ethers } from "ethers";
import { useWallet } from "./WalletContext";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

export interface UniversalWallet {
  id: string;
  address: string;
  accountId: string | null; // null if not linked to an account
  name: string;
  createdAt: number;
  encryptedPrivateKey: string; // Base64 encoded encrypted private key
}

interface AccountManagementContextType {
  // Accounts
  accounts: accountApi.Account[];
  clusters: any[];
  loadingAccounts: boolean;
  loadAccounts: () => Promise<void>;
  loadClusters: () => Promise<void>;
  createAccount: (account: any) => Promise<void>;
  updateAccount: (id: string, updates: any) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  
  // Universal Wallets
  universalWallets: UniversalWallet[];
  createUniversalWallet: (accountId: string | null, name: string) => Promise<UniversalWallet>;
  deleteUniversalWallet: (walletId: string) => Promise<void>;
  getWalletPrivateKey: (walletId: string) => Promise<string | null>;
  getWalletSigner: (walletId: string) => Promise<ethers.Wallet | null>;
  loadUniversalWallets: () => void;
  
  // Avalanche CLI Info
  avalancheSubnets: any[];
  networkStatus: any;
  avalancheKeys: any[];
  loadingAvalancheInfo: boolean;
  loadAvalancheInfo: () => Promise<void>;
  loadSubnetDetails: (subnetName: string) => Promise<any>;
  
  // Selected account for app-wide use
  selectedAccount: accountApi.Account | null;
  setSelectedAccount: (account: accountApi.Account | null) => void;
  
  // Main funded account
  mainFundedAccount: string;
  isMainFundedAccount: boolean;
  
  // Transfer history
  transfers: any[];
  loadTransfers: () => void;
  
  // CSN Token balance
  csnBalance: string | null;
  loadCSNBalance: () => Promise<void>;
}

const AccountManagementContext = createContext<AccountManagementContextType | undefined>(undefined);

// Main funded account address
const MAIN_FUNDED_ACCOUNT = "0x7852031cbD4b980457962D30D11e7CC684109fEa";

export function AccountManagementProvider({ children }: { children: ReactNode }) {
  const { address, isConnected, signer } = useWallet();
  
  // Accounts
  const [accounts, setAccounts] = useState<accountApi.Account[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<accountApi.Account | null>(null);
  
  // Main funded account info
  const isMainFundedAccount = address?.toLowerCase() === MAIN_FUNDED_ACCOUNT.toLowerCase();
  
  // Avalanche CLI Info
  const [avalancheSubnets, setAvalancheSubnets] = useState<any[]>([]);
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [avalancheKeys, setAvalancheKeys] = useState<any[]>([]);
  const [loadingAvalancheInfo, setLoadingAvalancheInfo] = useState(false);
  
  // Transfers
  const [transfers, setTransfers] = useState<any[]>([]);
  
  // CSN Token balance
  const [csnBalance, setCsnBalance] = useState<string | null>(null);
  
  // Universal Wallets
  const [universalWallets, setUniversalWallets] = useState<UniversalWallet[]>([]);

  const loadAccounts = async () => {
    if (!address) return;
    setLoadingAccounts(true);
    try {
      let loadedAccounts: accountApi.Account[] = [];
      
      // Load accounts from blockchain AccountRegistry contract (primary source)
      try {
        const { getAccountRegistryContract, hasAccountRegistryContract, loadContractAddresses } = await import("@/lib/contracts");
        
        // Try to load contract addresses if not already loaded
        if (!hasAccountRegistryContract()) {
          try {
            await loadContractAddresses();
          } catch (loadError) {
            console.debug("Failed to load contract addresses:", loadError);
          }
        }
        
        if (hasAccountRegistryContract()) {
          // Verify contract is deployed by checking if code exists
          const { getRpcProvider } = await import("@/lib/wallet");
          const provider = getRpcProvider();
          const { CONTRACT_ADDRESSES } = await import("@/lib/contracts");
          
          if (provider && CONTRACT_ADDRESSES.accountRegistry) {
            try {
              const code = await provider.getCode(CONTRACT_ADDRESSES.accountRegistry);
              if (!code || code === "0x") {
                // Contract not deployed - expected, silently skip
                // Continue to try Supabase as fallback
                throw new Error("Contract not deployed");
              }
            } catch (codeError: any) {
              if (codeError.message?.includes("not deployed")) {
                // Silently skip - contract not deployed is expected
                // Continue to try Supabase as fallback
                throw codeError;
              }
            }
          }
          
          const contract = getAccountRegistryContract();
          
          // Helper to add timeout to contract calls
          const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
            return Promise.race([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error("Contract call timeout")), timeoutMs)
              ),
            ]);
          };
          
          // Get all account IDs for connected wallet
          let accountIds: bigint[] = [];
          try {
            accountIds = await withTimeout(contract.getAccountsByWallet(address), 10000);
          } catch (error: any) {
            // Handle BAD_DATA errors (contract not deployed or function doesn't exist)
            if (error.code === "BAD_DATA" || error.message?.includes("could not decode")) {
              console.debug("AccountRegistry getAccountsByWallet() function unavailable or contract not deployed");
              // Continue to try Supabase as fallback
              throw error;
            }
            console.debug("Failed to get accounts for connected wallet:", error.message || error);
            // Continue to try Supabase as fallback
            throw error;
          }
          
          // Also load accounts for all Avalanche keys
          const addressesToCheck = [address];
          if (avalancheKeys && avalancheKeys.length > 0) {
            avalancheKeys.forEach((key) => {
              if (key.evm_address && !addressesToCheck.includes(key.evm_address)) {
                addressesToCheck.push(key.evm_address);
              }
            });
          }
          
          // Get accounts for all addresses (connected wallet + Avalanche keys)
          const allAccountPromises = addressesToCheck.map(async (addr) => {
            try {
              const ids = await withTimeout(contract.getAccountsByWallet(addr), 5000);
              return { address: addr, accountIds: ids };
            } catch (error: any) {
              // Handle BAD_DATA errors gracefully
              if (error.code === "BAD_DATA" || error.message?.includes("could not decode")) {
                console.debug(`AccountRegistry getAccountsByWallet() unavailable for ${addr}`);
              }
              return { address: addr, accountIds: [] };
            }
          });
          
          const allAccountResults = await Promise.all(allAccountPromises);
          const allAccountIds = new Set<bigint>();
          const addressToAccountIds = new Map<string, bigint[]>();
          
          allAccountResults.forEach((result) => {
            result.accountIds.forEach((id: bigint) => {
              allAccountIds.add(id);
            });
            addressToAccountIds.set(result.address, result.accountIds);
          });
          
          // Fetch account details for each unique ID
          const accountPromises = Array.from(allAccountIds).map((id: bigint) =>
            withTimeout(contract.getAccount(id), 5000).catch(() => null)
          );
          
          const accountResults = await Promise.all(accountPromises);
          
          // Convert blockchain accounts to API format
          loadedAccounts = accountResults
            .filter((acc: any) => acc !== null && acc.isActive)
            .map((acc: any) => {
              const accountTypeMap = ["personal", "cluster", "joint", "business", "sub"];
              const accountType = accountTypeMap[Number(acc.accountType)] || "personal";
              
              // Find which Avalanche key this account belongs to (if any)
              const walletAddr = acc.walletAddress || acc.ownerWallet;
              const matchingKey = avalancheKeys.find(
                (key) => key.evm_address?.toLowerCase() === walletAddr.toLowerCase()
              );
              
              return {
                id: `blockchain-${acc.id.toString()}`,
                name: acc.name || "Unnamed Account",
                wallet_address: walletAddr,
                type: accountType as any,
                owner_wallet: acc.ownerWallet,
                description: acc.description || "",
                metadata: {
                  blockchain_account_id: acc.id.toString(),
                  parent_account: acc.parentAccount && acc.parentAccount !== ethers.ZeroAddress ? acc.parentAccount : null,
                },
                wallet_key_name: matchingKey?.name,
                is_active: acc.isActive,
                created_at: new Date(Number(acc.createdAt) * 1000).toISOString(),
                updated_at: new Date(Number(acc.updatedAt) * 1000).toISOString(),
              } as accountApi.Account;
            });
        }
      } catch (blockchainError: any) {
        // Suppress BAD_DATA and timeout errors - they're expected if contract isn't deployed
        const isExpectedError = blockchainError.code === "BAD_DATA" || 
                                blockchainError.message?.includes("could not decode") ||
                                blockchainError.message?.includes("timeout") ||
                                blockchainError.message?.includes("not deployed");
        
        if (!isExpectedError) {
          console.debug("Failed to load blockchain accounts:", blockchainError.message);
        }
        // Continue to try Supabase as fallback
      }
      
      // If no blockchain accounts found, try Supabase as fallback (only if blockchain failed)
      if (loadedAccounts.length === 0) {
    try {
      const result = await accountApi.listAccounts(address);
          loadedAccounts = result.accounts || [];
        } catch (apiError: any) {
          // Suppress timeout errors - Supabase might not be configured
          const isTimeoutError = apiError.name === "AbortError" || 
                                apiError.name === "DOMException" ||
                                apiError.message?.includes("timeout");
          if (!isTimeoutError) {
            console.debug("API accounts load failed:", apiError.message);
          }
        }
      }
      
      // Check if main funded account exists, if not, try to create it
      const mainFundedExists = loadedAccounts.some(
        (acc: accountApi.Account) => acc.wallet_address.toLowerCase() === MAIN_FUNDED_ACCOUNT.toLowerCase()
      );
      
      // If current address is the main funded account and it doesn't exist in accounts, auto-create it
      if (isMainFundedAccount && !mainFundedExists) {
        try {
          await accountApi.createAccount({
            name: "Main Funded Account",
            wallet_address: MAIN_FUNDED_ACCOUNT,
            type: "personal",
            owner_wallet: address,
            description: "Primary funded account from Avalanche CLI",
          });
          // Reload accounts after creation
          await loadAccounts();
          return;
        } catch (createError: any) {
          // If creation fails (maybe already exists), just continue with loaded accounts
          console.log("Main funded account may already exist:", createError);
        }
      }
      
      setAccounts(loadedAccounts);
    } catch (error: any) {
      // Suppress timeout and network errors - they're already handled gracefully
      const isTimeoutError = error.name === "AbortError" || 
                            error.name === "DOMException" ||
                            error.message?.includes("timeout") ||
                            error.message?.includes("not available") ||
                            error.message?.includes("Failed to fetch");
      
      if (!isTimeoutError) {
      console.error("Failed to load accounts:", error);
      // Only show toast for non-network errors
      if (error.message && !error.message.includes("not available")) {
        toast.error(error.message || "Failed to load accounts");
        }
      }
      setAccounts([]); // Set empty array on error
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadClusters = async () => {
    if (!address) {
      setClusters([]);
      return;
    }
    try {
      const result = await accountApi.listClusters(address);
      setClusters(result.clusters || []);
    } catch (error: any) {
      // Suppress timeout and network errors - they're already handled gracefully by the API
      const isTimeoutError = error.name === "AbortError" || 
                            error.name === "DOMException" ||
                            error.message?.includes("timeout") ||
                            error.message?.includes("not available") ||
                            error.message?.includes("Failed to fetch");
      
      // Silently suppress timeout errors - they're expected if Supabase is not configured
      if (!isTimeoutError) {
        console.debug("Failed to load clusters:", error);
      }
      setClusters([]); // Set empty array on error
    }
  };

  const createAccount = async (accountData: any) => {
    try {
      if (!address || !signer) {
        throw new Error("Wallet not connected");
      }

      // Map account type to blockchain enum
      const accountTypeMap: Record<string, number> = {
        personal: 0,
        cluster: 1,
        joint: 2,
        business: 3,
        sub: 4,
      };
      
      // Create account on blockchain (primary source)
      const contractsModule = await import("@/lib/contracts");
      const { getAccountRegistryContract, hasAccountRegistryContract, loadContractAddresses, ACCOUNT_REGISTRY_ABI } = contractsModule;
      
      // Try to load contract addresses if not already loaded
      if (!hasAccountRegistryContract()) {
        try {
          await loadContractAddresses();
        } catch (loadError) {
          console.debug("Failed to load contract addresses:", loadError);
        }
      }
      
      // Check again after loading
      if (!hasAccountRegistryContract()) {
        // Try to manually set the address if it's in deployments file
        try {
          const response = await fetch("/deployments/addresses.json");
          if (response.ok) {
            const data = await response.json();
            if (data.accountRegistry) {
              // Manually update the CONTRACT_ADDRESSES
              contractsModule.CONTRACT_ADDRESSES.accountRegistry = data.accountRegistry;
              localStorage.setItem("contract_addresses", JSON.stringify({
                ...JSON.parse(localStorage.getItem("contract_addresses") || "{}"),
                accountRegistry: data.accountRegistry
              }));
            }
          }
        } catch (fetchError) {
          console.debug("Failed to fetch addresses.json:", fetchError);
        }
      }
      
      // Always use the known deployed address - it's already deployed
      const registryAddress = "0x3E95B28Fa95426F2bA996528bDa7457871e03C70";
      
      // Verify contract is actually deployed by checking if code exists
      // IMPORTANT: Always use Chaos Star Network RPC provider, not signer.provider
      // (signer.provider might be connected to MetaMask's network, which is different)
      const { getRpcProvider } = await import("@/lib/wallet");
      const provider = getRpcProvider(); // Always use Chaos Star Network RPC
      if (provider) {
        try {
          const code = await provider.getCode(registryAddress);
          if (!code || code === "0x") {
            // Contract not deployed, need to deploy it
            const rpcUrl = "http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc";
            throw new Error(
              `Account Registry contract not deployed at address ${registryAddress}.\n\n` +
              "To deploy it, run:\n" +
              `forge script scripts/deploy_account_registry.s.sol --rpc-url ${rpcUrl} --private-key $PRIVATE_KEY --broadcast\n\n` +
              "Or deploy all contracts:\n" +
              `forge script scripts/deploy_all.s.sol --rpc-url ${rpcUrl} --private-key $PRIVATE_KEY --broadcast`
            );
          }
          console.log("✓ AccountRegistry contract verified at:", registryAddress);
        } catch (codeError: any) {
          if (codeError.message.includes("not deployed") || codeError.message.includes("To deploy")) {
            throw codeError;
          }
          console.debug("Failed to verify contract code:", codeError.message);
        }
      }
      
      // Validate wallet address
      if (!accountData.wallet_address || accountData.wallet_address.trim() === "") {
        throw new Error("Wallet address is required");
      }
      
      // Ensure wallet address is a valid Ethereum address
      let walletAddress = accountData.wallet_address.trim();
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address format: ${walletAddress}`);
      }
      
      // Normalize address (checksum)
      walletAddress = ethers.getAddress(walletAddress);
      
      // Create contract directly with the verified address - don't rely on CONTRACT_ADDRESSES
      const contract = new ethers.Contract(
        registryAddress,
        ACCOUNT_REGISTRY_ABI,
        signer
      );
      const accountType = accountTypeMap[accountData.type] || 0;
      const parentId = accountData.parent_id ? BigInt(accountData.parent_id) : 0n;
      
      // Create account on blockchain
      const tx = await contract.createAccount(
        accountData.name,
        walletAddress, // Use validated and normalized address
        accountType,
        accountData.description || "",
        parentId
      );
      const receipt = await tx.wait();
      
      // Extract account ID from event
      let blockchainAccountId: bigint | null = null;
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "AccountCreated";
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = contract.interface.parseLog(event);
        blockchainAccountId = parsed?.args.accountId || null;
      }
      
      if (!blockchainAccountId) {
        throw new Error("Failed to get account ID from blockchain transaction");
      }
      
      toast.success(`Account created on blockchain with ID: ${blockchainAccountId.toString()}`);
      
      // Reload accounts to show the newly created account
      await loadAccounts();
      
      return {
        id: `blockchain-${blockchainAccountId.toString()}`,
        blockchain_account_id: blockchainAccountId.toString(),
      };
    } catch (error: any) {
      console.error("Failed to create account:", error);
      toast.error(error.message || "Failed to create account");
      throw error;
    }
  };

  const updateAccount = async (id: string, updates: any) => {
    try {
      if (!address || !signer) {
        throw new Error("Wallet not connected");
      }

      // Extract blockchain account ID from the account ID
      const blockchainAccountId = id.startsWith("blockchain-") 
        ? BigInt(id.replace("blockchain-", ""))
        : (updates.metadata?.blockchain_account_id ? BigInt(updates.metadata.blockchain_account_id) : null);

      if (!blockchainAccountId) {
        // Fallback to Supabase if no blockchain ID
      await accountApi.updateAccount(id, updates);
      toast.success("Account updated");
        await loadAccounts();
        return;
      }

      // Update account on blockchain
      const { getAccountRegistryContract, hasAccountRegistryContract } = await import("@/lib/contracts");
      
      if (!hasAccountRegistryContract()) {
        throw new Error("Account Registry contract not available");
      }

      const contract = getAccountRegistryContract(signer);
      
      // Update account on blockchain
      const tx = await contract.updateAccount(
        blockchainAccountId,
        updates.name || "",
        updates.description || ""
      );
      await tx.wait();
      
      toast.success("Account updated on blockchain");
      await loadAccounts();
    } catch (error: any) {
      console.error("Failed to update account:", error);
      toast.error(error.message || "Failed to update account");
      throw error;
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      if (!address || !signer) {
        throw new Error("Wallet not connected");
      }

      // Extract blockchain account ID from the account ID
      const blockchainAccountId = id.startsWith("blockchain-") 
        ? BigInt(id.replace("blockchain-", ""))
        : null;

      if (!blockchainAccountId) {
        // Fallback to Supabase if no blockchain ID
      await accountApi.deleteAccount(id);
      toast.success("Account deleted");
        await loadAccounts();
        return;
      }

      // Deactivate account on blockchain (we don't delete, just deactivate)
      const { getAccountRegistryContract, hasAccountRegistryContract } = await import("@/lib/contracts");
      
      if (!hasAccountRegistryContract()) {
        throw new Error("Account Registry contract not available");
      }

      const contract = getAccountRegistryContract(signer);
      
      // Deactivate account on blockchain
      const tx = await contract.deactivateAccount(blockchainAccountId);
      await tx.wait();
      
      toast.success("Account deactivated on blockchain");
      await loadAccounts();
    } catch (error: any) {
      console.error("Failed to delete account:", error);
      toast.error(error.message || "Failed to delete account");
      throw error;
    }
  };

  const loadAvalancheInfo = async () => {
    setLoadingAvalancheInfo(true);
    try {
      // Load subnets
      const subnetsResult = await accountApi.listAvalancheSubnets();
      setAvalancheSubnets(subnetsResult.subnets || []);

      // Load network status
      try {
        const networkResult = await accountApi.getAvalancheNetworkStatus();
        setNetworkStatus(networkResult);
      } catch (error) {
        console.error("Failed to load network status:", error);
      }

      // Load keys
      try {
        const keysResult = await accountApi.listAvalancheKeys();
        setAvalancheKeys(keysResult.keys || []);
      } catch (error) {
        console.error("Failed to load keys:", error);
      }
    } catch (error: any) {
      console.error("Failed to load Avalanche info:", error);
    } finally {
      setLoadingAvalancheInfo(false);
    }
  };

  const loadSubnetDetails = async (subnetName: string) => {
    try {
      const result = await accountApi.describeAvalancheSubnet(subnetName);
      return result;
    } catch (error: any) {
      toast.error(error.message || "Failed to load subnet details");
      throw error;
    }
  };

  const loadTransfers = () => {
    if (!address) return;
    const stored = localStorage.getItem(`transfers_${address}`);
    if (stored) {
      try {
        const transferData = JSON.parse(stored);
        setTransfers(transferData.map((t: any) => ({
          ...t,
          timestamp: new Date(t.timestamp)
        })));
      } catch (e) {
        console.error("Failed to load transfers:", e);
      }
    }
  };

  const loadCSNBalance = async () => {
    if (!address) {
      setCsnBalance(null);
      return;
    }
    try {
      // Try using Avalanche SDK ChainKit first (better indexed data)
      try {
        const { getEnhancedBalances } = await import("@/lib/avalanche-sdk");
        const balances = await getEnhancedBalances(address);
        const csnToken = balances.tokens.find(
          (token) => token.address.toLowerCase() === CONTRACT_ADDRESSES.csnToken?.toLowerCase()
        );
        if (csnToken && csnToken.formatted) {
          setCsnBalance(csnToken.formatted);
          return;
        }
      } catch (sdkError) {
        console.debug("ChainKit not available, falling back to direct contract call:", sdkError);
      }
      
      // Fallback to direct contract call
      const { getERC20Contract, CONTRACT_ADDRESSES } = await import("@/lib/contracts");
      if (!CONTRACT_ADDRESSES.csnToken || CONTRACT_ADDRESSES.csnToken.trim() === "") {
        console.debug("CSN token contract address not available");
        setCsnBalance(null);
        return;
      }
      try {
        const csnContract = getERC20Contract(CONTRACT_ADDRESSES.csnToken);
      const balance = await csnContract.balanceOf(address);
      const decimals = await csnContract.decimals();
      const formatted = ethers.formatUnits(balance, decimals);
      setCsnBalance(formatted);
      console.debug("CSN balance loaded:", formatted);
      } catch (contractError: any) {
        console.debug("Failed to fetch CSN balance from contract:", contractError.message);
        // Don't throw - just leave balance as null
      }
    } catch (error: any) {
      console.error("Failed to load CSN balance:", error);
      // Don't set to null on error - keep previous value if available
      // setCsnBalance(null);
    }
  };

  // Universal Wallet Functions
  const STORAGE_KEY = "octavia_universal_wallets";
  
  // Simple encryption using a passphrase derived from the connected wallet address
  const getEncryptionKey = (): string => {
    if (!address) throw new Error("Wallet not connected");
    // Use address as part of encryption key (in production, use proper key derivation)
    return `octavia_${address.toLowerCase()}`;
  };
  
  // Simple encryption (XOR cipher - for production, use proper encryption)
  const encryptPrivateKey = (privateKey: string): string => {
    const key = getEncryptionKey();
    const keyBytes = new TextEncoder().encode(key);
    const dataBytes = new TextEncoder().encode(privateKey);
    const encrypted = new Uint8Array(dataBytes.length);
    for (let i = 0; i < dataBytes.length; i++) {
      encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return btoa(String.fromCharCode(...encrypted));
  };
  
  const decryptPrivateKey = (encrypted: string): string => {
    const key = getEncryptionKey();
    const keyBytes = new TextEncoder().encode(key);
    const encryptedBytes = new Uint8Array(
      atob(encrypted)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
    const decrypted = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  };
  
  const loadUniversalWallets = () => {
    if (!address) {
      setUniversalWallets([]);
      return;
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setUniversalWallets([]);
        return;
      }
      
      const allWallets: UniversalWallet[] = JSON.parse(stored);
      // Filter wallets for current user (in production, use proper user identification)
      setUniversalWallets(allWallets);
    } catch (error) {
      console.error("Failed to load universal wallets:", error);
      setUniversalWallets([]);
    }
  };
  
  const saveUniversalWallets = (wallets: UniversalWallet[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets));
      setUniversalWallets(wallets);
    } catch (error) {
      console.error("Failed to save universal wallets:", error);
      throw error;
    }
  };
  
  const createUniversalWallet = async (accountId: string | null, name: string): Promise<UniversalWallet> => {
    if (!address) {
      throw new Error("Wallet not connected");
    }
    
    try {
      // Generate new wallet
      const wallet = ethers.Wallet.createRandom();
      const walletAddress = await wallet.getAddress();
      const privateKey = wallet.privateKey;
      
      // Encrypt private key
      const encryptedPrivateKey = encryptPrivateKey(privateKey);
      
      // Create wallet object
      const newWallet: UniversalWallet = {
        id: `wallet_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        address: walletAddress,
        accountId,
        name: name || `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
        createdAt: Date.now(),
        encryptedPrivateKey,
      };
      
      // Save to storage
      const currentWallets = [...universalWallets, newWallet];
      saveUniversalWallets(currentWallets);
      
      toast.success(`Universal wallet created: ${newWallet.name}`);
      return newWallet;
    } catch (error: any) {
      console.error("Failed to create universal wallet:", error);
      toast.error(error.message || "Failed to create wallet");
      throw error;
    }
  };
  
  const deleteUniversalWallet = async (walletId: string) => {
    try {
      const updatedWallets = universalWallets.filter((w) => w.id !== walletId);
      saveUniversalWallets(updatedWallets);
      toast.success("Wallet deleted");
    } catch (error: any) {
      console.error("Failed to delete universal wallet:", error);
      toast.error(error.message || "Failed to delete wallet");
      throw error;
    }
  };
  
  const getWalletPrivateKey = async (walletId: string): Promise<string | null> => {
    try {
      const wallet = universalWallets.find((w) => w.id === walletId);
      if (!wallet) return null;
      
      return decryptPrivateKey(wallet.encryptedPrivateKey);
    } catch (error) {
      console.error("Failed to decrypt wallet private key:", error);
      return null;
    }
  };
  
  const getWalletSigner = async (walletId: string): Promise<ethers.Wallet | null> => {
    try {
      const privateKey = await getWalletPrivateKey(walletId);
      if (!privateKey) return null;
      
      const provider = await import("@/lib/wallet").then((m) => m.getRpcProvider());
      if (!provider) return null;
      
      return new ethers.Wallet(privateKey, provider);
    } catch (error) {
      console.error("Failed to get wallet signer:", error);
      return null;
    }
  };

  // Auto-load on mount and when address changes
  useEffect(() => {
    if (address && isConnected) {
      loadAvalancheInfo().then(() => {
        // Load accounts after Avalanche keys are loaded so we can check all key addresses
      loadAccounts();
      });
      loadClusters();
      loadTransfers();
      loadCSNBalance();
      loadUniversalWallets();
    } else {
      setUniversalWallets([]);
    }
  }, [address, isConnected]);

  return (
    <AccountManagementContext.Provider
      value={{
        accounts,
        clusters,
        loadingAccounts,
        loadAccounts,
        loadClusters,
        createAccount,
        updateAccount,
        deleteAccount,
        universalWallets,
        createUniversalWallet,
        deleteUniversalWallet,
        getWalletPrivateKey,
        getWalletSigner,
        loadUniversalWallets,
        avalancheSubnets,
        networkStatus,
        avalancheKeys,
        loadingAvalancheInfo,
        loadAvalancheInfo,
        loadSubnetDetails,
        selectedAccount,
        setSelectedAccount,
        mainFundedAccount: MAIN_FUNDED_ACCOUNT,
        isMainFundedAccount,
        transfers,
        loadTransfers,
        csnBalance,
        loadCSNBalance,
      }}
    >
      {children}
    </AccountManagementContext.Provider>
  );
}

/**
 * Hook to access the AccountManagement context
 * Must be used within an AccountManagementProvider
 */
export function useAccountManagement() {
  const context = useContext(AccountManagementContext);
  if (context === undefined) {
    throw new Error("useAccountManagement must be used within AccountManagementProvider");
  }
  return context;
}

