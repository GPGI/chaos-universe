import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Settings, Mountain, Sparkles, Network, Globe, ArrowRight } from "lucide-react";

interface StarSystemViewProps {
    system: any;
    systemPlanets: any[];
    balances: any;
    onBack: () => void;
    onManageSystem: (systemId: string) => void;
    onSelectPlanet: (planetId: string) => void;
    onCreatePlanet: (systemId: string) => void;
}

export function StarSystemView({
    system,
    systemPlanets,
    balances,
    onBack,
    onManageSystem,
    onSelectPlanet,
    onCreatePlanet
}: StarSystemViewProps) {
    if (!system) return null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/80">
            {/* Star System Info at Top */}
            <div className="pt-20 bg-gradient-to-b from-background via-background/95 to-background/80 border-b border-primary/20">
                <div className="container mx-auto px-4 py-8 max-w-7xl">
                    <Button variant="glass" className="mb-6 gap-2" onClick={onBack}>
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
                                    onClick={() => onManageSystem(system.id)}
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
                            onClick={() => onCreatePlanet(system.id)}
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
                                onClick={() => onSelectPlanet(planet.id)}
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
