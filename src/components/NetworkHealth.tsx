import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, RefreshCw, Activity, Server, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { getNetworkMetrics } from "@/lib/avalanche-sdk";
import { toast } from "sonner";

interface NetworkHealthProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface NetworkMetrics {
  status?: string;
  health?: string;
  uptime?: number;
  validators?: number;
  throughput?: number;
  latency?: number;
  [key: string]: any;
}

export function NetworkHealth({ autoRefresh = true, refreshInterval = 30000 }: NetworkHealthProps) {
  const [metrics, setMetrics] = useState<NetworkMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getNetworkMetrics();
      setMetrics(data);
    } catch (err: any) {
      console.error("Failed to load network metrics:", err);
      setError(err.message || "Failed to load network metrics");
      // Don't show toast for auto-refresh failures
      if (!autoRefresh) {
        toast.error("Failed to load network metrics");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const isHealthy = metrics?.status === "healthy" || metrics?.health === "healthy" || metrics?.status === "ok";
  const uptime = metrics?.uptime || (isHealthy ? 100 : 0);
  const validators = metrics?.validators || 0;
  const throughput = metrics?.throughput || 0;
  const latency = metrics?.latency || 0;

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Activity className="h-5 w-5 text-primary" />
            Network Health
          </CardTitle>
          <div className="flex items-center gap-2">
            {autoRefresh && (
              <Badge variant="outline" className="text-xs">
                Auto-refresh
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMetrics}
              disabled={loading}
              className="hover:bg-primary/20 hover:scale-110 transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !metrics ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" onClick={loadMetrics} className="mt-4">
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Network Status</span>
              <Badge
                variant={isHealthy ? "default" : "destructive"}
                className={isHealthy ? "pulse-glow" : ""}
              >
                {isHealthy ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Healthy
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Degraded
                  </>
                )}
              </Badge>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Validators</span>
                </div>
                <p className="text-2xl font-bold gradient-text">{validators}</p>
              </div>

              <div className="glass-enhanced p-4 rounded-lg border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Throughput</span>
                </div>
                <p className="text-2xl font-bold gradient-text">{throughput.toFixed(2)} TPS</p>
              </div>
            </div>

            {/* Uptime */}
            {uptime > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Uptime</span>
                  <span className="text-sm text-muted-foreground">
                    {((uptime / 100) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress value={uptime} className="h-2" />
              </div>
            )}

            {/* Latency */}
            {latency > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Average Latency</span>
                  <Badge
                    variant={latency < 1000 ? "default" : latency < 2000 ? "secondary" : "destructive"}
                  >
                    {latency.toFixed(0)}ms
                  </Badge>
                </div>
              </div>
            )}

            {/* Additional Info */}
            {metrics && Object.keys(metrics).length > 0 && (
              <div className="pt-3 border-t border-primary/20">
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

