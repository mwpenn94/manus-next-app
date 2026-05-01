import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, ZoomIn, ZoomOut, RefreshCw, MousePointer, Square, Eraser } from 'lucide-react';

// Type definitions
type Point = { x: number; y: number };
type EmbeddingPoint = {
  id: number;
  x: number;
  y: number;
  label: string;
  cluster: number;
  confidence: number;
  metadata: { [key: string]: string | number };
};

type ClusterInfo = {
  id: number;
  color: string;
  name: string;
};

// Mock Data Generation
const CLUSTERS: ClusterInfo[] = [
  { id: 0, name: 'Topic: AI Ethics', color: 'hsl(210, 80%, 60%)' },
  { id: 1, name: 'Topic: LLM Arch', color: 'hsl(150, 80%, 60%)' },
  { id: 2, name: 'Topic: RAG Systems', color: 'hsl(50, 80%, 60%)' },
  { id: 3, name: 'Topic: Agentic AI', color: 'hsl(350, 80%, 60%)' },
  { id: 4, name: 'Topic: Multimodality', color: 'hsl(280, 80%, 60%)' },
];

const generateMockData = (numPoints: number): EmbeddingPoint[] => {
  const data: EmbeddingPoint[] = [];
  const numClusters = CLUSTERS.length;
  for (let i = 0; i < numPoints; i++) {
    const clusterId = i % numClusters;
    const angle = (i * (360 / (numPoints/numClusters))) * Math.PI / 180 + Math.random() * 0.2;
    const radius = Math.random() * 25 + 40;
    const offsetX = (clusterId % 2 === 0 ? 1 : -1) * (Math.floor(clusterId / 2) + 1) * 75;
    const offsetY = (clusterId > 2 ? 1 : -1) * (clusterId % 2 === 0 ? 1 : -1) * 75;

    data.push({
      id: i,
      x: Math.cos(angle) * radius + offsetX + (Math.random() - 0.5) * 30,
      y: Math.sin(angle) * radius + offsetY + (Math.random() - 0.5) * 30,
      label: `Doc-${i}`,
      cluster: clusterId,
      confidence: Math.random() * 0.5 + 0.5,
      metadata: {
        'distance': Math.random().toFixed(4),
        'tokens': Math.floor(Math.random() * 1000) + 50
      },
    });
  }
  return data;
};

const initialData = generateMockData(200);

// Point in polygon check
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
            && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) isInside = !isInside;
    }
    return isInside;
}

export default function EmbeddingVisualizer() {
  const [data, setData] = useState<EmbeddingPoint[]>(initialData);
  const [visibleClusters, setVisibleClusters] = useState<Set<number>>(new Set(CLUSTERS.map(c => c.id)));
  const [dimReductionMethod, setDimReductionMethod] = useState<string>('t-SNE');
  const [pointSize, setPointSize] = useState<number>(50);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<EmbeddingPoint | null>(null);
  const [selectedPoints, setSelectedPoints] = useState<Set<number>>(new Set());
  const [interactionMode, setInteractionMode] = useState<'pan' | 'lasso'>('pan');
  const [lassoPath, setLassoPath] = useState<Point[]>([]);
  const [isLassoing, setIsLassoing] = useState(false);

  const [viewBox, setViewBox] = useState({ x: -200, y: -200, width: 400, height: 400 });
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const filteredData = useMemo(() => data.filter(p => visibleClusters.has(p.cluster)), [data, visibleClusters]);

  const handleClusterToggle = (clusterId: number) => {
    setVisibleClusters(prev => {
      const next = new Set(prev);
      if (next.has(clusterId)) next.delete(clusterId); else next.add(clusterId);
      return next;
    });
  };

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return;
    const { clientWidth, clientHeight } = svgRef.current;
    setViewBox(prev => ({
      x: prev.x + prev.width * (1 - factor) / 2,
      y: prev.y + prev.height * (1 - factor) / 2,
      width: prev.width * factor,
      height: prev.height * factor,
    }));
  };

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  }

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (interactionMode === 'pan') {
      isDragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    } else {
      setIsLassoing(true);
      setLassoPath([getSVGPoint(e)]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (interactionMode === 'pan' && isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      if (!svgRef.current) return;
      setViewBox(prev => ({
        ...prev,
        x: prev.x - dx * (prev.width / svgRef.current!.clientWidth),
        y: prev.y - dy * (prev.height / svgRef.current!.clientHeight),
      }));
    } else if (interactionMode === 'lasso' && isLassoing) {
      setLassoPath(prev => [...prev, getSVGPoint(e)]);
    }
  };

  const handleMouseUp = () => {
    if (interactionMode === 'pan') {
      isDragging.current = false;
    } else if (isLassoing) {
      setIsLassoing(false);
      if (lassoPath.length > 2) {
        const newlySelected = new Set<number>();
        filteredData.forEach(p => {
          if (isPointInPolygon({x: p.x, y: p.y}, lassoPath)) {
            newlySelected.add(p.id);
          }
        });
        setSelectedPoints(prev => new Set([...Array.from(prev), ...Array.from(newlySelected)]));
      }
      setLassoPath([]);
    }
  };

  const resetView = () => setViewBox({ x: -200, y: -200, width: 400, height: 400 });
  const clearSelection = () => setSelectedPoints(new Set());

  return (
    <Card className="w-full h-[700px] bg-background text-foreground flex flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
        <CardTitle>Embedding Visualization</CardTitle>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={interactionMode} onValueChange={(value: 'pan' | 'lasso') => value && setInteractionMode(value)} aria-label="Interaction Mode">
            <ToggleGroupItem value="pan" aria-label="Pan and zoom"><MousePointer className="h-4 w-4" /></ToggleGroupItem>
            <ToggleGroupItem value="lasso" aria-label="Lasso select"><Square className="h-4 w-4" /></ToggleGroupItem>
          </ToggleGroup>
          <Select value={dimReductionMethod} onValueChange={setDimReductionMethod}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="t-SNE">t-SNE</SelectItem>
              <SelectItem value="UMAP">UMAP</SelectItem>
              <SelectItem value="PCA">PCA</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.8)}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom(1.25)}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={resetView}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex gap-4 p-4 overflow-hidden">
        <div className="w-1/4 flex flex-col gap-4 pr-4 border-r border-border">
          <div className="relative">
            <Input placeholder="Search points..." value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} className="pl-8" />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <Label className="font-semibold">Clusters</Label>
            <div className="space-y-2 mt-2">
              {CLUSTERS.map(cluster => (
                <div key={cluster.id} className="flex items-center gap-2">
                  <Checkbox id={`cluster-${cluster.id}`} checked={visibleClusters.has(cluster.id)} onCheckedChange={() => handleClusterToggle(cluster.id)} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cluster.color }}></div>
                  <Label htmlFor={`cluster-${cluster.id}`} className="text-sm font-normal cursor-pointer">{cluster.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="point-size" className="font-semibold">Point Size by Confidence</Label>
            <Slider id="point-size" min={10} max={100} step={10} value={[pointSize]} onValueChange={(value: number[]) => setPointSize(value[0])} className="mt-2" />
          </div>
          <div>
            <Label className="font-semibold">Selection</Label>
            <div className="flex items-center gap-2 mt-2">
                <Button onClick={clearSelection} variant="outline" className="w-full"><Eraser className="h-4 w-4 mr-2"/>Clear Selection</Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{selectedPoints.size} points selected.</p>
          </div>
        </div>
        <div className="flex-1 h-full bg-muted rounded-lg border border-border relative overflow-hidden">
          <svg
            ref={svgRef}
            className={`w-full h-full ${interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <AnimatePresence>
              {filteredData.map(point => {
                const isHighlighted = searchTerm && point.label.toLowerCase().includes(searchTerm.toLowerCase());
                const isSelected = selectedPoints.has(point.id);
                return (
                  <motion.circle
                    key={point.id}
                    cx={point.x}
                    cy={point.y}
                    r={(point.confidence * (pointSize / 50)) * (isSelected ? 1.2 : 1)}
                    fill={CLUSTERS.find(c => c.id === point.cluster)?.color || '#ccc'}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: isHighlighted || isSelected ? 1 : 0.7, scale: isHighlighted ? 1.5 : 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ duration: 0.3 }}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className={cn(
                      'stroke-background transition-all',
                      { 'stroke-2 stroke-foreground': isHighlighted || isSelected, 'stroke-1': !isHighlighted && !isSelected }
                    )}
                  />
                );
              })}
            </AnimatePresence>
            {lassoPath.length > 0 && (
                <path d={`M ${lassoPath.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="rgba(100,100,255,0.2)" stroke="rgba(100,100,255,0.8)" strokeWidth="0.5" />
            )}
          </svg>
          <AnimatePresence>
            {hoveredPoint && (
              <Popover open={true} >
                <PopoverTrigger asChild>
                    <div className="absolute pointer-events-none" style={{ left: `${((hoveredPoint.x - viewBox.x) / viewBox.width) * 100}%`, top: `${((hoveredPoint.y - viewBox.y) / viewBox.height) * 100}%`}}></div>
                </PopoverTrigger>
                <PopoverContent className="w-auto text-xs" side="top" align="center" sideOffset={10}>
                    <div className="font-bold">{hoveredPoint.label}</div>
                    <div className="text-muted-foreground">Cluster: {CLUSTERS.find(c => c.id === hoveredPoint.cluster)?.name.split(': ')[1]}</div>
                    <div>Confidence: {hoveredPoint.confidence.toFixed(3)}</div>
                    {Object.entries(hoveredPoint.metadata).map(([key, value]) => (
                      <div key={key} className="capitalize">{key}: {value}</div>
                    ))}
                </PopoverContent>
              </Popover>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
