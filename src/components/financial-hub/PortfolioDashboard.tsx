import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Wallet, BarChart3, Users, RefreshCw, Zap, Shield, Trophy } from "lucide-react";
import { AssetList } from "./AssetList";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface PortfolioDashboardProps {
    address: string;
    portfolioData: any;
    primaryPortfolio: any;
    speculativePortfolio: any;
    totalValue: number;
    csnBalance: string;
    monthlyContribution: number;
    projection: any;
    marketView: "primary" | "secondary";
    onMarketViewChange: (view: "primary" | "secondary") => void;
}

export function PortfolioDashboard({
    address,
    portfolioData,
    primaryPortfolio,
    speculativePortfolio,
    totalValue,
    csnBalance,
    monthlyContribution,
    projection,
    marketView,
    onMarketViewChange
}: PortfolioDashboardProps) {
    const [portfolioTab, setPortfolioTab] = useState<"overview" | "workshop" | "managers">("overview");
    const marketsRef = useRef<HTMLDivElement | null>(null);

    // Chart data configuration
    const chartData = {
        labels: projection?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Projected Value',
                data: projection?.values || [1000, 1200, 1500, 1800, 2200, 2800],
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.5)',
                tension: 0.4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: { color: 'rgba(255, 255, 255, 0.7)' }
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            },
            x: {
                grid: { color: 'rgba(255, 255, 255, 0.1)' },
                ticks: { color: 'rgba(255, 255, 255, 0.7)' }
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 pt-20">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* Header Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="glass border-primary/20 anime-card">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                                <h3 className="text-2xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
                                    {totalValue.toLocaleString()} CSN
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-primary/10 text-primary">
                                <Wallet className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-primary/20 anime-card">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Liquid Balance</p>
                                <h3 className="text-2xl font-bold text-foreground">
                                    {parseFloat(csnBalance).toFixed(2)} CSN
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-accent/10 text-accent">
                                <RefreshCw className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-primary/20 anime-card">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Monthly Contribution</p>
                                <h3 className="text-2xl font-bold text-foreground">
                                    {monthlyContribution.toLocaleString()} CSN
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-green-500/10 text-green-500">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass border-primary/20 anime-card">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Strategies</p>
                                <h3 className="text-2xl font-bold text-foreground">
                                    {portfolioData?.strategies?.length || 0}
                                </h3>
                            </div>
                            <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                                <Zap className="h-6 w-6" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs value={portfolioTab} onValueChange={(v) => setPortfolioTab(v as any)} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="workshop">Workshop</TabsTrigger>
                        <TabsTrigger value="managers">Managers</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Left Column: Chart & Allocation */}
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="glass border-primary/20">
                                    <CardHeader>
                                        <CardTitle>Portfolio Performance</CardTitle>
                                        <CardDescription>Projected growth based on current allocation</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[300px] w-full">
                                            <Line data={chartData} options={chartOptions} />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="grid md:grid-cols-2 gap-4">
                                    <Button
                                        variant={marketView === "primary" ? "default" : "outline"}
                                        className="h-auto py-4 flex flex-col items-start gap-2"
                                        onClick={() => onMarketViewChange("primary")}
                                    >
                                        <div className="flex items-center gap-2 font-bold">
                                            <Shield className="h-4 w-4" /> Primary Market
                                        </div>
                                        <span className="text-xs text-muted-foreground text-left">
                                            Manage core assets: Plots, Buildings, Resources
                                        </span>
                                    </Button>

                                    <Button
                                        variant={marketView === "secondary" ? "default" : "outline"}
                                        className="h-auto py-4 flex flex-col items-start gap-2"
                                        onClick={() => onMarketViewChange("secondary")}
                                    >
                                        <div className="flex items-center gap-2 font-bold">
                                            <TrendingUp className="h-4 w-4" /> Secondary Market
                                        </div>
                                        <span className="text-xs text-muted-foreground text-left">
                                            Trade derivatives, options, and financial instruments
                                        </span>
                                    </Button>
                                </div>
                            </div>

                            {/* Right Column: Holdings List */}
                            <div className="space-y-6">
                                <AssetList
                                    assets={marketView === "primary" ? primaryPortfolio?.holdings : speculativePortfolio?.holdings}
                                    title={marketView === "primary" ? "Primary Holdings" : "Speculative Positions"}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="workshop">
                        <Card className="glass border-primary/20">
                            <CardHeader>
                                <CardTitle>Portfolio Workshop</CardTitle>
                                <CardDescription>Advanced tools for portfolio rebalancing and strategy simulation.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-muted-foreground">
                                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Workshop tools are currently under development.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="managers">
                        <Card className="glass border-primary/20">
                            <CardHeader>
                                <CardTitle>Portfolio Managers</CardTitle>
                                <CardDescription>Select professional managers to automate your investment strategy.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>Manager marketplace is coming soon.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
