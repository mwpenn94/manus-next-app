/**
 * ConnectorsSheet — Manus-native bottom sheet for connectors
 *
 * Matches the real Manus mobile UI:
 * - Slides up from bottom with drag handle
 * - X close button (left), centered "Connectors" title
 * - "Add connectors" and "Manage connectors" action rows with chevrons
 * - Connected services with blue toggle switches
 * - Sub-items (e.g., "Repositories" under GitHub)
 * - Unconnected services with "Connect" text button
 *
 * Uses vaul Drawer primitives for native bottom sheet behavior.
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  X,
  Plus,
  Settings2,
  ChevronRight,
  GitBranch,
  Plug,
  Globe,
  Monitor,
  Loader2,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR DEFINITIONS (subset for quick-access sheet)
   ═══════════════════════════════════════════════════════════════════ */

/** Primary connectors shown in the quick-access sheet */
const SHEET_CONNECTORS = [
  { id: "browser", name: "My Browser", icon: "monitor", category: "Tools" },
  { id: "github", name: "GitHub", icon: "github", category: "Development", subItems: [{ id: "github-repos", label: "Repositories", icon: "git-branch" }] },
  { id: "gmail", name: "Gmail", icon: "mail", category: "Communication" },
  { id: "calendar", name: "Google Calendar", icon: "calendar", category: "Productivity" },
  { id: "google-drive", name: "Google Drive", icon: "drive", category: "Storage" },
  { id: "outlook", name: "Outlook Mail", icon: "mail-outlook", category: "Communication" },
  { id: "microsoft-365", name: "Microsoft 365", icon: "microsoft", category: "Productivity" },
  { id: "slack", name: "Slack", icon: "slack", category: "Communication" },
  { id: "notion", name: "Notion", icon: "notion", category: "Productivity" },
];

/** SVG icons for connectors — matching Manus native style */
function ConnectorIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn("w-5 h-5", className);

  switch (type) {
    case "monitor":
      return <Monitor className={cls} />;
    case "github":
      return (
        <svg viewBox="0 0 16 16" className={cls} fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2v4" /><path d="M16 2v4" />
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M3 10h18" />
        </svg>
      );
    case "drive":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
          <path d="M7.71 3.5l-5.5 9.5h5.6l5.5-9.5h-5.6zm1.42 10.5H1.5l2.75 4.75h7.63L9.13 14zm6.25-10.5l-5.5 9.5 2.75 4.75 5.5-9.5L16.38 3.5h-1z" opacity="0.8" />
        </svg>
      );
    case "mail-outlook":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H7v-2h4v2zm0-4H7v-2h4v2zm0-4H7V7h4v2zm6 8h-4v-2h4v2zm0-4h-4v-2h4v2zm0-4h-4V7h4v2z" opacity="0.8" />
        </svg>
      );
    case "microsoft":
      return (
        <svg viewBox="0 0 21 21" className={cls}>
          <rect x="1" y="1" width="9" height="9" fill="#f25022" />
          <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
          <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
        </svg>
      );
    case "slack":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
        </svg>
      );
    case "notion":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor">
          <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L18.1 2.168c-.42-.326-.98-.7-2.055-.607L3.01 2.721c-.466.047-.56.28-.374.466l1.823 1.021zm.793 3.358v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.586c0-.606-.233-.933-.746-.886l-15.177.886c-.56.047-.747.327-.747.98zm14.337.746c.093.42 0 .84-.42.886l-.7.14v10.264c-.607.327-1.167.514-1.634.514-.746 0-.933-.234-1.493-.933l-4.572-7.186v6.953l1.447.327s0 .84-1.167.84l-3.218.187c-.093-.187 0-.653.327-.746l.84-.233V9.854L7.46 9.714c-.093-.42.14-1.026.793-1.073l3.451-.234 4.759 7.28V9.387l-1.214-.14c-.093-.514.28-.886.747-.933l3.593-.234z" />
        </svg>
      );
    case "git-branch":
      return <GitBranch className={cls} />;
    default:
      return <Plug className={cls} />;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   CONNECTORS SHEET COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

interface ConnectorsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: auto-highlight a specific connector on open */
  highlightId?: string | null;
}

export default function ConnectorsSheet({ open, onOpenChange, highlightId }: ConnectorsSheetProps) {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Fetch installed connectors
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated && open,
    staleTime: 30_000,
  });

  // Build installed map
  const installedMap = useMemo(() => {
    const m = new Map<string, (typeof installed)[0]>();
    installed.forEach((c) => m.set(c.connectorId, c));
    return m;
  }, [installed]);

  // Disconnect mutation
  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector disconnected");
    },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  // Count connected
  const connectedCount = installed.filter((c) => c.status === "connected").length;

  // Handle toggle — if connected, disconnect; if not, navigate to connectors page with highlight
  const handleToggle = useCallback((connectorId: string, isCurrentlyConnected: boolean) => {
    if (isCurrentlyConnected) {
      disconnectMutation.mutate({ connectorId });
    } else {
      // Navigate to full connectors page to trigger tiered auth
      onOpenChange(false);
      window.location.href = `/connectors?highlight=${connectorId}`;
    }
  }, [disconnectMutation, onOpenChange]);

  // Handle sub-item click
  const handleSubItemClick = useCallback((subItemId: string) => {
    onOpenChange(false);
    if (subItemId === "github-repos") {
      navigate("/github");
    }
  }, [navigate, onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-card border-border">
        {/* Hidden accessible title */}
        <DrawerTitle className="sr-only">Connectors</DrawerTitle>
        <DrawerDescription className="sr-only">Manage your connected services and integrations</DrawerDescription>

        {/* ── Header: X close + "Connectors" title ── */}
        <div className="relative flex items-center justify-center px-4 pt-2 pb-3">
          <DrawerClose asChild>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerClose>
          <h2
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Connectors
          </h2>
        </div>

        {/* ── Scrollable content ── */}
        <div className="overflow-y-auto flex-1 pb-safe">
          {/* Action rows section */}
          <div className="mx-4 mb-3 rounded-xl bg-muted/30 border border-border overflow-hidden">
            <button
              onClick={() => {
                onOpenChange(false);
                window.location.href = "/connectors";
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors"
            >
              <Plus className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">Add connectors</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="h-px bg-border mx-4" />
            <button
              onClick={() => {
                onOpenChange(false);
                window.location.href = "/connectors";
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors"
            >
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">Manage connectors</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Connected + available services */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mx-4 mb-4 rounded-xl bg-muted/30 border border-border overflow-hidden">
              {SHEET_CONNECTORS.map((connector, idx) => {
                const inst = installedMap.get(connector.id);
                const isConnected = inst?.status === "connected";
                const isHighlighted = highlightId === connector.id;
                const isToggling = disconnectMutation.isPending;

                return (
                  <div key={connector.id}>
                    {idx > 0 && <div className="h-px bg-border mx-4" />}

                    {/* Main connector row */}
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3.5 transition-colors",
                        isHighlighted && "bg-primary/5"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-background/60 border border-border/50 flex items-center justify-center shrink-0">
                        <ConnectorIcon type={connector.icon} className="w-4.5 h-4.5 text-foreground" />
                      </div>
                      <span className="text-sm text-foreground flex-1 font-medium">
                        {connector.name}
                      </span>
                      {isConnected ? (
                        <Switch
                          checked={true}
                          onCheckedChange={() => handleToggle(connector.id, true)}
                          disabled={isToggling}
                          className="data-[state=checked]:bg-blue-500 h-[1.4rem] w-10"
                        />
                      ) : (
                        <button
                          onClick={() => handleToggle(connector.id, false)}
                          className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors px-2 py-1"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {/* Sub-items (only shown when connected) */}
                    {isConnected && connector.subItems?.map((sub) => (
                      <div key={sub.id}>
                        <div className="h-px bg-border mx-4" />
                        <button
                          onClick={() => handleSubItemClick(sub.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 pl-16 text-left hover:bg-accent/50 active:bg-accent/70 transition-colors"
                        >
                          <ConnectorIcon type={sub.icon} className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground flex-1">{sub.label}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Connected count footer */}
          {!isLoading && (
            <div className="px-4 pb-6 text-center">
              <p className="text-xs text-muted-foreground/60">
                {connectedCount > 0
                  ? `${connectedCount} service${connectedCount !== 1 ? "s" : ""} connected`
                  : "No services connected yet"}
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CONNECTORS BADGE — Compact trigger for TaskView toolbar
   ═══════════════════════════════════════════════════════════════════ */

interface ConnectorsBadgeProps {
  className?: string;
  onClick?: () => void;
}

export function ConnectorsBadge({ className, onClick }: ConnectorsBadgeProps) {
  const { isAuthenticated } = useAuth();
  const { data: installed = [] } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const connectedCount = installed.filter((c) => c.status === "connected").length;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        connectedCount > 0 && "border-blue-500/30 text-blue-400 hover:text-blue-300",
        className
      )}
      title={connectedCount > 0 ? `${connectedCount} connector${connectedCount !== 1 ? "s" : ""} active` : "Manage connectors"}
      aria-label={connectedCount > 0 ? `${connectedCount} connectors active` : "Manage connectors"}
    >
      <Plug className="w-3.5 h-3.5" />
      {connectedCount > 0 && (
        <span className="text-[10px] font-medium">{connectedCount}</span>
      )}
    </button>
  );
}
