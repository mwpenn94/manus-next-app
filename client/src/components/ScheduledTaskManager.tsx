import { useState, useCallback } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Calendar,
  RotateCcw,
  Loader2,
  Timer,
  Zap,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ScheduledTaskManager(): React.JSX.Element {
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    name: "",
    prompt: "",
    scheduleType: "interval" as "cron" | "interval",
    cronExpression: "0 0 8 * * *",
    intervalSeconds: 86400,
    repeat: true,
  });

  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.schedule.list.useQuery();

  const createTask = trpc.schedule.create.useMutation({
    onSuccess: () => {
      utils.schedule.list.invalidate();
      setShowCreate(false);
      setNewTask({ name: "", prompt: "", scheduleType: "interval", cronExpression: "0 0 8 * * *", intervalSeconds: 86400, repeat: true });
    },
  });
  const toggleTask = trpc.schedule.toggle.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  });
  const deleteTask = trpc.schedule.delete.useMutation({
    onSuccess: () => utils.schedule.list.invalidate(),
  });

  const getStatusIcon = useCallback((task: typeof tasks[0]) => {
    if (task.lastStatus === "running") return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (task.lastStatus === "error") return <XCircle className="w-4 h-4 text-red-500" />;
    if (task.lastStatus === "success") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (!task.enabled) return <Pause className="w-4 h-4 text-muted-foreground" />;
    return <Clock className="w-4 h-4 text-primary" />;
  }, []);

  const formatInterval = (seconds: number | null): string => {
    if (!seconds) return "—";
    if (seconds < 3600) return `Every ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `Every ${Math.round(seconds / 3600)} hr`;
    return `Every ${Math.round(seconds / 86400)} day(s)`;
  };

  const activeCount = tasks.filter(t => t.enabled).length;
  const totalRuns = tasks.reduce((sum, t) => sum + (t.runCount ?? 0), 0);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Scheduled Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {tasks.length} tasks · {activeCount} active · {totalRuns} total runs
            </p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Scheduled Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Task name"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              />
              <textarea
                placeholder="Task prompt — describe what the agent should do each run..."
                value={newTask.prompt}
                onChange={(e) => setNewTask({ ...newTask, prompt: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground w-24">Schedule:</label>
                <select
                  value={newTask.scheduleType}
                  onChange={(e) => setNewTask({ ...newTask, scheduleType: e.target.value as "cron" | "interval" })}
                  className="px-3 py-2 rounded-md border border-border bg-background text-sm flex-1"
                >
                  <option value="interval">Interval</option>
                  <option value="cron">Cron Expression</option>
                </select>
              </div>
              {newTask.scheduleType === "interval" ? (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-24">Every:</label>
                  <select
                    value={newTask.intervalSeconds}
                    onChange={(e) => setNewTask({ ...newTask, intervalSeconds: Number(e.target.value) })}
                    className="px-3 py-2 rounded-md border border-border bg-background text-sm flex-1"
                  >
                    <option value={300}>5 minutes</option>
                    <option value={900}>15 minutes</option>
                    <option value={3600}>1 hour</option>
                    <option value={21600}>6 hours</option>
                    <option value={43200}>12 hours</option>
                    <option value={86400}>1 day</option>
                    <option value={604800}>1 week</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground w-24">Cron:</label>
                  <Input
                    placeholder="0 0 8 * * *"
                    value={newTask.cronExpression}
                    onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                    className="font-mono text-xs"
                  />
                </div>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground w-24">Repeat:</label>
                <button
                  onClick={() => setNewTask({ ...newTask, repeat: !newTask.repeat })}
                  className={cn(
                    "w-10 h-5 rounded-full transition-colors relative",
                    newTask.repeat ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all",
                    newTask.repeat ? "left-5" : "left-0.5"
                  )} />
                </button>
                <span className="text-xs text-muted-foreground">{newTask.repeat ? "Repeating" : "One-time"}</span>
              </div>
              <Button
                onClick={() => createTask.mutate({
                  name: newTask.name,
                  prompt: newTask.prompt,
                  scheduleType: newTask.scheduleType,
                  cronExpression: newTask.scheduleType === "cron" ? newTask.cronExpression : undefined,
                  intervalSeconds: newTask.scheduleType === "interval" ? newTask.intervalSeconds : undefined,
                  repeat: newTask.repeat,
                })}
                className="w-full"
                disabled={!newTask.name.trim() || !newTask.prompt.trim() || createTask.isPending}
              >
                {createTask.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No scheduled tasks yet.</p>
            <p className="text-xs mt-1">Create a task to automate recurring agent work.</p>
          </div>
        )}

        {!isLoading && tasks.length > 0 && (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className={cn(
                "p-4 rounded-lg border transition-all",
                task.enabled ? "bg-card border-border hover:border-primary/20" : "bg-muted/30 border-border/50"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {getStatusIcon(task)}
                    <div>
                      <h4 className={cn("text-sm font-medium", !task.enabled && "text-muted-foreground")}>{task.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        {task.scheduleType === "cron" ? task.cronExpression : formatInterval(task.intervalSeconds)}
                        {!task.repeat && " · one-time"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleTask.mutate({ id: task.id })}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        task.enabled
                          ? "text-amber-500 hover:bg-amber-500/10"
                          : "text-green-500 hover:bg-green-500/10"
                      )}
                      title={task.enabled ? "Pause" : "Resume"}
                    >
                      {task.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteTask.mutate({ id: task.id })}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{task.prompt}</p>

                <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    {task.runCount ?? 0} runs
                  </span>
                  {task.lastRunAt && (
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" />
                      Last: {new Date(task.lastRunAt).toLocaleString()}
                    </span>
                  )}
                  {task.nextRunAt && task.enabled && (
                    <span className="flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" />
                      Next: {new Date(task.nextRunAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
