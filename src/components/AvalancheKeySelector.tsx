import { useState, useEffect } from "react";
import { useAccountManagement } from "@/contexts/AccountManagementContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Wallet, Coins, RefreshCw, Loader2, Copy, Network, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import { getRpcProvider } from "@/lib/wallet";
import { toast } from "sonner";
import * as accountApi from "@/lib/api";
import { getCSNTokenContract, hasCSNTokenContract } from "@/lib/contracts";
import { getAccountInfo, getAllAccountAddresses } from "@/lib/avalanche-accounts";

interface KeyInfo {
  name: string;
  address: string;
  balance?: string;
  csnBalance?: string;
  isMainFunded?: boolean;
  xChainAddress?: string;
  pChainAddress?: string;
}

export function AvalancheKeySelector() {
  const { avalancheKeys, loadAvalancheInfo, loadingAvalancheInfo } = useAccountManagement();
  const { address, refreshBalance, connectWithPrivateKey } = useWallet();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [keyBalances, setKeyBalances] = useState<Record<string, KeyInfo>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [viewingKey, setViewingKey] = useState<KeyInfo | null>(null);

  // Load balances for all keys
  const loadKeyBalances = async () => {
    if (avalancheKeys.length === 0) return;
    
    setLoadingBalances(true);
    const balances: Record<string, KeyInfo> = {};
    
    try {
      // Use Promise.allSettled to continue even if some keys fail
      const results = await Promise.allSettled(
        avalancheKeys.map(async (key) => {
          try {
            const result = await accountApi.getKeyBalance(key.name);
            if (result.success) {
              return {
                address: key.address,
                data: {
                  name: key.name,
                  address: key.address,
                  balance: result.balance,
                  csnBalance: result.csn_balance,
                  isMainFunded: result.isMainFunded,
                }
              };
            } else {
              // Key exists but balance fetch failed - still show the key with no balance
              console.debug(`Balance fetch failed for ${key.name}:`, result.error);
              return {
                address: key.address,
                data: {
                  name: key.name,
                  address: key.address,
                  balance: undefined,
                  csnBalance: undefined,
                  isMainFunded: key.address.toLowerCase() === "0x7852031cbD4b980457962D30D11e7CC684109fEa".toLowerCase(),
                }
              };
            }
          } catch (error) {
            console.debug(`Failed to load balance for ${key.name}:`, error);
            // Return key info even if balance failed
            return {
              address: key.address,
              data: {
                name: key.name,
                address: key.address,
                balance: undefined,
                csnBalance: undefined,
                isMainFunded: key.address.toLowerCase() === "0x7852031cbD4b980457962D30D11e7CC684109fEa".toLowerCase(),
              }
            };
          }
        })
      );
      
      // Process results
      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value) {
          balances[result.value.address] = result.value.data;
        }
      });
      
      setKeyBalances(balances);
    } catch (error) {
      console.error("Failed to load key balances:", error);
    } finally {
      setLoadingBalances(false);
    }
  };

  useEffect(() => {
    if (avalancheKeys.length > 0) {
      loadKeyBalances();
    }
  }, [avalancheKeys]);

  // Find key that matches current address
  useEffect(() => {
    if (address && avalancheKeys.length > 0) {
      const matchingKey = avalancheKeys.find(
        (k) => k.address.toLowerCase() === address.toLowerCase()
      );
      if (matchingKey) {
        setSelectedKey(matchingKey.address);
        setViewingKey(keyBalances[matchingKey.address] || {
          name: matchingKey.name,
          address: matchingKey.address,
        });
      }
    }
  }, [address, avalancheKeys, keyBalances]);

  const handleKeySelect = async (keyAddress: string) => {
    const key = avalancheKeys.find((k) => k.address === keyAddress);
    if (!key) return;
    
    setSelectedKey(keyAddress);
    const keyInfo = keyBalances[keyAddress] || {
      name: key.name,
      address: key.address,
    };
    
    // Try to derive multi-chain addresses using the Avalanche SDK
    try {
      // Get private key from backend (for CLI-managed keys only)
      const keyResult = await accountApi.getKeyPrivateKey(key.name);
      if (keyResult.success && keyResult.private_key) {
        try {
          const addresses = getAllAccountAddresses(keyResult.private_key as `0x${string}`);
          keyInfo.xChainAddress = addresses.xChain;
          keyInfo.pChainAddress = addresses.pChain;
        } catch (error) {
          console.debug("Failed to derive multi-chain addresses:", error);
        }
      }
    } catch (error) {
      console.debug("Failed to get private key for multi-chain addresses:", error);
    }
    
    setViewingKey(keyInfo);
    toast.info(`Viewing key: ${key.name}`);
  };

  const handleConnect = async () => {
    if (!viewingKey) return;
    
    const key = avalancheKeys.find((k) => k.address === viewingKey.address);
    if (!key) return;
    
    try {
      // Get private key from backend
      const keyResult = await accountApi.getKeyPrivateKey(key.name);
      if (!keyResult.success || !keyResult.private_key) {
        toast.error("Failed to retrieve private key. Key may not be CLI-managed.");
        return;
      }
      
      // Connect using private key
      await connectWithPrivateKey(keyResult.private_key);
      toast.success(`Connected with ${key.name}`);
    } catch (error: any) {
      console.error("Failed to connect with key:", error);
      toast.error(error.message || "Failed to connect with key");
    }
  };

  if (avalancheKeys.length === 0) {
    return (
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Avalanche Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No keys found in ~/.avalanche-cli/key/</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <KeyRound className="h-5 w-5 text-primary" />
            Avalanche Keys ({avalancheKeys.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadAvalancheInfo}
              disabled={loadingAvalancheInfo}
              className="hover:bg-primary/20 hover:scale-110 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loadingAvalancheInfo ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadKeyBalances}
              disabled={loadingBalances}
              className="hover:bg-primary/20 hover:scale-110 transition-all"
            >
              <Loader2 className={`h-4 w-4 ${loadingBalances ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Select Key</Label>
          <Select
            value={selectedKey || undefined}
            onValueChange={handleKeySelect}
          >
            <SelectTrigger className="glass-enhanced border-primary/30 hover:border-primary/50 transition-all">
              <SelectValue placeholder="Choose a key...">
                {selectedKey ? (
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <span className="font-medium">{viewingKey?.name || "Unknown"}</span>
                  </div>
                ) : (
                  "Choose a key..."
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {avalancheKeys.map((key) => {
                const keyInfo = keyBalances[key.address];
                const isMainFunded = keyInfo?.isMainFunded || key.address.toLowerCase() === "0x7852031cbD4b980457962D30D11e7CC684109fEa".toLowerCase();
                return (
                  <SelectItem key={key.address} value={key.address}>
                    <div className="flex items-center gap-2">
                      {isMainFunded ? (
                        <Coins className="h-4 w-4 text-primary" />
                      ) : (
                        <KeyRound className="h-4 w-4" />
                      )}
                      <span>{key.name}</span>
                      {isMainFunded && (
                        <Badge variant="default" className="ml-2 text-xs">Funded</Badge>
                      )}
                      {keyInfo?.balance && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {parseFloat(keyInfo.balance).toFixed(4)} CSN
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Key Info */}
        {viewingKey && (
          <div className="space-y-3 p-4 glass-enhanced rounded-lg border border-primary/30 scale-in hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2 gradient-text">
                  {viewingKey.isMainFunded ? (
                    <Coins className="h-4 w-4 text-primary animate-pulse" />
                  ) : (
                    <KeyRound className="h-4 w-4 text-primary" />
                  )}
                  {viewingKey.name}
                  {viewingKey.isMainFunded && (
                    <Badge variant="default" className="ml-2 pulse-glow">Main Funded</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  {viewingKey.address}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(viewingKey.address);
                    toast.success("Address copied");
                  }}
                  className="hover:bg-primary/20 hover:scale-110 transition-all"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConnect}
                  className="hover:bg-primary/80 hover:scale-105 transition-all"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              </div>
            </div>

            {/* Multi-Chain Addresses (if available) */}
            {(viewingKey.xChainAddress || viewingKey.pChainAddress) && (
              <div className="pt-2 border-t border-primary/20 space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-2">
                  <Network className="h-3 w-3" />
                  Multi-Chain Addresses
                </Label>
                {viewingKey.xChainAddress && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">X-Chain:</span>
                    <p className="font-mono text-xs break-all">{viewingKey.xChainAddress}</p>
                  </div>
                )}
                {viewingKey.pChainAddress && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">P-Chain:</span>
                    <p className="font-mono text-xs break-all">{viewingKey.pChainAddress}</p>
                  </div>
                )}
              </div>
            )}

            {/* Balances */}
            <div className="space-y-3 pt-2 border-t border-primary/20">
              {viewingKey.balance !== undefined ? (
                <div>
                  <Label className="text-sm font-semibold">Native Balance</Label>
                  <p className="text-2xl font-bold gradient-text balance-update">
                    {parseFloat(viewingKey.balance).toFixed(6)} CSN
                  </p>
                </div>
              ) : (
                <div>
                  <Label className="text-sm font-semibold">Native Balance</Label>
                  <p className="text-sm text-muted-foreground">Balance unavailable</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadKeyBalances}
                    disabled={loadingBalances}
                    className="mt-2 h-7 text-xs"
                  >
                    {loadingBalances ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Retry
                  </Button>
                </div>
              )}
              {viewingKey.csnBalance !== undefined && parseFloat(viewingKey.csnBalance || "0") > 0 && (
                <div>
                  <Label className="text-sm font-semibold">CSN Token Balance</Label>
                  <p className="text-2xl font-bold gradient-text">
                    {parseFloat(viewingKey.csnBalance || "0").toFixed(4)} CSN
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

