import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Coins, Info } from "lucide-react";
import { getTokenMetadata } from "@/lib/avalanche-sdk";
import { toast } from "sonner";

interface TokenMetadataProps {
  tokenAddress: string;
  showDetails?: boolean;
}

interface TokenData {
  name?: string;
  symbol?: string;
  decimals?: number;
  totalSupply?: string;
  [key: string]: any;
}

export function TokenMetadata({ tokenAddress, showDetails = true }: TokenMetadataProps) {
  const [metadata, setMetadata] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetadata = async () => {
    if (!tokenAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getTokenMetadata(tokenAddress);
      if (data && (data.name || data.symbol)) {
        setMetadata(data);
      } else {
        // Try one more time with a small delay (sometimes RPC needs a moment)
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryData = await getTokenMetadata(tokenAddress);
        if (retryData && (retryData.name || retryData.symbol)) {
          setMetadata(retryData);
        } else {
          setError("Token metadata not available. The contract may not be an ERC20 token or RPC is unavailable.");
        }
      }
    } catch (err: any) {
      console.error("Failed to load token metadata:", err);
      setError(err.message || "Failed to load token metadata");
      // Don't show toast for metadata errors (not critical)
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenAddress) {
      loadMetadata();
    }
  }, [tokenAddress]);

  if (!tokenAddress) {
    return null;
  }

  if (loading && !metadata) {
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4" />
            Token Metadata
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

  if (error && !metadata) {
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4" />
            Token Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p className="mb-2">{error}</p>
            <div className="space-y-2">
              <p className="text-xs font-mono break-all text-muted-foreground">
                {tokenAddress}
              </p>
              <Button variant="outline" size="sm" onClick={loadMetadata} className="mt-2">
                <RefreshCw className="h-3 w-3 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metadata) {
    // Show basic contract info even without metadata
    return (
      <Card className="glass-enhanced border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4" />
            Token Contract
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-muted-foreground">Contract Address</span>
              <p className="text-xs font-mono break-all mt-1">{tokenAddress}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadMetadata} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Load Metadata
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSupply = metadata.totalSupply 
    ? (Number(metadata.totalSupply) / Math.pow(10, metadata.decimals || 18)).toFixed(2)
    : "N/A";

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Coins className="h-4 w-4 text-primary" />
            {metadata.name || "Token"} ({metadata.symbol || "N/A"})
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMetadata}
            disabled={loading}
            className="hover:bg-primary/20 hover:scale-110 transition-all h-6 w-6 p-0"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      {showDetails && (
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Symbol</span>
              <p className="font-semibold">{metadata.symbol || "N/A"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Decimals</span>
              <p className="font-semibold">{metadata.decimals || "N/A"}</p>
            </div>
          </div>
          
          {metadata.totalSupply && (
            <div className="pt-2 border-t border-primary/20">
              <span className="text-sm text-muted-foreground">Total Supply</span>
              <p className="text-lg font-bold gradient-text">{totalSupply} {metadata.symbol}</p>
            </div>
          )}

          <div className="pt-2 border-t border-primary/20">
            <span className="text-xs text-muted-foreground font-mono block mb-1">Contract</span>
            <p className="text-xs font-mono break-all">{tokenAddress}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

