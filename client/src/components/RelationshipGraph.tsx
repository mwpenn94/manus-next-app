import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// Types
type EntityType = 'person' | 'project' | 'team';

interface NodeData {
  id: string;
  label: string;
  type: EntityType;
  importance: number; // 1-5
  description: string;
}

interface EdgeData {
  source: string;
  target: string;
  label?: string;
}

interface SimulationNode extends NodeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

// Mock Data
const MOCK_NODES: NodeData[] = [
  { id: 'p1', label: 'Alice Chen', type: 'person', importance: 5, description: 'Lead AI Researcher' },
  { id: 'p2', label: 'Bob Smith', type: 'person', importance: 4, description: 'Senior Engineer' },
  { id: 'p3', label: 'Carol Davis', type: 'person', importance: 3, description: 'Product Manager' },
  { id: 'p4', label: 'David Kim', type: 'person', importance: 4, description: 'Data Scientist' },
  { id: 'p5', label: 'Eve Wilson', type: 'person', importance: 3, description: 'UX Designer' },
  { id: 't1', label: 'Core AI Team', type: 'team', importance: 5, description: 'Main AI development group' },
  { id: 't2', label: 'Product Team', type: 'team', importance: 4, description: 'Product strategy and design' },
  { id: 'pr1', label: 'Project Sovereign', type: 'project', importance: 5, description: 'Next-gen autonomous agent' },
  { id: 'pr2', label: 'Project Nexus', type: 'project', importance: 4, description: 'Data integration platform' },
  { id: 'pr3', label: 'Project Atlas', type: 'project', importance: 3, description: 'Global mapping initiative' },
];

const MOCK_EDGES: EdgeData[] = [
  { source: 'p1', target: 't1', label: 'Leads' },
  { source: 'p2', target: 't1', label: 'Member' },
  { source: 'p4', target: 't1', label: 'Member' },
  { source: 'p3', target: 't2', label: 'Leads' },
  { source: 'p5', target: 't2', label: 'Member' },
  { source: 't1', target: 'pr1', label: 'Owns' },
  { source: 't1', target: 'pr2', label: 'Contributes' },
  { source: 't2', target: 'pr1', label: 'Designs' },
  { source: 'p1', target: 'pr1', label: 'Architect' },
  { source: 'p4', target: 'pr2', label: 'Lead Data' },
  { source: 't2', target: 'pr3', label: 'Owns' },
];

const TYPE_COLORS: Record<EntityType, string> = {
  person: '#3b82f6', // blue-500
  project: '#10b981', // emerald-500
  team: '#8b5cf6', // violet-500
};

export default function RelationshipGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes] = useState<SimulationNode[]>([]);
  const [edges] = useState<EdgeData[]>(MOCK_EDGES);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<SimulationNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  
  const requestRef = useRef<number | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  
  // Initialize nodes
  useEffect(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    
    const initialNodes = MOCK_NODES.map(node => ({
      ...node,
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0
    }));
    
    nodesRef.current = initialNodes;
    setNodes(initialNodes);
  }, []);

  // Physics simulation
  const tick = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;
    const currentNodes = [...nodesRef.current];
    
    const k = 0.05; // Spring constant
    const repulsion = 3000; // Repulsion constant
    const damping = 0.7;
    const idealDist = 120;
    
    // Repulsion
    for (let i = 0; i < currentNodes.length; i++) {
      for (let j = i + 1; j < currentNodes.length; j++) {
        const dx = currentNodes[i].x - currentNodes[j].x;
        const dy = currentNodes[i].y - currentNodes[j].y;
        const distSq = dx * dx + dy * dy || 1;
        
        if (distSq < 90000) { // Only apply repulsion if close enough (300px)
          const dist = Math.sqrt(distSq);
          const force = repulsion / distSq;
          
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          
          currentNodes[i].vx += fx;
          currentNodes[i].vy += fy;
          currentNodes[j].vx -= fx;
          currentNodes[j].vy -= fy;
        }
      }
    }
    
    // Attraction (Edges)
    edges.forEach(edge => {
      const sourceIdx = currentNodes.findIndex(n => n.id === edge.source);
      const targetIdx = currentNodes.findIndex(n => n.id === edge.target);
      
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const source = currentNodes[sourceIdx];
        const target = currentNodes[targetIdx];
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const force = (dist - idealDist) * k;
        
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }
    });
    
    // Centering force
    const centerX = width / 2;
    const centerY = height / 2;
    const centerForce = 0.02;
    
    currentNodes.forEach(n => {
      n.vx += (centerX - n.x) * centerForce;
      n.vy += (centerY - n.y) * centerForce;
    });
    
    // Update positions
    let totalMovement = 0;
    
    currentNodes.forEach(n => {
      if (n.fx !== undefined && n.fx !== null) {
        n.x = n.fx;
        n.y = n.fy!;
        n.vx = 0;
        n.vy = 0;
      } else {
        n.vx *= damping;
        n.vy *= damping;
        
        // Cap velocity
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > 20) {
          n.vx = (n.vx / speed) * 20;
          n.vy = (n.vy / speed) * 20;
        }
        
        n.x += n.vx;
        n.y += n.vy;
        
        totalMovement += speed;
      }
    });
    
    nodesRef.current = currentNodes;
    setNodes([...currentNodes]);
    
    // Continue simulation if there's still movement
    if (totalMovement > 0.5 || draggedNode) {
      requestRef.current = requestAnimationFrame(tick);
    } else {
      requestRef.current = null;
    }
  }, [edges, draggedNode]);
  
  useEffect(() => {
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(tick);
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [tick]);

  // Restart simulation when dragging
  useEffect(() => {
    if (draggedNode && !requestRef.current) {
      requestRef.current = requestAnimationFrame(tick);
    }
  }, [draggedNode, tick]);

  // Interaction handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    
    // Give nodes a little kick to re-layout
    const currentNodes = [...nodesRef.current];
    currentNodes.forEach(n => {
      if (n.fx === undefined || n.fx === null) {
        n.vx += (Math.random() - 0.5) * 10;
        n.vy += (Math.random() - 0.5) * 10;
      }
    });
    nodesRef.current = currentNodes;
    if (!requestRef.current) {
      requestRef.current = requestAnimationFrame(tick);
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    setDraggedNode(id);
    
    const currentNodes = [...nodesRef.current];
    const nodeIdx = currentNodes.findIndex(n => n.id === id);
    if (nodeIdx !== -1) {
      currentNodes[nodeIdx].fx = x;
      currentNodes[nodeIdx].fy = y;
      nodesRef.current = currentNodes;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging && !draggedNode) {
      setPan(p => ({
        x: p.x + e.movementX,
        y: p.y + e.movementY
      }));
      return;
    }
    
    if (draggedNode) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      const currentNodes = [...nodesRef.current];
      const nodeIdx = currentNodes.findIndex(n => n.id === draggedNode);
      if (nodeIdx !== -1) {
        currentNodes[nodeIdx].fx = x;
        currentNodes[nodeIdx].fy = y;
        nodesRef.current = currentNodes;
      }
    }
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    if (draggedNode) {
      const currentNodes = [...nodesRef.current];
      const nodeIdx = currentNodes.findIndex(n => n.id === draggedNode);
      if (nodeIdx !== -1) {
        currentNodes[nodeIdx].fx = null;
        currentNodes[nodeIdx].fy = null;
        nodesRef.current = currentNodes;
      }
      setDraggedNode(null);
    }
  };

  // Render helpers
  const getNodeRadius = (importance: number) => 15 + importance * 5;

  return (
    <div className="flex flex-col h-full w-full min-h-[600px] bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative font-sans">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-white dark:bg-slate-900 p-2 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
        <button onClick={handleZoomIn} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors" aria-label="Zoom In">
          <ZoomIn className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <button onClick={handleZoomOut} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors" aria-label="Zoom Out">
          <ZoomOut className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
        <button onClick={handleReset} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors" aria-label="Reset View">
          <Maximize className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-900 p-4 rounded-lg shadow-md border border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold mb-2 text-slate-800 dark:text-slate-200">Entity Types</h3>
        <div className="flex flex-col gap-2">
          {Object.entries(TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs capitalize text-slate-600 dark:text-slate-400">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredNode && !draggedNode && (
        <div 
          className="absolute z-20 bg-white dark:bg-slate-900 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 pointer-events-none max-w-xs transition-opacity duration-200"
          style={{
            left: Math.max(10, Math.min(hoveredNode.x * zoom + pan.x + 20, (containerRef.current?.clientWidth || 800) - 200)),
            top: Math.max(10, Math.min(hoveredNode.y * zoom + pan.y - 20, (containerRef.current?.clientHeight || 600) - 100))
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[hoveredNode.type] }} />
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hoveredNode.label}</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 capitalize mb-1">{hoveredNode.type} • Importance: {hoveredNode.importance}</p>
          <p className="text-xs text-slate-700 dark:text-slate-300">{hoveredNode.description}</p>
        </div>
      )}

      {/* Graph Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={(e) => {
          setIsDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => {
          handlePointerUp();
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerLeave={handlePointerUp}
      >
        <svg className="w-full h-full">
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;
              
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#cbd5e1"
                    strokeWidth={2}
                    className="dark:stroke-slate-700"
                  />
                  {edge.label && (
                    <text
                      x={(source.x + target.x) / 2}
                      y={(source.y + target.y) / 2 - 5}
                      textAnchor="middle"
                      fontSize={10}
                      fill="#64748b"
                      className="dark:fill-slate-400 pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}
            
            {/* Nodes */}
            {nodes.map(node => {
              const radius = getNodeRadius(node.importance);
              const isHovered = hoveredNode?.id === node.id;
              const isDragged = draggedNode === node.id;
              
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  onPointerEnter={() => setHoveredNode(node)}
                  onPointerLeave={() => setHoveredNode(null)}
                  className="cursor-pointer"
                >
                  <circle
                    r={radius + (isHovered ? 4 : 0)}
                    fill={TYPE_COLORS[node.type]}
                    stroke={isHovered || isDragged ? '#1e293b' : '#ffffff'}
                    strokeWidth={isHovered || isDragged ? 3 : 2}
                    className="transition-all duration-200 dark:stroke-slate-900"
                    style={{ filter: isHovered ? 'brightness(1.1)' : 'none' }}
                  />
                  <text
                    y={radius + 14}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={isHovered ? "bold" : "normal"}
                    fill="#334155"
                    className="dark:fill-slate-300 pointer-events-none"
                    style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
