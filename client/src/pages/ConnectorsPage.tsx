import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plug, Search, CheckCircle, XCircle, Loader2, Shield, Key, ExternalLink, RefreshCw, Plus, Globe, Server, Trash2 } from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

/** OAuth-capable connectors get a "Sign in with X" button as the primary flow */
const OAUTH_CONNECTORS = new Set(["github", "google-drive", "notion", "slack", "calendar", "microsoft-365"]);

const AVAILABLE_CONNECTORS = [
  // Communication
  { id: "slack", name: "Slack", description: "Send messages and manage channels", category: "Communication", icon: "\u{1F4AC}", oauthLabel: "Sign in with Slack", configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." }] },
  { id: "email", name: "Email (SMTP)", description: "Send emails via SMTP", category: "Communication", icon: "\u{1F4E7}", configFields: [{ key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" }, { key: "port", label: "Port", placeholder: "587" }, { key: "user", label: "Username", placeholder: "you@example.com" }, { key: "pass", label: "Password", placeholder: "app-password" }] },
  { id: "gmail", name: "Gmail", description: "Read, send, and manage Gmail", category: "Communication", icon: "\u{2709}\u{FE0F}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }] },
  { id: "outlook", name: "Outlook Mail", description: "Access Outlook email", category: "Communication", icon: "\u{1F4E8}", oauthLabel: "Sign in with Microsoft", configFields: [{ key: "clientId", label: "Azure App Client ID", placeholder: "xxxxxxxx-xxxx-..." }] },
  // Development
  { id: "github", name: "GitHub", description: "Manage repos, issues, and PRs", category: "Development", icon: "\u{1F419}", oauthLabel: "Sign in with GitHub", configFields: [{ key: "token", label: "Personal Access Token", placeholder: "ghp_..." }] },
  { id: "vercel", name: "Vercel", description: "Deploy and manage Vercel projects", category: "Development", icon: "\u{25B2}", configFields: [{ key: "token", label: "API Token", placeholder: "..." }] },
  { id: "supabase", name: "Supabase", description: "Manage Supabase projects and databases", category: "Development", icon: "\u{26A1}", configFields: [{ key: "apiKey", label: "Service Role Key", placeholder: "eyJ..." }] },
  { id: "neon", name: "Neon", description: "Serverless Postgres databases", category: "Development", icon: "\u{1F4BE}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "..." }] },
  { id: "cloudflare", name: "Cloudflare", description: "DNS, Workers, and CDN management", category: "Development", icon: "\u{2601}\u{FE0F}", configFields: [{ key: "apiToken", label: "API Token", placeholder: "..." }] },
  { id: "playwright", name: "Playwright", description: "Browser automation and testing", category: "Development", icon: "\u{1F3AD}", configFields: [{ key: "serverUrl", label: "Server URL", placeholder: "ws://localhost:3000" }] },
  // Storage
  { id: "google-drive", name: "Google Drive", description: "Access and manage Drive files", category: "Storage", icon: "\u{1F4C1}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }] },
  { id: "dropbox", name: "Dropbox", description: "Cloud file storage and sharing", category: "Storage", icon: "\u{1F4E6}", configFields: [{ key: "accessToken", label: "Access Token", placeholder: "..." }] },
  // Productivity
  { id: "notion", name: "Notion", description: "Read and write Notion pages", category: "Productivity", icon: "\u{1F4DD}", oauthLabel: "Sign in with Notion", configFields: [{ key: "apiKey", label: "Integration Token", placeholder: "secret_..." }] },
  { id: "calendar", name: "Google Calendar", description: "Manage calendar events", category: "Productivity", icon: "\u{1F4C5}", oauthLabel: "Sign in with Google", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }] },
  { id: "microsoft-365", name: "Microsoft 365", description: "Access Outlook, OneDrive, Teams, and Office apps", category: "Productivity", icon: "\u{1F4BC}", oauthLabel: "Sign in with Microsoft", configFields: [{ key: "clientId", label: "Azure App Client ID", placeholder: "xxxxxxxx-xxxx-..." }] },
  { id: "asana", name: "Asana", description: "Project and task management", category: "Productivity", icon: "\u{1F4CB}", configFields: [{ key: "token", label: "Personal Access Token", placeholder: "..." }] },
  { id: "linear", name: "Linear", description: "Issue tracking for software teams", category: "Productivity", icon: "\u{1F4CA}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "lin_api_..." }] },
  { id: "todoist", name: "Todoist", description: "Task management and to-do lists", category: "Productivity", icon: "\u{2705}", configFields: [{ key: "apiToken", label: "API Token", placeholder: "..." }] },
  { id: "airtable", name: "Airtable", description: "Spreadsheet-database hybrid", category: "Productivity", icon: "\u{1F4CA}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "pat..." }] },
  // Automation
  { id: "zapier", name: "Zapier", description: "Connect to 5000+ apps via Zapier webhooks", category: "Automation", icon: "\u{26A1}", configFields: [{ key: "webhookUrl", label: "Zap Webhook URL", placeholder: "https://hooks.zapier.com/..." }] },
  { id: "n8n", name: "n8n", description: "Workflow automation platform", category: "Automation", icon: "\u{1F504}", configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://..." }] },
  // AI & Analytics
  { id: "openai", name: "OpenAI", description: "GPT models and DALL-E", category: "AI", icon: "\u{1F916}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-..." }] },
  { id: "anthropic", name: "Anthropic", description: "Claude AI models", category: "AI", icon: "\u{1F9E0}", configFields: [{ key: "apiKey", label: "API Key", placeholder: "sk-ant-..." }] },
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

export default function ConnectorsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [pageTab, setPageTab] = useState<"apps" | "custom-api" | "custom-mcp">("apps");
  const [connectDialog, setConnectDialog] = useState<typeof AVAILABLE_CONNECTORS[0] | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [connectTab, setConnectTab] = useState<"oauth" | "manual">("oauth");

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

  const utils = trpc.useUtils();
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, { enabled: !!user });

  const connectMutation = trpc.connector.connect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector linked successfully");
      setConnectDialog(null);
      setConfigValues({});
      setCustomApiDialog(false);
      setCustomMcpDialog(false);
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  const disconnectMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector disconnected");
    },
    onError: (err) => toast.error(`Failed: ${err.message}`),
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
        toast.info("OAuth not configured for this connector. Use manual setup instead.");
        setConnectTab("manual");
      }
    },
    onError: (err) => toast.error(`OAuth error: ${err.message}`),
  });

  const completeOAuthMutation = trpc.connector.completeOAuth.useMutation({
    onSuccess: (data) => {
      utils.connector.list.invalidate();
      toast.success(`Connected as ${data.name}`);
      setConnectDialog(null);
    },
    onError: (err) => toast.error(`OAuth completion failed: ${err.message}`),
  });

  const refreshOAuthMutation = trpc.connector.refreshOAuth.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Token refreshed successfully");
    },
    onError: (err) => toast.error(`Refresh failed: ${err.message}`),
  });

  // Listen for OAuth callback messages from popup window
  const handleOAuthCallback = useCallback((event: MessageEvent) => {
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
    }
  }, [completeOAuthMutation, utils.connector.list]);

  useEffect(() => {
    window.addEventListener("message", handleOAuthCallback);
    return () => window.removeEventListener("message", handleOAuthCallback);
  }, [handleOAuthCallback]);

  // Check URL params for OAuth success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    if (oauthSuccess) {
      utils.connector.list.invalidate();
      toast.success(`Successfully connected ${oauthSuccess}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }
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

  // Custom API/MCP connectors from installed list
  const customApis = installed.filter((c) => c.connectorId.startsWith("custom-api-"));
  const customMcps = installed.filter((c) => c.connectorId.startsWith("custom-mcp-"));

  const handleConnect = () => {
    if (!connectDialog) return;
    connectMutation.mutate({ connectorId: connectDialog.id, name: connectDialog.name, config: configValues });
  };

  const handleOAuthConnect = (connectorId: string) => {
    oauthUrlMutation.mutate({ connectorId, origin: window.location.origin });
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

  const isOAuthCapable = (id: string) => OAUTH_CONNECTORS.has(id);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plug className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
          <Badge variant="secondary" className="ml-auto">
            {installed.filter((c) => c.status === "connected").length} connected
          </Badge>
        </div>

        {/* Page-level tabs: Apps | Custom API | Custom MCP */}
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
                {filtered.map((c) => {
                  const inst = installedMap.get(c.id);
                  const isConnected = inst?.status === "connected";
                  const authMethod = (inst as any)?.authMethod;

                  return (
                    <Card key={c.id} className={`hover:border-primary/30 transition-colors ${isConnected ? "border-green-500/20 bg-green-500/5" : ""}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{c.icon}</span>
                          <div className="min-w-0">
                            <CardTitle className="text-base flex items-center gap-2">
                              {c.name}
                              {isOAuthCapable(c.id) && (
                                <span title="OAuth supported"><Shield className="w-3.5 h-3.5 text-blue-500" /></span>
                              )}
                            </CardTitle>
                            <CardDescription>{c.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">{c.category}</Badge>
                            {isConnected && (
                              <Badge variant="outline" className="text-green-600 border-green-600/30">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {authMethod === "oauth" ? "OAuth" : "Connected"}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isConnected && authMethod === "oauth" && (
                              <Button size="sm" variant="ghost" onClick={() => refreshOAuthMutation.mutate({ connectorId: c.id })} disabled={refreshOAuthMutation.isPending} title="Refresh token">
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshOAuthMutation.isPending ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                            {isConnected ? (
                              <Button size="sm" variant="ghost" onClick={() => disconnectMutation.mutate({ connectorId: c.id })} disabled={disconnectMutation.isPending}>
                                <XCircle className="w-3.5 h-3.5 mr-1 text-destructive" /> Disconnect
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => { setConnectDialog(c); setConfigValues({}); setConnectTab(isOAuthCapable(c.id) ? "oauth" : "manual"); }}>
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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
                  <Card key={api.id} className="border-green-500/20 bg-green-500/5">
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
                      <Badge variant="outline" className="text-green-600 border-green-600/30">
                        <CheckCircle className="w-3 h-3 mr-1" /> Connected
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
                  <Card key={mcp.id} className="border-green-500/20 bg-green-500/5">
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
                        <Badge variant="outline" className="text-green-600 border-green-600/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Connected
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

      {/* Connect Dialog — OAuth + Manual tabs */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{connectDialog?.icon}</span>
              Connect {connectDialog?.name}
            </DialogTitle>
            <DialogDescription>
              {isOAuthCapable(connectDialog?.id ?? "")
                ? "Choose your preferred connection method. OAuth is recommended for security."
                : "Enter your credentials to connect this service."}
            </DialogDescription>
          </DialogHeader>

          {isOAuthCapable(connectDialog?.id ?? "") ? (
            <Tabs value={connectTab} onValueChange={(v) => setConnectTab(v as "oauth" | "manual")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="oauth" className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> OAuth</TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> API Key</TabsTrigger>
              </TabsList>
              <TabsContent value="oauth" className="space-y-4 pt-2">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <span>OAuth securely connects your account without sharing passwords or tokens. You'll be redirected to {connectDialog?.name} to authorize access.</span>
                  </p>
                </div>
                <Button className="w-full" onClick={() => handleOAuthConnect(connectDialog!.id)} disabled={oauthUrlMutation.isPending}>
                  {oauthUrlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ExternalLink className="w-4 h-4 mr-2" />}
                  {connectDialog?.oauthLabel ?? `Sign in with ${connectDialog?.name}`}
                </Button>
              </TabsContent>
              <TabsContent value="manual" className="space-y-4 pt-2">
                <div className="rounded-lg border border-border bg-muted-foreground/5 p-3 text-xs text-muted-foreground">
                  <p>Manual setup requires you to create and manage your own API credentials.</p>
                </div>
                {connectDialog?.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      value={configValues[field.key] ?? ""}
                      onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                    />
                  </div>
                ))}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
                  <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                    {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Connect
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <div className="space-y-4 py-2">
                {connectDialog?.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      value={configValues[field.key] ?? ""}
                      onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") || field.key.toLowerCase().includes("secret") ? "password" : "text"}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
                <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                  {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />} Connect
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
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
