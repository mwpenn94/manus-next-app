/**
 * WebhooksPage — Manus-style Webhooks & API Keys management
 * 
 * Matches the Manus "Integrations" section with:
 * - Webhook configuration for task completion events
 * - API key generation and management
 * - Notification rules for custom triggers
 */
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Webhook, Key, Bell, Plus, Trash2, Copy, Eye, EyeOff,
  Loader2, CheckCircle, XCircle, ExternalLink, RefreshCw,
  AlertTriangle, Zap, Globe, Mail, MessageSquare, Activity,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
  failCount: number;
}

interface ApiKeyConfig {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

interface NotificationRule {
  id: string;
  name: string;
  trigger: string;
  channel: string;
  active: boolean;
}

// Demo data
const DEMO_WEBHOOKS: WebhookConfig[] = [
  { id: "wh1", url: "https://hooks.slack.com/services/T00/B00/xxx", events: ["task.completed", "task.failed"], active: true, createdAt: "2025-12-01", lastTriggered: "2026-04-20", failCount: 0 },
];

const DEMO_API_KEYS: ApiKeyConfig[] = [
  { id: "ak1", name: "Production API Key", prefix: "sk_live_abc1", createdAt: "2025-11-15", lastUsed: "2026-04-21", active: true },
  { id: "ak2", name: "Development Key", prefix: "sk_test_xyz9", createdAt: "2026-01-10", lastUsed: "2026-04-18", active: true },
];

const DEMO_RULES: NotificationRule[] = [
  { id: "nr1", name: "New form submission", trigger: "form.submitted", channel: "in-app", active: true },
  { id: "nr2", name: "Task failure alert", trigger: "task.failed", channel: "email", active: true },
  { id: "nr3", name: "Weekly analytics digest", trigger: "schedule.weekly", channel: "email", active: false },
];

const WEBHOOK_EVENTS = [
  "task.completed", "task.failed", "task.started",
  "project.deployed", "project.updated",
  "form.submitted", "payment.received",
  "user.signed_up", "user.deleted",
];

export default function WebhooksPage() {
  const { isAuthenticated } = useAuth();
  const [webhooks, setWebhooks] = useState(DEMO_WEBHOOKS);
  const [apiKeys, setApiKeys] = useState(DEMO_API_KEYS);
  const [rules, setRules] = useState(DEMO_RULES);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleTrigger, setNewRuleTrigger] = useState("task.completed");
  const [newRuleChannel, setNewRuleChannel] = useState("in-app");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm border-border">
          <CardContent className="py-8 text-center">
            <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Sign in required</h2>
            <p className="text-sm text-muted-foreground mb-4">Sign in to manage webhooks and API keys.</p>
            <Button size="lg" className="min-h-[44px] px-8" onClick={() => window.location.href = getLoginUrl()}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const addWebhook = () => {
    if (!newWebhookUrl.trim()) return;
    const wh: WebhookConfig = {
      id: `wh${Date.now()}`,
      url: newWebhookUrl,
      events: ["task.completed"],
      active: true,
      createdAt: new Date().toISOString().split("T")[0],
      failCount: 0,
    };
    setWebhooks([...webhooks, wh]);
    setNewWebhookUrl("");
    setShowNewWebhook(false);
    toast.success("Webhook added");
  };

  const addApiKey = () => {
    if (!newKeyName.trim()) return;
    const key: ApiKeyConfig = {
      id: `ak${Date.now()}`,
      name: newKeyName,
      prefix: `sk_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: new Date().toISOString().split("T")[0],
      active: true,
    };
    setApiKeys([...apiKeys, key]);
    setNewKeyName("");
    setShowNewKey(false);
    toast.success("API key created. Copy it now — it won't be shown again.");
  };

  const addRule = () => {
    if (!newRuleName.trim()) return;
    const rule: NotificationRule = {
      id: `nr${Date.now()}`,
      name: newRuleName,
      trigger: newRuleTrigger,
      channel: newRuleChannel,
      active: true,
    };
    setRules([...rules, rule]);
    setNewRuleName("");
    setShowNewRule(false);
    toast.success("Notification rule created");
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1" style={{ fontFamily: "var(--font-heading)" }}>
            Integrations
          </h1>
          <p className="text-muted-foreground mb-6">Manage webhooks, API keys, and notification rules.</p>
        </motion.div>

        <Tabs defaultValue="webhooks" className="space-y-6">
          <TabsList className="bg-muted/50 border border-border">
            <TabsTrigger value="webhooks" className="gap-1.5 data-[state=active]:bg-background">
              <Webhook className="w-3.5 h-3.5" /> Webhooks
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-1.5 data-[state=active]:bg-background">
              <Key className="w-3.5 h-3.5" /> API Keys
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5 data-[state=active]:bg-background">
              <Bell className="w-3.5 h-3.5" /> Notification Rules
            </TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Receive HTTP callbacks when events occur.</p>
              <Button size="sm" onClick={() => setShowNewWebhook(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Webhook
              </Button>
            </div>
            {webhooks.map((wh) => (
              <Card key={wh.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-xs font-mono text-foreground truncate">{wh.url}</code>
                        <Badge variant={wh.active ? "default" : "outline"} className="text-[10px] shrink-0">
                          {wh.active ? "Active" : "Paused"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>Events: {wh.events.join(", ")}</span>
                        {wh.lastTriggered && <span>Last triggered: {wh.lastTriggered}</span>}
                        {wh.failCount > 0 && (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {wh.failCount} failures
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <Switch
                        checked={wh.active}
                        onCheckedChange={(v) => setWebhooks(webhooks.map((w) => w.id === wh.id ? { ...w, active: v } : w))}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => { setWebhooks(webhooks.filter((w) => w.id !== wh.id)); toast.success("Webhook removed"); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {webhooks.length === 0 && (
              <div className="text-center py-12">
                <Webhook className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No webhooks configured yet.</p>
              </div>
            )}
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Manage API keys for programmatic access.</p>
              <Button size="sm" onClick={() => setShowNewKey(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Key
              </Button>
            </div>
            {apiKeys.map((key) => (
              <Card key={key.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{key.name}</span>
                        <Badge variant={key.active ? "default" : "outline"} className="text-[10px]">
                          {key.active ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <code className="font-mono">
                          {visibleKeys.has(key.id) ? `${key.prefix}${"•".repeat(24)}` : `${key.prefix.slice(0, 7)}${"•".repeat(28)}`}
                        </code>
                        <span>Created: {key.createdAt}</span>
                        {key.lastUsed && <span>Last used: {key.lastUsed}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => {
                          const next = new Set(visibleKeys);
                          next.has(key.id) ? next.delete(key.id) : next.add(key.id);
                          setVisibleKeys(next);
                        }}
                      >
                        {visibleKeys.has(key.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0"
                        onClick={() => { navigator.clipboard.writeText(key.prefix + "•".repeat(24)); toast.success("Key prefix copied"); }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => { setApiKeys(apiKeys.map((k) => k.id === key.id ? { ...k, active: false } : k)); toast.success("Key revoked"); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Notification Rules Tab */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Set up rule-based notifications for events.</p>
              <Button size="sm" onClick={() => setShowNewRule(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Rule
              </Button>
            </div>
            {rules.map((rule) => (
              <Card key={rule.id} className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{rule.name}</span>
                        <Badge variant="outline" className="text-[10px]">{rule.trigger}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {rule.channel === "email" ? <Mail className="w-3 h-3 mr-1" /> : rule.channel === "slack" ? <MessageSquare className="w-3 h-3 mr-1" /> : <Bell className="w-3 h-3 mr-1" />}
                          {rule.channel}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={(v) => setRules(rules.map((r) => r.id === rule.id ? { ...r, active: v } : r))}
                      />
                      <Button
                        variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => { setRules(rules.filter((r) => r.id !== rule.id)); toast.success("Rule removed"); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Webhook Dialog */}
      <Dialog open={showNewWebhook} onOpenChange={setShowNewWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>Enter the URL to receive event callbacks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Endpoint URL</Label>
              <Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://example.com/webhook" className="mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">Events can be configured after creation.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewWebhook(false)}>Cancel</Button>
            <Button onClick={addWebhook} disabled={!newWebhookUrl.trim()}>Add Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>Name your key for easy identification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Key Name</Label>
              <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="e.g., Production API Key" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKey(false)}>Cancel</Button>
            <Button onClick={addApiKey} disabled={!newKeyName.trim()}>Create Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Notification Rule Dialog */}
      <Dialog open={showNewRule} onOpenChange={setShowNewRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Notification Rule</DialogTitle>
            <DialogDescription>Get notified when specific events occur.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Rule Name</Label>
              <Input value={newRuleName} onChange={(e) => setNewRuleName(e.target.value)} placeholder="e.g., New form submission" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Trigger Event</Label>
              <Select value={newRuleTrigger} onValueChange={setNewRuleTrigger}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map((ev) => (
                    <SelectItem key={ev} value={ev}>{ev}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Channel</Label>
              <Select value={newRuleChannel} onValueChange={setNewRuleChannel}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-app">In-App</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRule(false)}>Cancel</Button>
            <Button onClick={addRule} disabled={!newRuleName.trim()}>Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
