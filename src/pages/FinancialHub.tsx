import { useWallet } from "@/contexts/WalletContext";
import { useAccountManagement } from "@/contexts/AccountManagementContext";
import { hasLandContract } from "@/lib/contracts";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useLandPlots } from "@/hooks/useLandPlots";
import { useEffect, useState, useMemo } from "react";
import { getPortfolio, projectPortfolio, getLoanEligibility } from "@/lib/api";
import { getRpcProvider } from "@/lib/wallet";
import { ethers } from "ethers";
import { animate, stagger } from "animejs";
import { PortfolioWizard } from "@/components/financial-hub/PortfolioWizard";
import { PortfolioDashboard } from "@/components/financial-hub/PortfolioDashboard";

/**
 * Financial Hub - Portfolio Management Dashboard
 */
export default function FinancialHub() {
  const { address } = useWallet();
  const {
    userPlots: mainUserPlots,
    pendingPlots: mainPendingPlots,
    refresh: refreshPlots
  } = useLandPlots();
  const { avalancheKeys, universalWallets } = useAccountManagement();

  // Aggregate plots from all sources
  const [allUserPlots, setAllUserPlots] = useState<number[]>([]);
  const [allPendingPlots, setAllPendingPlots] = useState<number[]>([]);

  // Fetch plots for all addresses
  useEffect(() => {
    const fetchAllPlots = async () => {
      if (!hasLandContract()) return;

      const addressesToCheck: string[] = [];
      if (address) addressesToCheck.push(address);

      if (avalancheKeys && avalancheKeys.length > 0) {
        avalancheKeys.forEach((key) => {
          const keyAddr = key.evm_address || key.address || key.evmAddress;
          if (keyAddr && !addressesToCheck.includes(keyAddr)) {
            addressesToCheck.push(keyAddr);
          }
        });
      }

      if (universalWallets && universalWallets.length > 0) {
        universalWallets.forEach((wallet) => {
          if (wallet.address && !addressesToCheck.includes(wallet.address)) {
            addressesToCheck.push(wallet.address);
          }
        });
      }

      if (addressesToCheck.length === 0) {
        setAllUserPlots(mainUserPlots || []);
        setAllPendingPlots(mainPendingPlots || []);
        return;
      }

      try {
        const { getLandContract, hasLandContract } = await import("@/lib/contracts");
        if (!hasLandContract()) return;

        const contract = getLandContract();
        const allOwnedPlots = new Set<number>();
        const allPendingPlotsSet = new Set<number>();

        for (const addr of addressesToCheck) {
          try {
            const batchSize = 100;
            const total = 1000;
            const checks = [];

            for (let i = 1; i <= total; i += batchSize) {
              const ids = Array.from({ length: Math.min(batchSize, total - i + 1) }, (_, idx) => i + idx);
              const accounts = new Array(ids.length).fill(addr);
              checks.push(
                contract.balanceOfBatch(accounts, ids).catch(() => new Array(ids.length).fill(0n))
              );
            }

            const results = await Promise.all(checks);
            let plotId = 1;
            for (const batch of results) {
              for (const balance of batch) {
                if (balance > 0n) {
                  allOwnedPlots.add(plotId);
                }
                plotId++;
              }
            }

            for (let i = 1; i <= 500; i++) {
              try {
                const buyer = await contract.pendingBuyer(i).catch(() => null);
                if (buyer && buyer.toLowerCase() === addr.toLowerCase()) {
                  const minted = await contract.plotMinted(i).catch(() => true);
                  if (!minted) {
                    allPendingPlotsSet.add(i);
                  }
                }
              } catch { }
            }
          } catch (error) {
            console.debug(`Failed to fetch plots for address ${addr}:`, error);
          }
        }

        setAllUserPlots(Array.from(allOwnedPlots).sort((a, b) => a - b));
        setAllPendingPlots(Array.from(allPendingPlotsSet).sort((a, b) => a - b));
      } catch (error) {
        console.error("Failed to fetch all plots:", error);
        setAllUserPlots(mainUserPlots || []);
        setAllPendingPlots(mainPendingPlots || []);
      }
    };

    fetchAllPlots();
    const interval = setInterval(fetchAllPlots, 30000);
    return () => clearInterval(interval);
  }, [address, avalancheKeys, universalWallets, mainUserPlots, mainPendingPlots]);

  const { totalValue: hookTotalValue } = usePortfolio(address);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [csnBalance, setCsnBalance] = useState<string>("0");

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!address) {
        setPortfolioData(null);
        return;
      }
      try {
        const portfolio = await getPortfolio(address);
        setPortfolioData(portfolio?.portfolio || null);
      } catch (error: any) {
        console.debug("Portfolio not found or backend not available:", error.message);
        setPortfolioData(null);
      }
    };
    fetchPortfolioData();
    const interval = setInterval(fetchPortfolioData, 30000);
    return () => clearInterval(interval);
  }, [address]);

  const [marketView, setMarketView] = useState<"primary" | "secondary">("primary");
  const [created, setCreated] = useState<boolean>(() => {
    try {
      return localStorage.getItem("fh_created") === "1";
    } catch {
      return false;
    }
  });

  const [primaryPortfolio, setPrimaryPortfolio] = useState<any | null>(null);
  const [speculativePortfolio, setSpeculativePortfolio] = useState<any | null>(null);
  const [projection, setProjection] = useState<any | null>(null);
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);

  const totalValue = useMemo(() => {
    if (primaryPortfolio?.holdings && primaryPortfolio.holdings.length > 0) {
      return primaryPortfolio.holdings.reduce((sum: number, holding: any) => {
        const costBasis = Number(holding.cost_basis) || 0;
        return sum + costBasis;
      }, 0);
    }
    return hookTotalValue || 0;
  }, [primaryPortfolio, hookTotalValue]);

  // Fetch CSN balance
  useEffect(() => {
    const loadCSNBalance = async () => {
      if (!address) {
        setCsnBalance("0");
        return;
      }
      try {
        const provider = getRpcProvider();
        if (provider) {
          const bal = await provider.getBalance(address);
          setCsnBalance(ethers.formatEther(bal));
        }
      } catch (error) {
        console.debug("Failed to load CSN balance:", error);
      }
    };
    loadCSNBalance();
    const interval = setInterval(loadCSNBalance, 10000);
    return () => clearInterval(interval);
  }, [address]);

  // Auto-refresh plots
  useEffect(() => {
    if (address) {
      const timer = setTimeout(() => refreshPlots(), 1000);
      return () => clearTimeout(timer);
    }
  }, [address, refreshPlots]);

  // Fetch detailed portfolio data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address) {
        setPortfolioData(null);
        setPrimaryPortfolio(null);
        setSpeculativePortfolio(null);
        return;
      }
      try {
        const [p, pPrimary, proj] = await Promise.all([
          getPortfolio(address).catch(() => null),
          getPortfolio(address, "primary").catch(() => null),
          projectPortfolio({ wallet: address }).catch(() => null),
        ]);

        if (!cancelled) {
          let primaryPortfolioData = null;

          if (p?.portfolios) {
            primaryPortfolioData = p.primary || p.portfolios.primary || pPrimary?.portfolio || null;
            setSpeculativePortfolio(p.speculative || p.portfolios.secondary || null);
            setPortfolioData(primaryPortfolioData);
          } else if (p?.portfolio) {
            const portfolio = p.portfolio;
            if (portfolio.portfolio_type === "primary") {
              primaryPortfolioData = portfolio;
              setPortfolioData(portfolio);
            } else {
              setSpeculativePortfolio(portfolio);
            }
          } else if (pPrimary?.portfolio) {
            primaryPortfolioData = pPrimary.portfolio;
            setPortfolioData(pPrimary.portfolio);
          }

          setPrimaryPortfolio(primaryPortfolioData);

          const primary = p?.primary || p?.portfolios?.primary || p?.portfolio;
          if (primary?.recurring_investment_monthly != null) {
            setMonthlyContribution(Number(primary.recurring_investment_monthly) || 0);
          }
          setProjection(proj || null);
        }
      } catch (error: any) {
        if (!cancelled) {
          console.debug("Failed to fetch portfolio data:", error.message);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  // Animate cards on mount
  useEffect(() => {
    if (created && address) {
      animate(".anime-card", {
        opacity: [0, 1],
        translateY: [30, 0],
        delay: stagger(100),
        duration: 600,
        ease: "outExpo",
      });
    }
  }, [created, address]);

  if (!address) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 pt-20">
        <Card className="max-w-md w-full glass border-primary/20">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>
              Connect your wallet to access the Financial Hub
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!created) {
    return (
      <PortfolioWizard
        address={address}
        onComplete={() => setCreated(true)}
        onMarketViewChange={setMarketView}
      />
    );
  }

  return (
    <PortfolioDashboard
      address={address}
      portfolioData={portfolioData}
      primaryPortfolio={primaryPortfolio}
      speculativePortfolio={speculativePortfolio}
      totalValue={totalValue}
      csnBalance={csnBalance}
      monthlyContribution={monthlyContribution}
      projection={projection}
      marketView={marketView}
      onMarketViewChange={setMarketView}
    />
  );
}
