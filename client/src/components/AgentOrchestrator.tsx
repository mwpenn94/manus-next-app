import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Cpu, MemoryStick, BrainCircuit, Play, Pause, RotateCw, Terminal, GripVertical, ShieldAlert, Network } from "lucide-react";

type AgentStatus = "idle" | "running" | "waiting" | "error";

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  cpuUsage: number;
  memoryUsage: number;
  tokenUsage: number;
  priority: number;
  logs: string[];
}

const initialAgents: Agent[] = [
  { id: "agent-1", name: "Data Ingestor", status: "running", cpuUsage: 75, memoryUsage: 50, tokenUsage: 80, priority: 1, logs: ["[INFO] Starting data ingestion...","[INFO] 1000 records processed."] },
  { id: "agent-2", name: "Natural Language Processor", status: "idle", cpuUsage: 10, memoryUsage: 20, tokenUsage: 5, priority: 2, logs: ["[WARN] Model not fully optimized."] },
  { id: "agent-3", name: "Task Planner", status: "waiting", cpuUsage: 30, memoryUsage: 40, tokenUsage: 25, priority: 3, logs: ["[INFO] Waiting for input from NLP agent..."] },
  { id: "agent-4", name: "Code Generator", status: "error", cpuUsage: 90, memoryUsage: 85, tokenUsage: 95, priority: 4, logs: ["[ERROR] Unhandled exception in code generation module.", "[FATAL] Crashing."] },
  { id: "agent-5", name: "Output Formatter", status: "running", cpuUsage: 40, memoryUsage: 30, tokenUsage: 60, priority: 5, logs: ["[INFO] Formatting output for user display."] },
];

const statusConfig: { [key in AgentStatus]: { color: string; icon: React.ReactNode; label: string; } } = {
  idle: { color: "bg-gray-500", icon: <Pause className="h-3 w-3" />, label: "Idle" },
  running: { color: "bg-green-500", icon: <Play className="h-3 w-3" />, label: "Running" },
  waiting: { color: "bg-yellow-500", icon: <BrainCircuit className="h-3 w-3" />, label: "Waiting" },
  error: { color: "bg-red-500", icon: <ShieldAlert className="h-3 w-3" />, label: "Error" },
};

const AgentCommunicationGraph = ({ agents }: { agents: Agent[] }) => {
    const positions = useMemo(() => {
        const numAgents = agents.length;
        const radiusX = 160;
        const radiusY = 80;
        const centerX = 200;
        const centerY = 110;
        return agents.reduce((acc, agent, i) => {
            const angle = (i / numAgents) * 2 * Math.PI - Math.PI / 2;
            acc[agent.id] = { x: centerX + radiusX * Math.cos(angle), y: centerY + radiusY * Math.sin(angle) };
            return acc;
        }, {} as Record<string, {x: number, y: number}>);
    }, [agents]);

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-muted/30 flex-grow relative h-[240px] lg:h-auto overflow-hidden">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Network className="h-5 w-5" /> Agent Communication Flow</CardTitle></CardHeader>
            <CardContent className="p-0">
                <svg width="100%" height="100%" viewBox="0 0 400 240" className="absolute top-0 left-0">
                    <defs>
                        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground/50" /></marker>
                    </defs>
                    {agents.map((from, i) => {
                        const to = agents[(i + 1) % agents.length];
                        const fromPos = positions[from.id];
                        const toPos = positions[to.id];
                        if (!fromPos || !toPos) return null;
                        return <motion.line key={`${from.id}-${to.id}`} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} stroke="currentColor" className="text-muted-foreground/50" strokeWidth="1" markerEnd="url(#arrow)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: i * 0.2, ease: "easeInOut" }} />
                    })}
                </svg>
                {agents.map(agent => {
                    const pos = positions[agent.id];
                    if (!pos) return null;
                    return (
                        <TooltipProvider key={agent.id}><Tooltip><TooltipTrigger asChild>
                            <motion.div className="absolute flex flex-col items-center group" style={{ left: pos.x - 25, top: pos.y - 15, width: 50 }} initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.5}}>
                                <div className={`w-3 h-3 rounded-full ${statusConfig[agent.status].color} transition-transform group-hover:scale-125`} />
                                <span className="text-xs text-muted-foreground truncate w-full text-center">{agent.name}</span>
                            </motion.div>
                        </TooltipTrigger><TooltipContent>{agent.name} - {statusConfig[agent.status].label}</TooltipContent></Tooltip></TooltipProvider>
                    );
                })}
            </CardContent>
        </Card>
    );
};

const AggregateMetrics = ({ agents }: { agents: Agent[] }) => {
    const metrics = useMemo(() => {
        const numAgents = agents.length || 1;
        return {
            avgCpu: (agents.reduce((s, a) => s + a.cpuUsage, 0) / numAgents).toFixed(1),
            avgMem: (agents.reduce((s, a) => s + a.memoryUsage, 0) / numAgents).toFixed(1),
            avgTok: (agents.reduce((s, a) => s + a.tokenUsage, 0) / numAgents).toFixed(1),
            running: agents.filter(a => a.status === 'running').length,
            errors: agents.filter(a => a.status === 'error').length,
        };
    }, [agents]);

    return (
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-muted/30">
            <CardContent className="p-3 flex justify-around items-center text-sm text-muted-foreground flex-wrap gap-x-4 gap-y-2">
                <div className="text-center"><strong className="text-foreground">{metrics.running}</strong> Running</div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center"><strong className="text-red-400">{metrics.errors}</strong> Errors</div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center">Avg CPU: <strong className="text-foreground">{metrics.avgCpu}%</strong></div>
                <Separator orientation="vertical" className="h-6" />
                <div className="text-center">Avg Memory: <strong className="text-foreground">{metrics.avgMem}%</strong></div>
            </CardContent>
        </Card>
    );
};

const AgentCard = ({ agent, onStatusAction, onResourceChange, onSelect, isSelected }: { agent: Agent, onStatusAction: (id: string, action: "start" | "stop" | "restart") => void, onResourceChange: (id: string, resource: "cpuUsage" | "memoryUsage" | "tokenUsage", value: number) => void, onSelect: (id: string) => void, isSelected: boolean }) => {
    const { color, icon, label } = statusConfig[agent.status];
    return (
        <Reorder.Item value={agent} as="div" className={cn("bg-card rounded-lg border transition-shadow hover:shadow-md", isSelected && "ring-2 ring-primary shadow-lg")}>
            <div className="flex items-center p-2">
                <Button variant="ghost" size="icon" className="cursor-grab active:cursor-grabbing h-10 w-8"><GripVertical className="h-5 w-5 text-muted-foreground" /></Button>
                <div className="flex-grow cursor-pointer" onClick={() => onSelect(agent.id)}>
                    <h4 className="font-medium text-sm">{agent.name}</h4>
                    <div className="flex items-center gap-1.5">
                        <div className={cn("w-2 h-2 rounded-full", color)}></div>
                        <span className="text-xs text-muted-foreground capitalize">{label}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStatusAction(agent.id, 'start')} disabled={agent.status === 'running'}><Play className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStatusAction(agent.id, 'stop')} disabled={agent.status === 'idle'}><Pause className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onStatusAction(agent.id, 'restart')}><RotateCw className="h-4 w-4" /></Button>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {isSelected && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ type: "spring", duration: 0.4, bounce: 0 }}>
                        <Separator/>
                        <div className="p-3 space-y-3">
                            <ResourceSlider icon={<Cpu className="h-4 w-4" />} label="CPU" value={agent.cpuUsage} onValueChange={(v) => onResourceChange(agent.id, 'cpuUsage', v[0])} />
                            <ResourceSlider icon={<MemoryStick className="h-4 w-4" />} label="Memory" value={agent.memoryUsage} onValueChange={(v) => onResourceChange(agent.id, 'memoryUsage', v[0])} />
                            <ResourceSlider icon={<BrainCircuit className="h-4 w-4" />} label="Tokens" value={agent.tokenUsage} onValueChange={(v) => onResourceChange(agent.id, 'tokenUsage', v[0])} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
};

const ResourceSlider = ({ icon, label, value, onValueChange }: { icon: React.ReactNode, label: string, value: number, onValueChange: (value: number[]) => void }) => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span className="w-14">{label}</span>
        <Slider value={[value]} onValueChange={onValueChange} className="flex-1" />
        <span className="w-10 text-right font-mono">{value}%</span>
    </div>
);

const LogViewer = ({ agent }: { agent: Agent | undefined }) => (
    <Card className="col-span-1 lg:col-span-2 flex flex-col h-full bg-muted/30">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Terminal className="h-5 w-5" /> Log Tail: {agent?.name || "No Agent Selected"}</CardTitle></CardHeader>
        <CardContent className="flex-grow bg-black/30 rounded-b-lg p-3 font-mono text-xs overflow-y-auto h-64 lg:h-auto">
            {agent ? (
                <AnimatePresence initial={false}>
                    {agent.logs.map((log, i) => (
                        <motion.p key={`${agent.id}-${i}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cn(log.startsWith("[ERROR]") && "text-red-400", log.startsWith("[WARN]") && "text-yellow-400", "whitespace-pre-wrap")}>
                            <span className="text-muted-foreground/50 mr-2">{`>`}</span>{log}
                        </motion.p>
                    ))}
                </AnimatePresence>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Select an agent to view logs</div>
            )}
        </CardContent>
    </Card>
);

export default function AgentOrchestrator() {
  const [agents, setAgents] = useState<Agent[]>(initialAgents.sort((a, b) => a.priority - b.priority));
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id || null);

  const handleStatusAction = useCallback((agentId: string, action: "start" | "stop" | "restart") => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        if (action === "start") return { ...agent, status: "running" };
        if (action === "stop") return { ...agent, status: "idle" };
        if (action === "restart") return { ...agent, status: "running", logs: [`[INFO] Agent ${agent.name} restarted.`] };
      }
      return agent;
    }));
  }, []);

  const handleResourceChange = useCallback((agentId: string, resource: "cpuUsage" | "memoryUsage" | "tokenUsage", value: number) => {
    setAgents(prev => prev.map(agent => agent.id === agentId ? { ...agent, [resource]: value } : agent));
  }, []);

  const handleReorder = useCallback((newOrder: Agent[]) => {
      setAgents(newOrder.map((agent, index) => ({ ...agent, priority: index + 1 })));
  }, []);

  const selectedAgent = useMemo(() => agents.find(agent => agent.id === selectedAgentId), [agents, selectedAgentId]);

  return (
    <div className="p-4 bg-background text-foreground font-sans h-full flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Agent Orchestrator</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-grow min-h-0">
            <div className="col-span-1 flex flex-col gap-2 min-h-0 overflow-y-auto pr-2">
                <Reorder.Group axis="y" values={agents} onReorder={handleReorder} className="space-y-2">
                    {agents.map(agent => (
                        <AgentCard key={agent.id} agent={agent} onStatusAction={handleStatusAction} onResourceChange={handleResourceChange} onSelect={setSelectedAgentId} isSelected={selectedAgentId === agent.id} />
                    ))}
                </Reorder.Group>
            </div>
            <div className="col-span-1 lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 content-start">
                <AgentCommunicationGraph agents={agents} />
                <AggregateMetrics agents={agents} />
                <LogViewer agent={selectedAgent} />
            </div>
        </div>
    </div>
  );
}
