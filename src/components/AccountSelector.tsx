import { useAccountManagement } from "@/contexts/AccountManagementContext";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wallet, Users, Coins } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";

export function AccountSelector() {
  const { accounts, selectedAccount, setSelectedAccount, mainFundedAccount, isMainFundedAccount } = useAccountManagement();
  const { address } = useWallet();

  // Check if current address is the main funded account
  const isMainFunded = address?.toLowerCase() === mainFundedAccount.toLowerCase();
  
  // Add main wallet as an option
  const allAccounts = [
    {
      id: "main",
      name: isMainFunded ? "Main Funded Account" : "Main Wallet",
      wallet_address: address || "",
      type: "personal" as const,
      is_active: true,
      isFunded: isMainFunded,
    },
    ...accounts,
  ];

  const currentAccount = selectedAccount || allAccounts[0];

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentAccount.id}
        onValueChange={(value) => {
          if (value === "main") {
            setSelectedAccount(null);
          } else {
            const account = accounts.find((a) => a.id === value);
            if (account) {
              setSelectedAccount(account);
            }
          }
        }}
      >
        <SelectTrigger className="w-[220px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              {currentAccount.id === "main" && (currentAccount as any).isFunded ? (
                <Coins className="h-4 w-4 text-primary" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              <span>{currentAccount.name}</span>
              {currentAccount.id === "main" && (currentAccount as any).isFunded && (
                <Badge variant="default" className="ml-1 text-xs">Funded</Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allAccounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center gap-2">
                {account.id === "main" ? (
                  (account as any).isFunded ? (
                    <Coins className="h-4 w-4 text-primary" />
                  ) : (
                    <Wallet className="h-4 w-4" />
                  )
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span>{account.name}</span>
                {account.id === "main" && (account as any).isFunded && (
                  <Badge variant="default" className="ml-2 text-xs">Funded</Badge>
                )}
                {account.id !== "main" && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {account.type}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedAccount && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedAccount(null)}
        >
          Use Main Wallet
        </Button>
      )}
    </div>
  );
}

