import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bug, X, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const JsonViewer = ({ data }: { data: any }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-900 rounded-md">
        <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
        </Button>
        <div className="p-2 rounded-md overflow-x-auto text-xs">
            <JsonNode node={data} />
        </div>
    </div>
  );
};

const JsonNode = ({ node, level = 0 }: { node: any, level?: number }) => {
    if (node === null) {
        return <span className="text-gray-500">null</span>;
    }

    switch (typeof node) {
        case 'string':
            return <span className="text-green-400">\"{node}\"</span>;
        case 'number':
            return <span className="text-blue-400">{node}</span>;
        case 'boolean':
            return <span className="text-purple-400">{String(node)}</span>;
        case 'object':
            if (Array.isArray(node)) {
                return <JsonArray array={node} level={level} />;
            }
            return <JsonObject object={node} level={level} />;
        default:
            return <span>{String(node)}</span>;
    }
};

const JsonObject = ({ object, level }: { object: Record<string, any>, level: number }) => {
    const [isOpen, setIsOpen] = useState(level < 2);
    const keys = Object.keys(object);

    return (
        <span>
            <span onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {isOpen ? <ChevronDown className="inline h-3 w-3" /> : <ChevronRight className="inline h-3 w-3" />}
                {'{'}
            </span>
            {isOpen && (
                <div style={{ paddingLeft: `${(level + 1) * 15}px` }}>
                    {keys.map((key, i) => (
                        <div key={key}>
                            <span className="text-white">\"{key}\": </span>
                            <JsonNode node={object[key]} level={level + 1} />
                            {i < keys.length - 1 && ','}
                        </div>
                    ))}
                </div>
            )}
            <span style={{ paddingLeft: isOpen ? `${level * 15}px` : '0px' }}>{'}'}</span>
        </span>
    );
};

const JsonArray = ({ array, level }: { array: any[], level: number }) => {
    const [isOpen, setIsOpen] = useState(level < 2);

    return (
        <span>
            <span onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {isOpen ? <ChevronDown className="inline h-3 w-3" /> : <ChevronRight className="inline h-3 w-3" />}
                {'['}
            </span>
            {isOpen && (
                <div style={{ paddingLeft: `${(level + 1) * 15}px` }}>
                    {array.map((item, i) => (
                        <div key={i}>
                            <JsonNode node={item} level={level + 1} />
                            {i < array.length - 1 && ','}
                        </div>
                    ))}
                </div>
            )}
            <span style={{ paddingLeft: isOpen ? `${level * 15}px` : '0px' }}>{']'}</span>
        </span>
    );
};

type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'error';
};

export type AgentIntrospectionPanelProps = {
  toolCalls: ToolCall[];
  reasoning?: string;
  systemPrompt?: string;
  contextTokens?: number;
  maxTokens?: number;
  isOpen: boolean;
  onToggle: () => void;
};

const ToolCallItem = ({ call }: { call: ToolCall }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusIcon = {
    pending: <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />,
    running: <div className="w-2 h-2 rounded-full bg-blue-500 animate-spin" />,
    success: <div className="w-2 h-2 rounded-full bg-green-500" />,
    error: <div className="w-2 h-2 rounded-full bg-red-500" />,
  }[call.status];

  return (
    <div className="border border-border rounded-md">
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className="font-mono text-sm">{call.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {call.duration && <span className="text-xs text-muted-foreground">{call.duration}ms</span>}
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </div>
      {isOpen && (
        <div className="p-2 border-t border-border">
          <div className="space-y-2">
            <div>
              <h4 className="font-semibold text-sm mb-1">Arguments</h4>
              <JsonViewer data={call.arguments} />
            </div>
            {call.result !== undefined && call.result !== null && (
              <div>
                <h4 className="font-semibold text-sm mb-1">Result</h4>
                <JsonViewer data={call.result as Record<string, unknown>} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CopyButton = ({ text }: { text: string }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };
    return (
        <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={handleCopy}>
            <Copy className="h-3 w-3" />
        </Button>
    )
}

const ContextUsage = ({ contextTokens, maxTokens }: { contextTokens: number, maxTokens: number }) => {
    const usage = (contextTokens / maxTokens) * 100;
    const color = usage >= 80 ? 'bg-red-500' : usage >= 50 ? 'bg-yellow-500' : 'bg-green-500';

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span>Context Token Usage</span>
                <span>{contextTokens} / {maxTokens}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2.5">
                <div className={cn("h-2.5 rounded-full", color)} style={{ width: `${usage}%` }}></div>
            </div>
        </div>
    )
}

export const AgentIntrospectionPanel = ({ 
    toolCalls,
    reasoning,
    systemPrompt,
    contextTokens = 0,
    maxTokens = 1,
    isOpen,
    onToggle 
}: AgentIntrospectionPanelProps) => {

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                onToggle();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToggle]);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="icon" onClick={onToggle}>
          <Bug className="h-4 w-4" />
        </Button>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
            className="fixed inset-x-0 bottom-0 z-40"
          >
            <Card className="h-[40vh] flex flex-col rounded-t-lg border-t border-border">
                <CardHeader className="flex flex-row items-center justify-between py-2 px-4 border-b">
                    <CardTitle className="text-lg">Agent Introspection</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onToggle}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-grow p-0 overflow-y-auto">
                    <Tabs defaultValue="tool-calls" className="h-full flex flex-col">
                        <TabsList className="mx-4 mt-2">
                            <TabsTrigger value="tool-calls">Tool Calls</TabsTrigger>
                            <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                            <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
                            <TabsTrigger value="context">Context</TabsTrigger>
                        </TabsList>
                        <TabsContent value="tool-calls" className="flex-grow p-4 overflow-y-auto">
                            <div className="space-y-2">
                              {toolCalls.map((call) => <ToolCallItem key={call.id} call={call} />)}
                            </div>
                        </TabsContent>
                        <TabsContent value="reasoning" className="flex-grow p-4 overflow-y-auto">
                            <div className="relative prose prose-invert prose-sm max-w-none">
                              <CopyButton text={reasoning || ''} />
                              <p>{reasoning}</p>
                            </div>
                        </TabsContent>
                        <TabsContent value="system-prompt" className="flex-grow p-4 overflow-y-auto">
                            <div className="relative">
                              <CopyButton text={systemPrompt || ''} />
                              <pre className="text-xs whitespace-pre-wrap bg-gray-900 p-2 rounded-md">
                                {systemPrompt}
                              </pre>
                            </div>
                        </TabsContent>
                        <TabsContent value="context" className="flex-grow p-4 overflow-y-auto">
                            <ContextUsage contextTokens={contextTokens} maxTokens={maxTokens} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};