import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { User, Bot, Calendar, Filter, GripVertical } from 'lucide-react';

// Type Definitions
type Priority = 'critical' | 'high' | 'medium' | 'low';
type Status = 'todo' | 'in-progress' | 'done' | 'blocked';
type AssigneeType = 'human' | 'agent';

interface Assignee {
  id: string;
  name: string;
  type: AssigneeType;
  avatar: string;
}

interface Task {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  deadline: Date;
  assigneeId: string | null;
}

// Mock Data
const ASSIGNEES: Assignee[] = [
  { id: 'user-1', name: 'Alice', type: 'human', avatar: 'A' },
  { id: 'user-2', name: 'Bob', type: 'human', avatar: 'B' },
  { id: 'agent-1', name: 'Auto-Corrector', type: 'agent', avatar: 'AC' },
  { id: 'user-3', name: 'Charlie', type: 'human', avatar: 'C' },
  { id: 'agent-2', name: 'Synth-Designer', type: 'agent', avatar: 'SD' },
  { id: 'user-4', name: 'Diana', type: 'human', avatar: 'D' },
];

const TASKS: Task[] = [
  { id: 'task-1', title: 'Fix login bug', priority: 'critical', status: 'in-progress', deadline: new Date(Date.now() + 2 * 86400000), assigneeId: 'user-1' },
  { id: 'task-2', title: 'Design new dashboard', priority: 'high', status: 'todo', deadline: new Date(Date.now() + 5 * 86400000), assigneeId: 'agent-2' },
  { id: 'task-3', title: 'Update user documentation', priority: 'medium', status: 'todo', deadline: new Date(Date.now() + 10 * 86400000), assigneeId: 'user-2' },
  { id: 'task-4', title: 'Refactor API service', priority: 'high', status: 'blocked', deadline: new Date(Date.now() + 8 * 86400000), assigneeId: 'user-1' },
  { id: 'task-5', title: 'Write E2E tests', priority: 'medium', status: 'todo', deadline: new Date(Date.now() + 12 * 86400000), assigneeId: null },
  { id: 'task-6', title: 'Deploy to staging', priority: 'critical', status: 'done', deadline: new Date(Date.now() - 86400000), assigneeId: 'user-3' },
  { id: 'task-7', title: 'Analyze performance metrics', priority: 'low', status: 'in-progress', deadline: new Date(Date.now() + 15 * 86400000), assigneeId: 'agent-1' },
  { id: 'task-8', title: 'Create marketing assets', priority: 'high', status: 'todo', deadline: new Date(Date.now() + 6 * 86400000), assigneeId: 'agent-2' },
  { id: 'task-9', title: 'Onboard new team member', priority: 'medium', status: 'done', deadline: new Date(Date.now() - 2 * 86400000), assigneeId: 'user-4' },
  { id: 'task-10', title: 'Investigate memory leak', priority: 'critical', status: 'in-progress', deadline: new Date(Date.now() + 3 * 86400000), assigneeId: 'user-1' },
  { id: 'task-11', title: 'Plan Q3 roadmap', priority: 'high', status: 'todo', deadline: new Date(Date.now() + 20 * 86400000), assigneeId: 'user-2' },
  { id: 'task-12', title: 'Review code submissions', priority: 'medium', status: 'todo', deadline: new Date(Date.now() + 11 * 86400000), assigneeId: null },
];

const priorityConfig: Record<Priority, { color: string; label: string }> = {
  critical: { color: 'bg-red-500', label: 'Critical' },
  high: { color: 'bg-orange-400', label: 'High' },
  medium: { color: 'bg-yellow-400', label: 'Medium' },
  low: { color: 'bg-green-500', label: 'Low' },
};

const statusConfig: Record<Status, { label: string }> = {
  todo: { label: 'To Do' },
  'in-progress': { label: 'In Progress' },
  done: { label: 'Done' },
  blocked: { label: 'Blocked' },
};

function TaskCard({ task, onReassign, assignees }: { task: Task; onReassign: (taskId: string, assigneeId: string | null) => void; assignees: Assignee[] }) {
  const deadlineInDays = Math.ceil((task.deadline.getTime() - Date.now()) / 86400000);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full bg-card p-2.5 rounded-lg shadow-sm border border-border"
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-foreground leading-snug pr-2">{task.title}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('w-3 h-3 rounded-full flex-shrink-0 mt-1', priorityConfig[task.priority].color)} />
            </TooltipTrigger>
            <TooltipContent><p>{priorityConfig[task.priority].label} Priority</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', deadlineInDays <= 3 && deadlineInDays >= 0 ? 'text-red-400' : '')}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{deadlineInDays < 0 ? `Overdue ${Math.abs(deadlineInDays)}d` : `${deadlineInDays}d left`}</span>
        </div>
        <Badge variant="outline" className="px-1.5 py-0.5 text-xs font-normal">{statusConfig[task.status].label}</Badge>
      </div>
      <div className="mt-2">
        <Select value={task.assigneeId ?? 'unassigned'} onValueChange={(value: string) => onReassign(task.id, value === 'unassigned' ? null : value)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Assign..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {assignees.map((a: Assignee) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}

export default function TaskDelegationMatrix() {
  const [tasks, setTasks] = useState<Task[]>(TASKS);
  const [assignees] = useState<Assignee[]>(ASSIGNEES);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isBulkAssignOpen, setBulkAssignOpen] = useState<boolean>(false);

  const handleReassign = useCallback((taskId: string, assigneeId: string | null) => {
    setTasks((prev: Task[]) => prev.map((t: Task) => t.id === taskId ? { ...t, assigneeId } : t));
  }, []);

  const filteredTasks = useMemo(() => statusFilter === 'all' ? tasks : tasks.filter((t: Task) => t.status === statusFilter), [tasks, statusFilter]);
  const unassignedTasks = useMemo(() => filteredTasks.filter((t: Task) => t.assigneeId === null), [filteredTasks]);

  const workload = useMemo(() => {
    const load = new Map<string, number>(assignees.map((a: Assignee) => [a.id, 0]));
    tasks.forEach((t: Task) => {
      if (t.assigneeId) load.set(t.assigneeId, (load.get(t.assigneeId) || 0) + 1);
    });
    return load;
  }, [tasks, assignees]);

  const maxWorkload = useMemo(() => Math.max(1, ...Array.from(workload.values())), [workload]);

  return (
    <div className="w-full h-full bg-background text-foreground p-4 md:p-6 flex flex-col gap-4 font-sans">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Task Delegation Matrix</h1>
          <p className="text-muted-foreground">Reassign tasks using the dropdown, filter by status, or bulk assign.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(statusConfig).map(([key, { label }]: [string, { label: string }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setBulkAssignOpen(true)}>Bulk Assign</Button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 overflow-hidden">
        <div className="bg-muted/40 rounded-lg flex flex-col overflow-hidden border border-border">
          <div className="p-3 font-semibold border-b border-border text-foreground flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            Backlog ({unassignedTasks.length})
          </div>
          <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[150px]">
            <AnimatePresence>
              {unassignedTasks.map((task: Task) => <TaskCard key={task.id} task={task} onReassign={handleReassign} assignees={assignees} />)}
            </AnimatePresence>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${assignees.length}, minmax(220px, 1fr))` }}>
            {assignees.map((assignee: Assignee) => {
              const assigneeTasks = filteredTasks.filter((t: Task) => t.assigneeId === assignee.id);
              const currentLoad = workload.get(assignee.id) || 0;
              const loadPercentage = (currentLoad / maxWorkload) * 100;

              return (
                <div key={assignee.id} className="bg-card rounded-lg flex flex-col overflow-hidden border border-border">
                  <div className="p-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {assignee.type === 'human' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <span className="font-semibold text-foreground">{assignee.name}</span>
                      <Badge variant={assignee.type === 'human' ? 'secondary' : 'outline'} className="capitalize">{assignee.type}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <motion.div className="bg-primary h-2 rounded-full" style={{ width: `${loadPercentage}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{currentLoad} task(s)</p>
                  </div>
                  <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[150px]">
                    <AnimatePresence>
                      {assigneeTasks.map((task: Task) => <TaskCard key={task.id} task={task} onReassign={handleReassign} assignees={assignees} />)}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Dialog open={isBulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Tasks</DialogTitle>
            <DialogDescription>Assign all tasks of a specific status to a team member or agent.</DialogDescription>
          </DialogHeader>
          <BulkAssignForm tasks={tasks} assignees={assignees} onAssign={setTasks} onClose={() => setBulkAssignOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BulkAssignForm({ tasks, assignees, onAssign, onClose }: { tasks: Task[]; assignees: Assignee[]; onAssign: (tasks: Task[]) => void; onClose: () => void }) {
  const [statusToAssign, setStatusToAssign] = useState<Status>('todo');
  const [assigneeId, setAssigneeId] = useState<string>('');

  const handleBulkAssign = () => {
    if (!assigneeId) return;
    const newTasks = tasks.map((task: Task) => task.status === statusToAssign ? { ...task, assigneeId } : task);
    onAssign(newTasks);
    onClose();
  };

  return (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-sm">Status</label>
          <Select value={statusToAssign} onValueChange={(value: string) => setStatusToAssign(value as Status)}>
            <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusConfig).map(([key, { label }]: [string, { label: string }]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <label className="text-right text-sm">Assign To</label>
          <Select value={assigneeId} onValueChange={(value: string) => setAssigneeId(value)}>
            <SelectTrigger className="col-span-3"><SelectValue placeholder="Select an assignee" /></SelectTrigger>
            <SelectContent>
              {assignees.map((a: Assignee) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleBulkAssign} disabled={!assigneeId}>Assign Tasks</Button>
      </DialogFooter>
    </>
  );
}
