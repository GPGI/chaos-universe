import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, MapPin, Home, Factory, Box, FileText } from "lucide-react";

interface Asset {
    asset_type: string;
    identifier: string;
    amount: number;
    cost_basis: number;
    current_value?: number;
    metadata?: any;
}

interface AssetListProps {
    assets: Asset[];
    title?: string;
}

export function AssetList({ assets, title = "Holdings" }: AssetListProps) {
    const getAssetIcon = (type: string) => {
        switch (type) {
            case "plot": return MapPin;
            case "building": return Home;
            case "factory": return Factory;
            case "resource": return Box;
            default: return FileText;
        }
    };

    const getAssetColor = (type: string) => {
        switch (type) {
            case "plot": return "text-emerald-400";
            case "building": return "text-blue-400";
            case "factory": return "text-amber-400";
            case "resource": return "text-purple-400";
            default: return "text-gray-400";
        }
    };

    if (!assets || assets.length === 0) {
        return (
            <Card className="glass border-primary/20">
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        No assets found in this portfolio.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass border-primary/20">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {assets.map((asset, index) => {
                    const Icon = getAssetIcon(asset.asset_type);
                    const colorClass = getAssetColor(asset.asset_type);
                    const currentValue = asset.current_value || asset.cost_basis; // Fallback
                    const profit = currentValue - asset.cost_basis;
                    const profitPercent = asset.cost_basis > 0 ? (profit / asset.cost_basis) * 100 : 0;
                    const isPositive = profit >= 0;

                    return (
                        <div key={`${asset.asset_type}-${asset.identifier}-${index}`} className="flex items-center justify-between p-4 rounded-lg bg-card/40 hover:bg-card/60 transition-colors border border-transparent hover:border-primary/20">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full bg-background/50 ${colorClass}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="font-medium capitalize flex items-center gap-2">
                                        {asset.asset_type} #{asset.identifier}
                                        {asset.metadata?.status && (
                                            <Badge variant="outline" className="text-xs py-0 h-5">
                                                {asset.metadata.status}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Cost Basis: {asset.cost_basis.toLocaleString()} CSN
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold">{currentValue.toLocaleString()} CSN</div>
                                <div className={`text-xs flex items-center justify-end gap-1 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                                    {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                    {Math.abs(profitPercent).toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}
