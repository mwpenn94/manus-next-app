import { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  GitMerge,
  Zap,
  Award,
  Activity,
  RefreshCw,
  Plus,
  Loader2,
  Trash2,
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

type TabId = "metrics" | "initiatives" | "cycles";

export default function ProcessImprovementTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>("metrics");
  const [selectedMetric, setSelectedMetric] = useState<number | null>(null);
  const [showAddMetric, setShowAddMetric] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [showAddCycle, setShowAddCycle] = useState(false);
  const [newMetric, setNewMetric] = useState({ name: "", currentValue: 0, previousValue: 0, targetValue: 100, unit: "%", category: "performance" });
  const [newInitiative, setNewInitiative] = useState({ title: "", description: "", impactScore: 50, owner: "" });
  const [newCycleNumber, setNewCycleNumber] = useState(1);

  const utils = trpc.useUtils();
  const { data: metrics = [], isLoading: metricsLoading } = trpc.processImprovement.getMetrics.useQuery();
  const { data: initiatives = [], isLoading: initiativesLoading } = trpc.processImprovement.getInitiatives.useQuery();
  const { data: cycles = [], isLoading: cyclesLoading } = trpc.processImprovement.getCycles.useQuery();

  const upsertMetric = trpc.processImprovement.upsertMetric.useMutation({
    onSuccess: () => { utils.processImprovement.getMetrics.invalidate(); setShowAddMetric(false); setNewMetric({ name: "", currentValue: 0, previousValue: 0, targetValue: 100, unit: "%", category: "performance" }); },
  });
  const deleteMetric = trpc.processImprovement.deleteMetric.useMutation({
    onSuccess: () => utils.processImprovement.getMetrics.invalidate(),
  });
  const createInitiative = trpc.processImprovement.createInitiative.useMutation({
    onSuccess: () => { utils.processImprovement.getInitiatives.invalidate(); setShowAddInitiative(false); setNewInitiative({ title: "", description: "", impactScore: 50, owner: "" }); },
  });
  const updateInitiative = trpc.processImprovement.updateInitiative.useMutation({
    onSuccess: () => utils.processImprovement.getInitiatives.invalidate(),
  });
  const deleteInitiative = trpc.processImprovement.deleteInitiative.useMutation({
    onSuccess: () => utils.processImprovement.getInitiatives.invalidate(),
  });
  const createCycle = trpc.processImprovement.createCycle.useMutation({
    onSuccess: () => { utils.processImprovement.getCycles.invalidate(); setShowAddCycle(false); },
  });
  const updateCycle = trpc.processImprovement.updateCycle.useMutation({
    onSuccess: () => utils.processImprovement.getCycles.invalidate(),
  });

  const overallImprovement = useMemo(() => {
    if (metrics.length === 0) return 0;
    const improvements = metrics.map((m) => {
      if (m.previousValue === 0) return 0;
      const isLowerBetter = m.unit === "%" && m.name.toLowerCase().includes("error") || m.name.toLowerCase().includes("time");
      if (isLowerBetter) {
        return ((m.previousValue - m.currentValue) / m.previousValue) * 100;
      }
      return ((m.currentValue - m.previousValue) / m.previousValue) * 100;
    });
    return improvements.reduce((a, b) => a + b, 0) / improvements.length;
  }, [metrics]);

  const getProgressToTarget = useCallback((metric: typeof metrics[0]): number => {
    const range = Math.abs(metric.targetValue - metric.previousValue);
    if (range === 0) return 100;
    const progress = Math.abs(metric.currentValue - metric.previousValue);
    return Math.min((progress / range) * 100, 100);
  }, []);

  const isImproving = useCallback((metric: typeof metrics[0]): boolean => {
    const isLowerBetter = metric.name.toLowerCase().includes("error") || metric.name.toLowerCase().includes("time");
    return isLowerBetter ? metric.currentValue < metric.previousValue : metric.currentValue > metric.previousValue;
  }, []);

  const isLoading = metricsLoading || initiativesLoading || cyclesLoading;

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
          {overallImprovement >= 0 ? "+" : ""}{overallImprovement.toFixed(1)}% overall
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-5">
        {([
          { id: "metrics" as TabId, label: `Metrics (${metrics.length})`, icon: BarChart3 },
          { id: "initiatives" as TabId, label: `Initiatives (${initiatives.length})`, icon: Target },
          { id: "cycles" as TabId, label: `AOV Cycles (${cycles.length})`, icon: RefreshCw },
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
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && activeTab === "metrics" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Track key performance indicators.</p>
              <Dialog open={showAddMetric} onOpenChange={setShowAddMetric}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add Metric
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Process Metric</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input placeholder="Metric name" value={newMetric.name} onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Current</label>
                        <Input type="number" value={newMetric.currentValue} onChange={(e) => setNewMetric({ ...newMetric, currentValue: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Previous</label>
                        <Input type="number" value={newMetric.previousValue} onChange={(e) => setNewMetric({ ...newMetric, previousValue: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Target</label>
                        <Input type="number" value={newMetric.targetValue} onChange={(e) => setNewMetric({ ...newMetric, targetValue: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Unit (e.g., %)" value={newMetric.unit} onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })} />
                      <select value={newMetric.category} onChange={(e) => setNewMetric({ ...newMetric, category: e.target.value })} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
                        <option value="performance">Performance</option>
                        <option value="quality">Quality</option>
                        <option value="efficiency">Efficiency</option>
                        <option value="automation">Automation</option>
                      </select>
                    </div>
                    <Button onClick={() => upsertMetric.mutate(newMetric)} className="w-full" disabled={!newMetric.name.trim()}>
                      Save Metric
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {metrics.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No metrics yet. Add your first metric to start tracking improvements.</p>
              </div>
            )}
            {metrics.map((metric) => {
              const progress = getProgressToTarget(metric);
              const improving = isImproving(metric);
              const history = (metric.history as Array<{ timestamp: string; value: number }>) || [];
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
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMetric.mutate({ id: metric.id }); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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

                  {selectedMetric === metric.id && history.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Trend ({history.length} data points)</p>
                      <div className="flex items-end gap-1 h-12">
                        {history.map((point, idx) => {
                          const max = Math.max(...history.map(h => h.value));
                          const height = max > 0 ? (point.value / max) * 100 : 0;
                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-1 rounded-t transition-all",
                                idx === history.length - 1 ? "bg-primary" : "bg-muted"
                              )}
                              style={{ height: `${height}%` }}
                              title={`${point.value}${metric.unit}`}
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

        {!isLoading && activeTab === "initiatives" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Track improvement initiatives and their impact.</p>
              <Dialog open={showAddInitiative} onOpenChange={setShowAddInitiative}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Add Initiative
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Improvement Initiative</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <Input placeholder="Title" value={newInitiative.title} onChange={(e) => setNewInitiative({ ...newInitiative, title: e.target.value })} />
                    <Input placeholder="Description" value={newInitiative.description} onChange={(e) => setNewInitiative({ ...newInitiative, description: e.target.value })} />
                    <Input placeholder="Owner (e.g., Agent Core)" value={newInitiative.owner} onChange={(e) => setNewInitiative({ ...newInitiative, owner: e.target.value })} />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground w-24">Impact Score:</span>
                      <input type="range" min="0" max="100" value={newInitiative.impactScore} onChange={(e) => setNewInitiative({ ...newInitiative, impactScore: Number(e.target.value) })} className="flex-1 h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary" />
                      <span className="text-sm font-mono w-10 text-right">{newInitiative.impactScore}</span>
                    </div>
                    <Button onClick={() => createInitiative.mutate(newInitiative)} className="w-full" disabled={!newInitiative.title.trim()}>
                      Create Initiative
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {initiatives.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No initiatives yet. Create your first improvement initiative.</p>
              </div>
            )}
            {initiatives.map((initiative) => (
              <div key={initiative.id} className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {initiative.status === "completed" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {initiative.status === "in_progress" && <Activity className="w-4 h-4 text-blue-500" />}
                    {initiative.status === "on_hold" && <Clock className="w-4 h-4 text-amber-500" />}
                    {initiative.status === "proposed" && <Clock className="w-4 h-4 text-muted-foreground" />}
                    <h4 className="text-sm font-medium">{initiative.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={initiative.status}
                      onChange={(e) => updateInitiative.mutate({ id: initiative.id, status: e.target.value as "proposed" | "in_progress" | "completed" | "on_hold" })}
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-border bg-background"
                    >
                      <option value="proposed">Proposed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                    </select>
                    <button
                      onClick={() => deleteInitiative.mutate({ id: initiative.id })}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{initiative.description}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    Impact: {initiative.impactScore}/100
                  </span>
                  {initiative.owner && <span>Owner: {initiative.owner}</span>}
                  <span>Created: {new Date(initiative.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && activeTab === "cycles" && (
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">{cycles.length} optimization cycles tracked.</p>
              <Dialog open={showAddCycle} onOpenChange={setShowAddCycle}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    New Cycle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Optimization Cycle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sm text-muted-foreground">Cycle Number</label>
                      <Input type="number" min="1" value={newCycleNumber} onChange={(e) => setNewCycleNumber(Number(e.target.value))} />
                    </div>
                    <Button onClick={() => createCycle.mutate({ cycleNumber: newCycleNumber, phase: "assess" })} className="w-full">
                      Start Cycle #{newCycleNumber}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {cycles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No optimization cycles yet. Start your first AOV cycle.</p>
              </div>
            )}
            {cycles.map((cycle) => {
              const findings = (cycle.findings as string[]) || [];
              const improvements = (cycle.improvements as string[]) || [];
              return (
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(cycle.createdAt).toLocaleDateString()}</span>
                      {cycle.status === "active" && (
                        <select
                          value={cycle.phase}
                          onChange={(e) => updateCycle.mutate({ id: cycle.id, phase: e.target.value as "assess" | "optimize" | "validate" })}
                          className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background"
                        >
                          <option value="assess">Assess</option>
                          <option value="optimize">Optimize</option>
                          <option value="validate">Validate</option>
                        </select>
                      )}
                      {cycle.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2"
                          onClick={() => updateCycle.mutate({ id: cycle.id, status: "completed" })}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
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
                      <p className="text-sm font-medium">{findings.length}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50 text-center">
                      <p className="text-[10px] text-muted-foreground">Improvements</p>
                      <p className="text-sm font-medium text-green-500">{improvements.length}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
