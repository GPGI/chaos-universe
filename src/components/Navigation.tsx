import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Globe, Wallet } from "lucide-react";
import { WalletConnectButton } from "./WalletConnectButton";
import { SettingsButton } from "./SettingsButton";
import { useWallet } from "@/contexts/WalletContext";
import { useDigitalID } from "@/hooks/useDigitalID";
import { useEffect, useRef } from "react";
import { animate } from "animejs";

export const Navigation = () => {
  const location = useLocation();
  const { address, isConnected } = useWallet();
  const { hasDigitalID } = useDigitalID();
  const chaosVaultButtonRef = useRef<HTMLAnchorElement>(null);
  // Admin address from backend-loaded addresses (localStorage) or env fallback
  let adminAddress: string | undefined = (import.meta as any).env?.VITE_ADMIN_ADDRESS as string | undefined;
  try {
    const stored = localStorage.getItem("contract_addresses");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.adminAddress && typeof parsed.adminAddress === "string") {
        adminAddress = parsed.adminAddress;
      }
    }
  } catch { }
  const isAdmin = Boolean(
    isConnected &&
    hasDigitalID &&
    adminAddress &&
    address &&
    adminAddress.toLowerCase() === address.toLowerCase()
  );

  const navItems = [
    { path: "/", label: "Universe", icon: Globe },
    { path: "/financial-hub", label: "Financial Hub", icon: ShoppingCart },
    { path: "/chaos-vault", label: "Chaos Vault", icon: Wallet, highlight: true },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Globe }] as const : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-primary/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.jpg"
              alt="logo"
              className="h-12 w-12 rounded-lg"
            />
          </Link>

          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const isHighlighted = (item as any).highlight;
              const linkRef = isHighlighted ? chaosVaultButtonRef : null;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  ref={linkRef}
                  onMouseEnter={() => {
                    if (isHighlighted && !isActive && chaosVaultButtonRef.current) {
                      const button = chaosVaultButtonRef.current.querySelector("button") as HTMLElement;
                      if (button) {
                        animate(button, {
                          boxShadow: [
                            "0 0 0px rgba(139, 92, 246, 0)",
                            "0 0 20px rgba(139, 92, 246, 0.5)",
                            "0 0 30px rgba(139, 92, 246, 0.7)",
                          ],
                          duration: 600,
                          ease: "outExpo",
                        });
                      }
                    }
                  }}
                  onMouseLeave={() => {
                    if (isHighlighted && !isActive && chaosVaultButtonRef.current) {
                      const button = chaosVaultButtonRef.current.querySelector("button") as HTMLElement;
                      if (button) {
                        animate(button, {
                          boxShadow: "0 0 0px rgba(139, 92, 246, 0)",
                          duration: 400,
                          ease: "outExpo",
                        });
                      }
                    }
                  }}
                >
                  <Button
                    variant={isActive ? "default" : isHighlighted ? "glass" : "glass"}
                    size="sm"
                    className={`gap-2 transition-all duration-300 ${isHighlighted && !isActive
                      ? "border border-primary/30 hover:border-primary/60 hover:bg-primary/10"
                      : ""
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}

            <div className="ml-4 flex items-center gap-2">
              <SettingsButton />
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
