import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/WalletContext";
import { Wallet, Smartphone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function WalletConnectButton({ onConnect }: { onConnect?: (addr: string) => void }) {
  const { address, isConnected, connect, disconnect } = useWallet();
  const isMobile = useIsMobile();

  const handleConnect = async (useWalletConnect: boolean) => {
    await connect(useWalletConnect);
    if (address && onConnect) {
      onConnect(address);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (isConnected) {
    return (
      <Button 
        variant="default" 
        size="sm" 
        onClick={handleDisconnect}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </Button>
    );
  }

  // Auto-connect with WalletConnect on mobile
  if (isMobile) {
    return (
      <Button 
        variant="cosmic" 
        size="sm" 
        onClick={() => handleConnect(true)}
        className="gap-2"
      >
        <Smartphone className="h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  // Desktop: show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="cosmic" size="sm" className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass">
        <DropdownMenuItem onClick={() => handleConnect(false)}>
          <Wallet className="mr-2 h-4 w-4" />
          Browser Wallet
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleConnect(true)}>
          <Smartphone className="mr-2 h-4 w-4" />
          WalletConnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
