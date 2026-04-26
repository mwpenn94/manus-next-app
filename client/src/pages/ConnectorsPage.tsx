import React from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plug, Search, CheckCircle, XCircle, Loader2, Shield, Key,
  ExternalLink, RefreshCw, Plus, Globe, Server, Trash2, Info,
  ShieldCheck, BadgeCheck, Fingerprint, ChevronDown, Sparkles, Layers,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ═══════════════════════════════════════════════════════════════════
   CONNECTOR DEFINITIONS
   ═══════════════════════════════════════════════════════════════════ */

/** OAuth-capable connectors — these COULD support direct OAuth if credentials are configured */
const OAUTH_CAPABLE_CONNECTORS = new Set(["github", "google-drive", "notion", "slack", "calendar", "microsoft-365"]);

/** Connectors that support Manus identity verification (Tier 2) */
const MANUS_VERIFIABLE_IDS = new Set(["github", "microsoft-365", "google-drive", "calendar"]);

/** Tier labels for display */
const TIER_LABELS: Record<number, { label: string; icon: typeof Shield; color: string; desc: string }> = {
  1: { label: "Direct OAuth", icon: Shield, color: "text-emerald-400", desc: "One-click authorization via provider" },
  2: { label: "Manus Verify", icon: Fingerprint, color: "text-amber-400", desc: "Verify identity via Manus, then guided token setup" },
  3: { label: "Smart PAT", icon: Key, color: "text-blue-400", desc: "Step-by-step personal access token guide" },
  4: { label: "Manual Entry", icon: Globe, color: "text-muted-foreground", desc: "Enter credentials directly" },
};

interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  oauthLabel?: string;
  configFields: { key: string; label: string; placeholder: string }[];
  tokenHelp?: { url: string; label: string; steps: string[] };
}

const AVAILABLE_CONNECTORS: ConnectorDef[] = [
  // Communication
  { id: "slack", name: "Slack", description: "Send messages and manage channels", category: "Communication", icon: "\u{1F4AC}", oauthLabel: "Sign in with Slack", configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." }], tokenHelp: { url: "https://api.slack.com/apps", label: "Create app at Slack API", steps: ["Go to api.slack.com/apps and create a new app", "Under 'Incoming Webhooks', activate and create a webhook", "Copy the Webhook URL", "Or use a Bot Token (xoxb-) for full API access"] } },
  { id: "email", name: "Email (SMTP)", description: "Send emails via SMTP", category: "Communication", icon: "\u{1F4E7}", configFields: [{ key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" }, { key: "port", label: "Port", placeholder: "587" }, { key: "user", label: "Username", placeholder: "you@example.com" }, { key: "pass", label: "Password", placeholder: "app-password" }] },
  { id: "gmail", name: "Gmail", description: "Read, send, and manage Gmail", category: "Communication", icon: "\u{2709}\u{FE0F}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }], tokenHelp: { url: "https://console.cloud.google.com/apis/credentials", label: "Create credentials in Google Cloud", steps: ["Go to Google Cloud Console \u2192 APIs & Services", "Enable the Gmail API", "Create a Service Account with domain-wide delegation", "Download the JSON key and paste it here"] } },
  { id: "outlook", name: "Outlook Mail", description: "Access Outlook email", category: "Communication", icon: "\u{1F4E8}", oauthLabel: "Sign in with Microsoft", configFields: [{ key: "accessToken", label: "Access Token or App Password", placeholder: "EwB..." }], tokenHelp: { url: "https://developer.microsoft.com/en-us/graph/graph-explorer", label: "Get token from Graph Explorer", steps: ["Open Microsoft Graph Explorer and sign in", "Click your profile icon \u2192 'Access token' tab", "Copy the access token for Mail.Read, Mail.Send permissions"] } },
  // Development
  { id: "github", name: "GitHub", description: "Manage repos, issues, and PRs", category: "Development", icon: "\u{1F419}", oauthLabel: "Sign in with GitHub", configFields: [{ key: "token", label: "Personal Access Token", placeholder: "ghp_..." }], tokenHelp: { url: "https://github.com/settings/tokens?type=beta", label: "Generate token at GitHub Settings", steps: ["Go to GitHub Settings \u2192 Developer settings \u2192 Personal access tokens", "Click 'Generate new token (Fine-grained)'", "Select repositories and permissions: Contents (read/write), Issues (read/write), Pull requests (read/write)", "Copy the token (starts with ghp_)"] } },
  { id: "vercel", name: "Vercel", description: "Deploy and manage Vercel projects", category: "Development", icon: "\u{25B2}", configFields: [{ key: "token", label: "API Token", placeholder: "..." }], tokenHelp: { url: "https://vercel.com/account/tokens", label: "Create token at Vercel", steps: ["Go to Vercel \u2192 Account Settings \u2192 Tokens", "Click 'Create' and name your token", "Copy the token immediately (shown only once)"] } },
  { id: "supabase", name: "Supabase", description: "Manage Supabase projects and databases", category: "Development", icon: "\u{26A1}", configFields: [{ key: "apiKey", label: "Service Role Key", placeholder: "eyJ..." }] },
  { id: "neon", name: "Neon", description: "Serverless Postgres databases", category: "Development", icon: "\u{1F4BE}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
  { id: "cloudflare", name: "Cloudflare", description: "DNS, Workers, and CDN management", category: "Development", icon: "\u{2601}\u{FE0F}", configFields: [{ key: "apiToken", label: "API Token", placeholder: "..." }] },
  { id: "playwright", name: "Playwright", description: "Browser automation and testing", category: "Development", icon: "\u{1F3AD}", configFields: [{ key: "serverUrl", label: "Server URL", placeholder: "ws://localhost:3000" }] },
  // Storage
  { id: "google-drive", name: "Google Drive", description: "Access and manage Drive files", category: "Storage", icon: "\u{1F4C1}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }], tokenHelp: { url: "https://console.cloud.google.com/iam-admin/serviceaccounts", label: "Create service account in Google Cloud", steps: ["Go to Google Cloud Console \u2192 IAM & Admin \u2192 Service Accounts", "Create a service account and grant 'Editor' role", "Create a key (JSON type) and download it", "Paste the entire JSON content into the field above"] } },
  { id: "dropbox", name: "Dropbox", description: "Cloud file storage and sharing", category: "Storage", icon: "\u{1F4E6}", configFields: [{ key: "accessToken", label: "Access Token", placeholder: "..." }] },
  // Productivity
  { id: "notion", name: "Notion", description: "Read and write Notion pages", category: "Productivity", icon: "\u{1F4DD}", oauthLabel: "Sign in with Notion", configFields: [{ key: "apiKey", label: "Integration Token", placeholder: "secret_..." }], tokenHelp: { url: "https://www.notion.so/my-integrations", label: "Create integration at Notion", steps: ["Go to notion.so/my-integrations", "Click 'New integration' and name it", "Select the workspace and capabilities needed", "Copy the Internal Integration Token (starts with secret_)", "Share target pages/databases with your integration"] } },
  { id: "calendar", name: "Google Calendar", description: "Manage calendar events", category: "Productivity", icon: "\u{1F4C5}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }], tokenHelp: { url: "https://console.cloud.google.com/apis/credentials", label: "Create credentials in Google Cloud", steps: ["Go to Google Cloud Console \u2192 APIs & Services \u2192 Credentials", "Enable the Google Calendar API", "Create a Service Account key (JSON)", "Share your calendar with the service account email", "Paste the JSON key content into the field above"] } },
  { id: "microsoft-365", name: "Microsoft 365", description: "Access Outlook, OneDrive, Teams, and Office apps", category: "Productivity", icon: "\u{1F4BC}", oauthLabel: "Sign in with Microsoft", configFields: [{ key: "accessToken", label: "Access Token or App Password", placeholder: "EwB..." }], tokenHelp: { url: "https://developer.microsoft.com/en-us/graph/graph-explorer", label: "Get token from Graph Explorer", steps: ["Open Microsoft Graph Explorer and sign in", "Click your profile icon \u2192 'Access token' tab", "Copy the access token for immediate use", "For long-term access: register an app in Azure Portal \u2192 App registrations"] } },
  { id: "asana", name: "Asana", description: "Project and task management", category: "Productivity", icon: "\u{1F4CB}", configFields: [{ key: "token", label: "Personal Access Token", placeholder: "..." }] },
  { id: "linear", name: "Linear", description: "Issue tracking for software teams", category: "Productivity", icon: "\u{1F4CA}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "lin_api_..." }] },
  { id: "todoist", name: "Todoist", description: "Task management and to-do lists", category: "Productivity", icon: "\u{2705}", configFields: [{ key: "apiToken", label: "API Token", placeholder: "..." }] },
  { id: "airtable", name: "Airtable", description: "Spreadsheet-database hybrid", category: "Productivity", icon: "\u{1F4CA}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "pat..." }] },
  // Automation
  { id: "zapier", name: "Zapier", description: "Connect to 5000+ apps via Zapier webhooks", category: "Automation", icon: "\u{26A1}", configFields: [{ key: "webhookUrl", label: "Zap Webhook URL", placeholder: "https://hooks.zapier.com/..." }] },
  { id: "n8n", name: "n8n", description: "Workflow automation platform", category: "Automation", icon: "\u{1F504}", configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://..." }] },
  // AI & Analytics
  { id: "openai", name: "OpenAI", description: "GPT models and DALL-E", category: "AI", icon: "\u{1F916}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }], tokenHelp: { url: "https://platform.openai.com/api-keys", label: "Get API key at OpenAI", steps: ["Go to platform.openai.com \u2192 API keys", "Click 'Create new secret key'", "Copy the key (starts with sk-)"] } },
  { id: "anthropic", name: "Anthropic", description: "Claude AI models", category: "AI", icon: "\u{1F9E0}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-ant-..." }], tokenHelp: { url: "https://console.anthropic.com/settings/keys", label: "Get API key at Anthropic", steps: ["Go to console.anthropic.com \u2192 Settings \u2192 API Keys", "Click 'Create Key'", "Copy the key (starts with sk-ant-)"] } },
  { id: "perplexity", name: "Perplexity", description: "AI-powered search and research", category: "AI", icon: "\u{1F50D}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "pplx-..." }] },
  { id: "elevenlabs", name: "ElevenLabs", description: "AI voice synthesis", category: "AI", icon: "\u{1F3A4}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
  { id: "huggingface", name: "Hugging Face", description: "ML models and datasets", category: "AI", icon: "\u{1F917}", configFields: [{ key: "token", label: "Access Token", placeholder: "hf_..." }] },
  // Marketing & CRM
  { id: "hubspot", name: "HubSpot", description: "CRM and marketing automation", category: "Marketing", icon: "\u{1F4C8}", configFields: [{ key: "apiKey", label: "Private App Token", placeholder: "pat-..." }] },
  { id: "mailchimp", name: "Mailchimp", description: "Email marketing campaigns", category: "Marketing", icon: "\u{1F4E9}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
  { id: "posthog", name: "PostHog", description: "Product analytics and feature flags", category: "Analytics", icon: "\u{1F994}", configFields: [{ key: "apiKey", label: "Project API Key", placeholder: "phc_..." }] },
  // Payments
  { id: "stripe-api", name: "Stripe", description: "Payment processing and billing", category: "Payments", icon: "\u{1F4B3}", configFields: [{ key: "secretKey", label: "Secret Key", placeholder: "sk_..." }] },
  { id: "paypal", name: "PayPal", description: "Online payments and invoicing", category: "Payments", icon: "\u{1F4B0}", configFields: [{ key: "clientId", label: "Client ID", placeholder: "..." }, { key: "clientSecret", label: "Client Secret", placeholder: "..." }] },
  // Design
  { id: "canva", name: "Canva", description: "Design and visual content creation", category: "Design", icon: "\u{1F3A8}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
  { id: "webflow", name: "Webflow", description: "Visual website builder", category: "Design", icon: "\u{1F310}", configFields: [{ key: "apiToken", label: "API Token", placeholder: "..." }] },
  // Data
  { id: "firecrawl", name: "Firecrawl", description: "Web scraping and data extraction", category: "Data", icon: "\u{1F525}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "fc-..." }] },
  { id: "similarweb", name: "Similarweb", description: "Website traffic analytics", category: "Data", icon: "\u{1F4CA}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
];

/* ═══════════════════════════════════════════════════════════════════
   TIERED AUTH CONNECT DIALOG — Manus-aligned design
   ═══════════════════════════════════════════════════════════════════ */

interface TieredAuthDialogProps {
  connector: ConnectorDef;
  tierStatus: { tier1: boolean; tier2: boolean; tier3: boolean; tier4: boolean; bestTier: number } | null;
  onClose: () => void;
  onManualConnect: (config: Record<string, string>) => void;
  onOAuthConnect: (connectorId: string) => void;
  onManusVerify: (connectorId: string) => void;
  isConnecting: boolean;
  isOAuthPending: boolean;
  isManusVerifyPending: boolean;
  verifiedIdentity: { identity: string; method: string } | null;
  oauthConfigured: boolean;
}

function TieredAuthDialog({
  connector,
  tierStatus,
  onClose,
  onManualConnect,
  onOAuthConnect,
  onManusVerify,
  isConnecting,
  isOAuthPending,
  isManusVerifyPending,
  verifiedIdentity,
  oauthConfigured,
}: TieredAuthDialogProps) {
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [expandedTier, setExpandedTier] = useState<number | null>(null);

  // Auto-select best available tier on mount
  useEffect(() => {
    if (tierStatus) {
      // If already verified via Manus, go straight to PAT with context
      if (verifiedIdentity) {
        setExpandedTier(3);
      } else {
        setExpandedTier(tierStatus.bestTier);
      }
    } else {
      // No tier data: default to manual
      setExpandedTier(connector.tokenHelp ? 3 : 4);
    }
  }, [tierStatus, verifiedIdentity, connector.tokenHelp]);

  const handleSubmit = () => {
    onManualConnect(configValues);
  };

  // Build available tiers list
  const tiers: { tier: number; available: boolean }[] = [
    { tier: 1, available: tierStatus?.tier1 ?? false },
    { tier: 2, available: tierStatus?.tier2 ?? false },
    { tier: 3, available: !!(connector.tokenHelp) },
    { tier: 4, available: true },
  ];

  const availableTiers = tiers.filter(t => t.available);

  // Contextual PAT guidance when Manus-verified
  const getVerifiedPATGuidance = (): string[] | null => {
    if (!verifiedIdentity) return null;
    const id = connector.id;
    if (id === "github") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Go to github.com/settings/tokens?type=beta`,
        `Click "Generate new token (Fine-grained)"`,
        `Token name: "Manus Next - ${verifiedIdentity.identity}"`,
        `Select repositories and permissions you need`,
        `Copy the token (starts with ghp_) and paste below`,
      ];
    }
    if (id === "microsoft-365") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Open Microsoft Graph Explorer and sign in with your verified account`,
        `Click your profile icon \u2192 "Access token" tab`,
        `Copy the access token for the permissions you need`,
        `Or register an app in Azure Portal for long-term access`,
      ];
    }
    if (id === "google-drive" || id === "calendar") {
      return [
        `Verified as: ${verifiedIdentity.identity} (via ${verifiedIdentity.method})`,
        `Go to Google Cloud Console \u2192 APIs & Services`,
        `Enable the ${id === "google-drive" ? "Google Drive" : "Google Calendar"} API`,
        `Create a Service Account key (JSON)`,
        `Share your ${id === "google-drive" ? "Drive folders" : "calendar"} with the service account email`,
      ];
    }
    return null;
  };

  const verifiedGuidance = getVerifiedPATGuidance();

  return (
    <DialogContent className="max-w-lg p-0 overflow-hidden bg-card border-border">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg" style={{ fontFamily: "var(--font-heading)" }}>
            <span className="text-2xl">{connector.icon}</span>
            <span>Connect {connector.name}</span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1.5">
            {availableTiers.length > 1
              ? "Multiple authentication methods available. Choose the one that works best for you."
              : "Enter your credentials to connect this service."}
          </DialogDescription>
        </DialogHeader>

        {/* Verified Identity Banner */}
        <AnimatePresence>
          {verifiedIdentity && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                  <BadgeCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    Identity Verified
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    <span className="text-amber-400 font-medium">{verifiedIdentity.identity}</span>
                    {" "}via {verifiedIdentity.method}
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 ml-auto" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator />

      {/* Tier Accordion */}
      <div className="px-6 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
        {availableTiers.map(({ tier }, idx) => {
          const tierInfo = TIER_LABELS[tier];
          const TierIcon = tierInfo.icon;
          const isExpanded = expandedTier === tier;
          const isRecommended = tierStatus?.bestTier === tier && !verifiedIdentity;
          const isVerifiedRecommended = tier === 3 && !!verifiedIdentity;

          return (
            <motion.div
              key={tier}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className={cn(
                "rounded-xl border transition-all duration-200",
                isExpanded
                  ? "border-primary/30 bg-primary/[0.03] shadow-sm"
                  : "border-border hover:border-primary/20"
              )}
            >
              {/* Tier Header */}
              <button
                onClick={() => setExpandedTier(isExpanded ? null : tier)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  isExpanded ? "bg-primary/10" : "bg-muted/50"
                )}>
                  <TierIcon className={cn("w-3.5 h-3.5", isExpanded ? tierInfo.color : "text-muted-foreground")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-medium transition-colors",
                      isExpanded ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {tierInfo.label}
                    </span>
                    {(isRecommended || isVerifiedRecommended) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium border border-amber-500/20">
                        {isVerifiedRecommended ? "Verified" : "Recommended"}
                      </span>
                    )}
                    {tier === 1 && !oauthConfigured && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                        Not configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{tierInfo.desc}</p>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
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
                    <div className="px-4 pb-4 pt-1">
                      {/* ── Tier 1: Direct OAuth ── */}
                      {tier === 1 && (
                        <div className="space-y-3">
                          {oauthConfigured ? (
                            <>
                              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
                                <p className="flex items-start gap-2">
                                  <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                                  <span>OAuth securely connects your account without sharing passwords or tokens. You'll be redirected to {connector.name} to authorize access.</span>
                                </p>
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => onOAuthConnect(connector.id)}
                                disabled={isOAuthPending}
                              >
                                {isOAuthPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                )}
                                {connector.oauthLabel ?? `Sign in with ${connector.name}`}
                              </Button>
                            </>
                          ) : (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground space-y-2">
                              <p className="flex items-start gap-2 font-medium text-amber-500">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>OAuth Not Configured</span>
                              </p>
                              <p>OAuth credentials for {connector.name} have not been set up. To enable:</p>
                              <OAuthSetupGuide connectorId={connector.id} />
                              <p className="text-muted-foreground/70 mt-1">Use another method below to connect now.</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Tier 2: Manus Verify ── */}
                      {tier === 2 && (
                        <div className="space-y-3">
                          {verifiedIdentity ? (
                            <div className="space-y-3">
                              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                                <p className="flex items-start gap-2">
                                  <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                  <span>
                                    Your identity has been verified as <strong className="text-amber-400">{verifiedIdentity.identity}</strong>.
                                    Now create a personal access token for {connector.name} using the guided steps below.
                                  </span>
                                </p>
                              </div>
                              {/* Show contextual PAT guidance */}
                              {verifiedGuidance && (
                                <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
                                  <p className="font-medium text-foreground flex items-center gap-1.5">
                                    <Key className="w-3.5 h-3.5 text-amber-400" />
                                    Personalized token guide:
                                  </p>
                                  <ol className="list-decimal list-inside space-y-1 ml-1 text-muted-foreground">
                                    {verifiedGuidance.map((step, i) => (
                                      <li key={i}>{step}</li>
                                    ))}
                                  </ol>
                                  {connector.tokenHelp && (
                                    <a
                                      href={connector.tokenHelp.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      {connector.tokenHelp.label}
                                    </a>
                                  )}
                                </div>
                              )}
                              {/* Token input fields */}
                              {connector.configFields.map((field) => (
                                <div key={field.key}>
                                  <label className="text-xs font-medium text-foreground mb-1 block">{field.label}</label>
                                  <Input
                                    placeholder={field.placeholder}
                                    value={configValues[field.key] ?? ""}
                                    onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                    className="h-9 text-sm"
                                  />
                                </div>
                              ))}
                              <Button onClick={handleSubmit} disabled={isConnecting} className="w-full">
                                {isConnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                                Connect with Verified Identity
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3 text-xs text-muted-foreground">
                                <p className="flex items-start gap-2">
                                  <Fingerprint className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                                  <span>
                                    Verify your identity through Manus to get personalized setup guidance for {connector.name}.
                                    This confirms your account without sharing any credentials.
                                  </span>
                                </p>
                              </div>
                              <Button
                                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border-0"
                                onClick={() => onManusVerify(connector.id)}
                                disabled={isManusVerifyPending}
                              >
                                {isManusVerifyPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                  <Fingerprint className="w-4 h-4 mr-2" />
                                )}
                                Verify via Manus
                              </Button>
                              <p className="text-[10px] text-muted-foreground/60 text-center">
                                Opens Manus portal in a popup. No passwords are shared with this app.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Tier 3: Smart PAT ── */}
                      {tier === 3 && (
                        <div className="space-y-3">
                          {connector.tokenHelp && !verifiedIdentity && (
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground space-y-1.5">
                              <p className="font-medium text-foreground flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-blue-400" />
                                How to get your token:
                              </p>
                              <ol className="list-decimal list-inside space-y-1 ml-1">
                                {connector.tokenHelp.steps.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                              <a
                                href={connector.tokenHelp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {connector.tokenHelp.label}
                              </a>
                            </div>
                          )}
                          {/* If verified, show contextual guidance instead */}
                          {verifiedIdentity && verifiedGuidance && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs space-y-1.5">
                              <p className="font-medium text-foreground flex items-center gap-1.5">
                                <BadgeCheck className="w-3.5 h-3.5 text-amber-400" />
                                Personalized for {verifiedIdentity.identity}:
                              </p>
                              <ol className="list-decimal list-inside space-y-1 ml-1 text-muted-foreground">
                                {verifiedGuidance.map((step, i) => (
                                  <li key={i}>{step}</li>
                                ))}
                              </ol>
                              {connector.tokenHelp && (
                                <a
                                  href={connector.tokenHelp.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {connector.tokenHelp.label}
                                </a>
                              )}
                            </div>
                          )}
                          {connector.configFields.map((field) => (
                            <div key={field.key}>
                              <label className="text-xs font-medium text-foreground mb-1 block">{field.label}</label>
                              <Input
                                placeholder={field.placeholder}
                                value={configValues[field.key] ?? ""}
                                onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                className="h-9 text-sm"
                              />
                            </div>
                          ))}
                          <Button onClick={handleSubmit} disabled={isConnecting} className="w-full">
                            {isConnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                            Connect
                          </Button>
                        </div>
                      )}

                      {/* ── Tier 4: Manual Entry ── */}
                      {tier === 4 && (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Enter your credentials directly. Refer to {connector.name}'s documentation for the required values.
                          </p>
                          {connector.configFields.map((field) => (
                            <div key={field.key}>
                              <label className="text-xs font-medium text-foreground mb-1 block">{field.label}</label>
                              <Input
                                placeholder={field.placeholder}
                                value={configValues[field.key] ?? ""}
                                onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                                className="h-9 text-sm"
                              />
                            </div>
                          ))}
                          <Button onClick={handleSubmit} disabled={isConnecting} className="w-full" variant="outline">
                            {isConnecting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
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
      <div className="px-6 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
          <Layers className="w-3 h-3" />
          <span>{availableTiers.length} auth {availableTiers.length === 1 ? "method" : "methods"} available</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
          Cancel
        </Button>
      </div>
    </DialogContent>
  );
}

/** OAuth setup guide for unconfigured connectors */
function OAuthSetupGuide({ connectorId }: { connectorId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = `${origin}/api/connector/oauth/callback`;

  const guides: Record<string, React.ReactNode> = {
    "github": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">GitHub Developer Settings</a></li>
        <li>Create a new OAuth App</li>
        <li>Set callback URL to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GITHUB_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GITHUB_CLIENT_SECRET</code></li>
      </ol>
    ),
    "microsoft-365": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Azure Portal &rarr; App Registrations</a></li>
        <li>Create a new registration</li>
        <li>Set redirect URI to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_MICROSOFT_365_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_MICROSOFT_365_CLIENT_SECRET</code></li>
      </ol>
    ),
    "google-drive": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a></li>
        <li>Create OAuth 2.0 credentials</li>
        <li>Set redirect URI to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GOOGLE_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GOOGLE_CLIENT_SECRET</code></li>
      </ol>
    ),
    "calendar": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a></li>
        <li>Enable the Google Calendar API and create OAuth 2.0 credentials</li>
        <li>Set redirect URI to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GOOGLE_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_GOOGLE_CLIENT_SECRET</code></li>
      </ol>
    ),
    "notion": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline">Notion Integrations</a></li>
        <li>Create a new public integration</li>
        <li>Set redirect URI to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_NOTION_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_NOTION_CLIENT_SECRET</code></li>
      </ol>
    ),
    "slack": (
      <ol className="list-decimal list-inside space-y-1 ml-2">
        <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">Slack API Apps</a></li>
        <li>Create a new Slack App</li>
        <li>Set redirect URL to: <code className="bg-muted px-1 rounded text-[10px]">{callbackUrl}</code></li>
        <li>Add secrets: <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_SLACK_CLIENT_ID</code> and <code className="bg-muted px-1 rounded text-[10px]">CONNECTOR_SLACK_CLIENT_SECRET</code></li>
      </ol>
    ),
  };

  return guides[connectorId] || <p>Refer to the provider's documentation for OAuth setup.</p>;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════════════ */

export default function ConnectorsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [pageTab, setPageTab] = useState<"apps" | "custom-api" | "custom-mcp">("apps");
  const [connectDialog, setConnectDialog] = useState<ConnectorDef | null>(null);

  // Custom API state
  const [customApiDialog, setCustomApiDialog] = useState(false);
  const [customApiName, setCustomApiName] = useState("");
  const [customApiBaseUrl, setCustomApiBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customApiHeaders, setCustomApiHeaders] = useState("");

  // Custom MCP state
  const [customMcpDialog, setCustomMcpDialog] = useState(false);
  const [customMcpName, setCustomMcpName] = useState("");
  const [customMcpUrl, setCustomMcpUrl] = useState("");
  const [customMcpTransport, setCustomMcpTransport] = useState<"stdio" | "sse">("sse");

  // Manus verification state
  const [verifiedIdentities, setVerifiedIdentities] = useState<Record<string, { identity: string; method: string }>>({});

  const utils = trpc.useUtils();
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, { enabled: !!user });
  const { data: oauthAvail = {} } = trpc.connector.oauthAvailability.useQuery();
  const { data: tierStatus = {} } = trpc.connector.tieredAuthStatus.useQuery();

  const connectMutation = trpc.connector.connect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector linked successfully");
      setConnectDialog(null);
      setCustomApiDialog(false);
      setCustomMcpDialog(false);
    },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector disconnected");
    },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  const oauthPopupRef = useRef<Window | null>(null);

  const oauthUrlMutation = trpc.connector.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      if (data.supported && data.url) {
        toast.info("Redirecting to authorization page...");
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
          window.location.href = data.url;
        } else {
          const popup = window.open(data.url, "oauth_popup", "width=600,height=700,scrollbars=yes");
          oauthPopupRef.current = popup;
        }
      } else {
        toast.info("OAuth not configured for this connector. Use another method.");
      }
    },
    onError: (err) => { toast.error(`OAuth error: ${err.message}`); },
  });

  const completeOAuthMutation = trpc.connector.completeOAuth.useMutation({
    onSuccess: (data) => {
      utils.connector.list.invalidate();
      toast.success(`Connected as ${data.name}`);
      setConnectDialog(null);
    },
    onError: (err) => { toast.error(`OAuth completion failed: ${err.message}`); },
  });

  const refreshOAuthMutation = trpc.connector.refreshOAuth.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Token refreshed successfully");
    },
    onError: (err) => { toast.error(`Refresh failed: ${err.message}`); },
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
    onError: (err) => { toast.error(`Verification error: ${err.message}`); },
  });

  // Listen for OAuth and Manus verification callbacks from popup windows
  const handlePopupMessage = useCallback((event: MessageEvent) => {
    // Direct OAuth success
    if (event.data?.type === "connector-oauth-success") {
      utils.connector.list.invalidate();
      toast.success(`Connected via ${event.data.connectorId}`);
      setConnectDialog(null);
      return;
    }
    if (event.data?.type === "connector-oauth-callback") {
      const { connectorId, code } = event.data;
      if (connectorId && code) {
        completeOAuthMutation.mutate({ connectorId, code, origin: window.location.origin });
      }
      return;
    }
    // Manus verification success
    if (event.data?.type === "connector-manus-verified") {
      const { connectorId, verifiedIdentity, loginMethod } = event.data;
      if (connectorId && verifiedIdentity) {
        setVerifiedIdentities(prev => ({
          ...prev,
          [connectorId]: { identity: verifiedIdentity, method: loginMethod || "Manus" },
        }));
        utils.connector.list.invalidate();
        toast.success(`Identity verified: ${verifiedIdentity}`);
      }
    }
  }, [completeOAuthMutation, utils.connector.list]);

  useEffect(() => {
    window.addEventListener("message", handlePopupMessage);
    return () => window.removeEventListener("message", handlePopupMessage);
  }, [handlePopupMessage]);

  // Check URL params for OAuth success or Manus verification
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // OAuth success redirect
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      utils.connector.list.invalidate();
      toast.success(`Successfully connected ${oauthSuccess}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    // Manus verification redirect
    const manusVerified = params.get("manus_verified");
    const identity = params.get("identity");
    const method = params.get("method");
    if (manusVerified && identity) {
      setVerifiedIdentities(prev => ({
        ...prev,
        [manusVerified]: { identity, method: method || "Manus" },
      }));
      // Auto-open the connector dialog
      const connector = AVAILABLE_CONNECTORS.find(c => c.id === manusVerified);
      if (connector) {
        setConnectDialog(connector);
      }
      toast.success(`Identity verified: ${identity}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
    // OAuth code callback
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const parsed = JSON.parse(atob(state));
        if (parsed.connectorId) {
          completeOAuthMutation.mutate({ connectorId: parsed.connectorId, code, origin: window.location.origin });
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch { /* ignore */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const installedMap = useMemo(() => {
    const m = new Map<string, (typeof installed)[0]>();
    installed.forEach((c) => m.set(c.connectorId, c));
    return m;
  }, [installed]);

  const filtered = useMemo(
    () => AVAILABLE_CONNECTORS.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  const customApis = installed.filter((c) => c.connectorId.startsWith("custom-api-"));
  const customMcps = installed.filter((c) => c.connectorId.startsWith("custom-mcp-"));

  const handleManualConnect = (config: Record<string, string>) => {
    if (!connectDialog) return;
    connectMutation.mutate({ connectorId: connectDialog.id, name: connectDialog.name, config });
  };

  const handleOAuthConnect = (connectorId: string) => {
    oauthUrlMutation.mutate({ connectorId, origin: window.location.origin });
  };

  const handleManusVerify = (connectorId: string) => {
    manusVerifyMutation.mutate({ connectorId, origin: window.location.origin });
  };

  const handleCustomApiSave = () => {
    if (!customApiName.trim() || !customApiBaseUrl.trim()) {
      toast.error("Name and Base URL are required");
      return;
    }
    const id = `custom-api-${customApiName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    connectMutation.mutate({
      connectorId: id,
      name: customApiName,
      config: { baseUrl: customApiBaseUrl, apiKey: customApiKey, headers: customApiHeaders },
    });
  };

  const handleCustomMcpSave = () => {
    if (!customMcpName.trim() || !customMcpUrl.trim()) {
      toast.error("Name and Server URL are required");
      return;
    }
    const id = `custom-mcp-${customMcpName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    connectMutation.mutate({
      connectorId: id,
      name: customMcpName,
      config: { serverUrl: customMcpUrl, transport: customMcpTransport },
    });
  };

  const isOAuthConfigured = (id: string) => !!(oauthAvail as Record<string, boolean>)[id];

  /** Get the auth method badge for a connected connector */
  const getAuthBadge = (inst: (typeof installed)[0]) => {
    const method = (inst as any)?.authMethod;
    const verified = (inst as any)?.manusVerifiedIdentity;
    if (method === "manus_oauth" && verified) {
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-500/30 gap-1">
          <BadgeCheck className="w-3 h-3" />
          Verified
        </Badge>
      );
    }
    if (method === "oauth") {
      return (
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 gap-1">
          <Shield className="w-3 h-3" />
          OAuth
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1">
        <CheckCircle className="w-3 h-3" />
        Connected
      </Badge>
    );
  };

  /** Get the tier indicator for a connector card */
  const getTierIndicator = (id: string) => {
    const ts = (tierStatus as Record<string, any>)[id];
    if (!ts) return null;
    const hasTier1 = ts.tier1;
    const hasTier2 = ts.tier2;
    if (hasTier1) {
      return (
        <span title="Direct OAuth available">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        </span>
      );
    }
    if (hasTier2) {
      return (
        <span title="Manus Verify available">
          <Fingerprint className="w-3.5 h-3.5 text-amber-400" />
        </span>
      );
    }
    if (OAUTH_CAPABLE_CONNECTORS.has(id)) {
      return (
        <span title="OAuth available (needs setup)">
          <Shield className="w-3.5 h-3.5 text-muted-foreground/40" />
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          className="flex items-center gap-3 mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Plug className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            Connectors
          </h1>
          <Badge variant="secondary" className="ml-auto">
            {installed.filter((c) => c.status === "connected").length} connected
          </Badge>
        </motion.div>

        {/* Page-level tabs */}
        <Tabs value={pageTab} onValueChange={(v) => setPageTab(v as typeof pageTab)} className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="apps" className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Apps
            </TabsTrigger>
            <TabsTrigger value="custom-api" className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Custom API
            </TabsTrigger>
            <TabsTrigger value="custom-mcp" className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> Custom MCP
            </TabsTrigger>
          </TabsList>

          {/* ========== Apps Tab ========== */}
          <TabsContent value="apps" className="mt-4">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search connectors..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((c, i) => {
                  const inst = installedMap.get(c.id);
                  const isConnected = inst?.status === "connected";
                  const authMethod = (inst as any)?.authMethod;

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                    >
                      <Card className={cn(
                        "hover:border-primary/30 transition-all duration-200",
                        isConnected && "border-green-500/20 bg-green-500/[0.03]"
                      )}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{c.icon}</span>
                            <div className="min-w-0">
                              <CardTitle className="text-base flex items-center gap-2">
                                {c.name}
                                {getTierIndicator(c.id)}
                              </CardTitle>
                              <CardDescription>{c.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary">{c.category}</Badge>
                              {isConnected && inst && getAuthBadge(inst)}
                            </div>
                            <div className="flex items-center gap-1">
                              {isConnected && authMethod === "oauth" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => refreshOAuthMutation.mutate({ connectorId: c.id })}
                                  disabled={refreshOAuthMutation.isPending}
                                  title="Refresh token"
                                >
                                  <RefreshCw className={cn("w-3.5 h-3.5", refreshOAuthMutation.isPending && "animate-spin")} />
                                </Button>
                              )}
                              {isConnected ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => disconnectMutation.mutate({ connectorId: c.id })}
                                  disabled={disconnectMutation.isPending}
                                >
                                  <XCircle className="w-3.5 h-3.5 mr-1 text-destructive" /> Disconnect
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setConnectDialog(c)}
                                >
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ========== Custom API Tab ========== */}
          <TabsContent value="custom-api" className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Custom API Integrations</h2>
                <p className="text-sm text-muted-foreground mt-1">Connect any REST API by providing its base URL and authentication credentials.</p>
              </div>
              <Button onClick={() => { setCustomApiDialog(true); setCustomApiName(""); setCustomApiBaseUrl(""); setCustomApiKey(""); setCustomApiHeaders(""); }}>
                <Plus className="w-4 h-4 mr-1" /> Add API
              </Button>
            </div>

            {customApis.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No custom APIs configured yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Add a custom API to integrate any REST service.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customApis.map((api) => (
                  <Card key={api.id} className="border-green-500/20 bg-green-500/[0.03]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Globe className="w-4 h-4 text-primary" />
                          {api.name}
                        </CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => disconnectMutation.mutate({ connectorId: api.connectorId })} disabled={disconnectMutation.isPending}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      <CardDescription className="text-xs truncate">{(api.config as any)?.baseUrl}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1">
                        <CheckCircle className="w-3 h-3" /> Connected
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ========== Custom MCP Tab ========== */}
          <TabsContent value="custom-mcp" className="mt-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-medium text-foreground">Model Context Protocol</h2>
                <p className="text-sm text-muted-foreground mt-1">Connect MCP servers to extend agent capabilities with custom tools and resources.</p>
              </div>
              <Button onClick={() => { setCustomMcpDialog(true); setCustomMcpName(""); setCustomMcpUrl(""); setCustomMcpTransport("sse"); }}>
                <Plus className="w-4 h-4 mr-1" /> Add MCP Server
              </Button>
            </div>

            {customMcps.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Server className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No MCP servers configured yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Add an MCP server to give the agent access to custom tools.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customMcps.map((mcp) => (
                  <Card key={mcp.id} className="border-green-500/20 bg-green-500/[0.03]">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Server className="w-4 h-4 text-primary" />
                          {mcp.name}
                        </CardTitle>
                        <Button size="sm" variant="ghost" onClick={() => disconnectMutation.mutate({ connectorId: mcp.connectorId })} disabled={disconnectMutation.isPending}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                      <CardDescription className="text-xs truncate">{(mcp.config as any)?.serverUrl}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1">
                          <CheckCircle className="w-3 h-3" /> Connected
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{(mcp.config as any)?.transport?.toUpperCase() || "SSE"}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ═══════ Tiered Auth Connect Dialog ═══════ */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        {connectDialog && (
          <TieredAuthDialog
            connector={connectDialog}
            tierStatus={(tierStatus as Record<string, any>)[connectDialog.id] ?? null}
            onClose={() => setConnectDialog(null)}
            onManualConnect={handleManualConnect}
            onOAuthConnect={handleOAuthConnect}
            onManusVerify={handleManusVerify}
            isConnecting={connectMutation.isPending}
            isOAuthPending={oauthUrlMutation.isPending}
            isManusVerifyPending={manusVerifyMutation.isPending}
            verifiedIdentity={verifiedIdentities[connectDialog.id] ?? null}
            oauthConfigured={isOAuthConfigured(connectDialog.id)}
          />
        )}
      </Dialog>

      {/* Custom API Dialog */}
      <Dialog open={customApiDialog} onOpenChange={setCustomApiDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" /> Add Custom API
            </DialogTitle>
            <DialogDescription>Connect any REST API by providing its endpoint and authentication.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
              <Input placeholder="My API Service" value={customApiName} onChange={(e) => setCustomApiName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Base URL</label>
              <Input placeholder="https://api.example.com/v1" value={customApiBaseUrl} onChange={(e) => setCustomApiBaseUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">API Key (optional)</label>
              <Input type="password" placeholder="Bearer token or API key" value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Custom Headers (optional, JSON)</label>
              <Textarea placeholder='{"X-Custom-Header": "value"}' value={customApiHeaders} onChange={(e) => setCustomApiHeaders(e.target.value)} rows={3} className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomApiDialog(false)}>Cancel</Button>
            <Button onClick={handleCustomApiSave} disabled={connectMutation.isPending}>
              {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom MCP Dialog */}
      <Dialog open={customMcpDialog} onOpenChange={setCustomMcpDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" /> Add MCP Server
            </DialogTitle>
            <DialogDescription>Connect a Model Context Protocol server to extend agent capabilities.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Server Name</label>
              <Input placeholder="My MCP Server" value={customMcpName} onChange={(e) => setCustomMcpName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Server URL</label>
              <Input placeholder="http://localhost:3001 or npx -y @mcp/server" value={customMcpUrl} onChange={(e) => setCustomMcpUrl(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Transport</label>
              <Tabs value={customMcpTransport} onValueChange={(v) => setCustomMcpTransport(v as "stdio" | "sse")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sse">SSE (HTTP)</TabsTrigger>
                  <TabsTrigger value="stdio">Stdio (Local)</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-muted-foreground">
              <p><strong>SSE</strong>: Connect to a remote MCP server via Server-Sent Events over HTTP.</p>
              <p className="mt-1"><strong>Stdio</strong>: Run a local MCP server process (e.g., npx command).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomMcpDialog(false)}>Cancel</Button>
            <Button onClick={handleCustomMcpSave} disabled={connectMutation.isPending}>
              {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
