import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import { Cpu, MemoryStick, Database, Network, RefreshCw, Play, Pause, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ResourceMonitorProps {
  metrics: {
    cpu: number; // percentage
    memory: { used: number; total: number }; // in GB
    storage: { used: number; total: number }; // in GB
    network: { in: number; out: number }; // in Mbps
    uptime: number; // in seconds
  };
  history: Array<{ timestamp: number; cpu: number; memory: number }>;
  onRefresh: () => void;
  isLive: boolean;
  onToggleLive: () => void;
}

const getUsageColor = (percentage: number): string => {
  if (percentage > 80) return 'text-red-500';
  if (percentage > 60) return 'text-yellow-500';
  return 'text-green-500';
};

const formatBytes = (used: number, total: number) => {
    return `${used.toFixed(2)} / ${total.toFixed(2)} GB`;
};

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  return `${String(d).padStart(2, '0')}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const spring = useSpring(value, { stiffness: 75, damping: 25, mass: 0.5 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
};

const CircularProgress = ({ progress, colorClass }: { progress: number; colorClass: string }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className="w-24 h-24" viewBox="0 0 100 100">
      <circle
        className="text-border"
        strokeWidth="8"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
      />
      <motion.circle
        className={colorClass}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="50"
        cy="50"
        transform="rotate(-90 50 50)"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring' as const, stiffness: 50, damping: 20 }}
      />
    </svg>
  );
};

const Sparkline = ({ data, colorClass }: { data: number[]; colorClass: string }) => {
    const width = 100;
    const height = 25;
    const maxVal = Math.max(...data, 0) || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / maxVal) * height}`).join(' ');

    if (data.length < 2) return null;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 overflow-visible">
            <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                points={points}
                className={colorClass}
            />
        </svg>
    );
};

export const ResourceMonitor: React.FC<ResourceMonitorProps> = ({ metrics, history, onRefresh, isLive, onToggleLive }) => {
  const memPercent = (metrics.memory.used / metrics.memory.total) * 100;
  const storagePercent = (metrics.storage.used / metrics.storage.total) * 100;

  const cpuHistory = useMemo(() => history.map(h => h.cpu), [history]);

  const metricCards = [
    {
      title: 'CPU',
      icon: Cpu,
      value: metrics.cpu,
      unit: '%',
      colorClass: getUsageColor(metrics.cpu),
      details: <Sparkline data={cpuHistory} colorClass={getUsageColor(metrics.cpu)} />
    },
    {
      title: 'Memory',
      icon: MemoryStick,
      value: memPercent,
      unit: '%',
      colorClass: getUsageColor(memPercent),
      details: <span className="text-sm text-muted-foreground">{formatBytes(metrics.memory.used, metrics.memory.total)}</span>
    },
    {
      title: 'Storage',
      icon: Database,
      value: storagePercent,
      unit: '%',
      colorClass: getUsageColor(storagePercent),
      details: <span className="text-sm text-muted-foreground">{formatBytes(metrics.storage.used, metrics.storage.total)}</span>
    },
    {
      title: 'Network',
      icon: Network,
      value: metrics.network.in + metrics.network.out,
      unit: 'Mbps',
      colorClass: 'text-primary',
      details: <div className="text-sm text-muted-foreground"><div>In: {metrics.network.in.toFixed(2)}</div><div>Out: {metrics.network.out.toFixed(2)}</div></div>
    }
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh metrics">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleLive}>
            {isLive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Badge variant={isLive ? 'default' : 'secondary'} className={isLive ? 'bg-green-500' : ''}>
            {isLive ? 'Real-time' : 'Paused'}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Timer className="w-4 h-4" />
            <span>Uptime: {formatUptime(metrics.uptime)}</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={cn('w-4 h-4 text-muted-foreground', card.colorClass)} />
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-around">
                    <div className="relative flex items-center justify-center">
                        <CircularProgress progress={card.value} colorClass={card.colorClass} />
                        <div className={cn('absolute text-xl font-bold', card.colorClass)}>
                            <AnimatedNumber value={card.value} />
                            <span className="text-xs">{card.unit}</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center w-2/5">
                        {card.details}
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
