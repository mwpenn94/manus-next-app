import { useState, useMemo, useCallback } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Edit3,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  RotateCcw,
  ChevronRight,
  Loader2,
  Timer,
  Zap,
  BarChart3,
  History,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TaskFrequency = "once" | "hourly" | "daily" | "weekly" | "monthly" | "custom";
type TaskStatus = "active" | "paused" | "completed" | "failed";

interface ScheduledTask {
  id: string;
  name: string;
  description: string;
  prompt: string;
  frequency: TaskFrequency;
  cronExpression?: string;
  status: TaskStatus;
  nextRun: string;
  lastRun?: string;
  lastStatus?: "success" | "failure";
  runCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  avgDuration: string;
}

const MOCK_TASKS: ScheduledTask[] = [
  {
    id: "st1",
    name: "Daily News Digest",
    description: "Compile top AI and tech news into a formatted digest",
    prompt: "Search for the top 10 AI and technology news stories from today. Compile them into a formatted digest with summaries and source links.",
    frequency: "daily",
    cronExpression: "0 0 8 * * *",
    status: "active",
    nextRun: "Tomorrow 8:00 AM",
    lastRun: "Today 8:00 AM",
    lastStatus: "success",
    runCount: 14,
    successCount: 13,
    failureCount: 1,
    createdAt: "2 weeks ago",
    avgDuration: "3m 24s",
  },
  {
    id: "st2",
    name: "Weekly Analytics Report",
    description: "Generate analytics report with charts and insights",
    prompt: "Pull this week's analytics data, generate charts for key metrics (traffic, conversions, revenue), and create a summary report with actionable insights.",
    frequency: "weekly",
    cronExpression: "0 0 9 * * 1",
    status: "active",
    nextRun: "Monday 9:00 AM",
    lastRun: "Last Monday",
    lastStatus: "success",
    runCount: 4,
    successCount: 4,
    failureCount: 0,
    createdAt: "1 month ago",
    avgDuration: "8m 12s",
  },
  {
    id: "st3",
    name: "Database Backup Check",
    description: "Verify database backups are running and report status",
    prompt: "Check the database backup status, verify the latest backup integrity, and send a notification if any issues are found.",
    frequency: "hourly",
    cronExpression: "0 0 * * * *",
    status: "active",
    nextRun: "In 42 minutes",
    lastRun: "18 min ago",
    lastStatus: "success",
    runCount: 168,
    successCount: 165,
    failureCount: 3,
    createdAt: "1 week ago",
    avgDuration: "45s",
  },
  {
    id: "st4",
    name: "Competitor Price Monitor",
    description: "Track competitor pricing changes and alert on significant differences",
    prompt: "Visit competitor websites, extract current pricing for our key product categories, compare with our prices, and alert if any competitor is more than 10% cheaper.",
    frequency: "daily",
    cronExpression: "0 0 6 * * *",
    status: "paused",
    nextRun: "Paused",
    lastRun: "3 days ago",
    lastStatus: "failure",
    runCount: 7,
    successCount: 5,
    failureCount: 2,
    createdAt: "10 days ago",
    avgDuration: "5m 30s",
  },
  {
    id: "st5",
    name: "Monthly Content Refresh",
    description: "Update blog posts with latest data and refresh SEO metadata",
    prompt: "Review the top 5 blog posts by traffic, update any outdated statistics or information, refresh meta descriptions, and generate new social media snippets.",
    frequency: "monthly",
    cronExpression: "0 0 10 1 * *",
    status: "active",
    nextRun: "Jun 1, 10:00 AM",
    lastRun: "May 1",
    lastStatus: "success",
    runCount: 2,
    successCount: 2,
    failureCount: 0,
    createdAt: "2 months ago",
    avgDuration: "12m 45s",
  },
];

function getFrequencyLabel(freq: TaskFrequency): string {
  switch (freq) {
    case "once": return "One-time";
    case "hourly": return "Every hour";
    case "daily": return "Every day";
    case "weekly": return "Every week";
    case "monthly": return "Every month";
    case "custom": return "Custom";
  }
}

function getStatusBadge(status: TaskStatus): React.JSX.Element {
  switch (status) {
    case "active":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500"><CheckCircle2 className="w-2.5 h-2.5" />Active</span>;
    case "paused":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500"><Pause className="w-2.5 h-2.5" />Paused</span>;
    case "completed":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500"><CheckCircle2 className="w-2.5 h-2.5" />Completed</span>;
    case "failed":
      return <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500"><XCircle className="w-2.5 h-2.5" />Failed</span>;
  }
}

export default function ScheduledTaskManager(): React.JSX.Element {
  const [tasks, setTasks] = useState<ScheduledTask[]>(MOCK_TASKS);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const filteredTasks = useMemo(() => {
    if (statusFilter === "all") return tasks;
    return tasks.filter((t) => t.status === statusFilter);
  }, [tasks, statusFilter]);

  const selected = tasks.find((t) => t.id === selectedTask);

  const handleToggleStatus = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, status: t.status === "active" ? "paused" as TaskStatus : "active" as TaskStatus };
      })
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask === id) setSelectedTask(null);
  }, [selectedTask]);

  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((t) => t.status === "active").length,
    totalRuns: tasks.reduce((s, t) => s + t.runCount, 0),
    successRate: tasks.reduce((s, t) => s + t.successCount, 0) / Math.max(1, tasks.reduce((s, t) => s + t.runCount, 0)) * 100,
  }), [tasks]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Timer className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Scheduled Tasks</h2>
            <p className="text-xs text-muted-foreground">
              {stats.active} active, {stats.totalRuns} total runs ({Math.round(stats.successRate)}% success)
            </p>
          </div>
        </div>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        {(["all", "active", "paused", "completed", "failed"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-2.5 py-1.5 text-[10px] rounded-lg transition-colors capitalize",
              statusFilter === status ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Task List */}
        <div className={cn("overflow-y-auto", selected ? "w-80 border-r border-border" : "flex-1")}>
          {filteredTasks.map((task) => (
            <button
              key={task.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                selectedTask === task.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedTask(task.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{task.name}</span>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{task.description}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {getFrequencyLabel(task.frequency)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" />
                      Next: {task.nextRun}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold">{selected.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{selected.description}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStatus(selected.id)}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    selected.status === "active" ? "hover:bg-amber-500/10 text-amber-500" : "hover:bg-green-500/10 text-green-500"
                  )}
                  title={selected.status === "active" ? "Pause" : "Resume"}
                >
                  {selected.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors" title="Run now">
                  <Zap className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">Total Runs</span>
                <span className="text-lg font-bold">{selected.runCount}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">Success</span>
                <span className="text-lg font-bold text-green-500">{selected.successCount}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">Failures</span>
                <span className="text-lg font-bold text-red-500">{selected.failureCount}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] text-muted-foreground block">Avg Duration</span>
                <span className="text-lg font-bold">{selected.avgDuration}</span>
              </div>
            </div>

            {/* Schedule */}
            <div className="mb-5">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                Schedule
              </h4>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Frequency</span>
                  <span className="text-xs font-medium">{getFrequencyLabel(selected.frequency)}</span>
                </div>
                {selected.cronExpression && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Cron Expression</span>
                    <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{selected.cronExpression}</code>
                  </div>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Next Run</span>
                  <span className="text-xs font-medium">{selected.nextRun}</span>
                </div>
                {selected.lastRun && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Last Run</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{selected.lastRun}</span>
                      {selected.lastStatus === "success" ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                Task Prompt
              </h4>
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground leading-relaxed">
                {selected.prompt}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
