/**
 * DeploymentCard — Manus-style card shown in chat when a webapp is deployed.
 *
 * Features:
 * - Live URL with visit button (guards against empty URL)
 * - Deployment status badge (live/deploying/failed)
 * - Version label
 * - Manage Project link
 * - Copy URL button with visual feedback
 */
import { useState, useCallback } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  Rocket,
  Settings,
  CheckCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface DeploymentCardProps {
  appName: string;
  deployedUrl: string;
  projectExternalId?: string;
  versionLabel?: string;
  status?: "live" | "deploying" | "failed";
  className?: string;
}

export default function DeploymentCard({
  appName,
  deployedUrl,
  projectExternalId,
  versionLabel,
  status = "live",
  className,
}: DeploymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const handleCopy = useCallback(() => {
    if (!deployedUrl) return;
    navigator.clipboard.writeText(deployedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [deployedUrl]);

  const statusConfig = {
    live: {
      icon: CheckCircle,
      label: "Live",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    deploying: {
      icon: Loader2,
      label: "Deploying...",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    failed: {
      icon: XCircle,
      label: "Failed",
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  // Clean display URL — strip protocol for display
  const displayUrl = deployedUrl ? deployedUrl.replace(/^https?:\/\//, "") : "";

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden max-w-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          status === "failed" ? "bg-red-500/10" : "bg-emerald-500/10"
        )}>
          <Rocket className={cn(
            "w-4.5 h-4.5",
            status === "failed" ? "text-red-400" : "text-emerald-400"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {appName}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                config.bg,
                config.color,
                config.border,
                "border"
              )}
            >
              <StatusIcon
                className={cn(
                  "w-2.5 h-2.5",
                  status === "deploying" && "animate-spin"
                )}
              />
              {config.label}
            </div>
            {versionLabel && (
              <span className="text-[10px] text-muted-foreground">
                {versionLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* URL bar */}
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50">
          <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {displayUrl ? (
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline truncate flex-1 font-mono"
            >
              {displayUrl}
            </a>
          ) : (
            <span className="text-xs text-muted-foreground truncate flex-1 font-mono italic">
              {status === "deploying" ? "Deploying..." : "URL not available"}
            </span>
          )}
          {displayUrl && (
            <button
              onClick={handleCopy}
              className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        {deployedUrl ? (
          <a
            href={deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit Site
          </a>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {status === "deploying" ? "Deploying..." : "URL Pending"}
          </div>
        )}
        {projectExternalId && (
          <button
            onClick={() => navigate(`/projects/webapp/${projectExternalId}`)}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage
          </button>
        )}
      </div>
    </div>
  );
}
