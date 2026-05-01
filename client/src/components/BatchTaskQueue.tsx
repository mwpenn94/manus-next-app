import React, { useState, useMemo } from 'react';
import { Reorder, AnimatePresence, motion } from 'framer-motion';
import { Clock, Check, X, Pause, Play, RefreshCw, ChevronsUpDown, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

// Props type definition
type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'paused';

interface Task {
  id: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  progress?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

interface BatchTaskQueueProps {
  tasks: Task[];
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRetry: (id: string) => void;
  isProcessing: boolean;
  onStartBatch: () => void;
  onPauseBatch: () => void;
}

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  queued: <Clock className="h-4 w-4 text-muted-foreground" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
  completed: <Check className="h-4 w-4 text-green-500" />,
  failed: <X className="h-4 w-4 text-red-500" />,
  paused: <Pause className="h-4 w-4 text-yellow-500" />,
};

const formatElapsedTime = (startTime?: number, endTime?: number) => {
  if (!startTime) return '';
  const end = endTime || Date.now();
  const seconds = Math.floor((end - startTime) / 1000);
  if (seconds < 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const TaskItem = ({ task, isProcessing, onPause, onResume, onRetry, onCancel }: { task: Task, isProcessing: boolean, onPause: (id: string) => void, onResume: (id: string) => void, onRetry: (id: string) => void, onCancel: (id: string) => void }) => {
    const [expandedError, setExpandedError] = useState(false);

    return (
        <Reorder.Item
            value={task}
            id={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
            className="p-3 rounded-lg border bg-card flex items-center gap-4"
            whileDrag={{ scale: 1.02, boxShadow: '0px 5px 15px rgba(0,0,0,0.1)' }}
        >
            <div className="flex-shrink-0 cursor-grab active:cursor-grabbing" hidden={isProcessing}>
                <ChevronsUpDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-shrink-0 w-5 text-center">
                {statusIcons[task.status]}
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="font-medium truncate">{task.title}</div>
                <div className="text-sm text-muted-foreground truncate">{task.prompt}</div>
                {task.status === 'running' && task.progress !== undefined && (
                    <div className="flex items-center gap-2 mt-1">
                        <Progress value={task.progress} className="w-full h-2" />
                        <span className="text-xs font-mono">{task.progress}%</span>
                    </div>
                )}
                {task.status === 'failed' && task.error && (
                    <div className="mt-1">
                        <Button variant="link" size="sm" className="h-auto p-0 text-red-500" onClick={() => setExpandedError(p => !p)}>
                            {expandedError ? 'Hide Error' : 'Show Error'}
                        </Button>
                        {expandedError && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded-md mt-1 font-mono whitespace-pre-wrap">{task.error}</p>}
                    </div>
                )}
            </div>
            <div className="flex-shrink-0 text-sm font-mono text-muted-foreground w-16 text-right">
                {formatElapsedTime(task.startedAt, task.completedAt)}
            </div>
            <div className="flex-shrink-0 flex items-center gap-1">
                {task.status === 'running' && <Button size="icon" variant="ghost" onClick={() => onPause(task.id)}><Pause className="h-4 w-4"/></Button>}
                {task.status === 'paused' && <Button size="icon" variant="ghost" onClick={() => onResume(task.id)}><Play className="h-4 w-4"/></Button>}
                {task.status === 'failed' && <Button size="icon" variant="ghost" onClick={() => onRetry(task.id)}><RefreshCw className="h-4 w-4"/></Button>}
                {(task.status === 'queued' || task.status === 'paused') && !isProcessing && <Button size="icon" variant="ghost" onClick={() => onCancel(task.id)}><Trash2 className="h-4 w-4"/></Button>}
            </div>
        </Reorder.Item>
    );
};

export const BatchTaskQueue = ({ 
    tasks, 
    onPause, 
    onResume, 
    onCancel, 
    onReorder,
    onRetry, 
    isProcessing, 
    onStartBatch, 
    onPauseBatch 
}: BatchTaskQueueProps) => {

    const summaryStats = useMemo(() => {
        return tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {} as Record<TaskStatus, number>);
    }, [tasks]);

    const completedTasks = useMemo(() => tasks.filter(t => t.status === 'completed'), [tasks]);

    const avgCompletionTime = useMemo(() => {
        if (completedTasks.length === 0) return 0;
        const totalTime = completedTasks.reduce((acc, task) => {
            if (!task.startedAt || !task.completedAt) return acc;
            return acc + (task.completedAt - task.startedAt);
        }, 0);
        return totalTime / completedTasks.length;
    }, [completedTasks]);

    const estimatedTimeRemaining = useMemo(() => {
        const queuedCount = summaryStats.queued || 0;
        const runningCount = summaryStats.running || 0;
        if (avgCompletionTime === 0 || (queuedCount + runningCount) === 0) return null;
        const remainingSeconds = Math.floor(((queuedCount + runningCount) * avgCompletionTime) / 1000);
        if (remainingSeconds < 60) return `~${remainingSeconds}s remaining`;
        const minutes = Math.floor(remainingSeconds / 60);
        return `~${minutes}m ${remainingSeconds % 60}s remaining`;
    }, [summaryStats.queued, summaryStats.running, avgCompletionTime]);

    const handleClearCompleted = () => {
        completedTasks.forEach(task => onCancel(task.id));
    };

    const handleReorder = (newOrder: Task[]) => {
        const originalIds = tasks.map(t => t.id);
        const newIds = newOrder.map(t => t.id);
        
        if (originalIds.join('') === newIds.join('')) return;

        let fromIndex = -1, toIndex = -1;

        for(let i = 0; i < originalIds.length; i++) {
            if(originalIds[i] !== newIds[i]) {
                fromIndex = i;
                toIndex = newIds.indexOf(originalIds[i]);
                break;
            }
        }

        if(fromIndex !== -1 && toIndex !== -1) {
            onReorder(fromIndex, toIndex);
        }
    };

    return (
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Batch Task Queue</span>
                    <div className="flex items-center gap-2">
                        {isProcessing ? (
                            <Button onClick={onPauseBatch} variant="outline" size="sm"><Pause className="h-4 w-4 mr-2"/>Pause All</Button>
                        ) : (
                            <Button onClick={onStartBatch} size="sm" disabled={tasks.filter(t => t.status === 'queued').length === 0}><Play className="h-4 w-4 mr-2"/>Start All</Button>
                        )}
                        <Button onClick={handleClearCompleted} variant="ghost" size="sm" disabled={completedTasks.length === 0}><Trash2 className="h-4 w-4 mr-2"/>Clear Completed</Button>
                    </div>
                </CardTitle>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2">
                    <span><span className="font-semibold">{summaryStats.queued || 0}</span> queued</span>
                    <span><span className="font-semibold">{summaryStats.running || 0}</span> running</span>
                    <span><span className="font-semibold">{summaryStats.completed || 0}</span> completed</span>
                    <span><span className="font-semibold">{summaryStats.failed || 0}</span> failed</span>
                    <span><span className="font-semibold">{summaryStats.paused || 0}</span> paused</span>
                    {estimatedTimeRemaining && <span className="font-mono text-sky-400">{estimatedTimeRemaining}</span>}
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[450px] pr-4 -mr-4">
                    <Reorder.Group axis="y" values={tasks} onReorder={handleReorder} className="space-y-2">
                        <AnimatePresence>
                            {tasks.map((task) => (
                                <TaskItem key={task.id} task={task} isProcessing={isProcessing} onPause={onPause} onResume={onResume} onRetry={onRetry} onCancel={onCancel} />
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}