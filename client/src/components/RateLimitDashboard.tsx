import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { RefreshCw, Clock, PieChart, BarChart, AlertTriangle, Shield, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';

// --- Prop Types ---
type RateLimit = {
  id: string;
  name: string;
  current: number;
  max: number;
  resetAt: number; // Unix timestamp in seconds
  window: string;
  category: string;
};

type HistoryPoint = {
  timestamp: number; // Unix timestamp in seconds
  requests: number;
  limit: number;
};

interface RateLimitDashboardProps {
  limits: RateLimit[];
  history: HistoryPoint[];
  onRefresh: () => void;
  isLoading: boolean;
}

// --- Hooks ---
const useCountdown = (targetTimestamp: number) => {
  const [timeLeft, setTimeLeft] = useState(targetTimestamp - Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (targetTimestamp <= 0) {
      setTimeLeft(0);
      return;
    }

    const intervalId = setInterval(() => {
      const newTimeLeft = targetTimestamp - Math.floor(Date.now() / 1000);
      setTimeLeft(newTimeLeft > 0 ? newTimeLeft : 0);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetTimestamp]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return { timeLeft, formattedTime: formatTime(timeLeft) };
};

// --- Helper Functions & Constants ---
const getUsageColor = (percentage: number): string => {
  if (percentage > 80) return 'bg-red-500';
  if (percentage > 50) return 'bg-yellow-500';
  return 'bg-green-500';
};

const REFRESH_INTERVAL = 30; // seconds

// --- Sub-components ---
const UsageHistoryChart: React.FC<{ history: HistoryPoint[] }> = ({ history }) => {
  const width = 500;
  const height = 100;
  const padding = 10;

  const points = useMemo(() => {
    if (!history || history.length < 2) return '';

    const maxRequests = Math.max(...history.map(p => p.requests), 1);
    const minTime = history[0].timestamp;
    const maxTime = history[history.length - 1].timestamp;
    const timeRange = maxTime - minTime || 1;

    const path = history.map(p => {
      const x = padding + ((p.timestamp - minTime) / timeRange) * (width - 2 * padding);
      const y = height - padding - (p.requests / maxRequests) * (height - 2 * padding);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join('L');

    return `M${path}`;
  }, [history]);

  if (!history || history.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No historical data available.</div>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <motion.path
        d={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeInOut" as const }}
      />
    </svg>
  );
};

const LimitItem: React.FC<{ limit: RateLimit }> = ({ limit }) => {
  const percentage = limit.max > 0 ? (limit.current / limit.max) * 100 : 0;
  const { formattedTime } = useCountdown(limit.resetAt);

  const progressVariants: Variants = {
    initial: { width: '0%' },
    animate: { 
      width: `${percentage}%`,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] as const }
    },
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">{limit.name}</h3>
            <Badge variant="secondary" className="mt-1">{limit.category}</Badge>
          </div>
          <div className="text-right">
            <div className="font-bold text-xl">{`${limit.current.toLocaleString()} / ${limit.max.toLocaleString()}`}</div>
            <div className="text-sm text-muted-foreground">{percentage.toFixed(2)}% Used</div>
          </div>
        </div>
        <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
                className={cn("absolute top-0 left-0 h-full rounded-full", getUsageColor(percentage))}
                variants={progressVariants}
                initial="initial"
                animate="animate"
            />
        </div>
        <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
          <span>Window: {limit.window}</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Resets in: {formattedTime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Component ---
export const RateLimitDashboard: React.FC<RateLimitDashboardProps> = ({ limits, history, onRefresh, isLoading }) => {
  const [refreshCountdown, setRefreshCountdown] = useState(REFRESH_INTERVAL);

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown(prev => {
        if (prev <= 1) {
          onRefresh();
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  const summary = useMemo(() => {
    const totalRequests = limits.reduce((sum, l) => sum + l.current, 0);
    const totalMax = limits.reduce((sum, l) => sum + l.max, 0);
    const remainingQuota = totalMax > 0 ? (1 - totalRequests / totalMax) * 100 : 100;
    const nextReset = Math.min(...limits.map(l => l.resetAt).filter(t => t > 0));
    return { totalRequests, remainingQuota, nextReset };
  }, [limits]);

  const { formattedTime: nextResetFormatted } = useCountdown(summary.nextReset);

  const groupedLimits = useMemo(() => {
    return limits.reduce((acc, limit) => {
      (acc[limit.category] = acc[limit.category] || []).push(limit);
      return acc;
    }, {} as Record<string, RateLimit[]>);
  }, [limits]);

  const alerts = useMemo(() => 
    limits.filter(l => l.max > 0 && (l.current / l.max) * 100 > 80)
  , [limits]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">API Rate Limit Dashboard</h1>
          <p className="text-muted-foreground">Live overview of your API usage and quotas.</p>
        </div>
        <Button onClick={onRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          {isLoading ? 'Refreshing...' : `Refresh (in ${refreshCountdown}s)`}
        </Button>
      </header>

      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            {alerts.map(alert => (
              <Alert key={alert.id} variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>High Usage Alert!</AlertTitle>
                <AlertDescription>
                  The "{alert.name}" limit is at {((alert.current / alert.max) * 100).toFixed(1)}% capacity.
                </AlertDescription>
              </Alert>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests (Today)</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalRequests.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Quota Remaining</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.remainingQuota.toFixed(2)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Global Reset</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextResetFormatted}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historical Usage</CardTitle>
          <CardDescription>Total requests over the last period.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageHistoryChart history={history} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        {Object.entries(groupedLimits).map(([category, categoryLimits]) => (
          <div key={category}>
            <h2 className="text-2xl font-semibold mb-4 capitalize">{category} Limits</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categoryLimits.map(limit => (
                <LimitItem key={limit.id} limit={limit} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
