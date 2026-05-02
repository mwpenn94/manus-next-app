import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  BarChart3,
  RefreshCw,
  CheckCircle2,
  Clock,
  Zap,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Layers,
  GitBranch,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ViewMode = "metrics" | "cycles" | "suggestions";

export default function AgentSelfImprovementDashboard(): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");

  // ── Real tRPC queries ──
  const metricsQuery = trpc.processImprovement.getMetrics.useQuery(undefined, { staleTime: 30_000 });
  const initiativesQuery = trpc.processImprovement.getInitiatives.useQuery(undefined, { staleTime: 30_000 });
  const cyclesQuery = trpc.processImprovement.getCycles.useQuery(undefined, { staleTime: 30_000 });

  const utils = trpc.useUtils();

  // Mutations
  const createInitiativeMut = trpc.processImprovement.createInitiative.useMutation({
    onSuccess: () => { utils.processImprovement.getInitiatives.invalidate(); toast.success("Initiative created"); },
  });
  const updateInitiativeMut = trpc.processImprovement.updateInitiative.useMutation({
    onSuccess: () => { utils.processImprovement.getInitiatives.invalidate(); },
  });

  // Persist settings via preferences
  const { data: prefs } = trpc.preferences.get.useQuery();
  const savePrefsMut = trpc.preferences.save.useMutation();

  // Load persisted view mode
  useEffect(() => {
    const saved = (prefs?.generalSettings as any)?.selfImprovementViewMode;
    if (saved && (saved === "metrics" || saved === "cycles" || saved === "suggestions")) {
      setViewMode(saved);
    }
  }, [prefs]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    const current = (prefs?.generalSettings ?? {}) as Record<string, unknown>;
    savePrefsMut.mutate({ generalSettings: { ...current, selfImprovementViewMode: mode } });
  };

  // ── Derived data ──
  const metrics = metricsQuery.data ?? [];
  const initiatives = initiativesQuery.data ?? [];
  const cycles = cyclesQuery.data ?? [];

  const overallScore = useMemo(() => {
    if (metrics.length === 0) return 0;
    const scores = metrics.map((m: any) => ((m.currentValue || 0) / (m.targetValue || 100)) * 100);
    return scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
  }, [metrics]);

  const totalImprovements = useMemo(() => {
    return cycles.reduce((sum: number, c: any) => sum + ((c.findings as string[])?.length || 0), 0);
  }, [cycles]);

  const activeCycleNumber = useMemo(() => {
    const active = cycles.find((c: any) => c.status === "active");
    return active ? (active as any).cycleNumber : (cycles.length > 0 ? (cycles[0] as any).cycleNumber : 1);
  }, [cycles]);

  const getTrendIcon = (current: number, previous: number): React.JSX.Element => {
    if (current > previous) return <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />;
    if (current < previous) return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
    return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getEffortBadge = (effort: string): React.JSX.Element => {
    const colors: Record<string, string> = {
      low: "bg-green-500/10 text-green-500",
      medium: "bg-amber-500/10 text-amber-500",
      high: "bg-red-500/10 text-red-500",
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", colors[effort] || "")}>
        {effort} effort
      </span>
    );
  };

  const isLoading = metricsQuery.isLoading || initiativesQuery.isLoading || cyclesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading improvement data...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Agent Self-Improvement</h2>
            <p className="text-xs text-muted-foreground">
              Continuous learning and performance optimization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-purple-500/10 text-xs font-medium text-purple-500">
            Cycle #{activeCycleNumber} Active
          </div>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-3 px-5 py-3 border-b border-border bg-card/30">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Overall Score</p>
          <p className="text-lg font-semibold">{overallScore.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Total Improvements</p>
          <p className="text-lg font-semibold text-green-500">{totalImprovements}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Active Initiatives</p>
          <p className="text-lg font-semibold text-purple-500">
            {initiatives.filter((s: any) => s.status !== "completed").length}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-border px-5">
        {([
          { id: "metrics" as ViewMode, label: "Metrics", icon: BarChart3 },
          { id: "cycles" as ViewMode, label: "Learning Cycles", icon: RefreshCw },
          { id: "suggestions" as ViewMode, label: "Initiatives", icon: Lightbulb },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleViewModeChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors",
              viewMode === tab.id
                ? "border-purple-500 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {viewMode === "metrics" && (
          <div className="space-y-3">
            {metrics.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No metrics tracked yet.</p>
                <p className="text-xs mt-1">Metrics are automatically added as the agent learns from your tasks.</p>
              </div>
            ) : (
              metrics.map((metric: any) => {
                const progress = ((metric.currentValue || 0) / (metric.targetValue || 100)) * 100;
                const delta = (metric.currentValue || 0) - (metric.previousValue || 0);
                return (
                  <div key={metric.id} className="p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{metric.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getTrendIcon(metric.currentValue, metric.previousValue)}
                        <span className={cn(
                          "text-xs font-medium",
                          delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                        )}>
                          {delta > 0 ? "+" : ""}{delta.toFixed(1)}{metric.unit || "%"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mb-2">
                      <span className="text-2xl font-semibold">
                        {metric.currentValue}{metric.unit || "%"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Target: {metric.targetValue}{metric.unit || "%"}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progress >= 95 ? "bg-green-500" : progress >= 80 ? "bg-primary" : "bg-amber-500"
                        )}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {viewMode === "cycles" && (
          <div className="space-y-3">
            {cycles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No optimization cycles yet.</p>
                <p className="text-xs mt-1">Cycles are created as the agent iterates on improvements.</p>
              </div>
            ) : (
              cycles.map((cycle: any) => (
                <div key={cycle.id} className={cn(
                  "p-4 rounded-lg border",
                  cycle.status === "active" ? "bg-purple-500/5 border-purple-500/20" : "bg-card border-border"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">Cycle #{cycle.cycleNumber}</span>
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        cycle.status === "active" && "bg-purple-500/10 text-purple-500",
                        cycle.status === "completed" && "bg-green-500/10 text-green-500"
                      )}>
                        {cycle.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {cycle.createdAt ? new Date(cycle.createdAt).toLocaleDateString() : "—"}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Findings</p>
                      <p className="text-sm font-semibold text-green-500">{(cycle.findings as string[])?.length || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Improvements</p>
                      <p className="text-sm font-semibold text-blue-500">{(cycle.improvements as string[])?.length || 0}</p>
                    </div>
                    <div className="text-center p-2 rounded bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Phase</p>
                      <p className="text-sm font-semibold capitalize">{cycle.phase}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === "suggestions" && (
          <div className="space-y-3">
            {initiatives.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No improvement initiatives yet.</p>
                <p className="text-xs mt-1">Initiatives are proposed as the agent identifies optimization opportunities.</p>
              </div>
            ) : (
              initiatives.map((initiative: any) => (
                <div key={initiative.id} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className={cn(
                        "w-4 h-4",
                        initiative.status === "completed" ? "text-green-500" : "text-amber-500"
                      )} />
                      <span className="text-xs font-medium text-muted-foreground">{initiative.owner || "Agent"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full",
                        initiative.status === "proposed" && "bg-muted text-muted-foreground",
                        initiative.status === "in_progress" && "bg-blue-500/10 text-blue-500",
                        initiative.status === "completed" && "bg-green-500/10 text-green-500",
                        initiative.status === "on_hold" && "bg-amber-500/10 text-amber-500"
                      )}>
                        {initiative.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium mb-1">{initiative.title}</p>
                  {initiative.description && (
                    <p className="text-xs text-muted-foreground mb-2">{initiative.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      Impact score: {initiative.impactScore}/100
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
