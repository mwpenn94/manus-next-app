import { useState } from "react";
import {
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Plus,
  Trash2,
  Play,
  Pause,
  Loader2,
  ArrowRight,
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

export default function DataIntegrationMonitor(): React.JSX.Element {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState<number | null>(null);
  const [newPipeline, setNewPipeline] = useState({ name: "", description: "", pipelineType: "etl" });

  const utils = trpc.useUtils();
  const { data: pipelines = [], isLoading } = trpc.pipeline.list.useQuery();
  const { data: selectedRuns = [] } = trpc.pipeline.runs.useQuery(
    { pipelineId: selectedPipeline! },
    { enabled: !!selectedPipeline }
  );

  const createPipeline = trpc.pipeline.create.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
      setShowCreate(false);
      setNewPipeline({ name: "", description: "", pipelineType: "etl" });
    },
  });
  const updatePipeline = trpc.pipeline.update.useMutation({
    onSuccess: () => utils.pipeline.list.invalidate(),
  });
  const deletePipeline = trpc.pipeline.delete.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
      setSelectedPipeline(null);
    },
  });
  const startRun = trpc.pipeline.startRun.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
      if (selectedPipeline) utils.pipeline.runs.invalidate({ pipelineId: selectedPipeline });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error": return <XCircle className="w-4 h-4 text-red-500" />;
      case "paused": return <Pause className="w-4 h-4 text-amber-500" />;
      case "running": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-500/10 text-green-500",
      error: "bg-red-500/10 text-red-500",
      paused: "bg-amber-500/10 text-amber-500",
      running: "bg-blue-500/10 text-blue-500",
      draft: "bg-muted text-muted-foreground",
      archived: "bg-muted text-muted-foreground",
    };
    return (
      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full capitalize", styles[status] || styles.draft)}>
        {status}
      </span>
    );
  };

  const activeCount = pipelines.filter((p: any) => p.status === "active").length;
  const totalRuns = pipelines.reduce((sum: number, p: any) => sum + (p.runCount ?? 0), 0);
  const selected = selectedPipeline ? pipelines.find((p: any) => p.id === selectedPipeline) : null;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Data Integration</h2>
            <p className="text-xs text-muted-foreground">
              {pipelines.length} pipelines · {activeCount} active · {totalRuns} total runs
            </p>
          </div>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Pipeline
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Pipeline</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Input
                placeholder="Pipeline name"
                value={newPipeline.name}
                onChange={(e) => setNewPipeline({ ...newPipeline, name: e.target.value })}
              />
              <textarea
                placeholder="Description (optional)"
                value={newPipeline.description}
                onChange={(e) => setNewPipeline({ ...newPipeline, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={newPipeline.pipelineType}
                onChange={(e) => setNewPipeline({ ...newPipeline, pipelineType: e.target.value })}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="etl">ETL (Extract-Transform-Load)</option>
                <option value="sync">Data Sync</option>
                <option value="stream">Real-time Stream</option>
                <option value="batch">Batch Processing</option>
              </select>
              <Button
                onClick={() => createPipeline.mutate({
                  name: newPipeline.name,
                  description: newPipeline.description || undefined,
                  pipelineType: newPipeline.pipelineType,
                })}
                className="w-full"
                disabled={!newPipeline.name.trim() || createPipeline.isPending}
              >
                {createPipeline.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Create Pipeline
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Pipeline List */}
        <div className={cn("overflow-y-auto border-r border-border", selected ? "w-80" : "flex-1")}>
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && pipelines.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No pipelines yet.</p>
              <p className="text-xs mt-1">Create a pipeline to start integrating data.</p>
            </div>
          )}

          {!isLoading && pipelines.map((pipeline: any) => (
            <button
              key={pipeline.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                selectedPipeline === pipeline.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedPipeline(pipeline.id)}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(pipeline.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{pipeline.name}</span>
                    {getStatusBadge(pipeline.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {pipeline.pipelineType} · {pipeline.runCount ?? 0} runs
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{(selected as any).name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{(selected as any).description || "No description"}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => startRun.mutate({ pipelineId: (selected as any).id })}
                  disabled={startRun.isPending}
                >
                  {startRun.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Run Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => updatePipeline.mutate({
                    id: (selected as any).id,
                    status: (selected as any).status === "active" ? "paused" : "active",
                  })}
                >
                  {(selected as any).status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {(selected as any).status === "active" ? "Pause" : "Activate"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => deletePipeline.mutate({ id: (selected as any).id })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Pipeline Info */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <p className="text-lg font-bold text-foreground">{(selected as any).runCount ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">Total Runs</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <p className="text-lg font-bold text-foreground capitalize">{(selected as any).pipelineType}</p>
                <p className="text-[10px] text-muted-foreground">Type</p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <p className="text-lg font-bold text-foreground capitalize">{(selected as any).status}</p>
                <p className="text-[10px] text-muted-foreground">Status</p>
              </div>
            </div>

            {/* Transform Steps Visualization */}
            {(selected as any).transformSteps && (selected as any).transformSteps.length > 0 && (
              <div className="mb-5">
                <h4 className="text-sm font-medium mb-3">Transform Pipeline</h4>
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {((selected as any).transformSteps as any[]).map((step: any, idx: number, arr: any[]) => (
                    <div key={idx} className="flex items-center">
                      <div className="px-3 py-2 rounded-lg border bg-primary/5 border-primary/20 text-center min-w-[100px]">
                        <p className="text-xs font-medium">{step.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{step.type}</p>
                      </div>
                      {idx < arr.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground mx-1 shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run History */}
            <h4 className="text-sm font-medium mb-3">Run History</h4>
            {selectedRuns.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Activity className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No runs yet. Click "Run Now" to start.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRuns.map((run: any) => (
                  <div key={run.id} className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <span className="text-xs font-medium capitalize">{run.status}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span>{run.recordsProcessed ?? 0} records processed</span>
                      {run.recordsFailed > 0 && (
                        <span className="text-red-500">{run.recordsFailed} failed</span>
                      )}
                      {run.durationMs && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
