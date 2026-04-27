/**
 * ConnectorsSheet — Manus-native bottom sheet for connectors
 *
 * Pass 29: Deep recursive optimization — Manus native card rows
 * - Card rows with icon + title + description + chevron (→)
 * - X close button (left), centered "Connectors" title, + button (right)
 * - Tapping a card navigates to /connector/:id detail page
 * - Shows both connected and available connectors
 * - No toggle switches — detail page handles auth/disconnect
 *
 * Uses vaul Drawer primitives for native bottom sheet behavior.
 */
import { useMemo } from "react";
import { useLocation } from "wouter";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  X,
  Plus,
  ChevronRight,
  GitBranch,
  Plug,
  Globe,
  Monitor,
  Loader2,
  Calendar,
  FolderOpen,
  Mail,
  Layout,
  Hash,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */

export interface ConnectorDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  connectorType: string;
  author: string;
  website?: string;
  privacyPolicy?: string;
  /** Warning callout text (e.g., "desktop only" for My Browser) */
  warningCallout?: string;
  /** Action button label (e.g., "Add Repositories", "Install Extension") */
  actionLabel?: string;
  /** Route for the action button */
  actionRoute?: string;
  /** Auth steps to display on detail page */
  authSteps?: { id: string; label: string }[];
}

/** All connector definitions — shared between sheet and detail page */
export const CONNECTOR_DEFS: ConnectorDef[] = [
  {
    id: "browser",
    name: "My Browser",
    icon: "browser",
    description:
      "Install and enable a Chrome extension so that Manus uses your local browser instead. This may allow access to sites that require logins or have heightened security.",
    connectorType: "Browser extension",
    author: "Manus",
    website: "https://manus.im",
    privacyPolicy: "https://manus.im/privacy",
    warningCallout:
      "The current device does not support plugin installation. You can install on a desktop.",
    actionLabel: "Install Extension",
    authSteps: [{ id: "install", label: "Install Extension" }],
  },
  {
    id: "github",
    name: "GitHub",
    icon: "github",
    description:
      "Access, search, and organize repos, track issues, review pull requests, and automate workflows directly in Manus.",
    connectorType: "App",
    author: "Manus",
    website: "https://github.com",
    privacyPolicy: "https://manus.im/privacy",
    actionLabel: "Add Repositories",
    actionRoute: "/github",
    authSteps: [
      { id: "authorize-account", label: "Authorize Account" },
      { id: "authorize-repository", label: "Authorize Repository" },
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "mail",
    description:
      "Read, compose, and manage your Gmail messages directly within Manus for seamless email workflows.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://mail.google.com",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "calendar",
    name: "Google Calendar",
    icon: "calendar",
    description:
      "View, create, and manage calendar events. Let Manus help schedule meetings and organize your time.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://calendar.google.com",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "google-drive",
    name: "Google Drive",
    icon: "drive",
    description:
      "Access, search, and manage files in Google Drive. Upload, download, and organize documents with Manus.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://drive.google.com",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "outlook",
    name: "Outlook Mail",
    icon: "mail-outlook",
    description:
      "Read, compose, and manage Outlook emails. Integrate your Microsoft email workflow with Manus.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://outlook.live.com",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    icon: "microsoft",
    description:
      "Connect Microsoft 365 apps including Word, Excel, PowerPoint, and OneDrive for productivity workflows.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://www.microsoft.com/microsoft-365",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "slack",
    name: "Slack",
    icon: "slack",
    description:
      "Send and receive messages, manage channels, and automate Slack workflows directly from Manus.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://slack.com",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
  {
    id: "notion",
    name: "Notion",
    icon: "notion",
    description:
      "Access and manage Notion workspaces, pages, and databases. Organize knowledge and projects with Manus.",
    connectorType: "OAuth",
    author: "Manus",
    website: "https://notion.so",
    privacyPolicy: "https://manus.im/privacy",
    authSteps: [{ id: "authorize-account", label: "Authorize Account" }],
  },
];

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR ICON — SVG icons matching Manus native style
   ═══════════════════════════════════════════════════════════════════ */

export function ConnectorIcon({ type, className }: { type: string; className?: string }) {
  const cls = cn("w-5 h-5", className);

  switch (type) {
    case "monitor":
      return <Monitor className={cls} />;
    case "browser":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="4" />
          <line x1="21.17" y1="8" x2="12" y2="8" />
          <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
          <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
        </svg>
      );
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
   CONNECTORS SHEET — Manus-native bottom sheet
   Card rows with icon + title + description + chevron
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

  // ── Queries ──
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated && open,
    staleTime: 30_000,
  });

  const { data: healthData = [] } = trpc.connector.getHealth.useQuery(undefined, {
    enabled: isAuthenticated && open,
    staleTime: 30_000,
  });

  // ── Health status map ──
  const healthMap = useMemo(() => {
    const m = new Map<string, string>();
    healthData.forEach((h) => m.set(h.connectorId, h.healthStatus));
    return m;
  }, [healthData]);

  // ── Derived ──
  const installedMap = useMemo(() => {
    const m = new Map<string, (typeof installed)[0]>();
    installed.forEach((c) => m.set(c.connectorId, c));
    return m;
  }, [installed]);

  const connectedDefs = CONNECTOR_DEFS.filter(
    (d) => installedMap.get(d.id)?.status === "connected"
  );
  const availableDefs = CONNECTOR_DEFS.filter(
    (d) => installedMap.get(d.id)?.status !== "connected"
  );

  // ── Navigate to connector detail ──
  const handleCardClick = (connectorId: string) => {
    onOpenChange(false);
    // GitHub has a dedicated page — route there instead of generic connector detail
    const def = CONNECTOR_DEFS.find(d => d.id === connectorId);
    if (def?.actionRoute) {
      navigate(def.actionRoute);
    } else {
      navigate(`/connector/${connectorId}`);
    }
  };

  // ── Navigate to add connectors page ──
  const handleAddClick = () => {
    onOpenChange(false);
    navigate("/connectors");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] bg-card border-border">
        {/* Hidden accessible title */}
        <DrawerTitle className="sr-only">Connectors</DrawerTitle>
        <DrawerDescription className="sr-only">Manage your connected services and integrations</DrawerDescription>

        {/* ── Header: X close + "Connectors" title + "+" button ── */}
        <div className="relative flex items-center justify-center px-4 pt-2 pb-3">
          <DrawerClose asChild>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
          <button
            onClick={handleAddClick}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Add connector"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable content ── */}
        <div className="overflow-y-auto flex-1 px-4 pb-safe">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {/* Connected connectors */}
              {connectedDefs.length > 0 && (
                <div className="space-y-2.5">
                  {connectedDefs.map((connector) => (
                    <ConnectorCard
                      key={connector.id}
                      connector={connector}
                      isHighlighted={highlightId === connector.id}
                      healthStatus={healthMap.get(connector.id)}
                      onClick={() => handleCardClick(connector.id)}
                    />
                  ))}
                </div>
              )}

              {/* Available connectors */}
              {availableDefs.length > 0 && (
                <div className="space-y-2.5">
                  {connectedDefs.length > 0 && (
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider px-1 pt-2">
                      Available
                    </p>
                  )}
                  {availableDefs.map((connector) => (
                    <ConnectorCard
                      key={connector.id}
                      connector={connector}
                      isHighlighted={highlightId === connector.id}
                      onClick={() => handleCardClick(connector.id)}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {CONNECTOR_DEFS.length === 0 && (
                <div className="text-center py-12">
                  <Plug className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No connectors available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR CARD — Individual card row matching Manus native
   ═══════════════════════════════════════════════════════════════════ */

function ConnectorCard({
  connector,
  isHighlighted,
  healthStatus,
  onClick,
}: {
  connector: ConnectorDef;
  isHighlighted?: boolean;
  healthStatus?: string;
  onClick: () => void;
}) {
  // Manus-aligned: tiny dot only for connected connectors
  const showDot = !!healthStatus;
  const dotColor =
    healthStatus === "expired" || healthStatus === "refresh_failed"
      ? "bg-amber-500"
      : "bg-emerald-500";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3.5 p-4 rounded-2xl bg-muted/30 border border-border/50",
        "hover:bg-muted/50 active:bg-muted/70 transition-all text-left",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isHighlighted && "ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      {/* Icon container — rounded square matching Manus native */}
      <div className="relative w-12 h-12 rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
        <ConnectorIcon type={connector.icon} className="w-6 h-6 text-foreground" />
        {/* Health status dot — subtle, bottom-right of icon */}
        {showDot && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              dotColor
            )}
          />
        )}
      </div>

      {/* Title + description */}
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground leading-tight">
          {connector.name}
        </p>
        <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
          {connector.description}
        </p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
    </button>
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
