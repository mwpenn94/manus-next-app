import { useState } from "react";
import {
  GitBranch,
  GitCommit,
  Clock,
  RotateCcw,
  Eye,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  Rocket,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WebAppVersionDiffViewProps {
  projectExternalId?: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "live": return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500 font-medium">LIVE</span>;
    case "building": return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">BUILDING</span>;
    case "failed": return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">FAILED</span>;
    case "superseded": return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">SUPERSEDED</span>;
    default: return <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{status?.toUpperCase()}</span>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "live": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "building": return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    case "failed": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <GitCommit className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function WebAppVersionDiffView({ projectExternalId }: WebAppVersionDiffViewProps): React.JSX.Element {
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: deployments = [], isLoading } = trpc.webappProject.deployments.useQuery(
    { externalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId }
  );

  const rollback = trpc.webappProject.rollbackDeployment.useMutation({
    onSuccess: (data) => {
      utils.webappProject.deployments.invalidate({ externalId: projectExternalId ?? "" });
      toast.success(`Rolled back to ${data.rolledBackTo}`);
    },
    onError: (err) => { toast.error(`Rollback failed: ${err.message}`); },
  });

  const { data: buildLog } = trpc.webappProject.getDeploymentLog.useQuery(
    { deploymentId: selectedDeploymentId! },
    { enabled: !!selectedDeploymentId }
  );

  const selectedDeployment = deployments.find((d: any) => d.id === selectedDeploymentId);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Version History</h2>
            <p className="text-xs text-muted-foreground">{deployments.length} deployments</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !projectExternalId && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <GitBranch className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Select a project to view version history.</p>
          </div>
        </div>
      )}

      {!isLoading && projectExternalId && deployments.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Rocket className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No deployments yet.</p>
            <p className="text-xs mt-1">Deploy your project to start tracking versions.</p>
          </div>
        </div>
      )}

      {deployments.length > 0 && (
        <div className="flex flex-1 overflow-hidden">
          {/* Version List */}
          <div className="w-80 border-r border-border overflow-y-auto">
            {deployments.map((dep: any) => (
              <button
                key={dep.id}
                className={cn(
                  "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                  selectedDeploymentId === dep.id ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/30"
                )}
                onClick={() => setSelectedDeploymentId(dep.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(dep.status)}
                  <span className="text-xs font-semibold">
                    {dep.versionLabel || `Deployment #${dep.id}`}
                  </span>
                  {getStatusBadge(dep.status)}
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 ml-6">
                  {dep.commitMessage || "No commit message"}
                </p>
                <div className="flex items-center gap-3 mt-1 ml-6 text-[9px] text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {dep.createdAt ? new Date(dep.createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="flex-1 overflow-y-auto p-5">
            {!selectedDeployment && (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a deployment to view details.</p>
                </div>
              </div>
            )}

            {selectedDeployment && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      {getStatusIcon(selectedDeployment.status)}
                      {selectedDeployment.versionLabel || `Deployment #${selectedDeployment.id}`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedDeployment.commitMessage || "No commit message"}
                    </p>
                  </div>
                  {selectedDeployment.status !== "building" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => rollback.mutate({ externalId: projectExternalId!, deploymentId: selectedDeployment.id })}
                      disabled={rollback.isPending}
                    >
                      {rollback.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                      Restore This Version
                    </Button>
                  )}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                    <div className="flex items-center gap-1.5">
                      {getStatusBadge(selectedDeployment.status)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <p className="text-[10px] text-muted-foreground mb-1">Deployed</p>
                    <p className="text-xs font-medium">
                      {selectedDeployment.createdAt ? new Date(selectedDeployment.createdAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>

                {/* Build Log */}
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5" />
                    Build Log
                  </h4>
                  <div className="p-3 rounded-lg bg-card border border-border max-h-64 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {buildLog
                        ? (typeof buildLog === "string" ? buildLog : (buildLog as any)?.log ?? "No build log available.")
                        : "Loading build log..."}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
