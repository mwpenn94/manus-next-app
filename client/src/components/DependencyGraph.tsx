/**
 * DependencyGraph — Canvas-based DAG visualization for ATLAS goal tasks
 *
 * Renders task dependencies as a directed acyclic graph with:
 * - Status-colored nodes (pending/running/completed/failed/skipped)
 * - Animated edges showing dependency flow
 * - Hover tooltips with task details
 * - Auto-layout using topological sort + layer assignment
 */
import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";

interface GoalTask {
  id: number;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  executionOrder: number;
  dependsOn: number[] | null;
  taskType?: string | null;
  provider?: string | null;
  qualityScore?: number | null;
}

interface DependencyGraphProps {
  tasks: GoalTask[];
  className?: string;
}

// ── Status colors ──
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  completed: { bg: "#10b981", border: "#059669", text: "#ffffff", glow: "rgba(16,185,129,0.3)" },
  running:   { bg: "#3b82f6", border: "#2563eb", text: "#ffffff", glow: "rgba(59,130,246,0.4)" },
  pending:   { bg: "#71717a", border: "#52525b", text: "#ffffff", glow: "rgba(113,113,122,0.2)" },
  failed:    { bg: "#ef4444", border: "#dc2626", text: "#ffffff", glow: "rgba(239,68,68,0.3)" },
  skipped:   { bg: "#a1a1aa", border: "#71717a", text: "#ffffff", glow: "rgba(161,161,170,0.2)" },
};

// ── Layout constants ──
const NODE_W = 180;
const NODE_H = 56;
const H_GAP = 60;
const V_GAP = 40;
const PADDING = 40;

interface LayoutNode {
  task: GoalTask;
  x: number;
  y: number;
  layer: number;
}

function computeLayout(tasks: GoalTask[]): { nodes: LayoutNode[]; width: number; height: number } {
  if (tasks.length === 0) return { nodes: [], width: 400, height: 200 };

  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // Topological sort + layer assignment via longest-path
  const layers = new Map<number, number>();
  
  function getLayer(id: number, visited = new Set<number>()): number {
    if (layers.has(id)) return layers.get(id)!;
    if (visited.has(id)) return 0; // cycle protection
    visited.add(id);
    
    const task = taskMap.get(id);
    if (!task || !task.dependsOn || task.dependsOn.length === 0) {
      layers.set(id, 0);
      return 0;
    }
    
    let maxParentLayer = 0;
    for (const depId of task.dependsOn) {
      if (taskMap.has(depId)) {
        maxParentLayer = Math.max(maxParentLayer, getLayer(depId, visited) + 1);
      }
    }
    layers.set(id, maxParentLayer);
    return maxParentLayer;
  }
  
  tasks.forEach(t => getLayer(t.id));
  
  // Group by layer
  const layerGroups = new Map<number, GoalTask[]>();
  tasks.forEach(t => {
    const layer = layers.get(t.id) ?? 0;
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(t);
  });
  
  const maxLayer = Math.max(...Array.from(layerGroups.keys()), 0);
  
  // Position nodes
  const nodes: LayoutNode[] = [];
  let maxNodesInLayer = 0;
  
  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = layerGroups.get(layer) ?? [];
    maxNodesInLayer = Math.max(maxNodesInLayer, group.length);
    group.forEach((task, idx) => {
      nodes.push({
        task,
        x: PADDING + layer * (NODE_W + H_GAP),
        y: PADDING + idx * (NODE_H + V_GAP),
        layer,
      });
    });
  }
  
  // Center each layer vertically
  const totalHeight = maxNodesInLayer * (NODE_H + V_GAP) - V_GAP + PADDING * 2;
  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = nodes.filter(n => n.layer === layer);
    const groupHeight = group.length * (NODE_H + V_GAP) - V_GAP;
    const offset = (totalHeight - groupHeight) / 2;
    group.forEach((node, idx) => {
      node.y = offset + idx * (NODE_H + V_GAP);
    });
  }
  
  const width = (maxLayer + 1) * (NODE_W + H_GAP) - H_GAP + PADDING * 2;
  const height = Math.max(totalHeight, 200);
  
  return { nodes, width, height };
}

export default function DependencyGraph({ tasks, className }: DependencyGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<LayoutNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef(0);
  
  const layout = useMemo(() => computeLayout(tasks), [tasks]);
  const nodeMap = useMemo(() => new Map(layout.nodes.map(n => [n.task.id, n])), [layout.nodes]);
  
  // Draw the graph
  const draw = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = layout.width * dpr;
    canvas.height = layout.height * dpr;
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    ctx.scale(dpr, dpr);
    
    // Clear
    ctx.clearRect(0, 0, layout.width, layout.height);
    
    // Draw edges
    for (const node of layout.nodes) {
      if (!node.task.dependsOn) continue;
      for (const depId of node.task.dependsOn) {
        const parent = nodeMap.get(depId);
        if (!parent) continue;
        
        const fromX = parent.x + NODE_W;
        const fromY = parent.y + NODE_H / 2;
        const toX = node.x;
        const toY = node.y + NODE_H / 2;
        
        // Bezier curve
        const cpOffset = Math.abs(toX - fromX) * 0.4;
        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(fromX + cpOffset, fromY, toX - cpOffset, toY, toX, toY);
        
        const parentStatus = parent.task.status;
        const isActive = parentStatus === "completed" && node.task.status === "running";
        
        ctx.strokeStyle = parentStatus === "completed" ? "#10b981" : "#52525b";
        ctx.lineWidth = isActive ? 2.5 : 1.5;
        
        if (isActive) {
          // Animated dash for active edges
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -(time / 50);
        } else {
          ctx.setLineDash([]);
        }
        
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(toY - (toY - cpOffset * 0.1), toX - (toX - cpOffset));
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 8 * Math.cos(angle - 0.4), toY - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(toX - 8 * Math.cos(angle + 0.4), toY - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = parentStatus === "completed" ? "#10b981" : "#52525b";
        ctx.fill();
      }
    }
    
    // Draw nodes
    for (const node of layout.nodes) {
      const colors = STATUS_COLORS[node.task.status] ?? STATUS_COLORS.pending;
      const isHovered = hoveredNode?.task.id === node.task.id;
      
      // Glow for running nodes
      if (node.task.status === "running") {
        const pulse = Math.sin(time / 500) * 0.3 + 0.7;
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 12 * pulse;
      } else if (isHovered) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 8;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
      }
      
      // Node rectangle
      ctx.beginPath();
      const r = 8;
      ctx.roundRect(node.x, node.y, NODE_W, NODE_H, r);
      ctx.fillStyle = isHovered ? colors.border : colors.bg;
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      
      // Node text
      ctx.fillStyle = colors.text;
      ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
      ctx.textBaseline = "top";
      
      // Truncate description
      const maxTextW = NODE_W - 16;
      let desc = node.task.description;
      while (ctx.measureText(desc).width > maxTextW && desc.length > 3) {
        desc = desc.slice(0, -4) + "...";
      }
      ctx.fillText(desc, node.x + 8, node.y + 10);
      
      // Status + order
      ctx.font = "10px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      const statusText = `#${node.task.executionOrder} · ${node.task.status}`;
      ctx.fillText(statusText, node.x + 8, node.y + 30);
      
      // Quality badge
      if (node.task.qualityScore != null) {
        const qText = `Q:${node.task.qualityScore}`;
        const qWidth = ctx.measureText(qText).width + 8;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.roundRect(node.x + NODE_W - qWidth - 6, node.y + 28, qWidth, 16, 4);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(qText, node.x + NODE_W - qWidth - 2, node.y + 30);
      }
    }
    
    animFrameRef.current = requestAnimationFrame(draw);
  }, [layout, nodeMap, hoveredNode]);
  
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);
  
  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hit = layout.nodes.find(n => 
      x >= n.x && x <= n.x + NODE_W && y >= n.y && y <= n.y + NODE_H
    );
    
    setHoveredNode(hit ?? null);
    if (hit) {
      setTooltipPos({ x: e.clientX, y: e.clientY });
    }
  }, [layout.nodes]);
  
  if (tasks.length === 0) {
    return (
      <div className={cn("flex items-center justify-center py-12 text-sm text-muted-foreground", className)}>
        No tasks to visualize. Decompose a goal to see the dependency graph.
      </div>
    );
  }
  
  // Summary stats
  const completed = tasks.filter(t => t.status === "completed").length;
  const running = tasks.filter(t => t.status === "running").length;
  const failed = tasks.filter(t => t.status === "failed").length;
  const pending = tasks.filter(t => t.status === "pending").length;
  
  return (
    <div className={cn("relative", className)}>
      {/* Legend + stats */}
      <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground flex-wrap">
        <span className="font-medium text-foreground">{tasks.length} tasks</span>
        {completed > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{completed} completed</span>}
        {running > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />{running} running</span>}
        {pending > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" />{pending} pending</span>}
        {failed > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{failed} failed</span>}
      </div>
      
      {/* Canvas container with horizontal scroll */}
      <div
        ref={containerRef}
        className="overflow-x-auto rounded-xl border border-border bg-card/50"
      >
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
          className="cursor-crosshair"
          style={{ minWidth: layout.width, minHeight: layout.height }}
        />
      </div>
      
      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="fixed z-50 pointer-events-none bg-popover text-popover-foreground border border-border rounded-lg shadow-xl px-3 py-2 max-w-xs"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 8,
          }}
        >
          <p className="text-sm font-medium mb-1">{hoveredNode.task.description}</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Status: <span className="text-foreground capitalize">{hoveredNode.task.status}</span></p>
            <p>Order: #{hoveredNode.task.executionOrder}</p>
            {hoveredNode.task.taskType && <p>Type: {hoveredNode.task.taskType}</p>}
            {hoveredNode.task.provider && <p>Provider: {hoveredNode.task.provider}</p>}
            {hoveredNode.task.qualityScore != null && <p>Quality: {hoveredNode.task.qualityScore}/100</p>}
            {hoveredNode.task.dependsOn && hoveredNode.task.dependsOn.length > 0 && (
              <p>Depends on: {hoveredNode.task.dependsOn.length} task(s)</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
