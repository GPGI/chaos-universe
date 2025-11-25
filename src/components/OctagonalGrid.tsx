import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Building2, Home, Factory, FileText, Search, Download, 
  Edit, Calendar, Shield, Scale, FileCheck, AlertCircle, CheckCircle2,
  XCircle, Clock, User, Hash, Globe, Layers, Archive, Filter, Droplets, Mountain
} from "lucide-react";
import { ethers } from "ethers";
import { toast } from "sonner";

interface Plot {
  id: number;
  x: number;
  y: number;
  type: string;
  owner?: string;
  ownerName?: string;
  building?: string;
  occupied?: boolean;
  coordinates?: string;
  zoneType?: string;
  registrationDate?: string;
  transactionHash?: string;
  contractAddress?: string;
  tokenId?: number;
}

interface OctagonalGridProps {
  cityName: string;
  plots: Plot[];
  totalPlots?: number;
  onPlotClick?: (plot: Plot) => void;
  onPlotSelect?: (plot: Plot) => void;
  onPurchase?: (plotId: number) => Promise<void>;
  plotPrice?: bigint | string; // Price in AVAX (wei or formatted string)
  isConnected?: boolean;
  isLoading?: boolean;
}

export function OctagonalGrid({ 
  cityName, 
  plots, 
  totalPlots = 10000, 
  onPlotClick, 
  onPlotSelect,
  onPurchase,
  plotPrice,
  ownedPlotIds = [],
  isConnected = false,
  isLoading = false
}: OctagonalGridProps) {
  const navigate = useNavigate();
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [hoveredPlot, setHoveredPlot] = useState<Plot | null>(null);
  const [selectedPlotIds, setSelectedPlotIds] = useState<Set<number>>(new Set());
  const [purchasing, setPurchasing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("map");
  const [filterType, setFilterType] = useState<string>("all");

  // Drag and zoom state - start at full scale (zoom = 1, centered)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1); // Full scale by default
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);


  // Generate a circular grid layout for plots with town center in the middle (old style - concentric rings)
  const generateCircularLayout = useMemo(() => {
    const plotSpacing = 45; // Space between plot centers
    const centerX = 600; // Center X coordinate
    const centerY = 600; // Center Y coordinate
    const townCenterRadius = 60; // Radius of town center (must be larger than townCenterSize/2)
    const grid: Array<{ x: number; y: number; index: number; radius: number; angle: number }> = [];
    
    let plotIndex = 0;
    let ringNumber = 1; // Start from ring 1 (ring 0 is town center)
    let currentRadius = townCenterRadius + plotSpacing; // Start outside town center
    
    // Generate plots in concentric circles
    while (plotIndex < totalPlots && ringNumber < 300) {
      // Calculate number of plots in this ring (circumference / spacing)
      const circumference = 2 * Math.PI * currentRadius;
      const plotsInThisRing = Math.max(8, Math.min(
        Math.floor(circumference / plotSpacing),
        totalPlots - plotIndex
      ));
      
      if (plotsInThisRing === 0) break;
      
      const angleStep = (2 * Math.PI) / plotsInThisRing;
      
      // Add small random offset to prevent perfect alignment between rings
      const offsetAngle = ringNumber * 0.1;
      
      for (let i = 0; i < plotsInThisRing && plotIndex < totalPlots; i++) {
        const angle = i * angleStep + offsetAngle;
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        
        grid.push({ x, y, index: plotIndex, radius: currentRadius, angle });
        plotIndex++;
      }
      
      // Move to next ring
      currentRadius += plotSpacing;
      ringNumber++;
    }
    
    // If we still have plots left, add them in outer spiral pattern
    if (plotIndex < totalPlots) {
      let spiralAngle = 0;
      while (plotIndex < totalPlots) {
        const angle = spiralAngle;
        const x = centerX + currentRadius * Math.cos(angle);
        const y = centerY + currentRadius * Math.sin(angle);
        
        grid.push({ x, y, index: plotIndex, radius: currentRadius, angle });
        plotIndex++;
        
        // Move outward in spiral
        spiralAngle += 0.3;
        if (spiralAngle > 2 * Math.PI) {
          spiralAngle = 0;
          currentRadius += plotSpacing * 0.8;
        }
      }
    }
    
    const maxRadius = Math.max(...grid.map(g => g.radius), currentRadius);
    const gridSize = Math.max(centerX * 2 + maxRadius * 2 + plotSpacing * 2, 1400);
    const gridHeight = gridSize;
    
    return { grid, centerX, centerY, plotSpacing, maxRadius, gridSize, gridHeight };
  }, [totalPlots]);

  const { grid: gridPositions, centerX, centerY, plotSpacing, gridSize, gridHeight } = generateCircularLayout;
  const plotSize = 35;
  const townCenterSize = 80; // Larger size for town center

  // Center the grid on the town centre on mount for full scale view
  useEffect(() => {
    if (svgContainerRef.current && centerX && centerY) {
      const containerWidth = svgContainerRef.current.clientWidth;
      const containerHeight = svgContainerRef.current.clientHeight;
      
      // Center the town centre (centerX, centerY) in the viewport
      const targetX = containerWidth / 2 - centerX;
      const targetY = containerHeight / 2 - centerY;
      
      setPan({ x: targetX, y: targetY });
      setZoom(1); // Ensure full scale
    }
  }, [centerX, centerY]);

  // Create a map of plots by ID for quick lookup
  const plotsMap = useMemo(() => {
    const map = new Map<number, Plot>();
    plots.forEach(plot => map.set(plot.id, plot));
    return map;
  }, [plots]);

  // Pre-calculate plot styles for performance
  const plotStyles = useMemo(() => {
    const styles = new Map<number, { fillColor: string; strokeColor: string; strokeWidth: number }>();
    plots.forEach(plot => {
      const isOwned = !!plot.owner;
      const fillColor = isOwned
        ? plot.type === "residential"
          ? "rgba(59, 130, 246, 0.4)"
          : plot.type === "commercial"
          ? "rgba(34, 197, 94, 0.4)"
          : plot.type === "industrial"
          ? "rgba(249, 115, 22, 0.4)"
          : "rgba(139, 92, 246, 0.3)"
        : "rgba(128, 128, 128, 0.15)";
      
      const strokeColor = isOwned
        ? plot.type === "residential"
          ? "rgb(59, 130, 246)"
          : plot.type === "commercial"
          ? "rgb(34, 197, 94)"
          : plot.type === "industrial"
          ? "rgb(249, 115, 22)"
          : "rgb(139, 92, 246)"
        : "rgba(128, 128, 128, 0.5)";
      
      const strokeWidth = isOwned ? 1.5 : 1;
      
      styles.set(plot.id, { fillColor, strokeColor, strokeWidth });
    });
    return styles;
  }, [plots]);

  const handlePlotClick = useCallback((plot: Plot, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedPlot(plot);
    // Call both callbacks - onPlotClick for navigation, onPlotSelect for selection
    onPlotClick?.(plot);
    onPlotSelect?.(plot);
    
    // Zoom to selected plot
    if (plot && gridPositions[plot.id - 1]) {
      const plotPos = gridPositions[plot.id - 1];
      const containerWidth = svgContainerRef.current?.clientWidth || gridSize;
      const containerHeight = svgContainerRef.current?.clientHeight || gridHeight;
      
      // Center the plot in view
      const targetX = containerWidth / 2 - plotPos.x;
      const targetY = containerHeight / 2 - plotPos.y;
      
      setPan({ x: targetX, y: targetY });
      setZoom(2); // Zoom in when plot is selected
    }
  }, [gridPositions, gridSize, gridHeight, onPlotClick, onPlotSelect]);

  // Handle mouse drag - optimized with useCallback
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    setZoom(newZoom);
  };

  // Zoom to selected plot when it changes
  useEffect(() => {
    if (selectedPlot && gridPositions[selectedPlot.id - 1]) {
      const plotPos = gridPositions[selectedPlot.id - 1];
      const containerWidth = svgContainerRef.current?.clientWidth || gridSize;
      const containerHeight = svgContainerRef.current?.clientHeight || gridHeight;
      
      const targetX = containerWidth / 2 - plotPos.x * zoom;
      const targetY = containerHeight / 2 - plotPos.y * zoom;
      
      setPan({ x: targetX, y: targetY });
      if (zoom < 1.5) setZoom(1.5);
    }
  }, [selectedPlot?.id]);

  const handleRequestDocument = async (plot: Plot, format: "pdf" | "docx") => {
    if (!plot.owner || !plot.transactionHash) {
      toast.error("Insufficient information to generate document");
      return;
    }
    
    try {
      const base = (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:5001";
      const endpoint = format === "pdf" ? "/documents/generate/pdf" : "/documents/generate/docx";
      
      const response = await fetch(`${base}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_id: plot.id,
          owner: plot.owner,
          tx_hash: plot.transactionHash,
          owner_name: plot.ownerName,
          coordinates: plot.coordinates || `Sector ${plot.x},${plot.y}`,
          zone_type: plot.zoneType || plot.type,
          token_id: plot.tokenId || plot.id,
          contract_address: plot.contractAddress,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate document");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cadastral_Certificate_Plot_${plot.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Cadastral certificate downloaded`);
    } catch (error: any) {
      console.error("Document generation error:", error);
      toast.error("Failed to generate document");
    }
  };

  // Filter plots based on search and filter
  const filteredPlots = useMemo(() => {
    let filtered = plots;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.id.toString().includes(query) ||
        p.owner?.toLowerCase().includes(query) ||
        p.ownerName?.toLowerCase().includes(query) ||
        p.coordinates?.toLowerCase().includes(query)
      );
    }
    
    if (filterType !== "all") {
      filtered = filtered.filter(p => {
        if (filterType === "owned") return p.owner !== undefined;
        if (filterType === "unclaimed") return p.owner === undefined;
        return p.type === filterType;
      });
    }
    
    return filtered;
  }, [plots, searchQuery, filterType]);

  const handlePurchase = async () => {
    if (!selectedPlot) return;
    if (!onPurchase) {
      toast.error("Purchase function not available");
      return;
    }
    if (!isConnected) {
      toast.error("Please connect your wallet to purchase plots");
      return;
    }
    if (selectedPlot.owner) {
      toast.error("This plot is already owned");
      return;
    }

    setPurchasing(true);
    try {
      await onPurchase(selectedPlot.id);
      toast.success(`Plot #${selectedPlot.id} purchase initiated!`);
      // Optionally clear selection after purchase
      // setSelectedPlot(null);
    } catch (error: any) {
      console.error("Purchase error:", error);
      // Error toast is handled by the purchase function
    } finally {
      setPurchasing(false);
    }
  };

  const formatPrice = (price: bigint | string | undefined): string => {
    if (!price) return "N/A";
    if (typeof price === "string") return price;
    try {
      return ethers.formatEther(price) + " AVAX";
    } catch {
      return price.toString();
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Official Administrative Header */}
      <Card className="border-2 border-blue-600/30 bg-gradient-to-r from-blue-950/50 to-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-lg border border-blue-500/50">
                <Scale className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl text-blue-100 flex items-center gap-2">
                  Cadastral Administrative Information System
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-500/50 text-xs">
                    Official Registry
                  </Badge>
                </CardTitle>
                <CardDescription className="text-blue-200/80 mt-1">
                  АГКК - Agency for Geodesy, Cartography, and Cadastre | {cityName} Cadastral District
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-200/60">Registry ID</div>
              <div className="text-sm font-mono text-blue-300">REG-{cityName.toUpperCase().slice(0, 3)}-{new Date().getFullYear()}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-400" />
              <span className="text-blue-200/80">Total Parcels: <strong className="text-blue-100">{totalPlots.toLocaleString()}</strong></span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-blue-200/80">Registered: <strong className="text-blue-100">{plots.filter(p => p.owner).length}</strong></span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-blue-200/80">Last Updated: <strong className="text-blue-100">{new Date().toLocaleDateString()}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter Bar */}
      <Card className="border-blue-600/20">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Plot ID, Owner, Coordinates, or Address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 bg-background border rounded-md text-sm"
              >
                <option value="all">All Parcels</option>
                <option value="owned">Registered</option>
                <option value="unclaimed">Unregistered</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="map">
            <Layers className="h-4 w-4 mr-2" />
            Cadastral Map
          </TabsTrigger>
          <TabsTrigger value="registry">
            <Archive className="h-4 w-4 mr-2" />
            Property Registry
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents & Services
          </TabsTrigger>
        </TabsList>

        {/* Cadastral Map Tab */}
        <TabsContent value="map" className="mt-4">
          <Card className="glass border-primary/20 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Cadastral Map - {cityName}</h3>
                <p className="text-sm text-muted-foreground">
                  Interactive cadastral visualization • Click parcels to view administrative records
                </p>
              </div>
              {selectedPlotIds.size > 0 && (
                <Badge variant="outline" className="text-sm">
                  {selectedPlotIds.size} selected
                </Badge>
              )}
            </div>
        
        <div className="border border-primary/20 rounded-lg p-4 bg-black/20 overflow-hidden relative" style={{ maxHeight: '800px' }}>
          {/* Zoom controls */}
          <div className="absolute top-6 right-6 z-10 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.min(3, zoom + 0.2))}
              className="h-8 w-8 p-0"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.2))}
              className="h-8 w-8 p-0"
            >
              −
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
              className="h-8 w-8 p-0 text-xs"
              title="Reset view"
            >
              ⌂
            </Button>
          </div>
          
          <div
            ref={svgContainerRef}
            className="relative mx-auto cursor-grab active:cursor-grabbing"
            style={{ width: '100%', height: '600px', overflow: 'hidden' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <svg
              width={gridSize * zoom}
              height={gridHeight * zoom}
              className="absolute"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px)`,
                overflow: "visible",
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                willChange: 'transform',
                shapeRendering: 'optimizeSpeed'
              }}
            >
                {/* Town Center in the middle - apply zoom */}
              <g>
                {/* Outer glow circle */}
                <circle
                  cx={centerX * zoom}
                  cy={centerY * zoom}
                  r={(townCenterSize / 2 + 10) * zoom}
                  fill="rgba(139, 92, 246, 0.2)"
                  className="animate-pulse"
                />
                {/* Main town center octagon */}
                <polygon
                  points={Array.from({ length: 8 }, (_, i) => {
                    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
                    const px = centerX * zoom + (townCenterSize / 2) * zoom * Math.cos(angle);
                    const py = centerY * zoom + (townCenterSize / 2) * zoom * Math.sin(angle);
                    return `${px},${py}`;
                  }).join(" ")}
                  fill="rgba(139, 92, 246, 0.4)"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth={3 * zoom}
                  className="cursor-pointer"
                />
                {/* Inner circle */}
                <circle
                  cx={centerX * zoom}
                  cy={centerY * zoom}
                  r={(townCenterSize / 3) * zoom}
                  fill="rgba(139, 92, 246, 0.6)"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth={2 * zoom}
                />
                {/* Town center icon/text */}
                <text
                  x={centerX * zoom}
                  y={centerY * zoom - 5}
                  textAnchor="middle"
                  fontSize={24 * zoom}
                  fill="white"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  🏛️
                </text>
                <text
                  x={centerX * zoom}
                  y={centerY * zoom + (townCenterSize / 2 + 20) * zoom}
                  textAnchor="middle"
                  fontSize={14 * zoom}
                  fill="rgb(139, 92, 246)"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  Town Center
                </text>
              </g>

              {/* Plot octagons - all plots in circular arrangement - OPTIMIZED */}
              {gridPositions.map((pos, idx) => {
                const plotId = idx + 1;
                const plot = plotsMap.get(plotId) || {
                  id: plotId,
                  x: pos.x,
                  y: pos.y,
                  type: "unclaimed",
                };
                
                const isSelected = selectedPlotIds.has(plot.id) || selectedPlot?.id === plot.id;
                const isHovered = hoveredPlot?.id === plot.id;
                // Check if plot is owned by checking plot.owner or ownedPlotIds array
                const isOwned = (plot.owner !== undefined && plot.owner !== null) || ownedPlotIds.includes(plot.id);
                
                // Apply zoom to positions
                const scaledX = pos.x * zoom;
                const scaledY = pos.y * zoom;
                const scaledSize = plotSize * zoom;
                
                // Pre-calculate octagon points (cached)
                const octagonAngleStep = Math.PI * 2 / 8;
                const octagonOffset = -Math.PI / 8;
                const halfSize = scaledSize / 2;
                const points = Array.from({ length: 8 }, (_, i) => {
                  const angle = i * octagonAngleStep + octagonOffset;
                  return `${scaledX + halfSize * Math.cos(angle)},${scaledY + halfSize * Math.sin(angle)}`;
                }).join(" ");

                // Use pre-calculated styles with hover/selection/ownership overrides
                const baseStyle = plotStyles.get(plot.id) || { fillColor: "rgba(128, 128, 128, 0.15)", strokeColor: "rgba(128, 128, 128, 0.5)", strokeWidth: 1 };
                
                // Owned plots get green styling
                const fillColor = isSelected
                  ? "rgba(139, 92, 246, 0.6)"
                  : isOwned
                  ? "rgba(34, 197, 94, 0.4)" // Green for owned plots
                  : isHovered
                  ? "rgba(139, 92, 246, 0.4)"
                  : baseStyle.fillColor;

                const strokeColor = isSelected
                  ? "rgb(139, 92, 246)"
                  : isOwned
                  ? "rgb(34, 197, 94)" // Green border for owned plots
                  : isHovered
                  ? "rgba(139, 92, 246, 0.8)"
                  : baseStyle.strokeColor;

                const strokeWidth = isSelected ? 2.5 : isOwned ? 2.5 : baseStyle.strokeWidth; // Thicker border for owned plots

                return (
                  <g key={plot.id}>
                    <polygon
                      points={points}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      className="cursor-pointer transition-all"
                      onClick={(e) => handlePlotClick(plot, e)}
                      onMouseEnter={() => setHoveredPlot(plot)}
                      onMouseLeave={() => setHoveredPlot(null)}
                    />
                    {isOwned && (
                      <>
                        <circle
                          cx={scaledX}
                          cy={scaledY}
                          r={4 * zoom}
                          fill="rgb(34, 197, 94)"
                          stroke="rgb(34, 197, 94)"
                          strokeWidth={1 * zoom}
                        />
                        {/* Owner tag */}
                        {plot.owner && (
                          <text
                            x={scaledX}
                            y={scaledY - scaledSize / 2 - 5}
                            textAnchor="middle"
                            fontSize={8 * zoom}
                            fill="rgb(34, 197, 94)"
                            fontWeight="bold"
                            className="pointer-events-none"
                          >
                            {plot.ownerName || `${plot.owner.slice(0, 4)}...${plot.owner.slice(-4)}`}
                          </text>
                        )}
                      </>
                    )}
                    {/* Plot ID label for selected/hovered */}
                    {(isSelected || isHovered) && (
                      <text
                        x={scaledX}
                        y={scaledY + scaledSize / 2 + 12}
                        textAnchor="middle"
                        fontSize={9 * zoom}
                        fill="white"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        #{plot.id}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>


            {/* Cadastral Property Information Panel */}
            {selectedPlot && (
              <Card className="mt-4 border-2 border-blue-600/30 bg-gradient-to-br from-blue-950/30 to-slate-900/30">
                <CardHeader className="pb-3 border-b border-blue-600/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Hash className="h-5 w-5 text-blue-400" />
                        Cadastral Parcel #{selectedPlot.id}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Official Property Registry Record
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedPlot.owner ? (
                        <Badge className="bg-green-600/20 text-green-300 border-green-500/50">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-600/20 text-yellow-300 border-yellow-500/50">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Unregistered
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">{selectedPlot.type || "Unclassified"}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">Property Details</TabsTrigger>
                      <TabsTrigger value="ownership">Ownership Record</TabsTrigger>
                      <TabsTrigger value="boundaries">Boundaries & Coordinates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Cadastral Coordinates</span>
                            </div>
                            <div className="text-sm font-mono text-blue-100 mt-1">
                              {selectedPlot.coordinates || `Sector ${selectedPlot.x},${selectedPlot.y}`}
                            </div>
                          </div>
                          
                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Zone Classification</span>
                            </div>
                            <div className="text-sm text-blue-100 mt-1 capitalize">
                              {selectedPlot.zoneType || selectedPlot.type || "Unclassified"}
                            </div>
                          </div>

                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Home className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Improvements</span>
                            </div>
                            <div className="text-sm text-blue-100 mt-1">
                              {selectedPlot.building || "No structures recorded"}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Registration Date</span>
                            </div>
                            <div className="text-sm text-blue-100 mt-1">
                              {selectedPlot.registrationDate || (selectedPlot.owner ? "Registered" : "Not registered")}
                            </div>
                          </div>

                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Shield className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Administrative Status</span>
                            </div>
                            <div className="mt-1">
                              <Badge 
                                variant={selectedPlot.occupied ? "default" : selectedPlot.owner ? "secondary" : "outline"} 
                                className="text-xs"
                              >
                                {selectedPlot.owner ? (selectedPlot.occupied ? "Occupied" : "Vacant") : "Available for Registration"}
                              </Badge>
                            </div>
                          </div>

                          <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-600/20">
                            <div className="flex items-center gap-2 mb-1">
                              <Globe className="h-4 w-4 text-blue-400" />
                              <span className="text-xs text-blue-200/60 uppercase">Market Value</span>
                            </div>
                            <div className="text-lg font-bold text-blue-100 mt-1">
                              {plotPrice ? formatPrice(plotPrice) : (() => {
                                // Calculate price based on plot ID
                                // First 10k plots: 100 xBGL, After 10k: 400 xBGL
                                const sold = plots.filter(p => p.owner).length;
                                if (selectedPlot.id <= 10000 && sold < 10000) {
                                  return "100 xBGL";
                                }
                                return "400 xBGL";
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="ownership" className="mt-4 space-y-4">
                      {selectedPlot.owner ? (
                        <>
                          <div className="p-4 bg-green-950/20 rounded-lg border border-green-600/30">
                            <div className="flex items-center gap-2 mb-3">
                              <User className="h-5 w-5 text-green-400" />
                              <span className="font-semibold text-green-200">Registered Owner</span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs text-green-200/60 uppercase">Owner Name</span>
                                <div className="text-sm font-semibold text-green-100 mt-1">
                                  {selectedPlot.ownerName || "Name not provided"}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-green-200/60 uppercase">Wallet Address</span>
                                <div className="text-xs font-mono text-green-200/80 mt-1 break-all">
                                  {selectedPlot.owner}
                                </div>
                              </div>
                            </div>
                          </div>

                          {selectedPlot.transactionHash && (
                            <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-600/20">
                              <div className="flex items-center gap-2 mb-3">
                                <FileCheck className="h-5 w-5 text-blue-400" />
                                <span className="font-semibold text-blue-200">Blockchain Record</span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-xs text-blue-200/60 uppercase">Transaction Hash</span>
                                  <div className="text-xs font-mono text-blue-100/80 mt-1 break-all">
                                    {selectedPlot.transactionHash}
                                  </div>
                                </div>
                                {selectedPlot.contractAddress && (
                                  <div>
                                    <span className="text-xs text-blue-200/60 uppercase">Contract Address</span>
                                    <div className="text-xs font-mono text-blue-100/80 mt-1 break-all">
                                      {selectedPlot.contractAddress}
                                    </div>
                                  </div>
                                )}
                                {selectedPlot.tokenId && (
                                  <div>
                                    <span className="text-xs text-blue-200/60 uppercase">Token ID</span>
                                    <div className="text-sm font-mono text-blue-100 mt-1">
                                      #{selectedPlot.tokenId}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-8 text-center border-2 border-dashed border-yellow-600/30 rounded-lg bg-yellow-950/10">
                          <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                          <p className="text-yellow-200 font-semibold mb-2">Parcel Not Registered</p>
                          <p className="text-sm text-yellow-200/60 mb-4">
                            This cadastral parcel is available for registration through the official cadastral process.
                          </p>
                          {isConnected ? (
                            <Button
                              variant="default"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() => navigate(`/plot-purchase?plotId=${selectedPlot.id}`)}
                            >
                              Initiate Registration Process
                            </Button>
                          ) : (
                            <Button variant="outline" disabled>
                              Connect Wallet to Register
                            </Button>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="boundaries" className="mt-4 space-y-4">
                      <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-600/20">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="h-5 w-5 text-blue-400" />
                          <span className="font-semibold text-blue-200">Geodetic Coordinates</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-blue-200/60 uppercase">X Coordinate</span>
                            <div className="text-sm font-mono text-blue-100 mt-1">{selectedPlot.x}</div>
                          </div>
                          <div>
                            <span className="text-xs text-blue-200/60 uppercase">Y Coordinate</span>
                            <div className="text-sm font-mono text-blue-100 mt-1">{selectedPlot.y}</div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-blue-600/20">
                          <span className="text-xs text-blue-200/60 uppercase">Cadastral Reference</span>
                          <div className="text-sm font-mono text-blue-100 mt-1">
                            {selectedPlot.coordinates || `CAD-${cityName.toUpperCase()}-${selectedPlot.id.toString().padStart(6, '0')}`}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-600/20">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="h-5 w-5 text-blue-400" />
                          <span className="font-semibold text-blue-200">Boundary Information</span>
                        </div>
                        <p className="text-sm text-blue-200/80">
                          Boundary survey data and geodetic measurements are maintained in accordance with 
                          cadastral standards. For detailed boundary information, please request an official 
                          cadastral extract document.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Administrative Actions */}
                  <Separator className="my-4" />
                  <div className="flex gap-2">
                    {selectedPlot.owner && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestDocument(selectedPlot, "pdf")}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download PDF Certificate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRequestDocument(selectedPlot, "docx")}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download DOCX Certificate
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPlot(null);
                        setSelectedPlotIds(new Set());
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </Card>
        </TabsContent>

        {/* Property Registry Tab */}
        <TabsContent value="registry" className="mt-4">
          <Card className="border-blue-600/20">
            <CardHeader>
              <CardTitle>Property Registry Database</CardTitle>
              <CardDescription>
                Official cadastral records and administrative information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredPlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No parcels found matching your criteria</p>
                  </div>
                ) : (
                  filteredPlots.slice(0, 50).map((plot) => (
                    <div
                      key={plot.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedPlot(plot)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-600/20 rounded border border-blue-500/30">
                            <Hash className="h-4 w-4 text-blue-400" />
                          </div>
                          <div>
                            <div className="font-semibold">Parcel #{plot.id}</div>
                            <div className="text-sm text-muted-foreground">
                              {plot.coordinates || `Sector ${plot.x},${plot.y}`} • {plot.type || "Unclassified"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {plot.owner ? (
                            <Badge className="bg-green-600/20 text-green-300 border-green-500/50">
                              Registered
                            </Badge>
                          ) : (
                            <Badge variant="outline">Unregistered</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents & Services Tab */}
        <TabsContent value="documents" className="mt-4">
          <Card className="border-blue-600/20">
            <CardHeader>
              <CardTitle>Administrative Services</CardTitle>
              <CardDescription>
                Request official cadastral documents and administrative services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedPlot ? (
                <>
                  <div className="p-4 bg-blue-950/30 rounded-lg border border-blue-600/20">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-400" />
                      Document Services for Parcel #{selectedPlot.id}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handleRequestDocument(selectedPlot, "pdf")}
                        disabled={!selectedPlot.owner}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Cadastral Certificate (PDF)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRequestDocument(selectedPlot, "docx")}
                        disabled={!selectedPlot.owner}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Cadastral Certificate (DOCX)
                      </Button>
                    </div>
                    {!selectedPlot.owner && (
                      <p className="text-sm text-yellow-200/60 mt-2">
                        Parcel must be registered to generate official documents
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a parcel from the map to access document services</p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Administrative Workflows
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" disabled>
                    <FileCheck className="h-4 w-4 mr-2" />
                    Boundary Update Request
                  </Button>
                  <Button variant="outline" disabled>
                    <Edit className="h-4 w-4 mr-2" />
                    Ownership Transfer
                  </Button>
                  <Button variant="outline" disabled>
                    <Archive className="h-4 w-4 mr-2" />
                    Cadastral Extract
                  </Button>
                  <Button variant="outline" disabled>
                    <FileText className="h-4 w-4 mr-2" />
                    Survey Request
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Administrative workflows require official authorization and verification
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cadastral Legend */}
      <Card className="border-blue-600/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm">Cadastral Map Legend</h4>
            <Badge variant="outline" className="text-xs">
              Official Classification
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500/30 border border-blue-500 rounded" />
              <span>Residential Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500/30 border border-green-500 rounded" />
              <span>Commercial Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500/30 border border-orange-500 rounded" />
              <span>Industrial Zone</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted/20 border border-muted/40 rounded" />
              <span>Unregistered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/60 border border-primary rounded" />
              <span>Selected Parcel</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
