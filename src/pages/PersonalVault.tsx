import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  Send, 
  ArrowRight, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  History,
  Coins,
  ExternalLink
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useLandPlots } from "@/hooks/useLandPlots";
import { ethers } from "ethers";
import { toast } from "sonner";
import { getRpcProvider } from "@/lib/wallet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw } from "lucide-react";

interface Transfer {
  hash: string;
  to: string;
  amount: string;
  timestamp: Date;
  status: "pending" | "success" | "failed";
}

export default function PersonalVault() {
  const { address, signer, isConnected, balance, refreshBalance } = useWallet();
  const { userPlots, pendingPlots, refresh: refreshPlots, loading: plotsLoading } = useLandPlots();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [recentTransfers, setRecentTransfers] = useState<Transfer[]>([]);
  const [gasPrice, setGasPrice] = useState<string>("");
  const [gasLimit, setGasLimit] = useState<string>("21000");

  // Load recent transfers from localStorage
  useEffect(() => {
    if (address) {
      const stored = localStorage.getItem(`transfers_${address}`);
      if (stored) {
        try {
          const transfers = JSON.parse(stored);
          setRecentTransfers(transfers.map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          })));
        } catch (e) {
          console.error("Failed to load transfers:", e);
        }
      }
    }
  }, [address]);

  // Load gas price on mount
  useEffect(() => {
    if (isConnected) {
      loadGasPrice();
    }
  }, [isConnected]);

  const loadGasPrice = async () => {
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
  };

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
    if (!isConnected || !signer || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Validate recipient address
    if (!validateAddress(recipientAddress)) {
      toast.error("Invalid recipient address");
      return;
    }

    // Validate amount
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check balance
    const currentBalance = parseFloat(balance);
    if (amount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setTransferring(true);

    try {
      const provider = getRpcProvider();
      if (!provider) {
        throw new Error("Failed to connect to RPC");
      }

      // Convert amount to wei
      const amountWei = ethers.parseEther(transferAmount);

      // Get nonce
      const nonce = await provider.getTransactionCount(address);

      // Get fee data
      const feeData = await provider.getFeeData();
      const gasPriceToUse = feeData.gasPrice || ethers.parseUnits(gasPrice || "25", "gwei");

      // Estimate gas
      let estimatedGas = ethers.parseUnits(gasLimit || "21000", "wei");
      try {
        estimatedGas = await provider.estimateGas({
          to: recipientAddress,
          value: amountWei,
          from: address,
        });
      } catch (error) {
        console.warn("Gas estimation failed, using default:", error);
      }

      // Build transaction
      const tx = {
        to: recipientAddress,
        value: amountWei,
        gasLimit: estimatedGas,
        gasPrice: gasPriceToUse,
        nonce: nonce,
      };

      // Show pending transfer
      const pendingTransfer: Transfer = {
        hash: "pending",
        to: recipientAddress,
        amount: transferAmount,
        timestamp: new Date(),
        status: "pending",
      };
      setRecentTransfers(prev => [pendingTransfer, ...prev]);

      // Send transaction
      const txResponse = await signer.sendTransaction(tx);
      
      // Update pending transfer with actual hash
      setRecentTransfers(prev => prev.map(t => 
        t.hash === "pending" 
          ? { ...t, hash: txResponse.hash, status: "pending" }
          : t
      ));

      toast.success(`Transaction sent! Hash: ${txResponse.hash.slice(0, 10)}...`);

      // Wait for confirmation
      const receipt = await txResponse.wait();
      
      // Update transfer status
      const success = receipt.status === 1;
      setRecentTransfers(prev => prev.map(t => 
        t.hash === txResponse.hash 
          ? { ...t, status: success ? "success" : "failed" }
          : t
      ));

      // Save to localStorage
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
        ].slice(0, 20); // Keep last 20 transfers
        
        localStorage.setItem(`transfers_${address}`, JSON.stringify(transfersToSave));
      }

      if (success) {
        toast.success("Transfer completed successfully!");
        setRecipientAddress("");
        setTransferAmount("");
        refreshBalance();
      } else {
        toast.error("Transaction failed");
      }

    } catch (error: any) {
      console.error("Transfer error:", error);
      
      // Remove pending transfer on error
      setRecentTransfers(prev => prev.filter(t => t.hash !== "pending"));
      
      // Check for user rejection
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
    // Try to determine explorer from RPC URL
    if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) {
      return null; // Local network, no explorer
    }
    // For testnet/mainnet, use snowtrace
    return `https://snowtrace.io/tx/${txHash}`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen pt-20 bg-background">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="glass p-8 text-center">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-3xl font-bold mb-4">Wallet Not Connected</h1>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access your Chaos Vault
            </p>
            <Button variant="cosmic" onClick={() => window.location.reload()} className="gap-2">
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Wallet className="h-10 w-10 text-primary" />
              Chaos Vault
            </h1>
            <p className="text-muted-foreground">Manage your wallet and transfer funds P2P</p>
          </div>
          <Badge variant="outline" className="text-lg px-4 py-2">
            Connected
          </Badge>
        </div>

        {/* Wallet Info Card */}
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Wallet Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Your Address</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={address || ""} 
                  readOnly 
                  className="font-mono"
                />
                <Button variant="outline" size="icon" onClick={copyAddress}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Balance</Label>
              <div className="text-3xl font-bold text-primary">
                {parseFloat(balance).toFixed(6)} AVAX
              </div>
            </div>
            <div className="space-y-2 pt-2 border-t border-primary/20">
              <div className="flex items-center justify-between">
                <Label>Owned Plots</Label>
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
            <Button variant="outline" onClick={refreshBalance} className="gap-2">
              <Loader2 className="h-4 w-4" />
              Refresh Balance
            </Button>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="transfer" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transfer" className="gap-2">
              <Send className="h-4 w-4" />
              Transfer Funds
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              Transfer History
            </TabsTrigger>
          </TabsList>

          {/* Transfer Tab */}
          <TabsContent value="transfer">
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Send Funds (P2P)
                </CardTitle>
                <CardDescription>
                  Transfer AVAX directly to another wallet address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient Address</Label>
                  <Input
                    id="recipient"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="font-mono"
                  />
                  {recipientAddress && !validateAddress(recipientAddress) && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Invalid address format
                    </p>
                  )}
                  {recipientAddress && validateAddress(recipientAddress) && (
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Valid address
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (AVAX)</Label>
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
                    <span>Available: {parseFloat(balance).toFixed(6)} AVAX</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTransferAmount((parseFloat(balance) * 0.95).toFixed(6))}
                    >
                      Max (95%)
                    </Button>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4 pt-4 border-t border-primary/20">
                  <div className="space-y-2">
                    <Label htmlFor="gasPrice">Gas Price (Gwei)</Label>
                    <Input
                      id="gasPrice"
                      type="number"
                      step="0.1"
                      placeholder="Auto"
                      value={gasPrice}
                      onChange={(e) => setGasPrice(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for automatic gas price
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gasLimit">Gas Limit</Label>
                    <Input
                      id="gasLimit"
                      type="number"
                      placeholder="21000"
                      value={gasLimit}
                      onChange={(e) => setGasLimit(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  variant="cosmic"
                  className="w-full gap-2"
                  onClick={handleTransfer}
                  disabled={transferring || !recipientAddress || !transferAmount || !validateAddress(recipientAddress)}
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing Transaction...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Transfer
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Transfers
                </CardTitle>
                <CardDescription>
                  View your recent P2P transfers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransfers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transfer history</p>
                    <p className="text-sm mt-2">Your transfers will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransfers.map((transfer, index) => {
                      const explorerUrl = getExplorerUrl(transfer.hash);
                      return (
                        <div
                          key={index}
                          className="glass p-4 rounded-lg border border-primary/20 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  transfer.status === "success"
                                    ? "default"
                                    : transfer.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {transfer.status}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {transfer.timestamp.toLocaleString()}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm">
                                <span className="text-muted-foreground">To:</span>{" "}
                                <span className="font-mono text-xs">
                                  {transfer.to.slice(0, 6)}...{transfer.to.slice(-4)}
                                </span>
                              </p>
                              <p className="text-lg font-semibold text-primary">
                                {transfer.amount} AVAX
                              </p>
                            </div>
                            {transfer.hash !== "pending" && (
                              <p className="text-xs text-muted-foreground mt-2 font-mono">
                                {transfer.hash.slice(0, 10)}...{transfer.hash.slice(-8)}
                              </p>
                            )}
                          </div>
                          {explorerUrl && transfer.hash !== "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(explorerUrl, "_blank")}
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

