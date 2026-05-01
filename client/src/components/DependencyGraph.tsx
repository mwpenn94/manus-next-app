import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
type PackageNode = {
  id: string;
  version: string;
  downloads: number;
  dependencies: string[];
};

type SimulationNode = PackageNode & {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type Edge = {
  source: string;
  target: string;
};

// --- MOCK DATA ---
const mockPackages: PackageNode[] = [
  { id: 'react', version: '19.0.0', downloads: 25000000, dependencies: ['scheduler'] },
  { id: 'framer-motion', version: '11.2.10', downloads: 2000000, dependencies: ['react'] },
  { id: 'tailwindcss', version: '4.0.0-alpha.14', downloads: 7000000, dependencies: ['postcss'] },
  { id: 'lucide-react', version: '0.395.0', downloads: 1500000, dependencies: ['react'] },
  { id: 'shadcn-ui', version: '0.8.0', downloads: 500000, dependencies: ['react', 'tailwindcss'] },
  { id: 'typescript', version: '5.5.2', downloads: 10000000, dependencies: [] },
  { id: 'vite', version: '5.3.1', downloads: 4000000, dependencies: ['esbuild', 'postcss'] },
  { id: 'esbuild', version: '0.21.5', downloads: 3000000, dependencies: [] },
  { id: 'postcss', version: '8.4.38', downloads: 8000000, dependencies: [] },
  { id: 'scheduler', version: '0.23.2', downloads: 15000000, dependencies: [] },
  // Circular dependency chain: A -> B -> C -> A
  { id: 'circ-a', version: '1.0.0', downloads: 10000, dependencies: ['circ-b'] },
  { id: 'circ-b', version: '1.0.0', downloads: 12000, dependencies: ['circ-c'] },
  { id: 'circ-c', version: '1.0.0', downloads: 11000, dependencies: ['circ-a'] },
  // Another small cluster
  { id: 'cluster-x', version: '2.1.0', downloads: 50000, dependencies: ['cluster-y', 'react'] },
  { id: 'cluster-y', version: '1.5.0', downloads: 45000, dependencies: ['cluster-z'] },
  { id: 'cluster-z', version: '3.0.0', downloads: 60000, dependencies: [] },
  // Standalone packages
  { id: 'lodash', version: '4.17.21', downloads: 5000000, dependencies: [] },
  { id: 'moment', version: '2.30.1', downloads: 6000000, dependencies: [] },
  { id: 'clsx', version: '2.1.1', downloads: 2500000, dependencies: [] },
  { id: 'zod', version: '3.23.8', downloads: 1800000, dependencies: [] },
];


// --- FORCE SIMULATION HOOK ---
const useForceSimulation = (
  packages: PackageNode[],
  width: number,
  height: number
) => {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const edges = useMemo<Edge[]>(() => {
    const allEdges: Edge[] = [];
    packages.forEach(p => {
      p.dependencies.forEach(dep => {
        if (packages.some(pkg => pkg.id === dep)) {
          allEdges.push({ source: p.id, target: dep });
        }
      });
    });
    return allEdges;
  }, [packages]);

  const simulationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setNodes(packages.map(p => ({
      ...p,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    })));
  }, [packages, width, height]);

  const runSimulation = useCallback(() => {
    const chargeStrength = -500;
    const linkStrength = 0.1;
    const centerGravity = 0.05;
    const damping = 0.9;

    setNodes(currentNodes => {
      if (currentNodes.length === 0) return [];

      const nextNodes = currentNodes.map(node => ({ ...node, vx: 0, vy: 0 }));

      // Repulsion force (charge)
      for (let i = 0; i < nextNodes.length; i++) {
        for (let j = i + 1; j < nextNodes.length; j++) {
          const nodeA = nextNodes[i];
          const nodeB = nextNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) distance = 1;
          const force = chargeStrength / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          nodeA.vx -= fx;
          nodeA.vy -= fy;
          nodeB.vx += fx;
          nodeB.vy += fy;
        }
      }

      // Link force
      const nodeMap = new Map(nextNodes.map(n => [n.id, n]));
      for (const edge of edges) {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);
        if (!sourceNode || !targetNode) continue;

        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) continue;

        const force = (distance - 100) * linkStrength;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        sourceNode.vx += fx;
        sourceNode.vy += fy;
        targetNode.vx -= fx;
        targetNode.vy -= fy;
      }

      // Centering force
      for (const node of nextNodes) {
        node.vx += (width / 2 - node.x) * centerGravity;
        node.vy += (height / 2 - node.y) * centerGravity;
      }

      // Update positions
      for (const node of nextNodes) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }

      return nextNodes;
    });

    simulationRef.current = requestAnimationFrame(runSimulation);
  }, [edges, width, height]);

  useEffect(() => {
    simulationRef.current = requestAnimationFrame(runSimulation);
    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
    };
  }, [runSimulation]);

  return { nodes, edges };
};

export default function DependencyGraph() {
    const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isPanning.current = false;
  };

  const handleMouseLeave = () => {
    isPanning.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = (e.clientX - panStart.current.x) / zoom;
    const dy = (e.clientY - panStart.current.y) / zoom;
    setPan(p => ({ x: p.x - dx, y: p.y - dy }));
    panStart.current = { x: e.clientX, y: e.clientY };
  };

  const highlightedDeps = useMemo(() => {
    if (!hoveredNode) return { nodes: new Set<string>(), edges: new Set<string>() };

    const nodes = new Set<string>([hoveredNode]);
    const edges = new Set<string>();
    const adj = new Map(mockPackages.map(p => [p.id, p.dependencies]));
    const reverseAdj = new Map<string, string[]>();
    mockPackages.forEach(p => {
        p.dependencies.forEach(dep => {
            if (!reverseAdj.has(dep)) reverseAdj.set(dep, []);
            reverseAdj.get(dep)!.push(p.id);
        });
    });

    const findUpstream = (id: string) => {
      for (const dependent of reverseAdj.get(id) || []) {
        if (!nodes.has(dependent)) {
          nodes.add(dependent);
          edges.add(`${dependent}->${id}`);
          findUpstream(dependent);
        }
      }
    };

    const findDownstream = (id: string) => {
      for (const dependency of adj.get(id) || []) {
        if (!nodes.has(dependency)) {
          nodes.add(dependency);
          edges.add(`${id}->${dependency}`);
          findDownstream(dependency);
        }
      }
    };

    findUpstream(hoveredNode);
    findDownstream(hoveredNode);

    return { nodes, edges };
  }, [hoveredNode]);

  const { nodes, edges } = useForceSimulation(mockPackages, dimensions.width, dimensions.height);

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes;
    const searchLower = searchTerm.toLowerCase();
    const matchingNodes = new Set(nodes.filter((n: SimulationNode) => n.id.toLowerCase().includes(searchLower)).map((n: SimulationNode) => n.id));
    return nodes.filter((n: SimulationNode) => matchingNodes.has(n.id));
  }, [nodes, searchTerm]);

  const circularDeps = useMemo(() => {
    const adj = new Map<string, string[]>();
    mockPackages.forEach(p => adj.set(p.id, p.dependencies));
    const cycles = new Set<string>();

    const visit = (nodeId: string, visiting: Set<string>, path: string[]) => {
      visiting.add(nodeId);
      path.push(nodeId);

      for (const neighbor of adj.get(nodeId) || []) {
        if (visiting.has(neighbor)) {
          const cycleStartIndex = path.indexOf(neighbor);
          for (let i = cycleStartIndex; i < path.length; i++) {
            cycles.add(path[i]);
          }
          cycles.add(neighbor);
        } else {
          visit(neighbor, visiting, path);
        }
      }

      path.pop();
      visiting.delete(nodeId);
    };

    for (const pkg of mockPackages) {
      visit(pkg.id, new Set(), []);
    }
    return cycles;
  }, [mockPackages]);

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const maxDownloads = useMemo(() => Math.max(...mockPackages.map(p => p.downloads)), [mockPackages]);
  const getNodeRadius = (downloads: number) => 5 + (downloads / maxDownloads) * 20;

  return (
    <Card className="w-full h-[700px] flex flex-col bg-background">
      <CardHeader>
        <CardTitle>Dependency Graph</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow relative">
                <div className="absolute top-0 right-0 p-2 flex items-center gap-2 z-10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search package..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-8 w-48 bg-muted"
            />
          </div>
          <button onClick={() => setZoom(z => Math.min(z * 1.2, 5))} className="p-2 rounded-md hover:bg-muted"><ZoomIn className="h-5 w-5" /></button>
          <button onClick={() => setZoom(z => Math.max(z / 1.2, 0.2))} className="p-2 rounded-md hover:bg-muted"><ZoomOut className="h-5 w-5" /></button>
        </div>
        <div ref={containerRef} className="w-full h-full overflow-hidden">
          {dimensions.width > 0 && (
            <svg
              width={dimensions.width}
              height={dimensions.height}
              viewBox={`${-pan.x} ${-pan.y} ${dimensions.width / zoom} ${dimensions.height / zoom}`}
                            className="cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
              <g className="edges">
                {edges.map(edge => {
                  const source = nodeMap.get(edge.source);
                  const target = nodeMap.get(edge.target);
                                    if (!source || !target) return null;
                  const isHighlighted = highlightedDeps.edges.has(`${edge.source}->${edge.target}`);
                  const isDimmed = hoveredNode !== null && !isHighlighted;
                  return (
                    <motion.path
                      key={`${edge.source}-${edge.target}`}
                      d={`M${source.x},${source.y}L${target.x},${target.y}`}
                                            animate={{ opacity: isDimmed ? 0.1 : (isHighlighted ? 1 : 0.5) }}
                      stroke={isHighlighted ? 'hsl(var(--primary))' : 'var(--border)'}
                      strokeWidth={isHighlighted ? 2 : 1}
                      initial={{ opacity: 0 }}
                    />
                  );
                })}
              </g>
              <g className="nodes">
                {filteredNodes.map(node => {
                  const radius = getNodeRadius(node.downloads);
                                    const isCircular = circularDeps.has(node.id);
                  const isHovered = hoveredNode === node.id;
                  const isHighlighted = highlightedDeps.nodes.has(node.id);
                  const isSearched = searchTerm && node.id.toLowerCase().includes(searchTerm.toLowerCase());
                  const isDimmed = (hoveredNode !== null && !isHighlighted) || (searchTerm && !isSearched);

                  if (searchTerm && !filteredNodes.some(n => n.id === node.id)) return null;
                  return (
                    <motion.g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                                            className="cursor-pointer"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      animate={{ opacity: isDimmed ? 0.2 : 1 }}
                    >
                      <motion.circle
                        r={radius}
                        fill={isCircular ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                                                stroke={isHovered || isSearched ? 'hsl(var(--primary))' : 'hsl(var(--background))'}
                        strokeWidth={2}
                        animate={{ scale: isHovered || isSearched ? 1.2 : 1 }}
                      />
                                            <text
                        textAnchor="middle"
                        y={radius + 14}
                        fontSize={10}
                        fill="hsl(var(--foreground))"
                        className="pointer-events-none select-none"
                      >
                        {node.id}
                      </text>
                      <text
                        textAnchor="middle"
                        y={radius + 26}
                        fontSize={8}
                        fill="hsl(var(--muted-foreground))"
                        className="pointer-events-none select-none"
                      >
                        v{node.version}
                      </text>
                    </motion.g>
                  );
                })}
              </g>
            </svg>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
