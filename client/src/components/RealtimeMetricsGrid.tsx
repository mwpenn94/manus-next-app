import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ArrowUp, ArrowDown, Move, Maximize, Settings, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- TYPE DEFINITIONS ---
type Trend = 'up' | 'down' | 'stable';

interface MetricData {
  id: string;
  name: string;
  value: number;
  unit: string;
  trend: Trend;
  change: string;
  sparkline: number[];
  previousValue: number;
  threshold?: { warn: number; error: number };
}

// --- MOCK DATA ---
const initialMetrics: MetricData[] = [
  { id: 'req_per_s', name: 'Requests/s', value: 142.8, unit: 'rps', trend: 'up', change: '+5.2%', sparkline: [], previousValue: 135.7, threshold: { warn: 180, error: 220 } },
  { id: 'latency', name: 'Latency', value: 124, unit: 'ms', trend: 'down', change: '-8.1%', sparkline: [], previousValue: 135, threshold: { warn: 250, error: 400 } },
  { id: 'error_rate', name: 'Error Rate', value: 1.2, unit: '%', trend: 'up', change: '+0.3%', sparkline: [], previousValue: 0.9, threshold: { warn: 3, error: 5 } },
  { id: 'cpu_usage', name: 'CPU Usage', value: 68, unit: '%', trend: 'stable', change: '+1.5%', sparkline: [], previousValue: 66.5, threshold: { warn: 80, error: 95 } },
  { id: 'memory', name: 'Memory', value: 7.9, unit: 'GB', trend: 'up', change: '+2.0%', sparkline: [], previousValue: 7.7, threshold: { warn: 14, error: 15.5 } },
  { id: 'active_users', name: 'Active Users', value: 12345, unit: '', trend: 'up', change: '+102', sparkline: [], previousValue: 12243 },
  { id: 'tasks_completed', name: 'Tasks Completed', value: 89, unit: 'tasks', trend: 'down', change: '-5', sparkline: [], previousValue: 94 },
  { id: 'tokens_used', name: 'Tokens Used', value: 2.1, unit: 'M', trend: 'up', change: '+0.2M', sparkline: [], previousValue: 1.9 },
  { id: 'cost', name: 'Cost', value: 15.67, unit: 'USD', trend: 'up', change: '+$1.20', sparkline: [], previousValue: 14.47 },
];

initialMetrics.forEach(metric => {
  metric.sparkline = Array.from({ length: 20 }, () => metric.previousValue + (Math.random() - 0.5) * (metric.previousValue * 0.2));
  metric.sparkline.push(metric.value);
});

const Sparkline = ({ data, width = 100, height = 30, color = "#8884d8" }: { data: number[]; width?: number; height?: number; color?: string }) => {
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const normalizedData = data.map(d => dataMax === dataMin ? height / 2 : height - ((d - dataMin) / (dataMax - dataMin)) * height);

  const path = normalizedData.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${d.toFixed(2)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <motion.path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </svg>
  );
};

const MetricCard = React.memo(({ metric, onExpand }: { metric: MetricData; onExpand: (metric: MetricData) => void; }) => {
  const getStatusColor = useCallback(() => {
    if (!metric.threshold) return 'text-foreground';
    if (metric.value >= metric.threshold.error) return 'text-red-500';
    if (metric.value >= metric.threshold.warn) return 'text-yellow-500';
    return 'text-green-500';
  }, [metric.value, metric.threshold]);

  const trendIcon = useMemo(() => {
    if (metric.trend === 'up') return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (metric.trend === 'down') return <ArrowDown className="h-4 w-4 text-red-500" />;
    return null;
  }, [metric.trend]);

  return (
    <Card className="h-full flex flex-col bg-card hover:bg-muted/40 transition-colors duration-300 group cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.name}</CardTitle>
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="h-6 w-6 group-hover:opacity-100 opacity-0 transition-opacity" onClick={(e: React.MouseEvent) => { e.stopPropagation(); onExpand(metric); }}><Maximize className="h-4 w-4" /></Button>
                <div className="h-4 w-4 text-muted-foreground cursor-grab"><Move className="h-4 w-4" /></div>
            </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col justify-between" onClick={() => onExpand(metric)}>
            <div>
                <div className={cn("text-3xl font-bold", getStatusColor())}>
                    {metric.value.toLocaleString(undefined, { maximumFractionDigits: metric.unit === '%' ? 1 : 2 })}{metric.unit && <span className="text-lg font-normal">{metric.unit !== '%' ? ` ${metric.unit}`: '%'}</span>}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                    {trendIcon}
                    <span className={cn("ml-1", metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : '')}>{metric.change} vs prev. period</span>
                </div>
            </div>
            <div className="mt-4">
                <Sparkline data={metric.sparkline} color={getStatusColor().includes('red') ? '#ef4444' : getStatusColor().includes('yellow') ? '#eab308' : '#22c55e'} />
            </div>
        </CardContent>
    </Card>
  );
});

const ExpandedChartView = ({ metric, onClose }: { metric: MetricData; onClose: () => void; }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setDims({ width, height });
            }
        });
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => resizeObserver.disconnect();
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="bg-background rounded-lg w-full max-w-4xl h-[70vh] p-6 border border-border flex flex-col"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4">
                    <h2 className="text-2xl font-bold">{metric.name}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
                </div>
                <div ref={containerRef} className="flex-grow h-full w-full">
                    {dims.width > 0 && <Sparkline data={metric.sparkline} width={dims.width} height={dims.height} color="#8884d8" />}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function RealtimeMetricsGrid() {
  const [metrics, setMetrics] = useState<MetricData[]>(initialMetrics);
  const [gridSize, setGridSize] = useState<string>('3x3');
  const [refreshInterval, setRefreshInterval] = useState<number>(3000);
  const [expandedMetric, setExpandedMetric] = useState<MetricData | null>(null);

  useEffect(() => {
    if (refreshInterval === 0) return;

    const intervalId = setInterval(() => {
      setMetrics(prevMetrics => 
        prevMetrics.map(metric => {
          const changeFactor = (Math.random() - 0.47) * 0.1;
          const newValue = Math.max(0, metric.value * (1 + changeFactor));
          const newSparkline = [...metric.sparkline.slice(1), newValue];
          const change = newValue - metric.previousValue;
          const changePercent = (change / metric.previousValue) * 100;

          let newTrend: Trend = 'stable';
          if (changePercent > 1) newTrend = 'up';
          else if (changePercent < -1) newTrend = 'down';

          return {
            ...metric,
            value: newValue,
            sparkline: newSparkline,
            trend: newTrend,
            change: `${change > 0 ? '+' : ''}${change.toFixed(1)} (${changePercent.toFixed(1)}%)`,
          };
        })
      );
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  const gridLayoutClasses = {
    '2x2': 'grid-cols-2 grid-rows-2',
    '3x3': 'grid-cols-3 grid-rows-3',
    '4x4': 'grid-cols-4 grid-rows-4',
  }[gridSize] || 'grid-cols-3 grid-rows-3';

  return (
    <div className="p-4 bg-background text-foreground min-h-screen">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Real-time Dashboard</h1>
        <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><Settings className="h-4 w-4 mr-2" />Layout</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setGridSize("2x2")}>2x2</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setGridSize("3x3")}>3x3</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setGridSize("4x4")}>4x4</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2" />{refreshInterval > 0 ? `${refreshInterval/1000}s` : 'Off'}</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setRefreshInterval(1000)}>1s</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRefreshInterval(3000)}>3s</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRefreshInterval(5000)}>5s</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setRefreshInterval(0)}>Off</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </header>
      <Reorder.Group
        as="div"
        axis="y"
        values={metrics}
        onReorder={setMetrics}
        className={cn('grid gap-4 w-full h-[80vh]', gridLayoutClasses)}
      >
        {metrics.map(metric => (
          <Reorder.Item key={metric.id} value={metric} as="div" className="h-full w-full">
            <MetricCard metric={metric} onExpand={setExpandedMetric} />
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <AnimatePresence>
        {expandedMetric && <ExpandedChartView metric={expandedMetric} onClose={() => setExpandedMetric(null)} />}
      </AnimatePresence>
    </div>
  );
}
