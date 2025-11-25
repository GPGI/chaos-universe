import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  Zap, 
  Book, 
  Loader2, 
  AlertCircle,
  Shield,
  Coins,
  TrendingUp,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { toast } from "sonner";
import { getApiBase } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface NanofiberCircle {
  id: string;
  location: string;
  coverage: number;
  density: number;
  licensed: boolean;
  licenseHolder?: string;
  harvestYield: number;
  researchLevel: number;
  lastHarvest?: string;
}

interface License {
  id: string;
  circleId: string;
  location: string;
  issuedAt: string;
  expiresAt: string;
  status: "active" | "expired" | "pending";
  researchLevel: number;
  totalHarvested: number;
}

export default function NanofiberResearch() {
  const navigate = useNavigate();
  const { address, isConnected, connect } = useWallet();
  
  const [licenses, setLicenses] = useState<License[]>([]);
  const [circles, setCircles] = useState<NanofiberCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircle, setSelectedCircle] = useState<NanofiberCircle | null>(null);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [showHarvestDialog, setShowHarvestDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [licenseType, setLicenseType] = useState<"research" | "harvest">("research");

  // Fetch licenses and circles
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const base = getApiBase();
        
        // Fetch user licenses
        if (address) {
          const licensesRes = await fetch(`${base}/nanofiber/licenses/${address}`);
          if (licensesRes.ok) {
            const licensesData = await licensesRes.json();
            setLicenses(licensesData.licenses || []);
          }
        }
        
        // Fetch available circles
        const circlesRes = await fetch(`${base}/nanofiber/circles`);
        if (circlesRes.ok) {
          const circlesData = await circlesRes.json();
          setCircles(circlesData.circles || []);
        } else {
          // Fallback mock data
          setCircles(generateMockCircles());
        }
      } catch (error) {
        console.debug("Could not fetch nanofiber data:", error);
        // Use mock data as fallback
        setCircles(generateMockCircles());
        setLicenses([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [address]);

  const generateMockCircles = (): NanofiberCircle[] => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: `circle-${i + 1}`,
      location: `Sector ${String.fromCharCode(65 + (i % 5))}-${Math.floor(i / 5) + 1}`,
      coverage: 70 + Math.random() * 25,
      density: 75 + Math.random() * 20,
      licensed: Math.random() > 0.6,
      licenseHolder: Math.random() > 0.6 ? (address || "0x...") : undefined,
      harvestYield: 10 + Math.random() * 40,
      researchLevel: Math.floor(Math.random() * 5),
      lastHarvest: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 86400000).toISOString() : undefined,
    }));
  };

  const handleRequestLicense = async (circle: NanofiberCircle) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      await connect();
      return;
    }

    setSelectedCircle(circle);
    setShowLicenseDialog(true);
  };

  const handlePurchaseLicense = async () => {
    if (!selectedCircle || !address) return;

    setProcessing(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/nanofiber/licenses/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          circleId: selectedCircle.id,
          licenseType: licenseType,
        }),
      });

      if (res.ok) {
        toast.success(`License request submitted for ${selectedCircle.location}`);
        setShowLicenseDialog(false);
        // Refresh data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to request license");
      }
    } catch (error: any) {
      toast.error("Failed to request license");
      console.error("License request error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleHarvest = async (circle: NanofiberCircle) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    // Check if user has license for this circle
    const hasLicense = licenses.some(l => l.circleId === circle.id && l.status === "active");
    if (!hasLicense) {
      toast.error("You need an active license to harvest this circle");
      return;
    }

    setSelectedCircle(circle);
    setShowHarvestDialog(true);
  };

  const handleConfirmHarvest = async () => {
    if (!selectedCircle || !address) return;

    setProcessing(true);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/nanofiber/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          circleId: selectedCircle.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Harvested ${data.yield?.toFixed(2) || selectedCircle.harvestYield.toFixed(2)} nanofiber units`);
        setShowHarvestDialog(false);
        // Refresh data
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const error = await res.json();
        toast.error(error.message || "Harvest failed");
      }
    } catch (error: any) {
      toast.error("Harvest failed");
      console.error("Harvest error:", error);
    } finally {
      setProcessing(false);
    }
  };

  const userLicenses = licenses.filter(l => l.status === "active");
  const availableCircles = circles.filter(c => !c.licensed || c.licenseHolder === address);
  const licensedCircles = circles.filter(c => c.licensed && c.licenseHolder === address);

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="glass" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Nanofiber Research & Harvest
                </h1>
                <p className="text-muted-foreground">Zarathis • Zythera</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="glass border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-background mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-purple-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-purple-300 mb-2">License Required</h3>
                <p className="text-sm text-muted-foreground">
                  Land cannot be owned on Zythera. You must obtain a license to research and harvest nanofiber web circles. 
                  Licenses are issued for specific locations and have expiration dates. Only licensed spots can be accessed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="glass border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Licenses</p>
                  <p className="text-3xl font-bold text-purple-400">{userLicenses.length}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Available Spots</p>
                  <p className="text-3xl font-bold text-blue-400">{availableCircles.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Harvested</p>
                  <p className="text-3xl font-bold text-green-400">
                    {userLicenses.reduce((sum, l) => sum + l.totalHarvested, 0).toFixed(0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Research Level</p>
                  <p className="text-3xl font-bold text-yellow-400">
                    {userLicenses.length > 0 
                      ? Math.max(...userLicenses.map(l => l.researchLevel))
                      : 0}
                  </p>
                </div>
                <Book className="h-8 w-8 text-yellow-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Licenses */}
        {userLicenses.length > 0 && (
          <Card className="glass border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Your Active Licenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {userLicenses.map((license) => {
                  const circle = circles.find(c => c.id === license.circleId);
                  return (
                    <Card key={license.id} className="border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold">{license.location}</h3>
                            <p className="text-sm text-muted-foreground">Circle {license.circleId}</p>
                          </div>
                          <Badge className="bg-green-500">Active</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Research Level</span>
                            <span className="font-medium">{license.researchLevel}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Total Harvested</span>
                            <span className="font-medium">{license.totalHarvested.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expires</span>
                            <span className="font-medium">
                              {new Date(license.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {circle && (
                          <Button
                            variant="outline"
                            className="w-full mt-4"
                            onClick={() => handleHarvest(circle)}
                          >
                            Harvest Now
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Circles */}
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Available Nanofiber Web Circles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading nanofiber circles...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {circles.map((circle) => {
                  const hasLicense = licenses.some(l => l.circleId === circle.id && l.status === "active");
                  const isLicensed = circle.licensed && circle.licenseHolder === address;
                  
                  return (
                    <Card 
                      key={circle.id} 
                      className={`border ${
                        hasLicense || isLicensed 
                          ? "border-green-500/30 bg-green-950/10" 
                          : circle.licensed 
                            ? "border-red-500/30 bg-red-950/10 opacity-60" 
                            : "border-purple-500/30"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold">{circle.location}</h3>
                            <p className="text-xs text-muted-foreground">Circle {circle.id}</p>
                          </div>
                          {hasLicense || isLicensed ? (
                            <Badge className="bg-green-500">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Licensed
                            </Badge>
                          ) : circle.licensed ? (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Taken
                            </Badge>
                          ) : (
                            <Badge variant="outline">Available</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Coverage</span>
                              <span className="font-medium">{circle.coverage.toFixed(0)}%</span>
                            </div>
                            <Progress value={circle.coverage} className="h-1.5" />
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Density</span>
                              <span className="font-medium">{circle.density.toFixed(0)}%</span>
                            </div>
                            <Progress value={circle.density} className="h-1.5" />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Harvest Yield</span>
                            <span className="font-medium">{circle.harvestYield.toFixed(1)} units</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Research Level</span>
                            <span className="font-medium">{circle.researchLevel}/5</span>
                          </div>
                        </div>

                        {hasLicense || isLicensed ? (
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() => handleHarvest(circle)}
                          >
                            Harvest
                          </Button>
                        ) : !circle.licensed ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleRequestLicense(circle)}
                            disabled={!isConnected}
                          >
                            Request License
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            Already Licensed
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* License Request Dialog */}
        <Dialog open={showLicenseDialog} onOpenChange={setShowLicenseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Nanofiber License</DialogTitle>
              <DialogDescription>
                Obtain a license to research and harvest nanofiber web circles in {selectedCircle?.location}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>License Type</Label>
                <Select value={licenseType} onValueChange={(v) => setLicenseType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="research">Research Only</SelectItem>
                    <SelectItem value="harvest">Research & Harvest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedCircle && (
                <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium">{selectedCircle.location}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coverage:</span>
                    <span className="font-medium">{selectedCircle.coverage.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harvest Yield:</span>
                    <span className="font-medium">{selectedCircle.harvestYield.toFixed(1)} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">License Fee:</span>
                    <span className="font-medium">50 Xen</span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLicenseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePurchaseLicense} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  "Request License"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Harvest Dialog */}
        <Dialog open={showHarvestDialog} onOpenChange={setShowHarvestDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Harvest Nanofiber</DialogTitle>
              <DialogDescription>
                Harvest nanofiber from {selectedCircle?.location}
              </DialogDescription>
            </DialogHeader>
            {selectedCircle && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Yield:</span>
                    <span className="font-medium">{selectedCircle.harvestYield.toFixed(1)} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Research Level:</span>
                    <span className="font-medium">{selectedCircle.researchLevel}/5</span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHarvestDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmHarvest} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Harvesting...
                  </>
                ) : (
                  "Confirm Harvest"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

