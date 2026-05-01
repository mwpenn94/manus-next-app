import React, { useState, useEffect } from 'react';
import { motion, useSpring, useInView, useTransform } from 'framer-motion';
import { BarChart, Clock, Zap, DollarSign, List, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// --- PROPS & DATA TYPES ---
type ToolUsage = {
  tool: string;
  count: number;
  avgDuration: number;
};

type DailyActivity = {
  date: string;
  tasks: number;
  tokens: number;
};

export interface TaskAnalyticsDashboardProps {
  stats: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgDuration: number; // in seconds
    totalTokensUsed: number;
    totalCost: number;
    toolUsage: ToolUsage[];
    dailyActivity: DailyActivity[];
  };
  timeRange: '7d' | '30d' | '90d' | 'all';
  onTimeRangeChange: (range: '7d' | '30d' | '90d' | 'all') => void;
}

// --- HELPER COMPONENTS ---

const AnimatedNumber = ({ value, format }: { value: number; format?: (value: number) => string }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const spring = useSpring(0, { damping: 60, stiffness: 100 });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [spring, value, isInView]);

  const display = useTransform(spring, (v: number) => format ? format(v) : Math.round(v).toLocaleString());
  return (
    <motion.span ref={ref}>
      {display}
    </motion.span>
  );
};

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
      <circle
        className="text-border"
        stroke="currentColor"
        strokeWidth="8"
        fill="transparent"
        r={radius}
        cx="40"
        cy="40"
      />
      <motion.circle
        className="text-primary"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="transparent"
        r={radius}
        cx="40"
        cy="40"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, ease: 'easeOut' as const }}
        strokeDasharray={`${circumference} ${circumference}`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dy=".3em"
        className="text-xl font-bold fill-foreground -rotate-90 origin-center translate-x-[-90px] translate-y-[-10px]"
      >
        {`${Math.round(percentage)}%`}
      </text>
    </svg>
  );
};

const HorizontalBarChart = ({ data }: { data: ToolUsage[] }) => {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(...sortedData.map(d => d.count), 1);

  return (
    <div className="space-y-4">
      {sortedData.map((item, index) => (
        <div key={index} className="grid grid-cols-4 items-center gap-4 text-sm">
          <div className="col-span-1 truncate text-muted-foreground">{item.tool}</div>
          <div className="col-span-3 flex items-center gap-2">
            <motion.div
              className="h-2 rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(item.count / maxCount) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] as const }}
            />
            <span className="font-medium text-foreground">{item.count.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const SparklineChart = ({ data }: { data: DailyActivity[] }) => {
  if (data.length < 2) return <div className="h-20 flex items-center justify-center text-muted-foreground">Not enough data</div>;

  const width = 300;
  const height = 80;
  const maxTasks = Math.max(...data.map(d => d.tasks), 0);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (maxTasks > 0 ? (d.tasks / maxTasks) * (height - 10) : height / 2) - 5;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <motion.polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        points={points}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: 'easeInOut' as const }}
      />
    </svg>
  );
};

// --- MAIN COMPONENT ---

export const TaskAnalyticsDashboard = ({ stats, timeRange, onTimeRangeChange }: TaskAnalyticsDashboardProps) => {
  const completionRate = stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0;
  const topTools = [...stats.toolUsage].sort((a, b) => b.count - a.count).slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, format, children }: {
    title: string;
    value?: number;
    icon: React.ElementType;
    format?: (value: number) => string;
    children?: React.ReactNode;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {children ? (
          children
        ) : (
          <div className="text-2xl font-bold">
            {value !== undefined && <AnimatedNumber value={value} format={format} />}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-background text-foreground">
      <Tabs value={timeRange} onValueChange={onTimeRangeChange as (value: string) => void} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-md mb-6">
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
          <TabsTrigger value="90d">90 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
        <TabsContent value={timeRange}>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Tasks" value={stats.totalTasks} icon={List} />
            <StatCard title="Completion Rate" icon={CheckCircle}>
              <div className="flex items-center justify-between">
                <CircularProgress percentage={completionRate} />
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                    <span>{stats.completedTasks}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <XCircle className="h-4 w-4 mr-1 text-red-500" />
                    <span>{stats.failedTasks}</span>
                  </div>
                </div>
              </div>
            </StatCard>
            <StatCard
              title="Avg. Duration"
              value={stats.avgDuration}
              icon={Clock}
              format={(v) => `${v.toFixed(2)}s`}
            />
            <StatCard
              title="Total Cost"
              value={stats.totalCost}
              icon={DollarSign}
              format={(v) => `$${v.toFixed(4)}`}
            />
          </div>

          <div className="grid gap-4 mt-6 md:grid-cols-5">
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Tool Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={stats.toolUsage} />
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Daily Activity (Tasks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SparklineChart data={stats.dailyActivity} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Most Used Tools
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {topTools.map(tool => (
                      <Badge key={tool.tool} variant="secondary" className="text-sm">
                        {tool.tool} <span className="ml-2 font-mono text-xs bg-background/70 px-1.5 py-0.5 rounded">{tool.count}</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};