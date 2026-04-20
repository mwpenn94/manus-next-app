import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plug, Search, CheckCircle, XCircle, Loader2, Shield, Key, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";

/** OAuth-capable connectors get a "Sign in with X" button as the primary flow */
const OAUTH_CONNECTORS = new Set(["github", "google-drive", "notion", "slack", "calendar", "microsoft-365"]);

const AVAILABLE_CONNECTORS = [
  {
    id: "slack", name: "Slack", description: "Send messages and manage channels",
    category: "Communication", icon: "\u{1F4AC}",
    oauthLabel: "Sign in with Slack",
    configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." }],
  },
  {
    id: "github", name: "GitHub", description: "Manage repos, issues, and PRs",
    category: "Development", icon: "\u{1F419}",
    oauthLabel: "Sign in with GitHub",
    configFields: [{ key: "token", label: "Personal Access Token", placeholder: "ghp_..." }],
  },
  {
    id: "google-drive", name: "Google Drive", description: "Access and manage Drive files",
    category: "Storage", icon: "\u{1F4C1}",
    oauthLabel: "Sign in with Google",
    configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }],
  },
  {
    id: "notion", name: "Notion", description: "Read and write Notion pages",
    category: "Productivity", icon: "\u{1F4DD}",
    oauthLabel: "Sign in with Notion",
    configFields: [{ key: "apiKey", label: "Integration Token", placeholder: "secret_..." }],
  },
  {
    id: "calendar", name: "Google Calendar", description: "Manage calendar events",
    category: "Productivity", icon: "\u{1F4C5}",
    oauthLabel: "Sign in with Google",
    configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }],
  },
  {
    id: "zapier", name: "Zapier", description: "Connect to 5000+ apps via Zapier webhooks",
    category: "Automation", icon: "\u26A1",
    configFields: [{ key: "webhookUrl", label: "Zap Webhook URL", placeholder: "https://hooks.zapier.com/..." }],
  },
  {
    id: "email", name: "Email (SMTP)", description: "Send emails via SMTP",
    category: "Communication", icon: "\u{1F4E7}",
    configFields: [
      { key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "port", label: "Port", placeholder: "587" },
      { key: "user", label: "Username", placeholder: "you@example.com" },
      { key: "pass", label: "Password", placeholder: "app-password" },
    ],
  },
  {
    id: "microsoft-365", name: "Microsoft 365", description: "Access Outlook, OneDrive, Teams, and Office apps",
    category: "Productivity", icon: "\u{1F4BC}",
    oauthLabel: "Sign in with Microsoft",
    configFields: [{ key: "clientId", label: "Azure App Client ID", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }],
  },
  {
    id: "mcp", name: "MCP Protocol", description: "Model Context Protocol server integration",
    category: "AI", icon: "\u{1F517}",
    configFields: [{ key: "serverUrl", label: "MCP Server URL", placeholder: "http://localhost:3001" }],
  },
];

export default function ConnectorsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [connectDialog, setConnectDialog] = useState<typeof AVAILABLE_CONNECTORS[0] | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [connectTab, setConnectTab] = useState<"oauth" | "manual">("oauth");

  const utils = trpc.useUtils();
  const { data: installed = [], isLoading } = trpc.connector.list.useQuery(undefined, { enabled: !!user });

  const connectMutation = trpc.connector.connect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      toast.success("Connector linked successfully");
      setConnectDialog(null);
      setConfigValues({});
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

  const oauthUrlMutation = trpc.connector.getOAuthUrl.useMutation({
    onSuccess: (data) => {
      if (data.supported && data.url) {
        toast.info("Redirecting to authorization page...");
        window.open(data.url, "_blank", "noopener,noreferrer,width=600,height=700");
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
    if (event.data?.type === "connector-oauth-callback") {
      const { connectorId, code } = event.data;
      if (connectorId && code) {
        completeOAuthMutation.mutate({
          connectorId,
          code,
          origin: window.location.origin,
        });
      }
    }
  }, [completeOAuthMutation]);

  useEffect(() => {
    window.addEventListener("message", handleOAuthCallback);
    return () => window.removeEventListener("message", handleOAuthCallback);
  }, [handleOAuthCallback]);

  // Also check URL params for OAuth callback (same-window redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) {
      try {
        const parsed = JSON.parse(atob(state));
        if (parsed.connectorId) {
          completeOAuthMutation.mutate({
            connectorId: parsed.connectorId,
            code,
            origin: window.location.origin,
          });
          // Clean URL
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch { /* ignore malformed state */ }
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
      c.description.toLowerCase().includes(search.toLowerCase())
    ),
    [search]
  );

  const handleConnect = () => {
    if (!connectDialog) return;
    connectMutation.mutate({
      connectorId: connectDialog.id,
      name: connectDialog.name,
      config: configValues,
    });
  };

  const handleOAuthConnect = (connectorId: string) => {
    oauthUrlMutation.mutate({
      connectorId,
      origin: window.location.origin,
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
                <Card
                  key={c.id}
                  className={`hover:border-primary/30 transition-colors ${isConnected ? "border-green-500/20 bg-green-500/5" : ""}`}
                >
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
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => refreshOAuthMutation.mutate({ connectorId: c.id })}
                            disabled={refreshOAuthMutation.isPending}
                            title="Refresh token"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshOAuthMutation.isPending ? "animate-spin" : ""}`} />
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
                            onClick={() => {
                              setConnectDialog(c);
                              setConfigValues({});
                              setConnectTab(isOAuthCapable(c.id) ? "oauth" : "manual");
                            }}
                          >
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
                <TabsTrigger value="oauth" className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> OAuth
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" /> API Key
                </TabsTrigger>
              </TabsList>

              <TabsContent value="oauth" className="space-y-4 pt-2">
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-muted-foreground">
                  <p className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <span>
                      OAuth securely connects your account without sharing passwords or tokens.
                      You'll be redirected to {connectDialog?.name} to authorize access.
                    </span>
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleOAuthConnect(connectDialog!.id)}
                  disabled={oauthUrlMutation.isPending}
                >
                  {oauthUrlMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  {connectDialog?.oauthLabel ?? `Sign in with ${connectDialog?.name}`}
                </Button>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 pt-2">
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                  <p>Manual setup requires you to create and manage your own API credentials.</p>
                </div>
                {connectDialog?.configFields.map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                    <Input
                      placeholder={field.placeholder}
                      value={configValues[field.key] ?? ""}
                      onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      type={
                        field.key.toLowerCase().includes("pass") ||
                        field.key.toLowerCase().includes("token") ||
                        field.key.toLowerCase().includes("key")
                          ? "password"
                          : "text"
                      }
                    />
                  </div>
                ))}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
                  <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                    {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    Connect
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
                      type={
                        field.key.toLowerCase().includes("pass") ||
                        field.key.toLowerCase().includes("token") ||
                        field.key.toLowerCase().includes("key")
                          ? "password"
                          : "text"
                      }
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
                <Button onClick={handleConnect} disabled={connectMutation.isPending}>
                  {connectMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Connect
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
