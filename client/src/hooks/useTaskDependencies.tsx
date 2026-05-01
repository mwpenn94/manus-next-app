
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// --- TYPES ---
type TaskStatus = 'running' | 'done' | 'error' | 'pending';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  parentId?: string;
  metadata?: {
    dependsOn?: string[];
  };
}

interface Node {
  id: string;
  task: Task;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Edge {
  source: string;
  target: string;
}

// --- HOOK ---

const useForceDirectedLayout = (
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
) => {
  const [positions, setPositions] = useState(nodes);
  const simulationRef = useRef<number | null>(null);

  useEffect(() => {
    let currentNodes = nodes.map(n => ({ ...n }));

    const tick = () => {
      const repulsionStrength = -50;
      const attractionStrength = 0.05;
      const centerGravity = 0.01;
      const damping = 0.7;

      // Apply forces
      for (let i = 0; i < currentNodes.length; i++) {
        for (let j = i + 1; j < currentNodes.length; j++) {
          const nodeA = currentNodes[i];
          const nodeB = currentNodes[j];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance === 0) distance = 1;

          const force = repulsionStrength / (distance * distance);
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;

          nodeA.vx += forceX;
          nodeA.vy += forceY;
          nodeB.vx -= forceX;
          nodeB.vy -= forceY;
        }
      }

      for (const edge of edges) {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        const targetNode = currentNodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          const force = attractionStrength * (distance - 60); // Ideal distance
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;

          sourceNode.vx += forceX;
          sourceNode.vy += forceY;
          targetNode.vx -= forceX;
          targetNode.vy -= forceY;
        }
      }

      // Apply gravity and update positions
      currentNodes = currentNodes.map(node => {
        // Gravity towards center
        const dxCenter = width / 2 - node.x;
        const dyCenter = height / 2 - node.y;
        node.vx += dxCenter * centerGravity;
        node.vy += dyCenter * centerGravity;

        // Apply damping
        node.vx *= damping;
        node.vy *= damping;

        // Update position
        let newX = node.x + node.vx;
        let newY = node.y + node.vy;

        // Boundary collision
        if (newX < 10) { newX = 10; node.vx *= -0.5; }
        if (newX > width - 10) { newX = width - 10; node.vx *= -0.5; }
        if (newY < 10) { newY = 10; node.vy *= -0.5; }
        if (newY > height - 10) { newY = height - 10; node.vy *= -0.5; }

        return { ...node, x: newX, y: newY };
      });

      setPositions([...currentNodes]);
      simulationRef.current = requestAnimationFrame(tick);
    };

    simulationRef.current = requestAnimationFrame(tick);

    return () => {
      if (simulationRef.current) {
        cancelAnimationFrame(simulationRef.current);
      }
    };
  }, [nodes.length, edges.length, width, height]); // Rerun if structure changes

  return positions;
};

export const useTaskDependencies = (tasks: Task[], width: number, height: number) => {
  const { nodes, edges } = useMemo(() => {
    const initialNodes: Node[] = tasks.map(task => ({
      id: task.id,
      task,
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    const taskIds = new Set(tasks.map(t => t.id));
    const initialEdges: Edge[] = [];

    tasks.forEach(task => {
      if (task.parentId && taskIds.has(task.parentId)) {
        initialEdges.push({ source: task.parentId, target: task.id });
      }
      if (task.metadata?.dependsOn) {
        task.metadata.dependsOn.forEach(depId => {
          if (taskIds.has(depId)) {
            initialEdges.push({ source: depId, target: task.id });
          }
        });
      }
    });

    return { nodes: initialNodes, edges: initialEdges };
  }, [tasks, width, height]);

  const layoutNodes = useForceDirectedLayout(nodes, edges, width, height);

  return { nodes: layoutNodes, edges };
};

// --- COMPONENT ---

const statusColors: Record<TaskStatus, string> = {
  running: 'bg-primary',
  done: 'bg-emerald-500',
  error: 'bg-destructive',
  pending: 'bg-muted',
};

export const DependencyGraphOverlay: React.FC<{ tasks: Task[] }> = ({ tasks }) => {
  const width = 256; // w-64
  const height = 192; // h-48
  const { nodes, edges } = useTaskDependencies(tasks, width, height);

  const edgePaths = useMemo(() => {
    return edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      if (!sourceNode || !targetNode) return null;
      return {
        id: `${edge.source}-${edge.target}`,
        d: `M${sourceNode.x},${sourceNode.y} L${targetNode.x},${targetNode.y}`,
      };
    }).filter(Boolean) as { id: string; d: string }[];
  }, [nodes, edges]);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="absolute bottom-4 right-4 w-64 h-48 bg-card/50 backdrop-blur-sm border border-border rounded-lg shadow-lg overflow-hidden">
      <svg width={width} height={height} className="absolute inset-0">
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
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
          </marker>
        </defs>
        <g>
          {edgePaths.map(path => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="var(--border)"
              strokeWidth="1"
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </g>
      </svg>
      <div className="relative w-full h-full">
        {nodes.map(node => (
          <motion.div
            key={node.id}
            className="absolute w-3 h-3 rounded-full group"
            initial={{ x: node.x - 6, y: node.y - 6 }}
            animate={{ x: node.x - 6, y: node.y - 6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <div className={cn("w-full h-full rounded-full transition-colors", statusColors[node.task.status])} />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block px-2 py-1 bg-background border border-border text-foreground text-xs rounded-md shadow-lg whitespace-nowrap">
              {node.task.title}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DependencyGraphOverlay;
