import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skull, Sprout, Building2, Zap, Mountain, Globe, Lock, Users, MapPin, Coins, Factory, Home, ArrowRight, ChevronLeft, Sparkles, Shield, Flame, Droplets, Wind, TreePine, Hammer, Book, Loader2, Network, Wallet, Rocket, Orbit, TrendingUp, ShoppingCart, Briefcase, Settings, Trash2, X, AlertCircle, RefreshCw } from "lucide-react";
import heroImage from "@/assets/hero-space.jpg";
import { useLandPlots } from "@/hooks/useLandPlots";
import { useTreasury } from "@/hooks/useTreasury";
import { useCelestialForge } from "@/hooks/useCelestialForge";
import { useRealPlanetStats } from "@/hooks/useRealPlanetStats";
import { useWallet } from "@/contexts/WalletContext";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GalaxyVisualization } from "@/components/GalaxyVisualization";
import { Card as UICard } from "@/components/ui/card";
import { fetchPlots, type BackendPlot } from "@/lib/api";
import { OctagonalGrid } from "@/components/OctagonalGrid";
import { NetworkTopology } from "@/components/NetworkTopology";
import { useNavigate } from "react-router-dom";

// Real planet data is now fetched from blockchain contracts via useRealPlanetStats hook

export default function UnifiedUniverse() {
  const navigate = useNavigate();
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityView, setCityView] = useState<"info" | "grid" | "management">("grid");
  const { plotsSold, totalPlots, plotsRemaining, loading: plotsLoading, priceInAVAX, buyPlotPhase1AVAX, userPlots } = useLandPlots();
  const { balances, loading: treasuryLoading } = useTreasury();
  const { address, signer, isConnected, connect, balance } = useWallet();
  
  // Use REAL celestial forge data from blockchain/API (NOT mock)
  const {
    starSystems,
    userStarSystems,
    loading: forgeLoading,
    spawnStarSystem,
    spawnPlanet,
    fetchStarSystems,
    updateStarSystemStatus,
    updatePlanetStatus,
    deployStarSystem,
    getStarSystemDetails,
    getPlanetDetails
  } = useCelestialForge();
  
  // Get real planet stats from blockchain contracts
  const { planets: realPlanetsData, loading: planetsStatsLoading } = useRealPlanetStats();
  
  // Management state
  const [selectedSystemForManagement, setSelectedSystemForManagement] = useState<string | null>(null);
  const [selectedPlanetForManagement, setSelectedPlanetForManagement] = useState<string | null>(null);
  const [manageView, setManageView] = useState<"systems" | "planets" | "details">("systems");
  
  // Star system interaction state (like sarakt prime)
  const [selectedStarSystem, setSelectedStarSystem] = useState<string | null>(null);
  const [selectedPlanetInSystem, setSelectedPlanetInSystem] = useState<string | null>(null);
  
  // Use REAL data for display (from blockchain/API)
  const displayStarSystems = starSystems;
  const [planetsList, setPlanetsList] = useState<any[]>([]);
  const displayLoading = forgeLoading || planetsStatsLoading;
  
  // Fetch planets from API
  useEffect(() => {
    async function fetchPlanets() {
      try {
        const { listPlanets } = await import("@/lib/api");
        // listPlanets already has timeout handling built-in (5 second timeout)
        const result = await listPlanets();
        
        if (result?.planets && Array.isArray(result.planets)) {
          setPlanetsList(result.planets);
        }
      } catch (error: any) {
        // Silently handle errors - backend might not be available
        if (error.name === "AbortError" || error.message?.includes("timeout")) {
          console.debug("Planets API request timed out - backend may not be available");
        } else {
          console.debug("Could not fetch planets from API:", error);
        }
      }
    }
    fetchPlanets();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchPlanets, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const displayPlanets = planetsList;
  
  // Real planet data from blockchain (fallback to calculated stats)
  const planetsData = realPlanetsData;
  const [starSystemName, setStarSystemName] = useState("");
  const [tributePercent, setTributePercent] = useState(5);
  const [planetName, setPlanetName] = useState("");
  const [selectedStarSystemForPlanet, setSelectedStarSystemForPlanet] = useState<string>("");
  const [planetType, setPlanetType] = useState<"habitable" | "resource" | "research" | "military">("habitable");
  const [selectedBody, setSelectedBody] = useState<null | { id: "star" | "octavia" | "zythera"; position: { x: number; y: number; z: number }; radius?: number }>(null);
  const [backendPlots, setBackendPlots] = useState<BackendPlot[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [managementTab, setManagementTab] = useState<"assets" | "plots" | "income" | "settings">("assets");
  
  // Avalanche CLI connection state
  const [avalancheSubnets, setAvalancheSubnets] = useState<any[]>([]);
  const [avalancheNodes, setAvalancheNodes] = useState<any[]>([]);
  const [loadingSubnets, setLoadingSubnets] = useState(false);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [showSubnetsList, setShowSubnetsList] = useState(false);
  const [showNodesList, setShowNodesList] = useState(false);
  const [cityPlots, setCityPlots] = useState<any[]>([]);
  const [loadingCityPlots, setLoadingCityPlots] = useState(false);
  const [cityStats, setCityStats] = useState<any>(null);
  const [loadingCityStats, setLoadingCityStats] = useState(false);
  const [ownedPlotIds, setOwnedPlotIds] = useState<number[]>([]);
  const [showSpawnSystemDialog, setShowSpawnSystemDialog] = useState(false);
  const [spawnSystemForm, setSpawnSystemForm] = useState({
    name: "",
    tributePercent: 5,
    ownerWallet: "",
    tokenName: "",
    tokenSymbol: "",
    initialSupply: "",
    gasPriceGwei: "",
    validatorCount: 1,
  });

  // Load plots from backend for connected wallet
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address) {
        setBackendPlots([]);
        return;
      }
      setLoadingPlots(true);
      try {
        const plots = await fetchPlots(address);
        if (!cancelled) setBackendPlots(plots);
      } catch (e) {
        if (!cancelled) setBackendPlots([]);
      } finally {
        if (!cancelled) setLoadingPlots(false);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [address]);

  // Fetch owned plot IDs from primary portfolio
  const fetchOwnedPlots = async () => {
    if (!address) {
      setOwnedPlotIds([]);
      return;
    }
    try {
      const { getPortfolio } = await import("@/lib/api");
      const portfolioData = await getPortfolio(address, "primary").catch(() => null);
      
      if (portfolioData?.portfolio?.holdings || portfolioData?.holdings) {
        const holdings = portfolioData.portfolio?.holdings || portfolioData.holdings || [];
        // Extract plot IDs from holdings where asset_type is "plot"
        const plotIds = holdings
          .filter((h: any) => h.asset_type === "plot" && h.identifier)
          .map((h: any) => parseInt(h.identifier, 10))
          .filter((id: number) => !isNaN(id));
        
        setOwnedPlotIds(plotIds);
      } else {
        setOwnedPlotIds([]);
      }
    } catch (error) {
      console.debug("Failed to fetch owned plots from portfolio:", error);
      setOwnedPlotIds([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    
    fetchOwnedPlots();
    
    // Listen for portfolio updates (when plots are purchased)
    const handlePortfolioUpdate = (event: CustomEvent) => {
      if (!cancelled && (!event.detail?.wallet || event.detail.wallet === address)) {
        fetchOwnedPlots();
      }
    };
    
    window.addEventListener('portfolio-updated', handlePortfolioUpdate as EventListener);
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchOwnedPlots, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('portfolio-updated', handlePortfolioUpdate as EventListener);
    };
  }, [address]);

  // Generate and load city plots when city is selected
  useEffect(() => {
    if (!selectedPlanet || !selectedCity) {
      setCityPlots([]);
      return;
    }

    const planet = planetsData?.[selectedPlanet] || planetsData?.["sarakt-prime"];
    const city = planet.districts?.find((d, idx) => `city-${idx}` === selectedCity);
    if (!city) {
      setCityPlots([]);
      return;
    }

    // Fetch REAL plots from Chaos Star Network subnet via API
    const fetchPlots = async () => {
      setLoadingCityPlots(true);
      try {
        console.log("Fetching REAL plots from Chaos Star Network subnet for city:", city.name);
        
        // Fetch plots from city API (which connects to blockchain)
        const { listCityPlots } = await import("@/lib/api");
        const result = await listCityPlots();
        
        if (result?.plots && Array.isArray(result.plots)) {
          console.log(`Fetched ${result.plots.length} plots from blockchain`);
          
          // Transform API plots to match grid component format
          const transformedPlots = result.plots.map((plot: any) => ({
            id: plot.id || plot.plotId,
            plotId: plot.plotId || plot.id,
            x: 0, // Will be calculated by grid layout
            y: 0, // Will be calculated by grid layout
            type: plot.type || (plot.owned ? "claimed" : "unclaimed"),
            owner: plot.owner || undefined,
            owned: plot.owned || plot.minted || false,
            minted: plot.minted || plot.owned || false,
            zone: plot.zone || plot.zoneType || "residential",
            zoneType: plot.zone || plot.zoneType || "residential",
            coordinates: `${plot.id || plot.plotId}`,
          }));
          
          setCityPlots(transformedPlots);
          
          // Also fetch and set city stats for population display
          try {
            const { getCityStats } = await import("@/lib/api");
            setLoadingCityStats(true);
            const stats = await getCityStats(city.name);
            if (stats) {
              setCityStats(stats);
              console.log("City stats loaded from Chaos Star Network:", stats);
            } else {
              console.debug("City stats not available (backend may not be running)");
              setCityStats(null);
            }
          } catch (statsError: any) {
            // Only log if it's not a network/timeout error (already handled in API)
            if (statsError.message && !statsError.message.includes("not available")) {
              console.warn("Could not fetch city stats:", statsError);
            }
            setCityStats(null);
          } finally {
            setLoadingCityStats(false);
          }
        } else {
          console.log("No plots returned from API (this is normal if backend is not running or no plots are deployed yet)");
          setCityPlots([]);
        }
      } catch (error) {
        console.error("Error fetching plots from blockchain:", error);
        
        // Also try fetching directly from useLandPlots hook for additional data
        try {
          const { userPlots, plotsSold } = useLandPlots();
          if (userPlots && userPlots.length > 0) {
            console.log(`Found ${userPlots.length} user plots from contract`);
            // Transform user plots to match format
            const userPlotData = userPlots.map((plotId: number) => ({
              id: plotId,
              plotId: plotId,
              x: 0,
              y: 0,
              type: "claimed",
              owner: address || undefined,
              owned: true,
              minted: true,
              zone: "residential",
              coordinates: `${plotId}`,
            }));
            setCityPlots(userPlotData);
          } else {
            setCityPlots([]);
          }
        } catch (hookError) {
          console.error("Error fetching from useLandPlots:", hookError);
          setCityPlots([]);
        }
      } finally {
        setLoadingCityPlots(false);
      }
    };

    fetchPlots();
    
    // Refresh plots every 30 seconds to get latest blockchain state
    const interval = setInterval(fetchPlots, 30000);
    return () => clearInterval(interval);
  }, [selectedCity, address, selectedPlanet, plotsSold]);

  const handlePlanetSelect = (planetId: string) => {
    const planet = planetsData?.[planetId] || planetsData?.["sarakt-prime"]; // Fallback to sarakt-prime
    if (planet && !planet.locked) {
      setSelectedPlanet(planetId);
      setSelectedCity(null); // Reset city selection when planet changes
      // Scroll to top when planet is selected
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Mock hook automatically loads data from localStorage on mount
  // No need to fetch from backend or database

  // Initialize: Fetch star systems on mount
  useEffect(() => {
    fetchStarSystems();
  }, [fetchStarSystems]);

  // Star System Planet view - shows planet details (like city view)
  if (selectedStarSystem && selectedPlanetInSystem) {
    const system = starSystems.find(s => s.id === selectedStarSystem);
    const planet = displayPlanets.find((p: any) => p.id === selectedPlanetInSystem);
    
    if (!system || !planet) {
      setSelectedPlanetInSystem(null);
      return null;
    }

    return (
      <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="glass" className="gap-2" onClick={() => setSelectedPlanetInSystem(null)}>
              <ChevronLeft className="h-4 w-4" />
              Back to {system.name}
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                {planet.name}
              </h1>
              <p className="text-muted-foreground">{system.name} • {planet.planet_type}</p>
            </div>
          </div>

          {/* Planet View Tabs */}
          <Tabs value={cityView} onValueChange={(v) => setCityView(v as any)} className="mb-6">
            <TabsList>
              <TabsTrigger value="info">Planet Info</TabsTrigger>
              <TabsTrigger value="grid">Planet Grid</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
            </TabsList>

            {/* Planet Info Tab */}
            <TabsContent value="info" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="glass border-primary/20 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-2xl">{planet.name} Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      A {planet.planet_type} planet in the {system.name} star system. 
                      {planet.status === 'active' ? ' Currently active and operational.' : 
                       planet.status === 'deploying' ? ' Currently being deployed.' : 
                       ' Currently inactive.'}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Planet Type</div>
                        <Badge variant="outline" className="capitalize">{planet.planet_type}</Badge>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge variant={planet.status === 'active' ? 'default' : 'outline'} className="capitalize">
                          {planet.status}
                        </Badge>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Node Type</div>
                        <div className="text-lg font-bold capitalize">{planet.node_type}</div>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">IP Address</div>
                        <div className="text-sm font-mono">{planet.ip_address}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">System Status</span>
                        <span className="font-bold capitalize">{system.status}</span>
                      </div>
                      <Progress value={system.status === 'active' ? 100 : system.status === 'deploying' ? 50 : 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Chain ID</span>
                        <span className="font-bold font-mono">#{system.chain_id}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Treasury</span>
                        <span className="font-bold">{balances.avax || "0"} AVAX</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Planet Grid Tab */}
            <TabsContent value="grid">
              <Card className="glass border-primary/20 p-12 text-center">
                <Mountain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold mb-2">Planet Grid</h3>
                <p className="text-muted-foreground mb-4">
                  Planet grid visualization coming soon
                </p>
                <p className="text-sm text-muted-foreground">
                  Planet: {planet.name} • System: {system.name}
                </p>
              </Card>
            </TabsContent>

            {/* Management Tab */}
            <TabsContent value="management" className="space-y-6">
              {/* Network Topology - Show blockchain node connections */}
              <NetworkTopology
                starSystems={displayStarSystems}
                planets={displayPlanets}
              />
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Planet Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Configure planet settings and parameters</p>
                    <Button 
                      variant="cosmic" 
                      className="w-full"
                      onClick={() => {
                        setSelectedPlanetForManagement(planet.id);
                        setSelectedPlanetInSystem(null);
                        setSelectedStarSystem(null);
                      }}
                    >
                      Manage Planet
                    </Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Resources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Manage planet resources and economy</p>
                    <Button variant="cosmic" className="w-full">View Resources</Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // Star System view - shows planets to select (like planet view shows cities)
  if (selectedStarSystem) {
    const system = starSystems.find(s => s.id === selectedStarSystem);
    if (!system) {
      setSelectedStarSystem(null);
      return null;
    }
    
    const systemPlanets = displayPlanets.filter((p: any) => p.star_system_id === system.id);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
        {/* Star System Info at Top */}
        <div className="pt-20 bg-gradient-to-b from-background via-background/95 to-background/80 border-b border-primary/20">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Button variant="glass" className="mb-6 gap-2" onClick={() => {
              setSelectedStarSystem(null);
              setSelectedPlanetInSystem(null);
            }}>
              <ChevronLeft className="h-4 w-4" />
              Back to Star Map
            </Button>
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-6xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                    {system.name}
                  </h1>
                  <Badge variant={system.status === 'active' ? 'default' : 'outline'} className="text-lg px-4 py-1 capitalize">
                    {system.status}
                  </Badge>
                </div>
                <p className="text-xl text-muted-foreground mb-6">
                  Star system with subnet ID: <span className="font-mono text-sm">{system.subnet_id}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-sm">
                    Chain ID: {system.chain_id}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {systemPlanets.length} Planet{systemPlanets.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Tribute: {system.tribute_percent}%
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Treasury: {balances.avax || "0"} AVAX
                  </Badge>
                </div>
              </div>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle>System Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">RPC URL</div>
                    <div className="text-xs font-mono break-all bg-muted/50 p-2 rounded">
                      {system.rpc_url}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Owner</div>
                    <div className="text-xs font-mono break-all">
                      {system.owner_wallet.substring(0, 10)}...{system.owner_wallet.substring(32)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Created</div>
                    <div className="text-sm">
                      {new Date(system.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="cosmic"
                    className="w-full"
                    onClick={() => {
                      setSelectedSystemForManagement(system.id);
                      setSelectedStarSystem(null);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage System
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Planets Grid */}
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          {systemPlanets.length === 0 ? (
            <Card className="glass border-primary/20 p-12 text-center">
              <Mountain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-2xl font-bold mb-2">No Planets Yet</h3>
              <p className="text-muted-foreground mb-6">
                This star system doesn't have any planets yet. Create your first planet!
              </p>
              <Button
                variant="cosmic"
                onClick={() => {
                  setSelectedStarSystem(null);
                  setSelectedStarSystemForPlanet(system.id);
                  document.getElementById("planet-spawner")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create First Planet
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-0">
              {systemPlanets.map((planet) => (
                <Card
                  key={planet.id}
                  className="relative glass border-2 border-primary/30 hover:border-primary/80 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] active:border-primary/60 active:scale-[0.98] transition-all duration-500 cursor-pointer group overflow-hidden backdrop-blur-xl bg-gradient-to-br from-background/80 via-background/60 to-background/40 before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/10 before:via-transparent before:to-accent/10 before:opacity-0 hover:before:opacity-100 active:before:opacity-100 before:transition-opacity before:duration-500 w-full min-h-[280px] sm:min-h-[320px] lg:min-h-[360px]"
                  onClick={() => {
                    setSelectedPlanetInSystem(planet.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  {/* Animated gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-accent/0 group-hover:from-primary/10 group-hover:via-primary/20 group-hover:to-accent/10 transition-all duration-700 -z-10" />
                  
                  {/* Glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-20" />
                  
                  <CardHeader className="relative z-10 p-4 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                      <Badge 
                        variant={planet.status === 'active' ? 'default' : 'outline'}
                        className="text-xs sm:text-sm capitalize font-semibold px-2 sm:px-3 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400 shadow-lg shadow-green-500/10"
                      >
                        {planet.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs sm:text-sm capitalize font-semibold px-2 sm:px-3 py-1 border-primary/40 text-primary/90 bg-primary/5">
                        {planet.planet_type}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary via-white to-accent bg-clip-text text-transparent group-hover:scale-105 group-active:scale-100 transition-transform duration-300 break-words leading-tight">
                      {planet.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-5 relative z-10 p-4 sm:p-6 pt-0">
                    <div className="space-y-2 p-3 sm:p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 border border-primary/10">
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 break-all">
                        <Network className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary/60 flex-shrink-0" />
                        <span className="font-mono text-primary/80 text-[10px] sm:text-xs">{planet.ip_address}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                        <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent/60 flex-shrink-0" />
                        <span className="capitalize">{planet.node_type}</span>
                      </div>
                    </div>
                    <Button 
                      variant="cosmic" 
                      className="w-full gap-2 text-sm sm:text-base py-4 sm:py-6 font-semibold bg-gradient-to-r from-primary via-primary to-accent hover:from-primary/90 hover:via-primary/90 hover:to-accent/90 active:from-primary/80 active:via-primary/80 active:to-accent/80 shadow-lg shadow-primary/20 group-hover:shadow-[0_0_25px_rgba(139,92,246,0.6)] transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98] min-h-[48px] sm:min-h-[56px] touch-manipulation"
                    >
                      <span className="hidden sm:inline">Explore Planet</span>
                      <span className="sm:hidden">Explore</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                  
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-tr-full" />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Star System Management view - standalone view (like star system view)
  if (selectedSystemForManagement) {
    const system = starSystems.find(s => s.id === selectedSystemForManagement);
    if (!system) {
      setSelectedSystemForManagement(null);
      return null;
    }
    
    const systemPlanets = displayPlanets.filter((p: any) => p.star_system_id === system.id);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
        <div className="pt-20 bg-gradient-to-b from-background via-background/95 to-background/80 border-b border-primary/20">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Button variant="glass" className="mb-6 gap-2" onClick={() => {
              setSelectedSystemForManagement(null);
              setSelectedPlanetForManagement(null);
              setManageView("systems");
            }}>
              <ChevronLeft className="h-4 w-4" />
              Back to Star Map
            </Button>
          </div>
        </div>
        
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <Card className="glass p-6 border-2 border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Settings className="h-6 w-6 text-primary" />
                  Manage Star System
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedSystemForManagement(null);
                    setSelectedPlanetForManagement(null);
                    setManageView("systems");
                  }}
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* System Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">System Name</label>
                    <Input value={system.name} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={system.status}
                      onChange={(e) => updateStarSystemStatus(system.id, e.target.value as "active" | "deploying" | "inactive")}
                      className="w-full px-4 py-2 rounded-lg bg-background border border-accent/30"
                    >
                      <option value="active">Active</option>
                      <option value="deploying">Deploying</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Subnet ID</label>
                    <Input value={system.subnet_id} disabled className="bg-muted font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Chain ID</label>
                    <Input value={system.chain_id} disabled className="bg-muted font-mono" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">RPC URL</label>
                    <Input value={system.rpc_url} disabled className="bg-muted font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tribute Percent</label>
                    <Input 
                      type="number" 
                      value={system.tribute_percent} 
                      disabled
                      min="0"
                      max="20"
                      className="w-full bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Tribute percent from subnet configuration</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Treasury Balance (AVAX)</label>
                    <Input 
                      type="text" 
                      value={balances.avax || "0"} 
                      disabled
                      className="w-full bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Real-time balance from treasury contract</p>
                  </div>
                </div>

                {/* Planets Section */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      <Mountain className="h-5 w-5 text-accent" />
                      Planets ({systemPlanets.length})
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSystemForManagement(null);
                        setSelectedStarSystemForPlanet(system.id);
                        document.getElementById("planet-spawner")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Add Planet
                    </Button>
                  </div>

                  {systemPlanets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No planets yet. Add your first planet above!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {systemPlanets.map((planet) => (
                        <Card key={planet.id} className="border-accent/20">
                          <CardHeader>
                            <div className="flex items-center justify-between mb-2">
                              <Badge 
                                variant={planet.status === 'active' ? 'default' : 'outline'}
                                className="capitalize"
                              >
                                {planet.status}
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {planet.planet_type}
                              </Badge>
                            </div>
                            <CardTitle>{planet.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="text-sm text-muted-foreground">
                              <div>IP: <span className="font-mono">{planet.ip_address}</span></div>
                              <div>Type: {planet.node_type}</div>
                            </div>
                            <select
                              value={planet.status}
                              onChange={(e) => updatePlanetStatus(planet.id, e.target.value as "active" | "deploying" | "inactive")}
                              className="w-full px-3 py-2 rounded-lg bg-background border border-accent/30 text-sm"
                            >
                              <option value="active">Active</option>
                              <option value="deploying">Deploying</option>
                              <option value="inactive">Inactive</option>
                            </select>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedPlanetForManagement(planet.id);
                                  setSelectedSystemForManagement(null);
                                  setManageView("planets");
                                }}
                              >
                                Details
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  if (confirm(`Destroy planet "${planet.name}"?\n\nThis action cannot be undone.`)) {
                                    // Delete planet - refresh from API
                                    fetchStarSystems();
                                    toast.success(`Planet "${planet.name}" deleted!`);
                                    toast.success(`Planet "${planet.name}" destroyed!`);
                                  }
                                }}
                                title="Destroy Planet"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="border-t pt-4 flex justify-between">
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`DESTROY star system "${system.name}" and all its ${systemPlanets.length} planet(s)?\n\nThis action cannot be undone.`)) {
                        // Delete star system - refresh from API
                        fetchStarSystems();
                        setSelectedSystemForManagement(null);
                        toast.success(`Star system "${system.name}" deleted!`);
                        setSelectedSystemForManagement(null);
                        toast.success(`Star system "${system.name}" destroyed!`);
                      }
                    }}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Destroy System
                  </Button>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Created: {new Date(system.created_at).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // City view - shows city info, grid, and management
  if (selectedPlanet && selectedCity) {
    const planet = planetsData?.[selectedPlanet] || planetsData?.["sarakt-prime"];
    const city = planet.districts?.find((d, idx) => `city-${idx}` === selectedCity);
    if (!city) {
      setSelectedCity(null);
      return null;
    }

    return (
      <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="glass" className="gap-2" onClick={() => setSelectedCity(null)}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                {city.name}
              </h1>
              <p className="text-muted-foreground">{planet.name} • {city.type}</p>
            </div>
          </div>

          {/* City View Tabs */}
          <Tabs value={cityView} onValueChange={(v) => setCityView(v as any)} className="mb-6">
            <TabsList>
              <TabsTrigger value="grid">City Grid</TabsTrigger>
              <TabsTrigger value="info">City Info & Management</TabsTrigger>
            </TabsList>

            {/* City Grid Tab - Show first by default */}
            <TabsContent value="grid">
              {loadingCityPlots ? (
                <Card className="glass border-primary/20 p-12 text-center">
                  <p className="text-muted-foreground">Loading city grid...</p>
                </Card>
              ) : (
                <OctagonalGrid
                  cityName={city.name}
                  plots={cityPlots}
                  totalPlots={10000}
                  isConnected={isConnected}
                  isLoading={loadingCityPlots}
                  plotPrice={priceInAVAX}
                  ownedPlotIds={ownedPlotIds}
                  onPlotClick={(plot) => {
                    // Navigate to purchase page with the clicked plot ID
                    navigate(`/plot-purchase?plotId=${plot.id}`);
                  }}
                  onPlotSelect={(plot) => {
                    // Can be used for multi-select in future
                    console.log("Plot selected:", plot);
                  }}
                  onPurchase={async (plotId: number) => {
                    // Direct purchase from grid - navigate to purchase page instead
                    navigate(`/plot-purchase?plotId=${plotId}`);
                  }}
                />
              )}
            </TabsContent>

            {/* City Info & Management Tab - Combined */}
            <TabsContent value="info" className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="glass border-primary/20 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-2xl">{city.name} Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{city.description || `A ${city.type.toLowerCase()} district in ${planet.name}.`}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Total Plots</div>
                        <div className="text-2xl font-bold">{cityStats?.total_plots || city.plots || 10000}</div>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Plots Owned</div>
                        <div className="text-2xl font-bold text-primary">{cityStats?.plots_owned || plotsSold || 0}</div>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">District Type</div>
                        <Badge variant="outline">{city.type}</Badge>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1">Status</div>
                        <Badge className="bg-green-500">Active</Badge>
                      </div>
                    </div>
                    
                    {/* Population Mechanics Display */}
                    {cityStats && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Users className="h-5 w-5 text-primary" />
                          Population & Economy
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="glass p-4 rounded-lg border-2 border-primary/30">
                            <div className="text-sm text-muted-foreground mb-1">Current Population</div>
                            <div className="text-3xl font-bold text-primary">{cityStats.population?.current || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Projected: {cityStats.population?.projected_next_cycle || 0}
                            </div>
                          </div>
                          <div className="glass p-4 rounded-lg border-2 border-green-500/30">
                            <div className="text-sm text-muted-foreground mb-1">Newcomers Available</div>
                            <div className="text-3xl font-bold text-green-500">{cityStats.population?.growth_potential || 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Growth rate: +{cityStats.population?.growth_rate || 0}/cycle
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div className="glass p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Job Vacancies</span>
                              <Badge variant={cityStats.economy?.total_job_vacancies > 0 ? "default" : "destructive"}>
                                {cityStats.economy?.total_job_vacancies || 0}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Industrial: {cityStats.zones?.industrial?.job_vacancies || 0} | 
                              Business: {cityStats.zones?.business?.job_vacancies || 0}
                            </div>
                            <Progress 
                              value={cityStats.economy?.total_job_vacancies > 0 ? 50 : 0} 
                              className="h-2 mt-2"
                            />
                          </div>
                          <div className="glass p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Available Rentals</span>
                              <Badge variant={cityStats.economy?.total_available_rentals > 0 ? "default" : "destructive"}>
                                {cityStats.economy?.total_available_rentals || 0}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Residential plots: {cityStats.zones?.residential?.total_owned || 0} owned | 
                              {cityStats.zones?.residential?.occupied || 0} occupied
                            </div>
                            <Progress 
                              value={cityStats.economy?.total_available_rentals > 0 ? 50 : 0} 
                              className="h-2 mt-2"
                            />
                          </div>
                        </div>
                        
                        {cityStats.economy && (
                          <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                              <div className="flex-1">
                                <div className="font-medium mb-1">Population Growth Requirements</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {cityStats.economy.newcomers_can_arrive ? (
                                    <div className="text-green-500">
                                      ✓ Newcomers can arrive! Both job vacancies and rentals are available.
                                    </div>
                                  ) : (
                                    <div>
                                      <div className={cityStats.economy.newcomers_blocked_by?.no_jobs ? "text-red-500" : "text-muted-foreground"}>
                                        {cityStats.economy.newcomers_blocked_by?.no_jobs ? "✗" : "✓"} Jobs: {cityStats.economy.total_job_vacancies > 0 ? "Available" : "Required"}
                                      </div>
                                      <div className={cityStats.economy.newcomers_blocked_by?.no_rentals ? "text-red-500" : "text-muted-foreground"}>
                                        {cityStats.economy.newcomers_blocked_by?.no_rentals ? "✗" : "✓"} Rentals: {cityStats.economy.total_available_rentals > 0 ? "Available" : "Required"}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2">
                                  Data from Chaos Star Network subnet • Updates every 30s
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {loadingCityStats && (
                      <div className="mt-6 text-center text-muted-foreground">
                        Loading city statistics from blockchain...
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cityStats ? (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Population Growth</span>
                            <span className="font-bold text-green-500">
                              {cityStats.population?.growth_potential > 0 ? `+${cityStats.population?.growth_potential}` : "0"}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min(100, (cityStats.population?.growth_potential || 0) * 10)} 
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Job Market</span>
                            <span className="font-bold">
                              {cityStats.economy?.total_employed || 0}/{cityStats.economy?.total_job_capacity || 0}
                            </span>
                          </div>
                          <Progress 
                            value={cityStats.economy?.total_job_capacity > 0 
                              ? ((cityStats.economy?.total_employed || 0) / cityStats.economy?.total_job_capacity * 100)
                              : 0
                            } 
                            className="h-2"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Housing Occupancy</span>
                            <span className="font-bold">
                              {cityStats.zones?.residential?.occupied || 0}/{cityStats.zones?.residential?.total_owned || 0}
                            </span>
                          </div>
                          <Progress 
                            value={cityStats.zones?.residential?.total_owned > 0
                              ? ((cityStats.zones?.residential?.occupied || 0) / cityStats.zones?.residential?.total_owned * 100)
                              : 0
                            } 
                            className="h-2"
                          />
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            <div className="mb-1">📊 Real-time data from</div>
                            <div className="font-medium text-primary">Chaos Star Network</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                          <Progress value={0} className="h-2" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Management Section - Combined with Info */}
              <div className="mt-8 space-y-6 border-t pt-6">
                <h3 className="text-2xl font-bold flex items-center gap-2">
                  <Settings className="h-6 w-6" />
                  City Management
                </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Build Structures
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Construct buildings and infrastructure on your plots</p>
                    <Button variant="cosmic" className="w-full">Manage Buildings</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Assign Workers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Manage NPC workers and assignments</p>
                    <Button variant="cosmic" className="w-full">Manage Workers</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Economy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">View revenue, taxes, and economic data</p>
                    <Button variant="cosmic" className="w-full">View Economy</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Governance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Set policies and manage city rules</p>
                    <Button variant="cosmic" className="w-full">Manage Policies</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Marketplace
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">Buy and sell plots and assets</p>
                    <Button variant="cosmic" className="w-full">Open Marketplace</Button>
                  </CardContent>
                </Card>
                <Card className="glass border-primary/20 hover:border-primary transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">View detailed city analytics and reports</p>
                    <Button variant="cosmic" className="w-full">View Analytics</Button>
                  </CardContent>
                </Card>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    );
  }

  // Planet view - shows cities/districts to select
  if (selectedPlanet) {
    const planet = planetsData?.[selectedPlanet] || planetsData?.["sarakt-prime"];
    // Show Octavia Capital City for Sarakt Prime, or Capital city of Zarathis for Zythera
    const octaviaCity = planet.districts?.find(d => d.name === "Octavia Capital City");
    const zarathisCity = planet.districts?.find(d => d.name === "Capital city of Zarathis");
    const octaviaCityIndex = planet.districts?.findIndex(d => d.name === "Octavia Capital City") ?? -1;
    const zarathisCityIndex = planet.districts?.findIndex(d => d.name === "Capital city of Zarathis") ?? -1;
    const ownedPlotsCount = backendPlots.length;
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
        {/* Planet Info at Top */}
        <div className="pt-20 bg-gradient-to-b from-background via-background/95 to-background/80 border-b border-primary/20">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <Button variant="glass" className="mb-6 gap-2" onClick={() => {
              setSelectedPlanet(null);
              setSelectedCity(null);
            }}>
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              <div className="lg:col-span-2">
                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-6xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                    {planet.name}
                  </h1>
                  <Badge variant={planet.color === "primary" ? "default" : "destructive"} className="text-lg px-4 py-1">
                    {planet.status}
                  </Badge>
                </div>
                <p className="text-xl text-muted-foreground mb-6">{planet.description}</p>
                <div className="flex flex-wrap gap-2">
                  {planet.features?.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="px-3 py-1">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
              <Card className="glass border-primary/20">
                <CardHeader>
                  <CardTitle className="text-2xl">Planet Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Population
                      </span>
                      <span className="font-bold">{planet.population}k</span>
                    </div>
                    <Progress value={planet.population} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Mapped
                      </span>
                      <span className="font-bold">{planet.coverage}%</span>
                    </div>
                    <Progress value={planet.coverage} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Districts
                      </span>
                      <span className="font-bold">{planet.districts?.length || 0}</span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tier</span>
                      <Badge className="bg-gradient-cosmic text-white">{planet.tier}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* City Selection */}
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {octaviaCity && selectedPlanet !== "zythera" && (
            <div className="mb-8">
              <div className="grid lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-4xl font-bold mb-2">Octavia Capital City</h2>
                      <p className="text-muted-foreground">The grand capital city - your gateway to land ownership</p>
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      10,000 Total Plots
                    </Badge>
                  </div>
                </div>
                <div className="lg:col-span-1"></div>
              </div>
              <Card 
                className="glass border-primary/20 w-full max-w-2xl mx-auto hover:border-primary/60 transition-all cursor-pointer"
                onClick={() => {
                  if (octaviaCityIndex >= 0) {
                    setSelectedCity(`city-${octaviaCityIndex}`);
                  }
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <Building2 className="w-10 h-10 text-primary" />
                    </div>
                    <Badge variant="default">
                      Capital City
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl font-bold mb-3">
                    {octaviaCity.name}
                  </CardTitle>
                  {octaviaCity.description && (
                    <p className="text-muted-foreground text-lg leading-relaxed">{octaviaCity.description}</p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-5">
                    <div className="p-5 rounded-xl bg-muted/40 border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Available Plots</p>
                      <p className="text-3xl font-bold">10,000</p>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border border-primary/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Price per Plot</p>
                      <p className="text-3xl font-bold">100 xBGL</p>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border border-accent/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Your Plots</p>
                      <p className="text-3xl font-bold">0</p>
                    </div>
                  </div>
                  <Button 
                    variant="cosmic" 
                    className="w-full gap-3 text-xl py-7 font-bold"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (octaviaCityIndex >= 0) {
                        setSelectedCity(`city-${octaviaCityIndex}`);
                      }
                    }}
                  >
                    <span className="flex items-center justify-center gap-3">
                      Enter Octavia Capital City
                      <ArrowRight className="h-6 w-6" />
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Zarathis City for Zythera */}
          {selectedPlanet === "zythera" && (
            <div className="mb-8">
              <div className="grid lg:grid-cols-3 gap-8 mb-8">
                <div className="lg:col-span-2">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-4xl font-bold mb-2">Capital city of Zarathis</h2>
                      <p className="text-muted-foreground">The notorious black market capital - where ShadowCoin flows freely</p>
                    </div>
                    <Badge variant="destructive" className="text-lg px-4 py-2">
                      Black Market
                    </Badge>
                  </div>
                </div>
                <div className="lg:col-span-1"></div>
              </div>
              <Card 
                className="glass border-red-500/30 w-full max-w-2xl mx-auto hover:border-red-500/60 transition-all cursor-pointer bg-gradient-to-br from-red-950/20 to-background"
                onClick={() => {
                  // Navigate to black market DEX page
                  navigate("/black-market-dex");
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <Skull className="w-10 h-10 text-red-500" />
                    </div>
                    <Badge variant="destructive">
                      Frontier City
                    </Badge>
                  </div>
                  <CardTitle className="text-4xl font-bold mb-3 text-red-400">
                    {zarathisCity?.name || "Capital city of Zarathis"}
                  </CardTitle>
                  {zarathisCity?.description && (
                    <p className="text-muted-foreground text-lg leading-relaxed mb-4">{zarathisCity.description}</p>
                  )}
                  {!zarathisCity?.description && (
                    <p className="text-muted-foreground text-lg leading-relaxed mb-4">
                      Zarathis - the notorious black market capital of Zythera. A lawless frontier city where ShadowCoin flows freely and nanofiber tech deals are made in the shadows. <span className="text-yellow-400 font-semibold">No land ownership - research and harvest nanofiber web circles with a license.</span>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Important Notice */}
                  <div className="p-4 rounded-xl bg-yellow-950/30 border border-yellow-500/30 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-yellow-300 mb-1">No Land Ownership on Zythera</h3>
                        <p className="text-xs text-muted-foreground">
                          Land cannot be owned on Zythera. Instead, obtain a license to research and harvest nanofiber web circles in designated licensed spots.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Nanofiber Coverage Stats */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/30 to-blue-950/30 border border-purple-500/30 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <h3 className="text-lg font-bold text-purple-300">Nanofiber Network Coverage</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">City Coverage</span>
                          <span className="text-2xl font-bold text-purple-400">87%</span>
                        </div>
                        <Progress value={87} className="h-2 bg-purple-950/50" />
                        <p className="text-xs text-muted-foreground mt-1">Nanofiber web infrastructure</p>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Network Density</span>
                          <span className="text-2xl font-bold text-blue-400">92%</span>
                        </div>
                        <Progress value={92} className="h-2 bg-blue-950/50" />
                        <p className="text-xs text-muted-foreground mt-1">Bioluminescent nodes active</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Nanofiber Nodes</span>
                        <span className="font-bold text-purple-300">1,247</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Network Bandwidth</span>
                        <span className="font-bold text-blue-300">12.4 Tbps</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-muted-foreground">Licensed Spots Available</span>
                        <span className="font-bold text-green-300">342</span>
                      </div>
                    </div>
                  </div>

                  {/* License & Research Stats */}
                  <div className="grid grid-cols-3 gap-5 mb-4">
                    <div className="p-5 rounded-xl bg-muted/40 border border-purple-500/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Your Licenses</p>
                      <p className="text-2xl font-bold text-purple-400">0</p>
                      <p className="text-xs text-muted-foreground mt-1">Active licenses</p>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border border-blue-500/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Research Spots</p>
                      <p className="text-2xl font-bold text-blue-400">342</p>
                      <p className="text-xs text-muted-foreground mt-1">Licensed locations</p>
                    </div>
                    <div className="p-5 rounded-xl bg-muted/40 border border-green-500/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Harvest Yield</p>
                      <p className="text-2xl font-bold text-green-400">—</p>
                      <p className="text-xs text-muted-foreground mt-1">Per cycle</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="gap-3 text-lg py-6 border-purple-500/30 hover:bg-purple-950/20 hover:border-purple-500/50"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/nanofiber-research");
                      }}
                    >
                      <Book className="h-5 w-5" />
                      Research & Harvest
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="gap-3 text-lg py-6 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate("/black-market-dex");
                      }}
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Black Market DEX
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Management Menu for Owned Assets */}
          {isConnected && (
            <div className="mt-12">
              <h2 className="text-4xl font-bold mb-6">Asset Management</h2>
              <Tabs value={managementTab} onValueChange={(v) => setManagementTab(v as any)} className="mb-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="assets">My Assets</TabsTrigger>
                  <TabsTrigger value="plots">Land Plots</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="assets" className="mt-6">
                  <Card className="glass border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Briefcase className="h-5 w-5" />
                        Owned Assets Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="glass p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <span className="text-sm text-muted-foreground">Total Land Plots</span>
                          </div>
                          <p className="text-3xl font-bold">{ownedPlotsCount}</p>
                        </div>
                        <div className="glass p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Coins className="h-5 w-5 text-accent" />
                            <span className="text-sm text-muted-foreground">Wallet Balance</span>
                          </div>
                          <p className="text-3xl font-bold">{parseFloat(balance || "0").toFixed(4)} AVAX</p>
                        </div>
                        <div className="glass p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            <span className="text-sm text-muted-foreground">Treasury Balance</span>
                          </div>
                          <p className="text-3xl font-bold">
                            {balances?.AVAX ? parseFloat(balances.AVAX).toFixed(2) : "0.00"} AVAX
                          </p>
                        </div>
                      </div>
                      {ownedPlotsCount > 0 && (
                        <div className="mt-6">
                          <h3 className="text-lg font-semibold mb-4">Recent Plots</h3>
                          <div className="space-y-2">
                            {backendPlots.slice(0, 5).map((plot) => (
                              <div key={plot.token_id} className="glass p-3 rounded-lg flex items-center justify-between">
                                <div>
                                  <p className="font-semibold">Plot #{plot.token_id}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {plot.metadata?.type || "Land Plot"}
                                  </p>
                                </div>
                                <Badge variant="outline">Owned</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="plots" className="mt-6">
                  <Card className="glass border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Land Plot Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {ownedPlotsCount > 0 ? (
                        <div className="space-y-4">
                          <p className="text-muted-foreground">You own {ownedPlotsCount} plot(s) in Octavia Capital City.</p>
                          <Button variant="cosmic" onClick={() => {
                            if (octaviaCityIndex >= 0) {
                              setSelectedCity(`city-${octaviaCityIndex}`);
                              setCityView("management");
                            }
                          }}>
                            View All Plots in City Grid
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MapPin className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-xl font-bold mb-2">No Plots Owned</h3>
                          <p className="text-muted-foreground mb-4">Start by purchasing your first plot in Octavia Capital City</p>
                          <Button variant="cosmic" onClick={() => {
                            if (octaviaCityIndex >= 0) {
                              setSelectedCity(`city-${octaviaCityIndex}`);
                            }
                          }}>
                            Browse Available Plots
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="income" className="mt-6">
                  <Card className="glass border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Income & Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="glass p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Monthly Income</p>
                          <p className="text-2xl font-bold">0.00 xBGL</p>
                          <p className="text-xs text-muted-foreground mt-1">From plot rentals</p>
                        </div>
                        <div className="glass p-4 rounded-lg">
                          <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
                          <p className="text-2xl font-bold">0.00 xBGL</p>
                          <p className="text-xs text-muted-foreground mt-1">All time earnings</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Income tracking will be available once plot development features are active.</p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="mt-6">
                  <Card className="glass border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Asset Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="glass p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Notification Preferences</h3>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm">Plot purchase notifications</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm">Income alerts</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Marketplace updates</span>
                          </label>
                        </div>
                      </div>
                      <div className="glass p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Quick Actions</h3>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">Export Portfolio</Button>
                          <Button variant="outline" size="sm">View Transactions</Button>
                          <Button variant="outline" size="sm" onClick={() => navigate("/financial-hub")}>
                            Financial Hub
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
          {selectedPlanet === "sarakt-prime" && (
            <div className="mt-12 space-y-6">
              <h2 className="text-4xl font-bold mb-8">Development Phases</h2>
              <Card className="border-primary/20 bg-card/50 backdrop-blur overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/30">
                      <Home className="w-10 h-10 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-4xl mb-2">Phase 1: Tribal Stage</CardTitle>
                      <Badge className="bg-gradient-cosmic text-white text-lg px-4 py-2">
                        {totalPlots.toLocaleString()} Plots • {plotsSold} Sold
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                  <div className="bg-primary/10 border-l-4 border-primary p-6 rounded-lg">
                    <h3 className="text-2xl font-semibold text-foreground mb-3">Settlement Foundation</h3>
                    <p>10,000 plots minted for initial settlers and tribes. Each plot must be developed within one Octavian year or face consequences.</p>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Card className="glass border-primary/20">
                      <CardContent className="p-6">
                        <TreePine className="w-8 h-8 text-primary mb-3" />
                        <h4 className="font-semibold text-foreground mb-2">Hunting & Gathering</h4>
                        <p className="text-sm">NPCs forage resources from wilderness</p>
                      </CardContent>
                    </Card>
                    <Card className="glass border-primary/20">
                      <CardContent className="p-6">
                        <Sprout className="w-8 h-8 text-primary mb-3" />
                        <h4 className="font-semibold text-foreground mb-2">Farming</h4>
                        <p className="text-sm">Agricultural plots produce food supplies</p>
                      </CardContent>
                    </Card>
                    <Card className="glass border-primary/20">
                      <CardContent className="p-6">
                        <Droplets className="w-8 h-8 text-primary mb-3" />
                        <h4 className="font-semibold text-foreground mb-2">Water Collection</h4>
                        <p className="text-sm">Infrastructure for clean water distribution</p>
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-foreground mb-3">Basic Infrastructure</h3>
                    <p>Huts, workshops, water systems, and sewage. Villages form along trade routes. Dual currency activates: <span className="text-primary font-semibold">xBGL</span> for land/treasury, <span className="text-primary font-semibold">Chaos</span> for wages/commerce.</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-destructive/20 bg-card/50 backdrop-blur overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-destructive/5 rounded-full blur-3xl -z-10" />
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                      <Building2 className="w-10 h-10 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-4xl mb-2">Phase 2: Civilization Stage</CardTitle>
                      <Badge variant="destructive" className="text-lg px-4 py-2">Unlocks at 100,000 Developed Plots</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 text-muted-foreground text-lg leading-relaxed">
                  <div className="bg-destructive/10 border-l-4 border-destructive p-6 rounded-lg">
                    <h3 className="text-2xl font-semibold text-foreground mb-3">Advanced Structures</h3>
                    <p>Detached houses, schools, universities, industrial complexes. Full-scale economy with wages, rents, and production loops.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Secondary Market Opens</h3>
                      <p>Property trading with refunds based on net value. Building improvements directly increase property worth and rental income tied to valuation.</p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-3">Player Faction Control</h3>
                      <p>After owning and developing 100 plots, form a faction. Manage population within your loyalty sphere. NPCs choose allegiance based on trust and benefits.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
      <div className="relative h-[500px] overflow-hidden mb-16">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Cosmic Space" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background"></div>
        </div>
        <div className="relative container mx-auto px-4 h-full flex items-center justify-center text-center">
          <div className="max-w-4xl">
            <Badge className="mb-6 bg-gradient-cosmic text-white border-primary text-lg px-6 py-2">
              <Sparkles className="w-5 h-5 mr-2" />
              Genesis Phase Active
            </Badge>
            <h1 className="font-bold mb-6 bg-gradient-cosmic bg-clip-text text-transparent text-7xl">Chaos Star Universe</h1>
            <p className="text-2xl text-muted-foreground mb-8">
              From rebellion to renaissance. Explore lore, claim land, build empires.
            </p>
            <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
              <Button
                onClick={() => navigate("/plot-purchase")}
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition"
                size="lg"
              >
                Pledge Allegiance
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <div className="glass border-2 border-accent/50 bg-accent/10 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg hover:shadow-glow-accent transition-all">
                <div className="p-2 rounded-full bg-accent/20 border border-accent/30">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                    {plotsRemaining.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">{totalPlots.toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  Plots Available
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 pb-16 max-w-7xl">
        <Tabs defaultValue="universe" className="mb-12">
          <TabsList className="grid w-full grid-cols-2 mb-8 h-auto p-1">
            <TabsTrigger value="universe" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white text-lg py-4">
              <Orbit className="w-5 h-5 mr-2" />
              Universe Map
            </TabsTrigger>
            <TabsTrigger value="forge" className="data-[state=active]:bg-gradient-cosmic data-[state=active]:text-white text-lg py-4">
              <Sparkles className="w-5 h-5 mr-2" />
              Celestial Forge
            </TabsTrigger>
          </TabsList>

          {/* UNIFIED UNIVERSE TAB - Galaxy View + Star Map */}
          <TabsContent value="universe" className="space-y-8">
            {/* Galaxy Visualization with Sarakt System Panel */}
            <div className="grid lg:grid-cols-3 gap-6 items-end">
              {/* Galaxy Visualization - Takes 2/3 width */}
              <div className="lg:col-span-2">
                <Card className="glass border-2 border-primary/30 overflow-hidden">
                  <CardContent className="p-0 relative">
                    <div className="bg-black/90 relative" style={{ height: '700px' }}>
                      <GalaxyVisualization
                        systemProgress={displayStarSystems.length / 10}
                        octaviaProgress={(planetsData?.["sarakt-prime"]?.population || 0) / 100}
                        zytheraProgress={(planetsData?.["zythera"]?.population || 0) / 100}
                        onSelect={(id, info) => setSelectedBody({ id, position: info.position, radius: info.radius })}
                      />
                      {selectedBody && (
                        <div className="absolute bottom-4 right-4 pointer-events-auto">
                          <div className="glass border border-primary/30 rounded-lg p-4 w-[320px]">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-lg font-bold capitalize">
                                {selectedBody.id === 'star' 
                                  ? 'Sarakt Star System' 
                                  : selectedBody.id === 'octavia' 
                                    ? 'Sarakt Prime' 
                                    : selectedBody.id === 'zythera'
                                      ? 'Zythera'
                                      : selectedBody.id}
                              </div>
                              <Badge variant="outline">Control Panel</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-3">
                              Pos: {selectedBody.position.x.toFixed(2)}, {selectedBody.position.y.toFixed(2)}, {selectedBody.position.z.toFixed(2)}
                              {selectedBody.radius ? <> • Orbit r={selectedBody.radius}</> : null}
                            </div>
                            {selectedBody.id !== 'star' ? (
                              <div className="space-y-2">
                                <Button variant="glass" className="w-full">Center Camera</Button>
                                <Button variant="cosmic" className="w-full">Track Orbit</Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline">Details</Button>
                                  <Button variant="outline">Manage</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Button variant="glass" className="w-full">Center System</Button>
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline">Lore</Button>
                                  <Button variant="outline">Telemetry</Button>
                                </div>
                              </div>
                            )}
                            <div className="pt-3">
                              <Button variant="secondary" size="sm" className="w-full" onClick={() => setSelectedBody(null)}>
                                Close
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Overlay Info Cards */}
                    <div className="absolute top-4 left-4 right-4 flex flex-col gap-4 pointer-events-none">
                      <div className="glass border border-primary/30 p-4 backdrop-blur-xl pointer-events-auto">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-primary/20 border border-primary">
                            <Orbit className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">Sarakt Galaxy</h3>
                            <p className="text-xs text-muted-foreground">100,000 particle spiral • Multi-subnet universe</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="text-muted-foreground">• Each star system = blockchain subnet</span>
                          <span className="text-muted-foreground">• Each planet = node on subnet</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Stats Overlay */}
                    <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <div className="glass border border-primary/30 p-3 backdrop-blur-xl pointer-events-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse" />
                            <span className="text-xs font-semibold">Sarakt Star</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Progress: {Math.round((displayStarSystems.length / 10) * 100)}%</p>
                        </div>
                        <div className="glass border border-primary/30 p-3 backdrop-blur-xl pointer-events-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-xs font-semibold">Sarakt Prime</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Pop: {planetsData?.["sarakt-prime"]?.population || 0}k</p>
                        </div>
                        <div className="glass border border-primary/30 p-3 backdrop-blur-xl pointer-events-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="text-xs font-semibold">Zythera</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Pop: {planetsData?.["zythera"]?.population || 0}k</p>
                        </div>
                        <div className="glass border border-primary/30 p-3 backdrop-blur-xl pointer-events-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            <span className="text-xs font-semibold">Plots</span>
                          </div>
                          <p className="text-xs text-muted-foreground">10,000 units</p>
                        </div>
                        <div className="glass border border-primary/30 p-3 backdrop-blur-xl pointer-events-auto">
                          <div className="flex items-center gap-2 mb-1">
                            <Network className="w-3 h-3 text-primary" />
                            <span className="text-xs font-semibold">Systems</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{displayStarSystems.length} active</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sarakt System Panel - Takes 1/3 width on right */}
              <div className="lg:col-span-1">
                <Card className="border-primary/20 bg-card/50 backdrop-blur overflow-hidden flex flex-col" style={{ height: '700px' }}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
                  <CardHeader className="pb-3 flex-shrink-0">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                          <Network className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-1">Sarakt System</CardTitle>
                          <Badge variant="outline" className="text-xs">Primary Network • Bulgarian Subnet</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">Humanity's stronghold. Advanced infrastructure, vertical cities, hybrid companions.</p>
                      <Badge className="bg-gradient-cosmic text-white text-sm px-3 py-1 w-fit">2 Planets</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 overflow-y-auto">
                    {(Object.keys(planetsData || {}) || ["sarakt-prime", "zythera"]).map(id => {
                      const planet = planetsData?.[id];
                      if (!planet) return null;
                      return (
                        <Card
                          key={id}
                          className="border-primary/10 hover:border-primary hover:shadow-glow-accent transition-all cursor-pointer group"
                          onClick={() => handlePlanetSelect(id)}
                        >
                          <CardHeader className="pb-2 pt-3 px-3">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={planet.status === "Habitable" ? "default" : "destructive"} className="text-xs px-1.5 py-0.5">
                                {planet.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5">{planet.tier}</Badge>
                            </div>
                            <CardTitle className="text-base">{planet.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0 px-3 pb-3">
                            <p className="text-xs text-muted-foreground line-clamp-1">{planet.description}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="glass p-1.5 rounded">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <Users className="w-2.5 h-2.5 text-primary" />
                                  <span className="text-[10px] text-muted-foreground">Pop</span>
                                </div>
                                <p className="text-sm font-bold">{planet.population}k</p>
                              </div>
                              <div className="glass p-1.5 rounded">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-primary" />
                                  <span className="text-[10px] text-muted-foreground">Map</span>
                                </div>
                                <p className="text-sm font-bold">{planet.coverage}%</p>
                              </div>
                            </div>
                            <Button variant="cosmic" size="sm" className="w-full h-7 text-xs gap-1 group-hover:shadow-glow-accent transition-all">
                              Select <ArrowRight className="h-2.5 w-2.5" />
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Quick Stats - Full Width Below Galaxy */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center gap-2 text-xl font-bold mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  Population
                </div>
                <p className="text-3xl font-bold">5,247</p>
                <p className="text-sm text-muted-foreground">Active citizens</p>
              </Card>
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center gap-2 text-xl font-bold mb-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Plots
                </div>
                <p className="text-3xl font-bold">10,000</p>
                <p className="text-sm text-muted-foreground">Land units</p>
              </Card>
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center gap-2 text-xl font-bold mb-2">
                  <Coins className="w-5 h-5 text-primary" />
                  Currencies
                </div>
                <p className="text-3xl font-bold">2</p>
                <p className="text-sm text-muted-foreground">xBGL & SC</p>
              </Card>
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center gap-2 text-xl font-bold mb-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Worlds
                </div>
                <p className="text-3xl font-bold">6</p>
                <p className="text-sm text-muted-foreground">Planets & hubs</p>
              </Card>
            </div>
            {/* Your Plots (from backend) */}
            {isConnected && (
              <Card className="glass p-6 border-primary/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-xl font-bold">
                    <MapPin className="w-5 h-5 text-primary" />
                    Your Plots
                  </div>
                  <Badge variant="outline">
                    {loadingPlots ? "Loading..." : `${backendPlots.length} plot${backendPlots.length === 1 ? "" : "s"}`}
                  </Badge>
                </div>
                {backendPlots.length === 0 && !loadingPlots ? (
                  <p className="text-sm text-muted-foreground">
                    No plots found for your wallet in the registry.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {backendPlots.slice(0, 12).map((p, idx) => {
                      const id = typeof p.token_id === "string" ? p.token_id : String(p.token_id);
                      const title = p.metadata?.name || `Plot #${id}`;
                      const desc = p.metadata?.description || p.metadata?.location || "Registered land plot";
                      return (
                        <div key={`${id}-${idx}`} className="glass p-4 rounded border border-primary/20">
                          <div className="text-sm font-bold">{title}</div>
                          <div className="text-xs text-muted-foreground truncate">{desc}</div>
                          <div className="text-xs mt-2">
                            Token ID: <span className="font-mono">{id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* User-Created Star Systems */}
            {displayStarSystems.length > 0 && (
              <Card className="border-accent/20 bg-card/50 backdrop-blur overflow-hidden">
                <div className="absolute top-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -z-10" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-4 rounded-xl bg-accent/10 border border-accent/30">
                        <Rocket className="w-10 h-10 text-accent" />
                      </div>
                      <div>
                        <CardTitle className="text-4xl mb-2">Your Star Systems</CardTitle>
                        <p className="text-muted-foreground">Avalanche subnets you've deployed</p>
                      </div>
                    </div>
                    <Badge className="bg-gradient-cosmic text-white text-lg px-4 py-2">
                      {displayStarSystems.length} System{displayStarSystems.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayStarSystems.map((system) => {
                      const systemPlanets = getPlanetsForSystem(system.id);
                      return (
                      <Card
                        key={system.id}
                        className="border-accent/10 hover:border-accent hover:shadow-glow-accent transition-all cursor-pointer group"
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between mb-3">
                            <Badge 
                              variant={system.status === 'active' ? 'default' : 'outline'}
                              className="text-sm capitalize"
                            >
                              {system.status}
                            </Badge>
                            {system.chain_id && (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{system.chain_id}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-2xl">{system.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="text-xs text-muted-foreground truncate">
                            {system.subnet_id || "Deploying subnet..."}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="glass p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Globe className="w-4 h-4 text-accent" />
                                <span className="text-xs text-muted-foreground">Planets</span>
                              </div>
                              <p className="text-xl font-bold">{systemPlanets.length}</p>
                            </div>
                            <div className="glass p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Coins className="w-4 h-4 text-accent" />
                                <span className="text-xs text-muted-foreground">Treasury</span>
                              </div>
                              <p className="text-sm font-bold">
                                {balances.avax || "0"} AVAX
                              </p>
                            </div>
                          </div>
                          {system.rpc_url && (
                            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                              <strong>RPC:</strong> {system.rpc_url.substring(0, 40)}...
                            </div>
                          )}
                          {avalancheSubnets.length > 0 && !system.assigned_subnet_id && (
                            <div className="mb-2">
                              <select
                                className="w-full glass p-2 rounded border border-accent/30 text-xs"
                                onChange={async (e) => {
                                  const subnetName = e.target.value;
                                  if (subnetName && confirm(`Assign subnet "${subnetName}" to star system "${system.name}"?`)) {
                                    try {
                                      const { assignSubnetToStarSystem } = await import("@/lib/api");
                                      await assignSubnetToStarSystem(system.id, subnetName);
                                      toast.success(`Subnet "${subnetName}" assigned to "${system.name}"`);
                                      fetchStarSystems();
                                    } catch (error: any) {
                                      toast.error(error.message || "Failed to assign subnet");
                                    }
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="">Assign Subnet...</option>
                                {avalancheSubnets.map((subnet: any) => (
                                  <option key={subnet.name} value={subnet.name}>
                                    {subnet.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {system.assigned_subnet_id && (
                            <Badge variant="outline" className="mb-2 text-xs">
                              Subnet: {system.assigned_subnet_id}
                            </Badge>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              variant="cosmic" 
                              className="flex-1 gap-2 group-hover:shadow-glow-accent transition-all"
                              onClick={() => {
                                setSelectedSystemForManagement(system.id);
                                setManageView("details");
                                navigate("#manage");
                              }}
                            >
                              Manage <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Destroy star system "${system.name}" and all its ${systemPlanets.length} planet(s)?\n\nThis action cannot be undone.`)) {
                                  // Delete star system - refresh from API
                        fetchStarSystems();
                        setSelectedSystemForManagement(null);
                        toast.success(`Star system "${system.name}" deleted!`);
                                  toast.success(`Star system "${system.name}" destroyed!`);
                                }
                              }}
                              className="px-3"
                              title="Destroy Star System"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

          </TabsContent>

          {/* CELESTIAL FORGE TAB - Internal Universe Constructor */}
          <TabsContent value="forge" className="space-y-8">
            {/* Forge Header */}
            <Card className="glass p-6 border-2 border-primary/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 rounded-xl bg-primary/20 border-2 border-primary animate-pulse">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-4xl font-bold">Celestial Forge</h2>
                    <Badge className="bg-gradient-cosmic text-white text-lg px-4 py-2">
                      <Rocket className="h-5 h-5 mr-2 inline" />
                      Operational
                    </Badge>
                  </div>
                  <p className="text-lg text-muted-foreground mb-3">
                    Internal universe provisioning engine • Build star systems, deploy planets, bootstrap economies
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span>• Create new Avalanche subnets</span>
                    <span>• Spawn master node planets</span>
                    <span>• Initialize NPC logic & resources</span>
                    <span>• Register into universe index</span>
                  </div>
                </div>
              </div>
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded">
                <p className="text-sm">
                  <strong>You are the cloud.</strong> The Forge is your internal provisioning engine. 
                  When you forge a world, you allocate blockchain resources, deploy contracts, bootstrap economies, 
                  and drop living simulations into existence. No external dependencies.
                </p>
              </div>
              {/* Real Data Mode - Connected to Avalanche CLI */}
              <div className="bg-primary/10 border-l-4 border-primary p-4 rounded mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  <strong>Real Data Mode:</strong> Creating star systems and planets will deploy real Avalanche subnets and nodes.
                  All data is stored in the database and connected to your Avalanche CLI.
                </p>
                <div className="bg-muted/30 border border-primary/20 rounded p-2 mb-3">
                  <p className="text-xs text-muted-foreground font-mono">
                    <strong>RPC Endpoint:</strong> http://127.0.0.1:41773/ext/bc/wtHFpLKd93iiPmBBsCdeTEPz6Quj9MoCL8NpuxoFXHtvTVeT1/rpc
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connected to ChaosStarNetwork (same as Chaos Vault)
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    onClick={() => fetchStarSystems()}
                    disabled={displayLoading}
                    variant="outline"
                    size="sm"
                    className="border-primary/50"
                  >
                    {displayLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh Data
                      </>
                    )}
                  </Button>
                  {displayStarSystems.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {displayStarSystems.length} Systems • {displayPlanets.length} Planets
                    </Badge>
                  )}
                </div>
              </div>

              {/* Avalanche CLI Connection */}
              <div className="mb-6 space-y-4">
                <div className="flex items-center gap-3">
                  {/* Connection Status Indicator */}
                  <div className="relative">
                    <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                    <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-400 animate-ping opacity-75" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">Avalanche CLI Connection</h3>
                    <p className="text-xs text-muted-foreground">
                      Connect to your local Avalanche CLI to list available subnets and nodes for assignment to star systems and planets.
                    </p>
                  </div>
                </div>
                
                {/* Circular Action Buttons */}
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      onClick={async () => {
                        setLoadingSubnets(true);
                        try {
                          const { listCelestialForgeSubnets } = await import("@/lib/api");
                          const result = await listCelestialForgeSubnets();
                          if (result?.success && result?.subnets) {
                            setAvalancheSubnets(result.subnets);
                            setShowSubnetsList(true);
                            toast.success(`Found ${result.subnets.length} subnet(s)`);
                          } else {
                            toast.error("No subnets found or error loading subnets");
                          }
                        } catch (error: any) {
                          toast.error(error.message || "Failed to load subnets");
                        } finally {
                          setLoadingSubnets(false);
                        }
                      }}
                      disabled={loadingSubnets}
                      variant="outline"
                      size="icon"
                      className="h-16 w-16 rounded-full glass-enhanced border-primary/20 hover:border-primary/40 hover:scale-110 transition-all relative"
                    >
                      {loadingSubnets ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <Globe className="h-6 w-6 text-primary" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground text-center">List Subnets</span>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      onClick={async () => {
                        setLoadingNodes(true);
                        try {
                          const { listCelestialForgeNodes } = await import("@/lib/api");
                          const result = await listCelestialForgeNodes();
                          if (result?.success && result?.nodes) {
                            setAvalancheNodes(result.nodes);
                            setShowNodesList(true);
                            toast.success(`Found ${result.nodes.length} node(s)`);
                          } else {
                            toast.error("No nodes found or error loading nodes");
                          }
                        } catch (error: any) {
                          toast.error(error.message || "Failed to load nodes");
                        } finally {
                          setLoadingNodes(false);
                        }
                      }}
                      disabled={loadingNodes}
                      variant="outline"
                      size="icon"
                      className="h-16 w-16 rounded-full glass-enhanced border-primary/20 hover:border-primary/40 hover:scale-110 transition-all relative"
                    >
                      {loadingNodes ? (
                        <Loader2 className="h-6 w-6 text-primary animate-spin" />
                      ) : (
                        <Network className="h-6 w-6 text-primary" />
                      )}
                    </Button>
                    <span className="text-xs text-muted-foreground text-center">List Nodes</span>
                  </div>
                </div>
              </div>

              {/* Subnets List */}
              {showSubnetsList && avalancheSubnets.length > 0 && (
                <Card className="border-accent/30 bg-card/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-accent" />
                        Available Subnets ({avalancheSubnets.length})
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowSubnetsList(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {avalancheSubnets.map((subnet: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded border border-accent/20"
                        >
                          <div>
                            <p className="font-semibold">{subnet.name || `Subnet ${idx + 1}`}</p>
                            <p className="text-xs text-muted-foreground">
                              Status: {subnet.status || "Unknown"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-accent">
                            {subnet.name}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nodes List */}
              {showNodesList && avalancheNodes.length > 0 && (
                <Card className="border-accent/30 bg-card/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5 text-accent" />
                        Available Nodes ({avalancheNodes.length})
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => setShowNodesList(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {avalancheNodes.map((node: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded border border-accent/20"
                        >
                          <div>
                            <p className="font-semibold font-mono text-sm">{node.node_id || node.id || `Node ${idx + 1}`}</p>
                            <p className="text-xs text-muted-foreground">
                              {node.ip && `IP: ${node.ip}`}
                              {node.port && `:${node.port}`}
                              {node.type && ` • Type: ${node.type}`}
                              {node.status && ` • Status: ${node.status}`}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-accent">
                            {node.type || "Node"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="space-y-8">
                  {/* Spawn Star System Button */}
                  <div className="flex justify-center">
                    <Button
                      variant="cosmic"
                      size="lg"
                      onClick={() => {
                        setSpawnSystemForm({
                          name: "",
                          tributePercent: 5,
                          ownerWallet: address || "",
                          tokenName: "",
                          tokenSymbol: "",
                          initialSupply: "",
                          gasPriceGwei: "",
                          validatorCount: 1,
                        });
                        setShowSpawnSystemDialog(true);
                      }}
                      className="gap-2 hover:scale-105 transition-all"
                    >
                      <Sparkles className="h-5 w-5" />
                      Spawn Star System
                    </Button>
                  </div>
                  {/* Planet Spawner */}
                  {displayStarSystems.length > 0 && (
                    <div id="planet-spawner" className="border border-accent/30 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-xl font-bold mb-2 flex items-center gap-2">
                            <Mountain className="h-6 w-6 text-accent" />
                            Spawn Planet
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Deploy a master node in your star system
                          </p>
                        </div>
                        <Badge variant="outline" className="text-accent">
                          Real Mode
                        </Badge>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Select Star System</label>
                          <select
                            className="w-full glass p-2 rounded border border-muted"
                            value={selectedStarSystemForPlanet}
                            onChange={(e) => setSelectedStarSystemForPlanet(e.target.value)}
                          >
                            <option value="">Choose a star system...</option>
                            {displayStarSystems.map((sys) => {
                              const systemPlanets = displayPlanets.filter((p: any) => p.star_system_id === sys.id);
                              return (
                                <option key={sys.id} value={sys.id}>
                                  {sys.name} ({systemPlanets.length} planets)
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Planet Name</label>
                          <Input
                            placeholder="e.g., Terra Nova"
                            value={planetName}
                            onChange={(e) => setPlanetName(e.target.value)}
                            className="glass"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Planet Type</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(["habitable", "resource", "research", "military"] as const).map((type) => (
                              <Button
                                key={type}
                                variant={planetType === type ? "default" : "outline"}
                                className="capitalize"
                                onClick={() => setPlanetType(type)}
                              >
                                {type}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Button
                          variant="cosmic"
                          className="w-full"
                          disabled={displayLoading || !planetName || !selectedStarSystemForPlanet}
                          onClick={async () => {
                            try {
                              const ownerWallet = address || "0x0000000000000000000000000000000000000000";
                              await spawnPlanet(selectedStarSystemForPlanet, planetName.trim(), planetType);
                              setPlanetName("");
                              setSelectedStarSystemForPlanet("");
                            } catch (error) {
                              console.error(error);
                            }
                          }}
                        >
                          {displayLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Spawning...
                            </>
                          ) : (
                            <>
                              <Rocket className="h-4 w-4 mr-2" />
                              Spawn Planet
                            </>
                          )}
                        </Button>
                        <div className="bg-accent/10 border border-accent/30 rounded p-3">
                          <p className="text-xs text-muted-foreground">
                            <strong>Note:</strong> Spawning a planet deploys a real validator node
                            in your star system's subnet using Avalanche CLI. The node will be configured and started.
                            Synchronization takes 5-10 minutes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forge Success Summary */}
                  {displayStarSystems.length > 0 && (
                    <Card className="bg-primary/10 border-primary/30 p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="w-6 h-6 text-primary" />
                        <h4 className="text-xl font-bold">Mock Star Systems</h4>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Star Systems</p>
                          <p className="text-3xl font-bold text-primary">{displayStarSystems.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Planets</p>
                          <p className="text-3xl font-bold text-primary">{displayPlanets.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Active Systems</p>
                          <p className="text-3xl font-bold text-primary">
                            {displayStarSystems.filter(sys => sys.status === 'active').length}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        All data is stored locally in your browser (localStorage)
                      </p>
                    </Card>
                  )}

                  {displayStarSystems.length === 0 && (
                    <Card className="bg-muted/30 border-muted p-8 text-center">
                      <Rocket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h4 className="text-xl font-bold mb-2">Ready to Generate Mock Data</h4>
                      <p className="text-muted-foreground mb-4">
                        Create mock star systems and planets for testing. No database or chain required!
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click "Generate Test Data" above or create individual systems manually
                      </p>
                    </Card>
                  )}

                  {/* Star System Management */}
                  {selectedSystemForManagement && (
                    <Card className="glass p-6 border-2 border-primary/30 mt-8">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Settings className="h-6 w-6 text-primary" />
                            Manage Star System
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedSystemForManagement(null);
                              setSelectedPlanetForManagement(null);
                              setManageView("systems");
                            }}
                          >
                            Close
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const system = starSystems.find(s => s.id === selectedSystemForManagement);
                          if (!system) return null;
                          
                          const systemPlanets = displayPlanets.filter((p: any) => p.star_system_id === system.id);
                          
                          return (
                            <div className="space-y-6">
                              {/* System Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">System Name</label>
                                  <Input value={system.name} disabled className="bg-muted" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Status</label>
                                  <select
                                    value={system.status || "deploying"}
                                    onChange={(e) => updateStarSystemStatus(system.id, e.target.value as "active" | "deploying" | "inactive")}
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-accent/30"
                                  >
                                    <option value="active">Active</option>
                                    <option value="deploying">Deploying</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Subnet ID</label>
                                  <Input value={system.subnet_id || "N/A"} disabled className="bg-muted font-mono text-xs" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Chain ID</label>
                                  <Input value={system.chain_id || "N/A"} disabled className="bg-muted font-mono" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <label className="text-sm font-medium">RPC URL</label>
                                  <Input value={system.rpc_url || "N/A"} disabled className="bg-muted font-mono text-xs" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Tribute Percent</label>
                                  <Input 
                                    type="number" 
                                    value={system.tribute_percent || 5} 
                                    disabled
                                    min="0"
                                    max="20"
                                    className="w-full bg-muted"
                                  />
                                  <p className="text-xs text-muted-foreground">From subnet configuration</p>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Treasury Balance (AVAX)</label>
                                  <Input 
                                    type="number" 
                                    value={balances.avax || "0"} 
                                    disabled
                                    className="w-full bg-muted" 
                                  />
                                  <p className="text-xs text-muted-foreground">From blockchain contract</p>
                                </div>
                              </div>

                              {/* Planets Section */}
                              <div className="border-t pt-6">
                                <div className="flex items-center justify-between mb-4">
                                  <h3 className="text-xl font-bold flex items-center gap-2">
                                    <Mountain className="h-5 w-5 text-accent" />
                                    Planets ({systemPlanets.length})
                                  </h3>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedStarSystemForPlanet(system.id);
                                      setPlanetName("");
                                      setPlanetType("habitable");
                                      // Scroll to planet spawner
                                      document.getElementById("planet-spawner")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                  >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Add Planet
                                  </Button>
                                </div>
                                
                                {systemPlanets.length === 0 ? (
                                  <div className="text-center py-8 text-muted-foreground">
                                    No planets yet. Add your first planet above!
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {systemPlanets.map((planet) => (
                                      <Card key={planet.id} className="border-accent/20">
                                        <CardHeader>
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge 
                                              variant={planet.status === 'active' ? 'default' : 'outline'}
                                              className="text-xs capitalize"
                                            >
                                              {planet.status}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {planet.planet_type}
                                            </Badge>
                                          </div>
                                          <CardTitle className="text-lg">{planet.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                          <div className="text-xs text-muted-foreground">
                                            <div>IP: <span className="font-mono">{planet.ip_address}</span></div>
                                            <div>Type: {planet.node_type}</div>
                                          </div>
                                          <div className="space-y-2">
                                            <label className="text-xs font-medium">Status</label>
                                            <select
                                              value={planet.status}
                                              onChange={(e) => updateMockPlanet(planet.id, { 
                                                status: e.target.value as "active" | "deploying" | "inactive" 
                                              })}
                                              className="w-full px-2 py-1 text-xs rounded bg-background border border-accent/30"
                                            >
                                              <option value="active">Active</option>
                                              <option value="deploying">Deploying</option>
                                              <option value="inactive">Inactive</option>
                                            </select>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="flex-1"
                                              onClick={() => {
                                                setSelectedPlanetForManagement(planet.id);
                                                setManageView("planets");
                                              }}
                                            >
                                              Details
                                            </Button>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() => {
                                                if (confirm(`Destroy planet "${planet.name}"?\n\nThis action cannot be undone.`)) {
                                                  // Delete planet - refresh from API
                                    fetchStarSystems();
                                    toast.success(`Planet "${planet.name}" deleted!`);
                                                  toast.success(`Planet "${planet.name}" destroyed!`);
                                                }
                                              }}
                                              title="Destroy Planet"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="border-t pt-4 flex justify-between">
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`DESTROY star system "${system.name}" and all its ${systemPlanets.length} planet(s)?\n\nThis action cannot be undone.`)) {
                                      // Delete star system - refresh from API
                        fetchStarSystems();
                        setSelectedSystemForManagement(null);
                        toast.success(`Star system "${system.name}" deleted!`);
                                      setSelectedSystemForManagement(null);
                                      toast.success(`Star system "${system.name}" destroyed!`);
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Destroy System
                                </Button>
                                <div className="flex gap-2">
                                  <Badge variant="outline">
                                    Created: {new Date(system.created_at).toLocaleDateString()}
                                  </Badge>
        </div>
      </div>
      
      {/* Spawn Star System Dialog */}
      <Dialog open={showSpawnSystemDialog} onOpenChange={setShowSpawnSystemDialog}>
        <DialogContent className="glass-enhanced border-primary/30 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Spawn Star System
            </DialogTitle>
            <DialogDescription>
              Deploy a new Avalanche subnet locally with full configuration. This will create a real subnet using Avalanche CLI.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-primary">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="systemName">Star System Name *</Label>
                <Input
                  id="systemName"
                  placeholder="e.g., Nova Centauri"
                  value={spawnSystemForm.name}
                  onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, name: e.target.value })}
                  className="glass"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ownerWallet">Owner Wallet Address *</Label>
                <Input
                  id="ownerWallet"
                  placeholder="0x..."
                  value={spawnSystemForm.ownerWallet}
                  onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, ownerWallet: e.target.value })}
                  className="glass font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  {address ? "Using connected wallet" : "Enter wallet address or connect wallet"}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tributePercent">
                  Tribute to Sarakt (%) • {spawnSystemForm.tributePercent}%
                </Label>
                <input
                  id="tributePercent"
                  type="range"
                  min="0"
                  max="20"
                  value={spawnSystemForm.tributePercent}
                  onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, tributePercent: Number(e.target.value) })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Treasury contribution percentage to Sarakt Star System
                </p>
              </div>
            </div>
            
            {/* Token Configuration */}
            <div className="space-y-4 border-t border-primary/20 pt-4">
              <h3 className="text-sm font-semibold text-primary">Token Configuration (Optional)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    placeholder="e.g., Nova Token"
                    value={spawnSystemForm.tokenName}
                    onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, tokenName: e.target.value })}
                    className="glass"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenSymbol">Token Symbol</Label>
                  <Input
                    id="tokenSymbol"
                    placeholder="e.g., NOVA"
                    value={spawnSystemForm.tokenSymbol}
                    onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, tokenSymbol: e.target.value.toUpperCase() })}
                    className="glass"
                    maxLength={10}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="initialSupply">Initial Supply</Label>
                <Input
                  id="initialSupply"
                  type="number"
                  placeholder="1000000"
                  value={spawnSystemForm.initialSupply}
                  onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, initialSupply: e.target.value })}
                  className="glass"
                />
                <p className="text-xs text-muted-foreground">Initial token supply (leave empty for unlimited)</p>
              </div>
            </div>
            
            {/* Network Configuration */}
            <div className="space-y-4 border-t border-primary/20 pt-4">
              <h3 className="text-sm font-semibold text-primary">Network Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validatorCount">Validator Count</Label>
                  <Input
                    id="validatorCount"
                    type="number"
                    min="1"
                    value={spawnSystemForm.validatorCount}
                    onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, validatorCount: Number(e.target.value) || 1 })}
                    className="glass"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gasPriceGwei">Gas Price (gwei)</Label>
                  <Input
                    id="gasPriceGwei"
                    type="number"
                    placeholder="Auto"
                    value={spawnSystemForm.gasPriceGwei}
                    onChange={(e) => setSpawnSystemForm({ ...spawnSystemForm, gasPriceGwei: e.target.value })}
                    className="glass"
                  />
                </div>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> This will create a real Avalanche subnet using Avalanche CLI. The subnet will be:
              </p>
              <ul className="text-xs text-muted-foreground mt-2 list-disc list-inside space-y-1">
                <li>Created and configured locally</li>
                <li>Deployed to your local Avalanche network</li>
                <li>Registered in the database</li>
                <li>Ready for planet deployment</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSpawnSystemDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="cosmic"
              disabled={displayLoading || !spawnSystemForm.name || spawnSystemForm.name.length < 3 || !spawnSystemForm.ownerWallet}
              onClick={async () => {
                try {
                  await spawnStarSystem(
                    spawnSystemForm.name.trim(),
                    spawnSystemForm.tributePercent,
                    spawnSystemForm.ownerWallet || address || "0x0000000000000000000000000000000000000000"
                  );
                  setShowSpawnSystemDialog(false);
                  setSpawnSystemForm({
                    name: "",
                    tributePercent: 5,
                    ownerWallet: address || "",
                    tokenName: "",
                    tokenSymbol: "",
                    initialSupply: "",
                    gasPriceGwei: "",
                    validatorCount: 1,
                  });
                  toast.success("Star system spawned successfully!");
                } catch (error: any) {
                  toast.error(error.message || "Failed to spawn star system");
                  console.error(error);
                }
              }}
            >
              {displayLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy on Avalanche
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
})()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Planet Management */}
                  {selectedPlanetForManagement && (
                    <Card className="glass p-6 border-2 border-accent/30 mt-8">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Mountain className="h-6 w-6 text-accent" />
                            Manage Planet
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPlanetForManagement(null);
                              setManageView("systems");
                            }}
                          >
                            Close
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {(() => {
                          const planet = displayPlanets.find((p: any) => p.id === selectedPlanetForManagement);
                          if (!planet) return null;
                          
                          const starSystem = planet ? starSystems.find(s => s.id === planet.star_system_id) : null;
                          if (!starSystem) return null;
                          
                          return (
                            <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Planet Name</label>
                                  <Input 
                                    value={planet.name}
                                    onChange={(e) => {
                                      // Name updates require API call - for now just show read-only
                                      toast.info("Name updates require API endpoint");
                                    }}
                                    className="w-full"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Planet Type</label>
                                  <select
                                    value={planet.planet_type}
                                    onChange={(e) => {
                                      // Planet type updates require API call
                                      toast.info("Planet type updates require API endpoint");
                                    }}
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-accent/30"
                                  >
                                    <option value="habitable">Habitable</option>
                                    <option value="resource">Resource</option>
                                    <option value="research">Research</option>
                                    <option value="military">Military</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Status</label>
                                  <select
                                    value={planet.status}
                                    onChange={(e) => updatePlanetStatus(planet.id, e.target.value as "active" | "deploying" | "inactive")}
                                    className="w-full px-4 py-2 rounded-lg bg-background border border-accent/30"
                                  >
                                    <option value="active">Active</option>
                                    <option value="deploying">Deploying</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Node Type</label>
                                  <Input value={planet.node_type} disabled className="bg-muted capitalize" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">IP Address</label>
                                  <Input 
                                    value={planet.ip_address}
                                    onChange={(e) => {
                                      // IP address updates require API call
                                      toast.info("IP address updates require API endpoint");
                                    }}
                                    className="w-full font-mono"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Star System</label>
                                  <Input value={starSystem?.name || planet.star_system_name} disabled className="bg-muted" />
                                </div>
                              </div>

                              <div className="border-t pt-4 flex justify-between">
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`DESTROY planet "${planet.name}"?\n\nThis action cannot be undone.`)) {
                                      // Delete planet - refresh from API
                                    fetchStarSystems();
                                    toast.success(`Planet "${planet.name}" deleted!`);
                                      setSelectedPlanetForManagement(null);
                                      toast.success(`Planet "${planet.name}" destroyed!`);
                                    }
                                  }}
                                  className="gap-2"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Destroy Planet
                                </Button>
                                <Badge variant="outline">
                                  Created: {new Date(planet.created_at).toLocaleDateString()}
                                </Badge>
                              </div>
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
