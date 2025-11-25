import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, Activity, Wallet, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getAddressAnalytics } from "@/lib/avalanche-sdk";
import { toast } from "sonner";

interface AddressAnalyticsProps {
  address: string;
}

interface AnalyticsData {
  totalTransactions?: number;
  totalReceived?: string;
  totalSent?: string;
  balance?: string;
  firstTransaction?: number;
  lastTransaction?: number;
  transactionCount?: number;
  [key: string]: any;
}

export function AddressAnalytics({ address }: AddressAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getAddressAnalytics(address);
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load address analytics:", err);
      setError(err.message || "Failed to load analytics");
      toast.error("Failed to load address analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [address]);

  if (loading && !analytics) {
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Address Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Address Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" onClick={loadAnalytics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const totalTx = analytics.totalTransactions || analytics.transactionCount || 0;
  const totalReceived = analytics.totalReceived ? Number(analytics.totalReceived) / 1e18 : 0;
  const totalSent = analytics.totalSent ? Number(analytics.totalSent) / 1e18 : 0;
  const balance = analytics.balance ? Number(analytics.balance) / 1e18 : 0;

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Activity className="h-5 w-5 text-primary" />
            Address Analytics
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAnalytics}
            disabled={loading}
            className="hover:bg-primary/20 hover:scale-110 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Current Balance</span>
            </div>
            <p className="text-2xl font-bold gradient-text">{balance.toFixed(6)} AVAX</p>
          </div>
          
          <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold gradient-text">{totalTx}</p>
          </div>
        </div>

        {/* Transaction Stats */}
        <div className="space-y-3">
          <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-green-400" />
                <span className="text-sm font-semibold">Total Received</span>
              </div>
              <Badge variant="default" className="bg-green-500/20 text-green-400">
                <TrendingUp className="h-3 w-3 mr-1" />
                {totalReceived.toFixed(6)} AVAX
              </Badge>
            </div>
          </div>

          <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-semibold">Total Sent</span>
              </div>
              <Badge variant="default" className="bg-orange-500/20 text-orange-400">
                <TrendingDown className="h-3 w-3 mr-1" />
                {totalSent.toFixed(6)} AVAX
              </Badge>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        {analytics.firstTransaction && (
          <div className="pt-3 border-t border-primary/20">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">First Transaction</span>
                <p className="font-mono text-xs mt-1">
                  {new Date(analytics.firstTransaction * 1000).toLocaleDateString()}
                </p>
              </div>
              {analytics.lastTransaction && (
                <div>
                  <span className="text-muted-foreground">Last Transaction</span>
                  <p className="font-mono text-xs mt-1">
                    {new Date(analytics.lastTransaction * 1000).toLocaleDateString()}
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

