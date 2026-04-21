/**
 * MessagingAgentPage — Messaging Platform Integration
 * Capability #52: Messaging-app agent
 *
 * Uses the connectors table (via connector tRPC procedures) for persistence.
 * Messaging configs are stored as connectors with connectorId prefix "msg-".
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageSquare, Send, Plus, Loader2, LogIn, ArrowLeft,
  Trash2, Webhook, Copy,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type MessagingPlatform = "whatsapp" | "telegram" | "webhook";

const PLATFORMS: { id: MessagingPlatform; label: string; description: string }[] = [
  { id: "whatsapp", label: "WhatsApp Business", description: "Connect via WhatsApp Business API" },
  { id: "telegram", label: "Telegram Bot", description: "Connect via Telegram Bot API" },
  { id: "webhook", label: "Custom Webhook", description: "Connect any platform via webhook" },
];

export default function MessagingAgentPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showAdd, setShowAdd] = useState(false);
  const [newPlatform, setNewPlatform] = useState<MessagingPlatform>("webhook");
  const [newName, setNewName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newApiToken, setNewApiToken] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Use real tRPC queries for persistence via the connectors table
  const { data: connectors = [], isLoading } = trpc.connector.list.useQuery();
  const utils = trpc.useUtils();

  // Filter to messaging connectors only (connectorId starts with "msg-")
  const messagingConnectors = connectors.filter((c: any) => c.connectorId?.startsWith("msg-"));

  const addMutation = trpc.connector.connect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      setShowAdd(false);
      setNewName("");
      setNewWebhookUrl("");
      setNewApiToken("");
      toast.success("Connection added");
    },
    onError: (err: any) => { toast.error(err.message); },
  });

  const removeMutation = trpc.connector.disconnect.useMutation({
    onSuccess: () => {
      utils.connector.list.invalidate();
      if (selectedId) setSelectedId(null);
      toast.success("Connection removed");
    },
    onError: (err: any) => { toast.error(err.message); },
  });

  const addConfig = useCallback(() => {
    if (!newName.trim()) {
      toast.error("Enter a name for this connection");
      return;
    }
    addMutation.mutate({
      connectorId: `msg-${newPlatform}`,
      name: newName,
      config: {
        platform: newPlatform,
        webhookUrl: newWebhookUrl,
        apiToken: newApiToken,
      },
    });
  }, [newPlatform, newName, newWebhookUrl, newApiToken, addMutation]);

  const sendTestMessage = useCallback(async () => {
    if (!testMessage.trim() || !selectedId) return;
    setIsTesting(true);
    const config = messagingConnectors.find((c: any) => c.id === selectedId);
    if (!config) { setIsTesting(false); return; }

    try {
      const platform = (config.config as any)?.platform ?? "webhook";
      const webhookUrl = (config.config as any)?.webhookUrl ?? "";

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Send this message via the ${platform} messaging integration "${config.name}": "${testMessage}". ${webhookUrl ? `Webhook URL: ${webhookUrl}` : ""} Respond with the delivery status.`,
          mode: "speed",
        }),
      });

      if (!response.ok) throw new Error("Send failed");

      // Read the stream to completion
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      }

      toast.success("Message sent!");
      setTestMessage("");
    } catch (err: any) {
      toast.error("Send failed: " + err.message);
    } finally {
      setIsTesting(false);
    }
  }, [testMessage, selectedId, messagingConnectors]);

  const inboundWebhookUrl = `${window.location.origin}/api/messaging/webhook`;

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Messaging Agent</h2>
            <p className="text-muted-foreground mb-4">Sign in to connect messaging platforms.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Messaging Agent
            </h1>
            <p className="text-sm text-muted-foreground">Connect the agent to messaging platforms</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Connection
          </Button>
        </div>

        {/* Inbound Webhook URL */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-xs font-medium text-foreground">Inbound Webhook URL</p>
                  <p className="text-[10px] text-muted-foreground">Point your messaging platform's webhook to this URL</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{inboundWebhookUrl}</code>
                <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(inboundWebhookUrl); toast.success("Copied!"); }}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Connection Form */}
        {showAdd && (
          <Card className="bg-card border-border mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">New Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Platform</label>
                <Select value={newPlatform} onValueChange={(v) => setNewPlatform(v as MessagingPlatform)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Connection Name</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My WhatsApp Bot" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Outbound Webhook URL</label>
                <Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://api.telegram.org/bot..." />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">API Token (optional)</label>
                <Input type="password" value={newApiToken} onChange={(e) => setNewApiToken(e.target.value)} placeholder="Bot token or API key" />
              </div>
              <div className="flex gap-2">
                <Button onClick={addConfig} disabled={addMutation.isPending} size="sm">
                  {addMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                  Add
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connections */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Connections ({messagingConnectors.length})</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : messagingConnectors.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No connections yet. Add one to get started.</p>
                </CardContent>
              </Card>
            ) : (
              messagingConnectors.map((config: any) => {
                const platform = (config.config as any)?.platform ?? "webhook";
                const status = config.status ?? "disconnected";
                return (
                  <Card
                    key={config.id}
                    className={`bg-card border cursor-pointer transition-all ${
                      selectedId === config.id ? "border-primary" : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => setSelectedId(config.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            status === "connected" ? "bg-muted/50" : status === "error" ? "bg-red-500/10" : "bg-muted"
                          }`}>
                            <MessageSquare className={`w-4 h-4 ${
                              status === "connected" ? "text-foreground/70" : status === "error" ? "text-red-400" : "text-muted-foreground"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{config.name}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{platform}</Badge>
                              <Badge variant={status === "connected" ? "default" : "destructive"} className="text-[10px]">
                                {status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); removeMutation.mutate({ connectorId: config.connectorId }); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Test Panel */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Test Message</h3>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                {!selectedId ? (
                  <div className="text-center py-6">
                    <Send className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Select a connection to send a test message</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Textarea
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      placeholder="Type a test message..."
                      rows={4}
                    />
                    <Button
                      onClick={sendTestMessage}
                      disabled={isTesting || !testMessage.trim()}
                      className="w-full"
                    >
                      {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      {isTesting ? "Sending..." : "Send Test Message"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
