import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plug, Search, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const AVAILABLE_CONNECTORS = [
  { id: "slack", name: "Slack", description: "Send messages and manage channels via webhooks", category: "Communication", icon: "\u{1F4AC}", configFields: [{ key: "webhookUrl", label: "Webhook URL", placeholder: "https://hooks.slack.com/services/..." }] },
  { id: "zapier", name: "Zapier", description: "Connect to 5000+ apps via Zapier webhooks", category: "Automation", icon: "\u26A1", configFields: [{ key: "webhookUrl", label: "Zap Webhook URL", placeholder: "https://hooks.zapier.com/..." }] },
  { id: "github", name: "GitHub", description: "Manage repos, issues, and PRs", category: "Development", icon: "\u{1F419}", configFields: [{ key: "token", label: "Personal Access Token", placeholder: "ghp_..." }] },
  { id: "google-drive", name: "Google Drive", description: "Access and manage Drive files", category: "Storage", icon: "\u{1F4C1}", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }] },
  { id: "notion", name: "Notion", description: "Read and write Notion pages", category: "Productivity", icon: "\u{1F4DD}", configFields: [{ key: "apiKey", label: "Integration Token", placeholder: "secret_..." }] },
  { id: "email", name: "Email (SMTP)", description: "Send emails via SMTP", category: "Communication", icon: "\u{1F4E7}", configFields: [{ key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" }, { key: "port", label: "Port", placeholder: "587" }, { key: "user", label: "Username", placeholder: "you@example.com" }, { key: "pass", label: "Password", placeholder: "app-password" }] },
  { id: "calendar", name: "Google Calendar", description: "Manage calendar events", category: "Productivity", icon: "\u{1F4C5}", configFields: [{ key: "serviceAccountKey", label: "Service Account JSON Key", placeholder: '{"type":"service_account",...}' }] },
  { id: "mcp", name: "MCP Protocol", description: "Model Context Protocol server integration", category: "AI", icon: "\u{1F517}", configFields: [{ key: "serverUrl", label: "MCP Server URL", placeholder: "http://localhost:3001" }] },
];

export default function ConnectorsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [connectDialog, setConnectDialog] = useState<typeof AVAILABLE_CONNECTORS[0] | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

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

  const installedMap = useMemo(() => {
    const m = new Map<string, (typeof installed)[0]>();
    installed.forEach((c) => m.set(c.connectorId, c));
    return m;
  }, [installed]);

  const filtered = useMemo(
    () => AVAILABLE_CONNECTORS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())),
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Plug className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Connectors</h1>
          <Badge variant="secondary" className="ml-auto">{installed.filter((c) => c.status === "connected").length} connected</Badge>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search connectors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c) => {
              const inst = installedMap.get(c.id);
              const isConnected = inst?.status === "connected";
              return (
                <Card key={c.id} className={`hover:border-primary/30 transition-colors ${isConnected ? "border-green-500/20 bg-green-500/5" : ""}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <div>
                        <CardTitle className="text-base">{c.name}</CardTitle>
                        <CardDescription>{c.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{c.category}</Badge>
                        {isConnected && (
                          <Badge variant="outline" className="text-green-600 border-green-600/30">
                            <CheckCircle className="w-3 h-3 mr-1" /> Connected
                          </Badge>
                        )}
                      </div>
                      {isConnected ? (
                        <Button size="sm" variant="ghost" onClick={() => disconnectMutation.mutate({ connectorId: c.id })} disabled={disconnectMutation.isPending}>
                          <XCircle className="w-3.5 h-3.5 mr-1 text-destructive" /> Disconnect
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { setConnectDialog(c); setConfigValues({}); }}>
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={(open) => !open && setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {connectDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {connectDialog?.configFields.map((field) => (
              <div key={field.key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                <Input
                  placeholder={field.placeholder}
                  value={configValues[field.key] ?? ""}
                  onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  type={field.key.toLowerCase().includes("pass") || field.key.toLowerCase().includes("token") || field.key.toLowerCase().includes("key") ? "password" : "text"}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handleConnect} disabled={connectMutation.isPending}>
              {connectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
