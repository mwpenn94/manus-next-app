/**
 * WebappPreviewCard — Manus-style inline card with live iframe preview and management panel
 *
 * Features:
 * - Live iframe preview of the running dev server OR deployed URL
 * - When publishedUrl is available (post-deploy), uses it as iframe src (no proxy dependency)
 * - Falls back to /api/webapp-preview/ proxy for localhost dev server URLs
 * - Management tabs: Preview, Code, Dashboard, Settings
 * - Globe icon, app name, publish status + timestamp
 * - Full-width preview area with responsive device toggles
 * - Settings/Publish buttons at bottom
 * - Auto-retry with exponential backoff for dev server startup
 * - Auto-refresh on file changes via refreshKey prop
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  Globe,
  Settings,
  ExternalLink,
  Code2,
  BarChart3,
  RefreshCw,
  Maximize2,
  Minimize2,
  Monitor,
  Smartphone,
  Tablet,
  Copy,
  Check,
  FolderTree,
  GitBranch,
  Terminal,
  X,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ManagementTab = "preview" | "code" | "dashboard" | "settings";
type DeviceView = "desktop" | "tablet" | "mobile";

interface WebappPreviewCardProps {
  appName: string;
  domain?: string;
  status: "published" | "not_published" | "deploying" | "running";
  lastUpdated?: string;
  previewUrl?: string;
  /** The live deployed URL (S3/CloudFront). When set, iframe uses this instead of proxy. */
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
  screenshotUrl,
  onSettings,
  onPublish,
  onVisit,
  hasUnpublishedChanges,
  className,
  projectFiles,
  gitStatus,
  port,
  projectExternalId,
  refreshKey,
}: WebappPreviewCardProps) {
  const [activeTab, setActiveTab] = useState<ManagementTab>("preview");
  const [deviceView, setDeviceView] = useState<DeviceView>("desktop");
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine the best URL for the iframe:
  // 1. If publishedUrl is available (post-deploy), use it directly — no proxy needed
  // 2. If previewUrl is a localhost URL or relative proxy path, use the proxy endpoint
  // 3. Otherwise use previewUrl as-is (fallback to proxy)
  const effectiveUrl = useMemo(() => {
    if (publishedUrl) return publishedUrl;
    if (previewUrl?.startsWith("http://localhost")) return `/api/webapp-preview/`;
    if (previewUrl?.startsWith("/api/webapp-preview")) return previewUrl;
    return previewUrl || `/api/webapp-preview/`;
  }, [publishedUrl, previewUrl]);

  // The display URL shown in the URL bar — NEVER show localhost to the user
  const displayUrl = useMemo(() => {
    if (publishedUrl) {
      // Show clean domain without protocol
      return publishedUrl.replace(/^https?:\/\//, "");
    }
    if (domain) return domain;
    // For dev preview, show the app name instead of localhost
    return `${appName || "app"} \u00b7 Dev Preview`;
  }, [publishedUrl, domain, appName]);

  // The URL to copy when user clicks the copy button
  // For dev preview, construct the full proxy URL using current origin
  const copyableUrl = useMemo(() => {
    if (publishedUrl) return publishedUrl;
    if (domain) return domain.startsWith("http") ? domain : `https://${domain}`;
    return `${window.location.origin}/api/webapp-preview/`;
  }, [publishedUrl, domain]);

  const [iframeSrc, setIframeSrc] = useState(effectiveUrl);
  const [copied, setCopied] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [proxyFailed, setProxyFailed] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update iframe src when effectiveUrl changes (e.g., publishedUrl becomes available)
  useEffect(() => {
    if (effectiveUrl && effectiveUrl !== iframeSrc) {
      setIframeSrc(effectiveUrl);
      setIframeLoading(true);
      setIframeError(false);
      setProxyFailed(false);
      retryCountRef.current = 0;
      if (iframeRef.current) {
        iframeRef.current.src = effectiveUrl;
      }
    }
  }, [effectiveUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup retry timers
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // GAP A: Auto-refresh iframe when agent edits files
  useEffect(() => {
    if (refreshKey && refreshKey > 0 && iframeRef.current && activeTab === "preview") {
      // Small delay to let Vite HMR process the change
      const timer = setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = iframeRef.current.src;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [refreshKey, activeTab]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoading(false);
    setIframeError(false);
    setProxyFailed(false);
    retryCountRef.current = 0;
  }, []);

  const handleIframeError = useCallback(() => {
    setIframeError(true);
    setIframeLoading(false);

    // If we're using the proxy and it failed after max retries, mark proxy as failed
    // so we can show a helpful message about the dev server being stopped
    if (retryCountRef.current >= 5 && !publishedUrl) {
      setProxyFailed(true);
      return;
    }

    // Auto-retry up to 5 times with increasing delay
    if (retryCountRef.current < 5) {
      const delay = Math.min(2000 * (retryCountRef.current + 1), 8000);
      retryCountRef.current++;
      retryTimerRef.current = setTimeout(() => {
        setIframeLoading(true);
        setIframeError(false);
        if (iframeRef.current) {
          iframeRef.current.src = effectiveUrl;
        }
      }, delay);
    }
  }, [effectiveUrl, publishedUrl]);

  const isPublished = status === "published" || !!publishedUrl;

  const statusText = isPublished
    ? "Published"
    : status === "deploying"
      ? "Deploying..."
      : status === "running"
        ? "Running"
        : "Not published";

  const handleRefresh = useCallback(() => {
    setIframeLoading(true);
    setIframeError(false);
    setProxyFailed(false);
    retryCountRef.current = 0;
    if (iframeRef.current) {
      iframeRef.current.src = effectiveUrl;
    }
  }, [effectiveUrl]);

  const handleCopyUrl = useCallback(() => {
    if (copyableUrl) {
      navigator.clipboard.writeText(copyableUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copyableUrl]);

  const deviceWidths: Record<DeviceView, string> = {
    desktop: "100%",
    tablet: "768px",
    mobile: "375px",
  };

  const tabs: { id: ManagementTab; label: string; icon: typeof Globe }[] = [
    { id: "preview", label: "Preview", icon: Monitor },
    { id: "code", label: "Code", icon: Code2 },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div
      {...(isExpanded ? { role: "dialog", "aria-label": "Web app preview", "aria-modal": true as any } : {})}
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden transition-all duration-300",
        isExpanded ? "fixed inset-4 z-50 max-w-none" : "max-w-2xl",
        className
      )}
    >
      {/* Backdrop for expanded mode */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/60 -z-10"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Header: Globe icon, app name, status, tabs */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
          isPublished ? "bg-emerald-500/10" : "bg-white/5"
        )}>
          {isPublished ? (
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : (
            <Globe className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground truncate">
            {appName}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {statusText}
            {lastUpdated && <> · {lastUpdated}</>}
            {domain && <> · {domain}</>}
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-lg p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Expand/External buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          {(previewUrl || publishedUrl) && (
            <button
              onClick={onVisit}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          {isExpanded && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Preview Tab */}
      {activeTab === "preview" && (
        <div className="flex flex-col">
          {/* Toolbar: device selector, refresh, URL bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-0.5">
              {(
                [
                  { id: "desktop", icon: Monitor },
                  { id: "tablet", icon: Tablet },
                  { id: "mobile", icon: Smartphone },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDeviceView(d.id)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    deviceView === d.id
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <d.icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              {isPublished && (
                <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
              )}
              {!isPublished && (
                <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
              )}
              <span className={cn(
                "text-[11px] truncate flex-1",
                isPublished ? "text-emerald-400 font-mono" : "text-muted-foreground"
              )}>
                {displayUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="p-0.5 text-muted-foreground hover:text-foreground"
                title="Copy URL"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <button
              onClick={handleRefresh}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Iframe preview */}
          <div
            className={cn(
              "flex justify-center bg-neutral-900/50",
              isExpanded ? "flex-1" : "aspect-[16/10]"
            )}
          >
            {effectiveUrl ? (
              <div className="relative" style={{ width: deviceWidths[deviceView], height: "100%", maxWidth: "100%" }}>
                {iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-10">
                    <div className="text-center">
                      <RefreshCw className="w-5 h-5 text-primary animate-spin mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">
                        {retryCountRef.current > 0 ? `Waiting for dev server... (attempt ${retryCountRef.current + 1})` : "Loading preview..."}
                      </p>
                    </div>
                  </div>
                )}
                {iframeError && !iframeLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/80 z-10">
                    <div className="text-center">
                      <Globe className="w-5 h-5 text-amber-400 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground mb-2">
                        {proxyFailed
                          ? "Dev server has stopped. Deploy to get a permanent URL."
                          : "Dev server not ready yet"}
                      </p>
                      <div className="flex items-center gap-3 justify-center">
                        <button
                          onClick={() => {
                            retryCountRef.current = 0;
                            setIframeLoading(true);
                            setIframeError(false);
                            setProxyFailed(false);
                            if (iframeRef.current) iframeRef.current.src = effectiveUrl;
                          }}
                          className="text-xs text-primary hover:underline"
                        >
                          Retry now
                        </button>
                        {proxyFailed && publishedUrl && (
                          <a
                            href={publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-400 hover:underline"
                          >
                            Visit deployed site
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <iframe
                  ref={iframeRef}
                  src={iframeSrc || effectiveUrl}
                  className="bg-white transition-all duration-300"
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  title={`${appName} preview`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            ) : screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt={`${appName} preview`}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Preview will appear when the dev server starts
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Code Tab */}
      {activeTab === "code" && (
        <div
          className={cn(
            "p-4",
            isExpanded ? "flex-1 overflow-auto" : "max-h-80 overflow-auto"
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <FolderTree className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Project Files
            </span>
          </div>
          {projectFiles && projectFiles.length > 0 ? (
            <div className="space-y-0.5 font-mono text-xs">
              {projectFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 text-foreground"
                >
                  {f.type === "dir" ? (
                    <FolderTree className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <Code2 className="w-3 h-3 text-muted-foreground" />
                  )}
                  {f.name}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Code2 className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Files will appear as the agent builds the project
              </p>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && (
        <div
          className={cn(
            "p-4",
            isExpanded ? "flex-1 overflow-auto" : "max-h-80 overflow-auto"
          )}
        >
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: "Status", value: statusText },
              { label: "Port", value: port?.toString() || "—" },
              {
                label: "Template",
                value: previewUrl?.includes("4200") ? "React" : "HTML",
              },
              { label: "Last Updated", value: lastUpdated || "—" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-muted/30 rounded-lg p-3 border border-border/50"
              >
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-sm font-medium text-foreground mt-0.5">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Deployed URL in dashboard */}
          {publishedUrl && (
            <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">
                Live URL
              </p>
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-400 hover:underline font-mono break-all"
              >
                {publishedUrl}
              </a>
            </div>
          )}

          {/* Git status */}
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Version Control
            </span>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
            <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
              {gitStatus || "No git repository initialized"}
            </pre>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div
          className={cn(
            "p-4 space-y-4",
            isExpanded ? "flex-1 overflow-auto" : "max-h-80 overflow-auto"
          )}
        >
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Project Name
            </label>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground border border-border/50">
              {appName}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Domain
            </label>
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground border border-border/50">
              {publishedUrl ? (
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono text-xs">
                  {publishedUrl.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                domain || "Not configured"
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Dev Server
            </label>
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 text-sm text-foreground border border-border/50">
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-xs">
                Dev server (port {port || 4200})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons: Manage Project / Publish */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border">
        {projectExternalId ? (
          <a
            href={`/app/${projectExternalId}`}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Project
          </a>
        ) : (
          <button
            onClick={onSettings}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        )}
        <div className="relative flex-1">
          <button
            onClick={onPublish}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
              isPublished
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                : "border border-border bg-card text-foreground hover:bg-accent"
            )}
          >
            {isPublished ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Published
              </>
            ) : (
              "Publish"
            )}
          </button>
          {hasUnpublishedChanges && !isPublished && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-card" />
          )}
        </div>
      </div>
    </div>
  );
}
