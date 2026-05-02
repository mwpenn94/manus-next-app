import { useState, useCallback, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  Power,
  Activity,
  Clock,
  Zap,
  Shield,
  Settings,
  Bell,
  Eye,
  Pause,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveTask {
  id: string;
  name: string;
  status: "running" | "paused" | "queued" | "completed";
  progress: number;
  startedAt: string;
  estimatedCompletion: string;
}

interface SystemMetric {
  label: string;
  value: string;
  status: "normal" | "warning" | "critical";
}

const MOCK_TASKS: ActiveTask[] = [
  { id: "t1", name: "Background Research: AI Agent Architectures", status: "running", progress: 67, startedAt: "10 min ago", estimatedCompletion: "5 min" },
  { id: "t2", name: "Data Pipeline Monitoring", status: "running", progress: 100, startedAt: "2 hours ago", estimatedCompletion: "continuous" },
  { id: "t3", name: "Scheduled Report Generation", status: "queued", progress: 0, startedAt: "-", estimatedCompletion: "in 30 min" },
  { id: "t4", name: "Model Performance Evaluation", status: "paused", progress: 45, startedAt: "1 hour ago", estimatedCompletion: "paused" },
];

const MOCK_METRICS: SystemMetric[] = [
  { label: "CPU Usage", value: "34%", status: "normal" },
  { label: "Memory", value: "2.1 GB", status: "normal" },
  { label: "Active Connections", value: "12", status: "normal" },
  { label: "Queue Depth", value: "3", status: "warning" },
];

interface CASMConfig {
  autoResume: boolean;
  maxConcurrentTasks: number;
  idleTimeout: number;
  notifications: boolean;
  resourceLimit: number;
}

export default function ContinuousActiveSelfMode(): React.JSX.Element {
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();

  const [isActive, setIsActive] = useState(true);
  const [tasks, setTasks] = useState<ActiveTask[]>(MOCK_TASKS);
  const [uptime, setUptime] = useState(7243);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<CASMConfig>({
    autoResume: true,
    maxConcurrentTasks: 4,
    idleTimeout: 300,
    notifications: true,
    resourceLimit: 80,
  });

  // Load persisted config
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.casmConfig;
    if (saved) {
      setConfig((prev) => ({ ...prev, ...saved }));
    }
    const savedActive = (prefs?.generalSettings as any)?.casmActive;
    if (savedActive !== undefined) setIsActive(savedActive);
  }, [prefs]);

  // Persist config changes
  const persistConfig = useCallback((newConfig: CASMConfig) => {
    const current = (prefs?.generalSettings ?? {}) as Record<string, unknown>;
    savePrefsMut.mutate({ generalSettings: { ...current, casmConfig: newConfig } });
  }, [prefs, savePrefsMut]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setUptime((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const handleToggleActive = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const handleTaskAction = useCallback((taskId: string, action: "pause" | "resume" | "cancel") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        switch (action) {
          case "pause":
            return { ...t, status: "paused" as const };
          case "resume":
            return { ...t, status: "running" as const };
          case "cancel":
            return { ...t, status: "completed" as const, progress: 0 };
          default:
            return t;
        }
      })
    );
  }, []);

  const runningCount = tasks.filter((t) => t.status === "running").length;
  const queuedCount = tasks.filter((t) => t.status === "queued").length;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-4 border-b transition-colors",
        isActive ? "bg-green-500/5 border-green-500/20" : "bg-card/50 border-border"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
            isActive ? "bg-green-500/10" : "bg-muted"
          )}>
            <Power className={cn("w-5 h-5", isActive ? "text-green-500" : "text-muted-foreground")} />
          </div>
          <div>
            <h2 className="text-base font-semibold">Continuous Active Self Mode</h2>
            <p className="text-xs text-muted-foreground">
              {isActive ? "Agent is running autonomously in background" : "Agent background operations paused"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleToggleActive}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors",
              isActive ? "bg-green-500" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                isActive ? "translate-x-6" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b border-border bg-card/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Timer className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Uptime</span>
          </div>
          <p className="text-xs font-mono font-medium">{formatUptime(uptime)}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Activity className="w-3 h-3 text-green-500" />
            <span className="text-[10px] text-muted-foreground">Running</span>
          </div>
          <p className="text-xs font-medium">{runningCount}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-muted-foreground">Queued</span>
          </div>
          <p className="text-xs font-medium">{queuedCount}</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">Efficiency</span>
          </div>
          <p className="text-xs font-medium">92%</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Config Panel */}
        {showConfig && (
          <div className="px-5 py-4 border-b border-border bg-card/50">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              Configuration
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs">Auto-resume on reconnect</span>
                </div>
                <button
                  onClick={() => { const newConfig = { ...config, autoResume: !config.autoResume }; setConfig(newConfig); persistConfig(newConfig); }}
                  className={cn(
                    "relative w-8 h-4 rounded-full transition-colors",
                    config.autoResume ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                    config.autoResume ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs">Notifications</span>
                </div>
                <button
                  onClick={() => { const newConfig = { ...config, notifications: !config.notifications }; setConfig(newConfig); persistConfig(newConfig); }}
                  className={cn(
                    "relative w-8 h-4 rounded-full transition-colors",
                    config.notifications ? "bg-primary" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform",
                    config.notifications ? "translate-x-4" : "translate-x-0.5"
                  )} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground" />
                  Max concurrent tasks
                </span>
                <span className="text-xs font-medium">{config.maxConcurrentTasks}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                  Resource limit
                </span>
                <span className="text-xs font-medium">{config.resourceLimit}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Tasks */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            Active Tasks
          </h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div key={task.id} className={cn(
                "p-3 rounded-lg border",
                task.status === "running" && "bg-card border-green-500/20",
                task.status === "paused" && "bg-muted/30 border-border",
                task.status === "queued" && "bg-card border-amber-500/20",
                task.status === "completed" && "bg-muted/20 border-border/50"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {task.status === "running" && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                    {task.status === "paused" && <Pause className="w-3.5 h-3.5 text-muted-foreground" />}
                    {task.status === "queued" && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                    {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    <span className="text-sm font-medium">{task.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status === "running" && (
                      <button
                        onClick={() => handleTaskAction(task.id, "pause")}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Pause"
                      >
                        <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {task.status === "paused" && (
                      <button
                        onClick={() => handleTaskAction(task.id, "resume")}
                        className="p-1 rounded hover:bg-accent transition-colors"
                        title="Resume"
                      >
                        <Play className="w-3.5 h-3.5 text-green-500" />
                      </button>
                    )}
                  </div>
                </div>
                {task.status !== "completed" && (
                  <>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          task.status === "running" && "bg-green-500",
                          task.status === "paused" && "bg-muted-foreground",
                          task.status === "queued" && "bg-amber-500"
                        )}
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Started: {task.startedAt}</span>
                      <span>ETA: {task.estimatedCompletion}</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Metrics */}
        <div className="px-5 py-4">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            System Resources
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {MOCK_METRICS.map((metric) => (
              <div key={metric.label} className={cn(
                "p-3 rounded-lg border",
                metric.status === "normal" && "bg-card border-border",
                metric.status === "warning" && "bg-amber-500/5 border-amber-500/20",
                metric.status === "critical" && "bg-red-500/5 border-red-500/20"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{metric.label}</span>
                  {metric.status === "warning" && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  {metric.status === "critical" && <AlertTriangle className="w-3 h-3 text-red-500" />}
                </div>
                <p className="text-sm font-semibold mt-1">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
