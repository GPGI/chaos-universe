import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, ShoppingCart, Star, Trophy, TrendingUp, Zap, Shield, ArrowLeft } from "lucide-react";
import { useLandPlots } from "@/hooks/useLandPlots";
import { useTreasury } from "@/hooks/useTreasury";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useWallet } from "@/contexts/WalletContext";
import { usePortfolioManagers } from "@/hooks/usePortfolioManagers";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useDigitalID } from "@/hooks/useDigitalID";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function QuickActionsPage() {
  const { address, signer } = useWallet();
  const { buyPlotPhase1AVAX, buyPlotPhase1USDC } = useLandPlots();
  const { balances } = useTreasury();
  const { portfolios } = usePortfolio(address);
  const { managers, loading: managersLoading, applyAsManager } = usePortfolioManagers();
  const { listings, loading: marketplaceLoading } = useMarketplace();
  const { hasDigitalID, checkDigitalID } = useDigitalID();
  const navigate = useNavigate();
  const [plotId, setPlotId] = useState<string>("");
  const [pmName, setPmName] = useState<string>("");
  const [pmBio, setPmBio] = useState<string>("");
  const [pmRoi, setPmRoi] = useState<number>(20);
  const [pmSharpe, setPmSharpe] = useState<number>(1);
  const [purchasing, setPurchasing] = useState(false);

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold">Quick Actions</h1>
          </div>
        </div>

        {/* Portfolio Manager Application */}
        <Card>
          <CardHeader>
            <CardTitle>Apply as Portfolio Manager</CardTitle>
            <CardDescription>Share your details to request approval</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-1">Display Name</div>
              <Input value={pmName} onChange={(e) => setPmName(e.target.value)} placeholder="e.g., Octavia Capital" />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-medium mb-1">Bio</div>
              <Input value={pmBio} onChange={(e) => setPmBio(e.target.value)} placeholder="Short description" />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">ROI (annualized %)</div>
              <Input type="number" value={pmRoi} onChange={(e) => setPmRoi(parseFloat(e.target.value || "0"))} />
            </div>
            <div>
              <div className="text-sm font-medium mb-1">Sharpe Ratio</div>
              <Input type="number" value={pmSharpe} onChange={(e) => setPmSharpe(parseFloat(e.target.value || "0"))} />
            </div>
            <div className="md:col-span-4">
              <Button
                disabled={!address || !pmName}
                onClick={async () => {
                  if (!address || !pmName) return;
                  try {
                    await applyAsManager({
                      wallet_address: address,
                      display_name: pmName,
                      bio: pmBio,
                      roi_annualized: pmRoi / 100,
                      sharpe_ratio: pmSharpe,
                    });
                    setPmName("");
                    setPmBio("");
                    setPmRoi(20);
                    setPmSharpe(1);
                  } catch {}
                }}
              >
                Submit Application
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Phase 1 Plot Purchase */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Phase 1 Plot Purchase</CardTitle>
              <CardDescription>Pay AVAX or USDC; admin activates and mints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <Input value={plotId} onChange={(e) => setPlotId(e.target.value)} placeholder="Plot ID" />
                  <Button
                    disabled={purchasing || !plotId}
                    onClick={async () => {
                      const id = parseInt(plotId);
                      if (!id || id <= 0) {
                        toast.error("Please enter a valid Plot ID");
                        return;
                      }
                      
                      // Check Digital ID before purchase
                      await checkDigitalID();
                      if (!hasDigitalID) {
                        toast.error("Digital ID required. Redirecting to create one...");
                        setTimeout(() => {
                          navigate(`/digital-id?redirect=/quick-actions&plotId=${id}&paymentMethod=AVAX`);
                        }, 1500);
                        return;
                      }

                      setPurchasing(true);
                      try {
                        if (!signer || !address) {
                          toast.error("Wallet not connected");
                          return;
                        }
                        const { getLandContract, hasLandContract } = await import("@/lib/contracts");
                        if (!hasLandContract()) {
                          toast.error("Land contract address not set");
                          setPurchasing(false);
                          return;
                        }
                        const contract = getLandContract(signer);
                        const price = await contract.phase1PriceAVAX();
                        const txHash = await buyPlotPhase1AVAX(id);
                        if (txHash) {
                          // Add plot to primary portfolio
                          try {
                            const { getPortfolio, upsertPortfolio } = await import("@/lib/api");
                            // Convert price from wei to AVAX (1e18)
                            const priceBigInt = typeof price === 'bigint' ? price : BigInt(String(price));
                            const priceNum = Number(priceBigInt) / 1e18;
                            
                            // Get existing portfolio or create new one
                            let portfolioData;
                            try {
                              portfolioData = await getPortfolio(address);
                            } catch {
                              // Portfolio doesn't exist, will create it
                              portfolioData = null;
                            }
                            
                            // Get existing holdings or start fresh
                            const existingHoldings = portfolioData?.portfolio?.holdings || [];
                            
                            // Add the new plot holding
                            const newHolding = {
                              asset_type: "plot",
                              identifier: String(id),
                              cost_basis: priceNum,
                              yield_annual: 0.05, // Default 5% annual yield for plots
                            };
                            
                            // Check if plot already exists in holdings
                            const plotExists = existingHoldings.some(
                              (h: any) => h.asset_type === "plot" && h.identifier === String(id)
                            );
                            
                            if (!plotExists) {
                              await upsertPortfolio({
                                wallet: address,
                                holdings: [...existingHoldings, newHolding],
                                portfolio_type: "primary",
                              });
                              toast.success("Plot added to primary portfolio");
                            }
                          } catch (portfolioError: any) {
                            console.error("Error adding to portfolio:", portfolioError);
                            // Don't fail the purchase if portfolio update fails
                            toast.warning("Purchase successful, but failed to add to portfolio");
                          }
                          
                          // Navigate to confirmation page
                          const priceStr = typeof price === 'bigint' ? price.toString() : String(price);
                          navigate(`/purchase-confirmation?plotId=${id}&txHash=${txHash}&price=${priceStr}&currency=AVAX`);
                        }
                      } catch (error: any) {
                        console.error("Purchase error:", error);
                        toast.error(error.message || "Failed to purchase plot");
                      } finally {
                        setPurchasing(false);
                      }
                    }}
                  >
                    {purchasing ? "Processing..." : "Pay AVAX"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={purchasing || !plotId}
                    onClick={async () => {
                      const id = parseInt(plotId);
                      if (!id || id <= 0) {
                        toast.error("Please enter a valid Plot ID");
                        return;
                      }
                      
                      // Check Digital ID before purchase
                      await checkDigitalID();
                      if (!hasDigitalID) {
                        toast.error("Digital ID required. Redirecting to create one...");
                        setTimeout(() => {
                          navigate(`/digital-id?redirect=/quick-actions&plotId=${id}&paymentMethod=USDC`);
                        }, 1500);
                        return;
                      }

                      setPurchasing(true);
                      try {
                        if (!signer || !address) {
                          toast.error("Wallet not connected");
                          return;
                        }
                        const { getLandContract, hasLandContract } = await import("@/lib/contracts");
                        if (!hasLandContract()) {
                          toast.error("Land contract address not set");
                          setPurchasing(false);
                          return;
                        }
                        const contract = getLandContract(signer);
                        const price = await contract.phase1PriceUSDC();
                        const txHash = await buyPlotPhase1USDC(id);
                        if (txHash) {
                          // Add plot to primary portfolio
                          try {
                            const { getPortfolio, upsertPortfolio } = await import("@/lib/api");
                            // Convert price from smallest unit to USDC (1e6 decimals)
                            const priceBigInt = typeof price === 'bigint' ? price : BigInt(String(price));
                            const priceNum = Number(priceBigInt) / 1e6;
                            
                            // Get existing portfolio or create new one
                            let portfolioData;
                            try {
                              portfolioData = await getPortfolio(address);
                            } catch {
                              // Portfolio doesn't exist, will create it
                              portfolioData = null;
                            }
                            
                            // Get existing holdings or start fresh
                            const existingHoldings = portfolioData?.portfolio?.holdings || [];
                            
                            // Add the new plot holding
                            const newHolding = {
                              asset_type: "plot",
                              identifier: String(id),
                              cost_basis: priceNum,
                              yield_annual: 0.05, // Default 5% annual yield for plots
                            };
                            
                            // Check if plot already exists in holdings
                            const plotExists = existingHoldings.some(
                              (h: any) => h.asset_type === "plot" && h.identifier === String(id)
                            );
                            
                            if (!plotExists) {
                              await upsertPortfolio({
                                wallet: address,
                                holdings: [...existingHoldings, newHolding],
                                portfolio_type: "primary",
                              });
                              toast.success("Plot added to primary portfolio");
                            }
                          } catch (portfolioError: any) {
                            console.error("Error adding to portfolio:", portfolioError);
                            // Don't fail the purchase if portfolio update fails
                            toast.warning("Purchase successful, but failed to add to portfolio");
                          }
                          
                          // Navigate to confirmation page
                          const priceStr = typeof price === 'bigint' ? price.toString() : String(price);
                          navigate(`/purchase-confirmation?plotId=${id}&txHash=${txHash}&price=${priceStr}&currency=USDC`);
                        }
                      } catch (error: any) {
                        console.error("Purchase error:", error);
                        toast.error(error.message || "Failed to purchase plot");
                      } finally {
                        setPurchasing(false);
                      }
                    }}
                  >
                    {purchasing ? "Processing..." : "Pay USDC"}
                  </Button>
                </div>
                {!hasDigitalID && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    ⚠️ Digital ID required for plot purchase. You'll be redirected to create one.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Treasury Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Treasury Tools</CardTitle>
              <CardDescription>Manage balances, recurring payments, auto-reinvest</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Deposit
                </Button>
                <Button variant="outline" className="gap-2">
                  <ArrowDownRight className="h-4 w-4" />
                  Withdraw
                </Button>
                <Button variant="outline" className="gap-2">
                  <Zap className="h-4 w-4" />
                  Reinvest
                </Button>
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Transfer
                </Button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">AVAX Balance</span>
                  <span className="text-base font-bold">{balances.avax}</span>
                </div>
                <Progress value={65} className="h-2" />
                {Object.entries(balances.tokens).map(([addrKey, token]) => (
                  <div key={addrKey} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{(token as any).symbol}</span>
                      <span className="text-sm font-bold">{(token as any).balance}</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Inter-Portfolio Transfer */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Inter-Portfolio Transfer</CardTitle>
              <CardDescription>Move funds between your Primary and Speculative portfolios</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">From</label>
                <select className="glass w-full p-2 rounded border border-primary/20">
                  <option value="primary">Primary Portfolio</option>
                  <option value="secondary">Speculative Portfolio</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <select className="glass w-full p-2 rounded border border-primary/20">
                  <option value="secondary">Speculative Portfolio</option>
                  <option value="primary">Primary Portfolio</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (xBGL)</label>
                <Input placeholder="0.00" />
              </div>
              <div className="md:col-span-3 flex items-center gap-2">
                <Button>Transfer</Button>
                <Button variant="outline">Review</Button>
              </div>
            </CardContent>
          </Card>

          {/* Instruments Catalog */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Instruments</CardTitle>
              <CardDescription>Catalog of financial instruments (Phase 1 placeholders)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                <Card className="glass p-4">
                  <CardTitle className="text-lg mb-2">Spot Assets</CardTitle>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>AVAX, xBGL, USDC</li>
                    <li>Plot NFTs (ERC-1155)</li>
                    <li>Treasury receipts</li>
                  </ul>
                </Card>
                <Card className="glass p-4">
                  <CardTitle className="text-lg mb-2">Debt & Credit</CardTitle>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Asset-backed loans</li>
                    <li>Bonds / Notes</li>
                    <li>Invoices</li>
                  </ul>
                </Card>
                <Card className="glass p-4">
                  <CardTitle className="text-lg mb-2">Derivatives</CardTitle>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Futures / Perps</li>
                    <li>Options (Calls/Puts)</li>
                    <li>Swaps</li>
                  </ul>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Holdings */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Holdings</CardTitle>
              <CardDescription>Your assets overview</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="p-3">Type</th>
                      <th className="p-3">Identifier</th>
                      <th className="p-3">Cost Basis</th>
                      <th className="p-3">Yield (annual)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(portfolios?.[0]?.holdings || []).length === 0 ? (
                      <tr>
                        <td className="p-3 text-muted-foreground" colSpan={4}>No holdings yet</td>
                      </tr>
                    ) : (
                      (portfolios?.[0]?.holdings || []).map((h: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-muted/30">
                          <td className="p-3">{h.asset_type}</td>
                          <td className="p-3 font-mono">{h.identifier}</td>
                          <td className="p-3">{(h.cost_basis ?? 0).toFixed(2)}</td>
                          <td className="p-3">{Math.round(((h.yield_annual ?? 0) * 100))}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Social Investing */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Portfolio Managers
              </CardTitle>
              <CardDescription>Follow verified managers and view their profiles</CardDescription>
            </CardHeader>
            <CardContent>
              {managersLoading ? (
                <p>Loading managers...</p>
              ) : managers.length === 0 ? (
                <p className="text-muted-foreground">No portfolio managers available yet</p>
              ) : (
                <div className="space-y-3">
                  {managers.slice(0, 5).map((manager, index) => (
                    <div
                      key={manager.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 overflow-hidden">
                          <div className="text-primary font-bold text-xs">#{index + 1}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">
                              {manager.display_name}
                            </p>
                            {manager.verified && (
                              <Shield className="h-3 w-3 text-blue-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {manager.bio || "Professional portfolio manager"}
                            {manager.wallet_address ? ` • ${manager.wallet_address.slice(0,6)}...${manager.wallet_address.slice(-4)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">ROI</p>
                          <p className="text-sm font-bold text-green-500">
                            +{manager.roi_annualized.toFixed(2)}%
                          </p>
                        </div>
                        <Button size="sm" className="gap-2">
                          <Star className="h-3 w-3" />
                          Follow
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketplace */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Marketplace
              </CardTitle>
              <CardDescription>Buy and sell land, assets, and investment contracts</CardDescription>
            </CardHeader>
            <CardContent>
              {marketplaceLoading ? (
                <p>Loading listings...</p>
              ) : listings.length === 0 ? (
                <p className="text-muted-foreground">No active listings at the moment</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {listings.map((listing) => (
                    <Card key={listing.id} className="border-primary/20">
                      <CardHeader>
                        <Badge className="w-fit">{listing.asset_type}</Badge>
                        <CardTitle className="text-base">Asset #{listing.asset_id}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{listing.description}</p>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="text-lg font-bold">
                              {listing.price} {listing.token_type}
                            </p>
                          </div>
                          <Button size="sm">Buy Now</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


