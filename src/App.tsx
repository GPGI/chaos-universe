import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { SimProvider } from "@/contexts/SimContext";
import { AccountManagementProvider } from "@/contexts/AccountManagementContext";
import { SubnetProvider } from "@/contexts/SubnetContext";
import { Navigation } from "./components/Navigation";
import { ErrorBoundary } from "./components/ErrorBoundary";
import UnifiedUniverse from "./pages/UnifiedUniverse";
import MarketplaceTreasury from "./pages/MarketplaceTreasury";
import DigitalID from "./pages/DigitalID";
import FinancialHub from "./pages/FinancialHub";
import ChaosVault from "./pages/ChaosVault";
import QuickActionsPage from "./pages/QuickActions";
import PurchaseConfirmation from "./pages/PurchaseConfirmation";
import PlotPurchase from "./pages/PlotPurchase";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import PlanetDetail from "./pages/PlanetDetail";
import BlackMarketDEX from "./pages/BlackMarketDEX";
import NanofiberResearch from "./pages/NanofiberResearch";
import { loadContractAddresses } from "@/lib/contracts";

const queryClient = new QueryClient();

const App = () => {
  // Load contract addresses on app startup
  useEffect(() => {
    loadContractAddresses().then((loaded) => {
      if (loaded) {
        console.log("✓ App: Contract addresses ready");
      } else {
        console.debug("Contract addresses not loaded, some features may not work");
      }
    });
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SimProvider>
          <SubnetProvider>
          <WalletProvider>
              <AccountManagementProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Navigation />
                <Routes>
                  <Route path="/" element={<UnifiedUniverse />} />
                  <Route path="/economy" element={<MarketplaceTreasury />} />
                  <Route path="/financial-hub" element={<FinancialHub />} />
                  <Route path="/chaos-vault" element={<ChaosVault />} />
                  <Route path="/quick-actions" element={<QuickActionsPage />} />
                  <Route path="/digital-id" element={<DigitalID />} />
                  <Route path="/plot-purchase" element={<PlotPurchase />} />
                  <Route path="/purchase-confirmation" element={<PurchaseConfirmation />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/planet/:planetId" element={<PlanetDetail />} />
                  <Route path="/black-market-dex" element={<BlackMarketDEX />} />
                  <Route path="/nanofiber-research" element={<NanofiberResearch />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
            </AccountManagementProvider>
          </WalletProvider>
          </SubnetProvider>
        </SimProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
