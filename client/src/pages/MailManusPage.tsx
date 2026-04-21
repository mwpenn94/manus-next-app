import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Mail, Plus, Trash2, Copy, Shield, Send, Inbox, Lock, Loader2, CheckCircle, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface MailSettings {
  emailEnabled: boolean;
  workflowEmail: string;
  approvedSenders: string[];
  autoReply: boolean;
  autoReplyMessage: string;
  forwardToEmail: string;
}

const DEFAULT_MAIL: MailSettings = {
  emailEnabled: false,
  workflowEmail: "",
  approvedSenders: [],
  autoReply: false,
  autoReplyMessage: "Thanks for your email! I'll process this with my AI agent and get back to you shortly.",
  forwardToEmail: "",
};

export default function MailManusPage() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<MailSettings>(DEFAULT_MAIL);
  const [newSender, setNewSender] = useState("");
  const [addSenderDialog, setAddSenderDialog] = useState(false);

  const prefsQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const savePrefsMutation = trpc.preferences.save.useMutation({
    onSuccess: () => toast.success("Mail settings updated"),
    onError: (err) => toast.error(`Failed: ${err.message}`),
  });

  // Generate workflow email from user info
  const generatedEmail = user
    ? `${(user.name || "user").toLowerCase().replace(/\s+/g, ".")}+agent@manus.space`
    : "you+agent@manus.space";

  // Hydrate from server
  useEffect(() => {
    if (prefsQuery.data?.generalSettings) {
      const gs = prefsQuery.data.generalSettings as Record<string, unknown>;
      if (gs.mailSettings && typeof gs.mailSettings === "object") {
        const ms = gs.mailSettings as Record<string, unknown>;
        setSettings((prev) => ({
          ...prev,
          emailEnabled: typeof ms.emailEnabled === "boolean" ? ms.emailEnabled : prev.emailEnabled,
          workflowEmail: typeof ms.workflowEmail === "string" ? ms.workflowEmail : generatedEmail,
          approvedSenders: Array.isArray(ms.approvedSenders) ? (ms.approvedSenders as string[]) : prev.approvedSenders,
          autoReply: typeof ms.autoReply === "boolean" ? ms.autoReply : prev.autoReply,
          autoReplyMessage: typeof ms.autoReplyMessage === "string" ? ms.autoReplyMessage : prev.autoReplyMessage,
          forwardToEmail: typeof ms.forwardToEmail === "string" ? ms.forwardToEmail : prev.forwardToEmail,
        }));
      } else {
        setSettings((prev) => ({ ...prev, workflowEmail: generatedEmail }));
      }
    }
  }, [prefsQuery.data, generatedEmail]);

  const saveMailSettings = (patch: Partial<MailSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (isAuthenticated) {
      const existing = (prefsQuery.data?.generalSettings as Record<string, unknown>) || {};
      savePrefsMutation.mutate({ generalSettings: { ...existing, mailSettings: next } });
    }
  };

  const handleAddSender = () => {
    const email = newSender.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (settings.approvedSenders.includes(email)) {
      toast.error("This email is already in the approved list");
      return;
    }
    saveMailSettings({ approvedSenders: [...settings.approvedSenders, email] });
    setNewSender("");
    setAddSenderDialog(false);
  };

  const handleRemoveSender = (email: string) => {
    saveMailSettings({ approvedSenders: settings.approvedSenders.filter((s) => s !== email) });
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(settings.workflowEmail || generatedEmail);
    toast.success("Email address copied to clipboard");
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-sm text-center">
          <CardContent className="py-12">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Sign in to configure Mail Manus.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Mail Manus</h1>
          <Badge variant={settings.emailEnabled ? "default" : "secondary"} className="ml-auto">
            {settings.emailEnabled ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Send emails to your agent to trigger tasks and workflows. Your agent processes incoming emails and responds with results.
        </p>

        {/* Enable/Disable */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Email Integration
            </CardTitle>
            <CardDescription>Enable email-based interaction with your AI agent.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Mail Manus</p>
                <p className="text-xs text-muted-foreground mt-0.5">Allow your agent to receive and process emails.</p>
              </div>
              <Switch
                checked={settings.emailEnabled}
                onCheckedChange={(v) => saveMailSettings({ emailEnabled: v })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Workflow Email Address */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="w-4 h-4 text-primary" /> Your Agent Email
            </CardTitle>
            <CardDescription>Send emails to this address to create tasks for your agent.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-accent/30 border border-border rounded-lg px-4 py-3">
                <p className="text-sm font-mono text-foreground">{settings.workflowEmail || generatedEmail}</p>
              </div>
              <Button variant="outline" size="sm" onClick={copyEmail}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Emails sent to this address will be converted into agent tasks. The subject becomes the task title and the body becomes the prompt.
            </p>
          </CardContent>
        </Card>

        {/* Auto-Reply */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Auto-Reply
            </CardTitle>
            <CardDescription>Automatically respond to incoming emails to confirm receipt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Send auto-reply</p>
                <p className="text-xs text-muted-foreground mt-0.5">Confirm receipt of emails with an automatic response.</p>
              </div>
              <Switch
                checked={settings.autoReply}
                onCheckedChange={(v) => saveMailSettings({ autoReply: v })}
              />
            </div>
            {settings.autoReply && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Reply message</label>
                <textarea
                  value={settings.autoReplyMessage}
                  onChange={(e) => saveMailSettings({ autoReplyMessage: e.target.value })}
                  rows={3}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forward Results */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" /> Forward Results
            </CardTitle>
            <CardDescription>Forward completed task results to an email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Forward to email</label>
              <Input
                placeholder="you@example.com"
                value={settings.forwardToEmail}
                onChange={(e) => saveMailSettings({ forwardToEmail: e.target.value })}
                type="email"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to disable forwarding.</p>
            </div>
          </CardContent>
        </Card>

        {/* Approved Senders */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" /> Approved Senders
                </CardTitle>
                <CardDescription className="mt-1">Only emails from approved senders will be processed.</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setAddSenderDialog(true); setNewSender(""); }}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> Add Sender
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {settings.approvedSenders.length === 0 ? (
              <div className="text-center py-6">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No approved senders yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Add email addresses that are allowed to send tasks to your agent.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.approvedSenders.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2.5 rounded-lg bg-accent/30 border border-border">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-sm text-foreground">{email}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRemoveSender(email)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Sender Dialog */}
      <Dialog open={addSenderDialog} onOpenChange={setAddSenderDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Add Approved Sender
            </DialogTitle>
            <DialogDescription>Enter the email address of a person allowed to send tasks to your agent.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="colleague@company.com"
              value={newSender}
              onChange={(e) => setNewSender(e.target.value)}
              type="email"
              onKeyDown={(e) => e.key === "Enter" && handleAddSender()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSenderDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSender} disabled={!newSender.trim()}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
