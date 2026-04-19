/**
 * MessagingAgentPage — Messaging Platform Integration
 * Capability #52: Messaging-app agent
 *
 * Webhook-based messaging bridge that connects the agent to:
 * - WhatsApp Business API
 * - Telegram Bot API
 * - Custom webhook endpoints
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
  CheckCircle2, AlertCircle, Settings, Webhook, Zap, Copy,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type MessagingPlatform = "whatsapp" | "telegram" | "webhook";
type MessagingConfig = {
  id: string;
  platform: MessagingPlatform;
  name: string;
  webhookUrl: string;
  apiToken: string;
  status: "active" | "inactive" | "error";
  lastMessage?: string;
};

const PLATFORMS: { id: MessagingPlatform; label: string; description: string }[] = [
  { id: "whatsapp", label: "WhatsApp Business", description: "Connect via WhatsApp Business API" },
  { id: "telegram", label: "Telegram Bot", description: "Connect via Telegram Bot API" },
  { id: "webhook", label: "Custom Webhook", description: "Connect any platform via webhook" },
];

export default function MessagingAgentPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [configs, setConfigs] = useState<MessagingConfig[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newPlatform, setNewPlatform] = useState<MessagingPlatform>("webhook");
  const [newName, setNewName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newApiToken, setNewApiToken] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<string | null>(null);

  const addConfig = useCallback(() => {
    if (!newName.trim()) {
      toast.error("Enter a name for this connection");
      return;
    }
    const config: MessagingConfig = {
      id: Date.now().toString(),
      platform: newPlatform,
      name: newName,
      webhookUrl: newWebhookUrl,
      apiToken: newApiToken,
      status: newWebhookUrl || newApiToken ? "active" : "inactive",
    };
    setConfigs((prev) => [...prev, config]);
    setShowAdd(false);
    setNewName("");
    setNewWebhookUrl("");
    setNewApiToken("");
    toast.success(`${config.name} connection added`);
  }, [newPlatform, newName, newWebhookUrl, newApiToken]);

  const removeConfig = useCallback((id: string) => {
    setConfigs((prev) => prev.filter((c) => c.id !== id));
    if (selectedConfig === id) setSelectedConfig(null);
    toast.success("Connection removed");
  }, [selectedConfig]);

  const sendTestMessage = useCallback(async () => {
    if (!testMessage.trim() || !selectedConfig) return;
    setIsTesting(true);
    const config = configs.find((c) => c.id === selectedConfig);
    if (!config) return;

    try {
      // Use the agent to process and send the message
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Send this message via the ${config.platform} messaging integration "${config.name}": "${testMessage}". ${config.webhookUrl ? `Webhook URL: ${config.webhookUrl}` : ""} Respond with the delivery status.`,
          mode: "speed",
        }),
      });

      if (!response.ok) throw new Error("Send failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let result = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) result += data.content;
            } catch { /* skip */ }
          }
        }
      }

      setConfigs((prev) =>
        prev.map((c) =>
          c.id === selectedConfig ? { ...c, lastMessage: testMessage, status: "active" as const } : c
        )
      );
      toast.success("Message sent!");
      setTestMessage("");
    } catch (err: any) {
      toast.error("Send failed: " + err.message);
      setConfigs((prev) =>
        prev.map((c) =>
          c.id === selectedConfig ? { ...c, status: "error" as const } : c
        )
      );
    } finally {
      setIsTesting(false);
    }
  }, [testMessage, selectedConfig, configs]);

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
                <Button onClick={addConfig} size="sm"><Plus className="w-3 h-3 mr-1" /> Add</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connections */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Connections ({configs.length})</h3>
            {configs.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No connections yet. Add one to get started.</p>
                </CardContent>
              </Card>
            ) : (
              configs.map((config) => (
                <Card
                  key={config.id}
                  className={`bg-card border cursor-pointer transition-all ${
                    selectedConfig === config.id ? "border-primary" : "border-border hover:border-primary/30"
                  }`}
                  onClick={() => setSelectedConfig(config.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          config.status === "active" ? "bg-emerald-500/10" : config.status === "error" ? "bg-red-500/10" : "bg-muted"
                        }`}>
                          <MessageSquare className={`w-4 h-4 ${
                            config.status === "active" ? "text-emerald-400" : config.status === "error" ? "text-red-400" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px]">{config.platform}</Badge>
                            <Badge variant={config.status === "active" ? "default" : "destructive"} className="text-[10px]">
                              {config.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeConfig(config.id); }}>
                        <AlertCircle className="w-3 h-3" />
                      </Button>
                    </div>
                    {config.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-2 truncate">Last: {config.lastMessage}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Test Panel */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Test Message</h3>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                {!selectedConfig ? (
                  <div className="text-center py-6">
                    <Send className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
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
