import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Cog, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, Link as LinkIcon } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type SLIStatus = 'met' | 'at-risk' | 'breached';
type TimeWindow = '7d' | '30d' | '90d';

interface SLIDataPoint {
  timestamp: number;
  value: number;
}

interface Incident {
  id: string;
  timestamp: number;
  description: string;
}

interface SLO {
  id: string;
  name: string;
  description: string;
  target: number;
  data: Record<TimeWindow, {
    currentValue: number;
    trend: SLIDataPoint[];
    incidents: Incident[];
  }>;
}

// --- MOCK DATA ---
const mockSLOs: SLO[] = [
  {
    id: 'api-latency',
    name: 'API Latency p95',
    description: '95th percentile of API response times.',
    target: 0.999,
    data: {
      '7d': { currentValue: 0.9995, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.001 + 0.999 })), incidents: [] },
      '30d': { currentValue: 0.9992, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.002 + 0.998 })), incidents: [] },
      '90d': { currentValue: 0.9988, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.003 + 0.997 })), incidents: [{id: 'inc-1', timestamp: Date.now(), description: 'Database overload'}] },
    },
  },
  {
    id: 'uptime',
    name: 'Core Service Uptime',
    description: 'Availability of the main application services.',
    target: 0.995,
    data: {
      '7d': { currentValue: 0.998, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.005 + 0.994 })), incidents: [] },
      '30d': { currentValue: 0.994, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.01 + 0.99 })), incidents: [{id: 'inc-2', timestamp: Date.now(), description: 'Deployment failure'}] },
      '90d': { currentValue: 0.991, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.015 + 0.985 })), incidents: [{id: 'inc-2', timestamp: Date.now(), description: 'Deployment failure'}, {id: 'inc-3', timestamp: Date.now(), description: 'Network partition'}] },
    },
  },
  {
    id: 'checkout-success',
    name: 'Checkout Success Rate',
    description: 'Percentage of successful checkout flows.',
    target: 0.99,
    data: {
      '7d': { currentValue: 0.992, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.01 + 0.985 })), incidents: [] },
      '30d': { currentValue: 0.988, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.02 + 0.975 })), incidents: [] },
      '90d': { currentValue: 0.985, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.03 + 0.97 })), incidents: [] },
    },
  },
  // ... Add 3 more SLOs for a total of 6
  {
    id: 'image-processing',
    name: 'Image Processing Time',
    description: 'Time to process and serve user-uploaded images.',
    target: 0.98,
    data: {
      '7d': { currentValue: 0.99, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.02 + 0.97 })), incidents: [] },
      '30d': { currentValue: 0.982, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.02 + 0.97 })), incidents: [] },
      '90d': { currentValue: 0.975, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.03 + 0.96 })), incidents: [{id: 'inc-4', timestamp: Date.now(), description: 'Storage bucket full'}] },
    },
  },
  {
    id: 'search-relevance',
    name: 'Search Relevance',
    description: 'Top-5 search results relevance score.',
    target: 0.95,
    data: {
      '7d': { currentValue: 0.96, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.05 + 0.92 })), incidents: [] },
      '30d': { currentValue: 0.94, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.07 + 0.90 })), incidents: [] },
      '90d': { currentValue: 0.93, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.1 + 0.88 })), incidents: [] },
    },
  },
  {
    id: 'data-ingestion-freshness',
    name: 'Data Ingestion Freshness',
    description: 'Lag time for data to appear in the system.',
    target: 0.99,
    data: {
      '7d': { currentValue: 0.995, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.01 + 0.985 })), incidents: [] },
      '30d': { currentValue: 0.991, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.015 + 0.98 })), incidents: [] },
      '90d': { currentValue: 0.993, trend: Array.from({ length: 30 }, (_, i) => ({ timestamp: i, value: Math.random() * 0.012 + 0.982 })), incidents: [] },
    },
  },
];

// --- HELPER FUNCTIONS & SUB-COMPONENTS ---

const getSLOStatus = (currentValue: number, target: number): { status: SLIStatus; errorBudget: number } => {
  const errorBudget = 1 - target;
  const consumedBudget = 1 - currentValue;
  const remainingBudget = Math.max(0, errorBudget - consumedBudget);
  const budgetConsumption = consumedBudget / errorBudget;

  let status: SLIStatus = 'met';
  if (budgetConsumption > 1) {
    status = 'breached';
  } else if (budgetConsumption > 0.75) {
    status = 'at-risk';
  }

  return { status, errorBudget: remainingBudget };
};

const statusConfig = {
  met: { color: 'bg-green-500', icon: ShieldCheck, label: 'Met' },
  'at-risk': { color: 'bg-yellow-500', icon: AlertTriangle, label: 'At Risk' },
  breached: { color: 'bg-red-500', icon: AlertTriangle, label: 'Breached' },
};

const Sparkline = ({ data, width = 120, height = 40, color = 'currentColor' }: { data: SLIDataPoint[], width?: number, height?: number, color?: string }) => {
  if (!data || data.length < 2) return <div style={{ width, height }} className="flex items-center justify-center text-muted-foreground text-xs">No data</div>;

  const values = data.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map((point, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((point.value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

const SLOCard = ({ slo, timeWindow }: { slo: SLO; timeWindow: TimeWindow }) => {
  const { currentValue, trend, incidents } = slo.data[timeWindow];
  const { status, errorBudget } = getSLOStatus(currentValue, slo.target);
  const burnRate = (1 - currentValue) / (1 - slo.target);

  const statusInfo = statusConfig[status];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="h-full flex flex-col bg-card/50 hover:bg-card/80 transition-colors duration-300">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-semibold">{slo.name}</CardTitle>
              <CardDescription className="text-sm">{slo.description}</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Cog className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Configure Alert Thresholds</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="flex-grow grid grid-cols-3 gap-4">
          <div className="col-span-3 sm:col-span-1 flex flex-col justify-center items-center border-r border-border/50">
            <div className={`w-3 h-3 rounded-full ${statusInfo.color} mb-2`}></div>
            <p className={`text-xl font-bold ${status === 'met' ? 'text-green-400' : status === 'at-risk' ? 'text-yellow-400' : 'text-red-400'}`}>{statusInfo.label}</p>
            <p className="text-xs text-muted-foreground">Target: {(slo.target * 100).toFixed(2)}%</p>
          </div>
          <div className="col-span-3 sm:col-span-2 grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{(currentValue * 100).toFixed(3)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Error Budget Left</p>
              <p className="text-2xl font-bold">{(errorBudget * 100).toFixed(4)}%</p>
            </div>
            <div className="col-span-2 text-center">
              <p className="text-xs text-muted-foreground">Burn Rate</p>
              <div className="flex items-center justify-center gap-2">
                {burnRate > 1.1 ? <TrendingDown className="h-4 w-4 text-red-400" /> : <TrendingUp className="h-4 w-4 text-green-400" />}
                <p className="text-lg font-semibold">{burnRate.toFixed(2)}x</p>
              </div>
            </div>
          </div>
          <div className="col-span-3 flex flex-col items-center justify-center border-t border-border/50 pt-4">
             <p className="text-xs text-muted-foreground self-start mb-1">Trend</p>
             <Sparkline data={trend} color={status === 'met' ? '#4ade80' : status === 'at-risk' ? '#facc15' : '#f87171'} />
          </div>
          {incidents.length > 0 && (
            <div className="col-span-3 border-t border-border/50 pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-1 flex items-center"><LinkIcon className="h-3 w-3 mr-1"/>Correlated Incidents</h4>
              {incidents.map(inc => (
                <Badge key={inc.id} variant="secondary" className="mr-1 mb-1 text-xs">{inc.description}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- MAIN COMPONENT ---
export default function SLAMonitor() {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');

  const handleTimeWindowChange = (value: string) => {
    setTimeWindow(value as TimeWindow);
  };

  const visibleSLOs = useMemo(() => mockSLOs, []);

  return (
    <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">SLA/SLO Monitoring</h1>
            <p className="text-muted-foreground">Real-time service level objective dashboard.</p>
          </div>
          <Tabs value={timeWindow} onValueChange={handleTimeWindowChange} className="mt-4 sm:mt-0">
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </header>

        <AnimatePresence>
          <motion.div
            key={timeWindow} // Re-animate when time window changes
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {visibleSLOs.map((slo) => (
              <SLOCard key={slo.id} slo={slo} timeWindow={timeWindow} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
