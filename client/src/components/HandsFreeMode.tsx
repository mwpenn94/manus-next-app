import { useState, useEffect, useCallback } from "react";
import {
  Zap,
  Shield,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Bell,
  BellOff,
  Clock,
  RotateCcw,
  Pause,
  Play,
  Loader2,
  Lock,
  Unlock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SafetyGuard {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  level: "critical" | "standard" | "optional";
}

interface AutoAction {
  id: string;
  label: string;
  description: string;
  allowed: boolean;
  category: "code" | "deploy" | "data" | "communication";
}

const DEFAULT_GUARDS: SafetyGuard[] = [
  { id: "g1", label: "Require confirmation for destructive actions", description: "Pause before deleting files, dropping tables, or reverting deployments", enabled: true, level: "critical" },
  { id: "g2", label: "Require confirmation for payments", description: "Always pause before initiating any financial transaction", enabled: true, level: "critical" },
  { id: "g3", label: "Require confirmation for external API calls", description: "Pause before calling third-party APIs that may have side effects", enabled: true, level: "standard" },
  { id: "g4", label: "Require confirmation for deployments", description: "Pause before deploying to production environments", enabled: true, level: "standard" },
  { id: "g5", label: "Notify on long-running operations", description: "Send notification when a task takes longer than 5 minutes", enabled: true, level: "optional" },
  { id: "g6", label: "Auto-checkpoint before risky changes", description: "Automatically save a checkpoint before making significant changes", enabled: true, level: "optional" },
];

const DEFAULT_ACTIONS: AutoAction[] = [
  { id: "a1", label: "Write and modify code files", description: "Create, edit, and refactor source code", allowed: true, category: "code" },
  { id: "a2", label: "Install dependencies", description: "Run package install commands", allowed: true, category: "code" },
  { id: "a3", label: "Run tests", description: "Execute test suites and linting", allowed: true, category: "code" },
  { id: "a4", label: "Deploy to staging", description: "Push changes to staging environment", allowed: true, category: "deploy" },
  { id: "a5", label: "Deploy to production", description: "Push changes to production", allowed: false, category: "deploy" },
  { id: "a6", label: "Run database migrations", description: "Apply schema changes to database", allowed: true, category: "data" },
  { id: "a7", label: "Modify database records", description: "Insert, update, or delete data", allowed: false, category: "data" },
  { id: "a8", label: "Send notifications", description: "Send emails or push notifications", allowed: false, category: "communication" },
  { id: "a9", label: "Post to external services", description: "Create posts on social media or forums", allowed: false, category: "communication" },
];

export default function HandsFreeMode(): React.JSX.Element {
  const [isEnabled, setIsEnabled] = useState(false);
  const [guards, setGuards] = useState<SafetyGuard[]>(DEFAULT_GUARDS);
  const [actions, setActions] = useState<AutoAction[]>(DEFAULT_ACTIONS);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuards, setShowGuards] = useState(true);
  const [showActions, setShowActions] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [actionsCompleted, setActionsCompleted] = useState(0);
  const [uptime, setUptime] = useState(0);

  // Simulate uptime counter
  useEffect(() => {
    if (!isEnabled || isPaused) return;
    const interval = setInterval(() => {
      setUptime((prev) => prev + 1);
      // Simulate occasional action completions
      if (Math.random() > 0.7) {
        setActionsCompleted((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isEnabled, isPaused]);

  const handleToggle = useCallback(() => {
    if (isEnabled) {
      setIsEnabled(false);
      setIsPaused(false);
      setUptime(0);
    } else {
      setIsEnabled(true);
    }
  }, [isEnabled]);

  const handleToggleGuard = useCallback((id: string) => {
    setGuards((prev) =>
      prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g))
    );
  }, []);

  const handleToggleAction = useCallback((id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, allowed: !a.allowed } : a))
    );
  }, []);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const criticalGuardsActive = guards.filter((g) => g.level === "critical" && g.enabled).length;
  const totalCritical = guards.filter((g) => g.level === "critical").length;

  return (
    <div className="flex flex-col bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Main Toggle */}
      <div className={cn(
        "px-5 py-5 border-b transition-colors",
        isEnabled ? "bg-primary/5 border-primary/20" : "bg-card/50 border-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
              isEnabled ? "bg-primary/10" : "bg-muted"
            )}>
              <Zap className={cn(
                "w-6 h-6 transition-colors",
                isEnabled ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                Hands-Free Mode
                {isEnabled && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 font-normal">
                    Active
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground">
                Let the agent work autonomously with configurable safety guardrails
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEnabled && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isPaused ? "bg-amber-500/10 text-amber-500" : "hover:bg-accent text-muted-foreground"
                )}
                title={isPaused ? "Resume" : "Pause"}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleToggle}
              className={cn(
                "relative w-14 h-7 rounded-full transition-colors",
                isEnabled ? "bg-primary" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform",
                isEnabled ? "translate-x-7" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        {isEnabled && (
          <div className="flex items-center gap-6 mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Uptime:</span>
              <span className="font-mono font-medium">{formatUptime(uptime)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-muted-foreground">Actions:</span>
              <span className="font-mono font-medium">{actionsCompleted}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-muted-foreground">Guards:</span>
              <span className="font-mono font-medium">{criticalGuardsActive}/{totalCritical} critical</span>
            </div>
            {isPaused && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500">
                <Pause className="w-3.5 h-3.5" />
                <span>Paused</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="flex-1 overflow-y-auto">
        {/* Safety Guards */}
        <div className="border-b border-border">
          <button
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors"
            onClick={() => setShowGuards(!showGuards)}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium">Safety Guardrails</span>
              <span className="text-[10px] text-muted-foreground">
                ({guards.filter((g) => g.enabled).length}/{guards.length} active)
              </span>
            </div>
            {showGuards ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showGuards && (
            <div className="px-5 pb-4 space-y-2">
              {guards.map((guard) => (
                <div
                  key={guard.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    guard.enabled ? "bg-card border-border" : "bg-muted/30 border-transparent"
                  )}
                >
                  <button
                    onClick={() => handleToggleGuard(guard.id)}
                    className={cn(
                      "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                      guard.enabled ? "bg-primary border-primary" : "border-muted-foreground/30"
                    )}
                  >
                    {guard.enabled && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-medium", !guard.enabled && "text-muted-foreground")}>{guard.label}</span>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full",
                        guard.level === "critical" ? "bg-red-500/10 text-red-500" :
                        guard.level === "standard" ? "bg-blue-500/10 text-blue-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {guard.level}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{guard.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Allowed Actions */}
        <div>
          <button
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors"
            onClick={() => setShowActions(!showActions)}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium">Allowed Actions</span>
              <span className="text-[10px] text-muted-foreground">
                ({actions.filter((a) => a.allowed).length}/{actions.length} enabled)
              </span>
            </div>
            {showActions ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showActions && (
            <div className="px-5 pb-4">
              {(["code", "deploy", "data", "communication"] as const).map((category) => {
                const categoryActions = actions.filter((a) => a.category === category);
                return (
                  <div key={category} className="mb-3">
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 capitalize">{category}</h4>
                    <div className="space-y-1.5">
                      {categoryActions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            {action.allowed ? (
                              <Unlock className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                            <div>
                              <span className={cn("text-xs", !action.allowed && "text-muted-foreground")}>{action.label}</span>
                              <p className="text-[10px] text-muted-foreground">{action.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleAction(action.id)}
                            className={cn(
                              "relative w-9 h-5 rounded-full transition-colors shrink-0",
                              action.allowed ? "bg-green-500" : "bg-muted"
                            )}
                          >
                            <div className={cn(
                              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                              action.allowed ? "translate-x-4" : "translate-x-0.5"
                            )} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Warning Footer */}
      {isEnabled && criticalGuardsActive < totalCritical && (
        <div className="px-5 py-3 border-t border-amber-500/20 bg-amber-500/5 flex items-center gap-2 text-xs text-amber-500">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Some critical safety guards are disabled. The agent may perform destructive actions without confirmation.</span>
        </div>
      )}
    </div>
  );
}
