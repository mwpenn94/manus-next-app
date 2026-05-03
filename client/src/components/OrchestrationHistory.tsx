/**
 * OrchestrationHistory — Component for viewing past multi-agent orchestration runs.
 * Shows run history with expandable details for each agent's output and quality scores.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Users, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  BarChart3, Brain, Zap
} from "lucide-react";

interface OrchestrationRun {
  id: number;
  externalId: string;
  userId: number;
  taskExternalId: string | null;
  goal: string;
  context: string | null;
  status: "planning" | "executing" | "completed" | "failed" | "cancelled";
  agentCount: number;
  taskCount: number;
  completedCount: number;
  failedCount: number;
  avgQuality: number;
  durationMs: number | null;
  plan: any;
  taskResults: any;
  finalResult: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function OrchestrationHistory({ taskId }: { taskId?: number }) {
  const [expandedRun, setExpandedRun] = useState<number | null>(null);

  const { data: runs, isLoading } = trpc.orchestration.listRuns.useQuery(
    { taskId, limit: 20 },
    { enabled: true }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Orchestration History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!runs || runs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Orchestration History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-4">
            No orchestration runs yet. Multi-agent tasks will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="w-4 h-4" />
          Orchestration History
          <Badge variant="secondary" className="text-xs ml-auto">
            {runs.length} runs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {runs.map((run) => {
          const isExpanded = expandedRun === run.id;
          const statusColor = run.status === "completed" ? "text-emerald-400" :
            run.status === "failed" ? "text-red-400" : "text-amber-400";

          return (
            <div key={run.id} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{run.goal}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {run.durationMs ? `${Math.round(run.durationMs / 1000)}s` : "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Brain className="w-2.5 h-2.5" />
                      {run.agentCount} agents
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      {run.completedCount}/{run.taskCount} tasks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {run.avgQuality != null && (
                    <span className={cn(
                      "text-[10px] font-mono",
                      run.avgQuality >= 80 ? "text-emerald-400" :
                      run.avgQuality >= 60 ? "text-amber-400" : "text-red-400"
                    )}>
                      {Math.round(run.avgQuality)}%
                    </span>
                  )}
                  {run.status === "completed" ? (
                    <CheckCircle2 className={cn("w-4 h-4", statusColor)} />
                  ) : (
                    <XCircle className={cn("w-4 h-4", statusColor)} />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 border-t border-border bg-muted/20">
                  <div className="pt-2 space-y-2">
                    {/* Plan details */}
                    {!!run.plan && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Execution Plan
                        </p>
                        <div className="text-xs text-foreground bg-card rounded p-2 border border-border">
                          <pre className="whitespace-pre-wrap font-mono text-[10px]">
                            {JSON.stringify(run.plan, null, 2).slice(0, 1000)}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Results */}
                    {!!run.taskResults && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                          Agent Results
                        </p>
                        <div className="text-xs text-foreground bg-card rounded p-2 border border-border max-h-48 overflow-y-auto">
                          <pre className="whitespace-pre-wrap font-mono text-[10px]">
                            {JSON.stringify(run.taskResults, null, 2).slice(0, 2000)}
                          </pre>
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                      Run at {run.createdAt instanceof Date ? run.createdAt.toLocaleString() : new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
