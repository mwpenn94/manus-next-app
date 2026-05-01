import React, { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Copy, Trash2, TestTube, ChevronRight, RefreshCw, CircleCheck, CircleX, Wrench, Loader2 } from "lucide-react";

// Type Definitions
type WebhookEvent = "event.created" | "event.updated" | "event.deleted" | "user.created" | "user.deleted";
type WebhookStatus = "active" | "inactive" | "failing";
type DeliveryStatus = "success" | "failed" | "pending";

interface DeliveryLog {
  id: string;
  timestamp: Date;
  status: DeliveryStatus;
  statusCode: number;
  duration: number; // in ms
  response: string;
}

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  lastTriggered: Date | null;
  deliveryHistory: DeliveryLog[];
}

// Mock Data
const mockWebhooks: Webhook[] = [
  {
    id: "wh_1",
    url: "https://api.example.com/v1/hooks/123",
    secret: "whsec_abc123xyz",
    events: ["event.created", "event.updated"],
    status: "active",
    lastTriggered: new Date(Date.now() - 3600000),
    deliveryHistory: [
      { id: "del_1a", timestamp: new Date(Date.now() - 3600000), status: "success", statusCode: 200, duration: 150, response: JSON.stringify({ status: "ok" }) },
      { id: "del_1b", timestamp: new Date(Date.now() - 7200000), status: "success", statusCode: 200, duration: 120, response: JSON.stringify({ status: "ok" }) },
    ],
  },
  {
    id: "wh_2",
    url: "https://my-app.io/webhooks/notifications",
    secret: "whsec_def456uvw",
    events: ["user.created", "user.deleted"],
    status: "failing",
    lastTriggered: new Date(Date.now() - 1800000),
    deliveryHistory: [
      { id: "del_2a", timestamp: new Date(Date.now() - 1800000), status: "failed", statusCode: 503, duration: 550, response: 'Service Unavailable' },
      { id: "del_2b", timestamp: new Date(Date.now() - 5400000), status: "failed", statusCode: 503, duration: 520, response: 'Service Unavailable' },
      { id: "del_2c", timestamp: new Date(Date.now() - 9000000), status: "success", statusCode: 200, duration: 200, response: JSON.stringify({ status: "ok" }) },
    ],
  },
  {
    id: "wh_3",
    url: "https://hooks.another-service.com/endpoint",
    secret: "whsec_ghi789rst",
    events: ["event.deleted"],
    status: "inactive",
    lastTriggered: null,
    deliveryHistory: [],
  },
  {
    id: "wh_4",
    url: "https://internal-logging.corp/api/hooks",
    secret: "whsec_jkl012mno",
    events: ["event.created", "event.updated", "event.deleted", "user.created", "user.deleted"],
    status: "active",
    lastTriggered: new Date(Date.now() - 86400000),
    deliveryHistory: Array.from({ length: 5 }).map((_, i) => ({
      id: `del_4${String.fromCharCode(97 + i)}`,
      timestamp: new Date(Date.now() - (i + 1) * 86400000),
      status: "success",
      statusCode: 200,
      duration: Math.floor(Math.random() * 50) + 80,
      response: JSON.stringify({ status: "ok" }),
    })),
  },
  {
    id: "wh_5",
    url: "https://analytics.third-party.com/ingest",
    secret: "whsec_pqr345stu",
    events: ["user.created"],
    status: "active",
    lastTriggered: new Date(Date.now() - 60000),
    deliveryHistory: [
        { id: "del_5a", timestamp: new Date(Date.now() - 60000), status: "success", statusCode: 204, duration: 75, response: '' },
    ]
  },
];

const ALL_EVENTS: WebhookEvent[] = ["event.created", "event.updated", "event.deleted", "user.created", "user.deleted"];

const StatusBadge: React.FC<{ status: WebhookStatus }> = ({ status }) => {
  const statusConfig = {
    active: { color: "bg-green-500", text: "Active" },
    inactive: { color: "bg-gray-500", text: "Inactive" },
    failing: { color: "bg-red-500", text: "Failing" },
  };
  return (
    <div className="flex items-center text-sm">
      <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig[status].color}`} />
      <span>{statusConfig[status].text}</span>
    </div>
  );
};

const CreateWebhookDialog: React.FC<{ onAddWebhook: (webhook: Webhook) => void }> = ({ onAddWebhook }) => {
    const [open, setOpen] = useState(false);
    const [url, setUrl] = useState("");
    const [selectedEvents, setSelectedEvents] = useState<Set<WebhookEvent>>(new Set());

    const handleAdd = () => {
        if (!url) return;
        const newWebhook: Webhook = {
            id: `wh_${Date.now()}`,
            url,
            secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
            events: Array.from(selectedEvents),
            status: "active",
            lastTriggered: null,
            deliveryHistory: [],
        };
        onAddWebhook(newWebhook);
        setOpen(false);
        setUrl("");
        setSelectedEvents(new Set());
    };

    const handleEventToggle = (event: WebhookEvent) => {
        const newSet = new Set(selectedEvents);
        if (newSet.has(event)) {
            newSet.delete(event);
        } else {
            newSet.add(event);
        }
        setSelectedEvents(newSet);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                    <Plus size={18} /> Create Webhook
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl bg-card border-border">
                <DialogHeader><DialogTitle>Create New Webhook</DialogTitle></DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="url" className="text-right">Endpoint URL</Label>
                        <Input id="url" value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} className="col-span-3" placeholder="https://example.com/api/webhook" />
                    </div>
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Events to send</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-4">
                            {ALL_EVENTS.map((event) => (
                                <div key={event} className="flex items-center space-x-3">
                                    <Checkbox id={event} checked={selectedEvents.has(event)} onCheckedChange={() => handleEventToggle(event)} />
                                    <label htmlFor={event} className="text-sm font-mono leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{event}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={() => setOpen(false)} variant="outline">Cancel</Button>
                    <Button onClick={handleAdd} disabled={!url || selectedEvents.size === 0}>Add Webhook</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const TestWebhookDialog: React.FC<{ webhook: Webhook }> = ({ webhook }) => {
    const [open, setOpen] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<DeliveryLog | null>(null);

    const handleTest = () => {
        setTesting(true);
        setTestResult(null);
        setTimeout(() => {
            const success = Math.random() > 0.2; // 80% success rate
            const result: DeliveryLog = {
                id: `test_${Date.now()}`,
                timestamp: new Date(),
                status: success ? "success" : "failed",
                statusCode: success ? 200 : 500,
                duration: Math.floor(Math.random() * 400) + 100,
                response: success ? JSON.stringify({ status: "test successful", event: "test.event" }) : "Internal Server Error",
            };
            setTestResult(result);
            setTesting(false);
        }, 1500);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full"><TestTube size={14} className="mr-2"/> Test Webhook</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border">
                <DialogHeader><DialogTitle>Test Webhook: <span className="font-mono text-primary">{webhook.url}</span></DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                    <p className="text-sm text-muted-foreground">A test event will be sent to your endpoint. This allows you to verify that your endpoint is receiving requests correctly.</p>
                    <Button onClick={handleTest} disabled={testing} className="w-full">
                        {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube size={16} className="mr-2"/>} Send Test Event
                    </Button>
                    {testResult && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-4">
                            <h4 className="font-semibold">Test Result</h4>
                            <div className="flex items-center gap-4">
                                {testResult.status === 'success' ? <CircleCheck size={20} className="text-green-500"/> : <CircleX size={20} className="text-red-500"/>}
                                <Badge variant={testResult.status === 'success' ? 'default' : 'destructive'} className={cn(testResult.status === 'success' && 'bg-green-500/20 text-green-700 border-green-500/30')}>{testResult.statusCode}</Badge>
                                <span className="text-sm text-muted-foreground">Duration: {testResult.duration}ms</span>
                            </div>
                            <div>
                                <Label>Response Body</Label>
                                <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto"><code>{testResult.response || "<empty response>"}</code></pre>
                            </div>
                        </motion.div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<Webhook[]>(mockWebhooks);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const addWebhook = (webhook: Webhook) => {
    setWebhooks(prev => [webhook, ...prev]);
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(prev => prev.filter(wh => wh.id !== id));
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const timeAgo = (date: Date | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return "just now";
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 min-h-screen font-sans">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3"><Wrench className="text-primary" size={28}/><h1 className="text-2xl font-bold">Webhook Manager</h1></div>
          <CreateWebhookDialog onAddWebhook={addWebhook} />
        </header>

        <Card className="bg-card border-border shadow-md">
          <CardHeader><CardTitle>Configured Webhooks</CardTitle></CardHeader>
          <CardContent>
            <AnimatePresence>
              <div className="space-y-2">
                {webhooks.map((webhook) => (
                  <motion.div key={webhook.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="rounded-lg bg-muted/30 border-border border transition-all duration-300 hover:border-primary/50 hover:bg-muted/60">
                    <div className="p-4 flex flex-row items-center justify-between cursor-pointer" onClick={() => setSelectedWebhookId(selectedWebhookId === webhook.id ? null : webhook.id)}>
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <motion.div animate={{ rotate: selectedWebhookId === webhook.id ? 90 : 0 }}><ChevronRight size={16} /></motion.div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm truncate" title={webhook.url}>{webhook.url}</p>
                          <p className="text-xs text-muted-foreground">Last triggered: {timeAgo(webhook.lastTriggered)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <StatusBadge status={webhook.status} />
                        <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="w-8 h-8" onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteWebhook(webhook.id); }}><Trash2 size={16} /></Button></TooltipTrigger><TooltipContent><p>Delete Webhook</p></TooltipContent></Tooltip>
                      </div>
                    </div>
                    <AnimatePresence>
                      {selectedWebhookId === webhook.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="p-4 pt-0">
                            <Separator className="mb-4 bg-border"/>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="md:col-span-1 space-y-4">
                                  <h4 className="font-semibold">Configuration</h4>
                                  <div className="space-y-2">
                                      <Label>Secret Key</Label>
                                      <div className="flex items-center gap-2">
                                          <Input type="password" readOnly value={webhook.secret} className="font-mono"/>
                                          <Tooltip open={copied ? true : undefined}>
                                              <TooltipTrigger asChild><Button variant="outline" size="icon" onClick={() => copySecret(webhook.secret)}><Copy size={16}/></Button></TooltipTrigger>
                                              <TooltipContent><p>{copied ? "Copied!" : "Copy Secret"}</p></TooltipContent>
                                          </Tooltip>
                                      </div>
                                  </div>
                                  <div className="space-y-2">
                                      <Label>Subscribed Events</Label>
                                      <div className="flex flex-wrap gap-2">
                                          {webhook.events.map(event => <Badge key={event} variant="secondary">{event}</Badge>)}
                                      </div>
                                  </div>
                                  <div className="flex gap-2 pt-2">
                                      <TestWebhookDialog webhook={webhook} />
                                      {webhook.status === 'failing' && <Button variant="destructive" size="sm" className="w-full"><RefreshCw size={14} className="mr-2"/> Retry Failed</Button>}
                                  </div>
                              </div>
                              <div className="md:col-span-2">
                                  <h4 className="font-semibold mb-2">Delivery Log</h4>
                                  <div className="border rounded-lg max-h-60 overflow-y-auto relative">
                                      <Table>
                                          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10"><TableRow><TableHead className="w-8"></TableHead><TableHead>Timestamp</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Duration</TableHead></TableRow></TableHeader>
                                          <TableBody>
                                              {webhook.deliveryHistory.length > 0 ? webhook.deliveryHistory.map(log => (
                                                  <TableRow key={log.id} className="hover:bg-muted/50">
                                                      <TableCell>{log.status === 'success' ? <CircleCheck size={16} className="text-green-500"/> : <CircleX size={16} className="text-red-500"/>}</TableCell>
                                                      <TableCell className="text-sm text-muted-foreground">{log.timestamp.toLocaleString()}</TableCell>
                                                      <TableCell><Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={cn(log.status === 'success' && 'bg-green-500/20 text-green-700 border-green-500/30')}>{log.statusCode}</Badge></TableCell>
                                                      <TableCell className="text-right text-sm text-muted-foreground">{log.duration}ms</TableCell>
                                                  </TableRow>
                                              )) : (
                                                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No delivery history.</TableCell></TableRow>
                                              )}
                                          </TableBody>
                                      </Table>
                                  </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
