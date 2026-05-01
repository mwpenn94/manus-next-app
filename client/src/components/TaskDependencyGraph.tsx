import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion, Wrench, ZoomIn, ZoomOut } from 'lucide-react';

// --- TYPES --- //

type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface TaskNode {
  id: string;
  label: string;
  status: NodeStatus;
  x?: number;
  y?: number;
}

export interface TaskEdge {
  from: string;
  to: string;
  label?: string;
}

export interface TaskDependencyGraphProps {
  nodes: TaskNode[];
  edges: TaskEdge[];
  onNodeClick?: (id: string) => void;
  selectedNodeId?: string;
  layout?: 'horizontal' | 'vertical';
}

// --- CONSTANTS --- //

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;
const HORIZONTAL_GAP = 80;
const VERTICAL_GAP = 60;
const PADDING = 40;

const statusStyles: { [key in NodeStatus]: { bg: string; border: string; text: string; icon: React.ReactNode } } = {
  pending: { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', icon: <ShieldQuestion className="h-4 w-4" /> },
  running: { bg: 'bg-blue-900/50', border: 'border-blue-500', text: 'text-blue-300', icon: <Wrench className="h-4 w-4 animate-spin" /> },
  completed: { bg: 'bg-green-900/50', border: 'border-green-500', text: 'text-green-300', icon: <ShieldCheck className="h-4 w-4" /> },
  failed: { bg: 'bg-red-900/50', border: 'border-red-500', text: 'text-red-300', icon: <ShieldAlert className="h-4 w-4" /> },
  blocked: { bg: 'bg-yellow-900/50', border: 'border-yellow-500', text: 'text-yellow-300', icon: <Shield className="h-4 w-4" /> },
};

// --- LAYOUT HOOK --- //

const useGraphLayout = (nodes: TaskNode[], edges: TaskEdge[], layout: 'horizontal' | 'vertical') => {
  return useMemo(() => {
    if (nodes.every(n => n.x != null && n.y != null)) {
      const positionedNodes = nodes.map(n => ({ ...n, x: n.x!, y: n.y! }));
      const width = Math.max(...positionedNodes.map(n => n.x)) + NODE_WIDTH + PADDING;
      const height = Math.max(...positionedNodes.map(n => n.y)) + NODE_HEIGHT + PADDING;
      return { positionedNodes, width, height };
    }

    const adj: { [key: string]: string[] } = {};
    const inDegree: { [key: string]: number } = {};
    nodes.forEach(node => {
      adj[node.id] = [];
      inDegree[node.id] = 0;
    });

    edges.forEach(({ from, to }) => {
      adj[from].push(to);
      inDegree[to]++;
    });

    const queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const layers: string[][] = [];
    const nodeLayerMap = new Map<string, number>();

    while (queue.length > 0) {
      const layerSize = queue.length;
      const currentLayer: string[] = [];
      for (let i = 0; i < layerSize; i++) {
        const u = queue.shift()!;
        currentLayer.push(u);
        nodeLayerMap.set(u, layers.length);
        adj[u].forEach(v => {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            queue.push(v);
          }
        });
      }
      layers.push(currentLayer);
    }

    const positionedNodes: (TaskNode & { x: number; y: number })[] = [];
    const maxLayerCount = Math.max(...layers.map(l => l.length));

    layers.forEach((layer, layerIndex) => {
      const layerNodeCount = layer.length;
      layer.forEach((nodeId, nodeIndex) => {
        const node = nodes.find(n => n.id === nodeId)!;
        let x, y;
        if (layout === 'horizontal') {
          x = layerIndex * (NODE_WIDTH + HORIZONTAL_GAP) + PADDING;
          y = (nodeIndex * (NODE_HEIGHT + VERTICAL_GAP)) + ((maxLayerCount - layerNodeCount) / 2 * (NODE_HEIGHT + VERTICAL_GAP)) + PADDING;
        } else {
          x = (nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP)) + ((maxLayerCount - layerNodeCount) / 2 * (NODE_WIDTH + HORIZONTAL_GAP)) + PADDING;
          y = layerIndex * (NODE_HEIGHT + VERTICAL_GAP) + PADDING;
        }
        positionedNodes.push({ ...node, x, y });
      });
    });

    const graphWidth = layout === 'horizontal'
      ? layers.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP + PADDING * 2
      : maxLayerCount * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP + PADDING * 2;

    const graphHeight = layout === 'vertical'
      ? layers.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP + PADDING * 2
      : maxLayerCount * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP + PADDING * 2;

    return { positionedNodes, width: Math.max(600, graphWidth), height: Math.max(400, graphHeight) };
  }, [nodes, edges, layout]);
};

// --- SUB-COMPONENTS --- //

const GraphNode: React.FC<{ node: TaskNode & { x: number; y: number }; isSelected: boolean; onClick: () => void; }> = ({ node, isSelected, onClick }) => {
  const styles = statusStyles[node.status];
  const isRunning = node.status === 'running';

  return (
    <motion.g
      key={node.id}
      initial={{ x: node.x, y: node.y, opacity: 0 }}
      animate={{ x: node.x, y: node.y, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <g>
              <motion.rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                ry={8}
                className={cn('stroke-2', styles.bg, isSelected ? 'stroke-primary' : styles.border)}
                animate={{
                  stroke: isSelected ? 'hsl(var(--primary))' : `hsl(var(--${styles.border.replace('border-', '')}))`,
                  fill: `hsl(var(--${styles.bg.replace('bg-', '')}))`,
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' as const }}
              />
              {isRunning && (
                <motion.rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  ry={8}
                  className="fill-none stroke-blue-500"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' as const }}
                />
              )}
              <foreignObject x="5" y="5" width={NODE_WIDTH - 10} height={NODE_HEIGHT - 10}>
                <div className={cn('flex items-center h-full w-full', styles.text)} style={{ color: styles.text.includes('muted') ? 'hsl(var(--muted-foreground))' : undefined }}>
                  <div className="mr-2 flex-shrink-0">{styles.icon}</div>
                  <span className="truncate font-medium text-sm">{node.label}</span>
                </div>
              </foreignObject>
            </g>
          </TooltipTrigger>
          <TooltipContent>
            <p>{node.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </motion.g>
  );
};

const GraphEdge: React.FC<{ edge: TaskEdge; fromNode: TaskNode & {x:number, y:number}; toNode: TaskNode & {x:number, y:number}; layout: 'horizontal' | 'vertical' }> = ({ edge, fromNode, toNode, layout }) => {
  const getPath = () => {
    if (layout === 'horizontal') {
        const fromX = fromNode.x + NODE_WIDTH;
        const fromY = fromNode.y + NODE_HEIGHT / 2;
        const toX = toNode.x;
        const toY = toNode.y + NODE_HEIGHT / 2;
        const midX = fromX + (toX - fromX) / 2;
        return `M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`;
    } else {
        const fromX = fromNode.x + NODE_WIDTH / 2;
        const fromY = fromNode.y + NODE_HEIGHT;
        const toX = toNode.x + NODE_WIDTH / 2;
        const toY = toNode.y;
        const midY = fromY + (toY - fromY) / 2;
        return `M${fromX},${fromY} C${fromX},${midY} ${toX},${midY} ${toX},${toY}`;
    }
  };

  return (
    <motion.path
      key={`${edge.from}-${edge.to}`}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 0.5 }}
      transition={{ duration: 0.8, delay: 0.3, ease: 'easeInOut' as const }}
      d={getPath()}
      strokeWidth={2}
      className="stroke-muted-foreground group-hover:stroke-primary transition-colors"
      markerEnd="url(#arrowhead)"
    />
  );
};

const Minimap: React.FC<{ graphWidth: number; graphHeight: number; viewportRef: React.RefObject<HTMLDivElement | null>; nodes: (TaskNode & {x: number, y: number})[] }> = ({ graphWidth, graphHeight, viewportRef, nodes }) => {
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const minimapWidth = 150;
    const scale = minimapWidth / graphWidth;
    const minimapHeight = graphHeight * scale;

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const updateViewBox = () => {
            const { scrollLeft, scrollTop, clientWidth, clientHeight } = viewport;
            setViewBox({ x: scrollLeft * scale, y: scrollTop * scale, width: clientWidth * scale, height: clientHeight * scale });
        };

        updateViewBox();
        viewport.addEventListener('scroll', updateViewBox);
        const resizeObserver = new ResizeObserver(updateViewBox);
        resizeObserver.observe(viewport);

        return () => {
            viewport.removeEventListener('scroll', updateViewBox);
            resizeObserver.unobserve(viewport);
        };
    }, [viewportRef, scale]);

    return (
        <div className="absolute bottom-4 right-4 w-[150px] bg-background/50 border border-border rounded-md overflow-hidden backdrop-blur-sm shadow-lg">
            <svg width={minimapWidth} height={minimapHeight} viewBox={`0 0 ${graphWidth} ${graphHeight}`}>
                <rect width={graphWidth} height={graphHeight} className="fill-card/50" />
                {nodes.map(node => (
                    <rect key={node.id} x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEIGHT} rx={8} ry={8} className={cn(statusStyles[node.status].bg, 'opacity-70')} />
                ))}
            </svg>
            <div 
                className="absolute top-0 left-0 border-2 border-primary/80 bg-primary/20"
                style={{ 
                    transform: `translate(${viewBox.x}px, ${viewBox.y}px)`,
                    width: viewBox.width,
                    height: viewBox.height,
                }}
            />
        </div>
    );
};

// --- MAIN COMPONENT --- //

export const TaskDependencyGraph: React.FC<TaskDependencyGraphProps> = ({
  nodes,
  edges,
  onNodeClick = () => {},
  selectedNodeId,
  layout = 'horizontal',
}) => {
  const { positionedNodes, width, height } = useGraphLayout(nodes, edges, layout);
  const nodeMap = useMemo(() => new Map(positionedNodes.map(n => [n.id, n])), [positionedNodes]);

  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (!viewportRef.current) return;
    e.preventDefault();
    const newZoom = Math.max(0.2, Math.min(2, zoom - e.deltaY * 0.001));
    setZoom(newZoom);
  };

  return (
    <div className="relative w-full h-full bg-background rounded-lg border overflow-hidden">
      <div 
        ref={viewportRef}
        className="w-full h-full overflow-auto cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
      >
        <motion.div
          ref={contentRef}
          className="relative"
          style={{ width, height }}
          animate={{ scale: zoom }}
          transition={{ duration: 0.2, ease: 'linear' as const }}
        >
          <svg width={width} height={height} className="absolute top-0 left-0">
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
              </marker>
            </defs>
            <g>
              <AnimatePresence>
                {edges.map(edge => {
                  const fromNode = nodeMap.get(edge.from);
                  const toNode = nodeMap.get(edge.to);
                  if (!fromNode || !toNode) return null;
                  return <GraphEdge key={`${edge.from}-${edge.to}`} edge={edge} fromNode={fromNode} toNode={toNode} layout={layout} />;
                })}
              </AnimatePresence>
            </g>
            <g>
              <AnimatePresence>
                {positionedNodes.map(node => (
                  <GraphNode
                    key={node.id}
                    node={node}
                    isSelected={node.id === selectedNodeId}
                    onClick={() => onNodeClick(node.id)}
                  />
                ))}
              </AnimatePresence>
            </g>
          </svg>
        </motion.div>
      </div>
      <Minimap graphWidth={width} graphHeight={height} viewportRef={viewportRef} nodes={positionedNodes} />
      <div className="absolute top-4 left-4 flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 rounded-md bg-card border hover:bg-accent transition-colors"><ZoomIn className="h-4 w-4" /></button>
          <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-2 rounded-md bg-card border hover:bg-accent transition-colors"><ZoomOut className="h-4 w-4" /></button>
      </div>
    </div>
  );
};
