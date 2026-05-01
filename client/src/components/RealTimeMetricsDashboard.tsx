import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// --- TYPES ---
type Metric = {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  history: number[];
  target?: number;
};

interface RealTimeMetricsDashboardProps {
  metrics: Metric[];
  isLive: boolean;
  onToggleLive: () => void;
  lastUpdated: number;
  onRefresh: () => void;
}

// --- SUB-COMPONENTS ---

const AnimatedValue = ({ value, unit }: { value: number; unit: string }) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    const start = currentValue;
    const end = value;
    const duration = 500;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrentValue(start + (end - start) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <motion.span>
      {currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      {unit}
    </motion.span>
  );
};

const Sparkline = ({ history, trend, target }: { history: number[]; trend: 'up' | 'down' | 'stable'; target?: number }) => {
  const width = 120;
  const height = 40;
  const strokeWidth = 2;

  const trendColor = {
    up: 'hsl(var(--success))',
    down: 'hsl(var(--destructive))',
    stable: 'hsl(var(--muted-foreground))',
  }[trend];

  const path = useMemo(() => {
    if (history.length < 2) return '';
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    return history
      .map((val, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - strokeWidth * 2) - strokeWidth;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [history, width, height]);

  const targetLineY = useMemo(() => {
    if (!target || history.length < 2) return null;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;
    return height - ((target - min) / range) * (height - strokeWidth * 2) - strokeWidth;
  }, [history, target, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {targetLineY !== null && (
        <line
          x1="0"
          y1={targetLineY}
          x2={width}
          y2={targetLineY}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2,2"
        />
      )}
      <motion.path
        d={path}
        fill="none"
        stroke={trendColor}
        strokeWidth={strokeWidth}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' as const }}
      />
    </svg>
  );
};

const MetricCard = ({ metric }: { metric: Metric }) => {
  const { label, value, previousValue, unit, trend, history, target } = metric;

  const change = previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  const trendInfo = {
    up: { Icon: ArrowUp, color: 'text-success' },
    down: { Icon: ArrowDown, color: 'text-destructive' },
    stable: { Icon: Minus, color: 'text-muted-foreground' },
  }[trend];

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-between">
        <div className="text-3xl font-bold">
          <AnimatedValue value={value} unit={unit} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className={cn('flex items-center text-sm', trendInfo.color)}>
            <trendInfo.Icon className="h-4 w-4 mr-1" />
            <span>{`${isPositive ? '+' : ''}${change.toFixed(2)}%`}</span>
          </div>
          <Sparkline history={history} trend={trend} target={target} />
        </div>
      </CardContent>
    </Card>
  );
};

const TimeAgo = ({ timestamp }: { timestamp: number }) => {
  const [timeAgo, setTimeAgo] = useState('just now');

  useEffect(() => {
    const update = () => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 5) setTimeAgo('just now');
      else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
      else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
    };

    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <span className="text-sm text-muted-foreground">Last updated {timeAgo}</span>;
};

// --- MAIN COMPONENT ---

export const RealTimeMetricsDashboard = ({
  metrics,
  isLive,
  onToggleLive,
  lastUpdated,
  onRefresh,
}: RealTimeMetricsDashboardProps) => {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Real-time Metrics</h1>
          <AnimatePresence>
            {isLive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Badge variant="secondary" className="flex items-center gap-2 bg-success/20 text-success-foreground border-success">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  Live
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <TimeAgo timestamp={lastUpdated} />
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLive}>
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Refresh metrics</span>
          </Button>
          <Button onClick={onToggleLive} variant={isLive ? 'destructive' : 'default'}>
            {isLive ? 'Pause Live' : 'Go Live'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
};
