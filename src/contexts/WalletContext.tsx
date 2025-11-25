import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { ethers } from "ethers";
import { connectWallet, getConnectedAddress, getRpcProvider, disconnectWalletConnect, connectWithPrivateKey } from "@/lib/wallet";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface WalletContextType {
  address: string | null;
  signer: ethers.Signer | null;
  provider: ethers.JsonRpcProvider;
  isConnected: boolean;
  balance: string;
  connect: (useWalletConnect?: boolean) => Promise<void>;
  connectWithPrivateKey: (privateKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [walletProvider, setWalletProvider] = useState<any>(null);
  const isMobile = useIsMobile();

  const connect = async (useWalletConnect?: boolean) => {
    try {
      const shouldUseWalletConnect = useWalletConnect ?? isMobile;
      const { signer: newSigner, address: newAddress, provider: newProvider } = await connectWallet(shouldUseWalletConnect);
      setSigner(newSigner);
      setAddress(newAddress);
      setWalletProvider(newProvider);
      await refreshBalance(newAddress);
      toast.success("Wallet connected!");

      // Listen to WalletConnect events
      if (newProvider && newProvider.on) {
        newProvider.on("accountsChanged", (accounts: string[]) => {
          if (accounts.length === 0) {
            disconnect();
          } else {
            setAddress(accounts[0]);
            refreshBalance(accounts[0]);
          }
        });

        newProvider.on("disconnect", () => {
          disconnect();
        });
      }
    } catch (error: any) {
      console.error("Failed to connect wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
    }
  };

  const connectWithKey = async (privateKey: string) => {
    try {
      const { signer: newSigner, address: newAddress } = await connectWithPrivateKey(privateKey);
      setSigner(newSigner);
      setAddress(newAddress);
      setWalletProvider(null); // Not using external provider
      await refreshBalance(newAddress);
      toast.success("Wallet connected with private key!");
    } catch (error: any) {
      console.error("Failed to connect with private key:", error);
      toast.error(error.message || "Failed to connect with private key");
    }
  };

  const disconnect = async () => {
    await disconnectWalletConnect();
    if (walletProvider && walletProvider.disconnect) {
      await walletProvider.disconnect();
    }
    setAddress(null);
    setSigner(null);
    setBalance("0");
    setWalletProvider(null);
    toast.info("Wallet disconnected");
  };

  const refreshBalance = async (addr?: string | null) => {
    const addrToCheck = addr || address;
    if (!addrToCheck) return;

    try {
      // Use ethers.js directly (more reliable for C-Chain balance)
      const rpc = getRpcProvider();
      if (!rpc) return;
      const bal = await rpc.getBalance(addrToCheck);
      setBalance(ethers.formatEther(bal));
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  useEffect(() => {
    // Check if already connected
    getConnectedAddress().then((addr) => {
      if (addr) {
        setAddress(addr);
        // Get signer if available
        const { ethereum } = window as any;
        if (ethereum) {
          const web3Provider = new ethers.BrowserProvider(ethereum);
          web3Provider.getSigner().then(setSigner).catch(() => {});
        }
        refreshBalance(addr);
      }
    });

    // Listen for account changes
    const { ethereum } = window as any;
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          refreshBalance(accounts[0]);
        }
      });

      ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }

    return () => {
      if (ethereum) {
        ethereum.removeAllListeners("accountsChanged");
        ethereum.removeAllListeners("chainChanged");
      }
    };
  }, []);

  // Refresh balance periodically
  useEffect(() => {
    if (!address) return;
    
    const interval = setInterval(() => {
      refreshBalance();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [address]);

  return (
    <WalletContext.Provider
      value={{
        address,
        signer,
        provider: getRpcProvider() as any,
        isConnected: !!address,
        balance,
        connect,
        connectWithPrivateKey: connectWithKey,
        disconnect,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}


