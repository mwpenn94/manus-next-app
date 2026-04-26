/**
 * ConnectorsSheet — Manus-native bottom sheet for connectors
 *
 * Pass 28: Deep recursive optimization
 * - Inline OAuth popup flow (GitHub, Microsoft 365)
 * - Mobile same-window redirect fallback (code+state URL params)
 * - Tiered auth for unsupported OAuth (Manus verify + manual)
 * - Sub-items per connector (Repositories, Calendars, Files, etc.)
 * - OAuth support indicators (shield icon)
 * - Loading states during OAuth exchange
 *
 * Uses vaul Drawer primitives for native bottom sheet behavior.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
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
  ShieldCheck,
  KeyRound,
  Calendar,
  FolderOpen,
  Mail,
  Layout,
  Hash,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR DEFINITIONS (subset for quick-access sheet)
   ═══════════════════════════════════════════════════════════════════ */

interface SubItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
}

interface SheetConnector {
  id: string;
  name: string;
  icon: string;
  category: string;
  subItems?: SubItem[];
}

/** Primary connectors shown in the quick-access sheet */
const SHEET_CONNECTORS: SheetConnector[] = [
  { id: "browser", name: "My Browser", icon: "monitor", category: "Tools" },
  {
    id: "github",
    name: "GitHub",
    icon: "github",
    category: "Development",
    subItems: [{ id: "github-repos", label: "Repositories", icon: "git-branch", route: "/github" }],
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "mail",
    category: "Communication",
    subItems: [{ id: "gmail-inbox", label: "Inbox", icon: "mail-sub" }],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    icon: "calendar",
    category: "Productivity",
    subItems: [{ id: "calendar-events", label: "Calendars", icon: "calendar-sub" }],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: "drive",
    category: "Storage",
    subItems: [{ id: "drive-files", label: "Files", icon: "folder" }],
  },
  {
    id: "outlook",
    name: "Outlook Mail",
    icon: "mail-outlook",
    category: "Communication",
    subItems: [{ id: "outlook-inbox", label: "Mail", icon: "mail-sub" }],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    icon: "microsoft",
    category: "Productivity",
    subItems: [{ id: "ms365-apps", label: "Apps", icon: "layout" }],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "slack",
    category: "Communication",
    subItems: [{ id: "slack-channels", label: "Channels", icon: "hash" }],
  },
  {
    id: "notion",
    name: "Notion",
    icon: "notion",
    category: "Productivity",
    subItems: [{ id: "notion-workspaces", label: "Workspaces", icon: "layout" }],
  },
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
    case "mail-sub":
      return <Mail className={cls} />;
    case "calendar":
    case "calendar-sub":
      return <Calendar className={cls} />;
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
    case "folder":
      return <FolderOpen className={cls} />;
    case "layout":
      return <Layout className={cls} />;
    case "hash":
      return <Hash className={cls} />;
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
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // ── State ──
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  // ── Queries ──
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated && open,
    staleTime: 30_000,
  });

  const { data: oauthAvailability } = trpc.connector.oauthAvailability.useQuery(undefined, {
    staleTime: 120_000,
  });

  const { data: tieredAuth } = trpc.connector.tieredAuthStatus.useQuery(undefined, {
    staleTime: 120_000,
  });

  // ── Mutations ──
  const getOAuthUrlMutation = trpc.connector.getOAuthUrl.useMutation();
  const completeOAuthMutation = trpc.connector.completeOAuth.useMutation({
    onSuccess: (data) => {
      utils.connector.list.invalidate();
      toast.success(`Connected to ${data.name}`);
      setConnectingId(null);
    },
    onError: (err) => {
      toast.error(`OAuth failed: ${err.message}`);
      setConnectingId(null);
    },
  });

  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector disconnected");
    },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  // ── Derived ──
  const installedMap = useMemo(() => {
    const m = new Map<string, (typeof installed)[0]>();
    installed.forEach((c) => m.set(c.connectorId, c));
    return m;
  }, [installed]);

  const connectedCount = installed.filter((c) => c.status === "connected").length;

  // ── OAuth postMessage listener ──
  useEffect(() => {
    if (!open) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      // Popup OAuth callback — code received, exchange on server
      if (data.type === "connector-oauth-callback" && data.connectorId && data.code) {
        completeOAuthMutation.mutate({
          connectorId: data.connectorId,
          code: data.code,
          origin: window.location.origin,
        });
      }

      // Popup OAuth success — server already exchanged, just refresh
      if (data.type === "connector-oauth-success" && data.connectorId) {
        utils.connector.list.invalidate();
        toast.success(`Connected to ${data.connectorId}`);
        setConnectingId(null);
      }

      // Manus verify callback
      if (data.type === "connector-manus-verified" && data.connectorId) {
        utils.connector.list.invalidate();
        toast.success(`Verified ${data.verifiedIdentity || data.connectorId}`);
        setConnectingId(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, completeOAuthMutation, utils]);

  // ── Handle URL params for mobile same-window redirect ──
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams(window.location.search);

    // OAuth success redirect
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      utils.connector.list.invalidate();
      toast.success(`Connected to ${oauthSuccess}`);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("oauth_success");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    // OAuth code+state redirect (mobile flow — server already exchanged in callback route)
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const stateData = JSON.parse(atob(state.replace(/-/g, "+").replace(/_/g, "/")));
        if (stateData.connectorId) {
          // Server already exchanged the code in the callback route,
          // so just refresh the list
          utils.connector.list.invalidate();
          toast.success(`Connecting ${stateData.connectorId}...`);
        }
      } catch { /* ignore malformed state */ }
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.toString());
    }

    // Manus verify redirect
    const manusVerified = params.get("manus_verified");
    if (manusVerified) {
      utils.connector.list.invalidate();
      toast.success(`Verified ${params.get("identity") || manusVerified}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("manus_verified");
      url.searchParams.delete("identity");
      url.searchParams.delete("method");
      window.history.replaceState({}, "", url.toString());
    }
  }, [open, utils]);

  // ── Connect handler — inline OAuth or fallback to /connectors ──
  const handleConnect = useCallback(async (connectorId: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to connect services");
      return;
    }

    const isOAuthAvailable = oauthAvailability?.[connectorId] === true;
    const tierInfo = tieredAuth?.[connectorId];

    // Tier 1: Direct OAuth (popup flow)
    if (isOAuthAvailable && tierInfo?.tier1) {
      setConnectingId(connectorId);
      try {
        const result = await getOAuthUrlMutation.mutateAsync({
          connectorId,
          origin: window.location.origin,
        });
        if (result.supported && result.url) {
          // Open OAuth in popup (desktop) or same-window (mobile)
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            // Same-window redirect for mobile
            window.location.href = result.url;
          } else {
            // Popup for desktop
            const w = 500, h = 700;
            const left = window.screenX + (window.outerWidth - w) / 2;
            const top = window.screenY + (window.outerHeight - h) / 2;
            popupRef.current = window.open(
              result.url,
              `oauth-${connectorId}`,
              `width=${w},height=${h},left=${left},top=${top},popup=yes`
            );
            // Poll for popup close (fallback if postMessage fails)
            const pollTimer = setInterval(() => {
              if (popupRef.current?.closed) {
                clearInterval(pollTimer);
                // Refresh list in case server-side exchange happened
                setTimeout(() => {
                  utils.connector.list.invalidate();
                  setConnectingId(null);
                }, 1000);
              }
            }, 500);
          }
        } else {
          // OAuth not supported, fall through to page
          setConnectingId(null);
          onOpenChange(false);
          navigate(`/connectors?highlight=${connectorId}`);
        }
      } catch (err: any) {
        toast.error(`OAuth error: ${err.message}`);
        setConnectingId(null);
      }
      return;
    }

    // Tier 2+: Navigate to full connectors page for tiered auth dialog
    onOpenChange(false);
    navigate(`/connectors?highlight=${connectorId}`);
  }, [isAuthenticated, oauthAvailability, tieredAuth, getOAuthUrlMutation, utils, onOpenChange, navigate]);

  // ── Disconnect handler ──
  const handleDisconnect = useCallback((connectorId: string) => {
    disconnectMutation.mutate({ connectorId });
  }, [disconnectMutation]);

  // ── Sub-item click handler ──
  const handleSubItemClick = useCallback((sub: SubItem) => {
    onOpenChange(false);
    if (sub.route) {
      navigate(sub.route);
    } else {
      toast("Feature coming soon", {
        description: `${sub.label} management will be available in a future update.`,
      });
    }
  }, [navigate, onOpenChange]);

  // ── Helper: is this connector OAuth-supported? ──
  const isOAuthConnector = useCallback((connectorId: string) => {
    return oauthAvailability?.[connectorId] === true;
  }, [oauthAvailability]);

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
                navigate("/connectors");
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
                navigate("/connectors");
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
                const isConnecting = connectingId === connector.id;
                const hasOAuth = isOAuthConnector(connector.id);
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-foreground font-medium truncate">
                            {connector.name}
                          </span>
                          {hasOAuth && !isConnected && (
                            <span title="OAuth supported"><ShieldCheck className="w-3 h-3 text-emerald-500/70 shrink-0" /></span>
                          )}
                        </div>
                        {/* Inline hint for unsupported OAuth */}
                        {!isConnected && !hasOAuth && connector.id !== "browser" && (
                          <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">
                            Requires setup in Settings
                          </p>
                        )}
                      </div>

                      {/* Right side: toggle or connect */}
                      {isConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      ) : isConnected ? (
                        <Switch
                          checked={true}
                          onCheckedChange={() => handleDisconnect(connector.id)}
                          disabled={isToggling}
                          className="data-[state=checked]:bg-blue-500 h-[1.4rem] w-10"
                        />
                      ) : connector.id === "browser" ? (
                        <Switch
                          checked={false}
                          disabled
                          className="h-[1.4rem] w-10 opacity-50"
                        />
                      ) : (
                        <button
                          onClick={() => handleConnect(connector.id)}
                          className={cn(
                            "text-sm font-medium transition-colors px-2 py-1",
                            hasOAuth
                              ? "text-blue-400 hover:text-blue-300"
                              : "text-muted-foreground hover:text-foreground"
                          )}
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
                          onClick={() => handleSubItemClick(sub)}
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
