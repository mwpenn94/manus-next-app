import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X, GripVertical, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

// Types
type NodeType = 'trigger' | 'action' | 'condition' | 'output';

interface Node {
  id: string;
  type: NodeType;
  label: string;
  config?: Record<string, string>;
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
  label?: string;
}

interface WorkflowBuilderProps {
  nodes: Node[];
  connections: Connection[];
  onAddNode: (type: NodeType, position: { x: number; y: number }) => void;
  onRemoveNode: (id: string) => void;
  onConnect: (from: string, to: string) => void;
  onMoveNode: (id: string, position: { x: number; y: number }) => void;
  selectedNodeId?: string;
  onSelectNode: (id: string | null) => void;
}

const NODE_TYPE_STYLES: Record<NodeType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  trigger: { bg: 'bg-green-500/10', border: 'border-green-500', text: 'text-green-400', icon: <span className="text-green-400">⚡️</span> },
  action: { bg: 'bg-blue-500/10', border: 'border-blue-500', text: 'text-blue-400', icon: <span className="text-blue-400">▶️</span> },
  condition: { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-400', icon: <span className="text-yellow-400">❓</span> },
  output: { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400', icon: <span className="text-purple-400">📤</span> },
};

const GRID_SIZE = 20;

const NodePalette = ({ onAddNode }: { onAddNode: WorkflowBuilderProps['onAddNode'] }) => {
  const nodeTypes: { type: NodeType; label: string }[] = [
    { type: 'trigger', label: 'Trigger' },
    { type: 'action', label: 'Action' },
    { type: 'condition', label: 'Condition' },
    { type: 'output', label: 'Output' },
  ];

  return (
    <Card className="w-60 h-full bg-card/50 backdrop-blur-sm border-r border-border">
      <CardHeader>
        <CardTitle>Nodes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {nodeTypes.map(({ type, label }) => (
            <motion.div
              key={type}
              className={cn('p-3 rounded-lg cursor-grab flex items-center gap-3 border', NODE_TYPE_STYLES[type].bg, NODE_TYPE_STYLES[type].border)}
              drag
              dragSnapToOrigin
              onDragEnd={(event, info) => {
                const canvas = document.getElementById('workflow-canvas');
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    onAddNode(type, { x: info.point.x - rect.left - 250, y: info.point.y - rect.top - 50 });
                }
              }}
            >
              {NODE_TYPE_STYLES[type].icon}
              <span className="font-medium">{label}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ConnectionLine = ({ fromNode, toNode, scale, pan }: { fromNode: Node; toNode: Node; scale: number; pan: {x: number, y: number} }) => {
    const fromX = fromNode.x + 192; // width of node
    const fromY = fromNode.y + 36; // half height
    const toX = toNode.x;
    const toY = toNode.y + 36;

    const pathData = `M ${fromX} ${fromY} C ${fromX + 50} ${fromY} ${toX - 50} ${toY} ${toX} ${toY}`;

    return <motion.path d={pathData} stroke="#555" fill="none" strokeWidth={2} />;
};

const ConfigPanel = ({ node, onRemove }: { node: Node; onRemove: (id: string) => void }) => {
    return (
        <Card className="w-80 h-full bg-card/50 backdrop-blur-sm border-l border-border">
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Configuration</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => onRemove(node.id)}>
                    <X className="w-4 h-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="text-sm text-muted-foreground">Node ID</label>
                    <p className="text-sm font-mono">{node.id}</p>
                </div>
                <div>
                    <label className="text-sm text-muted-foreground">Label</label>
                    <Input defaultValue={node.label} />
                </div>
                <div>
                    <label className="text-sm text-muted-foreground">Type</label>
                    <Badge variant="outline" className={cn(NODE_TYPE_STYLES[node.type].border, NODE_TYPE_STYLES[node.type].text)}>{node.type}</Badge>
                </div>
            </CardContent>
        </Card>
    )
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  nodes,
  connections,
  onAddNode,
  onRemoveNode,
  onConnect,
  onMoveNode,
  selectedNodeId,
  onSelectNode,
}) => {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const [connecting, setConnecting] = useState<{ from: string; to?: string; x: number; y: number } | null>(null);

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    const newScale = scale * (1 - event.deltaY / 1000);
    setScale(Math.min(Math.max(0.2, newScale), 2));
  };

  const handlePan = (event: React.MouseEvent, info: PanInfo) => {
    setPan(prev => ({ x: prev.x + info.delta.x, y: prev.y + info.delta.y }));
  };

  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);
  const selectedNode = useMemo(() => selectedNodeId ? nodeMap.get(selectedNodeId) : undefined, [selectedNodeId, nodeMap]);

  const startConnecting = (from: string) => {
    const fromNode = nodeMap.get(from);
    if (!fromNode) return;
    setConnecting({ from, x: fromNode.x + 192 + pan.x, y: fromNode.y + 36 + pan.y });
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (connecting) {
      setConnecting({ ...connecting, x: e.clientX - (canvasRef.current?.getBoundingClientRect().left ?? 0), y: e.clientY - (canvasRef.current?.getBoundingClientRect().top ?? 0) });
    }
  };

  const endConnecting = (to?: string) => {
    if (connecting && to && connecting.from !== to) {
      onConnect(connecting.from, to);
    }
    setConnecting(null);
  };

  return (
    <div className="w-full h-[80vh] flex bg-background text-foreground border border-border rounded-lg">
      <NodePalette onAddNode={onAddNode} />
      <div id="workflow-canvas" className="flex-1 relative overflow-hidden" ref={canvasRef} onWheel={handleWheel} onMouseMove={onCanvasMouseMove} onMouseUp={() => endConnecting()}>
        <motion.div
          className="absolute top-0 left-0"
          style={{ 
            width: '200%', 
            height: '200%',
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            backgroundImage:
              'radial-gradient(circle, #333 1px, rgba(0,0,0,0) 1px)',
          }}
        />
        <motion.div style={{ scale, x: pan.x, y: pan.y }} className="absolute top-0 left-0">
          <svg className="absolute w-full h-full pointer-events-none" style={{width: '200vw', height: '200vh'}}>
            {connections.map(conn => {
              const fromNode = nodeMap.get(conn.from);
              const toNode = nodeMap.get(conn.to);
              if (!fromNode || !toNode) return null;
              return <ConnectionLine key={`${conn.from}-${conn.to}`} fromNode={fromNode} toNode={toNode} scale={scale} pan={pan} />;
            })}
            {connecting && <path d={`M ${connecting.x / scale - pan.x / scale} ${connecting.y / scale - pan.y/scale} L ${(connecting.x + 1) / scale - pan.x/scale} ${(connecting.y+1)/scale - pan.y/scale}`} stroke="#888" strokeDasharray="5,5" />} 
          </svg>

          {nodes.map(node => (
            <motion.div
              key={node.id}
              className={cn(
                "absolute w-48 rounded-lg shadow-lg border",
                NODE_TYPE_STYLES[node.type].bg,
                NODE_TYPE_STYLES[node.type].border,
                selectedNodeId === node.id ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : ''
              )}
              initial={{ x: node.x, y: node.y }}
              animate={{ x: node.x, y: node.y }}
              drag
              onDrag={(event, info) => {
                const newX = node.x + info.delta.x / scale;
                const newY = node.y + info.delta.y / scale;
                onMoveNode(node.id, { x: newX, y: newY });
              }}
              onDragEnd={(event, info) => {
                const newX = Math.round(node.x / GRID_SIZE) * GRID_SIZE;
                const newY = Math.round(node.y / GRID_SIZE) * GRID_SIZE;
                onMoveNode(node.id, { x: newX, y: newY });
              }}
              onTap={() => onSelectNode(node.id)}
              style={{x: node.x, y: node.y}}
            >
              <CardHeader className="p-2 flex-row items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                  {NODE_TYPE_STYLES[node.type].icon}
                  <CardTitle className="text-sm font-medium">{node.label}</CardTitle>
                </div>
                <Badge variant="secondary">{node.type}</Badge>
              </CardHeader>
              <div 
                className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-card border border-border cursor-crosshair"
                onMouseDownCapture={(e) => { e.stopPropagation(); endConnecting(node.id); }}
              />
              <div 
                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-card border border-border cursor-crosshair"
                onMouseDownCapture={(e) => { e.stopPropagation(); startConnecting(node.id); }}
              />
            </motion.div>
          ))}
        </motion.div>

        <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.min(2, s * 1.2))}><ZoomIn className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setScale(s => Math.max(0.2, s * 0.8))}><ZoomOut className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => { setPan({x:0, y:0}); setScale(1); }}><Move className="w-4 h-4" /></Button>
        </div>
      </div>
      {selectedNode && <ConfigPanel node={selectedNode} onRemove={onRemoveNode} />}
    </div>
  );
};
