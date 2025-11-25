import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Briefcase, Home, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { usePlotRegistry } from "@/hooks/usePlotRegistry";
import { useDigitalID } from "@/hooks/useDigitalID";

const PlanetDetail = () => {
  const navigate = useNavigate();
  const { systemId, planetId } = useParams();
  const { hasDigitalID, checkDigitalID } = useDigitalID();
  const [plotsToBuy, setPlotsToBuy] = useState(1);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  // Demo data for worker path (could be wired to Supabase later)
  const jobListings = [
    { id: 1, title: "Harbor Loader", pay: "12 xBGL/day", location: "Cliff Harbor", type: "Labor" },
    { id: 2, title: "Farm Assistant", pay: "9 xBGL/day + meals", location: "Outer Fields", type: "Agriculture" },
    { id: 3, title: "Workshop Apprentice", pay: "15 xBGL/day", location: "Foundry Row", type: "Crafting" },
    { id: 4, title: "Market Vendor", pay: "10 xBGL/day + tips", location: "Old Bazaar", type: "Trade" },
  ];
  const rentals = [
    { id: 101, name: "Riverside Hut", price: "6 xBGL/day", district: "Lower Rapids", size: "1 room" },
    { id: 102, name: "Stone Loft", price: "12 xBGL/day", district: "Upper Terrace", size: "studio" },
    { id: 103, name: "Cliffside Dorm", price: "4 xBGL/day", district: "Lift Quarter", size: "shared" },
  ];
  const [inspectPlotId, setInspectPlotId] = useState<number>(0);
  const [inspectOwner, setInspectOwner] = useState<string>("");
  const [inspectUri, setInspectUri] = useState<string>("");
  const [transferBuyer, setTransferBuyer] = useState<string>("");
  const { getOwner, getUri, isOwner, requestTransfer, loading } = usePlotRegistry();

  const totalPlots = 100000;
  const availablePlots = 10000;
  const plotPrice = 100; // xBGL

  const handlePurchase = async () => {
    // Check Digital ID before redirecting to purchase
    await checkDigitalID();
    if (!hasDigitalID) {
      toast.error("Digital ID required. Redirecting to create one...");
      setTimeout(() => {
        navigate("/digital-id?redirect=/quick-actions");
      }, 1500);
      return;
    }
    // Redirect to Quick Actions for purchase
    navigate("/quick-actions");
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <Button variant="glass" className="mb-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-cosmic bg-clip-text text-transparent">
            Sarakt Prime
          </h1>
          <p className="text-xl text-muted-foreground">
            Choose your path and begin your journey in the Octavia Universe
          </p>
        </div>

        {/* Path Selection */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <Card 
            className={`glass p-8 cursor-pointer transition-all ${
              selectedPath === 'career' 
                ? 'border-primary shadow-glow-primary' 
                : 'border-primary/30 hover:border-primary/60'
            }`}
            onClick={() => setSelectedPath('career')}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/30">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Career Path</h3>
                <p className="text-muted-foreground">Start as a Jobee - no prerequisites required</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li>• No land ownership required</li>
              <li>• Access to job marketplace</li>
              <li>• Build skills and reputation</li>
              <li>• Earn xBGL tokens</li>
            </ul>
            <Button 
              variant={selectedPath === 'career' ? 'cosmic' : 'outline'} 
              className="w-full"
            >
              {selectedPath === 'career' ? 'Selected' : 'Choose Career Path'}
            </Button>
          </Card>

          <Card 
            className={`glass p-8 cursor-pointer transition-all ${
              selectedPath === 'citizen' 
                ? 'border-accent shadow-glow-accent' 
                : 'border-primary/30 hover:border-primary/60'
            }`}
            onClick={() => setSelectedPath('citizen')}
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 rounded-full bg-accent/10 border border-accent/30">
                <Home className="h-8 w-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">Citizen Path</h3>
                <p className="text-muted-foreground">Become a Landowner - requires at least 1 plot</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li>• Own and develop land</li>
              <li>• Generate passive income</li>
              <li>• Voting rights and governance</li>
              <li>• Premium marketplace access</li>
            </ul>
            <Button 
              variant={selectedPath === 'citizen' ? 'cosmic' : 'outline'} 
              className="w-full"
            >
              {selectedPath === 'citizen' ? 'Selected' : 'Choose Citizen Path'}
            </Button>
          </Card>
        </div>

        {/* Land Purchase Section - visible only for Citizen path */}
        {selectedPath === 'citizen' && (
          <Card className="glass p-8 mb-8">
            <div className="flex items-center gap-4 mb-6">
              <ShoppingBag className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-3xl font-bold">Purchase Land</h2>
                <p className="text-muted-foreground">Secure your plot in Sarakt Prime</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Available Plots</span>
                  <span className="text-foreground font-medium">
                    {availablePlots.toLocaleString()} / {totalPlots.toLocaleString()}
                  </span>
                </div>
                <Progress value={(availablePlots / totalPlots) * 100} className="h-3 mb-6" />

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Number of Plots</label>
                    <Input
                      type="number"
                      min="1"
                      max={availablePlots}
                      value={plotsToBuy}
                      onChange={(e) => setPlotsToBuy(parseInt(e.target.value) || 1)}
                      className="glass"
                    />
                  </div>
                  
                  <div className="glass p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Price per plot</span>
                      <span className="font-medium">{plotPrice} xBGL</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Price</span>
                      <span className="text-primary">{plotPrice * plotsToBuy} xBGL</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass p-6 rounded-lg">
                <h3 className="text-lg font-bold mb-4">Purchase Benefits</h3>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Ownership documented on IPFS</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Tradable on secondary marketplace</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Generate passive income from development</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Access to citizen-only features</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2"></div>
                    <span>Treasury fund allocation rights</span>
                  </li>
                </ul>
              </div>
            </div>

            <Button 
              variant="cosmic" 
              size="lg" 
              className="w-full text-lg"
              onClick={handlePurchase}
            >
              Purchase {plotsToBuy} Plot{plotsToBuy > 1 ? 's' : ''} for {plotPrice * plotsToBuy} xBGL
            </Button>
          </Card>
        )}

        {/* Worker Path - Jobs and Rentals */}
        {selectedPath === 'career' && (
          <div className="space-y-8">
            <Card className="glass p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Available Jobs</h2>
                <span className="text-sm text-muted-foreground">{jobListings.length} positions</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {jobListings.map((job) => (
                  <div key={job.id} className="glass p-4 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold">{job.title}</div>
                      <div className="text-xs text-primary">{job.type}</div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{job.location}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{job.pay}</div>
                      <Button size="sm" variant="cosmic">Apply</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="glass p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Places to Rent</h2>
                <span className="text-sm text-muted-foreground">{rentals.length} listings</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {rentals.map((r) => (
                  <div key={r.id} className="glass p-4 rounded-lg border border-primary/20">
                    <div className="font-semibold mb-1">{r.name}</div>
                    <div className="text-xs text-muted-foreground mb-2">{r.district} • {r.size}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.price}</div>
                      <Button size="sm" variant="outline">Rent</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
        {/* Plot Registry (ERC-1155) */}
        <Card className="glass p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Plot Registry</h2>
              <p className="text-muted-foreground">Inspect ownership and request admin-approved transfers</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Plot ID</label>
              <Input
                type="number"
                placeholder="e.g., 42"
                value={inspectPlotId || ""}
                onChange={(e) => setInspectPlotId(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  if (!inspectPlotId) return;
                  const [owner, uri] = await Promise.all([
                    getOwner(inspectPlotId),
                    getUri(inspectPlotId),
                  ]);
                  setInspectOwner(owner || "");
                  setInspectUri(uri || "");
                  if (!owner) toast.message("Plot not activated yet");
                }}
              >
                Inspect
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                variant="glass"
                disabled={!inspectPlotId || loading}
                onClick={async () => {
                  if (!inspectPlotId) return;
                  const owned = await isOwner(inspectPlotId);
                  if (owned) toast.success("You own this plot");
                  else toast.message("You do not own this plot");
                }}
              >
                Check Ownership
              </Button>
            </div>
          </div>
          {inspectOwner && (
            <div className="text-sm text-muted-foreground mb-4">
              Owner: <span className="font-mono">{inspectOwner}</span>
              {inspectUri ? (
                <>
                  <br />
                  URI: <span className="font-mono break-all">{inspectUri}</span>
                </>
              ) : null}
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Request Transfer To</label>
              <Input
                placeholder="0xBuyerAddress"
                value={transferBuyer}
                onChange={(e) => setTransferBuyer(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full"
                disabled={!inspectPlotId || !transferBuyer || loading}
                onClick={async () => {
                  if (!inspectPlotId || !transferBuyer) return;
                  try {
                    await requestTransfer(inspectPlotId, transferBuyer);
                    setTransferBuyer("");
                  } catch {}
                }}
              >
                Request Transfer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PlanetDetail;
