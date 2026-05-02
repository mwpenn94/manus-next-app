import { useState, useMemo } from "react";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Layers,
  GitMerge,
  Zap,
  AlertTriangle,
  Award,
  Activity,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessMetric {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  targetValue: number;
  unit: string;
  history: number[];
}

interface ImprovementInitiative {
  id: string;
  title: string;
  description: string;
  status: "planned" | "in_progress" | "completed" | "measuring";
  startDate: string;
  completionDate: string | null;
  impactScore: number;
  owner: string;
  metrics: string[];
}

interface OptimizationCycle {
  id: string;
  cycleNumber: number;
  phase: "assess" | "optimize" | "validate";
  startedAt: string;
  findings: number;
  improvements: number;
  status: "active" | "completed";
}

const MOCK_METRICS: ProcessMetric[] = [
  { id: "pm1", name: "Processing Speed", category: "Performance", currentValue: 312, previousValue: 245, targetValue: 350, unit: "records/min", history: [180, 210, 245, 267, 289, 312] },
  { id: "pm2", name: "Error Rate", category: "Quality", currentValue: 0.3, previousValue: 0.8, targetValue: 0.1, unit: "%", history: [2.1, 1.5, 1.2, 0.8, 0.5, 0.3] },
  { id: "pm3", name: "First-Pass Yield", category: "Quality", currentValue: 97.2, previousValue: 95.1, targetValue: 99, unit: "%", history: [89, 91, 93, 95.1, 96.4, 97.2] },
  { id: "pm4", name: "Cycle Time", category: "Efficiency", currentValue: 4.2, previousValue: 5.8, targetValue: 3.0, unit: "min", history: [9.5, 8.1, 7.2, 5.8, 5.0, 4.2] },
  { id: "pm5", name: "Resource Utilization", category: "Efficiency", currentValue: 84, previousValue: 78, targetValue: 90, unit: "%", history: [62, 68, 72, 78, 81, 84] },
  { id: "pm6", name: "Automation Coverage", category: "Automation", currentValue: 73, previousValue: 65, targetValue: 85, unit: "%", history: [42, 48, 55, 65, 69, 73] },
];

const MOCK_INITIATIVES: ImprovementInitiative[] = [
  { id: "ii1", title: "Parallel Pipeline Processing", description: "Enable concurrent processing of independent data streams", status: "completed", startDate: "2 weeks ago", completionDate: "3 days ago", impactScore: 92, owner: "Agent Core", metrics: ["pm1", "pm4"] },
  { id: "ii2", title: "Intelligent Error Recovery", description: "Implement self-healing mechanisms for common failure modes", status: "in_progress", startDate: "1 week ago", completionDate: null, impactScore: 78, owner: "Reliability", metrics: ["pm2", "pm3"] },
  { id: "ii3", title: "Context-Aware Caching", description: "Cache frequently accessed data with smart invalidation", status: "measuring", startDate: "5 days ago", completionDate: null, impactScore: 65, owner: "Performance", metrics: ["pm1", "pm5"] },
  { id: "ii4", title: "Workflow Automation Expansion", description: "Automate remaining manual review steps in the pipeline", status: "planned", startDate: "-", completionDate: null, impactScore: 85, owner: "Automation", metrics: ["pm6"] },
];

const MOCK_CYCLES: OptimizationCycle[] = [
  { id: "oc1", cycleNumber: 12, phase: "validate", startedAt: "1 hour ago", findings: 3, improvements: 2, status: "active" },
  { id: "oc2", cycleNumber: 11, phase: "validate", startedAt: "1 day ago", findings: 5, improvements: 4, status: "completed" },
  { id: "oc3", cycleNumber: 10, phase: "validate", startedAt: "3 days ago", findings: 7, improvements: 6, status: "completed" },
  { id: "oc4", cycleNumber: 9, phase: "validate", startedAt: "5 days ago", findings: 4, improvements: 4, status: "completed" },
];

type TabId = "metrics" | "initiatives" | "cycles";

export default function ProcessImprovementTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("metrics");
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const overallImprovement = useMemo(() => {
    const improvements = MOCK_METRICS.map((m) => {
      const isLowerBetter = m.name === "Error Rate" || m.name === "Cycle Time";
      if (isLowerBetter) {
        return ((m.previousValue - m.currentValue) / m.previousValue) * 100;
      }
      return ((m.currentValue - m.previousValue) / m.previousValue) * 100;
    });
    return improvements.reduce((a, b) => a + b, 0) / improvements.length;
  }, []);

  const getProgressToTarget = (metric: ProcessMetric): number => {
    const isLowerBetter = metric.name === "Error Rate" || metric.name === "Cycle Time";
    if (isLowerBetter) {
      const range = metric.history[0] - metric.targetValue;
      const progress = metric.history[0] - metric.currentValue;
      return Math.min((progress / range) * 100, 100);
    }
    const range = metric.targetValue - metric.history[0];
    const progress = metric.currentValue - metric.history[0];
    return Math.min((progress / range) * 100, 100);
  };

  const isImproving = (metric: ProcessMetric): boolean => {
    const isLowerBetter = metric.name === "Error Rate" || metric.name === "Cycle Time";
    return isLowerBetter ? metric.currentValue < metric.previousValue : metric.currentValue > metric.previousValue;
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Process Improvement Tracker</h2>
            <p className="text-xs text-muted-foreground">
              Continuous optimization cycles and performance gains
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-xs font-medium text-green-500">
          <ArrowUpRight className="w-3.5 h-3.5" />
          +{overallImprovement.toFixed(1)}% overall
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {([
          { id: "metrics" as TabId, label: "Metrics", icon: BarChart3 },
          { id: "initiatives" as TabId, label: "Initiatives", icon: Target },
          { id: "cycles" as TabId, label: "AOV Cycles", icon: RefreshCw },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-green-500 text-foreground"
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
        {activeTab === "metrics" && (
          <div className="space-y-3">
            {MOCK_METRICS.map((metric) => {
              const progress = getProgressToTarget(metric);
              const improving = isImproving(metric);
              return (
                <div
                  key={metric.id}
                  className={cn(
                    "p-4 rounded-lg border cursor-pointer transition-all",
                    selectedMetric === metric.id ? "bg-card border-primary/30 ring-1 ring-primary/20" : "bg-card border-border hover:border-primary/20"
                  )}
                  onClick={() => setSelectedMetric(selectedMetric === metric.id ? null : metric.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{metric.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {metric.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {improving ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                      )}
                      <span className="text-sm font-semibold">
                        {metric.currentValue}{metric.unit}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        progress >= 90 ? "bg-green-500" : progress >= 60 ? "bg-primary" : "bg-amber-500"
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                    <span>Previous: {metric.previousValue}{metric.unit}</span>
                    <span>Target: {metric.targetValue}{metric.unit}</span>
                  </div>

                  {selectedMetric === metric.id && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Trend (last 6 periods)</p>
                      <div className="flex items-end gap-1 h-12">
                        {metric.history.map((val, idx) => {
                          const max = Math.max(...metric.history);
                          const height = (val / max) * 100;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-1 rounded-t transition-all",
                                idx === metric.history.length - 1 ? "bg-primary" : "bg-muted"
                              )}
                              style={{ height: `${height}%` }}
                              title={`${val}${metric.unit}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "initiatives" && (
          <div className="space-y-3">
            {MOCK_INITIATIVES.map((initiative) => (
              <div key={initiative.id} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {initiative.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {initiative.status === "in_progress" && <Activity className="w-4 h-4 text-blue-500" />}
                    {initiative.status === "measuring" && <BarChart3 className="w-4 h-4 text-purple-500" />}
                    {initiative.status === "planned" && <Clock className="w-4 h-4 text-muted-foreground" />}
                    <h4 className="text-sm font-medium">{initiative.title}</h4>
                  </div>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full",
                    initiative.status === "completed" && "bg-green-500/10 text-green-500",
                    initiative.status === "in_progress" && "bg-blue-500/10 text-blue-500",
                    initiative.status === "measuring" && "bg-purple-500/10 text-purple-500",
                    initiative.status === "planned" && "bg-muted text-muted-foreground"
                  )}>
                    {initiative.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{initiative.description}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Impact: {initiative.impactScore}/100
                  </span>
                  <span>Owner: {initiative.owner}</span>
                  <span>Started: {initiative.startDate}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "cycles" && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <GitMerge className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AOV Methodology</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Assess → Optimize → Validate. Each cycle identifies improvement opportunities,
                implements changes, and validates results before the next iteration.
              </p>
            </div>
            {MOCK_CYCLES.map((cycle) => (
              <div key={cycle.id} className={cn(
                "p-4 rounded-lg border",
                cycle.status === "active" ? "bg-green-500/5 border-green-500/20" : "bg-card border-border"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn("w-4 h-4", cycle.status === "active" ? "text-green-500 animate-spin" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">Cycle #{cycle.cycleNumber}</span>
                    {cycle.status === "active" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
                        active
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{cycle.startedAt}</span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {(["assess", "optimize", "validate"] as const).map((phase, idx) => (
                    <div key={phase} className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium",
                        phase === cycle.phase && cycle.status === "active"
                          ? "bg-green-500 text-white"
                          : idx < ["assess", "optimize", "validate"].indexOf(cycle.phase)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </div>
                      <span className="text-[10px] capitalize text-muted-foreground">{phase}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Findings</p>
                    <p className="text-sm font-medium">{cycle.findings}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-[10px] text-muted-foreground">Improvements</p>
                    <p className="text-sm font-medium text-green-500">{cycle.improvements}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
