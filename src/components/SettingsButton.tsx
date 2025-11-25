import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/contexts/WalletContext";
import { useSim } from "@/contexts/SimContext";
import { SubnetSelector } from "./SubnetSelector";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export function SettingsButton() {
  const { address, isConnected } = useWallet();
  const { simulation, setSimulation } = useSim();
  const navigate = useNavigate();
  const [showNetworkDialog, setShowNetworkDialog] = useState(false);

  const handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Cache cleared");
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      toast.error("Failed to clear cache");
    }
  };

  const handleExportData = () => {
    try {
      const data = {
        wallet: address,
        timestamp: new Date().toISOString(),
        localStorage: { ...localStorage },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `octavia-settings-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Settings exported");
    } catch (error) {
      toast.error("Failed to export settings");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass w-56">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate("/digital-id")}>
          Digital ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Simulation Mode</span>
            <Switch
              checked={simulation}
              onCheckedChange={(checked) => {
                setSimulation(checked);
                toast.info("Simulation mode " + (checked ? "enabled" : "disabled"));
                setTimeout(() => window.location.reload(), 50);
              }}
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => setShowNetworkDialog(true)}>
          Network Settings
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleExportData}>
          Export Settings
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleClearCache}>
          Clear Cache
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {isConnected && address ? (
            <div>
              <div>Wallet: {address.slice(0, 6)}...{address.slice(-4)}</div>
            </div>
          ) : (
            <div>Not connected</div>
          )}
        </div>
      </DropdownMenuContent>
      
      {/* Network Settings Dialog */}
      <Dialog open={showNetworkDialog} onOpenChange={setShowNetworkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Network Settings</DialogTitle>
            <DialogDescription>
              Configure your subnet connection and network preferences
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <SubnetSelector />
          </div>
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}

