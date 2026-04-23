import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Shield, Globe, Monitor, Trash2, Download, Share2, Eye, EyeOff, Cookie, RefreshCw, AlertTriangle, Loader2, HardDrive, Lock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

interface DataControlSettings {
  shareTasksPublicly: boolean;
  persistBrowserLogin: boolean;
  allowCookieStorage: boolean;
  autoDeleteHistory: boolean;
  historyRetentionDays: number;
}

const DEFAULT_SETTINGS: DataControlSettings = {
  shareTasksPublicly: false,
  persistBrowserLogin: true,
  allowCookieStorage: true,
  autoDeleteHistory: false,
  historyRetentionDays: 90,
};

export default function DataControlsPage() {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<DataControlSettings>(DEFAULT_SETTINGS);
  const [confirmClearBrowser, setConfirmClearBrowser] = useState(false);
  const [confirmDeleteData, setConfirmDeleteData] = useState(false);
  const [exporting, setExporting] = useState(false);

  const prefsQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const savePrefsMutation = trpc.preferences.save.useMutation({
    onSuccess: () => { toast.success("Data controls updated"); },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  // Hydrate from server
  useEffect(() => {
    if (prefsQuery.data?.generalSettings) {
      const gs = prefsQuery.data.generalSettings as Record<string, unknown>;
      setSettings((prev) => ({
        ...prev,
        shareTasksPublicly: typeof gs.shareTasksPublicly === "boolean" ? gs.shareTasksPublicly : prev.shareTasksPublicly,
        persistBrowserLogin: typeof gs.persistBrowserLogin === "boolean" ? gs.persistBrowserLogin : prev.persistBrowserLogin,
        allowCookieStorage: typeof gs.allowCookieStorage === "boolean" ? gs.allowCookieStorage : prev.allowCookieStorage,
        autoDeleteHistory: typeof gs.autoDeleteHistory === "boolean" ? gs.autoDeleteHistory : prev.autoDeleteHistory,
        historyRetentionDays: typeof gs.historyRetentionDays === "number" ? gs.historyRetentionDays : prev.historyRetentionDays,
      }));
    }
  }, [prefsQuery.data]);

  const saveSettings = (patch: Partial<DataControlSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (isAuthenticated) {
      const existing = (prefsQuery.data?.generalSettings as Record<string, unknown>) || {};
      savePrefsMutation.mutate({ generalSettings: { ...existing, ...next } });
    }
  };

  // Deployed websites from webapp projects
  const webappProjects = trpc.webappProject.list.useQuery(undefined, { enabled: isAuthenticated });
  const deployedSites = useMemo(
    () => (webappProjects.data || []).filter((p: any) => p.deployStatus === "deployed"),
    [webappProjects.data]
  );

  const exportMutation = trpc.gdpr.exportData.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success(`Data exported successfully (${data.exportedAt})`);
      setExporting(false);
    },
    onError: (err) => {
      toast.error(`Export failed: ${err.message}`);
      setExporting(false);
    },
  });

  const deleteMutation = trpc.gdpr.deleteAllData.useMutation({
    onSuccess: () => {
      toast.success("All data deleted. You will be logged out.");
      setConfirmDeleteData(false);
      setTimeout(() => { window.location.href = "/"; }, 2000);
    },
    onError: (err) => {
      toast.error(`Deletion failed: ${err.message}`);
    },
  });

  const handleExportData = async () => {
    setExporting(true);
    exportMutation.mutate();
  };

  const handleClearBrowserData = () => {
    // Clear cookies and local storage related to cloud browser
    try {
      localStorage.removeItem("browser-session");
      localStorage.removeItem("crimson-hawk-config");
      toast.success("Cloud browser data cleared");
    } catch {
      toast.error("Failed to clear browser data");
    }
    setConfirmClearBrowser(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-sm text-center">
          <CardContent className="py-12">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Sign in to manage your data controls.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Data Controls</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">
          Manage how your data is stored, shared, and accessed across the platform.
        </p>

        {/* Shared Tasks */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" /> Shared Tasks
            </CardTitle>
            <CardDescription>Control whether your completed tasks can be shared publicly via link.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Allow public sharing</p>
                <p className="text-xs text-muted-foreground mt-0.5">When enabled, tasks can be shared via a public link.</p>
              </div>
              <Switch
                checked={settings.shareTasksPublicly}
                onCheckedChange={(v) => saveSettings({ shareTasksPublicly: v })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {settings.shareTasksPublicly ? (
                  <><Eye className="w-3 h-3 mr-1" /> Public sharing enabled</>
                ) : (
                  <><EyeOff className="w-3 h-3 mr-1" /> Sharing disabled</>
                )}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Deployed Websites */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Deployed Websites
            </CardTitle>
            <CardDescription>Websites you've deployed through the App Builder.</CardDescription>
          </CardHeader>
          <CardContent>
            {webappProjects.isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : deployedSites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No deployed websites yet.</p>
            ) : (
              <div className="space-y-3">
                {deployedSites.map((site: any) => (
                  <div key={site.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{site.publishedUrl || "Not deployed"}</p>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-600/30 text-xs">Live</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cloud Browser Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Cloud Browser
            </CardTitle>
            <CardDescription>Control how the cloud browser stores session data and cookies.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Persist login sessions</p>
                <p className="text-xs text-muted-foreground mt-0.5">Keep you logged in across browser sessions.</p>
              </div>
              <Switch
                checked={settings.persistBrowserLogin}
                onCheckedChange={(v) => saveSettings({ persistBrowserLogin: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Allow cookie storage</p>
                <p className="text-xs text-muted-foreground mt-0.5">Store cookies for faster page loads and personalization.</p>
              </div>
              <Switch
                checked={settings.allowCookieStorage}
                onCheckedChange={(v) => saveSettings({ allowCookieStorage: v })}
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setConfirmClearBrowser(true)} className="mt-2">
              <Cookie className="w-3.5 h-3.5 mr-1.5" /> Clear Browser Data
            </Button>
          </CardContent>
        </Card>

        {/* History & Retention */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-primary" /> History & Retention
            </CardTitle>
            <CardDescription>Control how long your task history and data are retained.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-delete old tasks</p>
                <p className="text-xs text-muted-foreground mt-0.5">Automatically remove tasks older than the retention period.</p>
              </div>
              <Switch
                checked={settings.autoDeleteHistory}
                onCheckedChange={(v) => saveSettings({ autoDeleteHistory: v })}
              />
            </div>
            {settings.autoDeleteHistory && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Retention period:</label>
                <select
                  value={settings.historyRetentionDays}
                  onChange={(e) => saveSettings({ historyRetentionDays: Number(e.target.value) })}
                  className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
                >
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Export & Deletion */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Data Export & Deletion
            </CardTitle>
            <CardDescription>Export or permanently delete your data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleExportData} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Download className="w-4 h-4 mr-1.5" />}
                Export All Data
              </Button>
              <Button variant="destructive" onClick={() => setConfirmDeleteData(true)}>
                <Trash2 className="w-4 h-4 mr-1.5" /> Delete All Data
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Exported data includes tasks, messages, preferences, and connector configurations.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clear Browser Confirmation */}
      <Dialog open={confirmClearBrowser} onOpenChange={setConfirmClearBrowser}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" /> Clear Browser Data
            </DialogTitle>
            <DialogDescription>This will clear all stored cookies and session data from the cloud browser. You'll need to log in again to any sites.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClearBrowser(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearBrowserData}>Clear Data</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Data Confirmation */}
      <Dialog open={confirmDeleteData} onOpenChange={setConfirmDeleteData}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Delete All Data
            </DialogTitle>
            <DialogDescription>This action is irreversible. All your tasks, messages, and settings will be permanently deleted.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteData(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              Delete Everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
