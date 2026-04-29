/**
 * WebappPreviewCard — Compact Manus-style webapp card for chat context
 *
 * Pass 67: Complete rewrite for Manus parity+
 * - No iframe, no device toggles, no tabs, no management panel
 * - Just: app name, status badge, URL bar with copy, Visit button
 * - Evolves in-place from "running" → "published" via updateMessageCard
 * - Compact, clean, never causes vertical text or overflow
 */
import { useState, useCallback } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  Loader2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface WebappPreviewCardProps {
  appName: string;
  domain?: string;
  status: "published" | "not_published" | "deploying" | "running";
  lastUpdated?: string;
  previewUrl?: string;
  publishedUrl?: string;
  screenshotUrl?: string;
  onSettings?: () => void;
  onPublish?: () => void;
  onVisit?: () => void;
  hasUnpublishedChanges?: boolean;
  className?: string;
  projectFiles?: { name: string; path: string; type: "file" | "dir" }[];
  gitStatus?: string;
  port?: number;
  projectExternalId?: string;
  refreshKey?: number;
}

export default function WebappPreviewCard({
  appName,
  domain,
  status,
  lastUpdated,
  previewUrl,
  publishedUrl,
  onSettings,
  onPublish,
  onVisit,
  hasUnpublishedChanges,
  className,
  projectExternalId,
}: WebappPreviewCardProps) {
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const isPublished = status === "published" || !!publishedUrl;
  const isDeploying = status === "deploying";

  // Determine the best URL to show and link to
  const liveUrl = publishedUrl || (domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : "");
  const displayUrl = liveUrl ? liveUrl.replace(/^https?:\/\//, "") : "";

  const handleCopy = useCallback(() => {
    if (!liveUrl) return;
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [liveUrl]);

  const handleVisit = useCallback(() => {
    if (liveUrl) {
      window.open(liveUrl, "_blank");
    } else if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
    onVisit?.();
  }, [liveUrl, previewUrl, onVisit]);

  // Status configuration
  const statusConfig = isPublished
    ? { icon: CheckCircle, label: "Published", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
    : isDeploying
      ? { icon: Loader2, label: "Deploying...", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
      : { icon: Globe, label: "Running", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden max-w-md w-full",
        className
      )}
    >
      {/* Header: icon + app name + status badge */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
          isPublished ? "bg-emerald-500/10" : "bg-blue-500/10"
        )}>
          <Globe className={cn(
            "w-4.5 h-4.5",
            isPublished ? "text-emerald-400" : "text-blue-400"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {appName}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            <div
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
                statusConfig.bg,
                statusConfig.color,
                statusConfig.border,
              )}
            >
              <StatusIcon
                className={cn(
                  "w-2.5 h-2.5",
                  isDeploying && "animate-spin"
                )}
              />
              {statusConfig.label}
            </div>
            {lastUpdated && (
              <span className="text-[10px] text-muted-foreground">
                {lastUpdated}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* URL bar — only shown when there's a URL to display */}
      {(displayUrl || isDeploying) && (
        <div className="px-4 py-2.5">
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50 min-w-0">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {displayUrl ? (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate flex-1 font-mono min-w-0"
              >
                {displayUrl}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono italic min-w-0">
                Deploying...
              </span>
            )}
            {displayUrl && (
              <button
                onClick={handleCopy}
                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        {(liveUrl || previewUrl) ? (
          <button
            onClick={handleVisit}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {isPublished ? "Visit Site" : "Open Preview"}
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Building...
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
