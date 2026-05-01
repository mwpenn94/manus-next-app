import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Share2, Play, Save, Upload, GitBranch, Terminal, Settings, Zap, FileText, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// --- TYPES AND MOCK DATA ---
type Parameter = { name: string; type: string; description: string };
type Tool = { id: string; name: string; description: string; icon: React.ElementType; inputs: Parameter[]; outputs: Parameter[] };
type ChainNode = { id: string; toolId: string; position: { x: number; y: number }; };
type Connection = { fromNode: string; fromOutput: string; toNode: string; toInput: string };
type ToolChain = { id: string; name: string; description: string; nodes: ChainNode[]; connections: Connection[] };

const MOCK_TOOLS: Tool[] = [
  { id: 't1', name: 'GetWeather', description: 'Fetches weather for a location.', icon: Zap, inputs: [{ name: 'location', type: 'string', description: 'City name' }], outputs: [{ name: 'forecast', type: 'json', description: 'Weather data' }] },
  { id: 't2', name: 'SummarizeText', description: 'Summarizes a long text.', icon: FileText, inputs: [{ name: 'text', type: 'string', description: 'Input text' }], outputs: [{ name: 'summary', type: 'string', description: 'Summarized text' }] },
  { id: 't3', name: 'SendEmail', description: 'Sends an email.', icon: Share2, inputs: [{ name: 'recipient', type: 'string', description: 'Email address' }, { name: 'subject', type: 'string', description: 'Email subject' }, { name: 'body', type: 'string', description: 'Email content' }], outputs: [] },
  { id: 't4', name: 'CodeInterpreter', description: 'Executes Python code.', icon: Terminal, inputs: [{ name: 'code', type: 'string', description: 'Python code snippet' }], outputs: [{ name: 'result', type: 'any', description: 'Execution output' }] },
  { id: 't5', name: 'ConditionalBranch', description: 'Routes based on a condition.', icon: GitBranch, inputs: [{ name: 'condition', type: 'boolean', description: 'If true, follows success path' }], outputs: [] },
  { id: 't6', name: 'LLM_Call', description: 'Calls a large language model.', icon: Bot, inputs: [{ name: 'prompt', type: 'string', description: 'Prompt for the model' }], outputs: [{ name: 'response', type: 'string', description: 'Model response' }] },
];

const MOCK_CHAINS: ToolChain[] = [
  { id: 'c1', name: 'Daily Weather Report', description: 'Fetches weather and emails a summary.', nodes: [{ id: 'n1', toolId: 't1', position: { x: 50, y: 100 } }, { id: 'n2', toolId: 't2', position: { x: 300, y: 100 } }, { id: 'n3', toolId: 't3', position: { x: 550, y: 100 } }], connections: [{ fromNode: 'n1', fromOutput: 'forecast', toNode: 'n2', toInput: 'text' }, { fromNode: 'n2', fromOutput: 'summary', toNode: 'n3', toInput: 'body' }] },
  { id: 'c2', name: 'Code and Respond', description: 'Runs code and explains the result.', nodes: [{ id: 'n1', toolId: 't4', position: { x: 50, y: 100 } }, { id: 'n2', toolId: 't6', position: { x: 300, y: 100 } }], connections: [{ fromNode: 'n1', fromOutput: 'result', toNode: 'n2', toInput: 'prompt' }] },
];

// --- SUB-COMPONENTS ---
const ToolListItem: React.FC<{ tool: Tool; onAdd: (toolId: string) => void }> = ({ tool, onAdd }) => (
  <motion.div whileHover={{ scale: 1.03 }} className="mb-2">
    <Card className="bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => onAdd(tool.id)}>
      <CardHeader className="p-3 flex flex-row items-center">
        <tool.icon className="w-6 h-6 mr-3 text-muted-foreground" />
        <div className="flex-1">
          <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
          <CardDescription className="text-xs">{tool.description}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  </motion.div>
);

const ChainNodeComponent: React.FC<{ node: ChainNode; tool: Tool; isSelected: boolean; onSelect: (nodeId: string) => void }> = ({ node, tool, isSelected, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    drag
    dragMomentum={false}
    onDragEnd={(event, info) => { /* In a real app, update node.position here */ }}
    style={{ x: node.position.x, y: node.position.y }}
    className={cn(
      'absolute w-48 bg-card rounded-lg shadow-md cursor-grab active:cursor-grabbing',
      isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : 'ring-1 ring-border'
    )}
    onClick={() => onSelect(node.id)}
  >
    <CardHeader className="p-3 flex flex-row items-center">
      <tool.icon className="w-5 h-5 mr-2 text-muted-foreground" />
      <p className="text-sm font-semibold flex-1 truncate">{tool.name}</p>
    </CardHeader>
    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 rounded-full" />
    <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 rounded-full" />
  </motion.div>
);

const ExecutionTraceDialog: React.FC<{ trace: string[] }> = ({ trace }) => (
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Execution Trace</DialogTitle>
    </DialogHeader>
    <div className="bg-muted rounded-md p-4 h-96 overflow-y-auto">
      <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
        {trace.map((line, i) => <div key={i}>{`[${i+1}] ${line}`}</div>)}
      </pre>
    </div>
  </DialogContent>
);

// --- MAIN COMPONENT ---
export default function ToolChainEditor() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeChain, setActiveChain] = useState<ToolChain>(MOCK_CHAINS[0]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executionTrace, setExecutionTrace] = useState<string[]>([]);

  const toolMap = useMemo(() => new Map(MOCK_TOOLS.map(t => [t.id, t])), []);

  const filteredTools = useMemo(() =>
    MOCK_TOOLS.filter(tool =>
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase())
    ), [searchTerm]);

  const addToolToChain = useCallback((toolId: string) => {
    const newId = `n${Date.now()}`;
    const newNode: ChainNode = {
      id: newId,
      toolId,
      position: { x: Math.random() * 400, y: Math.random() * 200 + 50 },
    };
    setActiveChain(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedNodeId(newId);
  }, []);

  const runTest = useCallback(() => {
    setExecutionTrace(['Starting chain execution...',
      `Chain: ${activeChain.name}`,
      ...activeChain.nodes.map(n => `Executing node ${n.id} (${toolMap.get(n.toolId)?.name})`),
      'Mock execution finished successfully.']);
  }, [activeChain, toolMap]);

  const selectedTool = useMemo(() => {
    if (!selectedNodeId) return null;
    const node = activeChain.nodes.find(n => n.id === selectedNodeId);
    return node ? toolMap.get(node.toolId) : null;
  }, [selectedNodeId, activeChain.nodes, toolMap]);

  const handleExport = () => {
    const dataStr = JSON.stringify(activeChain, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `${activeChain.name.replace(/\s+/g, '_')}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <TooltipProvider>
      <div className="w-full h-[80vh] bg-background text-foreground flex flex-col p-4 gap-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Tool Chain Editor</h1>
            <p className="text-muted-foreground">Build and test automated agent workflows.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}><Upload className="w-4 h-4 mr-2" /> Export</Button>
            <Button variant="outline" size="sm"><Save className="w-4 h-4 mr-2" /> Save Template</Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" onClick={runTest}><Play className="w-4 h-4 mr-2" /> Test Chain</Button>
              </DialogTrigger>
              <ExecutionTraceDialog trace={executionTrace} />
            </Dialog>
          </div>
        </header>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-[300px_1fr] lg:grid-cols-[300px_1fr_350px] gap-4 overflow-hidden">
          {/* Left Panel: Tool List */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Tools</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search tools..." className="pl-8" value={searchTerm} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <AnimatePresence>
                {filteredTools.map(tool => <ToolListItem key={tool.id} tool={tool} onAdd={addToolToChain} />)}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Center Panel: Canvas */}
          <Card className="relative overflow-hidden">
            <CardHeader className="absolute top-0 left-0 z-10 bg-background/80 backdrop-blur-sm p-3 rounded-br-lg">
              <h3 className="font-semibold">{activeChain.name}</h3>
            </CardHeader>
            <div className="w-full h-full bg-dot-muted-foreground/[0.2]">
              <AnimatePresence>
                {activeChain.nodes.map(node => {
                  const tool = toolMap.get(node.toolId);
                  if (!tool) return null;
                  return <ChainNodeComponent key={node.id} node={node} tool={tool} isSelected={selectedNodeId === node.id} onSelect={setSelectedNodeId} />;
                })}
              </AnimatePresence>
              {/* Connections would be rendered here as SVG lines */}
            </div>
          </Card>

          {/* Right Panel: Inspector */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Inspector</CardTitle>
              <CardDescription>View and configure the selected node.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {selectedTool ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <selectedTool.icon className="w-8 h-8 text-muted-foreground" />
                    <div>
                      <h4 className="font-semibold">{selectedTool.name}</h4>
                      <p className="text-sm text-muted-foreground">{selectedTool.description}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h5 className="font-semibold mb-2">Inputs</h5>
                    {selectedTool.inputs.length > 0 ? selectedTool.inputs.map(p => (
                      <div key={p.name} className="mb-2">
                        <label className="text-xs font-medium">{p.name} <Badge variant="secondary" className="ml-1">{p.type}</Badge></label>
                        <Input defaultValue={`{node.prev.${p.name}}`} className="mt-1 h-8" />
                      </div>
                    )) : <p className="text-xs text-muted-foreground">No inputs</p>}
                  </div>
                  <Separator />
                  <div>
                    <h5 className="font-semibold mb-2">Outputs</h5>
                    {selectedTool.outputs.length > 0 ? selectedTool.outputs.map(p => (
                      <div key={p.name} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium">{p.name}</p>
                        <Badge variant="outline">{p.type}</Badge>
                      </div>
                    )) : <p className="text-xs text-muted-foreground">No outputs</p>}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  <p>Select a node to inspect</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
