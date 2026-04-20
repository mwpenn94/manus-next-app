/**
 * WebappPreviewCard — Manus-style inline card showing deployed webapp preview
 *
 * Matches the Manus pattern: Globe icon, app name, publish status + timestamp,
 * full-width screenshot preview, Settings/Publish buttons at bottom.
 */
import { Globe, Settings, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebappPreviewCardProps {
  appName: string;
  domain?: string;
  status: "published" | "not_published" | "deploying";
  lastUpdated?: string;
  previewUrl?: string;
  screenshotUrl?: string;
  onSettings?: () => void;
  onPublish?: () => void;
  onVisit?: () => void;
  hasUnpublishedChanges?: boolean;
  className?: string;
}

export default function WebappPreviewCard({
  appName,
  domain,
  status,
  lastUpdated,
  previewUrl,
  screenshotUrl,
  onSettings,
  onPublish,
  onVisit,
  hasUnpublishedChanges,
  className,
}: WebappPreviewCardProps) {
  const statusText = status === "published" ? "Published" : status === "deploying" ? "Deploying..." : "Not published";
  const statusColor = status === "published" ? "text-emerald-500" : status === "deploying" ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className={cn("bg-card border border-border rounded-xl overflow-hidden max-w-lg", className)}>
      {/* Header: Globe icon, app name, status */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">{appName}</h4>
          <p className="text-xs text-muted-foreground">
            <span className={statusColor}>{statusText}</span>
            {lastUpdated && <> · {lastUpdated}</>}
            {domain && <> · {domain}</>}
          </p>
        </div>
        {previewUrl && (
          <button
            onClick={onVisit}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Screenshot preview */}
      {screenshotUrl && (
        <div
          className="relative w-full aspect-[16/10] bg-muted cursor-pointer group"
          onClick={onVisit}
        >
          <img
            src={screenshotUrl}
            alt={`${appName} preview`}
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
        </div>
      )}

      {/* Placeholder when no screenshot */}
      {!screenshotUrl && (
        <div className="w-full aspect-[16/10] bg-muted/50 flex items-center justify-center">
          <div className="text-center">
            <Globe className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground/60">Preview not available</p>
          </div>
        </div>
      )}

      {/* Action buttons: Settings / Publish */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={onSettings}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <div className="relative flex-1">
          <button
            onClick={onPublish}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            Publish
          </button>
          {hasUnpublishedChanges && (
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
          )}
        </div>
      </div>
    </div>
  );
}
