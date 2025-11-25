import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Mountain, Settings, Coins } from "lucide-react";
import { NetworkTopology } from "@/components/NetworkTopology";

interface PlanetViewProps {
    system: any;
    planet: any;
    balances: any;
    starSystems: any[];
    planets: any[];
    cityView: "info" | "grid" | "management";
    onCityViewChange: (view: "info" | "grid" | "management") => void;
    onBack: () => void;
    onManagePlanet: (planetId: string) => void;
}

export function PlanetView({
    system,
    planet,
    balances,
    starSystems,
    planets,
    cityView,
    onCityViewChange,
    onBack,
    onManagePlanet
}: PlanetViewProps) {
    if (!system || !planet) return null;

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-b from-background via-background to-background/80">
            <div className="container mx-auto px-4 py-12 max-w-7xl">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="glass" className="gap-2" onClick={onBack}>
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
                <Tabs value={cityView} onValueChange={(v) => onCityViewChange(v as any)} className="mb-6">
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
                            starSystems={starSystems}
                            planets={planets}
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
                                        onClick={() => onManagePlanet(planet.id)}
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
