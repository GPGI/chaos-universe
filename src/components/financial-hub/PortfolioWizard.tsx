import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { upsertPortfolio } from "@/lib/api";

interface PortfolioWizardProps {
  address: string | null;
  onComplete: () => void;
  onMarketViewChange: (view: "primary" | "secondary") => void;
}

export function PortfolioWizard({ address, onComplete, onMarketViewChange }: PortfolioWizardProps) {
  const [creationStep, setCreationStep] = useState<1 | 2 | 3>(1);
  const [creationType, setCreationType] = useState<"primary" | "secondary">("primary");
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(null);

  const handleCreate = async () => {
    try {
      localStorage.setItem("fh_created", "1");
    } catch {}
    
    onMarketViewChange(creationType === "primary" ? "primary" : "secondary");
    
    try {
      if (address) {
        await upsertPortfolio({
          wallet: address,
          holdings: [],
          recurring_investment_monthly: 0,
          manager_id: selectedManagerId,
          portfolio_type: creationType,
        });
      }
    } catch (error) {
      console.error("Failed to create portfolio:", error);
    }
    
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card className="glass border-2 border-primary/20">
          <CardHeader className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">Financial Hub</h1>
            <CardDescription>Create your portfolio to begin. Follow the steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex items-center justify-center gap-2 text-sm">
              <div className={`px-3 py-1 rounded-full border ${creationStep >= 1 ? "border-primary text-primary" : "text-muted-foreground"}`}>1. Type</div>
              <Separator className="w-10" />
              <div className={`px-3 py-1 rounded-full border ${creationStep >= 2 ? "border-primary text-primary" : "text-muted-foreground"}`}>2. Markets</div>
              <Separator className="w-10" />
              <div className={`px-3 py-1 rounded-full border ${creationStep >= 3 ? "border-primary text-primary" : "text-muted-foreground"}`}>3. Manager</div>
            </div>

            {creationStep === 1 && (
              <div className="grid md:grid-cols-2 gap-4">
                <Card className={`p-6 cursor-pointer hover:border-primary/50 transition-colors ${creationType === "primary" ? "border-primary" : ""}`} onClick={() => setCreationType("primary")}>
                  <CardTitle>Primary Portfolio</CardTitle>
                  <CardDescription>Core assets: plots, buildings, treasury-backed investments</CardDescription>
                </Card>
                <Card className={`p-6 cursor-pointer hover:border-primary/50 transition-colors ${creationType === "secondary" ? "border-primary" : ""}`} onClick={() => setCreationType("secondary")}>
                  <CardTitle>Speculative Portfolio</CardTitle>
                  <CardDescription>Higher-risk instruments: derivatives, options, volatile markets</CardDescription>
                </Card>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={() => setCreationStep(2)}>Continue</Button>
                </div>
              </div>
            )}

            {creationStep === 2 && (
              <div className="space-y-4">
                <Card className="p-6">
                  <CardTitle className="mb-2">Market Overview</CardTitle>
                  <CardDescription className="mb-4">
                    {creationType === "primary"
                      ? "Primary Economy: Buildings, raw materials, components, services"
                      : "Speculative Economy: Derivatives, futures, options, swaps"}
                  </CardDescription>
                  <div className="grid md:grid-cols-2 gap-4">
                    {creationType === "primary" ? (
                      <>
                        <div className="p-4 rounded border bg-card/50">Buildings & Plans: Huts, Wooden Houses, Stone Houses, Workshops, Foundries</div>
                        <div className="p-4 rounded border bg-card/50">Materials & Components: Timber, Stone, Metal Ore, Planks, Bricks, Ingots</div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 rounded border bg-card/50">Derivatives: Perps, Options, Indexes</div>
                        <div className="p-4 rounded border bg-card/50">Swaps: Interest/Credit swaps, synthetic exposures</div>
                      </>
                    )}
                  </div>
                </Card>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCreationStep(1)}>Back</Button>
                  <Button onClick={() => setCreationStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {creationStep === 3 && (
              <div className="space-y-4">
                <Card className="p-6">
                  <CardTitle className="mb-2">Portfolio Manager (Optional)</CardTitle>
                  <CardDescription>Choose a verified manager with strong performance and a Digital ID profile.</CardDescription>
                  <div className="mt-4 grid md:grid-cols-2 gap-3">
                    {/* Placeholder sample cards; actual list shown later in Social Investing */}
                    {[1,2,3,4].map(i => {
                      const id = `mgr-${i}`;
                      const selected = selectedManagerId === id;
                      return (
                        <div key={id} className={`p-4 rounded border ${selected ? "border-primary bg-primary/5" : "bg-card/50"}`}>
                          <div className="font-medium">Manager #{i}</div>
                          <div className="text-sm text-muted-foreground">ROI ≥ 20% annualized • Verified</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button size="sm" onClick={() => setSelectedManagerId(id)} variant={selected ? "default" : "outline"}>
                              {selected ? "Selected" : "Select"}
                            </Button>
                            {selected && <Badge>Chosen</Badge>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">Requirements: ≥6-12 months verified performance, ROI ≥20%, admin approval.</div>
                </Card>
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCreationStep(2)}>Back</Button>
                  <Button onClick={handleCreate} className="bg-primary hover:bg-primary/90">
                    Create Portfolio
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
