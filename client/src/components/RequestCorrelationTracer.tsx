import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Search, MapPin as MapIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// --- TYPES ---
type SpanStatus = 'ok' | 'error' | 'in-progress';

interface Span {
  id: string;
  traceId: string;
  parentId?: string;
  serviceName: string;
  operationName: string;
  startTime: number; // Unix timestamp (ms)
  duration: number; // in ms
  status: SpanStatus;
  metadata: Record<string, any>;
}

interface Trace {
  id: string;
  rootSpanId: string;
  spans: Span[];
  totalDuration: number;
}

// --- MOCK DATA ---
const generateSpans = (traceId: string, count: number): Span[] => {
  const spans: Span[] = [];
  const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'notification-service'];
  let currentTime = Date.now();

  for (let i = 0; i < count; i++) {
    const serviceName = services[i % services.length];
    const duration = Math.random() * 100 + 20;
    spans.push({
      id: `span-${traceId}-${i}`,
      traceId,
      parentId: i > 0 ? `span-${traceId}-${i - 1}` : undefined,
      serviceName,
      operationName: i === 0 ? `HTTP POST /api/v1/execute` : `RPC ${serviceName}.handleRequest`,
      startTime: currentTime,
      duration,
      status: Math.random() > 0.9 ? 'error' : 'ok',
      metadata: {
        'http.method': 'POST',
        'http.status_code': 200,
        'db.instance': 'postgres-prod',
      },
    });
    currentTime += duration + Math.random() * 10;
  }
  return spans;
};

const mockTraces: Trace[] = Array.from({ length: 5 }, (_, i) => {
  const traceId = `trace-${i + 1}`;
  const spans = generateSpans(traceId, 8);
  const totalDuration = spans.reduce((acc, s) => acc + s.duration, 0);
  return {
    id: traceId,
    rootSpanId: spans[0].id,
    spans,
    totalDuration,
  };
});

// --- COMPONENT ---
const RequestCorrelationTracer: React.FC = () => {
  const [traces] = useState<Trace[]>(mockTraces);
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(traces[0]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [durationFilter, setDurationFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<SpanStatus | 'all'>('all');

  const toggleSpan = (spanId: string) => {
    setExpandedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanId)) {
        newSet.delete(spanId);
      } else {
        newSet.add(spanId);
      }
      return newSet;
    });
  };

  const filteredTraces = useMemo(() => {
    return traces.filter(trace => trace.id.includes(searchQuery));
  }, [traces, searchQuery]);

  const filteredSpans = useMemo(() => {
    if (!selectedTrace) return [];
    return selectedTrace.spans
      .filter(span => span.duration >= durationFilter)
      .filter(span => statusFilter === 'all' || span.status === statusFilter);
  }, [selectedTrace, durationFilter, statusFilter]);

  const serviceDependencies = useMemo(() => {
    if (!selectedTrace) return { nodes: [] as {id: string}[], links: [] as {source: string; target: string}[] };
    const services = new Set<string>();
    const links = new Map<string, { source: string; target: string }>();

    selectedTrace.spans.forEach(span => {
      services.add(span.serviceName);
      if (span.parentId) {
        const parentSpan = selectedTrace.spans.find(s => s.id === span.parentId);
        if (parentSpan && parentSpan.serviceName !== span.serviceName) {
          const linkKey = `${parentSpan.serviceName}->${span.serviceName}`;
          if (!links.has(linkKey)) {
            links.set(linkKey, { source: parentSpan.serviceName, target: span.serviceName });
          }
        }
      }
    });

    return {
      nodes: Array.from(services).map(name => ({ id: name })),
      links: Array.from(links.values()),
    };
  }, [selectedTrace]);

  const totalDuration = selectedTrace?.totalDuration || 1;

  return (
    <Card className="w-full max-w-7xl mx-auto bg-card text-foreground h-[800px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Request Correlation Tracer</span>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by Correlation ID..."
              className="w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search by Correlation ID"
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex gap-4 overflow-hidden">
        <div className="w-1/4 border-r border-border pr-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">Traces</h3>
          <ul>
            {filteredTraces.map(trace => (
              <li key={trace.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-left h-auto py-2 px-2",
                    selectedTrace?.id === trace.id && "bg-muted"
                  )}
                  onClick={() => setSelectedTrace(trace)}
                  aria-label={`Select trace ${trace.id}`}
                >
                  <div className="flex flex-col">
                    <span className="font-mono text-sm">{trace.id}</span>
                    <span className="text-xs text-muted-foreground">{trace.spans.length} spans, {trace.totalDuration.toFixed(2)}ms</span>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="w-3/4 flex flex-col">
          {selectedTrace ? (
            <Tabs defaultValue="waterfall" className="flex-grow flex flex-col">
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="waterfall">Waterfall</TabsTrigger>
                  <TabsTrigger value="dependencies">Service Map</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-4">
                    <Filter className="h-4 w-4"/>
                    <Input type="number" placeholder="Min Duration (ms)" className="w-32" value={durationFilter || ''} onChange={e => setDurationFilter(Number(e.target.value))} aria-label="Minimum span duration in milliseconds" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SpanStatus | 'all')} className="bg-card border border-border rounded-md px-2 py-1.5 text-sm" aria-label="Filter spans by status">
                        <option value="all">All Statuses</option>
                        <option value="ok">OK</option>
                        <option value="error">Error</option>
                    </select>
                </div>
              </div>
              <TabsContent value="waterfall" className="flex-grow mt-4 overflow-y-auto pr-2">
                <div className="relative font-mono text-xs">
                  {filteredSpans.map((span, index) => {
                    const left = (span.startTime - selectedTrace.spans[0].startTime) / totalDuration * 100;
                    const width = (span.duration / totalDuration) * 100;

                    return (
                      <div key={span.id} className="mb-2">
                        <div className="flex items-center cursor-pointer" onClick={() => toggleSpan(span.id)} role="button" aria-expanded={expandedSpans.has(span.id)}>
                          {expandedSpans.has(span.id) ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                          <span className="font-semibold mr-2">{span.serviceName}</span>
                          <span className="text-muted-foreground">{span.operationName}</span>
                          <span className="ml-auto text-muted-foreground">{span.duration.toFixed(2)}ms</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 mt-1 relative overflow-hidden">
                            <motion.div
                                className={cn(
                                    "h-full absolute rounded-full",
                                    span.status === 'ok' && 'bg-green-500',
                                    span.status === 'error' && 'bg-red-500',
                                )}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                            />
                        </div>
                        <AnimatePresence>
                          {expandedSpans.has(span.id) && (
                            <motion.div 
                              className="mt-2 p-3 bg-background rounded-lg border border-border"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <h4 className="font-semibold mb-2">Span Details</h4>
                              <div className="grid grid-cols-2 gap-1 text-sm">
                                <p><strong>ID:</strong> {span.id}</p>
                                <p><strong>Trace ID:</strong> {span.traceId}</p>
                                <p><strong>Parent ID:</strong> {span.parentId || 'none'}</p>
                                <p><strong>Status:</strong> <Badge variant={span.status === 'error' ? 'destructive' : 'default'}>{span.status}</Badge></p>
                                <p><strong>Start Time:</strong> {new Date(span.startTime).toISOString()}</p>
                                <p><strong>Duration:</strong> {span.duration.toFixed(3)} ms</p>
                              </div>
                              <h5 className="font-semibold mt-3 mb-1">Metadata</h5>
                              <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(span.metadata, null, 2)}</pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
              <TabsContent value="dependencies" className="flex-grow mt-4 flex items-center justify-center">
                 <div className="w-full h-full relative">
                    {serviceDependencies.nodes.map((node, i) => (
                        <motion.div 
                            key={node.id} 
                            className="absolute p-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2"
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ 
                                opacity: 1, 
                                scale: 1,
                                x: Math.cos(i / serviceDependencies.nodes.length * 2 * Math.PI) * 200 + 250,
                                y: Math.sin(i / serviceDependencies.nodes.length * 2 * Math.PI) * 150 + 180,
                            }}
                            transition={{ duration: 0.5 }}
                        >
                            <MapIcon className="h-4 w-4"/> {node.id}
                        </motion.div>
                    ))}
                    <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
                        {serviceDependencies.links.map((link, i) => {
                            const sourceNode = serviceDependencies.nodes.findIndex(n => n.id === link.source);
                            const targetNode = serviceDependencies.nodes.findIndex(n => n.id === link.target);
                            const sourcePos = { x: Math.cos(sourceNode / serviceDependencies.nodes.length * 2 * Math.PI) * 200 + 250 + 50, y: Math.sin(sourceNode / serviceDependencies.nodes.length * 2 * Math.PI) * 150 + 180 + 20 };
                            const targetPos = { x: Math.cos(targetNode / serviceDependencies.nodes.length * 2 * Math.PI) * 200 + 250 + 50, y: Math.sin(targetNode / serviceDependencies.nodes.length * 2 * Math.PI) * 150 + 180 + 20 };
                            return (
                                <motion.line 
                                    key={i}
                                    x1={sourcePos.x} y1={sourcePos.y}
                                    x2={targetPos.x} y2={targetPos.y}
                                    stroke="#4A5568" strokeWidth="1.5"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            )
                        })}
                    </svg>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex-grow flex items-center justify-center text-muted-foreground">
              <p>Select a trace to view details</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestCorrelationTracer;
