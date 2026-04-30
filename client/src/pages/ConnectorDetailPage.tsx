/**
 * ConnectorDetailPage — Manus-native connector detail view with inline tiered auth
 *
 * Pass 30: Deep Manus alignment — unified tiered auth on detail page
 * - Header: back arrow (←), ··· menu button
 * - Large centered icon in rounded square
 * - Title + description paragraph
 * - Warning callout (conditional — e.g., My Browser desktop-only)
 * - Auth steps: checkboxes (green check when done, empty circle when pending)
 * - Inline tiered auth: Tier 1 OAuth, Tier 2 Manus Verify, Tier 3 Smart PAT, Tier 4 Manual
 * - OAuth scope display for connected OAuth connectors
 * - Details section: key-value rows
 * - Action button at bottom
 * - Pull-to-reveal red "Disconnect" button
 * - Same-window OAuth callback handling (query params)
 *
 * Route: /connector/:id
 */
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  MoreHorizontal,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Trash2,
  Shield,
  Fingerprint,
  Key,
  Globe,
  ChevronDown,
  ChevronRight,
  BadgeCheck,
  ShieldCheck,
  Info,
  Layers,
  RefreshCw,
  Activity,
  Clock,
  Play,
  Zap,
  Terminal,
  Copy,
  Check,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CONNECTOR_DEFS, ConnectorIcon } from "@/components/ConnectorsSheet";
import type { ConnectorDef } from "@/components/ConnectorsSheet";

/* ═══════════════════════════════════════════════════════════════════
   TIER LABELS — matches ConnectorsPage for consistency
   ═══════════════════════════════════════════════════════════════════ */

const TIER_LABELS: Record<number, { label: string; icon: typeof Shield; color: string; desc: string }> = {
  1: { label: "Direct OAuth", icon: Shield, color: "text-emerald-400", desc: "One-click authorization via provider" },
  2: { label: "Manus Verify", icon: Fingerprint, color: "text-amber-400", desc: "Verify identity via Manus, then guided token setup" },
  3: { label: "Smart PAT", icon: Key, color: "text-blue-400", desc: "Step-by-step personal access token guide" },
  4: { label: "Manual Entry", icon: Globe, color: "text-muted-foreground", desc: "Enter credentials directly" },
};

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR TOKEN HELP — ported from ConnectorsPage for inline display
   ═══════════════════════════════════════════════════════════════════ */

interface TokenHelp {
  url: string;
  label: string;
  steps: string[];
}

interface ConfigField {
  key: string;
  label: string;
  placeholder: string;
}

/** Token help and config fields for connectors that support Smart PAT (Tier 3) */
const CONNECTOR_AUTH_DATA: Record<string, { configFields: ConfigField[]; tokenHelp?: TokenHelp; oauthLabel?: string }> = {
  github: {
    oauthLabel: "Sign in with GitHub",
    configFields: [{ key: "token", label: "Personal Access Token", placeholder: "ghp_..." }],
    tokenHelp: {
      url: "https://github.com/settings/tokens?type=beta",
      label: "Generate token at GitHub Settings",
      steps: [
        "Go to GitHub Settings → Developer settings → Personal access tokens",
        "Click 'Generate new token (Fine-grained)'",
        "Select repositories and permissions: Contents (read/write), Issues (read/write), Pull requests (read/write)",
        "Copy the token (starts with ghp_)",
      ],
    },
  },
  slack: {
    oauthLabel: "Sign in with Slack",
    configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." }],
    tokenHelp: {
      url: "https://api.slack.com/apps",
      label: "Create app at Slack API",
      steps: [
        "Go to api.slack.com/apps and create a new app",
        "Under 'Incoming Webhooks', activate and create a webhook",
        "Copy the Webhook URL",
        "Or use a Bot Token (xoxb-) for full API access",
      ],
    },
  },
  gmail: {
    oauthLabel: "Sign in with Google",
    configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }],
    tokenHelp: {
      url: "https://console.cloud.google.com/apis/credentials",
      label: "Create credentials in Google Cloud",
      steps: [
        "Go to Google Cloud Console → APIs & Services",
        "Enable the Gmail API",
        "Create a Service Account with domain-wide delegation",
        "Download the JSON key and paste it here",
      ],
    },
  },
  "google-drive": {
    oauthLabel: "Sign in with Google",
    configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }],
    tokenHelp: {
      url: "https://console.cloud.google.com/iam-admin/serviceaccounts",
      label: "Create service account in Google Cloud",
      steps: [
        "Go to Google Cloud Console → IAM & Admin → Service Accounts",
        "Create a service account and grant 'Editor' role",
        "Create a key (JSON type) and download it",
        "Paste the entire JSON content into the field above",
      ],
    },
  },
  calendar: {
    oauthLabel: "Sign in with Google",
    configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }],
    tokenHelp: {
      url: "https://console.cloud.google.com/apis/credentials",
      label: "Create credentials in Google Cloud",
      steps: [
        "Go to Google Cloud Console → APIs & Services → Credentials",
        "Enable the Google Calendar API",
        "Create a Service Account key (JSON)",
        "Share your calendar with the service account email",
        "Paste the JSON key content into the field above",
      ],
    },
  },
  outlook: {
    oauthLabel: "Sign in with Microsoft",
    configFields: [{ key: "accessToken", label: "Access Token or App Password", placeholder: "EwB..." }],
    tokenHelp: {
      url: "https://developer.microsoft.com/en-us/graph/graph-explorer",
      label: "Get token from Graph Explorer",
      steps: [
        "Open Microsoft Graph Explorer and sign in",
        "Click your profile icon → 'Access token' tab",
        "Copy the access token for Mail.Read, Mail.Send permissions",
      ],
    },
  },
  "microsoft-365": {
    oauthLabel: "Sign in with Microsoft",
    configFields: [{ key: "accessToken", label: "Access Token or App Password", placeholder: "EwB..." }],
    tokenHelp: {
      url: "https://developer.microsoft.com/en-us/graph/graph-explorer",
      label: "Get token from Graph Explorer",
      steps: [
        "Open Microsoft Graph Explorer and sign in",
        "Click your profile icon → 'Access token' tab",
        "Copy the access token for immediate use",
        "For long-term access: register an app in Azure Portal → App registrations",
      ],
    },
  },
  notion: {
    oauthLabel: "Sign in with Notion",
    configFields: [{ key: "apiKey", label: "Integration Token", placeholder: "secret_..." }],
    tokenHelp: {
      url: "https://www.notion.so/my-integrations",
      label: "Create integration at Notion",
      steps: [
        "Go to notion.so/my-integrations",
        "Click 'New integration' and name it",
        "Select the workspace and capabilities needed",
        "Copy the Internal Integration Token (starts with secret_)",
        "Share target pages/databases with your integration",
      ],
    },
  },
};

/** Manus-verifiable connectors (Tier 2) */
const MANUS_VERIFIABLE_IDS = new Set(["github", "microsoft-365", "google-drive", "calendar"]);

/** OAuth-capable connectors */
const OAUTH_CAPABLE_IDS = new Set(["github", "google-drive", "notion", "slack", "calendar", "microsoft-365"]);

/* ═══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function ConnectorDetailPage() {
  const [, params] = useRoute("/connector/:id");
  const [, navigate] = useLocation();
  const connectorId = params?.id ?? "";

  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();

  // ── Find connector definition ──
  const connectorDef = CONNECTOR_DEFS.find((c) => c.id === connectorId);
  const authData = CONNECTOR_AUTH_DATA[connectorId];

  // ── Queries ──
  const { data: installed = [] } = trpc.connector.list.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const { data: oauthAvailability } = trpc.connector.oauthAvailability.useQuery(undefined, {
    staleTime: 120_000,
  });

  const { data: allTierStatus } = trpc.connector.tieredAuthStatus.useQuery(undefined, {
    staleTime: 120_000,
  });

  // ── Health query (only when connected) ──
  const { data: healthDetail } = trpc.connector.getHealthDetail.useQuery(
    { connectorId },
    {
      enabled: isAuthenticated && !!connectorId,
      staleTime: 30_000,
      refetchInterval: 60_000, // Poll every 60s for silent background updates
    }
  );

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

  const connectMutation = trpc.connector.connect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector linked successfully");
      setConnecting(false);
      setExpandedTier(null);
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
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

  const autoRefreshMutation = trpc.connector.updateAutoRefresh.useMutation({
    onSuccess: (data) => {
      utils.connector.getHealthDetail.invalidate({ connectorId });
      toast.success(data.autoRefreshEnabled ? "Connection will stay active" : "Auto-refresh disabled");
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  const manualRefreshMutation = trpc.connector.manualRefresh.useMutation({
    onSuccess: () => {
      utils.connector.getHealthDetail.invalidate({ connectorId });
      utils.connector.list.invalidate();
      toast.success("Connection refreshed");
    },
    onError: (err) => {
      toast.error(`Refresh failed: ${err.message}`);
    },
  });

  const manusVerifyMutation = trpc.connector.verifyViaManus.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        toast.info("Opening Manus verification...");
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.url;
        } else {
          window.open(data.url, "manus_verify_popup", "width=500,height=600,scrollbars=yes");
        }
      }
    },
    onError: (err) => {
      toast.error(`Verification error: ${err.message}`);
    },
  });

  // ── State ──
  const [connecting, setConnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [expandedTier, setExpandedTier] = useState<number | null>(null);
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [verifiedIdentity, setVerifiedIdentity] = useState<{ identity: string; method: string } | null>(null);
  const popupRef = useRef<Window | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Derived ──
  const connectorRecord = installed.find((c) => c.connectorId === connectorId);
  const isConnected = connectorRecord?.status === "connected";
  const isOAuthAvailable = oauthAvailability?.[connectorId] === true;
  const tierStatus = allTierStatus?.[connectorId] ?? null;

  // OAuth scopes from connected record
  const oauthScopes = connectorRecord?.oauthScopes;
  const authMethod = connectorRecord?.authMethod || (connectorRecord?.config as any)?.authMethod;

  // ── Health derived ──
  const healthStatus = healthDetail?.health?.healthStatus ?? "unknown";
  const supportsAutoRefresh = !!healthDetail?.hasRefreshToken;
  const autoRefreshEnabled = healthDetail?.health?.autoRefreshEnabled ?? false;
  const lastConnectedAt = healthDetail?.health?.lastSyncAt || healthDetail?.health?.lastRefreshAt;

  /** User-friendly connection status label */
  const connectionStatusLabel = useMemo(() => {
    if (!isConnected) return null;
    switch (healthStatus) {
      case "healthy": return "Active";
      case "expiring_soon": return "Active";
      case "expired": return "Expired";
      case "refresh_failed": return "Needs Attention";
      case "no_token": return "Active";
      default: return "Active";
    }
  }, [isConnected, healthStatus]);

  /** Whether to show the reconnect prompt */
  const showReconnectPrompt = isConnected && (healthStatus === "expired" || healthStatus === "refresh_failed");

  // ── Build available tiers ──
  const availableTiers = useMemo(() => {
    const tiers: { tier: number; available: boolean }[] = [
      { tier: 1, available: tierStatus?.tier1 ?? false },
      { tier: 2, available: tierStatus?.tier2 ?? false },
      { tier: 3, available: !!(authData?.tokenHelp) },
      { tier: 4, available: true },
    ];
    return tiers.filter((t) => t.available);
  }, [tierStatus, authData]);

  const bestTier = tierStatus?.bestTier ?? (authData?.tokenHelp ? 3 : 4);

  // ── Auto-expand best tier when auth section opens ──
  useEffect(() => {
    if (showAuthSection && expandedTier === null) {
      if (verifiedIdentity) {
        setExpandedTier(3);
      } else {
        setExpandedTier(bestTier);
      }
    }
  }, [showAuthSection, expandedTier, verifiedIdentity, bestTier]);

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

      // Direct OAuth callback (code exchange)
      if (data.type === "connector-oauth-callback" && data.connectorId === connectorId && data.code) {
        completeOAuthMutation.mutate({
          connectorId: data.connectorId,
          code: data.code,
          origin: window.location.origin,
        });
      }

      // OAuth success (server-side exchange completed)
      if (data.type === "connector-oauth-success" && data.connectorId === connectorId) {
        utils.connector.list.invalidate();
        toast.success(`Connected to ${data.connectorId}`);
        setConnecting(false);
        setShowAuthSection(false);
      }

      // Manus verification success
      if (data.type === "connector-manus-verified" && data.connectorId === connectorId) {
        setVerifiedIdentity({
          identity: data.verifiedIdentity,
          method: data.loginMethod || "Manus",
        });
        utils.connector.list.invalidate();
        toast.success(`Identity verified: ${data.verifiedIdentity}`);
        // Auto-switch to Smart PAT tier with verified context
        setExpandedTier(3);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [connectorId, completeOAuthMutation.mutate, utils]);

  // ── Same-window callback handling (query params) ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // OAuth success redirect
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess && oauthSuccess === connectorId) {
      utils.connector.list.invalidate();
      toast.success(`Successfully connected ${oauthSuccess}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // Manus verification redirect
    const manusVerified = params.get("manus_verified");
    const identity = params.get("identity");
    const method = params.get("method");
    if (manusVerified && manusVerified === connectorId && identity) {
      setVerifiedIdentity({ identity, method: method || "Manus" });
      setShowAuthSection(true);
      setExpandedTier(3);
      toast.success(`Identity verified: ${identity}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    // OAuth code callback (same-window flow)
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const parsed = JSON.parse(atob(state));
        if (parsed.connectorId === connectorId) {
          completeOAuthMutation.mutate({ connectorId: parsed.connectorId, code, origin: window.location.origin });
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Connect handler (opens auth section) ──
  const handleConnect = useCallback(() => {
    if (!isAuthenticated) {
      toast.error("Please sign in to connect services");
      return;
    }
    setShowAuthSection(true);
  }, [isAuthenticated]);

  // ── Direct OAuth connect ──
  const handleOAuthConnect = useCallback(async () => {
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
        toast.info("OAuth not configured. Use another method below.");
      }
    } catch (err: any) {
      toast.error(`OAuth error: ${err.message}`);
      setConnecting(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutateAsync is stable (tRPC)
  }, [connectorId, getOAuthUrlMutation.mutateAsync, utils]);

  // ── Manus Verify handler ──
  const handleManusVerify = useCallback(() => {
    manusVerifyMutation.mutate({
      connectorId,
      origin: window.location.origin,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [manusVerifyMutation.mutate, connectorId]);

  // ── Manual/PAT connect handler ──
  const handleManualConnect = useCallback(() => {
    setConnecting(true);
    connectMutation.mutate({
      connectorId,
      name: connectorDef?.name || connectorId,
      config: configValues,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [connectMutation.mutate, connectorId, connectorDef, configValues]);

  // ── Disconnect handler ──
  const handleDisconnect = useCallback(() => {
    disconnectMutation.mutate({ connectorId });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [disconnectMutation.mutate, connectorId]);

  // ── Auth step completion status ──
  const getAuthStepCompleted = useCallback((stepId: string): boolean => {
    if (!isConnected) return false;
    if (stepId === "authorize-account" || stepId === "install") return true;
    if (stepId === "authorize-repository") return false;
    return false;
  }, [isConnected]);

  // ── Verified PAT guidance (contextual) ──
  const getVerifiedPATGuidance = useCallback((): string[] | null => {
    if (!verifiedIdentity) return null;
    if (connectorId === "github") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Go to github.com/settings/tokens?type=beta`,
        `Click "Generate new token (Fine-grained)"`,
        `Token name: "Manus Next - ${verifiedIdentity.identity}"`,
        `Select repositories and permissions you need`,
        `Copy the token (starts with ghp_) and paste below`,
      ];
    }
    if (connectorId === "microsoft-365") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Open Microsoft Graph Explorer and sign in with your verified account`,
        `Click your profile icon → "Access token" tab`,
        `Copy the access token for the permissions you need`,
        `Or register an app in Azure Portal for long-term access`,
      ];
    }
    if (connectorId === "google-drive" || connectorId === "calendar") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Go to Google Cloud Console → APIs & Services`,
        `Enable the ${connectorId === "google-drive" ? "Google Drive" : "Google Calendar"} API`,
        `Create a Service Account key (JSON)`,
        `Share your ${connectorId === "google-drive" ? "Drive folders" : "calendar"} with the service account email`,
      ];
    }
    return null;
  }, [verifiedIdentity, connectorId]);

  // ── OAuth Setup Guide (for unconfigured Tier 1) ──
  const getOAuthSetupGuide = useCallback(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const callbackUrl = `${origin}/api/connector/oauth/callback`;

    const guides: Record<string, { providerUrl: string; providerLabel: string; secretPrefix: string }> = {
      github: { providerUrl: "https://github.com/settings/developers", providerLabel: "GitHub Developer Settings", secretPrefix: "CONNECTOR_GITHUB" },
      "microsoft-365": { providerUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps", providerLabel: "Azure Portal → App Registrations", secretPrefix: "CONNECTOR_MICROSOFT_365" },
      "google-drive": { providerUrl: "https://console.cloud.google.com/apis/credentials", providerLabel: "Google Cloud Console", secretPrefix: "CONNECTOR_GOOGLE" },
      calendar: { providerUrl: "https://console.cloud.google.com/apis/credentials", providerLabel: "Google Cloud Console", secretPrefix: "CONNECTOR_GOOGLE" },
      notion: { providerUrl: "https://www.notion.so/my-integrations", providerLabel: "Notion Integrations", secretPrefix: "CONNECTOR_NOTION" },
      slack: { providerUrl: "https://api.slack.com/apps", providerLabel: "Slack API Apps", secretPrefix: "CONNECTOR_SLACK" },
    };

    const guide = guides[connectorId];
    if (!guide) return null;
    return { ...guide, callbackUrl };
  }, [connectorId]);

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
  const verifiedGuidance = getVerifiedPATGuidance();
  const oauthSetupGuide = getOAuthSetupGuide();

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
        className="flex-1 overflow-y-auto pb-20 md:pb-0"
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
                      <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      "text-[15px]",
                      completed ? "text-muted-foreground" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
             INLINE TIERED AUTH SECTION (shown when not connected)
             ══════════════════════════════════════════════════════════ */}
          <AnimatePresence>
            {showAuthSection && !isConnected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-8"
              >
                <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
                  {/* Auth section header */}
                  <div className="px-4 py-3 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                      Connect {connectorDef.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {availableTiers.length > 1
                        ? `${availableTiers.length} authentication methods available`
                        : "Enter your credentials to connect"}
                    </p>
                  </div>

                  {/* Verified Identity Banner */}
                  {verifiedIdentity && (
                    <div className="mx-4 mt-3">
                      <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                          <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground">Identity Verified</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            <span className="text-amber-400 font-medium">{verifiedIdentity.identity}</span>
                            {" "}via {verifiedIdentity.method}
                          </p>
                        </div>
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 ml-auto" />
                      </div>
                    </div>
                  )}

                  {/* Tier Accordion */}
                  <div className="p-3 space-y-2">
                    {availableTiers.map(({ tier }, idx) => {
                      const tierInfo = TIER_LABELS[tier];
                      const TierIcon = tierInfo.icon;
                      const isExpanded = expandedTier === tier;
                      const isRecommended = bestTier === tier && !verifiedIdentity;
                      const isVerifiedRecommended = tier === 3 && !!verifiedIdentity;

                      return (
                        <motion.div
                          key={tier}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.04 }}
                          className={cn(
                            "rounded-lg border transition-all duration-200",
                            isExpanded
                              ? "border-primary/30 bg-primary/[0.03]"
                              : "border-border/60 hover:border-primary/20"
                          )}
                        >
                          {/* Tier Header */}
                          <button
                            onClick={() => setExpandedTier(isExpanded ? null : tier)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
                          >
                            <div className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                              isExpanded ? "bg-primary/10" : "bg-muted/50"
                            )}>
                              <TierIcon className={cn("w-3 h-3", isExpanded ? tierInfo.color : "text-muted-foreground")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={cn(
                                  "text-xs font-medium transition-colors",
                                  isExpanded ? "text-foreground" : "text-muted-foreground"
                                )}>
                                  {tierInfo.label}
                                </span>
                                {(isRecommended || isVerifiedRecommended) && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">
                                    {isVerifiedRecommended ? "Verified" : "Best"}
                                  </span>
                                )}
                                {tier === 1 && !isOAuthAvailable && OAUTH_CAPABLE_IDS.has(connectorId) && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    Setup needed
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{tierInfo.desc}</p>
                            </div>
                            <ChevronDown className={cn(
                              "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0",
                              isExpanded && "rotate-180"
                            )} />
                          </button>

                          {/* Tier Content */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-3 pb-3 pt-1">
                                  {/* ── Tier 1: Direct OAuth ── */}
                                  {tier === 1 && (
                                    <div className="space-y-2.5">
                                      {isOAuthAvailable ? (
                                        <>
                                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 text-[11px] text-muted-foreground">
                                            <p className="flex items-start gap-1.5">
                                              <Shield className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                                              <span>OAuth securely connects your account without sharing passwords. You'll be redirected to {connectorDef.name} to authorize.</span>
                                            </p>
                                          </div>
                                          <Button
                                            className="w-full h-9 text-sm"
                                            onClick={handleOAuthConnect}
                                            disabled={connecting}
                                          >
                                            {connecting ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            ) : (
                                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            {authData?.oauthLabel ?? `Sign in with ${connectorDef.name}`}
                                          </Button>
                                        </>
                                      ) : (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-muted-foreground space-y-2">
                                          <p className="flex items-start gap-1.5 font-medium text-amber-500">
                                            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span>OAuth Not Configured</span>
                                          </p>
                                          <p>OAuth credentials for {connectorDef.name} have not been set up. To enable:</p>
                                          {oauthSetupGuide && (
                                            <ol className="list-decimal list-inside space-y-1 ml-1.5 text-[11px]">
                                              <li>Go to <a href={oauthSetupGuide.providerUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{oauthSetupGuide.providerLabel}</a></li>
                                              <li>Create OAuth credentials</li>
                                              <li>Set callback URL to: <code className="bg-muted px-1 rounded text-[10px]">{oauthSetupGuide.callbackUrl}</code></li>
                                              <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">{oauthSetupGuide.secretPrefix}_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">{oauthSetupGuide.secretPrefix}_CLIENT_SECRET</code></li>
                                            </ol>
                                          )}
                                          <p className="text-muted-foreground">Use another method below to connect now.</p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* ── Tier 2: Manus Verify ── */}
                                  {tier === 2 && (
                                    <div className="space-y-2.5">
                                      {verifiedIdentity ? (
                                        <div className="space-y-2.5">
                                          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] text-muted-foreground">
                                            <p className="flex items-start gap-1.5">
                                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                              <span>
                                                Your identity has been verified as <strong className="text-amber-400">{verifiedIdentity.identity}</strong>.
                                                Now create a personal access token using the guided steps below.
                                              </span>
                                            </p>
                                          </div>
                                          {verifiedGuidance && (
                                            <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-[11px] space-y-1.5">
                                              <p className="font-medium text-foreground flex items-center gap-1">
                                                <Key className="w-3 h-3 text-amber-400" />
                                                Personalized token guide:
                                              </p>
                                              <ol className="list-decimal list-inside space-y-0.5 ml-1 text-muted-foreground">
                                                {verifiedGuidance.map((step, i) => (
                                                  <li key={i}>{step}</li>
                                                ))}
                                              </ol>
                                              {authData?.tokenHelp && (
                                                <a
                                                  href={authData.tokenHelp.url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1 text-[11px]"
                                                >
                                                  <ExternalLink className="w-3 h-3" />
                                                  {authData.tokenHelp.label}
                                                </a>
                                              )}
                                            </div>
                                          )}
                                          {/* Token input fields */}
                                          {authData?.configFields.map((field) => (
                                            <div key={field.key}>
                                              <label className="text-[11px] font-medium text-foreground mb-1 block">{field.label}</label>
                                              <Input
                                                placeholder={field.placeholder}
                                                value={configValues[field.key] ?? ""}
                                                onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                                className="h-8 text-xs"
                                              />
                                            </div>
                                          ))}
                                          <Button onClick={handleManualConnect} disabled={connecting} className="w-full h-8 text-xs">
                                            {connecting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                            Connect with Verified Identity
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2.5">
                                          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-2.5 text-[11px] text-muted-foreground">
                                            <p className="flex items-start gap-1.5">
                                              <Fingerprint className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                                              <span>
                                                Verify your identity through the Manus portal.
                                                This confirms your account without sharing any credentials.
                                              </span>
                                            </p>
                                          </div>
                                          <Button
                                            className="w-full h-8 text-xs bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-0"
                                            onClick={handleManusVerify}
                                            disabled={manusVerifyMutation.isPending}
                                          >
                                            {manusVerifyMutation.isPending ? (
                                              <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                                            ) : (
                                              <Fingerprint className="w-3 h-3 mr-1.5" />
                                            )}
                                            Verify via Manus
                                          </Button>
                                          <p className="text-[10px] text-muted-foreground text-center">
                                            Opens Manus portal in a popup. No passwords are shared.
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* ── Tier 3: Smart PAT ── */}
                                  {tier === 3 && (
                                    <div className="space-y-2.5">
                                      {authData?.tokenHelp && !verifiedIdentity && (
                                        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5 text-[11px] text-muted-foreground space-y-1.5">
                                          <p className="font-medium text-foreground flex items-center gap-1">
                                            <Key className="w-3 h-3 text-blue-400" />
                                            How to get your token:
                                          </p>
                                          <ol className="list-decimal list-inside space-y-0.5 ml-1">
                                            {authData.tokenHelp.steps.map((step, i) => (
                                              <li key={i}>{step}</li>
                                            ))}
                                          </ol>
                                          <a
                                            href={authData.tokenHelp.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1 text-[11px]"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            {authData.tokenHelp.label}
                                          </a>
                                        </div>
                                      )}
                                      {verifiedIdentity && verifiedGuidance && (
                                        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-[11px] space-y-1.5">
                                          <p className="font-medium text-foreground flex items-center gap-1">
                                            <BadgeCheck className="w-3 h-3 text-amber-400" />
                                            Personalized for {verifiedIdentity.identity}:
                                          </p>
                                          <ol className="list-decimal list-inside space-y-0.5 ml-1 text-muted-foreground">
                                            {verifiedGuidance.map((step, i) => (
                                              <li key={i}>{step}</li>
                                            ))}
                                          </ol>
                                          {authData?.tokenHelp && (
                                            <a
                                              href={authData.tokenHelp.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1 text-[11px]"
                                            >
                                              <ExternalLink className="w-3 h-3" />
                                              {authData.tokenHelp.label}
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {authData?.configFields.map((field) => (
                                        <div key={field.key}>
                                          <label className="text-[11px] font-medium text-foreground mb-1 block">{field.label}</label>
                                          <Input
                                            placeholder={field.placeholder}
                                            value={configValues[field.key] ?? ""}
                                            onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      ))}
                                      <Button onClick={handleManualConnect} disabled={connecting} className="w-full h-8 text-xs">
                                        {connecting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                        Connect
                                      </Button>
                                    </div>
                                  )}

                                  {/* ── Tier 4: Manual Entry ── */}
                                  {tier === 4 && (
                                    <div className="space-y-2.5">
                                      <p className="text-[11px] text-muted-foreground">
                                        Enter your credentials directly. Refer to {connectorDef.name}'s documentation for the required values.
                                      </p>
                                      {(authData?.configFields ?? [{ key: "token", label: "API Token / Key", placeholder: "Enter your token..." }]).map((field) => (
                                        <div key={field.key}>
                                          <label className="text-[11px] font-medium text-foreground mb-1 block">{field.label}</label>
                                          <Input
                                            placeholder={field.placeholder}
                                            value={configValues[field.key] ?? ""}
                                            onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                            className="h-8 text-xs"
                                          />
                                        </div>
                                      ))}
                                      <Button onClick={handleManualConnect} disabled={connecting} className="w-full h-8 text-xs" variant="outline">
                                        {connecting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                                        Connect
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      <span>{availableTiers.length} auth {availableTiers.length === 1 ? "method" : "methods"}</span>
                    </div>
                    <button
                      onClick={() => setShowAuthSection(false)}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── OAuth Scopes (for connected OAuth connectors) ── */}
          {isConnected && authMethod === "oauth" && oauthScopes && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-2" style={{ fontFamily: "var(--font-heading)" }}>
                Authorized Scopes
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {oauthScopes.split(/[,\s]+/).filter(Boolean).map((scope) => (
                  <span
                    key={scope}
                    className="text-[11px] px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Manus Verified Identity (for connected manus_oauth connectors) ── */}
          {isConnected && authMethod === "manus_oauth" && connectorRecord?.manusVerifiedIdentity && (
            <div className="mb-6">
              <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">Manus Verified</p>
                  <p className="text-[11px] text-amber-400 font-medium truncate">{connectorRecord.manusVerifiedIdentity}</p>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
             AVAILABLE ACTIONS SECTION (for connectors with API support)
             ══════════════════════════════════════════════════════════ */}
          <ConnectorActionsSection
            connectorId={connectorId}
            isConnected={isConnected}
          />

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

              {/* Auth Method (when connected) */}
              {isConnected && authMethod && (
                <>
                  <DetailRow
                    label="Auth Method"
                    value={
                      authMethod === "oauth" ? "Direct OAuth" :
                      authMethod === "manus_oauth" ? "Manus Verified" :
                      "Manual / PAT"
                    }
                  />
                  <DetailDivider />
                </>
              )}

              {/* Connection Status (when connected) — Manus-aligned: Active / Needs Attention / Expired */}
              {isConnected && connectionStatusLabel && (
                <>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <span className="text-sm text-muted-foreground">Connection Status</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        connectionStatusLabel === "Active" ? "bg-emerald-500" :
                        connectionStatusLabel === "Needs Attention" ? "bg-amber-500" :
                        connectionStatusLabel === "Expired" ? "bg-destructive" :
                        "bg-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-sm font-medium",
                        connectionStatusLabel === "Active" ? "text-foreground" :
                        connectionStatusLabel === "Needs Attention" ? "text-amber-500" :
                        connectionStatusLabel === "Expired" ? "text-destructive" :
                        "text-foreground"
                      )}>
                        {connectionStatusLabel}
                      </span>
                    </div>
                  </div>
                  <DetailDivider />
                </>
              )}

              {/* Keep connection active toggle (only for OAuth with refresh tokens) */}
              {isConnected && supportsAutoRefresh && (
                <>
                  <div className="flex items-center justify-between px-4 py-3.5">
                    <div className="min-w-0 mr-3">
                      <span className="text-sm text-muted-foreground">Keep connection active</span>
                    </div>
                    <Switch
                      checked={autoRefreshEnabled}
                      onCheckedChange={(checked) => {
                        autoRefreshMutation.mutate({ connectorId, enabled: checked });
                      }}
                      disabled={autoRefreshMutation.isPending}
                    />
                  </div>
                  <DetailDivider />
                </>
              )}

              {/* Last connected timestamp */}
              {isConnected && lastConnectedAt && (
                <>
                  <DetailRow
                    label="Last connected"
                    value={new Date(lastConnectedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  />
                  <DetailDivider />
                </>
              )}

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
          {/* ── Reconnect prompt (when token expired / refresh failed) ── */}
          {showReconnectPrompt && (
            <div className="mb-6">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">Connection needs attention</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {healthStatus === "expired"
                        ? "Your access token has expired. Reconnect to continue using this connector."
                        : "We couldn\u2019t refresh your connection automatically. Please reconnect."}
                    </p>
                    <button
                      onClick={() => {
                        if (supportsAutoRefresh) {
                          manualRefreshMutation.mutate({ connectorId });
                        } else {
                          setShowAuthSection(true);
                        }
                      }}
                      disabled={manualRefreshMutation.isPending}
                      className="mt-2.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5"
                    >
                      {manualRefreshMutation.isPending ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reconnecting...</>
                      ) : (
                        <><RefreshCw className="w-3.5 h-3.5" /> Reconnect</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom action button ── */}
      <div className="shrink-0 px-6 pb-6 pt-2">
        {isConnected ? (
          showReconnectPrompt ? (
            <button
              onClick={() => {
                if (supportsAutoRefresh) {
                  manualRefreshMutation.mutate({ connectorId });
                } else {
                  setShowAuthSection(true);
                }
              }}
              disabled={manualRefreshMutation.isPending}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] hover:opacity-90 active:opacity-80 transition-opacity flex items-center justify-center gap-2"
            >
              {manualRefreshMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Reconnecting...</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> Reconnect</>
              )}
            </button>
          ) : connectorDef.actionLabel && connectorDef.actionRoute ? (
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
        ) : showAuthSection ? null : connecting ? (
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

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR ACTIONS SECTION — shows available API actions per connector
   with inline action tester for connected connectors
   ═══════════════════════════════════════════════════════════════════ */

interface ActionParam {
  type: string;
  required?: boolean;
  description: string;
}

interface ActionDef {
  id: string;
  name: string;
  description: string;
  parameters?: Record<string, ActionParam>;
}

function ConnectorActionsSection({
  connectorId,
  isConnected,
}: {
  connectorId: string;
  isConnected: boolean;
}) {
  const { data: actionsData, isLoading } = trpc.connector.listActions.useQuery(
    { connectorId },
    { staleTime: 300_000 }
  );

  const executeMutation = trpc.connector.execute.useMutation();

  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; data: string } | null>(null);
  const [copiedResult, setCopiedResult] = useState(false);

  if (!actionsData?.supported || actionsData.actions.length === 0) {
    return null;
  }

  const actions = actionsData.actions as ActionDef[];

  const handleTestAction = async (actionId: string) => {
    setTestResult(null);
    try {
      // Convert string params to appropriate types
      const payload: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(testParams)) {
        if (val.trim() === "") continue;
        // Try to parse as number or JSON, otherwise keep as string
        if (/^\d+$/.test(val)) {
          payload[key] = parseInt(val, 10);
        } else {
          try {
            payload[key] = JSON.parse(val);
          } catch {
            payload[key] = val;
          }
        }
      }
      const result = await executeMutation.mutateAsync({
        connectorId,
        action: actionId,
        payload,
      });
      setTestResult({
        success: result.success,
        data: typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2),
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        data: err.message || "Action failed",
      });
    }
  };

  const handleCopyResult = () => {
    if (testResult?.data) {
      navigator.clipboard.writeText(testResult.data);
      setCopiedResult(true);
      setTimeout(() => setCopiedResult(false), 2000);
    }
  };

  const toggleAction = (actionId: string) => {
    if (expandedAction === actionId) {
      setExpandedAction(null);
      setTestParams({});
      setTestResult(null);
    } else {
      setExpandedAction(actionId);
      setTestParams({});
      setTestResult(null);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Available Actions
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          {actions.length}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading actions...</span>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden divide-y divide-border/30">
          {actions.map((action) => {
            const isExpanded = expandedAction === action.id;
            const params = action.parameters ? Object.entries(action.parameters) : [];
            const requiredParams = params.filter(([, p]) => p.required);

            return (
              <div key={action.id}>
                {/* Action header row */}
                <button
                  onClick={() => toggleAction(action.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors text-left group"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {action.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {action.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {params.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                        {params.length} param{params.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded action detail + tester */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 bg-muted/5">
                        {/* Parameters list */}
                        {params.length > 0 && (
                          <div className="mb-3">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                              Parameters
                            </p>
                            <div className="space-y-2">
                              {params.map(([key, param]) => (
                                <div key={key}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <code className="text-[11px] font-mono text-foreground bg-muted/40 px-1.5 py-0.5 rounded">
                                      {key}
                                    </code>
                                    <span className="text-[10px] text-muted-foreground">{param.type}</span>
                                    {param.required && (
                                      <span className="text-[9px] px-1 py-0 rounded bg-destructive/10 text-destructive font-medium">
                                        required
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mb-1.5 pl-0.5">
                                    {param.description}
                                  </p>
                                  {/* Input for testing (only when connected) */}
                                  {isConnected && (
                                    <Input
                                      placeholder={param.description}
                                      value={testParams[key] ?? ""}
                                      onChange={(e) =>
                                        setTestParams((prev) => ({ ...prev, [key]: e.target.value }))
                                      }
                                      className="h-7 text-xs font-mono"
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Test button (only when connected) */}
                        {isConnected && (
                          <div className="space-y-2">
                            <Button
                              size="sm"
                              onClick={() => handleTestAction(action.id)}
                              disabled={
                                executeMutation.isPending ||
                                requiredParams.some(([key]) => !testParams[key]?.trim())
                              }
                              className="h-7 text-xs gap-1.5"
                            >
                              {executeMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Test Action
                            </Button>

                            {/* Test result */}
                            {testResult && (
                              <div
                                className={cn(
                                  "rounded-lg border p-3 relative",
                                  testResult.success
                                    ? "border-emerald-500/20 bg-emerald-500/5"
                                    : "border-destructive/20 bg-destructive/5"
                                )}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span
                                    className={cn(
                                      "text-[11px] font-semibold",
                                      testResult.success ? "text-emerald-400" : "text-destructive"
                                    )}
                                  >
                                    {testResult.success ? "Success" : "Error"}
                                  </span>
                                  <button
                                    onClick={handleCopyResult}
                                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                                    title="Copy result"
                                  >
                                    {copiedResult ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                  {testResult.data}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Not connected hint */}
                        {!isConnected && (
                          <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/30 border border-border/30">
                            <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <p className="text-[11px] text-muted-foreground">
                              Connect this service to test actions directly from here.
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
