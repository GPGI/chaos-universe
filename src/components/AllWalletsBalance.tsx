import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wallet, 
  RefreshCw, 
  Loader2, 
  Coins, 
  Database, 
  KeyRound,
  Copy,
  ExternalLink
} from "lucide-react";
import { Label } from "@/components/ui/label";
import * as accountApi from "@/lib/api";
import { toast } from "sonner";

interface WalletBalance {
  address: string;
  name: string;
  source: "avalanche_cli" | "database";
  balance: string;
  balance_wei: string;
  csn_balance?: string;
  isMainFunded?: boolean;
  account_id?: string;
  account_type?: string;
  error?: string;
}

interface AllWalletsResponse {
  success: boolean;
  rpc_url?: string;
  total_wallets?: number;
  total_balance?: string;
  wallets?: WalletBalance[];
  error?: string;
}

export function AllWalletsBalance() {
  const [data, setData] = useState<AllWalletsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBalances = async () => {
    setLoading(true);
    try {
      const result = await accountApi.getAllWalletBalances();
      setData(result);
    } catch (error: any) {
      console.error("Error loading wallet balances:", error);
      setData({
        success: false,
        error: error.message || "Failed to load wallet balances",
        wallets: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
  }, []);

  if (!data) {
    return (
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            All Wallets Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data.success) {
    return (
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            All Wallets Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p className="mb-2">{data.error || "Failed to load wallet balances"}</p>
            <Button variant="outline" size="sm" onClick={loadBalances} disabled={loading}>
              {loading ? (
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-2" />
              )}
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wallets = data.wallets || [];
  const totalBalance = parseFloat(data.total_balance || "0");

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 gradient-text">
              <Wallet className="h-5 w-5 text-primary" />
              All Wallets Balance
              {data.total_wallets !== undefined && (
                <Badge variant="outline" className="ml-2">
                  {data.total_wallets} wallets
                </Badge>
              )}
            </CardTitle>
            {data.rpc_url && (
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <span>RPC:</span>
                <span className="font-mono text-primary/80">{data.rpc_url.includes("41773") ? "Chaos Star Network" : data.rpc_url}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {data.rpc_url && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(data.rpc_url || "");
                  toast.success("RPC URL copied");
                }}
                className="hover:bg-primary/20 hover:scale-110 transition-all"
                title={data.rpc_url}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadBalances}
              disabled={loading}
              className="hover:bg-primary/20 hover:scale-110 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        {totalBalance > 0 && (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">Total Balance</Label>
            <p className="text-2xl font-bold gradient-text">
              {totalBalance.toLocaleString('en-US', { 
                maximumFractionDigits: 2,
                minimumFractionDigits: 2 
              })} CSN
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {wallets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>No wallets found</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {wallets.map((wallet, index) => {
                const balance = parseFloat(wallet.balance || "0");
                const hasError = !!wallet.error;
                
                return (
                  <div
                    key={`${wallet.address}-${index}`}
                    className={`p-4 glass-enhanced rounded-lg border transition-all ${
                      wallet.isMainFunded 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-primary/20 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {wallet.source === "avalanche_cli" ? (
                            <KeyRound className="h-4 w-4 text-primary" />
                          ) : (
                            <Database className="h-4 w-4 text-blue-400" />
                          )}
                          <span className="font-semibold">{wallet.name}</span>
                          {wallet.isMainFunded && (
                            <Badge variant="default" className="text-xs pulse-glow">
                              <Coins className="h-3 w-3 mr-1" />
                              Main Funded
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {wallet.source === "avalanche_cli" ? "CLI Key" : wallet.account_type || "Account"}
                          </Badge>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground break-all">
                          {wallet.address}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(wallet.address);
                            toast.success("Address copied");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-primary/20 space-y-2">
                      {hasError ? (
                        <div className="text-xs text-destructive">
                          Error: {wallet.error}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs text-muted-foreground">Native Balance</Label>
                            <p className={`text-sm font-semibold ${
                              balance > 0 ? "gradient-text" : "text-muted-foreground"
                            }`}>
                              {balance.toLocaleString('en-US', { 
                                maximumFractionDigits: 6,
                                minimumFractionDigits: 2 
                              })} CSN
                            </p>
                          </div>
                          {wallet.csn_balance && parseFloat(wallet.csn_balance) > 0 && (
                            <div className="flex items-center justify-between">
                              <Label className="text-xs text-muted-foreground">CSN Token</Label>
                              <p className="text-sm font-bold gradient-text">
                                {parseFloat(wallet.csn_balance).toLocaleString('en-US', { 
                                  maximumFractionDigits: 2,
                                  minimumFractionDigits: 2 
                                })} CSN
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

