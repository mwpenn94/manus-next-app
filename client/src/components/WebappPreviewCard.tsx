/**
 * WebappPreviewCard — Full Manus-parity webapp card for chat context
 *
 * Features:
 * - Live iframe preview with real-time updates
 * - Device selector (desktop/tablet/mobile) for responsive testing
 * - Management tabs (Preview/Code/Dashboard/Settings)
 * - Expand/minimize (Maximize/Minimize) controls
 * - Status badge (Published/Running/Deploying)
 * - URL bar with copy
 * - Visit and Manage buttons
 */
import { useState, useCallback, useRef } from "react";
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  CheckCircle,
  Loader2,
  Settings,
  Monitor,
  Tablet,
  Smartphone,
  Maximize,
  Minimize,
  Code,
  LayoutDashboard,
  RefreshCw,
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

type DeviceType = "desktop" | "tablet" | "mobile";
type TabType = "Preview" | "Code" | "Dashboard" | "Settings";

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const DEVICE_ICONS: Record<DeviceType, typeof Monitor> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

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
  refreshKey,
}: WebappPreviewCardProps) {
  const [copied, setCopied] = useState(false);
  const [device, setDevice] = useState<DeviceType>("desktop");
  const [activeTab, setActiveTab] = useState<TabType>("Preview");
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [, navigate] = useLocation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isPublished = status === "published" || !!publishedUrl;
  const isDeploying = status === "deploying";

  // Determine the best URL to show and link to
  const liveUrl = publishedUrl || (domain ? (domain.startsWith("http") ? domain : `https://${domain}`) : "");
  const displayUrl = liveUrl ? liveUrl.replace(/^https?:\/\//, "") : "";
  const iframeSrc = previewUrl || liveUrl;

  const handleCopy = useCallback(() => {
    if (!liveUrl && !previewUrl) return;
    navigator.clipboard.writeText(liveUrl || previewUrl || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [liveUrl, previewUrl]);

  const handleVisit = useCallback(() => {
    if (liveUrl) {
      window.open(liveUrl, "_blank");
    } else if (previewUrl) {
      window.open(previewUrl, "_blank");
    }
    onVisit?.();
  }, [liveUrl, previewUrl, onVisit]);

  const handleRefresh = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  // Status configuration
  const statusConfig = isPublished
    ? { icon: CheckCircle, label: "Published", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" }
    : isDeploying
      ? { icon: Loader2, label: "Deploying...", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" }
      : { icon: Globe, label: "Running", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };

  const StatusIcon = statusConfig.icon;

  // Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "Preview":
        return (
          <div className="relative bg-muted/20 flex items-center justify-center overflow-hidden" style={{ height: isExpanded ? "70vh" : "320px" }}>
            {iframeSrc ? (
              <div
                className="h-full transition-all duration-300 bg-white"
                style={{ width: DEVICE_WIDTHS[device], maxWidth: "100%" }}
              >
                <iframe
                  ref={iframeRef}
                  key={`${iframeKey}-${refreshKey || 0}`}
                  src={iframeSrc}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title={`${appName} preview`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">Building preview...</span>
              </div>
            )}
          </div>
        );
      case "Code":
        return (
          <div className="p-4 bg-muted/20" style={{ height: isExpanded ? "70vh" : "320px" }}>
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Code className="w-8 h-8 mx-auto opacity-50" />
                <p>View and edit project files</p>
                {projectExternalId && (
                  <button
                    onClick={() => navigate(`/projects/webapp/${projectExternalId}`)}
                    className="text-primary hover:underline text-xs"
                  >
                    Open in project manager →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case "Dashboard":
        return (
          <div className="p-4 bg-muted/20" style={{ height: isExpanded ? "70vh" : "320px" }}>
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <LayoutDashboard className="w-8 h-8 mx-auto opacity-50" />
                <p>Analytics and monitoring</p>
                {projectExternalId && (
                  <button
                    onClick={() => navigate(`/projects/webapp/${projectExternalId}`)}
                    className="text-primary hover:underline text-xs"
                  >
                    Open dashboard →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      case "Settings":
        return (
          <div className="p-4 bg-muted/20" style={{ height: isExpanded ? "70vh" : "320px" }}>
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center space-y-2">
                <Settings className="w-8 h-8 mx-auto opacity-50" />
                <p>Project settings and configuration</p>
                {projectExternalId && (
                  <button
                    onClick={() => navigate(`/projects/webapp/${projectExternalId}`)}
                    className="text-primary hover:underline text-xs"
                  >
                    Open settings →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden w-full transition-all duration-300",
        isExpanded ? "max-w-4xl" : "max-w-lg",
        className
      )}
    >
      {/* Header: icon + app name + status badge + expand/minimize */}
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
        {/* Maximize / Minimize toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={isExpanded ? "Minimize" : "Maximize"}
        >
          {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>

      {/* Management tabs: Preview / Code / Dashboard / Settings */}
      <div className="flex items-center border-b border-border bg-muted/30">
        {(["Preview", "Code", "Dashboard", "Settings"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-xs font-medium text-center transition-colors border-b-2",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Device selector + refresh (only visible on Preview tab) */}
      {activeTab === "Preview" && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
          <div className="flex items-center gap-1">
            {(["desktop", "tablet", "mobile"] as DeviceType[]).map((d) => {
              const Icon = DEVICE_ICONS[d];
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  className={cn(
                    "p-1.5 rounded-md transition-colors",
                    device === d
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  title={d.charAt(0).toUpperCase() + d.slice(1)}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Refresh preview"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tab content */}
      {renderTabContent()}

      {/* URL bar — only shown when there's a URL to display */}
      {(displayUrl || previewUrl || isDeploying) && (
        <div className="px-4 py-2.5 border-t border-border">
          <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 border border-border/50 min-w-0">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {displayUrl || previewUrl ? (
              <a
                href={liveUrl || previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline truncate flex-1 font-mono min-w-0"
              >
                {displayUrl || previewUrl?.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono italic min-w-0">
                Deploying...
              </span>
            )}
            {(displayUrl || previewUrl) && (
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
