import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronRight, Clock, Server, Tag } from 'lucide-react';

// --- TYPES ---
type TimeUnit = 'ms' | 'μs' | 'ns';

interface Span {
  id: string;
  name: string;
  service: string;
  startTime: number; // microseconds
  duration: number; // microseconds
  children: Span[];
  tags: Record<string, string | number | boolean>;
}

interface Trace {
  traceId: string;
  rootSpan: Span;
  totalDuration: number; // microseconds
}

// --- MOCK DATA GENERATION ---
const generateRandomId = (length: number): string => {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const services = ['auth-service', 'api-gateway', 'user-db', 'payment-processor', 'email-worker', 'cache-service'];
const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'];
const httpPaths = ['/users/{id}', '/products', '/orders', 'login', '/search'];

const generateMockSpan = (depth: number, startTime: number): Span => {
  const id = generateRandomId(16);
  const service = services[Math.floor(Math.random() * services.length)];
  const name = `${httpMethods[Math.floor(Math.random() * httpMethods.length)]} ${httpPaths[Math.floor(Math.random() * httpPaths.length)]}`;
  const duration = Math.random() * (depth === 0 ? 200000 : 50000) + 10000;
  const hasChildren = depth < 3 && Math.random() > 0.3;
  let children: Span[] = [];
  let maxChildEndTime = startTime + duration;

  if (hasChildren) {
    const childCount = Math.floor(Math.random() * 3) + 1;
    let currentChildStartTime = startTime + Math.random() * (duration / 4);
    for (let i = 0; i < childCount; i++) {
      const childSpan = generateMockSpan(depth + 1, currentChildStartTime);
      children.push(childSpan);
      currentChildStartTime = childSpan.startTime + childSpan.duration + Math.random() * 10000;
      if (currentChildStartTime > maxChildEndTime) {
        maxChildEndTime = currentChildStartTime;
      }
    }
  }

  return {
    id,
    name,
    service,
    startTime,
    duration,
    children,
    tags: {
      'http.status_code': 200,
      'db.instance': `pg-${Math.floor(Math.random() * 5)}`,
      'is_error': Math.random() > 0.95,
    },
  };
};

const generateMockTrace = (): Trace => {
  const rootSpan = generateMockSpan(0, 0);
  const calculateTotalDuration = (span: Span): number => {
    const ownEndTime = span.startTime + span.duration;
    const childrenMaxEndTime = span.children.reduce((max, child) => Math.max(max, calculateTotalDuration(child)), 0);
    return Math.max(ownEndTime, childrenMaxEndTime);
  };
  const totalDuration = calculateTotalDuration(rootSpan);
  return {
    traceId: generateRandomId(32),
    rootSpan,
    totalDuration,
  };
};

// --- UTILITY FUNCTIONS ---
const formatDuration = (us: number, unit: TimeUnit): string => {
  if (unit === 'ms') return `${(us / 1000).toFixed(2)} ms`;
  if (unit === 'ns') return `${(us * 1000).toFixed(0)} ns`;
  return `${us.toFixed(2)} μs`;
};

const serviceColors: Record<string, string> = services.reduce((acc, service, i) => {
  acc[service] = `hsl(${(i * 360 / services.length)}, 70%, 50%)`;
  return acc;
}, {} as Record<string, string>);

// --- SUB-COMPONENTS ---
const SpanRow: React.FC<{ 
  span: Span; 
  depth: number; 
  totalDuration: number; 
  timeUnit: TimeUnit;
  selectedSpanId: string | null;
  onSelectSpan: (span: Span) => void;
  collapsedSpans: Set<string>;
  toggleCollapse: (spanId: string) => void;
}> = ({ span, depth, totalDuration, timeUnit, selectedSpanId, onSelectSpan, collapsedSpans, toggleCollapse }) => {
  const isCollapsed = collapsedSpans.has(span.id);
  const left = (span.startTime / totalDuration) * 100;
  const width = (span.duration / totalDuration) * 100;

  return (
    <>
      <div 
        className={`flex items-center text-sm hover:bg-white/5 cursor-pointer ${selectedSpanId === span.id ? 'bg-white/10' : ''}`}
        onClick={() => onSelectSpan(span)}
      >
        <div className="w-2/5 flex-shrink-0 truncate p-2" style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}>
          <button onClick={(e) => { e.stopPropagation(); toggleCollapse(span.id); }} className="mr-1">
            {span.children.length > 0 ? (
              isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />
            ) : <span className="inline-block w-4"/>}
          </button>
          <span style={{ color: serviceColors[span.service] }} className="font-semibold">{span.service}</span>
          <span className="ml-2 text-white/60">{span.name}</span>
        </div>
        <div className="w-3/5 flex-shrink-0 p-2 flex items-center">
          <div className="w-1/4 text-right pr-4 text-white/80">{formatDuration(span.duration, timeUnit)}</div>
          <div className="w-3/4 bg-white/5 h-6 rounded-sm overflow-hidden">
            <div style={{ marginLeft: `${left}%`, width: `${width}%`, backgroundColor: serviceColors[span.service] }} className="h-full rounded-sm" />
          </div>
        </div>
      </div>
      {!isCollapsed && span.children.map(child => (
        <SpanRow key={child.id} {...{ span: child, depth: depth + 1, totalDuration, timeUnit, selectedSpanId, onSelectSpan, collapsedSpans, toggleCollapse }} />
      ))}
    </>
  );
};

const SpanDetail: React.FC<{ span: Span | null; timeUnit: TimeUnit }> = ({ span, timeUnit }) => {
  if (!span) return <div className="p-4 text-white/60">Select a span to see details</div>;

  return (
    <div className="p-4 text-sm">
      <h3 className="text-lg font-semibold mb-3">Span Details</h3>
      <div className="space-y-2">
        <div className="flex items-center"><Server size={14} className="mr-2 text-white/40"/><strong>Service:</strong><span className="ml-2 px-2 py-0.5 rounded text-xs" style={{backgroundColor: serviceColors[span.service]}}>{span.service}</span></div>
        <div className="flex items-center"><strong className="ml-6">Name:</strong><span className="ml-2 text-white/80">{span.name}</span></div>
        <div className="flex items-center"><Clock size={14} className="mr-2 text-white/40"/><strong>Duration:</strong><span className="ml-2 text-white/80">{formatDuration(span.duration, timeUnit)}</span></div>
        <div className="flex items-start mt-3"><Tag size={14} className="mr-2 mt-1 text-white/40"/><strong>Tags:</strong>
          <div className="ml-2 flex flex-col space-y-1">
            {Object.entries(span.tags).map(([key, value]) => (
              <div key={key}><span className="text-white/60">{key}:</span> <span className="text-white/80 font-mono">{String(value)}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function TraceViewer() {
  const [trace, setTrace] = useState<Trace>(generateMockTrace());
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);
  const [collapsedSpans, setCollapsedSpans] = useState<Set<string>>(new Set());
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('ms');

  const toggleCollapse = useCallback((spanId: string) => {
    setCollapsedSpans(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spanId)) {
        newSet.delete(spanId);
      } else {
        newSet.add(spanId);
      }
      return newSet;
    });
  }, []);

  const flattenedSpans = useMemo(() => {
    const result: Span[] = [];
    const traverse = (span: Span) => {
      result.push(span);
      if (!collapsedSpans.has(span.id)) {
        span.children.forEach(traverse);
      }
    };
    traverse(trace.rootSpan);
    return result;
  }, [trace, collapsedSpans]);

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Trace Viewer</h1>
            <p className="text-white/60 text-sm truncate">Trace ID: {trace.traceId}</p>
          </div>
          <div className="flex items-center space-x-2 mt-3 sm:mt-0">
            <span className="text-sm text-white/60">Units:</span>
            {(['ms', 'μs', 'ns'] as TimeUnit[]).map(unit => (
              <button key={unit} onClick={() => setTimeUnit(unit)} className={`px-3 py-1 text-sm rounded-md ${timeUnit === unit ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}>
                {unit}
              </button>
            ))}
          </div>
        </header>

        <div className="border border-white/10 rounded-lg">
          <div className="flex items-center bg-white/5 text-white/60 font-semibold text-sm border-b border-white/10">
            <div className="w-2/5 flex-shrink-0 p-2">Service & Operation</div>
            <div className="w-3/5 flex-shrink-0 p-2 flex">
              <div className="w-1/4 text-right pr-4">Duration</div>
              <div className="w-3/4">Timeline</div>
            </div>
          </div>
          <div className="h-[400px] overflow-y-auto">
            <SpanRow 
              span={trace.rootSpan} 
              depth={0} 
              totalDuration={trace.totalDuration}
              timeUnit={timeUnit}
              selectedSpanId={selectedSpan?.id || null}
              onSelectSpan={setSelectedSpan}
              collapsedSpans={collapsedSpans}
              toggleCollapse={toggleCollapse}
            />
          </div>
        </div>

        <div className="mt-4 border border-white/10 rounded-lg min-h-[150px]">
          <SpanDetail span={selectedSpan} timeUnit={timeUnit} />
        </div>
      </div>
    </div>
  );
}