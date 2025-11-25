import { useSubnet } from "@/contexts/SubnetContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Network, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function SubnetSelector() {
  const {
    currentSubnet,
    availableSubnets,
    loading,
    loadSubnets,
    selectSubnet,
    subnetStatus,
    refreshSubnetInfo,
  } = useSubnet();

  return (
    <Card className="glass-enhanced border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Subnet Connection</span>
          </div>
          <div className="flex items-center gap-2">
            {subnetStatus === "connected" ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : subnetStatus === "disconnected" ? (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            ) : (
              <Badge variant="outline">Unknown</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshSubnetInfo}
              disabled={loading || !currentSubnet}
              className="h-6 w-6"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <Select
          value={currentSubnet?.name || ""}
          onValueChange={selectSubnet}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select subnet...">
              {currentSubnet ? (
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4" />
                  <span>{currentSubnet.name}</span>
                </div>
              ) : (
                "Select subnet..."
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availableSubnets.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                {loading ? "Loading subnets..." : "No subnets available"}
              </div>
            ) : (
              availableSubnets.map((subnet) => (
                <SelectItem key={subnet.name} value={subnet.name}>
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    <span>{subnet.name}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        {currentSubnet?.rpc_url && (
          <div className="mt-3 p-2 glass-enhanced rounded text-xs">
            <div className="text-muted-foreground mb-1">RPC URL</div>
            <div className="font-mono break-all">{currentSubnet.rpc_url}</div>
          </div>
        )}

        {availableSubnets.length === 0 && !loading && (
          <Button
            variant="outline"
            size="sm"
            onClick={loadSubnets}
            className="w-full mt-3"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Refresh Subnets
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

