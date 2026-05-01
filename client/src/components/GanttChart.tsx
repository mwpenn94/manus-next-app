
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Maximize, Minimize, Calendar, Flag, GitFork, Layers } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// --- TYPES ---
type Task = {
  id: string;
  name: string;
  start: Date;
  end: Date;
  progress: number;
  resource: string;
};

type Milestone = {
  id: string;
  name: string;
  date: Date;
};

type Dependency = {
  from: string;
  to: string;
};

// --- MOCK DATA ---
const mockTasks: Task[] = [
  { id: 'task-1', name: 'Initial Planning', start: new Date(2024, 5, 1), end: new Date(2024, 5, 5), progress: 100, resource: 'Alice' },
  { id: 'task-2', name: 'UI/UX Design', start: new Date(2024, 5, 6), end: new Date(2024, 5, 15), progress: 80, resource: 'Bob' },
  { id: 'task-3', name: 'Frontend Development', start: new Date(2024, 5, 16), end: new Date(2024, 6, 10), progress: 60, resource: 'Charlie' },
  { id: 'task-4', name: 'Backend Development', start: new Date(2024, 5, 16), end: new Date(2024, 6, 15), progress: 75, resource: 'David' },
  { id: 'task-5', name: 'API Integration', start: new Date(2024, 6, 11), end: new Date(2024, 6, 20), progress: 40, resource: 'Charlie' },
  { id: 'task-6', name: 'Testing & QA', start: new Date(2024, 6, 21), end: new Date(2024, 7, 5), progress: 20, resource: 'Eve' },
  { id: 'task-7', name: 'Deployment', start: new Date(2024, 7, 6), end: new Date(2024, 7, 10), progress: 0, resource: 'Frank' },
];

const mockMilestones: Milestone[] = [
  { id: 'm-1', name: 'Project Kickoff', date: new Date(2024, 5, 1) },
  { id: 'm-2', name: 'Alpha Release', date: new Date(2024, 6, 15) },
  { id: 'm-3', name: 'Public Launch', date: new Date(2024, 7, 10) },
];

const mockDependencies: Dependency[] = [
  { from: 'task-1', to: 'task-2' },
  { from: 'task-2', to: 'task-3' },
  { from: 'task-2', to: 'task-4' },
  { from: 'task-3', to: 'task-5' },
  { from: 'task-4', to: 'task-5' },
  { from: 'task-5', to: 'task-6' },
  { from: 'task-6', to: 'task-7' },
];

const GanttChart = () => {
  const [zoom, setZoom] = useState(1);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);

  const { chartStartDate, chartEndDate, totalDays } = useMemo(() => {
    const allDates = [
      ...tasks.map(t => t.start),
      ...tasks.map(t => t.end),
      ...mockMilestones.map(m => m.date),
    ];
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - 5);

    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + 5);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));

    return { chartStartDate: startDate, chartEndDate: endDate, totalDays };
  }, [tasks]);

  const criticalPath = useMemo(() => {
    const adj: { [key: string]: string[] } = {};
    const inDegree: { [key: string]: number } = {};
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    for (const task of tasks) {
      adj[task.id] = [];
      inDegree[task.id] = 0;
    }

    for (const dep of mockDependencies) {
      adj[dep.from].push(dep.to);
      inDegree[dep.to]++;
    }

    const queue = Object.keys(inDegree).filter(id => inDegree[id] === 0);
    const earliestFinishTimes: { [key: string]: number } = {};

    for (const task of tasks) {
        const duration = (task.end.getTime() - task.start.getTime()) / (1000 * 3600 * 24);
        earliestFinishTimes[task.id] = duration;
    }

    let maxDuration = 0;
    let finalTask = '';

    const topoOrder: string[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        topoOrder.push(u);

        for (const v of adj[u] || []) {
            const uTask = taskMap.get(u)!;
            const vTask = taskMap.get(v)!;
            const uDuration = (uTask.end.getTime() - uTask.start.getTime()) / (1000 * 3600 * 24);
            const vDuration = (vTask.end.getTime() - vTask.start.getTime()) / (1000 * 3600 * 24);

            if (earliestFinishTimes[u] + vDuration > earliestFinishTimes[v]) {
                earliestFinishTimes[v] = earliestFinishTimes[u] + vDuration;
            }
            inDegree[v]--;
            if (inDegree[v] === 0) {
                queue.push(v);
            }
        }
    }
    
    let longestPath: string[] = [];
    let maxPathLength = 0;

    for(const taskId of Object.keys(earliestFinishTimes)){
        if(earliestFinishTimes[taskId] > maxPathLength){
            maxPathLength = earliestFinishTimes[taskId];
            finalTask = taskId;
        }
    }

    const path = new Set<string>();
    const findPath = (task: string) => {
        path.add(task);
        let found = false;
        for(const dep of mockDependencies) {
            if(dep.to === task) {
                const fromTask = taskMap.get(dep.from)!;
                const toTask = taskMap.get(dep.to)!;
                const fromDuration = (fromTask.end.getTime() - fromTask.start.getTime()) / (1000 * 3600 * 24);
                const toDuration = (toTask.end.getTime() - toTask.start.getTime()) / (1000 * 3600 * 24);

                if(earliestFinishTimes[dep.to] - toDuration === earliestFinishTimes[dep.from]){
                    findPath(dep.from);
                    found = true;
                    break;
                }
            }
        }
    }

    findPath(finalTask);
    return path;
  }, [tasks]);

  const DAY_WIDTH = 50 * zoom;
  const ROW_HEIGHT = 40;
  const CHART_HEADER_HEIGHT = 60;

  const getXPosition = (date: Date) => {
    const diff = (date.getTime() - chartStartDate.getTime()) / (1000 * 3600 * 24);
    return diff * DAY_WIDTH;
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 5));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.2));

  return (
    <Card className="w-full h-[700px] flex flex-col bg-background">
        <CardHeader className="flex flex-row items-center justify-between py-3 border-b border-border">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Calendar className="w-5 h-5" />
          Project Timeline
        </CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <div className="w-4 h-2 rounded-full bg-primary/80 border border-primary"></div>
              <span>Critical Path</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <div className="w-4 h-2 rounded-full bg-secondary/80 border border-secondary-foreground/50"></div>
              <span>Non-Critical</span>
            </div>
          <Button variant="outline" size="sm" onClick={handleZoomOut} aria-label="Zoom Out">
            <Minus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn} aria-label="Zoom In">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-auto">
        <div className="relative min-w-full" style={{ height: `${(tasks.length + 2) * ROW_HEIGHT}px` }}>
          {/* Timeline Header */}
          <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-sm" style={{ height: `${CHART_HEADER_HEIGHT}px` }}>
            <svg width={totalDays * DAY_WIDTH} height={CHART_HEADER_HEIGHT} className="min-w-full">
              <defs>
                <pattern id="grid" width={DAY_WIDTH} height={CHART_HEADER_HEIGHT} patternUnits="userSpaceOnUse">
                  <path d={`M ${DAY_WIDTH} 0 L 0 0 0 ${CHART_HEADER_HEIGHT}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
                </pattern>
              </defs>
              <rect x="0" y="0" width="100%" height="100%" fill="url(#grid)" />
              {Array.from({ length: totalDays }).map((_, i) => {
                const date = new Date(chartStartDate);
                date.setDate(date.getDate() + i);
                const isMonthStart = date.getDate() === 1;
                return (
                  <g key={i}>
                    <text
                      x={i * DAY_WIDTH + DAY_WIDTH / 2}
                      y="45"
                      textAnchor="middle"
                      className="text-xs fill-current text-muted-foreground"
                    >
                      {date.toLocaleDateString(undefined, { day: 'numeric' })}
                    </text>
                    {isMonthStart && (
                      <text
                        x={i * DAY_WIDTH + 5}
                        y="20"
                        textAnchor="start"
                        className="text-sm font-semibold fill-current text-foreground"
                      >
                        {date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Today Marker */}
              <line
                x1={getXPosition(new Date())}
                x2={getXPosition(new Date())}
                y1="0"
                y2={CHART_HEADER_HEIGHT + (tasks.length + 1) * ROW_HEIGHT}
                className="stroke-red-500/70 stroke-2"
              />
              <path d={`M ${getXPosition(new Date()) - 5},${CHART_HEADER_HEIGHT - 10} l 5,10 l 5,-10 z`} className="fill-red-500/70" />
            </svg>
          </div>

          {/* Task List & Chart Area */}
          <div className="absolute top-0 left-0 w-full h-full flex">
            <div className="w-[250px] border-r border-border sticky left-0 bg-card z-10">
                <div style={{ height: CHART_HEADER_HEIGHT }} className="flex items-center p-2 border-b border-border font-semibold">Task Name</div>
                {tasks.map((task, index) => (
                    <div key={task.id} style={{ height: ROW_HEIGHT }} className="flex items-center p-2 border-b border-border truncate text-sm">
                        {task.name}
                    </div>
                ))}
            </div>
            <div className="flex-1 relative">
                <svg width={totalDays * DAY_WIDTH} height={(tasks.length + 2) * ROW_HEIGHT} className="min-w-full">
                    <g transform={`translate(0, ${CHART_HEADER_HEIGHT})`}>
                        {/* Grid lines */}
                        {Array.from({ length: totalDays }).map((_, i) => (
                            <line key={i} x1={i * DAY_WIDTH} x2={i * DAY_WIDTH} y1="0" y2={(tasks.length + 1) * ROW_HEIGHT} className="stroke-border" />
                        ))}
                        {tasks.map((_, i) => (
                            <line key={i} x1="0" x2={totalDays * DAY_WIDTH} y1={(i + 1) * ROW_HEIGHT} y2={(i + 1) * ROW_HEIGHT} className="stroke-border" />
                        ))}

                        {/* Dependency Arrows */}
                        {mockDependencies.map((dep, i) => {
                            const fromTask = tasks.find(t => t.id === dep.from);
                            const toTask = tasks.find(t => t.id === dep.to);
                            if (!fromTask || !toTask) return null;

                            const fromIndex = tasks.findIndex(t => t.id === dep.from);
                            const toIndex = tasks.findIndex(t => t.id === dep.to);

                            const startX = getXPosition(fromTask.end);
                            const startY = (fromIndex + 0.5) * ROW_HEIGHT;
                            const endX = getXPosition(toTask.start);
                            const endY = (toIndex + 0.5) * ROW_HEIGHT;
                            
                            const isCritical = criticalPath.has(dep.from) && criticalPath.has(dep.to);

                            return (
                                <motion.path
                                    key={i}
                                    d={`M ${startX} ${startY} C ${startX + 30} ${startY} ${endX - 30} ${endY} ${endX} ${endY}`}
                                    fill="none"
                                    stroke={isCritical ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                                    strokeWidth="1.5"
                                    markerEnd="url(#arrowhead)"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5, delay: 0.5 }}
                                />
                            );
                        })}
                        <defs>
                            <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--muted-foreground))" />
                            </marker>
                        </defs>

                        {/* Task Bars */}
                        {tasks.map((task, index) => {
                            const x = getXPosition(task.start);
                            const width = getXPosition(task.end) - x;
                            const y = index * ROW_HEIGHT + (ROW_HEIGHT * 0.15);
                            const isCritical = criticalPath.has(task.id);

                            return (
                                <g key={task.id}>
                                    <motion.rect
                                        x={x}
                                        y={y}
                                        width={width}
                                        height={ROW_HEIGHT * 0.7}
                                        rx="4"
                                        ry="4"
                                        className={cn(
                                            "stroke-2",
                                            isCritical ? "fill-primary/30 stroke-primary/80" : "fill-secondary/30 stroke-secondary-foreground/50"
                                        )}
                                        initial={{ opacity: 0, x: x - 20 }}
                                        animate={{ opacity: 1, x: x }}
                                        transition={{ duration: 0.3, delay: index * 0.05 }}
                                    />
                                    <motion.rect
                                        x={x}
                                        y={y}
                                        width={width * (task.progress / 100)}
                                        height={ROW_HEIGHT * 0.7}
                                        rx="4"
                                        ry="4"
                                        className={cn(isCritical ? "fill-primary/80" : "fill-secondary/80")}
                                        initial={{ width: 0 }}
                                        animate={{ width: width * (task.progress / 100) }}
                                        transition={{ duration: 0.5, delay: 0.5 + index * 0.05 }}
                                    />
                                    <text x={x + width + 10} y={y + ROW_HEIGHT / 2} dominantBaseline="middle" className="text-xs fill-current text-muted-foreground">{task.resource}</text>
                                </g>
                            );
                        })}

                        {/* Milestones */}
                        {mockMilestones.map(milestone => {
                            const x = getXPosition(milestone.date);
                            return (
                                <motion.g key={milestone.id} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 }}>
                                    <path
                                        d={`M ${x} ${CHART_HEADER_HEIGHT - 15} L ${x + 10} ${CHART_HEADER_HEIGHT - 5} L ${x} ${CHART_HEADER_HEIGHT + 5} L ${x - 10} ${CHART_HEADER_HEIGHT - 5} Z`}
                                        className="fill-amber-400 stroke-amber-600"
                                    />
                                    <text x={x} y={CHART_HEADER_HEIGHT - 25} textAnchor="middle" className="text-xs font-semibold fill-current text-amber-500">{milestone.name}</text>
                                </motion.g>
                            );
                        })}
                    </g>
                </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GanttChart;
