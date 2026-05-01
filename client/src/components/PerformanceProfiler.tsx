import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronsRight } from 'lucide-react';
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type ProfileCategory = 'app' | 'react' | 'browser' | 'script';

interface ProfileNode {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  children: ProfileNode[];
  level: number;
  category: ProfileCategory;
  parent?: ProfileNode;
}

// --- MOCK DATA GENERATION ---
const generateMockData = (): ProfileNode[] => {
  let idCounter = 0;
  const createNode = (name: string, startTime: number, duration: number, level: number, category: ProfileCategory, children: ProfileNode[] = []): ProfileNode => {
    const node: ProfileNode = {
      id: `node-${idCounter++}`,
      name,
      startTime,
      endTime: startTime + duration,
      duration,
      children,
      level,
      category,
    };
    children.forEach(child => child.parent = node);
    return node;
  };

  const rootDuration = 1000;
  let currentTime = 0;

  const nodes: ProfileNode[] = [
    createNode('App Render', currentTime, 800, 1, 'app', [
      createNode('React.createElement', currentTime, 250, 2, 'react', [
        createNode('ComponentA', currentTime, 100, 3, 'script'),
        createNode('ComponentB', currentTime + 100, 120, 3, 'script'),
      ]),
      createNode('Layout', currentTime + 250, 400, 2, 'browser', [
        createNode('Style Recalculation', currentTime + 250, 150, 3, 'browser'),
        createNode('Paint', currentTime + 400, 250, 3, 'browser'),
      ]),
      createNode('useEffect Hook', currentTime + 650, 150, 2, 'react', [
          createNode('API Fetch', currentTime + 660, 100, 3, 'app'),
      ]),
    ]),
    createNode('Idle Callback', currentTime + 850, 150, 1, 'app', [
        createNode('Analytics', currentTime + 860, 100, 2, 'script')
    ])
  ];

  const addMoreChildren = (node: ProfileNode, maxLevel: number) => {
      if (node.level >= maxLevel) return;
      let childTime = node.startTime;
      for (let i = 0; i < 3; i++) {
          if (childTime >= node.endTime) break;
          const childDuration = Math.random() * (node.endTime - childTime) / 4;
          if (childDuration < 10) continue;
          const child = createNode(`gen-${node.level+1}-${i}`, childTime, childDuration, node.level + 1, 'script');
          child.parent = node;
          node.children.push(child);
          addMoreChildren(child, maxLevel);
          childTime += childDuration + 5;
      }
  }

  const root: ProfileNode = createNode('Total Execution', 0, rootDuration, 0, 'app', nodes);
  nodes.forEach(node => addMoreChildren(node, 3));

  const allNodes: ProfileNode[] = [];
  const flatten = (node: ProfileNode) => {
    allNodes.push(node);
    node.children.forEach(flatten);
  }
  flatten(root);

  return allNodes;
};

const mockData = generateMockData();

// --- COMPONENT ---
export default function PerformanceProfiler() {
  const rootNode = useMemo(() => mockData.find(n => n.level === 0)!, []);
  const [zoomStack, setZoomStack] = useState<ProfileNode[]>([rootNode]);
  const [searchTerm, setSearchTerm] = useState("");

  const currentView = zoomStack[zoomStack.length - 1];

  const hotPathNodeIds = useMemo(() => {
    const path = new Set<string>();
    let currentNode = currentView;
    if(currentNode) {
        path.add(currentNode.id);
        while (currentNode.children.length > 0) {
          const heaviestChild = currentNode.children.reduce((heaviest, child) => 
            child.duration > heaviest.duration ? child : heaviest, currentNode.children[0]
          );
          path.add(heaviestChild.id);
          currentNode = heaviestChild;
        }
    }
    return path;
  }, [currentView]);

  const viewStartTime = currentView?.startTime ?? 0;
  const viewDuration = currentView?.duration ?? 1000;

  const handleNodeClick = useCallback((node: ProfileNode) => {
    if (node.children.length > 0) {
        setZoomStack(prev => [...prev, node]);
    }
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    setZoomStack(prev => prev.slice(0, index + 1));
  }, []);

  return (
    <div className="w-full h-[600px] bg-background text-foreground rounded-lg border border-border flex flex-col p-4 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Performance Profiler</h2>
        <div className="relative w-1/3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search function..."
            className="pl-9"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Breadcrumbs stack={zoomStack} onClick={handleBreadcrumbClick} />

      <div className="flex-grow relative mt-2">
        <FlameChart 
          data={mockData.filter(n => n.level > 0)}
          viewStartTime={viewStartTime}
          viewDuration={viewDuration}
          hotPathNodeIds={hotPathNodeIds}
          onNodeClick={handleNodeClick}
          searchTerm={searchTerm}
        />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Total Time: </span>
          <span className="font-semibold">{viewDuration.toFixed(2)}ms</span>
        </div>
        <Badge variant={zoomStack.length > 1 ? "default" : "secondary"}>
          Zoom Level: {zoomStack.length}
        </Badge>
      </div>
    </div>
  );
}

// --- FLAME CHART COMPONENT ---
const CATEGORY_COLORS: Record<ProfileCategory, string> = {
  app: 'bg-blue-500/80',
  react: 'bg-purple-500/80',
  browser: 'bg-orange-500/80',
  script: 'bg-green-500/80',
};

const CATEGORY_HOVER_COLORS: Record<ProfileCategory, string> = {
  app: 'bg-blue-400',
  react: 'bg-purple-400',
  browser: 'bg-orange-400',
  script: 'bg-green-400',
};

interface FlameChartProps {
  data: ProfileNode[];
  viewStartTime: number;
  viewDuration: number;
  onNodeClick: (node: ProfileNode) => void;
  searchTerm: string;
  hotPathNodeIds: Set<string>;
}

const FlameChart: React.FC<FlameChartProps> = ({ data, viewStartTime, viewDuration, onNodeClick, searchTerm, hotPathNodeIds }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const nodesToRender = useMemo(() => {
    const visibleNodes = data.filter(node => 
      node.startTime < viewStartTime + viewDuration && node.endTime > viewStartTime
    );

    if (!searchTerm) return visibleNodes;

    const searchLower = searchTerm.toLowerCase();
    const matchedNodes = new Set<ProfileNode>();
    visibleNodes.forEach(node => {
      if (node.name.toLowerCase().includes(searchLower)) {
        let current: ProfileNode | undefined = node;
        while(current) {
          matchedNodes.add(current);
          current = current.parent;
        }
      }
    });
    return Array.from(matchedNodes);
  }, [data, viewStartTime, viewDuration, searchTerm]);

  const maxLevel = useMemo(() => {
    if (nodesToRender.length === 0) return 0;
    return Math.max(...nodesToRender.map(n => n.level));
  }, [nodesToRender]);

  const rowHeight = 24;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="absolute inset-0 overflow-auto bg-muted/50 rounded-sm">
        <div
          className="relative"
          style={{ height: `${(maxLevel + 1) * rowHeight}px`, width: '100%' }}
        >
          <AnimatePresence>
            {nodesToRender.map((node) => {
              if (node.startTime > viewStartTime + viewDuration || node.endTime < viewStartTime) return null;
              const width = (node.duration / viewDuration) * 100;
              const left = ((node.startTime - viewStartTime) / viewDuration) * 100;

              return (
                <Tooltip key={node.id}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: node.level * 0.02 }}
                      onHoverStart={() => setHoveredNode(node.id)}
                      onHoverEnd={() => setHoveredNode(null)}
                      onClick={() => onNodeClick(node)}
                      className={cn(
                        "absolute flex items-center justify-start px-2 text-xs text-white font-medium whitespace-nowrap overflow-hidden rounded-sm cursor-pointer transition-all duration-200",
                        hotPathNodeIds.has(node.id) ? `${CATEGORY_COLORS[node.category].replace('/80', '')} ring-1 ring-red-400/80` : (hoveredNode === node.id ? CATEGORY_HOVER_COLORS[node.category] : CATEGORY_COLORS[node.category]),
                        searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase()) && 'opacity-20',
                        searchTerm && node.name.toLowerCase().includes(searchTerm.toLowerCase()) && 'ring-2 ring-yellow-400 z-10'
                      )}
                      style={{
                        left: `${Math.max(0, left)}%`,
                        width: `${Math.min(100 - left, width)}%`,
                        top: `${node.level * rowHeight}px`,
                        height: `${rowHeight - 2}px`,
                      }}
                    >
                      <span className="truncate">{node.name}</span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-bold">{node.name}</p>
                    <p>Duration: {node.duration.toFixed(2)}ms</p>
                    <p>Category: {node.category}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
};

// --- BREADCRUMBS COMPONENT ---
interface BreadcrumbsProps {
  stack: ProfileNode[];
  onClick: (index: number) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ stack, onClick }) => {
  return (
    <div className="flex items-center text-sm text-muted-foreground mb-2 flex-wrap">
      {stack.map((node, index) => (
        <React.Fragment key={node.id}>
          <button 
            onClick={() => onClick(index)} 
            className="hover:text-foreground disabled:text-foreground disabled:font-semibold"
            disabled={index === stack.length - 1}
          >
            {node.name}
          </button>
          {index < stack.length - 1 && <ChevronsRight className="h-4 w-4 mx-1" />}
        </React.Fragment>
      ))}
    </div>
  );
};
