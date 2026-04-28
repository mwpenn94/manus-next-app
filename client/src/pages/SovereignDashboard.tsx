/**
 * Sovereign AI Dashboard — 4-Layer Agent Stack Control Center
 *
 * Surfaces AEGIS pre/post-flight metrics, ATLAS goal decomposition state,
 * and Sovereign multi-provider routing health in a single unified view.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DependencyGraph from "@/components/DependencyGraph";
import {
  Shield, Brain, Network, Activity, Zap, Target, BarChart3,
  CheckCircle2, XCircle, AlertTriangle, Clock, Loader2,
  RefreshCw, Play, ChevronRight, Layers, Eye, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status indicator component ──
function StatusDot({ status }: { status: "healthy" | "degraded" | "down" | "unknown" }) {
  const colors = {
    healthy: "bg-emerald-500 shadow-emerald-500/40",
    degraded: "bg-amber-500 shadow-amber-500/40",
    down: "bg-red-500 shadow-red-500/40",
    unknown: "bg-zinc-500 shadow-zinc-500/40",
  };
  return <div className={cn("w-2.5 h-2.5 rounded-full shadow-[0_0_6px]", colors[status])} />;
}

// ── Metric card ──
function MetricCard({ label, value, icon: Icon, trend, className }: {
  label: string; value: string | number; icon: typeof Activity; trend?: string; className?: string;
}) {
  return (
    <div className={cn("p-4 rounded-xl bg-card border border-border", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground/60" />
      </div>
      <div className="text-2xl font-semibold text-foreground tabular-nums">{value}</div>
      {trend && <span className="text-xs text-muted-foreground mt-1">{trend}</span>}
    </div>
  );
}

// ── AEGIS Panel ──
function AegisPanel() {
  const [testPrompt, setTestPrompt] = useState("");
  const [classifyPrompt, setClassifyPrompt] = useState<string | null>(null);
  const [cachePrompt, setCachePrompt] = useState<string | null>(null);
  const classifyQuery = trpc.aegis.classify.useQuery(
    { prompt: classifyPrompt ?? "" },
    { enabled: !!classifyPrompt }
  );
  const cacheCheckQuery = trpc.aegis.checkCache.useQuery(
    { prompt: cachePrompt ?? "" },
    { enabled: !!cachePrompt }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Shield className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">AEGIS Pipeline</h3>
          <p className="text-sm text-muted-foreground">Pre/post-flight quality assurance</p>
        </div>
      </div>

      {/* Test classify */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Task Classifier</CardTitle>
          <CardDescription>Test the AEGIS classification pipeline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Enter a prompt to classify..."
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => setClassifyPrompt(testPrompt)}
              disabled={!testPrompt.trim() || classifyQuery.isFetching}
            >
              {classifyQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
              Classify
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCachePrompt(testPrompt)}
              disabled={!testPrompt.trim() || cacheCheckQuery.isFetching}
            >
              {cacheCheckQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
              Check Cache
            </Button>
          </div>

          {classifyQuery.data && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="secondary">{classifyQuery.data.taskType}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Complexity:</span>
                <Badge variant={
                  classifyQuery.data.complexity === "expert" || classifyQuery.data.complexity === "complex" ? "destructive" :
                  classifyQuery.data.complexity === "moderate" ? "default" : "secondary"
                }>{classifyQuery.data.complexity}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Est. tokens:</span>
                <span className="font-mono text-foreground">{classifyQuery.data.estimatedTokens.toLocaleString()}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pipeline stages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pipeline Stages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: "Classify", desc: "Task type + complexity detection", icon: Target },
              { name: "Cache Check", desc: "Semantic similarity lookup", icon: Eye },
              { name: "Optimize", desc: "Prompt enhancement + context assembly", icon: Zap },
              { name: "Quality Score", desc: "Post-flight output validation", icon: CheckCircle2 },
              { name: "Fragment Extract", desc: "Reusable knowledge extraction", icon: Layers },
              { name: "Lesson Learn", desc: "Pattern recognition + improvement", icon: TrendingUp },
            ].map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-xs font-mono text-blue-500">
                  {i + 1}
                </div>
                <stage.icon className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">{stage.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{stage.desc}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── ATLAS Panel ──
function AtlasPanel() {
  const [goalInput, setGoalInput] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const decomposeMutation = trpc.atlas.decompose.useMutation({
    onSuccess: (data) => {
      toast.success(`Goal decomposed into ${data.tasks.length} tasks`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });
  const goalsQuery = trpc.atlas.listGoals.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const goalDetailQuery = trpc.atlas.getGoal.useQuery(
    { externalId: selectedGoalId! },
    { enabled: !!selectedGoalId, refetchInterval: 5000 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-purple-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">ATLAS Kernel</h3>
          <p className="text-sm text-muted-foreground">Goal decomposition + execution planning</p>
        </div>
      </div>

      {/* Goal input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Decompose Goal</CardTitle>
          <CardDescription>Break a high-level goal into executable tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Describe a goal to decompose..."
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button
            size="sm"
            onClick={() => decomposeMutation.mutate({ description: goalInput })}
            disabled={!goalInput.trim() || decomposeMutation.isPending}
          >
            {decomposeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
            Decompose
          </Button>

          {decomposeMutation.data && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Goal ID:</span>
                <span className="font-mono text-foreground">{decomposeMutation.data.goalId}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Tasks:</span>
                <Badge variant="secondary">{decomposeMutation.data.tasks.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Est. cost:</span>
                <span className="font-mono text-foreground">{decomposeMutation.data.estimatedCost}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent goals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Recent Goals</CardTitle>
        </CardHeader>
        <CardContent>
          {goalsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : goalsQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No goals yet. Decompose one above to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {goalsQuery.data?.map((goal: any) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoalId(goal.externalId === selectedGoalId ? null : goal.externalId)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
                    goal.externalId === selectedGoalId ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    goal.status === "completed" ? "bg-emerald-500" :
                    goal.status === "running" ? "bg-blue-500 animate-pulse" :
                    goal.status === "failed" ? "bg-red-500" : "bg-zinc-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{goal.title}</p>
                    <p className="text-xs text-muted-foreground">{goal.status}</p>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {new Date(goal.createdAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dependency Graph */}
      {selectedGoalId && goalDetailQuery.data && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Task Dependency Graph</CardTitle>
            <CardDescription>Visual DAG of task dependencies and execution flow</CardDescription>
          </CardHeader>
          <CardContent>
            {goalDetailQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <DependencyGraph tasks={goalDetailQuery.data.tasks as any} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Sovereign Panel ──
function SovereignPanel() {
  const circuitQuery = trpc.sovereign.circuitStatus.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const providersQuery = trpc.sovereign.providers.useQuery();
  const seedMutation = trpc.sovereign.seedProviders.useMutation({
    onSuccess: (data) => {
      toast.success("Default providers seeded");
      providersQuery.refetch();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Network className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Sovereign Router</h3>
          <p className="text-sm text-muted-foreground">Multi-provider routing + circuit breakers</p>
        </div>
      </div>

      {/* Circuit breaker status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Circuit Breaker Status</CardTitle>
        </CardHeader>
        <CardContent>
          {circuitQuery.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : circuitQuery.data && Object.keys(circuitQuery.data).length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No circuit breakers active. Seed providers to initialize.
            </div>
          ) : (
            <div className="space-y-2">
              {circuitQuery.data && Object.entries(circuitQuery.data).map(([provider, state]: [string, any]) => (
                <div key={provider} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30">
                  <StatusDot status={
                    state.state === "closed" ? "healthy" :
                    state.state === "half-open" ? "degraded" : "down"
                  } />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-foreground">{provider}</span>
                    <span className="text-xs text-muted-foreground ml-2">({state.state})</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {state.failures} failures
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Providers */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm">Providers</CardTitle>
            <CardDescription>Registered LLM providers</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
            Seed Defaults
          </Button>
        </CardHeader>
        <CardContent>
          {providersQuery.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : providersQuery.data?.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No providers registered. Click "Seed Defaults" to add built-in providers.
            </div>
          ) : (
            <div className="space-y-2">
              {providersQuery.data?.map((p: any) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <StatusDot status={p.isActive ? "healthy" : "down"} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">priority: {p.priority}</span>
                  </div>
                  <div className="flex gap-1">
                    {p.capabilities?.map((cap: string) => (
                      <Badge key={cap} variant="outline" className="text-[10px] px-1.5 py-0">{cap}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Compare Models */}
      <CompareModelsPanel />

      {/* Recent Routing Decisions */}
      <RoutingDecisionsTable />
    </div>
  );
}

/** Compare Models — side-by-side multi-provider synthesis */
function CompareModelsPanel() {
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const compareMutation = trpc.sovereign.compare.useMutation({
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Compared ${data.length} providers`);
    },
    onError: (err) => { toast.error(err.message); },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Compare Models
        </CardTitle>
        <CardDescription className="text-xs">
          Send the same prompt to multiple providers and compare responses side-by-side
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Textarea
            placeholder="Enter a prompt to compare across providers..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="flex-1 text-sm"
          />
          <Button
            onClick={() => compareMutation.mutate({ prompt, providers: [] })}
            disabled={!prompt.trim() || compareMutation.isPending}
            className="self-end"
          >
            {compareMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            Compare
          </Button>
        </div>

        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {results.map((r: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-lg border",
                  r.error ? "border-red-500/30 bg-red-500/5" : "border-border bg-muted/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status={r.error ? "down" : "healthy"} />
                    <span className="text-xs font-medium text-foreground">{r.provider}</span>
                  </div>
                  {r.latencyMs && (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {r.latencyMs}ms
                    </Badge>
                  )}
                </div>
                {r.error ? (
                  <p className="text-xs text-red-400">{r.error}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-6">
                      {r.response ?? r.output}
                    </p>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant={selectedIdx === i ? "default" : "outline"}
                        className="text-[10px] h-6 px-2"
                        onClick={() => {
                          setSelectedIdx(i);
                          toast.success(`Preferred: ${r.provider}`);
                          // Copy response to clipboard for easy use
                          navigator.clipboard.writeText(r.response ?? r.output ?? "").catch(() => {});
                        }}
                      >
                        {selectedIdx === i ? (
                          <><CheckCircle2 className="w-3 h-3 mr-1" /> Preferred</>
                        ) : (
                          "Select"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Recent routing decisions table — shows provider selection transparency */
function RoutingDecisionsTable() {
  const decisionsQuery = trpc.sovereign.recentDecisions.useQuery({ limit: 10 }, {
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Recent Routing Decisions
        </CardTitle>
        <CardDescription className="text-xs">
          Transparent log of which provider was selected for each request
        </CardDescription>
      </CardHeader>
      <CardContent>
        {decisionsQuery.isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : !decisionsQuery.data?.length ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No routing decisions recorded yet. Send a message to trigger routing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Provider</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium text-xs">Task Type</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Strategy</th>
                  <th className="text-center py-2 px-2 text-muted-foreground font-medium text-xs">Status</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium text-xs">Time</th>
                </tr>
              </thead>
              <tbody>
                {decisionsQuery.data.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <StatusDot status={d.success ? "healthy" : "down"} />
                        <span className="font-medium text-foreground text-xs">{d.chosenProvider}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{d.taskType}</td>
                    <td className="py-2 px-2 text-center">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">{d.strategy}</Badge>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {d.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 mx-auto" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-right text-xs text-muted-foreground">
                      {d.createdAt ? new Date(d.createdAt).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Dashboard ──
export default function SovereignDashboard() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-amber-500/20 flex items-center justify-center">
            <Layers className="w-6 h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Sovereign AI</h1>
            <p className="text-sm text-muted-foreground">4-Layer Agent Stack Control Center</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid grid-cols-2 sm:grid-cols-4 w-full sm:w-auto sm:inline-flex h-auto gap-1">
          <TabsTrigger value="overview" className="gap-1.5 min-h-[44px] text-sm">
            <BarChart3 className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="aegis" className="gap-1.5 min-h-[44px] text-sm">
            <Shield className="w-4 h-4" /> AEGIS
          </TabsTrigger>
          <TabsTrigger value="atlas" className="gap-1.5 min-h-[44px] text-sm">
            <Brain className="w-4 h-4" /> ATLAS
          </TabsTrigger>
          <TabsTrigger value="sovereign" className="gap-1.5 min-h-[44px] text-sm">
            <Network className="w-4 h-4" /> Sovereign
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Overview metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard label="AEGIS Sessions" value="—" icon={Shield} trend="Pre/post-flight pipeline" />
            <MetricCard label="ATLAS Goals" value="—" icon={Brain} trend="Goal decomposition kernel" />
            <MetricCard label="Sovereign Routes" value="—" icon={Network} trend="Multi-provider routing" />
            <MetricCard label="System Health" value="OK" icon={Activity} trend="All layers operational" />
          </div>

          {/* Architecture overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Architecture</CardTitle>
              <CardDescription>4-layer agent stack data flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { layer: "Layer 4", name: "manus-next-app", desc: "Frontend + tRPC API surface", color: "bg-zinc-500/10 text-zinc-500", icon: Layers },
                  { layer: "Layer 3", name: "Sovereign Router", desc: "Multi-provider routing, circuit breakers, guardrails", color: "bg-amber-500/10 text-amber-500", icon: Network },
                  { layer: "Layer 2", name: "ATLAS Kernel", desc: "Goal decomposition, DAG execution, budget guards, reflection", color: "bg-purple-500/10 text-purple-500", icon: Brain },
                  { layer: "Layer 1", name: "AEGIS Pipeline", desc: "Pre/post-flight, classification, caching, quality scoring, lessons", color: "bg-blue-500/10 text-blue-500", icon: Shield },
                ].map((l, i) => (
                  <div key={l.layer} className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", l.color)}>
                      <l.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{l.layer}</Badge>
                        <span className="text-sm font-semibold text-foreground">{l.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                    </div>
                    <StatusDot status="healthy" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aegis">
          <AegisPanel />
        </TabsContent>

        <TabsContent value="atlas">
          <AtlasPanel />
        </TabsContent>

        <TabsContent value="sovereign">
          <SovereignPanel />
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}
