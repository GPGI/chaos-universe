import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { animate, stagger } from "animejs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  Send, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  History,
  Coins,
  ExternalLink,
  Users,
  FolderTree,
  Plus,
  Edit,
  Trash2,
  KeyRound,
  Network,
  RefreshCw,
  Info,
  X,
  Building2,
  Settings,
  ArrowRight,
  TrendingUp,
  Activity,
  Zap,
  Shield,
  Sparkles,
  ArrowUpDown,
  TrendingDown,
  BarChart3,
  Layers,
  Target
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useWallet } from "@/contexts/WalletContext";
import { useAccountManagement } from "@/contexts/AccountManagementContext";
import { useLandPlots } from "@/hooks/useLandPlots";
import { ethers } from "ethers";
import { toast } from "sonner";
import { getRpcProvider } from "@/lib/wallet";
import * as accountApi from "@/lib/api";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import { AvalancheKeySelector } from "@/components/AvalancheKeySelector";
import { TransactionHistory } from "@/components/TransactionHistory";
import { AddressAnalytics } from "@/components/AddressAnalytics";
import { NetworkHealth } from "@/components/NetworkHealth";
import { TokenMetadata } from "@/components/TokenMetadata";
import { CustomSubnetInfo } from "@/components/CustomSubnetInfo";
import { AllWalletsBalance } from "@/components/AllWalletsBalance";

interface Transfer {
  hash: string;
  to: string;
  amount: string;
  timestamp: Date;
  status: "pending" | "success" | "failed";
}

export default function ChaosVault() {
  const { address, signer, isConnected, balance, refreshBalance } = useWallet();
  const {
    accounts,
    clusters,
    loadingAccounts,
    loadAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    universalWallets,
    createUniversalWallet,
    deleteUniversalWallet,
    loadUniversalWallets,
    avalancheSubnets,
    networkStatus,
    avalancheKeys,
    loadingAvalancheInfo,
    loadAvalancheInfo,
    loadSubnetDetails,
    selectedAccount,
    setSelectedAccount,
    mainFundedAccount,
    isMainFundedAccount,
    transfers,
    loadTransfers,
  } = useAccountManagement();
  const { userPlots, pendingPlots, refresh: refreshPlots, loading: plotsLoading } = useLandPlots();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [gasPrice, setGasPrice] = useState<string>("");
  const [gasLimit, setGasLimit] = useState<string>("21000");
  const [fromWalletType, setFromWalletType] = useState<"connected" | "account" | "key" | "universal">("connected");
  const [fromWalletId, setFromWalletId] = useState<string>("");
  const [fromWalletAddress, setFromWalletAddress] = useState<string>("");
  const [fromWalletBalance, setFromWalletBalance] = useState<string>("0");
  const [toWalletType, setToWalletType] = useState<"address" | "account" | "key">("address");
  const [toWalletId, setToWalletId] = useState<string>("");
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<accountApi.Account | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<accountApi.Account | null>(null);
  const [accountForm, setAccountForm] = useState({
    name: "",
    wallet_address: "",
    type: "personal" as "personal" | "cluster" | "joint" | "business" | "sub",
    parent_id: "",
    description: "",
    wallet_key_name: "" as string | undefined,
  });
  const [walletAssignmentType, setWalletAssignmentType] = useState<"connected" | "avalanche-key" | "manual">("manual");
  const [selectedWalletKey, setSelectedWalletKey] = useState<string>("");
  const [selectedSubnet, setSelectedSubnet] = useState<string | null>(null);
  const [subnetDetails, setSubnetDetails] = useState<any>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  const loadGasPrice = useCallback(async () => {
    try {
      const provider = getRpcProvider();
      if (!provider) return;
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) {
        setGasPrice(ethers.formatUnits(feeData.gasPrice, "gwei"));
      }
    } catch (error) {
      console.error("Failed to load gas price:", error);
    }
  }, []);

  // Load recent transfers
  useEffect(() => {
    if (transfers.length > 0) {
      setRecentTransfers(transfers as Transfer[]);
    } else {
      loadTransfers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers.length]);

  // Load gas price on mount
  useEffect(() => {
    if (isConnected) {
      loadGasPrice();
    }
  }, [isConnected, loadGasPrice]);

  // Load balance for selected from wallet
  useEffect(() => {
    const loadFromWalletBalance = async () => {
      if (!fromWalletAddress) {
        setFromWalletBalance("0");
        return;
      }
      try {
        const rpc = getRpcProvider();
        if (!rpc) return;
        const bal = await rpc.getBalance(fromWalletAddress);
        setFromWalletBalance(ethers.formatEther(bal));
      } catch (error) {
        console.error("Failed to load from wallet balance:", error);
        setFromWalletBalance("0");
      }
    };
    loadFromWalletBalance();
  }, [fromWalletAddress]);

  // Update from wallet address when selection changes
  useEffect(() => {
    if (fromWalletType === "connected") {
      setFromWalletAddress(address || "");
      setFromWalletId("");
    } else if (fromWalletType === "account" && fromWalletId) {
      const account = accounts.find(a => a.id === fromWalletId);
      if (account) {
        setFromWalletAddress(account.wallet_address);
      }
    } else if (fromWalletType === "key" && fromWalletId) {
      const key = avalancheKeys.find(k => k.name === fromWalletId);
      if (key?.address) {
        setFromWalletAddress(key.address);
      }
    }
  }, [fromWalletType, fromWalletId, address, accounts, avalancheKeys]);

  // Update recipient address when to wallet selection changes
  useEffect(() => {
    if (toWalletType === "address") {
      // Keep manual input
    } else if (toWalletType === "account" && toWalletId) {
      const account = accounts.find(a => a.id === toWalletId);
      if (account) {
        setRecipientAddress(account.wallet_address);
      }
    } else if (toWalletType === "key" && toWalletId) {
      const key = avalancheKeys.find(k => k.name === toWalletId);
      if (key?.address) {
        setRecipientAddress(key.address);
      }
    }
  }, [toWalletType, toWalletId, accounts, avalancheKeys]);

  // Calculate derived values
  const displayBalance = parseFloat(balance);
  const totalAccounts = accounts.length;
  const totalKeys = avalancheKeys.length;

  // Load accounts when address changes or accounts tab is opened
  useEffect(() => {
    if (address && (activeQuickAction === "accounts" || accounts.length === 0)) {
      loadAccounts().catch(console.error);
      loadUniversalWallets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuickAction, address]);

  // Animate cards on mount
  useEffect(() => {
    // Wait for DOM to be ready
    const timer = setTimeout(() => {
      try {
        const cards = document.querySelectorAll(".anime-card");
        if (cards.length > 0) {
          animate(".anime-card", {
            opacity: [0, 1],
            translateY: [30, 0],
            delay: stagger(100),
            duration: 600,
            ease: "outExpo",
          });
      }
    } catch (error) {
        console.warn("Animation error:", error);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Animate numbers
  useEffect(() => {
    const numberElements = document.querySelectorAll(".anime-number");
    numberElements.forEach((el, index) => {
      const targetValue = parseFloat(el.getAttribute("data-value") || "0");
      const startValue = 0;
      let currentValue = startValue;
      const duration = 2000;
      const delay = 200 + index * 50;
      const startTime = Date.now() + delay;
      
      const animateNumber = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        if (elapsed < 0) {
          requestAnimationFrame(animateNumber);
          return;
        }
        
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutExpo approximation
        currentValue = startValue + (targetValue - startValue) * easeProgress;
        
        if (el instanceof HTMLElement) {
          const decimals = targetValue % 1 === 0 ? 0 : 2;
          el.textContent = currentValue.toFixed(decimals);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateNumber);
        } else {
          if (el instanceof HTMLElement) {
            const decimals = targetValue % 1 === 0 ? 0 : 2;
            el.textContent = targetValue.toFixed(decimals);
          }
        }
      };
      
      requestAnimationFrame(animateNumber);
    });
  }, [displayBalance, totalAccounts, totalKeys, recentTransfers.length]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const validateAddress = (addr: string): boolean => {
    try {
      return ethers.isAddress(addr);
    } catch {
      return false;
    }
  };

  const handleTransfer = async () => {
    if (!validateAddress(recipientAddress)) {
      toast.error("Invalid recipient address");
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const availableBalance = parseFloat(fromWalletBalance);
    if (amount > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!fromWalletAddress) {
      toast.error("Please select a source wallet");
      return;
    }

    setTransferring(true);
    try {
      let transferSigner: ethers.Signer;
      let transferAddress: string;

      // Get signer based on from wallet type - ALWAYS use Chaos Star Network RPC
      const chaosStarRpc = getRpcProvider();
      if (!chaosStarRpc) {
        toast.error("Chaos Star Network RPC not available");
        setTransferring(false);
        return;
      }

      if (fromWalletType === "connected") {
        // MetaMask signers cannot be reconnected to use Chaos Star Network RPC
        // They are tied to MetaMask's connected network (usually Avalanche C-Chain)
        // Solution: Guide user to use Avalanche Key instead
        toast.error("Connected wallets (MetaMask) send transactions through their connected network. To send on Chaos Star Network, please use an Avalanche Key instead.", {
          duration: 8000,
        });
        setTransferring(false);
        return;
      }
      
      // Legacy code below - kept for reference but should not be reached
      if (false && fromWalletType === "connected") {
        if (!signer || !address) {
          toast.error("Wallet not connected");
          setTransferring(false);
          return;
        }
        // For connected wallets (MetaMask), we need to sign with MetaMask but send through Chaos Star Network
        // Since JsonRpcSigner cannot be reconnected, we'll sign the transaction and broadcast it manually
        try {
          const chaosStarProvider = chaosStarRpc;
          const amountWei = ethers.parseEther(transferAmount);
          
          // Get network info and transaction parameters from Chaos Star Network
          const network = await chaosStarProvider.getNetwork();
          const nonce = await chaosStarProvider.getTransactionCount(address);
          
          // Get gas price from Chaos Star Network
          const feeData = await chaosStarProvider.getFeeData();
          const gasPriceToUse = gasPrice 
            ? ethers.parseUnits(gasPrice, "gwei") 
            : (feeData.gasPrice || ethers.parseUnits("25", "gwei"));
          
          // Estimate gas using Chaos Star Network provider
          let estimatedGas = BigInt(21000);
          try {
            estimatedGas = await chaosStarProvider.estimateGas({
              to: recipientAddress,
              value: amountWei,
              from: address,
            });
          } catch (error) {
            console.warn("Gas estimation failed, using default:", error);
          }
          
          // Create transaction request for Chaos Star Network
          const txRequest: ethers.TransactionRequest = {
            to: recipientAddress,
            value: amountWei,
            gasLimit: estimatedGas,
            gasPrice: gasPriceToUse,
            nonce: nonce,
            chainId: network.chainId,
          };
          
          // Create a custom signer that wraps MetaMask but uses Chaos Star Network provider
          class ChaosStarSigner extends ethers.AbstractSigner {
            private _address: string;
            private _provider: ethers.Provider;
            private _originalSigner: ethers.Signer;
            
            constructor(address: string, provider: ethers.Provider, originalSigner: ethers.Signer) {
              super();
              this._address = address;
              this._provider = provider;
              this._originalSigner = originalSigner;
            }
            
            async getAddress(): Promise<string> {
              return this._address;
            }
            
            async signTransaction(tx: ethers.TransactionRequest): Promise<string> {
              // MetaMask JsonRpcSigner doesn't expose signTransaction directly
              // We need to use a workaround: populate the transaction and have MetaMask sign it
              // by calling sendTransaction on the original signer, but we'll intercept it
              throw new Error("Direct signTransaction not supported. Using sendTransaction workaround.");
            }
            
            async signMessage(message: string | Uint8Array): Promise<string> {
              return await this._originalSigner.signMessage(message);
            }
            
            connect(provider: ethers.Provider | null): ethers.Signer {
              return new ChaosStarSigner(this._address, provider || this._provider, this._originalSigner);
            }
            
            get provider(): ethers.Provider | null {
              return this._provider;
            }
            
            async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.ContractTransactionResponse> {
              // Populate transaction with Chaos Star Network provider
              const populatedTx = await this.populateTransaction(tx);
              
              // For MetaMask, we need to use the original signer's sendTransaction
              // but we can't change its provider. Instead, we'll:
              // 1. Use the original signer to send (MetaMask will use its own provider)
              // 2. Then manually broadcast through Chaos Star Network
              // 
              // However, this won't work because MetaMask will send through its provider.
              // The solution is to use signTransaction if available, or guide user to use Avalanche Key
              
              // Check if we can get the raw transaction from MetaMask
              // MetaMask's JsonRpcSigner doesn't expose signTransaction, so we need a workaround
              
              // Try to use the original signer's sendTransaction but catch the transaction
              // and rebroadcast through our provider
              try {
                // Create a transaction that MetaMask can sign
                // We'll use the original signer but with our transaction parameters
                const txResponse = await this._originalSigner.sendTransaction(populatedTx);
                
                // The problem: this will send through MetaMask's provider, not ours
                // We need to intercept and rebroadcast, but we can't do that easily
                
                // Better approach: Guide user to use Avalanche Key or add network to MetaMask
                throw new Error("MetaMask sends transactions through its connected network. To send on Chaos Star Network, please use an Avalanche Key instead, or add Chaos Star Network to MetaMask as a custom network.");
              } catch (error: any) {
                if (error.message.includes("Chaos Star Network")) {
                  throw error;
                }
                // If sendTransaction fails for other reasons, try alternative
                throw new Error("Cannot send transaction through Chaos Star Network with MetaMask. Please use an Avalanche Key for transfers on Chaos Star Network.");
              }
            }
          }
          
          // Create custom signer that uses Chaos Star Network provider
          const chaosStarSigner = new ChaosStarSigner(address, chaosStarProvider, signer);
          
          // Send transaction through Chaos Star Network
          const txResponse = await chaosStarSigner.sendTransaction(txRequest);
          
          const pendingTransfer: Transfer = {
            hash: "pending",
            to: recipientAddress,
            amount: transferAmount,
            timestamp: new Date(),
            status: "pending",
          };
          setRecentTransfers(prev => [pendingTransfer, ...prev]);
          
          setRecentTransfers(prev => prev.map(t => 
            t.hash === "pending" 
              ? { ...t, hash: txResponse.hash, status: "pending" }
              : t
          ));
          
          toast.success(`Transaction sent! Hash: ${txResponse.hash.slice(0, 10)}...`);
          
          const receipt = await txResponse.wait();
          const success = receipt.status === 1;
          setRecentTransfers(prev => prev.map(t => 
            t.hash === txResponse.hash 
              ? { ...t, status: success ? "success" : "failed" }
              : t
          ));
          
          if (address) {
            const transfersToSave = [
              {
                hash: txResponse.hash,
                to: recipientAddress,
                amount: transferAmount,
                timestamp: new Date().toISOString(),
                status: success ? "success" : "failed",
              },
              ...recentTransfers.filter(t => t.hash !== "pending" && t.hash !== txResponse.hash),
            ].slice(0, 20);
            
            localStorage.setItem(`transfers_${address}`, JSON.stringify(transfersToSave));
          }
          
          if (success) {
            toast.success("Transaction confirmed!");
            refreshBalance();
            setTransferAmount("");
            setRecipientAddress("");
          } else {
            toast.error("Transaction failed");
          }
          
          setTransferring(false);
          return; // Early return since we've already handled the transaction
        } catch (error: any) {
          console.error("Failed to send transaction through Chaos Star Network:", error);
          toast.error(error.message || "Failed to send transaction. Please ensure MetaMask is connected and try again.");
          setTransferring(false);
          return;
        }
      } else if (fromWalletType === "universal" && fromWalletId) {
        // Get private key for universal wallet
        const { getWalletSigner } = await import("@/contexts/AccountManagementContext");
        const context = useAccountManagement();
        const walletSigner = await context.getWalletSigner(fromWalletId);
        if (!walletSigner) {
          toast.error("Failed to get signer for universal wallet");
          setTransferring(false);
          return;
        }
        transferSigner = walletSigner;
        transferAddress = fromWalletAddress;
      } else if (fromWalletType === "key" && fromWalletId) {
        // Get private key for Avalanche CLI key
        const keyResult = await accountApi.getKeyPrivateKey(fromWalletId);
        if (!keyResult.success || !keyResult.private_key) {
          toast.error("Failed to get private key for selected wallet");
          setTransferring(false);
          return;
        }
        const privateKey = keyResult.private_key.startsWith("0x") 
          ? keyResult.private_key 
          : `0x${keyResult.private_key}`;
        // Create wallet connected to Chaos Star Network RPC
        const wallet = new ethers.Wallet(privateKey, chaosStarRpc);
        transferSigner = wallet;
        transferAddress = fromWalletAddress;
      } else if (fromWalletType === "account" && fromWalletId) {
        // For account-based transfers, we need the private key
        toast.error("Account-based transfers require private key access. Use Avalanche Key instead.");
        setTransferring(false);
        return;
      } else {
        toast.error("Please select a source wallet");
        setTransferring(false);
        return;
      }

      const amountWei = ethers.parseEther(transferAmount);
      const gasPriceToUse = gasPrice ? ethers.parseUnits(gasPrice, "gwei") : undefined;
      const nonce = await transferSigner.provider.getTransactionCount(transferAddress);

      let estimatedGas = BigInt(21000);
      try {
        estimatedGas = await transferSigner.provider.estimateGas({
          to: recipientAddress,
          value: amountWei,
          from: transferAddress,
        });
      } catch (error) {
        console.warn("Gas estimation failed, using default:", error);
      }

      const tx = {
        to: recipientAddress,
        value: amountWei,
        gasLimit: estimatedGas,
        gasPrice: gasPriceToUse,
        nonce: nonce,
      };

      const pendingTransfer: Transfer = {
        hash: "pending",
        to: recipientAddress,
        amount: transferAmount,
        timestamp: new Date(),
        status: "pending",
      };
      setRecentTransfers(prev => [pendingTransfer, ...prev]);

      const txResponse = await transferSigner.sendTransaction(tx);
      
      setRecentTransfers(prev => prev.map(t => 
        t.hash === "pending" 
          ? { ...t, hash: txResponse.hash, status: "pending" }
          : t
      ));

      toast.success(`Transaction sent! Hash: ${txResponse.hash.slice(0, 10)}...`);

      const receipt = await txResponse.wait();
      const success = receipt.status === 1;
      setRecentTransfers(prev => prev.map(t => 
        t.hash === txResponse.hash 
          ? { ...t, status: success ? "success" : "failed" }
          : t
      ));

      if (transferAddress) {
        const transfersToSave = [
          {
            hash: txResponse.hash,
            to: recipientAddress,
            amount: transferAmount,
            timestamp: new Date().toISOString(),
            status: success ? "success" : "failed",
          },
          ...recentTransfers.filter(t => t.hash !== "pending" && t.hash !== txResponse.hash),
        ].slice(0, 20);
        
        localStorage.setItem(`transfers_${transferAddress}`, JSON.stringify(transfersToSave));
        loadTransfers();
      }

      if (success) {
        toast.success("Transfer completed successfully!");
        setRecipientAddress("");
        setTransferAmount("");
        // Refresh balance for the from wallet
        const rpc = getRpcProvider();
        if (rpc && fromWalletAddress) {
          const bal = await rpc.getBalance(fromWalletAddress);
          setFromWalletBalance(ethers.formatEther(bal));
        }
        if (fromWalletType === "connected") {
        refreshBalance();
        }
      } else {
        toast.error("Transaction failed");
      }

    } catch (error: any) {
      console.error("Transfer error:", error);
      setRecentTransfers(prev => prev.filter(t => t.hash !== "pending"));
      
      if (error.code === 4001 || error.message?.includes("user rejected")) {
        toast.error("Transaction cancelled by user");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for transaction");
      } else {
        toast.error(error.message || "Transfer failed");
      }
    } finally {
      setTransferring(false);
    }
  };

  const getExplorerUrl = (txHash: string) => {
    const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC || "";
    if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) {
      return null;
    }
    return `https://snowtrace.io/tx/${txHash}`;
  };

  const handleSubnetDetails = async (subnetName: string) => {
    try {
      const details = await loadSubnetDetails(subnetName);
      setSubnetDetails(details);
      setSelectedSubnet(subnetName);
    } catch (error) {
      // Error already handled in context
    }
  };

  const openAccountDialog = (account?: accountApi.Account) => {
    if (account) {
      setEditingAccount(account);
      setAccountForm({
        name: account.name,
        wallet_address: account.wallet_address,
        type: account.type as any,
        parent_id: account.parent_id || "",
        description: account.description || "",
        wallet_key_name: (account as any).wallet_key_name || "",
      });
      // Determine wallet assignment type based on existing wallet address or wallet_key_name
      const hasWalletKey = (account as any).wallet_key_name;
      const isAvalancheKey = hasWalletKey || avalancheKeys.some(k => k.evm_address?.toLowerCase() === account.wallet_address.toLowerCase());
      const isConnectedWallet = address?.toLowerCase() === account.wallet_address.toLowerCase();
      if (isConnectedWallet && !hasWalletKey) {
        setWalletAssignmentType("connected");
      } else if (isAvalancheKey || hasWalletKey) {
        setWalletAssignmentType("avalanche-key");
        const matchingKey = hasWalletKey 
          ? avalancheKeys.find(k => k.name === (account as any).wallet_key_name)
          : avalancheKeys.find(k => k.evm_address?.toLowerCase() === account.wallet_address.toLowerCase());
        setSelectedWalletKey(matchingKey?.name || (account as any).wallet_key_name || "");
      } else {
        setWalletAssignmentType("manual");
      }
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: "",
        wallet_address: "",
        type: "personal",
        parent_id: "",
        description: "",
        wallet_key_name: "",
      });
      setWalletAssignmentType(isConnected ? "connected" : "manual");
      setSelectedWalletKey("");
      // Auto-fill connected wallet if available
      if (isConnected && address) {
        setAccountForm(prev => ({ ...prev, wallet_address: address }));
      }
    }
    setShowAccountDialog(true);
  };

  const handleAccountSubmit = async () => {
    try {
      // Validate wallet address before submission
      if (!editingAccount) {
        if (!accountForm.wallet_address || accountForm.wallet_address.trim() === "") {
          toast.error("Wallet address is required");
          return;
        }
        
        // Validate address format
        if (!ethers.isAddress(accountForm.wallet_address)) {
          toast.error("Invalid wallet address format");
          return;
        }
      }
      
      if (editingAccount) {
        await updateAccount(editingAccount.id, accountForm);
        toast.success("Account updated");
      } else {
        // Ensure contract address is loaded before creating account
        try {
          const { loadContractAddresses } = await import("@/lib/contracts");
          await loadContractAddresses();
        } catch (loadError) {
          console.debug("Failed to preload contract addresses:", loadError);
        }
        await createAccount(accountForm);
        toast.success("Account created");
      }
      setShowAccountDialog(false);
      setAccountForm({
        name: "",
        wallet_address: "",
        type: "personal",
        parent_id: "",
        description: "",
        wallet_key_name: "",
      });
      setEditingAccount(null);
      setWalletAssignmentType("manual");
      setSelectedWalletKey("");
      // Refresh accounts list to show the newly created account
      // Ensure accounts section is visible first
      setActiveQuickAction("accounts");
      // Add a small delay to ensure backend has processed the creation, then reload
      setTimeout(async () => {
        try {
          await loadAccounts();
        } catch (error) {
          console.error("Failed to reload accounts after creation:", error);
        }
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to save account");
    }
  };

  const handleDeleteAccount = (account: accountApi.Account) => {
    setAccountToDelete(account);
    setShowDeleteDialog(true);
  };

  const confirmDeleteAccount = async () => {
    if (!accountToDelete) return;
    
    try {
      await deleteAccount(accountToDelete.id);
      // Refresh accounts list after deletion
      await loadAccounts();
      toast.success(`Account "${accountToDelete.name}" deleted successfully`);
      setShowDeleteDialog(false);
      setAccountToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="glass-enhanced border-primary/30 p-12 text-center backdrop-blur-xl">
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary/20 blur-3xl animate-pulse" />
              </div>
              <Wallet className="h-20 w-20 mx-auto relative z-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 gradient-text">Wallet Not Connected</h1>
            <p className="text-muted-foreground mb-8 text-lg">
              Connect your wallet to unlock the full power of Chaos Vault
            </p>
            <Button 
              variant="cosmic" 
              size="lg"
              onClick={() => window.location.reload()} 
              className="gap-2 shadow-glow-primary hover:scale-105 transition-all"
            >
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Modern Header with Stats */}
        <div className="mb-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
                  <Wallet className="h-12 w-12 text-primary relative z-10" />
                </div>
          <div>
                  <h1 className="text-4xl font-bold gradient-text">Chaos Vault</h1>
                  <p className="text-muted-foreground">Unified Management Dashboard</p>
          </div>
              </div>
              {isMainFundedAccount && (
                <Badge variant="default" className="gap-2 pulse-glow">
                  <Sparkles className="h-3 w-3" />
                  Main Funded Account Active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-base px-4 py-2 border-primary/50">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Connected
          </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={refreshBalance}
                className="hover:bg-primary/20 hover:scale-110 transition-all"
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
        </div>

          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="anime-card glass-enhanced border-primary/20 hover:border-primary/40 transition-all hover:scale-105 card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
                    <p className="text-2xl font-bold gradient-text">
                      {displayBalance.toLocaleString('en-US', { 
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2 
                      })} CSN
                    </p>
              </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Coins className="h-6 w-6 text-primary" />
            </div>
              </div>
              </CardContent>
            </Card>

            <Card className="glass-enhanced border-primary/20 hover:border-primary/40 transition-all hover:scale-105 card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Accounts</p>
                    <p className="text-2xl font-bold">{totalAccounts}</p>
            </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
          </CardContent>
        </Card>

            <Card className="glass-enhanced border-primary/20 hover:border-primary/40 transition-all hover:scale-105 card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Avalanche Keys</p>
                    <p className="text-2xl font-bold">{totalKeys}</p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500/10">
                    <KeyRound className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-enhanced border-primary/20 hover:border-primary/40 transition-all hover:scale-105 card-hover">
              <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
                    <p className="text-sm text-muted-foreground mb-1">Transactions</p>
                    <p className="text-2xl font-bold">{recentTransfers.length}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Activity className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

          {/* Main Tabs: Wallet Management, DEX/AMM, Speculative Market, Synthetic Assets */}
        <Tabs defaultValue="wallet" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 glass-enhanced">
            <TabsTrigger value="wallet" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white">
              <Wallet className="h-4 w-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="dex" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              DEX & AMM
            </TabsTrigger>
            <TabsTrigger value="speculative" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4 mr-2" />
              Speculative Market
            </TabsTrigger>
            <TabsTrigger value="synthetic" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white">
              <Layers className="h-4 w-4 mr-2" />
              Synthetic Assets
            </TabsTrigger>
          </TabsList>

          {/* Wallet Management Tab */}
          <TabsContent value="wallet" className="space-y-6">
          {/* Quick Actions Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4 gradient-text">Quick Actions</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {/* Send Funds */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-primary/40 hover:border-primary/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "transfer" ? null : "transfer")}
                  title="Send Funds"
                >
                  <Send className="h-6 w-6 text-primary" />
                  {activeQuickAction === "transfer" && (
                    <div className="absolute inset-0 octagon-pulse bg-primary/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Send Funds</span>
              </div>

              {/* Wallet Info */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-purple-500/40 hover:border-purple-500/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "wallet" ? null : "wallet")}
                  title="Wallet Info"
                >
                  <Wallet className="h-6 w-6 text-purple-400" />
                  {activeQuickAction === "wallet" && (
                    <div className="absolute inset-0 octagon-pulse bg-purple-500/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Wallet Info</span>
              </div>

              {/* View Accounts */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-green-500/40 hover:border-green-500/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "accounts" ? null : "accounts")}
                  title="Accounts"
                >
                  <Users className="h-6 w-6 text-green-400" />
                  {activeQuickAction === "accounts" && (
                    <div className="absolute inset-0 octagon-pulse bg-green-500/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Accounts</span>
              </div>

              {/* Avalanche Keys */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-yellow-500/40 hover:border-yellow-500/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "keys" ? null : "keys")}
                  title="Avalanche Keys"
                >
                  <KeyRound className="h-6 w-6 text-yellow-400" />
                  {activeQuickAction === "keys" && (
                    <div className="absolute inset-0 octagon-pulse bg-yellow-500/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Avalanche Keys</span>
              </div>



              {/* Network Info */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-indigo-500/40 hover:border-indigo-500/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "network" ? null : "network")}
                  title="Network"
                >
                  <Network className="h-6 w-6 text-indigo-400" />
                  {activeQuickAction === "network" && (
                    <div className="absolute inset-0 octagon-pulse bg-indigo-500/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Network</span>
              </div>

              {/* Analytics */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-16 w-16 octagon glass-enhanced border-2 border-pink-500/40 hover:border-pink-500/60 hover:scale-110 transition-all relative group"
                  onClick={() => setActiveQuickAction(activeQuickAction === "analytics" ? null : "analytics")}
                  title="Analytics"
                >
                  <TrendingUp className="h-6 w-6 text-pink-400" />
                  {activeQuickAction === "analytics" && (
                    <div className="absolute inset-0 octagon-pulse bg-pink-500/20 animate-pulse" />
                  )}
                </Button>
                <span className="text-xs text-muted-foreground text-center">Analytics</span>
              </div>
            </div>
          </div>

          {/* Active Quick Action Content */}
          {activeQuickAction === "transfer" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Transfer CSN
                </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Send native CSN to any address</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* From Wallet Selection */}
                <div className="space-y-2">
                  <Label htmlFor="fromWallet">From Wallet</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={fromWalletType} onValueChange={(v) => {
                      setFromWalletType(v as any);
                      setFromWalletId("");
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="key">Avalanche Key (Recommended)</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="connected" disabled>Connected Wallet (Not supported for Chaos Star Network)</SelectItem>
                      </SelectContent>
                    </Select>
                    {fromWalletType === "account" && (
                      <Select value={fromWalletId} onValueChange={setFromWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.wallet_address.slice(0, 6)}...{acc.wallet_address.slice(-4)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {fromWalletType === "key" && (
                      <Select value={fromWalletId} onValueChange={setFromWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select key..." />
                        </SelectTrigger>
                        <SelectContent>
                          {avalancheKeys.map(key => (
                            <SelectItem key={key.name} value={key.name}>
                              {key.name} ({key.address?.slice(0, 6)}...{key.address?.slice(-4)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {fromWalletAddress && (
                    <div className="text-sm text-muted-foreground">
                      Address: {fromWalletAddress.slice(0, 10)}...{fromWalletAddress.slice(-8)}
                      <br />
                      Balance: {parseFloat(fromWalletBalance).toFixed(6)} CSN
                    </div>
                  )}
                </div>

                {/* To Wallet Selection */}
                <div className="space-y-2">
                  <Label htmlFor="toWallet">To Wallet</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={toWalletType} onValueChange={(v) => {
                      setToWalletType(v as any);
                      setToWalletId("");
                      if (v === "address") {
                        setRecipientAddress("");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="address">Manual Address</SelectItem>
                        <SelectItem value="account">Account</SelectItem>
                        <SelectItem value="key">Avalanche Key</SelectItem>
                      </SelectContent>
                    </Select>
                    {toWalletType === "account" && (
                      <Select value={toWalletId} onValueChange={setToWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.wallet_address.slice(0, 6)}...{acc.wallet_address.slice(-4)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {toWalletType === "key" && (
                      <Select value={toWalletId} onValueChange={setToWalletId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select key..." />
                        </SelectTrigger>
                        <SelectContent>
                          {avalancheKeys.map(key => (
                            <SelectItem key={key.name} value={key.name}>
                              {key.name} ({key.address?.slice(0, 6)}...{key.address?.slice(-4)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  {toWalletType === "address" && (
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="font-mono"
                  />
                  )}
                  {recipientAddress && !validateAddress(recipientAddress) && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Invalid address format
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (CSN)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="0.0"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Available: {parseFloat(fromWalletBalance).toFixed(6)} CSN</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const availableBalance = parseFloat(fromWalletBalance);
                        setTransferAmount((availableBalance * 0.95).toFixed(6));
                      }}
                    >
                      Max (95%)
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gasPrice">Gas Price (gwei)</Label>
                    <Input
                      id="gasPrice"
                      type="number"
                      value={gasPrice}
                      onChange={(e) => setGasPrice(e.target.value)}
                      placeholder="Auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gasLimit">Gas Limit</Label>
                    <Input
                      id="gasLimit"
                      type="number"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  variant="cosmic"
                  onClick={handleTransfer}
                  disabled={transferring || !validateAddress(recipientAddress) || !transferAmount}
                  className="w-full gap-2 hover:scale-105 transition-all"
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send CSN
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {activeQuickAction === "wallet" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Wallets & Balances
                </CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={refreshBalance}
                      className="gap-2 hover:bg-primary/20"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Connected to Chaos Star Network RPC
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connected Wallet Info */}
                {isConnected && address && (
                  <div className="space-y-4 p-4 glass-enhanced rounded-lg border border-primary/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Wallet className="h-5 w-5 text-primary" />
                      <Label className="text-sm font-semibold">Connected Wallet</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={address} 
                          readOnly 
                          className="font-mono glass-enhanced border-primary/30 text-sm" 
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={copyAddress}
                          className="hover:bg-primary/20 hover:scale-110 transition-all"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Balance</Label>
                      <div className="text-2xl font-bold gradient-text balance-update">
                        {displayBalance.toLocaleString('en-US', { 
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2 
                        })} CSN
                      </div>
                      <p className="text-xs text-muted-foreground">Native CSN on Chaos Star Network</p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-primary/20">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Owned Plots</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={refreshPlots}
                          disabled={plotsLoading}
                          className="h-6 px-2 text-xs"
                        >
                          {plotsLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {plotsLoading ? (
                        <div className="text-sm text-muted-foreground">Loading plots...</div>
                      ) : (userPlots && userPlots.length > 0) || (pendingPlots && pendingPlots.length > 0) ? (
                        <div className="space-y-3">
                          {userPlots && userPlots.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-lg font-bold text-primary">
                                {userPlots.length} Active {userPlots.length === 1 ? 'Plot' : 'Plots'}
                              </div>
                              <ScrollArea className="h-[100px]">
                                <div className="flex flex-wrap gap-2">
                                  {userPlots.slice(0, 15).map((plotId) => (
                                    <Badge 
                                      key={plotId} 
                                      variant="outline" 
                                      className="font-mono text-xs cursor-pointer hover:bg-primary/20"
                                      onClick={() => {
                                        window.open(`/plot-purchase?plotId=${plotId}`, '_blank');
                                      }}
                                    >
                                      Plot #{plotId}
                                    </Badge>
                                  ))}
                                  {userPlots.length > 15 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{userPlots.length - 15} more
                                    </Badge>
                                  )}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                          {pendingPlots && pendingPlots.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-primary/20">
                              <div className="text-lg font-bold text-yellow-500">
                                {pendingPlots.length} Pending {pendingPlots.length === 1 ? 'Plot' : 'Plots'}
                              </div>
                              <ScrollArea className="h-[100px]">
                                <div className="flex flex-wrap gap-2">
                                  {pendingPlots.slice(0, 15).map((plotId) => (
                                    <Badge 
                                      key={plotId} 
                                      variant="outline" 
                                      className="font-mono text-xs cursor-pointer hover:bg-yellow-500/20 border-yellow-500/50"
                                      onClick={() => {
                                        window.open(`/plot-purchase?plotId=${plotId}`, '_blank');
                                      }}
                                    >
                                      Plot #{plotId} (Pending)
                                    </Badge>
                                  ))}
                                  {pendingPlots.length > 15 && (
                                    <Badge variant="outline" className="text-xs border-yellow-500/50">
                                      +{pendingPlots.length - 15} more
                                    </Badge>
                                  )}
                                </div>
                              </ScrollArea>
                              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                Awaiting activation by admin
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No plots owned</div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* All Wallets Balance */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <Label className="text-sm font-semibold">All Wallets</Label>
                  </div>
                  <AllWalletsBalance />
                </div>

                {/* Transaction History */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <Label className="text-sm font-semibold">Transaction History</Label>
                  </div>
                  <div className="glass-enhanced rounded-lg border border-primary/20 p-4">
                    {recentTransfers.length > 0 ? (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-3">
                          {recentTransfers.map((transfer, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 glass-enhanced rounded-lg border border-primary/20 hover:border-primary/40 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                {transfer.status === "success" ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                                ) : transfer.status === "pending" ? (
                                  <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                                ) : (
                                  <AlertCircle className="h-5 w-5 text-destructive" />
                                )}
                                <div>
                                  <p className="font-semibold">{transfer.amount} CSN</p>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={transfer.status === "success" ? "default" : transfer.status === "pending" ? "secondary" : "destructive"}>
                                  {transfer.status}
                                </Badge>
                                {transfer.hash !== "pending" && getExplorerUrl(transfer.hash) && (
                                  <Button variant="ghost" size="icon" asChild>
                                    <a href={getExplorerUrl(transfer.hash)!} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No transactions yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeQuickAction === "accounts" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Account Management
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full glass-enhanced border-primary/20 hover:border-primary/40 hover:scale-110 transition-all"
                      onClick={() => openAccountDialog()}
                      title="Create Account"
                    >
                      <Plus className="h-4 w-4 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">
                    {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadAccounts()}
                    disabled={loadingAccounts}
                    className="h-8"
                  >
                    {loadingAccounts ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {loadingAccounts ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading accounts...
                  </div>
                ) : accounts.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-lg font-semibold mb-2">No accounts yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first account to get started
                    </p>
                    <Button onClick={() => openAccountDialog()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map((account) => (
                      <Card key={account.id} className="glass-enhanced border-primary/20 hover:border-primary/40 transition-all card-hover">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">{account.name}</CardTitle>
                              <CardDescription className="text-xs mt-1">{account.type}</CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAccountDialog(account)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteAccount(account)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                          <p className="text-xs font-mono text-muted-foreground break-all">
                            {account.wallet_address}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(account as any).wallet_key_name && (
                              <Badge variant="outline" className="text-xs">
                                <KeyRound className="h-3 w-3 mr-1" />
                                Wallet: {(account as any).wallet_key_name}
                              </Badge>
                            )}
                            {(account.metadata as any)?.blockchain_account_id && (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                                <Network className="h-3 w-3 mr-1" />
                                On-chain ID: {(account.metadata as any).blockchain_account_id}
                              </Badge>
                            )}
                          </div>
                          {account.description && (
                            <p className="text-sm text-muted-foreground mt-2">{account.description}</p>
                          )}
                          
                          {/* Universal Wallets Section */}
                          <Separator className="my-2" />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold flex items-center gap-1">
                                <Wallet className="h-3 w-3" />
                                Universal Wallets
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={async () => {
                                  try {
                                    const accountId = account.id;
                                    await createUniversalWallet(accountId, `Wallet for ${account.name}`);
                                    loadUniversalWallets();
                                    toast.success("Universal wallet created!");
                                  } catch (error: any) {
                                    toast.error(error.message || "Failed to create wallet");
                                  }
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Create Wallet
                              </Button>
                            </div>
                            {universalWallets.filter(w => w.accountId === account.id).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No wallets created yet</p>
                            ) : (
                              <div className="space-y-1">
                                {universalWallets
                                  .filter(w => w.accountId === account.id)
                                  .map((wallet) => (
                                    <div
                                      key={wallet.id}
                                      className="flex items-center justify-between p-2 glass-enhanced rounded border border-primary/10 hover:border-primary/30 transition-all"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold truncate">{wallet.name}</p>
                                        <p className="text-xs font-mono text-muted-foreground truncate">
                                          {wallet.address}
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={async () => {
                                          if (confirm(`Delete wallet ${wallet.name}?`)) {
                                            try {
                                              await deleteUniversalWallet(wallet.id);
                                              loadUniversalWallets();
                                            } catch (error: any) {
                                              toast.error(error.message || "Failed to delete wallet");
                                            }
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeQuickAction === "keys" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-primary" />
                    Avalanche CLI Keys
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AvalancheKeySelector />
              </CardContent>
            </Card>
          )}



          {activeQuickAction === "network" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    Network Information
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <CustomSubnetInfo />
                  <NetworkHealth autoRefresh={true} refreshInterval={30000} />
                </div>
                {CONTRACT_ADDRESSES.csnToken && (
                  <TokenMetadata tokenAddress={CONTRACT_ADDRESSES.csnToken} showDetails={true} />
                )}
              </CardContent>
            </Card>
          )}

          {activeQuickAction === "analytics" && (
            <Card className="glass-enhanced border-primary/20 card-hover">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Analytics & History
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setActiveQuickAction(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {address && <AddressAnalytics address={address} />}
                <TransactionHistory address={address || ""} limit={50} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Account Dialog */}
        <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
          <DialogContent className="glass-enhanced border-primary/30 max-w-[90vw] max-h-[90vh] w-full sm:max-w-md overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-lg">{editingAccount ? "Edit Account" : "Create Account"}</DialogTitle>
              <DialogDescription className="text-sm">
                {editingAccount ? "Update account information" : "Add a new account to your vault"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto max-h-[calc(90vh-180px)] pr-4">
              <ScrollArea className="h-full">
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                <Label htmlFor="accountName" className="text-sm">Name</Label>
                <Input
                  id="accountName"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="walletAssignment" className="text-sm">Assign Wallet</Label>
                  <Select
                  value={walletAssignmentType}
                  onValueChange={(value) => {
                    setWalletAssignmentType(value as any);
                    if (value === "connected" && address) {
                      setAccountForm({ ...accountForm, wallet_address: address, wallet_key_name: undefined });
                      setSelectedWalletKey("");
                    } else if (value === "avalanche-key") {
                      setAccountForm({ ...accountForm, wallet_address: "", wallet_key_name: undefined });
                      setSelectedWalletKey("");
                    } else {
                      setAccountForm({ ...accountForm, wallet_address: "", wallet_key_name: undefined });
                      setSelectedWalletKey("");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isConnected && (
                      <SelectItem value="connected">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Connected Wallet
                        </div>
                      </SelectItem>
                    )}
                    {avalancheKeys.length > 0 && (
                      <SelectItem value="avalanche-key">
                        <div className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          Avalanche CLI Key
                        </div>
                      </SelectItem>
                    )}
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Manual Address
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {walletAssignmentType === "avalanche-key" && (
                <div className="space-y-1.5">
                  <Label htmlFor="avalancheKeySelect" className="text-sm">Select Avalanche Key</Label>
                  <Select
                    value={selectedWalletKey}
                    onValueChange={(value) => {
                      setSelectedWalletKey(value);
                      const selectedKey = avalancheKeys.find(k => k.name === value);
                      if (selectedKey) {
                        // Try evm_address first, then address, then evmAddress
                        const keyAddress = selectedKey.evm_address || selectedKey.address || selectedKey.evmAddress;
                        if (keyAddress) {
                          // Validate and normalize the address
                          try {
                            const normalizedAddress = ethers.getAddress(keyAddress);
                            setAccountForm({ 
                              ...accountForm, 
                              wallet_address: normalizedAddress,
                              wallet_key_name: value
                            });
                          } catch (error) {
                            console.error("Invalid Avalanche key address:", keyAddress, error);
                            toast.error(`Invalid address for key ${value}: ${keyAddress}`);
                          }
                        } else {
                          toast.error(`No address found for key ${value}`);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose an Avalanche key..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px] overflow-y-auto">
                      {avalancheKeys.map((key) => (
                        <SelectItem key={key.name} value={key.name}>
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{key.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {key.evm_address?.slice(0, 10)}...{key.evm_address?.slice(-8)}
                                </span>
                            </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                            </div>
              )}

              {walletAssignmentType === "manual" && (
                <div className="space-y-1.5">
                  <Label htmlFor="accountAddress" className="text-sm">Wallet Address</Label>
                  <Input
                    id="accountAddress"
                    value={accountForm.wallet_address}
                    onChange={(e) => setAccountForm({ ...accountForm, wallet_address: e.target.value })}
                    className="font-mono h-9"
                    placeholder="0x..."
                  />
                  {accountForm.wallet_address && !validateAddress(accountForm.wallet_address) && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Invalid address format
                              </p>
                            )}
                          </div>
              )}

              {walletAssignmentType === "connected" && address && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Connected Wallet Address</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={address}
                      readOnly
                      className="font-mono glass-enhanced border-primary/30 h-9"
                    />
                            <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(address);
                        toast.success("Address copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                  </div>
                )}
              <div className="space-y-1.5">
                <Label htmlFor="accountType" className="text-sm">Type</Label>
                <Select
                  value={accountForm.type}
                  onValueChange={(value) => setAccountForm({ ...accountForm, type: value as any })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="cluster">Cluster</SelectItem>
                    <SelectItem value="joint">Joint</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="sub">Sub-Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="accountDescription" className="text-sm">Description</Label>
                <Textarea
                  id="accountDescription"
                  value={accountForm.description}
                  onChange={(e) => setAccountForm({ ...accountForm, description: e.target.value })}
                  className="min-h-[60px]"
                />
                  </div>
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="flex-shrink-0 pt-4 border-t border-primary/20">
              <Button variant="outline" onClick={() => setShowAccountDialog(false)} size="sm">
                Cancel
              </Button>
              <Button variant="cosmic" onClick={handleAccountSubmit} size="sm">
                {editingAccount ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="glass-enhanced border-destructive/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription className="pt-2">
                Are you sure you want to delete the account <strong>"{accountToDelete?.name}"</strong>?
                <br />
                <br />
                <span className="text-xs text-muted-foreground">
                  Wallet: <span className="font-mono">{accountToDelete?.wallet_address}</span>
                </span>
                <br />
                <br />
                This action cannot be undone. The account will be removed from your vault.
                {accountToDelete?.metadata?.blockchain_account_id && (
                  <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    This account is also registered on blockchain. The blockchain record will remain, but the local account will be deleted.
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setShowDeleteDialog(false);
                setAccountToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
          </TabsContent>

        {/* DEX & AMM Tab */}
        <TabsContent value="dex" className="space-y-6">
          <Card className="glass-enhanced border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5 text-primary" />
                Decentralized Exchange (DEX)
              </CardTitle>
              <CardDescription>
                Swap tokens using Automated Market Maker (AMM) liquidity pools
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Swap Interface */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select defaultValue="csn">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csn">CSN (Chaos Star Network)</SelectItem>
                        <SelectItem value="xen">Xen (Zarathis Token)</SelectItem>
                        <SelectItem value="xbgl">xBGL</SelectItem>
                        <SelectItem value="chaos">CHAOS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0.0" />
                    <p className="text-xs text-muted-foreground">Balance: {displayBalance.toFixed(4)} CSN</p>
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select defaultValue="xen">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csn">CSN (Chaos Star Network)</SelectItem>
                        <SelectItem value="xen">Xen (Zarathis Token)</SelectItem>
                        <SelectItem value="xbgl">xBGL</SelectItem>
                        <SelectItem value="chaos">CHAOS</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="0.0" readOnly className="bg-muted/50" />
                    <p className="text-xs text-muted-foreground">You will receive</p>
                  </div>
                </div>
                <div className="flex justify-center -my-2">
                  <Button variant="outline" size="icon" className="rounded-full">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exchange Rate</span>
                    <span className="font-medium">1 CSN = 0.85 Xen</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price Impact</span>
                    <span className="font-medium text-green-400">0.12%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidity</span>
                    <span className="font-medium">1,234,567 CSN</span>
                  </div>
                </div>
                <Button variant="cosmic" className="w-full" size="lg">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Swap Tokens
                </Button>
              </div>

              {/* Liquidity Pools */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Liquidity Pools</h3>
                <div className="grid gap-4">
                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-primary" />
                          <span className="font-semibold">CSN / Xen</span>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Liquidity</p>
                          <p className="font-bold">1,234,567 CSN</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">24h Volume</p>
                          <p className="font-bold">45,678 CSN</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4" size="sm">
                        Add Liquidity
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Speculative Market Tab */}
        <TabsContent value="speculative" className="space-y-6">
          <Card className="glass-enhanced border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Speculative Market
              </CardTitle>
              <CardDescription>
                Trade futures, options, and speculative positions on asset prices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Market Overview */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-green-500/20 bg-green-950/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Long Positions</p>
                    <p className="text-2xl font-bold text-green-400">12</p>
                  </CardContent>
                </Card>
                <Card className="border-red-500/20 bg-red-950/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Short Positions</p>
                    <p className="text-2xl font-bold text-red-400">3</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-500/20 bg-blue-950/10">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
                    <p className="text-2xl font-bold text-blue-400">+1,234 CSN</p>
                  </CardContent>
                </Card>
              </div>

              {/* Create Position */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold">Open Position</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Asset</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xen">Xen</SelectItem>
                        <SelectItem value="xbgl">xBGL</SelectItem>
                        <SelectItem value="csn">CSN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Position Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Long/Short" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" placeholder="0.0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Leverage</Label>
                    <Select defaultValue="1x">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1x">1x</SelectItem>
                        <SelectItem value="2x">2x</SelectItem>
                        <SelectItem value="5x">5x</SelectItem>
                        <SelectItem value="10x">10x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="cosmic" className="w-full">
                  <Target className="h-4 w-4 mr-2" />
                  Open Position
                </Button>
              </div>

              {/* Active Positions */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Positions</h3>
                <div className="space-y-2">
                  <Card className="border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">Xen Long</p>
                          <p className="text-xs text-muted-foreground">Opened 2h ago</p>
                        </div>
                        <Badge className="bg-green-500">+5.2%</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Entry</p>
                          <p className="font-medium">0.85 CSN</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current</p>
                          <p className="font-medium">0.894 CSN</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">P&L</p>
                          <p className="font-medium text-green-400">+123 CSN</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Synthetic Assets Tab */}
        <TabsContent value="synthetic" className="space-y-6">
          <Card className="glass-enhanced border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Synthetic Assets
              </CardTitle>
              <CardDescription>
                Create and trade synthetic assets backed by collateral
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Synthetic Asset */}
              <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold">Mint Synthetic Asset</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Asset Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sBTC">sBTC (Synthetic Bitcoin)</SelectItem>
                        <SelectItem value="sETH">sETH (Synthetic Ethereum)</SelectItem>
                        <SelectItem value="sAVAX">sAVAX (Synthetic AVAX)</SelectItem>
                        <SelectItem value="sXMR">sXMR (Synthetic Monero)</SelectItem>
                        <SelectItem value="custom">Custom Asset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Collateral Amount</Label>
                    <Input type="number" placeholder="0.0" />
                    <p className="text-xs text-muted-foreground">Collateral Ratio: 150%</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Collateral Type</Label>
                    <Select defaultValue="csn">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csn">CSN</SelectItem>
                        <SelectItem value="xbgl">xBGL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">You will mint</span>
                      <span className="font-bold">0.0 sBTC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Collateral locked</span>
                      <span className="font-bold">0.0 CSN</span>
                    </div>
                  </div>
                  <Button variant="cosmic" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Mint Synthetic Asset
                  </Button>
                </div>
              </div>

              {/* Your Synthetic Assets */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Synthetic Assets</h3>
                <div className="space-y-2">
                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">sBTC</p>
                          <p className="text-xs text-muted-foreground">Synthetic Bitcoin</p>
                        </div>
                        <Badge>Active</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Balance</p>
                          <p className="font-bold">0.5 sBTC</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Collateral</p>
                          <p className="font-bold">750 CSN</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          Trade
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          Burn
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Market Prices */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Synthetic Asset Prices</h3>
                <div className="space-y-2">
                  {[
                    { symbol: "sBTC", name: "Synthetic Bitcoin", price: "42,567 CSN", change: "+2.3%" },
                    { symbol: "sETH", name: "Synthetic Ethereum", price: "2,345 CSN", change: "-1.2%" },
                    { symbol: "sAVAX", name: "Synthetic AVAX", price: "45.67 CSN", change: "+0.8%" },
                    { symbol: "sXMR", name: "Synthetic Monero", price: "234.56 CSN", change: "+5.1%" },
                  ].map((asset) => (
                    <Card key={asset.symbol} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{asset.symbol}</p>
                            <p className="text-xs text-muted-foreground">{asset.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{asset.price}</p>
                            <p className={`text-xs ${asset.change.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                              {asset.change}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
