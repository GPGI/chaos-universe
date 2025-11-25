import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ExternalLink, Loader2, RefreshCw, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { getTransactionHistory } from "@/lib/avalanche-sdk";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  status: "success" | "pending" | "failed";
  type: "transfer" | "contract" | "other";
}

interface TransactionHistoryProps {
  address: string;
  limit?: number;
}

export function TransactionHistory({ address, limit = 50 }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getTransactionHistory(address, limit);
      
      // Transform ChainKit data to our format
      const formatted = data.map((tx: any) => ({
        hash: tx.hash || tx.transactionHash,
        from: tx.from || tx.fromAddress,
        to: tx.to || tx.toAddress,
        value: tx.value ? (Number(tx.value) / 1e18).toFixed(6) : "0",
        timestamp: tx.timestamp || tx.blockTimestamp || Date.now() / 1000,
        status: tx.status === "success" || tx.status === 1 ? "success" : 
                tx.status === "pending" ? "pending" : "failed",
        type: tx.to ? (tx.to.toLowerCase() === address.toLowerCase() ? "transfer" : "contract") : "other",
      }));
      
      setTransactions(formatted);
    } catch (err: any) {
      console.error("Failed to load transaction history:", err);
      setError(err.message || "Failed to load transactions");
      toast.error("Failed to load transaction history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [address, limit]);

  const getExplorerUrl = (hash: string) => {
    const rpcUrl = import.meta.env.VITE_AVALANCHE_RPC || "";
    if (rpcUrl.includes("api.avax.network")) {
      return `https://snowtrace.io/tx/${hash}`;
    }
    if (rpcUrl.includes("api.avax-test.network")) {
      return `https://testnet.snowtrace.io/tx/${hash}`;
    }
    return null;
  };

  if (loading && transactions.length === 0) {
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
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

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <History className="h-5 w-5 text-primary" />
            Transaction History ({transactions.length})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadTransactions}
            disabled={loading}
            className="hover:bg-primary/20 hover:scale-110 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
            <Button variant="outline" onClick={loadTransactions} className="mt-4">
              Retry
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {transactions.map((tx, index) => {
                const explorerUrl = getExplorerUrl(tx.hash);
                const isIncoming = tx.to.toLowerCase() === address.toLowerCase();
                const date = new Date(tx.timestamp * 1000);
                
                return (
                  <div
                    key={index}
                    className="glass-enhanced p-4 rounded-lg border border-primary/30 hover:border-primary/50 transition-all scale-in"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {isIncoming ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-400" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-orange-400" />
                        )}
                        <Badge
                          variant={
                            tx.status === "success"
                              ? "default"
                              : tx.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {tx.status}
                        </Badge>
                        <Badge variant="outline">{tx.type}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(date, { addSuffix: true })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {isIncoming ? "From" : "To"}:
                        </span>
                        <span className="font-mono text-xs">
                          {(isIncoming ? tx.from : tx.to).slice(0, 6)}...{(isIncoming ? tx.from : tx.to).slice(-4)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Amount:</span>
                        <span className={`text-lg font-bold ${isIncoming ? "text-green-400" : "text-orange-400"}`}>
                          {isIncoming ? "+" : "-"}{tx.value} AVAX
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-mono">
                          {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                        </span>
                        {explorerUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(explorerUrl, "_blank")}
                            className="gap-1 h-7 text-xs hover:bg-primary/20"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Explorer
                          </Button>
                        )}
                      </div>
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

