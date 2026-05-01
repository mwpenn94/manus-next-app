
/**
 * TaskDependencyMiniGraph.tsx
 * 
 * A compact React component to display a mini directed acyclic graph (DAG) of task relationships.
 * It renders a vertical list of tasks, showing their status, title, and dependency connections.
 * Designed for sidebars and compact UI spaces, it highlights the current task and limits the display
 * to a specified maximum number of tasks, showing an overflow count if necessary.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
type TaskStatus = 'pending' | 'running' | 'done' | 'error';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  dependsOn?: string[];
}

interface TaskDependencyMiniGraphProps {
  tasks: Task[];
  currentTaskId: string;
  className?: string;
  maxTasks?: number;
}

// --- HELPER COMPONENTS ---

const StatusIcon = ({ status }: { status: TaskStatus }) => {
  const iconProps = { className: 'w-3.5 h-3.5 flex-shrink-0' };
  switch (status) {
    case 'done':
      return <CheckCircle2 {...iconProps} className={cn(iconProps.className, 'text-green-500')} />;
    case 'error':
      return <XCircle {...iconProps} className={cn(iconProps.className, 'text-red-500')} />;
    case 'running':
      return <Loader {...iconProps} className={cn(iconProps.className, 'animate-spin text-blue-500')} />;
    case 'pending':
    default:
      return <Circle {...iconProps} className={cn(iconProps.className, 'text-muted-foreground/50')} />;
  }
};

// --- MAIN COMPONENT ---

const TaskDependencyMiniGraph: React.FC<TaskDependencyMiniGraphProps> = ({ 
  tasks, 
  currentTaskId, 
  className, 
  maxTasks = 5 
}) => {
  const taskMap = React.useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const getRenderOrder = React.useCallback(() => {
    const currentTask = taskMap.get(currentTaskId);
    if (!currentTask) return [];

    const ancestors = new Set<string>();
    const queue = [...(currentTask.dependsOn || [])];
    while(queue.length > 0) {
        const depId = queue.shift()!;
        if (!ancestors.has(depId)) {
            ancestors.add(depId);
            const depTask = taskMap.get(depId);
            if (depTask?.dependsOn) {
                queue.push(...depTask.dependsOn);
            }
        }
    }
    
    const sortedAncestors = Array.from(ancestors).sort((a, b) => tasks.findIndex(t => t.id === a) - tasks.findIndex(t => t.id === b));
    const displayTasks = [...sortedAncestors, currentTaskId];
    
    // For simplicity, we are not showing descendants in this compact view
    // but focusing on the current task and its prerequisites.

    return tasks.filter(t => displayTasks.includes(t.id));

  }, [tasks, currentTaskId, taskMap]);

  const visibleTasks = getRenderOrder();
  const overflowCount = Math.max(0, visibleTasks.length - maxTasks);
  const displayTasks = overflowCount > 0 ? visibleTasks.slice(0, maxTasks) : visibleTasks;

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className={cn('text-sm font-mono bg-card p-3 rounded-lg border border-border', className)}>
      <div className="-ml-3">
        {displayTasks.map((task, index) => {
          const isCurrent = task.id === currentTaskId;
          const hasDependencyInList = task.dependsOn?.some(depId => visibleTasks.slice(0, index).some(t => t.id === depId)) ?? false;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex items-center space-x-2 py-1 pl-3 whitespace-nowrap',
                isCurrent && 'bg-primary/10 rounded-r-md',
                hasDependencyInList && 'border-l-2 border-border ml-3 pl-2',
              )}
            >
              <StatusIcon status={task.status} />
              <span className={cn('truncate', isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {task.title}
              </span>
            </motion.div>
          );
        })}
      </div>
      {overflowCount > 0 && (
        <div className="pt-2 text-xs text-muted-foreground/80">+ {overflowCount} more</div>
      )}
    </div>
  );
};

export default TaskDependencyMiniGraph;
