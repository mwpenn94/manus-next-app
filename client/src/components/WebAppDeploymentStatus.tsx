import { useState } from "react";
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  Server,
  Globe,
  ExternalLink,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

interface WebAppDeploymentStatusProps {
  projectExternalId?: string;
}

function statusIcon(status: string) {
  switch (status) {
    case "live": case "success": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "building": case "deploying": case "pending": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case "failed": case "error": return <XCircle className="w-4 h-4 text-red-500" />;
    case "queued": return <Clock className="w-4 h-4 text-muted-foreground" />;
    default: return <Server className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function WebAppDeploymentStatus({ projectExternalId }: WebAppDeploymentStatusProps): React.JSX.Element {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: deployments = [], isLoading } = trpc.webappProject.deployments.useQuery(
    { externalId: projectExternalId ?? "" },
    { enabled: !!projectExternalId, refetchInterval: 10_000 }
  );

  const { data: buildLog } = trpc.webappProject.getDeploymentLog.useQuery(
    { deploymentId: expandedId! },
    { enabled: !!expandedId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const deploys = deployments as any[];

  if (deploys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Rocket className="w-8 h-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No deployments yet</p>
        <p className="text-xs mt-1">Deploy your project to see status here.</p>
      </div>
    );
  }

  const latest = deploys[0];
  const isComplete = latest?.status === "live" || latest?.status === "success";

  return (
    <div className="flex flex-col bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-5 py-4 border-b transition-colors",
        isComplete ? "bg-green-500/5 border-green-500/20" : "bg-card/50 border-border"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            isComplete ? "bg-green-500/10" : "bg-primary/10"
          )}>
            {isComplete ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Rocket className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h2 className="text-base font-semibold">Deployments</h2>
            <p className="text-xs text-muted-foreground">{deploys.length} total</p>
          </div>
        </div>
      </div>

      {/* Deployment List */}
      <div className="overflow-y-auto max-h-96">
        {deploys.map((d: any) => (
          <div
            key={d.id}
            className={cn(
              "border-b border-border/50 transition-colors",
              expandedId === d.id ? "bg-card" : "hover:bg-card/50"
            )}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
            >
              {statusIcon(d.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">
                    {d.commitMessage || `Deployment #${d.id}`}
                  </span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                    d.status === "live" || d.status === "success" ? "bg-green-500/10 text-green-500" :
                    d.status === "failed" || d.status === "error" ? "bg-red-500/10 text-red-500" :
                    "bg-amber-500/10 text-amber-500"
                  )}>
                    {d.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {d.createdAt ? new Date(d.createdAt).toLocaleString() : ""}
                  {d.duration ? ` · ${d.duration}s` : ""}
                </p>
              </div>
              <Terminal className="w-3.5 h-3.5 text-muted-foreground/50" />
            </button>

            {expandedId === d.id && (
              <div className="px-4 pb-3 border-t border-border/50">
                <div className="mt-2 bg-[#0d1117] rounded-lg p-3 max-h-48 overflow-y-auto font-mono text-[10px] text-green-400/80">
                  {buildLog ? (
                    <pre className="whitespace-pre-wrap leading-relaxed">
                      {typeof buildLog === "string" ? buildLog : JSON.stringify(buildLog, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted-foreground">Loading build log...</p>
                  )}
                </div>
                {d.url && (
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-2"
                  >
                    <Globe className="w-3 h-3" />
                    {d.url}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
