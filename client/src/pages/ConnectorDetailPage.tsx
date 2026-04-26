/**
 * ConnectorDetailPage — Manus-native connector detail view
 *
 * Pass 29: Deep recursive optimization
 * Matches real Manus native screenshots:
 * - Header: back arrow (←), ··· menu button
 * - Large centered icon in rounded square
 * - Title + description paragraph
 * - Warning callout (conditional — e.g., My Browser desktop-only)
 * - Auth steps: checkboxes (green check when done, empty circle when pending)
 * - Details section: key-value rows (Connector Type, Author, Website ↗, Privacy Policy ↗, Provide feedback ↗)
 * - Action button: "Add Repositories" / "Install Extension" / "Connect"
 * - Pull-to-reveal red "Disconnect" button
 *
 * Route: /connector/:id
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronLeft,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
} from "lucide-react";
import { CONNECTOR_DEFS, ConnectorIcon } from "@/components/ConnectorsSheet";
import type { ConnectorDef } from "@/components/ConnectorsSheet";

export default function ConnectorDetailPage() {
  const [, params] = useRoute("/connector/:id");
  const [, navigate] = useLocation();
  const connectorId = params?.id ?? "";

  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // ── Find connector definition ──
  const connectorDef = CONNECTOR_DEFS.find((c) => c.id === connectorId);

  // ── Queries ──
  const { data: installed = [] } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated,
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
      setConnecting(false);
    },
    onError: (err) => {
      toast.error(`OAuth failed: ${err.message}`);
      setConnecting(false);
    },
  });

  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector disconnected");
      setShowDisconnect(false);
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  // ── State ──
  const [connecting, setConnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const connectorRecord = installed.find((c) => c.connectorId === connectorId);
  const isConnected = connectorRecord?.status === "connected";
  const isOAuthAvailable = oauthAvailability?.[connectorId] === true;

  // ── Pull-to-reveal disconnect (touch gesture) ──
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullOffset, setPullOffset] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta > 0 && delta < 120) {
        setPullOffset(delta);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullOffset > 60 && isConnected) {
      setShowDisconnect(true);
    }
    setPullOffset(0);
  }, [pullOffset, isConnected]);

  // ── Close menu on outside click ──
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  // ── OAuth postMessage listener ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "connector-oauth-callback" && data.connectorId === connectorId && data.code) {
        completeOAuthMutation.mutate({
          connectorId: data.connectorId,
          code: data.code,
          origin: window.location.origin,
        });
      }

      if (data.type === "connector-oauth-success" && data.connectorId === connectorId) {
        utils.connector.list.invalidate();
        toast.success(`Connected to ${data.connectorId}`);
        setConnecting(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [connectorId, completeOAuthMutation, utils]);

  // ── Connect handler ──
  const handleConnect = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to connect services");
      return;
    }

    if (isOAuthAvailable) {
      setConnecting(true);
      try {
        const result = await getOAuthUrlMutation.mutateAsync({
          connectorId,
          origin: window.location.origin,
        });
        if (result.supported && result.url) {
          const isMobile = window.innerWidth < 768;
          if (isMobile) {
            window.location.href = result.url;
          } else {
            const w = 500, h = 700;
            const left = window.screenX + (window.outerWidth - w) / 2;
            const top = window.screenY + (window.outerHeight - h) / 2;
            popupRef.current = window.open(
              result.url,
              `oauth-${connectorId}`,
              `width=${w},height=${h},left=${left},top=${top},popup=yes`
            );
            const pollTimer = setInterval(() => {
              if (popupRef.current?.closed) {
                clearInterval(pollTimer);
                setTimeout(() => {
                  utils.connector.list.invalidate();
                  setConnecting(false);
                }, 1000);
              }
            }, 500);
          }
        } else {
          setConnecting(false);
          navigate(`/connectors?highlight=${connectorId}`);
        }
      } catch (err: any) {
        toast.error(`OAuth error: ${err.message}`);
        setConnecting(false);
      }
    } else {
      // Navigate to full connectors page for tiered auth
      navigate(`/connectors?highlight=${connectorId}`);
    }
  }, [isAuthenticated, isOAuthAvailable, connectorId, getOAuthUrlMutation, utils, navigate]);

  // ── Disconnect handler ──
  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate({ connectorId });
  }, [disconnectMutation, connectorId]);

  // ── Auth step completion status ──
  const getAuthStepCompleted = useCallback((stepId: string): boolean => {
    if (!isConnected) return false;
    if (stepId === "authorize-account" || stepId === "install") return true;
    // "authorize-repository" is completed if connector has repos configured
    if (stepId === "authorize-repository") return false;
    return false;
  }, [isConnected]);

  // ── 404 if connector not found ──
  if (!connectorDef) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Connector not found</p>
          <button
            onClick={() => navigate("/")}
            className="text-primary hover:underline text-sm"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  // ── Detect mobile for warning callout ──
  const isMobileDevice = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* ── Pull-to-reveal disconnect indicator ── */}
      {isConnected && pullOffset > 20 && (
        <div
          className="flex items-center justify-center bg-background transition-all"
          style={{ height: Math.min(pullOffset, 80) }}
        >
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
            pullOffset > 60 ? "bg-destructive/20 text-destructive" : "bg-muted/50 text-muted-foreground"
          )}>
            <Trash2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pullOffset > 60 ? "Release to disconnect" : "Pull to disconnect"}
            </span>
          </div>
        </div>
      )}

      {/* ── Disconnect banner (shown after pull-to-reveal) ── */}
      {showDisconnect && (
        <div className="flex items-center justify-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
          <button
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium text-sm"
          >
            {disconnectMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Disconnect
          </button>
          <button
            onClick={() => setShowDisconnect(false)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Header: back + ··· menu ── */}
      <div className="relative flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={() => navigate(-1 as any)}
          className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-12 w-48 rounded-xl bg-card border border-border shadow-xl z-50 overflow-hidden">
              {isConnected && (
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDisconnect(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Disconnect
                </button>
              )}
              <button
                onClick={() => {
                  setShowMenu(false);
                  navigate("/connectors");
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-accent transition-colors text-left"
              >
                Manage all connectors
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="px-6 pb-8">
          {/* ── Large centered icon ── */}
          <div className="flex justify-center pt-4 pb-5">
            <div className="w-20 h-20 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center">
              <ConnectorIcon type={connectorDef.icon} className="w-10 h-10 text-foreground" />
            </div>
          </div>

          {/* ── Title ── */}
          <h1
            className="text-2xl font-bold text-foreground text-center mb-3"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {connectorDef.name}
          </h1>

          {/* ── Description ── */}
          <p className="text-[15px] text-muted-foreground text-center leading-relaxed max-w-md mx-auto mb-6">
            {connectorDef.description}
          </p>

          {/* ── Warning callout (conditional) ── */}
          {connectorDef.warningCallout && isMobileDevice && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 mb-6">
              <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {connectorDef.warningCallout}{" "}
                <button className="underline text-foreground hover:text-primary transition-colors">
                  Learn more
                </button>
              </p>
            </div>
          )}

          {/* ── Auth steps ── */}
          {connectorDef.authSteps && connectorDef.authSteps.length > 0 && (
            <div className="flex flex-col items-center gap-2 mb-8">
              {connectorDef.authSteps.map((step) => {
                const completed = getAuthStepCompleted(step.id);
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-2.5"
                  >
                    {completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={cn(
                      "text-[15px]",
                      completed ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Details section ── */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: "var(--font-heading)" }}>
              Details
            </h2>
            <div className="rounded-xl bg-muted/20 border border-border/40 overflow-hidden">
              {/* Connector Type */}
              <DetailRow label="Connector Type" value={connectorDef.connectorType} />
              <DetailDivider />

              {/* Author */}
              <DetailRow label="Author" value={connectorDef.author} />
              <DetailDivider />

              {/* Website */}
              {connectorDef.website && (
                <>
                  <DetailLinkRow
                    label="Website"
                    href={connectorDef.website}
                  />
                  <DetailDivider />
                </>
              )}

              {/* Privacy Policy */}
              {connectorDef.privacyPolicy && (
                <>
                  <DetailLinkRow
                    label="Privacy Policy"
                    href={connectorDef.privacyPolicy}
                  />
                  <DetailDivider />
                </>
              )}

              {/* Provide feedback */}
              <DetailLinkRow
                label="Provide feedback"
                href="https://manus.im/feedback"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom action button ── */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        {isConnected ? (
          connectorDef.actionLabel && connectorDef.actionRoute ? (
            <button
              onClick={() => navigate(connectorDef.actionRoute!)}
              className="w-full py-3.5 rounded-xl bg-foreground text-background font-semibold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity"
            >
              {connectorDef.actionLabel}
            </button>
          ) : (
            <button
              onClick={() => setShowDisconnect(true)}
              className="w-full py-3.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-[15px] hover:bg-destructive/20 active:bg-destructive/30 transition-colors"
            >
              Disconnect
            </button>
          )
        ) : connecting ? (
          <button
            disabled
            className="w-full py-3.5 rounded-xl bg-foreground/50 text-background font-semibold text-[15px] flex items-center justify-center gap-2"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="w-full py-3.5 rounded-xl bg-foreground text-background font-semibold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity"
          >
            {connectorDef.actionLabel || "Connect"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DETAIL ROW COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}

function DetailLinkRow({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between px-4 py-3.5 hover:bg-accent/30 transition-colors"
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <ExternalLink className="w-4 h-4 text-muted-foreground" />
    </a>
  );
}

function DetailDivider() {
  return <div className="h-px bg-border/50 mx-4" />;
}
