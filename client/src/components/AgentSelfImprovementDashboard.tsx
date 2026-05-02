import { useState, useMemo } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ImprovementMetric {
  id: string;
  name: string;
  current: number;
  previous: number;
  target: number;
  unit: string;
  trend: "up" | "down" | "stable";
}

interface LearningCycle {
  id: string;
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  status: "active" | "completed" | "analyzing";
  improvements: number;
  regressions: number;
  dataPointsAnalyzed: number;
}

interface ImprovementSuggestion {
  id: string;
  area: string;
  description: string;
  expectedImpact: number;
  effort: "low" | "medium" | "high";
  status: "pending" | "implementing" | "validated";
}

const MOCK_METRICS: ImprovementMetric[] = [
  { id: "m1", name: "Task Success Rate", current: 94.2, previous: 91.8, target: 97, unit: "%", trend: "up" },
  { id: "m2", name: "Avg Response Quality", current: 8.7, previous: 8.4, target: 9.5, unit: "/10", trend: "up" },
  { id: "m3", name: "Tool Selection Accuracy", current: 96.1, previous: 95.8, target: 98, unit: "%", trend: "up" },
  { id: "m4", name: "Context Utilization", current: 87.3, previous: 88.1, target: 95, unit: "%", trend: "down" },
  { id: "m5", name: "Error Recovery Rate", current: 78.5, previous: 76.2, target: 90, unit: "%", trend: "up" },
  { id: "m6", name: "User Satisfaction", current: 4.6, previous: 4.5, target: 4.8, unit: "/5", trend: "up" },
];

const MOCK_CYCLES: LearningCycle[] = [
  { id: "lc1", cycleNumber: 47, startedAt: "2 hours ago", completedAt: null, status: "active", improvements: 3, regressions: 0, dataPointsAnalyzed: 1247 },
  { id: "lc2", cycleNumber: 46, startedAt: "8 hours ago", completedAt: "2 hours ago", status: "completed", improvements: 5, regressions: 1, dataPointsAnalyzed: 3891 },
  { id: "lc3", cycleNumber: 45, startedAt: "1 day ago", completedAt: "8 hours ago", status: "completed", improvements: 7, regressions: 0, dataPointsAnalyzed: 5234 },
  { id: "lc4", cycleNumber: 44, startedAt: "2 days ago", completedAt: "1 day ago", status: "completed", improvements: 4, regressions: 2, dataPointsAnalyzed: 4102 },
];

const MOCK_SUGGESTIONS: ImprovementSuggestion[] = [
  { id: "s1", area: "Context Management", description: "Implement sliding window compression for long conversations to improve context utilization", expectedImpact: 12, effort: "medium", status: "implementing" },
  { id: "s2", area: "Error Recovery", description: "Add retry strategies with exponential backoff for transient tool failures", expectedImpact: 8, effort: "low", status: "validated" },
  { id: "s3", area: "Response Quality", description: "Fine-tune output formatting based on user preference patterns", expectedImpact: 5, effort: "low", status: "pending" },
  { id: "s4", area: "Tool Selection", description: "Build decision tree for ambiguous tool selection scenarios", expectedImpact: 3, effort: "high", status: "pending" },
  { id: "s5", area: "Task Planning", description: "Decompose complex tasks into verifiable sub-goals with checkpoints", expectedImpact: 15, effort: "high", status: "implementing" },
];

type ViewMode = "metrics" | "cycles" | "suggestions";

export default function AgentSelfImprovementDashboard(): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>("metrics");

  const overallScore = useMemo(() => {
    const scores = MOCK_METRICS.map((m) => (m.current / m.target) * 100);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }, []);

  const totalImprovements = useMemo(() => {
    return MOCK_CYCLES.reduce((sum, c) => sum + c.improvements, 0);
  }, []);

  const getTrendIcon = (trend: string): React.JSX.Element => {
    switch (trend) {
      case "up":
        return <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />;
      case "down":
        return <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
    }
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
            Cycle #{MOCK_CYCLES[0].cycleNumber} Active
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
          <p className="text-[10px] text-muted-foreground">Active Suggestions</p>
          <p className="text-lg font-semibold text-purple-500">
            {MOCK_SUGGESTIONS.filter((s) => s.status !== "validated").length}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-border px-5">
        {([
          { id: "metrics" as ViewMode, label: "Metrics", icon: BarChart3 },
          { id: "cycles" as ViewMode, label: "Learning Cycles", icon: RefreshCw },
          { id: "suggestions" as ViewMode, label: "Suggestions", icon: Lightbulb },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id)}
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
            {MOCK_METRICS.map((metric) => {
              const progress = (metric.current / metric.target) * 100;
              const delta = metric.current - metric.previous;
              return (
                <div key={metric.id} className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{metric.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getTrendIcon(metric.trend)}
                      <span className={cn(
                        "text-xs font-medium",
                        delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                      )}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}{metric.unit}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-semibold">
                      {metric.current}{metric.unit}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Target: {metric.target}{metric.unit}
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
            })}
          </div>
        )}

        {viewMode === "cycles" && (
          <div className="space-y-3">
            {MOCK_CYCLES.map((cycle) => (
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
                      cycle.status === "completed" && "bg-green-500/10 text-green-500",
                      cycle.status === "analyzing" && "bg-blue-500/10 text-blue-500"
                    )}>
                      {cycle.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {cycle.startedAt}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center p-2 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Improvements</p>
                    <p className="text-sm font-semibold text-green-500">{cycle.improvements}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Regressions</p>
                    <p className="text-sm font-semibold text-red-500">{cycle.regressions}</p>
                  </div>
                  <div className="text-center p-2 rounded bg-muted/50">
                    <p className="text-[10px] text-muted-foreground">Data Points</p>
                    <p className="text-sm font-semibold">{cycle.dataPointsAnalyzed.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === "suggestions" && (
          <div className="space-y-3">
            {MOCK_SUGGESTIONS.map((suggestion) => (
              <div key={suggestion.id} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className={cn(
                      "w-4 h-4",
                      suggestion.status === "validated" ? "text-green-500" : "text-amber-500"
                    )} />
                    <span className="text-xs font-medium text-muted-foreground">{suggestion.area}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getEffortBadge(suggestion.effort)}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      suggestion.status === "pending" && "bg-muted text-muted-foreground",
                      suggestion.status === "implementing" && "bg-blue-500/10 text-blue-500",
                      suggestion.status === "validated" && "bg-green-500/10 text-green-500"
                    )}>
                      {suggestion.status}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-2">{suggestion.description}</p>
                <div className="flex items-center gap-2">
                  <Zap className="w-3 h-3 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Expected impact: +{suggestion.expectedImpact}% improvement
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
