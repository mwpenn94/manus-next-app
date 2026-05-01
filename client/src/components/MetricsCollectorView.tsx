import React, { useState, useMemo, useEffect } from 'react';
import { Search, Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// --- TYPES ---
type MetricType = 'counter' | 'gauge' | 'histogram' | 'duration_percentiles';

interface MetricLabel {
  [key: string]: string;
}

interface BaseMetric {
  name: string;
  description: string;
  type: MetricType;
  labels: MetricLabel;
}

interface Counter extends BaseMetric {
  type: 'counter';
  value: number;
}

interface Gauge extends BaseMetric {
  type: 'gauge';
  value: number;
}

interface Histogram extends BaseMetric {
  type: 'histogram';
  buckets: { le: number; count: number }[];
}

interface DurationPercentiles extends BaseMetric {
  type: 'duration_percentiles';
  percentiles: { p: number; value: number }[];
}

type Metric = Counter | Gauge | Histogram | DurationPercentiles;

// --- MOCK DATA ---
const mockMetrics: Metric[] = [
  { name: 'api_requests_total', description: 'Total number of API requests.', type: 'counter', value: 102345, labels: { method: 'GET', status: '200' } },
  { name: 'cpu_usage_seconds', description: 'CPU usage in seconds.', type: 'gauge', value: 0.78, labels: { core: '1', mode: 'user' } },
  { name: 'http_request_duration_seconds', description: 'HTTP request duration distribution.', type: 'histogram', labels: { path: '/api/v1/data' }, buckets: [{ le: 0.1, count: 120 }, { le: 0.5, count: 450 }, { le: 1, count: 580 }, { le: 5, count: 610 }] },
  { name: 'db_query_duration_ms', description: 'Database query duration percentiles.', type: 'duration_percentiles', labels: { db: 'postgres', query: 'select_users' }, percentiles: [{ p: 50, value: 15 }, { p: 95, value: 150 }, { p: 99, value: 350 }] },
  { name: 'active_connections', description: 'Number of active connections.', type: 'gauge', value: 42, labels: { tier: 'frontend' } },
  { name: 'failed_logins_total', description: 'Total failed login attempts.', type: 'counter', value: 13, labels: { reason: 'invalid_password' } },
];

const AnimatedNumber = ({ value }: { value: number }) => {
  const [currentValue, setCurrentValue] = useState(0);
  useEffect(() => {
    const diff = value - currentValue;
    if (Math.abs(diff) < 0.01) { setCurrentValue(value); return; }
    const timer = requestAnimationFrame(() => setCurrentValue(prev => prev + diff * 0.1));
    return () => cancelAnimationFrame(timer);
  }, [value, currentValue]);










  return <motion.span>{currentValue.toFixed(value % 1 === 0 ? 0 : 2)}</motion.span>;
};

const MiniBarChart = ({ data }: { data: { le: number; count: number }[] }) => {
  const maxCount = Math.max(...data.map(d => d.count));
  return (
    <div className="flex items-end h-24 space-x-1">
      {data.map((bar, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-primary/50 rounded-t-sm"
          initial={{ height: 0 }}
          animate={{ height: `${(bar.count / maxCount) * 100}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          aria-label={`Bucket ${bar.le}: ${bar.count}`}
        />
      ))}
    </div>
  );
};

const MiniTimeSeries = () => {
    const points = useMemo(() => {
        let path = 'M 0 50 ';
        for (let i = 1; i <= 100; i++) {
            path += `L ${i} ${30 + Math.sin(i / 5) * 15 + Math.random() * 10} `;
        }
        return path;
    }, []);

    return (
        <svg viewBox="0 0 100 60" className="w-full h-16" preserveAspectRatio="none">
            <motion.path
                d={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-primary/70"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
        </svg>
    );
};

const MetricsCollectorView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());

  const allLabels = useMemo(() => {
    const labels = new Set<string>();
    mockMetrics.forEach(m => {
      Object.entries(m.labels).forEach(([key, value]) => labels.add(`${key}:${value}`));
    });
    return Array.from(labels).sort();
  }, []);

  const filteredMetrics = useMemo(() => {
    return mockMetrics.filter(metric => {
      const searchMatch = metric.name.toLowerCase().includes(searchQuery.toLowerCase()) || metric.description.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) return false;

      if (selectedLabels.size === 0) return true;

      const metricLabels = Object.entries(metric.labels).map(([key, value]) => `${key}:${value}`);
      return Array.from(selectedLabels).every(sl => metricLabels.includes(sl));
    });
  }, [searchQuery, selectedLabels]);

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-background text-foreground p-4 md:p-6 min-h-screen font-sans">
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-2xl font-bold tracking-tight">Metrics Dashboard</h1>
            <div className="flex items-center gap-2">
                <div className="relative w-full max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search metrics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                        aria-label="Search metrics"
                    />
                </div>
                <Button variant="outline" size="icon" onClick={() => alert('Exporting metrics...')}>
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Export Metrics</span>
                </Button>
            </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-muted-foreground">Filter by labels:</span>
            {allLabels.map(label => (
                <Badge
                    key={label}
                    variant={selectedLabels.has(label) ? 'default' : 'secondary'}
                    onClick={() => toggleLabel(label)}
                    className="cursor-pointer transition-all hover:opacity-80"
                    role="checkbox"
                    aria-checked={selectedLabels.has(label)}
                >
                    {label}
                </Badge>
            ))}
        </div>
      </header>

      <AnimatePresence>
        <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            layout
        >
          {filteredMetrics.map(metric => (
            <motion.div key={metric.name} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
              <Card className="h-full flex flex-col bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-mono font-medium tracking-tight">{metric.name}</CardTitle>
                  <p className="text-xs text-muted-foreground pt-1">{metric.description}</p>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-between">
                  <div className="flex-grow">
                    {metric.type === 'counter' && <p className="text-4xl font-bold tracking-tighter"><AnimatedNumber value={metric.value} /></p>}
                    {metric.type === 'gauge' && <p className="text-4xl font-bold tracking-tighter"><AnimatedNumber value={metric.value} /></p>}
                    {metric.type === 'histogram' && <MiniBarChart data={metric.buckets} />}
                    {metric.type === 'duration_percentiles' && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8">Percentile</TableHead>
                            <TableHead className="h-8 text-right">Duration (ms)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {metric.percentiles.map(p => (
                            <TableRow key={p.p}>
                              <TableCell className="py-1 font-mono">p{p.p}</TableCell>
                              <TableCell className="py-1 text-right font-mono"><AnimatedNumber value={p.value} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                  <div className="mt-4 border-t border-border/50 pt-2">
                    <MiniTimeSeries />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {filteredMetrics.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
              <p>No metrics found.</p>
          </div>
      )}
    </div>
  );
};

export default MetricsCollectorView;
