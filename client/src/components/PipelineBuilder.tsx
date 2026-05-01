import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, BrainCircuit, FunctionSquare, ArrowRightLeft, GitBranch, Play, Trash2, Map, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react';

// Type Definitions
type NodeType = 'input' | 'transform' | 'model' | 'output' | 'condition';

interface Node {
  id: string;
  type: NodeType;
  label: string;
  x: number;
  y: number;
  config?: Record<string, any>;
}

interface Connection {
  id: string;
  source: string;
  target: string;
}

const NODE_ICONS: Record<NodeType, React.ElementType> = {
  input: Database,
  transform: FunctionSquare,
  model: BrainCircuit,
  output: ArrowRightLeft,
  condition: GitBranch,
};

const NODE_COLORS: Record<NodeType, string> = {
    input: 'bg-sky-500',
    transform: 'bg-amber-500',
    model: 'bg-purple-500',
    output: 'bg-emerald-500',
    condition: 'bg-rose-500',
};

const NODE_PALETTE: { type: NodeType; label: string }[] = [
    { type: 'input', label: 'Data Input' },
    { type: 'transform', label: 'Transform' },
    { type: 'model', label: 'Model' },
    { type: 'output', label: 'Output' },
    { type: 'condition', label: 'Condition' },
];

// Mock Data
const initialNodes: Node[] = [
  { id: 'node-1', type: 'input', label: 'Data Input', x: 50, y: 200, config: { source: 'S3 Bucket' } },
  { id: 'node-2', type: 'transform', label: 'Preprocess', x: 300, y: 200, config: { script: 'clean_data.py' } },
  { id: 'node-3', type: 'model', label: 'Inference', x: 550, y: 200, config: { model: 'GPT-4.1-mini' } },
  { id: 'node-4', type: 'transform', label: 'Postprocess', x: 800, y: 200, config: { script: 'format_output.py' } },
  { id: 'node-5', type: 'output', label: 'API Output', x: 1050, y: 200, config: { endpoint: '/v1/results' } },
];

const initialConnections: Connection[] = [
  { id: 'conn-1', source: 'node-1', target: 'node-2' },
  { id: 'conn-2', source: 'node-2', target: 'node-3' },
  { id: 'conn-3', source: 'node-3', target: 'node-4' },
  { id: 'conn-4', source: 'node-4', target: 'node-5' },
];

export default function PipelineBuilder() {
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [connections, setConnections] = useState<Connection[]>(initialConnections);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const canvasRef = useRef<HTMLDivElement>(null);

    const handleNodeDrag = (nodeId: string, info: PanInfo) => {
        setNodes(prevNodes =>
            prevNodes.map(n =>
                n.id === nodeId ? { ...n, x: n.x + info.delta.x, y: n.y + info.delta.y } : n
            )
        );
    };

    const addNode = (type: NodeType, label: string) => {
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type,
            label,
            x: 200,
            y: 200,
            config: {},
        };
        setNodes(prev => [...prev, newNode]);
    };

    const deleteNode = () => {
        if (!nodeToDelete) return;
        setNodes(nodes.filter(n => n.id !== nodeToDelete.id));
        setConnections(connections.filter(c => c.source !== nodeToDelete.id && c.target !== nodeToDelete.id));
        setNodeToDelete(null);
        setSelectedNode(null);
    };

    const runPipeline = () => {
        setIsRunning(true);
        setProgress(0);
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsRunning(false);
                    return 100;
                }
                return prev + 10;
            });
        }, 200);
    };

    const isPipelineValid = useMemo(() => {
        const nodeIds = new Set(nodes.map(n => n.id));
        return connections.every(c => nodeIds.has(c.source) && nodeIds.has(c.target));
    }, [nodes, connections]);

    const getConnectionPath = (sourceNode: Node, targetNode: Node) => {
        const sourcePos = { x: sourceNode.x + 192, y: sourceNode.y + 40 };
        const targetPos = { x: targetNode.x, y: targetNode.y + 40 };
        return `M ${sourcePos.x},${sourcePos.y} C ${sourcePos.x + 80},${sourcePos.y} ${targetPos.x - 80},${targetPos.y} ${targetPos.x},${targetPos.y}`;
    };

    return (
        <TooltipProvider>
            <div className="w-full h-[800px] bg-background text-foreground flex border border-border rounded-lg overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-card border-r border-border p-4 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold">Add Nodes</h2>
                    {NODE_PALETTE.map(item => (
                        <Button key={item.type} variant="outline" className="w-full justify-start gap-2" onClick={() => addNode(item.type, item.label)}>
                            {React.createElement(NODE_ICONS[item.type], { className: 'h-5 w-5' })}
                            {item.label}
                        </Button>
                    ))}
                    <Separator />
                    <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex items-center gap-2 text-sm">
                            {isPipelineValid ? (
                                <><CheckCircle2 className="h-5 w-5 text-green-500" /><span>Valid Pipeline</span></>
                            ) : (
                                <><AlertCircle className="h-5 w-5 text-red-500" /><span>Invalid Pipeline</span></>
                            )}
                        </div>
                        <Button onClick={runPipeline} disabled={isRunning || !isPipelineValid} className="w-full gap-2">
                            <Play className="h-5 w-5" />
                            {isRunning ? `Running... (${progress}%)` : 'Run Pipeline'}
                        </Button>
                        {isRunning && <div className="w-full bg-muted rounded-full h-2.5"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div></div>}
                    </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-grow relative overflow-hidden" ref={canvasRef}>
                    <div className="absolute inset-0 bg-grid-pattern bg-center [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        <AnimatePresence>
                            {connections.map(conn => {
                                const sourceNode = nodes.find(n => n.id === conn.source);
                                const targetNode = nodes.find(n => n.id === conn.target);
                                if (!sourceNode || !targetNode) return null;

                                const path = getConnectionPath(sourceNode, targetNode);
                                return (
                                    <motion.g key={conn.id}>
                                        <motion.path d={path} stroke="#6b7280" strokeWidth="2" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
                                        <motion.circle r="4" fill="#3b82f6" animate={{ offsetDistance: ['0%', '100%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                                            <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                                        </motion.circle>
                                    </motion.g>
                                );
                            })}
                        </AnimatePresence>
                    </svg>

                    <AnimatePresence>
                        {nodes.map(node => (
                            <motion.div
                                key={node.id}
                                id={node.id}
                                className="absolute bg-card border border-border rounded-lg shadow-lg w-48 cursor-grab active:cursor-grabbing"
                                initial={{ opacity: 0, scale: 0.8, x: node.x, y: node.y }}
                                animate={{ opacity: 1, scale: 1, x: node.x, y: node.y }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                drag
                                onDrag={(event, info) => handleNodeDrag(node.id, info)}
                                onDragEnd={() => canvasRef.current?.focus()} // Refocus canvas
                                onClick={() => setSelectedNode(node)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className={cn('flex items-center p-3 rounded-t-lg', NODE_COLORS[node.type])}>
                                    {React.createElement(NODE_ICONS[node.type], { className: 'h-5 w-5 mr-2 text-white' })}
                                    <span className="font-bold text-white">{node.label}</span>
                                </div>
                                <div className="p-3 text-sm text-muted-foreground">
                                    Type: <Badge variant={selectedNode?.id === node.id ? "default" : "secondary"}>{node.type}</Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={(e) => { e.stopPropagation(); setNodeToDelete(node); }}>
                                    <Trash2 className="h-4 w-4 text-white/80 hover:text-white" />
                                </Button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Config Panel */}
                <AnimatePresence>
                    {selectedNode && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="w-96 bg-card border-l border-border p-4 flex flex-col"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Configure Node</h2>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}><X className="h-5 w-5" /></Button>
                            </div>
                            <Separator />
                            <div className="flex flex-col gap-4 mt-4">
                                <Label>Label</Label>
                                <Input value={selectedNode.label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n))} />
                                <Label>Type</Label>
                                <Badge variant="secondary" className="w-fit">{selectedNode.type}</Badge>
                                <Separator />
                                <h3 className="font-semibold">Configuration</h3>
                                {Object.entries(selectedNode.config || {}).map(([key, value]) => (
                                    <div key={key} className="flex flex-col gap-2">
                                        <Label className="capitalize">{key}</Label>
                                        <Input value={value as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            const newConfig = { ...selectedNode.config, [key]: e.target.value };
                                            setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, config: newConfig } : n));
                                        }} />
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mini-map */}
                <Card className="absolute bottom-4 right-4 w-64 h-48 p-0 overflow-hidden">
                    <CardHeader className="p-2"><CardTitle className="text-sm">Mini-map</CardTitle></CardHeader>
                    <CardContent className="p-1 relative h-full">
                        <div className="w-full h-full bg-muted/50 rounded-sm relative">
                            {nodes.map(node => (
                                <div key={`map-${node.id}`} className={cn("absolute w-2 h-2 rounded-full", NODE_COLORS[node.type])} style={{ left: `${(node.x / 1500) * 100}%`, top: `${(node.y / 800) * 100}%` }}></div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Delete Confirmation */}
                <Dialog open={!!nodeToDelete} onOpenChange={(open) => !open && setNodeToDelete(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Node?</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete the "{nodeToDelete?.label}" node? This action cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setNodeToDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={deleteNode}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
