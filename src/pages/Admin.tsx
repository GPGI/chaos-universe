import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  fetchPendingPurchases,
  activatePlot,
  PendingPurchase,
  getTreasury,
  listNpcs,
  spawnNpcs,
  listZones,
  listCityPlots,
  listFactions,
  getBlackMarket,
} from "@/lib/api";
import { useWallet } from "@/contexts/WalletContext";

export default function Admin() {
  const { address, isConnected } = useWallet();
  const [items, setItems] = useState<PendingPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<number | null>(null);
  const [treasury, setTreasury] = useState<any | null>(null);
  const [npcs, setNpcs] = useState<any[]>([]);
  const [npcSpawning, setNpcSpawning] = useState(false);
  const [zones, setZones] = useState<any | null>(null);
  const [cityPlots, setCityPlots] = useState<any[]>([]);
  const [factions, setFactions] = useState<any[]>([]);
  const [blackMarket, setBlackMarket] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingPurchases();
      setItems(data.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e: any) {
      toast.error(e.message || "Failed to load pending purchases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [t, npcList, z, plots, f, bm] = await Promise.all([
          getTreasury().catch(() => null),
          listNpcs().catch(() => ({ npcs: [] })),
          listZones().catch(() => ({ zones: {} })),
          listCityPlots().catch(() => ({ plots: [] })),
          listFactions().catch(() => ({ factions: [] })),
          getBlackMarket().catch(() => null),
        ]);
        setTreasury(t);
        setNpcs(npcList?.npcs || []);
        setZones(z?.zones || {});
        setCityPlots(plots?.plots || []);
        setFactions(f?.factions || []);
        setBlackMarket(bm);
      } catch {
        // best-effort; show what we have
      }
    })();
  }, []);

  return (
    <div className="min-h-screen pt-20">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="glass border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center justify-between">
              Pending Plot Activations
              <Badge variant="outline">{loading ? "Loading..." : `${items.length} pending`}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isConnected && (
              <p className="text-sm text-muted-foreground">Connect a wallet to view admin info.</p>
            )}
            {items.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No pending purchases.</p>
            ) : (
              <div className="space-y-3">
                {items.map((p) => (
                  <div key={`${p.plotId}-${p.buyer}-${p.timestamp}`} className="glass p-4 rounded border border-primary/20 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">Plot #{p.plotId}</div>
                      <div className="text-xs text-muted-foreground">
                        Buyer: <span className="font-mono">{p.buyer}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Token: {p.paymentToken === "0x0000000000000000000000000000000000000000" ? "AVAX" : p.paymentToken}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        At: {new Date(p.timestamp * 1000).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="cosmic"
                        disabled={activating === p.plotId}
                        onClick={async () => {
                          try {
                            setActivating(p.plotId);
                            const res = await activatePlot(p.plotId);
                            toast.success(`Activated plot #${p.plotId}`, { description: res.txHash });
                            await load();
                          } catch (e: any) {
                            toast.error(e.message || "Activation failed");
                          } finally {
                            setActivating(null);
                          }
                        }}
                      >
                        {activating === p.plotId ? "Activating..." : "Activate"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treasury Overview */}
        <div className="mt-8">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>Treasury Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {!treasury ? (
                <p className="text-sm text-muted-foreground">No data.</p>
              ) : (
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 rounded border">
                    <div className="font-medium mb-1">Inflation Mode</div>
                    <div className="text-muted-foreground">{treasury.planet?.inflation_mode}</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="font-medium mb-1">Coverage Ratio</div>
                    <div className="text-muted-foreground">{treasury.planet?.coverage_ratio}</div>
                  </div>
                  <div className="p-3 rounded border">
                    <div className="font-medium mb-1">Reserve Mix</div>
                    <div className="text-muted-foreground">
                      {Object.entries(treasury.planet?.reserves || {}).map(([k, v]: any) => (
                        <div key={k}>{k}: {(v * 100).toFixed(1)}%</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* NPC Management */}
        <div className="mt-8">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>NPC Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  disabled={npcSpawning}
                  onClick={async () => {
                    try {
                      setNpcSpawning(true);
                      await spawnNpcs(5, "child");
                      const res = await listNpcs();
                      setNpcs(res.npcs || []);
                      toast.success("Spawned 5 NPCs");
                    } catch (e: any) {
                      toast.error(e.message || "Failed to spawn NPCs");
                    } finally {
                      setNpcSpawning(false);
                    }
                  }}
                >
                  {npcSpawning ? "Spawning..." : "Spawn 5 (Child Cohort)"}
                </Button>
                <Badge variant="outline">{npcs.length} NPCs</Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {npcs.slice(0, 8).map((n) => (
                  <div key={n.id} className="p-3 rounded border text-sm">
                    <div className="font-medium">#{n.id.slice(0, 8)}</div>
                    <div className="text-muted-foreground">Cohort: {n.cohort}</div>
                    <div className="text-muted-foreground">Personality: {n.personality}</div>
                    <div className="text-muted-foreground">Skill: {n.skill.toFixed(2)} | Loyalty: {(n.loyalty * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* City & Plots */}
        <div className="mt-8">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>City & Plots</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="font-medium mb-1">Zones</div>
                <div className="text-muted-foreground">
                  {zones
                    ? Object.keys(zones).map((k) => (
                        <div key={k}>
                          {k}: {(zones as any)[k].types.join(", ")}
                        </div>
                      ))
                    : "No zones"}
                </div>
              </div>
              <div className="text-sm">
                <div className="font-medium mb-1">Plots</div>
                <div className="grid md:grid-cols-2 gap-3">
                  {cityPlots.length === 0 ? (
                    <div className="text-muted-foreground">No plots created</div>
                  ) : (
                    cityPlots.slice(0, 8).map((p: any) => (
                      <div key={p.id} className="p-3 rounded border">
                        <div className="font-medium">Plot #{p.id}</div>
                        <div className="text-muted-foreground">Zone: {p.zone} • Type: {p.type}</div>
                        <div className="text-muted-foreground">Base Rent: {p.base_rent}</div>
                        <div className="text-muted-foreground">Occupied: {p.occupied ? "Yes" : "No"}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Governance */}
        <div className="mt-8">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle>Governance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="font-medium mb-1">Factions</div>
                {factions.length === 0 ? (
                  <div className="text-muted-foreground">No factions</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {factions.map((f: any) => (
                      <div key={f.id} className="p-3 rounded border">
                        <div className="font-medium">{f.name}</div>
                        <div className="text-muted-foreground">{f.description || "—"}</div>
                        <div className="text-muted-foreground">Members: {f.members}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium mb-1">Black Market</div>
                {blackMarket ? (
                  <div className="text-muted-foreground">
                    Invite-only: {blackMarket.invite_only ? "Yes" : "No"} • Liquidity:{" "}
                    {Object.entries(blackMarket.liquidity || {}).map(([k, v]: any) => `${k}:${v}`).join(", ") || "—"}
                  </div>
                ) : (
                  <div className="text-muted-foreground">No data</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


