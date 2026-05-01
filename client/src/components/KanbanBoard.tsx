"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GripVertical, Flag, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// --- TYPES ---
type Priority = "Low" | "Medium" | "High";
type ColumnId = "backlog" | "in-progress" | "review" | "done";

interface Assignee {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Task {
  id: string;
  title: string;
  priority: Priority;
  column: ColumnId;
  assignees: Assignee[];
}

interface Column {
  id: ColumnId;
  title: string;
  wipLimit?: number;
}

// --- MOCK DATA ---
const MOCK_ASSIGNEES: Assignee[] = [
  { id: "user-1", name: "Alex Johnson", avatarUrl: "/avatars/01.png" },
  { id: "user-2", name: "Maria Garcia", avatarUrl: "/avatars/02.png" },
  { id: "user-3", name: "James Smith", avatarUrl: "/avatars/03.png" },
];

const MOCK_TASKS: Task[] = [
  { id: "task-1", title: "Implement user authentication", priority: "High", column: "in-progress", assignees: [MOCK_ASSIGNEES[0]] },
  { id: "task-2", title: "Design landing page", priority: "Medium", column: "backlog", assignees: [MOCK_ASSIGNEES[1]] },
  { id: "task-3", title: "Fix API rate limiting bug", priority: "High", column: "in-progress", assignees: [MOCK_ASSIGNEES[2]] },
  { id: "task-4", title: "Write documentation for API", priority: "Low", column: "review", assignees: [MOCK_ASSIGNEES[0]] },
  { id: "task-5", title: "Deploy to staging environment", priority: "Medium", column: "done", assignees: [MOCK_ASSIGNEES[1]] },
  { id: "task-6", title: "Refactor database schema", priority: "High", column: "backlog", assignees: [MOCK_ASSIGNEES[2]] },
  { id: "task-7", title: "Add e2e tests for checkout flow", priority: "Medium", column: "in-progress", assignees: [MOCK_ASSIGNEES[0], MOCK_ASSIGNEES[2]] },
  { id: "task-8", title: "Review marketing copy", priority: "Low", column: "review", assignees: [MOCK_ASSIGNEES[1]] },
];

const COLUMNS: Column[] = [
  { id: "backlog", title: "Backlog" },
  { id: "in-progress", title: "In Progress", wipLimit: 3 },
  { id: "review", title: "Review", wipLimit: 2 },
  { id: "done", title: "Done" },
];

const PRIORITY_STYLES: { [key in Priority]: string } = {
  Low: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  High: "bg-red-500/20 text-red-400 border-red-500/30",
};

// --- SUBCOMPONENTS ---
const TaskCard = ({ task, handleDragStart }: { task: Task; handleDragStart: (e: React.PointerEvent<HTMLDivElement>, task: Task) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.2 }}
    draggable={true}
    onPointerDown={(e) => handleDragStart(e, task)}
    className="bg-card p-3 rounded-lg border border-border cursor-grab active:cursor-grabbing"
    aria-label={`Task: ${task.title}`}
  >
    <div className="flex justify-between items-start">
      <p className="text-sm font-medium text-foreground pr-2">{task.title}</p>
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex items-center justify-between mt-2">
      <Badge className={cn("text-xs", PRIORITY_STYLES[task.priority])}>
        <Flag className="h-3 w-3 mr-1.5" />
        {task.priority}
      </Badge>
      <div className="flex -space-x-2">
        {task.assignees.map((assignee) => (
          <div key={assignee.id} className="w-6 h-6 rounded-full border-2 border-background flex items-center justify-center bg-muted-foreground/50" title={assignee.name}>
            <UserCircle className="h-5 w-5 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

const KanbanColumn = ({ column, tasks, setDraggedTask, setTasks }: {
  column: Column;
  tasks: Task[];
  setDraggedTask: (task: Task) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const wipExceeded = column.wipLimit !== undefined && tasks.length > column.wipLimit;

  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const draggedTask = JSON.parse(e.dataTransfer.getData("text/plain"));
    if (draggedTask.column !== column.id) {
      setTasks(prev => prev.map(t => t.id === draggedTask!.id ? { ...t, column: column.id } : t));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex-1 flex flex-col bg-background/50 rounded-xl transition-colors",
        isDraggingOver && "bg-accent"
      )}
    >
      <div className="p-4 flex justify-between items-center border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{column.title}</h3>
          <span className={cn(
            "text-sm font-bold rounded-full px-2 py-0.5",
            wipExceeded ? "bg-red-500/20 text-red-400" : "bg-muted text-muted-foreground"
          )}>
            {tasks.length}
            {column.wipLimit && ` / ${column.wipLimit}`}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-2 space-y-2 flex-grow">
        <AnimatePresence>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} handleDragStart={handleDragStart} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const columnsData = useMemo(() => {
    return COLUMNS.map(col => ({
      ...col,
      tasks: tasks.filter(task => task.column === col.id),
    }));
  }, [tasks]);

  const handleDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggedTask) {
      const dropZone = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-column-id]");
      const newColumnId = dropZone?.getAttribute("data-column-id") as ColumnId | null;

      if (newColumnId && newColumnId !== draggedTask.column) {
        setTasks(prev => prev.map(t => t.id === draggedTask!.id ? { ...t, column: newColumnId } : t));
      }
    }
    setDraggedTask(null);
  };

  return (
    <div className="flex h-full w-full gap-6 p-4 bg-background text-foreground" onPointerUp={handleDragEnd}>
      {columnsData.map(col => (
        <div key={col.id} data-column-id={col.id} className="flex-1 flex flex-col">
          <KanbanColumn
            column={col}
            tasks={col.tasks}
            setDraggedTask={(task: Task) => {
              const el = document.getElementById(`task-${task.id}`);
              if (el) {
                const data = JSON.stringify(task);
                const event = new DragEvent("dragstart", { dataTransfer: new DataTransfer() });
                event.dataTransfer?.setData("text/plain", data);
                el.dispatchEvent(event);
                setDraggedTask(task);
              }
            }}
            setTasks={setTasks}
          />
        </div>
      ))}
      {draggedTask && (
        <motion.div
          style={{ 
            position: 'fixed', 
            pointerEvents: 'none', 
            top: 0, 
            left: 0, 
            zIndex: 1000
          }}
          initial={false}
          animate={{
            x: (draggedTask as any)._dragX,
            y: (draggedTask as any)._dragY,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="bg-card p-3 rounded-lg border border-border cursor-grabbing shadow-2xl"
        >
          <TaskCard task={draggedTask} handleDragStart={() => {}} />
        </motion.div>
      )}
    </div>
  );
}
