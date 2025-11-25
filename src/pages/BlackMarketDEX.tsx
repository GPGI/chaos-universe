import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowUpDown, 
  Skull, 
  Coins, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Zap
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import { toast } from "sonner";
import { getRpcProvider } from "@/lib/wallet";
import { getERC20Contract } from "@/lib/contracts";
import { getApiBase } from "@/lib/api";

// Xen token address (Zarathis token) - to be configured
const XEN_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000"; // Placeholder - needs actual address

export default function BlackMarketDEX() {
  const navigate = useNavigate();
  const { address, isConnected, signer, balance, connect } = useWallet();
  
  const [xmrAmount, setXmrAmount] = useState("");
  const [xenAmount, setXenAmount] = useState("");
  const [swapping, setSwapping] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [blackMarketLiquidity, setBlackMarketLiquidity] = useState<{ XMR: number; Xen: number }>({ XMR: 0, Xen: 0 });

  // Fetch black market liquidity from backend
  useEffect(() => {
    const fetchLiquidity = async () => {
      try {
        const base = getApiBase();
        const res = await fetch(`${base}/governance/black-market`);
        if (res.ok) {
          const data = await res.json();
          setBlackMarketLiquidity({
            XMR: data.liquidity?.XMR || 0,
            Xen: data.liquidity?.Xen || data.liquidity?.SC || 0
          });
        }
      } catch (error) {
        console.debug("Could not fetch black market liquidity:", error);
      }
    };
    fetchLiquidity();
    const interval = setInterval(fetchLiquidity, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Calculate exchange rate and quote
  useEffect(() => {
    const calculateQuote = async () => {
      if (!xmrAmount || parseFloat(xmrAmount) <= 0) {
        setXenAmount("");
        setExchangeRate(null);
        setPriceImpact(0);
        return;
      }

      setLoadingQuote(true);
      try {
        // Simple exchange rate calculation
        // In production, this would query a DEX or oracle
        // For now, use a simple 1:1 ratio with small slippage
        const baseRate = 1.0; // 1 XMR = 1 Xen (placeholder)
        
        // Adjust based on liquidity
        const liquidityFactor = blackMarketLiquidity.XMR > 0 && blackMarketLiquidity.Xen > 0
          ? Math.min(blackMarketLiquidity.Xen / blackMarketLiquidity.XMR, 2.0)
          : 1.0;
        
        const rate = baseRate * liquidityFactor;
        const amountIn = parseFloat(xmrAmount);
        const amountOut = amountIn * rate;
        
        // Calculate price impact (simplified)
        const impact = amountIn > 0 && blackMarketLiquidity.XMR > 0
          ? Math.min((amountIn / blackMarketLiquidity.XMR) * 100, 50)
          : 0;
        
        setExchangeRate(rate);
        setXenAmount(amountOut.toFixed(6));
        setPriceImpact(impact);
      } catch (error) {
        console.error("Error calculating quote:", error);
        toast.error("Failed to calculate exchange rate");
      } finally {
        setLoadingQuote(false);
      }
    };

    const timeoutId = setTimeout(calculateQuote, 500);
    return () => clearTimeout(timeoutId);
  }, [xmrAmount, blackMarketLiquidity]);

  const handleSwap = async () => {
    if (!isConnected || !signer || !address) {
      toast.error("Please connect your wallet");
      await connect();
      return;
    }

    if (!xmrAmount || parseFloat(xmrAmount) <= 0) {
      toast.error("Please enter a valid XMR amount");
      return;
    }

    if (!xenAmount || parseFloat(xenAmount) <= 0) {
      toast.error("Invalid exchange rate");
      return;
    }

    setSwapping(true);
    try {
      // In production, this would interact with a DEX contract
      // For now, show a message that this is a placeholder
      toast.info("Black market DEX swap functionality will be implemented with actual DEX contracts");
      
      // Placeholder for actual swap logic:
      // 1. Approve XMR token (if ERC20) or send native token
      // 2. Call DEX router swap function
      // 3. Wait for transaction confirmation
      // 4. Update balances
      
      // For now, just simulate
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Swap initiated: ${xmrAmount} XMR → ${xenAmount} Xen`);
      
      // Reset form
      setXmrAmount("");
      setXenAmount("");
    } catch (error: any) {
      console.error("Swap error:", error);
      toast.error(error.message || "Swap failed");
    } finally {
      setSwapping(false);
    }
  };

  const handleMaxXMR = async () => {
    if (!address || !isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      // In production, check XMR balance (would need XMR token contract or balance API)
      // For now, use a placeholder
      const maxAmount = "10.0"; // Placeholder
      setXmrAmount(maxAmount);
    } catch (error) {
      toast.error("Failed to fetch XMR balance");
    }
  };

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="glass" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <Skull className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  Black Market DEX
                </h1>
                <p className="text-muted-foreground">Zarathis • Capital city of Zarathis</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="glass border-red-500/30 bg-gradient-to-br from-red-950/20 to-background mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  The black market operates outside official regulations. All trades are final and anonymous. 
                  Exchange rates fluctuate based on liquidity. Trade at your own risk.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Swap Interface */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="glass border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5 text-red-400" />
                  Swap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* XMR Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="xmr-amount">From</Label>
                    <Badge variant="outline" className="gap-1">
                      <Coins className="h-3 w-3" />
                      XMR
                    </Badge>
                  </div>
                  <div className="relative">
                    <Input
                      id="xmr-amount"
                      type="number"
                      placeholder="0.0"
                      value={xmrAmount}
                      onChange={(e) => setXmrAmount(e.target.value)}
                      className="text-2xl pr-20"
                      disabled={swapping || loadingQuote}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={handleMaxXMR}
                      disabled={!isConnected || swapping}
                    >
                      MAX
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Balance: {isConnected ? "—" : "Connect wallet"}</span>
                    <span>Liquidity: {blackMarketLiquidity.XMR.toFixed(2)} XMR</span>
                  </div>
                </div>

                {/* Swap Arrow */}
                <div className="flex justify-center -my-2">
                  <div className="p-2 rounded-full bg-red-500/10 border border-red-500/30">
                    <ArrowUpDown className="h-5 w-5 text-red-400" />
                  </div>
                </div>

                {/* Xen Output */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="xen-amount">To</Label>
                    <Badge variant="outline" className="gap-1 bg-primary/10">
                      <Zap className="h-3 w-3" />
                      Xen
                    </Badge>
                  </div>
                  <Input
                    id="xen-amount"
                    type="number"
                    placeholder="0.0"
                    value={xenAmount}
                    readOnly
                    className="text-2xl bg-muted/50"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>You will receive</span>
                    <span>Liquidity: {blackMarketLiquidity.Xen.toFixed(2)} Xen</span>
                  </div>
                </div>

                {/* Exchange Rate & Price Impact */}
                {exchangeRate && (
                  <div className="space-y-2 pt-4 border-t border-primary/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Exchange Rate</span>
                      <span className="font-medium">1 XMR = {exchangeRate.toFixed(4)} Xen</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price Impact</span>
                      <span className={priceImpact > 5 ? "text-red-400 font-medium" : "font-medium"}>
                        {priceImpact.toFixed(2)}%
                        {priceImpact > 5 && (
                          <AlertCircle className="h-3 w-3 inline ml-1" />
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <Button
                  variant="destructive"
                  className="w-full gap-2 text-lg py-6 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                  onClick={handleSwap}
                  disabled={!isConnected || !xmrAmount || parseFloat(xmrAmount) <= 0 || swapping || loadingQuote}
                >
                  {swapping ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Swapping...
                    </>
                  ) : loadingQuote ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Calculating...
                    </>
                  ) : !isConnected ? (
                    <>
                      <Shield className="h-5 w-5" />
                      Connect Wallet
                    </>
                  ) : (
                    <>
                      <ArrowUpDown className="h-5 w-5" />
                      Swap XMR for Xen
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Transaction History (placeholder) */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent trades. Be the first to trade on the black market!
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Market Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Market Stats */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">XMR Liquidity</span>
                    <span className="font-medium">{blackMarketLiquidity.XMR.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Xen Liquidity</span>
                    <span className="font-medium">{blackMarketLiquidity.Xen.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Volume (24h)</span>
                    <span className="font-medium">—</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Info */}
            <Card className="glass border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Network Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Planet</span>
                  <Badge variant="outline">Zythera</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">City</span>
                  <Badge variant="outline">Zarathis</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Market Type</span>
                  <Badge variant="destructive">Black Market</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Warning */}
            <Card className="glass border-yellow-500/30 bg-yellow-950/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Trading Notice</p>
                    <p>
                      Black market trades are irreversible. Always verify amounts before confirming. 
                      Rates may change between quote and execution.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

