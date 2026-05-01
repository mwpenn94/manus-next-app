import React, { useState, useMemo } from 'react';
import { Reorder, useMotionValue } from 'framer-motion';
import { GripVertical, Play, Pause, X, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// --- TYPES ---
type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status = 'queued' | 'running' | 'paused' | 'completed';

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  estimatedDuration: number; // in seconds
  addedAt: number; // timestamp
  assignee?: string;
}

interface TaskQueueManagerProps {
  tasks: Task[];
  onReorder: (taskIds: string[]) => void;
  onPause: (taskId: string) => void;
  onResume: (taskId: string) => void;
  onCancel: (taskId: string) => void;
  onPriorityChange: (taskId: string, priority: Priority) => void;
}

// --- HELPERS ---
const priorityConfig: Record<Priority, { color: string; label: string }> = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  high: { color: 'bg-orange-500', label: 'High' },
  medium: { color: 'bg-yellow-500', label: 'Medium' },
  low: { color: 'bg-gray-500', label: 'Low' },
};

const statusConfig: Record<Status, { color: string; label: string }> = {
  queued: { color: 'bg-blue-500', label: 'Queued' },
  running: { color: 'bg-green-500', label: 'Running' },
  paused: { color: 'bg-yellow-600', label: 'Paused' },
  completed: { color: 'bg-gray-700', label: 'Completed' },
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

// --- SUB-COMPONENTS ---
const TaskItem = ({ task, isDragging, onPause, onResume, onCancel, onPriorityChange }: { task: Task; isDragging: boolean; onPause: (id: string) => void; onResume: (id: string) => void; onCancel: (id: string) => void; onPriorityChange: (id: string, p: Priority) => void; }) => {
  const y = useMotionValue(0);

  return (
    <Reorder.Item
      value={task}
      id={task.id}
      style={{ y }}
      className={cn(
        'flex items-center p-3 bg-card border-b border-border last:border-b-0',
        task.status === 'running' && 'bg-primary/10 border-l-4 border-l-primary',
        isDragging && 'shadow-lg'
      )}
    >
      <div className="cursor-grab touch-none mr-3">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-grow flex items-center gap-4">
        <div className={cn('w-2 h-10 rounded-full', priorityConfig[task.priority].color)} />
        <div className="flex-1">
          <p className="font-medium text-foreground">{task.title}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className={cn('border-none text-white', statusConfig[task.status].color)}>{statusConfig[task.status].label}</Badge>
            <span>{formatDuration(task.estimatedDuration)}</span>
            {task.assignee && <span>· {task.assignee}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        {task.status === 'running' && <Button variant="ghost" size="icon" onClick={() => onPause(task.id)}><Pause className="h-4 w-4" /></Button>}
        {task.status === 'paused' && <Button variant="ghost" size="icon" onClick={() => onResume(task.id)}><Play className="h-4 w-4" /></Button>}
        {task.status !== 'completed' && <Button variant="ghost" size="icon" onClick={() => onCancel(task.id)}><X className="h-4 w-4" /></Button>}
        <Select value={task.priority} onValueChange={(p: string) => onPriorityChange(task.id, p as Priority)}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(priorityConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Reorder.Item>
  );
};

// --- MAIN COMPONENT ---
export const TaskQueueManager = ({
  tasks: initialTasks,
  onReorder,
  onPause,
  onResume,
  onCancel,
  onPriorityChange,
}: TaskQueueManagerProps) => {
  const [tasks, setTasks] = useState(initialTasks);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(true);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }
    const runningTask = filtered.find(t => t.status === 'running');
    const otherTasks = filtered.filter(t => t.status !== 'running');
    return runningTask ? [runningTask, ...otherTasks] : otherTasks;
  }, [tasks, priorityFilter, statusFilter]);

  const handleReorder = (newOrder: Task[]) => {
    setTasks(newOrder);
    onReorder(newOrder.map(t => t.id));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-background">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Task Queue</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={priorityFilter} onValueChange={v => setPriorityFilter(v as Priority | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {Object.entries(priorityConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as Status | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="p-0">
          <Reorder.Group axis="y" values={filteredTasks} onReorder={handleReorder} className="overflow-hidden rounded-b-lg">
            {filteredTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                isDragging={draggingTaskId === task.id}
                onPause={onPause}
                onResume={onResume}
                onCancel={onCancel}
                onPriorityChange={onPriorityChange}
              />
            ))}
          </Reorder.Group>
        </CardContent>
      )}
    </Card>
  );
};
