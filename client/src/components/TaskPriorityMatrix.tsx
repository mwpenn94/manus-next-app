import React, { useMemo, useRef, useState } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Zap, Calendar, User, Trash2, Info } from 'lucide-react'

type Task = {
  id: string;
  title: string;
  urgency: number;
  importance: number;
  status: 'pending' | 'active' | 'done';
};

interface TaskPriorityMatrixProps {
  tasks: Task[];
  onMoveTask: (taskId: string, urgency: number, importance: number) => void;
  onSelectTask: (taskId: string) => void;
  selectedTaskId?: string;
}

const QUADRANT_DEFINITIONS = {
  DO_FIRST: { 
    title: 'Do First',
    urgency: 7.5, 
    importance: 7.5,
    color: 'border-red-500/50 bg-red-500/10',
    textColor: 'text-red-400',
    Icon: Zap
  },
  SCHEDULE: { 
    title: 'Schedule',
    urgency: 2.5, 
    importance: 7.5,
    color: 'border-blue-500/50 bg-blue-500/10',
    textColor: 'text-blue-400',
    Icon: Calendar
  },
  DELEGATE: { 
    title: 'Delegate',
    urgency: 7.5, 
    importance: 2.5,
    color: 'border-yellow-500/50 bg-yellow-500/10',
    textColor: 'text-yellow-400',
    Icon: User
  },
  ELIMINATE: { 
    title: 'Eliminate',
    urgency: 2.5, 
    importance: 2.5,
    color: 'border-gray-500/50 bg-gray-500/10',
    textColor: 'text-gray-400',
    Icon: Trash2
  },
};

type QuadrantKey = keyof typeof QUADRANT_DEFINITIONS;

const getQuadrant = (urgency: number, importance: number): QuadrantKey => {
  if (importance >= 5 && urgency >= 5) return 'DO_FIRST';
  if (importance >= 5 && urgency < 5) return 'SCHEDULE';
  if (importance < 5 && urgency >= 5) return 'DELEGATE';
  return 'ELIMINATE';
};

const TaskDot: React.FC<{ 
  task: Task;
  onSelectTask: (id: string) => void;
  onDragEnd: (id: string, info: PanInfo) => void;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ task, onSelectTask, onDragEnd, isSelected, containerRef }) => {
  const statusClasses = {
    pending: 'bg-muted-foreground/50 border-muted-foreground/80',
    active: 'bg-blue-500/80 border-blue-400',
    done: 'bg-green-500/80 border-green-400',
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            drag
            dragConstraints={containerRef}
            dragElastic={0.1}
            dragMomentum={false}
            onDragEnd={(_, info) => onDragEnd(task.id, info)}
            onClick={() => onSelectTask(task.id)}
            className={cn(
              'absolute w-6 h-6 rounded-full cursor-pointer border-2 flex items-center justify-center transition-all duration-300',
              statusClasses[task.status],
              isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background' : 'hover:scale-110',
            )}
            style={{
              left: `calc(${task.urgency * 10}% - 12px)`,
              bottom: `calc(${task.importance * 10}% - 12px)`,
            }}
            whileTap={{ scale: 1.2, zIndex: 50 }}
            aria-label={`Task ${task.title}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{task.title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const Quadrant: React.FC<{ 
  quadrantKey: QuadrantKey;
  tasks: Task[];
}> = ({ quadrantKey, tasks }) => {
  const { title, color, textColor, Icon } = QUADRANT_DEFINITIONS[quadrantKey];
  return (
    <div className={cn('relative p-4 border', color)}>
      <div className="flex items-center space-x-2">
        <Icon className={cn('w-5 h-5', textColor)} />
        <h3 className={cn('font-semibold', textColor)}>{title}</h3>
        <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
      </div>
    </div>
  );
};

export const TaskPriorityMatrix: React.FC<TaskPriorityMatrixProps> = ({ 
  tasks, 
  onMoveTask, 
  onSelectTask, 
  selectedTaskId 
}) => {
  const matrixRef = useRef<HTMLDivElement>(null);
  const quadrantRefs = {
    DO_FIRST: useRef<HTMLDivElement>(null),
    SCHEDULE: useRef<HTMLDivElement>(null),
    DELEGATE: useRef<HTMLDivElement>(null),
    ELIMINATE: useRef<HTMLDivElement>(null),
  };

  const [isDragging, setIsDragging] = useState(false);

  const categorizedTasks = useMemo(() => {
    const allQuadrants: Record<QuadrantKey, Task[]> = {
      DO_FIRST: [],
      SCHEDULE: [],
      DELEGATE: [],
      ELIMINATE: [],
    };
    tasks.forEach(task => {
      const quadrant = getQuadrant(task.urgency, task.importance);
      allQuadrants[quadrant].push(task);
    });
    return allQuadrants;
  }, [tasks]);

  const handleDragEnd = (taskId: string, info: PanInfo) => {
    if (!matrixRef.current) return;

    const matrixRect = matrixRef.current.getBoundingClientRect();
    const finalX = info.point.x - matrixRect.left;
    const finalY = info.point.y - matrixRect.top;

    const newUrgency = Math.max(0, Math.min(10, (finalX / matrixRect.width) * 10));
    const newImportance = Math.max(0, Math.min(10, 10 - (finalY / matrixRect.height) * 10));

    onMoveTask(taskId, newUrgency, newImportance);
    setIsDragging(false);
  };

  const Legend = () => (
    <div className="mt-4 p-4 bg-card border rounded-lg">
        <h4 className="font-semibold mb-2 flex items-center"><Info className="w-4 h-4 mr-2"/>Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {Object.entries(QUADRANT_DEFINITIONS).map(([key, { title, Icon, textColor }]) => (
                <div key={key} className="flex items-center space-x-2">
                    <Icon className={cn("w-4 h-4", textColor)} />
                    <span className={textColor}>{title}</span>
                </div>
            ))}
        </div>
        <div className="flex items-center space-x-4 text-sm mt-4 pt-4 border-t border-border">
            <span className="font-semibold">Status:</span>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-muted-foreground/50 mr-2"></div>Pending</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500/80 mr-2"></div>Active</div>
            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500/80 mr-2"></div>Done</div>
        </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Task Priority Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-12 gap-4 items-center mb-2">
            <div className="col-span-1"></div>
            <div className="col-span-11 text-center font-bold text-muted-foreground">Urgency</div>
        </div>
        <div className="flex">
            <div className="flex flex-col justify-between h-[500px] w-12 text-center -rotate-180 writing-mode-vertical-rl">
                <span className="font-bold text-muted-foreground">Importance</span>
            </div>
            <div ref={matrixRef} className="relative grid grid-cols-2 grid-rows-2 w-full h-[500px] border-2 border-border rounded-md overflow-hidden">
              <Quadrant quadrantKey="SCHEDULE" tasks={categorizedTasks.SCHEDULE} />
              <Quadrant quadrantKey="DO_FIRST" tasks={categorizedTasks.DO_FIRST} />
              <Quadrant quadrantKey="ELIMINATE" tasks={categorizedTasks.ELIMINATE} />
              <Quadrant quadrantKey="DELEGATE" tasks={categorizedTasks.DELEGATE} />
              
              {tasks.map(task => (
                <TaskDot 
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  onDragEnd={handleDragEnd}
                  isSelected={task.id === selectedTaskId}
                  containerRef={matrixRef}
                />
              ))}
            </div>
        </div>
        <Legend />
      </CardContent>
    </Card>
  );
};
