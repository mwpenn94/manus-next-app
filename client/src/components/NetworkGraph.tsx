import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

// A simple utility for conditional class names
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- TYPE DEFINITIONS ---
type Node = {
  id: string;
  name: string;
  community: number;
};

type Edge = {
  source: string;
  target: string;
  weight: number;
};

type GraphData = {
  nodes: Node[];
  edges: Edge[];
};

type SimulatedNode = Node & {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
};

// --- MOCK DATA ---
const generateMockData = (): GraphData => {
  const nodes: Node[] = Array.from({ length: 20 }, (_, i) => ({
    id: `user${i}`,
    name: `User ${i}`,
    community: Math.floor(i / 4),
  }));

  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  // Ensure at least 30 connections
  while (edges.length < 30) {
    const sourceIndex = Math.floor(Math.random() * nodes.length);
    const targetIndex = Math.floor(Math.random() * nodes.length);
    const sourceId = nodes[sourceIndex].id;
    const targetId = nodes[targetIndex].id;

    if (sourceIndex !== targetIndex) {
      const edgeKey1 = `${sourceId}-${targetId}`;
      const edgeKey2 = `${targetId}-${sourceId}`;

      if (!edgeSet.has(edgeKey1) && !edgeSet.has(edgeKey2)) {
        edges.push({
          source: sourceId,
          target: targetId,
          weight: Math.random() * 2.5 + 0.5,
        });
        edgeSet.add(edgeKey1);
      }
    }
  }
  return { nodes, edges };
};

// --- COMPONENT PROPS ---
interface NetworkGraphProps {
  className?: string;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ className }) => {
  const [graphData] = useState<GraphData>(generateMockData());
  const [nodes, setNodes] = useState<SimulatedNode[]>([]);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setNodes(graphData.nodes.map(node => ({
      ...node,
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: 0,
      vy: 0,
    })));
  }, [graphData]);

  // --- FORCE SIMULATION ---
  useEffect(() => {
    const tick = () => {
      setNodes(currentNodes => {
        if (currentNodes.length === 0) return [];
        const width = svgRef.current?.clientWidth || 800;
        const height = svgRef.current?.clientHeight || 600;

        const updatedNodes = currentNodes.map(node => {
          if (node.fx != null && node.fy != null) {
            return { ...node, x: node.fx, y: node.fy, vx: 0, vy: 0 };
          }

          let { vx, vy } = node;

          // Repulsion Force
          currentNodes.forEach(otherNode => {
            if (node.id === otherNode.id) return;
            const dx = otherNode.x - node.x;
            const dy = otherNode.y - node.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 1) distance = 1;
            const force = -250 / (distance * distance);
            vx += (dx / distance) * force * 0.01;
            vy += (dy / distance) * force * 0.01;
          });

          // Centering Force
          vx += (width / 2 - node.x) * 0.0005;
          vy += (height / 2 - node.y) * 0.0005;

          // Damping
          vx *= 0.95;
          vy *= 0.95;

          let newX = node.x + vx;
          let newY = node.y + vy;

          const radius = 10;
          if (newX < radius) { newX = radius; vx *= -0.6; }
          if (newX > width - radius) { newX = width - radius; vx *= -0.6; }
          if (newY < radius) { newY = radius; vy *= -0.6; }
          if (newY > height - radius) { newY = height - radius; vy *= -0.6; }

          return { ...node, x: newX, y: newY, vx, vy };
        });

        // Link Force
        graphData.edges.forEach(edge => {
            const sourceNode = updatedNodes.find(n => n.id === edge.source);
            const targetNode = updatedNodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return;

            const dx = targetNode.x - sourceNode.x;
            const dy = targetNode.y - sourceNode.y;
            const distance = Math.max(1, Math.sqrt(dx*dx + dy*dy));
            const force = (distance - 80) * 0.01 * edge.weight;
            const fx = (dx / distance) * force;
            const fy = (dy / distance) * force;

            if (sourceNode.fx == null) { sourceNode.vx += fx; sourceNode.vy += fy; }
            if (targetNode.fx == null) { targetNode.vx -= fx; targetNode.vy -= fy; }
        });

        return updatedNodes;
      });
      simulationRef.current = requestAnimationFrame(tick);
    };

    simulationRef.current = requestAnimationFrame(tick);
    return () => { if (simulationRef.current) cancelAnimationFrame(simulationRef.current); };
  }, [graphData.edges]);

  const nodeConnections = useMemo(() => {
    const connections = new Map<string, number>();
    graphData.edges.forEach(({ source, target }) => {
      connections.set(source, (connections.get(source) || 0) + 1);
      connections.set(target, (connections.get(target) || 0) + 1);
    });
    return connections;
  }, [graphData.edges]);

  const getNodeSize = (nodeId: string) => 6 + Math.min(nodeConnections.get(nodeId) || 0, 5) * 2;

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingNode(nodeId);
    setNodes(nodes => nodes.map(n => n.id === nodeId ? { ...n, fx: n.x, fy: n.y } : n));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingNode || !svgRef.current) return;
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    const { x, y } = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    setNodes(nodes => nodes.map(n => n.id === draggingNode ? { ...n, fx: x, fy: y } : n));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingNode) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setNodes(nodes => nodes.map(n => n.id === draggingNode ? { ...n, fx: null, fy: null } : n));
    setDraggingNode(null);
  };

  const handleNodeMouseEnter = (node: SimulatedNode) => {
    setHoveredNode(node.id);
    setTooltip({ x: node.x, y: node.y, content: `${node.name}` });
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
    setTooltip(null);
  };

  const highlightedElements = useMemo(() => {
    if (!hoveredNode) return null;
    const nodes = new Set<string>([hoveredNode]);
    const edges = new Set<string>();
    graphData.edges.forEach((edge, i) => {
      if (edge.source === hoveredNode) { nodes.add(edge.target); edges.add(`edge-${i}`); }
      if (edge.target === hoveredNode) { nodes.add(edge.source); edges.add(`edge-${i}`); }
    });
    return { nodes, edges };
  }, [hoveredNode, graphData.edges]);

  const communityColors = [
    'hsl(var(--primary))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  return (
    <div className={cn('w-full h-[600px] bg-background text-foreground rounded-lg border p-4 relative overflow-hidden', className)}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={`0 0 800 600`} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
        <g>
          {graphData.edges.map((edge, i) => {
            const sourceNode = nodes.find(n => n.id === edge.source);
            const targetNode = nodes.find(n => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;
            const isHighlighted = highlightedElements?.edges.has(`edge-${i}`);
            return (
              <motion.line
                key={`edge-${i}`}
                x1={sourceNode.x} y1={sourceNode.y}
                x2={targetNode.x} y2={targetNode.y}
                stroke={isHighlighted ? 'hsl(var(--primary))' : 'hsl(var(--border))'}
                strokeOpacity={highlightedElements ? (isHighlighted ? 1 : 0.2) : 0.7}
                strokeWidth={edge.weight}
                initial={false}
                animate={{ x1: sourceNode.x, y1: sourceNode.y, x2: targetNode.x, y2: targetNode.y }}
                transition={{ duration: 0.01 }}
              />
            );
          })}
          {nodes.map(node => {
            const isHighlighted = highlightedElements?.nodes.has(node.id);
            const color = communityColors[node.community % communityColors.length];
            return (
              <motion.g key={node.id} onPointerDown={(e) => handlePointerDown(e, node.id)} onMouseEnter={() => handleNodeMouseEnter(node)} onMouseLeave={handleNodeMouseLeave} style={{ cursor: draggingNode ? 'grabbing' : 'grab' }}>
                <motion.circle
                  r={getNodeSize(node.id)}
                  fill={color}
                  stroke={color}
                  strokeWidth={2}
                  initial={false}
                  animate={{ cx: node.x, cy: node.y }}
                  transition={{ duration: 0.01 }}
                  opacity={highlightedElements ? (isHighlighted ? 1 : 0.3) : 1}
                />
              </motion.g>
            );
          })}
        </g>
      </svg>
      {tooltip && (
        <motion.div
          className="absolute bg-background/80 backdrop-blur-sm border border-border px-2 py-1 rounded-md text-sm shadow-lg pointer-events-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -150%)' }}
        >
          {tooltip.content}
        </motion.div>
      )}
    </div>
  );
};

export default NetworkGraph;
