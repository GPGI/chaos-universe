import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, Server, Globe, Link2, RefreshCw, Loader2, Copy, Users, Settings, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import * as accountApi from "@/lib/api";
import { toast } from "sonner";

interface CustomSubnetInfo {
  custom_subnet_id?: string;
  avalanche_subnet_id?: string;
  avalanche_blockchain_id?: string;
  avalanche_node_id?: string;
  base_url?: string;
  host?: string;
  port?: string;
  protocol?: string;
  subnet_name?: string;
  rpc_url?: string;
}

export function CustomSubnetInfo() {
  const [subnetInfo, setSubnetInfo] = useState<CustomSubnetInfo | null>(null);
  const [blockchainInfo, setBlockchainInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingBlockchain, setLoadingBlockchain] = useState(false);

  const loadSubnetInfo = async () => {
    setLoading(true);
    try {
      const result = await accountApi.getCustomSubnetInfo();
      if (result.success) {
        setSubnetInfo(result);
      } else {
        console.debug("Failed to load custom subnet info:", result.error);
        setSubnetInfo(null);
      }
    } catch (error) {
      console.error("Error loading custom subnet info:", error);
      setSubnetInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const loadBlockchainInfo = async () => {
    if (!subnetInfo?.subnet_name) return;
    
    setLoadingBlockchain(true);
    try {
      const result = await accountApi.describeAvalancheSubnet(subnetInfo.subnet_name);
      if (result.success && result.parsed) {
        setBlockchainInfo(result.parsed);
      }
    } catch (error) {
      console.error("Error loading blockchain info:", error);
    } finally {
      setLoadingBlockchain(false);
    }
  };

  useEffect(() => {
    loadSubnetInfo();
  }, []);

  useEffect(() => {
    if (subnetInfo?.subnet_name) {
      loadBlockchainInfo();
    }
  }, [subnetInfo?.subnet_name]);

  if (!subnetInfo) {
    return (
      <Card className="glass border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Custom Subnet Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No custom subnet configuration found</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSubnetInfo}
            disabled={loading}
            className="mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-enhanced border-primary/20 card-hover">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 gradient-text">
            <Network className="h-5 w-5 text-primary" />
            Custom Subnet Configuration
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSubnetInfo}
            disabled={loading}
            className="hover:bg-primary/20 hover:scale-110 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subnetInfo.subnet_name && (
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4" />
              Subnet Name
            </Label>
            <p className="text-lg font-bold gradient-text mt-1">{subnetInfo.subnet_name}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subnetInfo.custom_subnet_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Custom Subnet ID</Label>
              <p className="text-sm font-mono break-all">{subnetInfo.custom_subnet_id}</p>
            </div>
          )}

          {subnetInfo.avalanche_subnet_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Avalanche Subnet ID</Label>
              <p className="text-sm font-mono break-all">{subnetInfo.avalanche_subnet_id}</p>
            </div>
          )}

          {subnetInfo.avalanche_blockchain_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Blockchain ID</Label>
              <p className="text-sm font-mono break-all">{subnetInfo.avalanche_blockchain_id}</p>
            </div>
          )}

          {subnetInfo.avalanche_node_id && (
            <div>
              <Label className="text-xs text-muted-foreground">Node ID</Label>
              <p className="text-sm font-mono break-all">{subnetInfo.avalanche_node_id}</p>
            </div>
          )}
        </div>

        {subnetInfo.rpc_url && (
          <div>
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              RPC URL
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm font-mono break-all flex-1">{subnetInfo.rpc_url}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(subnetInfo.rpc_url || "");
                  toast.success("RPC URL copied");
                }}
                className="hover:bg-primary/20"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-primary/20">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Globe className="h-3 w-3" />
            Network Endpoint
          </Label>
          <div className="mt-2 space-y-1">
            {subnetInfo.base_url && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Base URL</Badge>
                <span className="text-xs font-mono">{subnetInfo.base_url}</span>
              </div>
            )}
            {subnetInfo.host && subnetInfo.port && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Host</Badge>
                <span className="text-xs font-mono">
                  {subnetInfo.protocol || "http"}://{subnetInfo.host}:{subnetInfo.port}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Blockchain Describe Information */}
        {blockchainInfo && (
          <div className="pt-4 border-t border-primary/20 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Network className="h-4 w-4" />
                Blockchain Details
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadBlockchainInfo}
                disabled={loadingBlockchain}
                className="h-7 text-xs"
              >
                {loadingBlockchain ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3 mr-1" />
                )}
                Refresh
              </Button>
            </div>

            {/* RPC URLs */}
            {blockchainInfo.rpc_urls && Object.keys(blockchainInfo.rpc_urls).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    RPC URLs ({Object.keys(blockchainInfo.rpc_urls).length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {Object.entries(blockchainInfo.rpc_urls).map(([location, url]: [string, any]) => (
                    <div key={location} className="flex items-center gap-2 p-2 glass-enhanced rounded">
                      <Badge variant="outline" className="text-xs">{location}</Badge>
                      <p className="text-xs font-mono flex-1 break-all">{url}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          navigator.clipboard.writeText(url);
                          toast.success("RPC URL copied");
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Primary Nodes */}
            {blockchainInfo.primary_nodes && blockchainInfo.primary_nodes.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Primary Nodes ({blockchainInfo.primary_nodes.length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {blockchainInfo.primary_nodes.map((node: any, idx: number) => (
                    <div key={idx} className="p-2 glass-enhanced rounded space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">{node.name}</Badge>
                        <p className="text-xs font-mono">{node.node_id}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{node.endpoint}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* L1 Nodes */}
            {blockchainInfo.l1_nodes && blockchainInfo.l1_nodes.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    L1 Nodes ({blockchainInfo.l1_nodes.length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {blockchainInfo.l1_nodes.map((node: any, idx: number) => (
                    <div key={idx} className="p-2 glass-enhanced rounded space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{node.name}</Badge>
                        <p className="text-xs font-mono">{node.node_id}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{node.endpoint}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Wallet Connection Info */}
            {blockchainInfo.wallet_connection && Object.keys(blockchainInfo.wallet_connection).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Wallet Connection
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  {Object.entries(blockchainInfo.wallet_connection).map(([key, value]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between p-2 glass-enhanced rounded">
                      <Label className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</Label>
                      <p className="text-xs font-mono">{value}</p>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Precompile Configs */}
            {blockchainInfo.precompile_configs && Object.keys(blockchainInfo.precompile_configs).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center justify-between w-full text-sm hover:text-primary transition-colors">
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Precompile Configs ({Object.keys(blockchainInfo.precompile_configs).length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-3">
                  {Object.entries(blockchainInfo.precompile_configs).map(([name, config]: [string, any]) => (
                    <div key={name} className="p-3 glass-enhanced rounded space-y-2">
                      <Badge variant="secondary" className="text-xs">{name}</Badge>
                      <div className="space-y-1 text-xs">
                        {config.admin_addresses && (
                          <div>
                            <Label className="text-muted-foreground">Admin:</Label>
                            <p className="font-mono break-all">{config.admin_addresses}</p>
                          </div>
                        )}
                        {config.manager_addresses && (
                          <div>
                            <Label className="text-muted-foreground">Manager:</Label>
                            <p className="font-mono break-all">{config.manager_addresses}</p>
                          </div>
                        )}
                        {config.enabled_addresses && (
                          <div>
                            <Label className="text-muted-foreground">Enabled:</Label>
                            <p className="font-mono break-all">{config.enabled_addresses}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

