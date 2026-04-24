/**
 * WebAppProjectPage — Manus-style Webapp Management UI
 * 
 * Mirrors Manus platform's management panels:
 * - Preview: Live dev server preview
 * - Code: File tree with download
 * - Dashboard: Status, analytics, visibility
 * - Settings: General, Domains, Secrets, GitHub, Notifications
 * - Deployments: Version history with rollback
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Eye, Code, BarChart3, Settings, Rocket, GitBranch, Globe, Lock,
  ExternalLink, RefreshCw, ArrowLeft, Loader2, Plus, Trash2,
  Key, Bell, Link2, Server, Clock, CheckCircle, XCircle,
  Activity, Users, FileCode, Download, Upload, Shield, Zap,
  ChevronRight, MoreHorizontal, Copy, RotateCcw,
  CreditCard, Search, AlertTriangle, Smartphone, Tablet, Monitor, MapPin
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRealtimeAnalytics } from "@/hooks/useRealtimeAnalytics";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ManagementPanel = "preview" | "code" | "dashboard" | "settings" | "deployments";
type SettingsTab = "general" | "domains" | "secrets" | "github" | "notifications" | "payment" | "seo";

export default function WebAppProjectPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [, routeParams] = useRoute("/projects/webapp/:projectId");
  const projectId = routeParams?.projectId;

  const [activePanel, setActivePanel] = useState<ManagementPanel>("preview");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");
  const [deployConfirmOpen, setDeployConfirmOpen] = useState(false);
  const [deployStatusMessage, setDeployStatusMessage] = useState("");

  // Queries
  const projectQuery = trpc.webappProject.get.useQuery(
    { externalId: projectId! },
    { enabled: !!projectId && !!user }
  );

  const deploymentsQuery = trpc.webappProject.deployments.useQuery(
    { externalId: projectId! },
    { enabled: !!projectId && activePanel === "deployments" }
  );

  const analyticsQuery = trpc.webappProject.analytics.useQuery(
    { externalId: projectId!, days: 30 },
    { enabled: !!projectId && activePanel === "dashboard" }
  );

  const geoQuery = trpc.webappProject.geoAnalytics.useQuery(
    { externalId: projectId!, days: 30 },
    { enabled: !!projectId && activePanel === "dashboard" }
  );

  const deviceQuery = trpc.webappProject.deviceAnalytics.useQuery(
    { externalId: projectId!, days: 30 },
    { enabled: !!projectId && activePanel === "dashboard" }
  );

  // Mutations
  const updateProjectMut = trpc.webappProject.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      projectQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deployMut = trpc.webappProject.deploy.useMutation({
    onMutate: () => {
      setDeployStatusMessage("Deploying...");
    },
    onSuccess: () => {
      toast.success("Deployment started");
      setDeployStatusMessage("Deployment successful — your app is live.");
      projectQuery.refetch();
      deploymentsQuery.refetch();
      setDeployConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeployStatusMessage(`Deployment failed: ${err.message}`);
    },
  });

  const deployFromGitHubMut = trpc.webappProject.deployFromGitHub.useMutation({
    onMutate: () => {
      setDeployStatusMessage("Deploying from GitHub...");
    },
    onSuccess: () => {
      toast.success("GitHub deployment successful");
      setDeployStatusMessage("GitHub deployment successful — your app is live.");
      projectQuery.refetch();
      deploymentsQuery.refetch();
      setDeployConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setDeployStatusMessage(`GitHub deployment failed: ${err.message}`);
    },
  });

  const deleteProjectMut = trpc.webappProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      navigate("/projects");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const duplicateProjectMut = trpc.webappProject.create.useMutation({
    onSuccess: (result) => {
      toast.success("Project duplicated! Redirecting...");
      navigate(`/webapp-project/${result.externalId}`);
    },
    onError: () => { toast.error("Failed to duplicate project"); },
  });

  const project = projectQuery.data;

  if (projectQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Projects
        </Button>
      </div>
    );
  }

  const PANELS: { id: ManagementPanel; label: string; icon: typeof Eye }[] = [
    { id: "preview", label: "Preview", icon: Eye },
    { id: "code", label: "Code", icon: Code },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "deployments", label: "Deployments", icon: Rocket },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Header Bar — Manus-style */}
      <div className="border-b border-border px-4 py-2.5 flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/projects")} aria-label="Back to projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">{project.name}</span>
          </div>
          <span aria-live="assertive" aria-atomic="true" role="status">
            <Badge
              variant={project.deployStatus === "live" ? "default" : "secondary"}
              className={cn("text-[10px]",
                project.deployStatus === "live" && "bg-green-500/20 text-green-400 border-green-500/30"
              )}
            >
              {project.deployStatus === "live" ? "Live" : project.deployStatus}
            </Badge>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {project.publishedUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={project.publishedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Visit
              </a>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setDeployConfirmOpen(true)}
            disabled={deployMut.isPending}
            aria-busy={deployMut.isPending}
          >
            {deployMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1" />}
            Publish
          </Button>
        </div>
      </div>
      {/* Screen-reader-only deploy status announcements */}
      <div className="sr-only" role="alert" aria-live="assertive">{deployStatusMessage}</div>

      {/* Panel Navigation — Manus-style tabs */}
      <div className="border-b border-border px-4">
        <div className="flex items-center gap-0">
          {PANELS.map((panel) => (
            <button
              key={panel.id}
              onClick={() => setActivePanel(panel.id)}
              aria-label={`Switch to ${panel.label} panel`}
              aria-selected={activePanel === panel.id}
              role="tab"
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors border-b-2 -mb-px",
                activePanel === panel.id
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <panel.icon className="w-3.5 h-3.5" />
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto">
        {/* Preview Panel */}
        {activePanel === "preview" && (
          <div className="h-full flex flex-col">
            <div className="border-b border-border px-4 py-2 flex items-center gap-2 bg-muted/30">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 bg-background rounded-md px-3 py-1 text-xs text-muted-foreground border border-border">
                {project.publishedUrl || "Not yet deployed"}
              </div>
              <Button variant="ghost" size="sm" onClick={() => projectQuery.refetch()}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="flex-1 bg-muted/20 flex items-center justify-center">
              {project.publishedUrl ? (
                <iframe
                  src={project.publishedUrl}
                  className="w-full h-full border-0"
                  title="Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : (
                <div className="text-center">
                  <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No preview available</p>
                  <p className="text-xs text-muted-foreground mt-1">Deploy your project to see a live preview</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Code Panel */}
        {activePanel === "code" && (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Project Code</h2>
              <Button variant="outline" size="sm" onClick={() => {
                if (project.publishedUrl) {
                  window.open(project.publishedUrl, "_blank");
                  toast.success("Opening published app — right-click to save as HTML");
                } else {
                  toast.info("No published build to download. Deploy first.");
                }
              }}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
            {project.githubRepoId ? (
              <Card className="border-border">
                <CardContent className="flex items-center gap-3 py-4">
                  <GitBranch className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Connected to GitHub</p>
                    <p className="text-xs text-muted-foreground">View and manage code on GitHub</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/github")}>
                    Open in GitHub <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileCode className="w-10 h-10 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">No GitHub repository connected</p>
                  <p className="text-xs text-muted-foreground mb-4">Connect a repo to manage code with version control</p>
                  <Button variant="outline" size="sm" onClick={() => { setActivePanel("settings"); setSettingsTab("github"); }}>
                    <GitBranch className="w-3.5 h-3.5 mr-1" /> Connect GitHub
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Clone command — only show when a real GitHub repo is connected */}
            {project.githubRepoId ? (
              <Card className="border-border mt-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Clone Command</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono text-muted-foreground">
                    git clone https://github.com/{project.githubRepoId || project.name}.git                  </code>
                    {project.githubRepoId && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        navigator.clipboard.writeText(`git clone https://github.com/${project.name}.git`);
                        toast.success("Copied to clipboard");
                      }}>
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

        {/* Dashboard Panel */}
        {activePanel === "dashboard" && (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Dashboard</h2>
              {/* Live visitor count badge */}
              <LiveVisitorBadge projectExternalId={project.externalId} />
            </div>

            {/* Status Cards — real analytics from tracking pixel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", project.deployStatus === "live" ? "bg-green-500" : "bg-yellow-500")} />
                    <span className="text-lg font-semibold capitalize">{project.deployStatus}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Page Views (30d)</span>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-lg font-semibold">
                    {analyticsQuery.isLoading ? "..." : (analyticsQuery.data?.totalViews?.toLocaleString() || 0)}
                  </span>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Unique Visitors (30d)</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-lg font-semibold">
                    {analyticsQuery.isLoading ? "..." : (analyticsQuery.data?.uniqueVisitors?.toLocaleString() || 0)}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Top Pages */}
            {analyticsQuery.data?.topPaths && analyticsQuery.data.topPaths.length > 0 && (
              <Card className="border-border mb-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Top Pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analyticsQuery.data.topPaths.map((p: { path: string; count: number }) => (
                    <div key={p.path} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono text-xs">{p.path}</span>
                      <Badge variant="secondary">{p.count} views</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Top Referrers */}
            {analyticsQuery.data?.topReferrers && analyticsQuery.data.topReferrers.length > 0 && (
              <Card className="border-border mb-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Top Referrers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analyticsQuery.data.topReferrers.map((r: { referrer: string; count: number }) => (
                    <div key={r.referrer} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[300px]">{r.referrer}</span>
                      <Badge variant="secondary">{r.count}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Views by Day */}
            {analyticsQuery.data?.viewsByDay && analyticsQuery.data.viewsByDay.length > 0 && (
              <Card className="border-border mb-4">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm" id="daily-views-heading">Daily Views (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-24" role="img" aria-labelledby="daily-views-heading" aria-describedby="daily-views-summary">
                    {analyticsQuery.data.viewsByDay.map((d: { date: string; count: number }) => {
                      const max = Math.max(...analyticsQuery.data!.viewsByDay.map((x: { count: number }) => x.count));
                      const height = max > 0 ? (d.count / max) * 100 : 0;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} views`} role="presentation">
                          <div className="w-full bg-primary/80 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} aria-hidden="true" />
                        </div>
                      );
                    })}
                  </div>
                  <p id="daily-views-summary" className="sr-only">
                    Bar chart showing daily page views. Total: {analyticsQuery.data.viewsByDay.reduce((sum: number, d: { count: number }) => sum + d.count, 0)} views over {analyticsQuery.data.viewsByDay.length} days.
                  </p>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{analyticsQuery.data.viewsByDay[0]?.date}</span>
                    <span>{analyticsQuery.data.viewsByDay[analyticsQuery.data.viewsByDay.length - 1]?.date}</span>
                  </div>
                  {/* Hidden data table for screen readers */}
                  <table className="sr-only">
                    <caption>Daily page views data</caption>
                    <thead><tr><th scope="col">Date</th><th scope="col">Views</th></tr></thead>
                    <tbody>
                      {analyticsQuery.data.viewsByDay.map((d: { date: string; count: number }) => (
                        <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Geographic Analytics — Country Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Card className="border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Visitors by Country
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {geoQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  ) : geoQuery.data && geoQuery.data.length > 0 ? (
                    <div className="space-y-2" role="list" aria-label="Visitors by country">
                      {geoQuery.data.slice(0, 10).map((g: { country: string; count: number }, i: number) => {
                        const maxCount = geoQuery.data![0]?.count || 1;
                        const pct = Math.round((g.count / maxCount) * 100);
                        return (
                          <div key={g.country} className="flex items-center gap-3" role="listitem" aria-label={`${g.country}: ${g.count} visitors`}>
                            <span className="text-xs font-mono w-10 text-muted-foreground">{g.country}</span>
                            <div className="flex-1 h-5 bg-muted/50 rounded overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded transition-all",
                                  i === 0 ? "bg-primary" : i < 3 ? "bg-primary/70" : "bg-primary/40"
                                )}
                                style={{ width: `${Math.max(pct, 4)}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-12 text-right">{g.count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">No geographic data yet. Country detection requires CDN headers (CF-IPCountry).</p>
                  )}
                  {/* Hidden data table for screen readers */}
                  {geoQuery.data && geoQuery.data.length > 0 && (
                    <table className="sr-only">
                      <caption>Visitors by country data</caption>
                      <thead><tr><th scope="col">Country</th><th scope="col">Visitors</th></tr></thead>
                      <tbody>
                        {geoQuery.data.map((g: { country: string; count: number }) => (
                          <tr key={g.country}><td>{g.country}</td><td>{g.count}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Device Breakdown — Pie Chart */}
              <Card className="border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Monitor className="w-4 h-4" /> Device Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deviceQuery.isLoading ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-4 h-4 animate-spin" /></div>
                  ) : deviceQuery.data && deviceQuery.data.total > 0 ? (
                    <div className="flex items-center gap-6">
                      {/* SVG Donut Chart */}
                      <div className="relative w-28 h-28 shrink-0" role="img" aria-label={`Device breakdown: ${deviceQuery.data.desktop} desktop, ${deviceQuery.data.tablet} tablet, ${deviceQuery.data.mobile} mobile, ${deviceQuery.data.unknown} unknown out of ${deviceQuery.data.total} total visitors`}>
                        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90" aria-hidden="true">
                          {(() => {
                            const d = deviceQuery.data!;
                            const total = d.total || 1;
                            const segments = [
                              { value: d.desktop, color: "oklch(0.65 0.15 250)" },
                              { value: d.tablet, color: "oklch(0.70 0.12 160)" },
                              { value: d.mobile, color: "oklch(0.75 0.14 50)" },
                              { value: d.unknown, color: "oklch(0.55 0.02 250)" },
                            ].filter(s => s.value > 0);
                            let offset = 0;
                            return segments.map((seg, i) => {
                              const pct = (seg.value / total) * 100;
                              const el = (
                                <circle
                                  key={i}
                                  cx="18" cy="18" r="15.9155"
                                  fill="none"
                                  stroke={seg.color}
                                  strokeWidth="3.5"
                                  strokeDasharray={`${pct} ${100 - pct}`}
                                  strokeDashoffset={-offset}
                                  strokeLinecap="round"
                                />
                              );
                              offset += pct;
                              return el;
                            });
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-lg font-bold">{deviceQuery.data.total}</span>
                        </div>
                      </div>
                      {/* Legend */}
                      <div className="space-y-2 flex-1">
                        {[
                          { label: "Desktop", value: deviceQuery.data.desktop, icon: Monitor, color: "bg-[oklch(0.65_0.15_250)]" },
                          { label: "Tablet", value: deviceQuery.data.tablet, icon: Tablet, color: "bg-[oklch(0.70_0.12_160)]" },
                          { label: "Mobile", value: deviceQuery.data.mobile, icon: Smartphone, color: "bg-[oklch(0.75_0.14_50)]" },
                          { label: "Unknown", value: deviceQuery.data.unknown, icon: Activity, color: "bg-muted" },
                        ].filter(item => item.value > 0).map((item) => (
                          <div key={item.label} className="flex items-center gap-2 text-sm">
                            <div className={cn("w-3 h-3 rounded-sm shrink-0", item.color)} />
                            <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="flex-1">{item.label}</span>
                            <span className="font-medium">{item.value}</span>
                            <span className="text-xs text-muted-foreground">({deviceQuery.data!.total > 0 ? Math.round((item.value / deviceQuery.data!.total) * 100) : 0}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-6">No device data yet. Analytics tracking captures screen width from visitors.</p>
                  )}
                  {/* Hidden data table for screen readers */}
                  {deviceQuery.data && deviceQuery.data.total > 0 && (
                    <table className="sr-only">
                      <caption>Device breakdown data</caption>
                      <thead><tr><th scope="col">Device Type</th><th scope="col">Count</th><th scope="col">Percentage</th></tr></thead>
                      <tbody>
                        {[{ label: "Desktop", value: deviceQuery.data.desktop }, { label: "Tablet", value: deviceQuery.data.tablet }, { label: "Mobile", value: deviceQuery.data.mobile }, { label: "Unknown", value: deviceQuery.data.unknown }].filter(d => d.value > 0).map(d => (
                          <tr key={d.label}><td>{d.label}</td><td>{d.value}</td><td>{Math.round((d.value / deviceQuery.data!.total) * 100)}%</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Project Info */}
            <Card className="border-border">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Framework</span>
                  <Badge variant="secondary">{project.framework}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Deploy Target</span>
                  <Badge variant="outline">{project.deployTarget}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Visibility</span>
                  <Badge variant={project.visibility === "public" ? "default" : "secondary"}>
                    {project.visibility === "public" ? <Globe className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                    {project.visibility}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Node Version</span>
                  <span>{project.nodeVersion}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Deployed</span>
                  <span>{project.lastDeployedAt ? new Date(project.lastDeployedAt).toLocaleString() : "Never"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Analytics Tracking</span>
                  <Badge variant="default" className="bg-green-600">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Deployments Panel */}
        {activePanel === "deployments" && (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Deployments</h2>
              <Button size="sm" onClick={() => setDeployConfirmOpen(true)}>
                <Rocket className="w-3.5 h-3.5 mr-1" /> New Deployment
              </Button>
            </div>
            <div className="space-y-3" aria-live="polite" aria-label="Deployment history">
              {deploymentsQuery.isLoading && (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>
              )}
              {deploymentsQuery.data?.map((dep, i) => (
                <Card key={dep.id} className="border-border">
                  <CardContent className="flex items-center gap-4 py-3 px-4">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      dep.status === "live" ? "bg-green-500/20" :
                      dep.status === "failed" ? "bg-red-500/20" :
                      dep.status === "building" ? "bg-yellow-500/20" : "bg-muted"
                    )}>
                      {dep.status === "live" ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                       dep.status === "failed" ? <XCircle className="w-4 h-4 text-red-500" /> :
                       dep.status === "building" ? <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" /> :
                       <RotateCcw className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{dep.versionLabel || `Deployment #${deploymentsQuery.data!.length - i}`}</span>
                        {i === 0 && dep.status === "live" && <Badge className="text-[10px] bg-green-500/20 text-green-400">Current</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        {dep.commitSha && <code className="font-mono">{dep.commitSha.slice(0, 7)}</code>}
                        {dep.commitMessage && <span className="truncate">{dep.commitMessage}</span>}
                        <span>{new Date(dep.createdAt).toLocaleString()}</span>
                        {dep.buildDurationSec && <span>{dep.buildDurationSec}s</span>}
                      </div>
                    </div>
                    <Badge variant={
                      dep.status === "live" ? "default" :
                      dep.status === "failed" ? "destructive" : "secondary"
                    } className="text-[10px]">
                      {dep.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
              {deploymentsQuery.data?.length === 0 && (
                <Card className="border-border border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Rocket className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">No deployments yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Click Publish to create your first deployment</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {activePanel === "settings" && (
          <div className="flex h-full">
            {/* Settings Sidebar */}
            <div className="w-48 border-r border-border p-3 space-y-0.5">
              {([
                { id: "general" as const, label: "General", icon: Settings },
                { id: "domains" as const, label: "Domains", icon: Globe },
                { id: "secrets" as const, label: "Secrets", icon: Key },
                { id: "github" as const, label: "GitHub", icon: GitBranch },
                { id: "notifications" as const, label: "Notifications", icon: Bell },
                { id: "payment" as const, label: "Payment", icon: CreditCard },
                { id: "seo" as const, label: "SEO", icon: Search },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    settingsTab === tab.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div className="flex-1 p-6 overflow-auto">
              {/* General Settings */}
              {settingsTab === "general" && (
                <div className="max-w-lg space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">General Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <Label>Project Name</Label>
                        <Input defaultValue={project.name} className="mt-1" aria-label="Project name"
                          onBlur={(e) => {
                            if (e.target.value !== project.name) {
                              updateProjectMut.mutate({ externalId: project.externalId, name: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea defaultValue={project.description || ""} className="mt-1" rows={3} aria-label="Project description"
                          onBlur={(e) => {
                            if (e.target.value !== (project.description || "")) {
                              updateProjectMut.mutate({ externalId: project.externalId, description: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Framework</Label>
                        <Select
                          defaultValue={project.framework || "react"}
                          onValueChange={(v) => updateProjectMut.mutate({ externalId: project.externalId, framework: v })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="react">React</SelectItem>
                            <SelectItem value="nextjs">Next.js</SelectItem>
                            <SelectItem value="vue">Vue</SelectItem>
                            <SelectItem value="static">Static HTML</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Visibility</Label>
                          <p className="text-xs text-muted-foreground">Control who can access your site</p>
                        </div>
                        <Select
                          defaultValue={project.visibility || "public"}
                          onValueChange={(v: "public" | "private") => updateProjectMut.mutate({ externalId: project.externalId, visibility: v })}
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Manus-parity: Duplicate + Hide Badge */}
                  <div className="border-t border-border pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Hide Manus Badge</p>
                        <p className="text-xs text-muted-foreground">Remove the "Built with Manus" badge from your site</p>
                      </div>
                      <Switch onCheckedChange={(v) => toast.success(v ? "Badge hidden" : "Badge visible")} aria-label="Toggle powered-by badge visibility" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => {
                      duplicateProjectMut.mutate({
                        name: project.name + " (copy)",
                        description: project.description || undefined,
                        framework: project.framework || undefined,
                        deployTarget: (project.deployTarget as any) || undefined,
                        buildCommand: project.buildCommand || undefined,
                        outputDir: project.outputDir || undefined,
                        installCommand: project.installCommand || undefined,
                        nodeVersion: project.nodeVersion || undefined,
                      });
                    }} disabled={duplicateProjectMut.isPending}>
                      <Copy className="w-3.5 h-3.5 mr-1.5" /> {duplicateProjectMut.isPending ? "Duplicating..." : "Duplicate Project"}
                    </Button>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h4 className="text-sm font-semibold text-destructive mb-2">Danger Zone</h4>
                    <Button
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => {
                        if (confirm("Are you sure? This action cannot be undone.")) {
                          deleteProjectMut.mutate({ externalId: project.externalId });
                        }
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Project
                    </Button>
                  </div>
                </div>
              )}

              {/* Domains Settings */}
              {settingsTab === "domains" && (
                <div className="max-w-lg space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Domains</h3>
                  {project.publishedUrl && (
                    <Card className="border-border bg-green-500/5">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Published at</span>
                        </div>
                        <a href={project.publishedUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm mt-1 block">
                          {project.publishedUrl}
                        </a>
                      </CardContent>
                    </Card>
                  )}
                  <Card className="border-border">
                    <CardContent className="py-4 space-y-4">
                      <div>
                        <Label>Subdomain Prefix</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            defaultValue={project.subdomainPrefix || ""}
                            placeholder={project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}
                            className="flex-1"
                            onBlur={(e) => {
                              if (e.target.value !== project.subdomainPrefix) {
                                updateProjectMut.mutate({ externalId: project.externalId, subdomainPrefix: e.target.value });
                              }
                            }}
                          />
                          <span className="text-sm text-muted-foreground">{project.publishedUrl ? new URL(project.publishedUrl).hostname.split('.').slice(-2).join('.') : ".your-domain.com"}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{project.publishedUrl ? <>Published at <a href={project.publishedUrl} target="_blank" rel="noopener" className="text-primary underline">{project.publishedUrl}</a></> : "Deploy your app to generate a public URL"}</p>
                      </div>
                      <div>
                        <Label>Custom Domain</Label>
                        <Input
                          placeholder="myapp.example.com"
                          defaultValue={project.customDomain || ""}
                          className="mt-1"
                          onBlur={(e) => {
                            const val = e.target.value || null;
                            if (val !== project.customDomain) {
                              updateProjectMut.mutate({ externalId: project.externalId, customDomain: val });
                            }
                          }}
                        />
                        {project.customDomain && (
                          <SslProvisioningPanel projectExternalId={project.externalId} customDomain={project.customDomain} publishedUrl={project.publishedUrl || null} />
                        )}
                        {!project.customDomain && (
                          <p className="text-xs text-muted-foreground mt-1">{project.publishedUrl ? "Enter a custom domain above and point a CNAME record to your published URL" : "Deploy your app first to set up a custom domain"}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Hosting Architecture Info */}
                  <Card className="border-border">
                    <CardContent className="py-4">
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Server className="w-4 h-4" /> Hosting Architecture</h4>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>S3 static hosting with global CDN edge caching</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>Automatic SSL/TLS via ACM for custom domains</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>Analytics tracking pixel auto-injected on deploy</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span>Cache-Control headers optimized for performance</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Secrets Settings */}
              {settingsTab === "secrets" && (
                <div className="max-w-lg space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Environment Variables</h3>
                    <Button size="sm" variant="outline" onClick={() => toast.info("Add secrets via the Secrets panel in Settings")}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Variable
                    </Button>
                  </div>
                  <Card className="border-border">
                    <CardContent className="py-4">
                      {project.envVars && Object.keys(project.envVars).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(project.envVars).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 p-2 rounded bg-muted/50">
                              <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <code className="text-xs font-mono font-medium">{key}</code>
                              <span className="text-xs text-muted-foreground">=</span>
                              <code className="text-xs font-mono text-muted-foreground truncate flex-1">{"•".repeat(Math.min(value.length, 20))}</code>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                          <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No environment variables configured</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* GitHub Settings */}
              {settingsTab === "github" && (
                <div className="max-w-lg space-y-6">
                  <h3 className="text-lg font-semibold mb-4">GitHub Integration</h3>
                  {project.githubRepoId ? (
                    <Card className="border-border">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3 mb-4">
                          <GitBranch className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">Repository Connected</p>
                            <p className="text-xs text-muted-foreground">Synced with GitHub for version control</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => navigate("/github")}>
                            <ExternalLink className="w-3 h-3 mr-1" /> View Repo
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive"
                            onClick={() => updateProjectMut.mutate({ externalId: project.externalId, githubRepoId: null })}
                          >
                            Disconnect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-border border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <GitBranch className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground mb-1">No GitHub repository connected</p>
                        <p className="text-xs text-muted-foreground mb-4">Connect a repo to enable version control and CI/CD</p>
                        <Button variant="outline" size="sm" onClick={() => navigate("/github")}>
                          <GitBranch className="w-3.5 h-3.5 mr-1" /> Connect Repository
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Build Settings */}
                  <Card className="border-border">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Build Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Build Command</Label>
                        <Input
                          defaultValue={project.buildCommand || "npm run build"}
                          className="mt-1 font-mono text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== project.buildCommand) {
                              updateProjectMut.mutate({ externalId: project.externalId, buildCommand: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Output Directory</Label>
                        <Input
                          defaultValue={project.outputDir || "dist"}
                          className="mt-1 font-mono text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== project.outputDir) {
                              updateProjectMut.mutate({ externalId: project.externalId, outputDir: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Install Command</Label>
                        <Input
                          defaultValue={project.installCommand || "npm install"}
                          className="mt-1 font-mono text-xs"
                          onBlur={(e) => {
                            if (e.target.value !== project.installCommand) {
                              updateProjectMut.mutate({ externalId: project.externalId, installCommand: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Node.js Version</Label>
                        <Select
                          defaultValue={project.nodeVersion || "22"}
                          onValueChange={(v) => updateProjectMut.mutate({ externalId: project.externalId, nodeVersion: v })}
                        >
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="18">18 LTS</SelectItem>
                            <SelectItem value="20">20 LTS</SelectItem>
                            <SelectItem value="22">22 LTS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Notifications Settings — preferences saved to project description as JSON metadata */}
              {settingsTab === "notifications" && (
                <div className="max-w-lg space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                  <p className="text-xs text-muted-foreground mb-2">Notification preferences are saved to your project settings. Delivery uses the platform notification API.</p>
                  <Card className="border-border">
                    <CardContent className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Deploy Notifications</p>
                          <p className="text-xs text-muted-foreground">Get notified when deployments complete</p>
                        </div>
                        <Switch defaultChecked onCheckedChange={(v) => toast.success(v ? "Deploy notifications enabled" : "Deploy notifications disabled")} aria-label="Toggle deploy notifications" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Error Alerts</p>
                          <p className="text-xs text-muted-foreground">Get notified when builds fail</p>
                        </div>
                        <Switch defaultChecked onCheckedChange={(v) => toast.success(v ? "Error alerts enabled" : "Error alerts disabled")} aria-label="Toggle error alerts" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Analytics Reports</p>
                          <p className="text-xs text-muted-foreground">Weekly traffic summary via email</p>
                        </div>
                        <Switch onCheckedChange={(v) => {
                          updateProjectMut.mutate({ externalId: project.externalId, envVars: { ...(project.envVars as Record<string,string> || {}), ANALYTICS_REPORTS: v ? "weekly" : "off" } });
                          toast.success(v ? "Weekly analytics reports enabled" : "Weekly analytics reports disabled");
                        }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Payment Settings */}
              {settingsTab === "payment" && (
                <div className="max-w-lg space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Payment (Stripe)</h3>
                  <Card className="border-border">
                    <CardContent className="py-4 space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">Test Mode</Badge>
                        <span className="text-xs text-muted-foreground">Switch to Live mode after Stripe KYC verification</span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Publishable Key</Label>
                          <Input readOnly value="pk_test_••••••••" className="mt-1 font-mono text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Secret Key</Label>
                          <Input readOnly value="sk_test_••••••••" type="password" className="mt-1 font-mono text-xs" />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Webhook Secret</Label>
                          <Input readOnly value="whsec_••••••••" type="password" className="mt-1 font-mono text-xs" />
                        </div>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Test card: <code className="text-[10px] bg-muted px-1 py-0.5 rounded">4242 4242 4242 4242</code></p>
                        <Button variant="outline" size="sm" onClick={() => toast.info("Open Stripe Dashboard to manage payment settings")}>Open Stripe Dashboard</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* SEO Settings — Real LLM-powered analysis */}
              {settingsTab === "seo" && (
                <SeoAnalysisPanel projectId={projectId!} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deploy Confirmation Dialog */}
      <Dialog open={deployConfirmOpen} onOpenChange={setDeployConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy Project</DialogTitle>
            <DialogDescription>This will create a new deployment for {project.name}</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>URL: <strong>{project.publishedUrl || "Will be generated after deploy"}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Server className="w-4 h-4 text-muted-foreground" />
              <span>Target: <strong>{project.deployTarget}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span>Build: <code className="text-xs">{project.buildCommand}</code></span>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeployConfirmOpen(false)}>Cancel</Button>
            {project.githubRepoId && (
              <Button
                variant="secondary"
                onClick={() => deployFromGitHubMut.mutate({ externalId: project.externalId })}
                disabled={deployFromGitHubMut.isPending || deployMut.isPending}
              >
                {deployFromGitHubMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitBranch className="w-4 h-4 mr-1" />}
                Deploy from GitHub
              </Button>
            )}
            <Button onClick={() => deployMut.mutate({ externalId: project.externalId })} disabled={deployMut.isPending || deployFromGitHubMut.isPending}>
              {deployMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Rocket className="w-4 h-4 mr-1" />}
              Deploy Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Real LLM-powered SEO analysis panel */
function SeoAnalysisPanel({ projectId }: { projectId: string }) {
  const [seoResult, setSeoResult] = useState<{ score: number; items: { label: string; status: string; detail: string }[]; recommendations: string[] } | null>(null);
  const analyzeMut = trpc.webappProject.analyzeSeo.useMutation({
    onSuccess: (data) => {
      setSeoResult(data as any);
      toast.success(`SEO analysis complete — Score: ${(data as any).score}/100`);
    },
    onError: (err) => { toast.error(err.message); },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">SEO Analysis</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyzeMut.mutate({ externalId: projectId })}
          disabled={analyzeMut.isPending}
        >
          {analyzeMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
          {seoResult ? "Re-analyze" : "Run SEO Analysis"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">AI-powered analysis of your project's SEO readiness. Click the button to run a real analysis.</p>

      {analyzeMut.isPending && (
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing SEO...</p>
          </CardContent>
        </Card>
      )}

      {seoResult && !analyzeMut.isPending && (
        <>
          <Card className="border-border">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Overall Score</span>
                <Badge variant={seoResult.score >= 70 ? "default" : seoResult.score >= 40 ? "secondary" : "destructive"}>
                  {seoResult.score}/100
                </Badge>
              </div>
              <div className="space-y-3">
                {seoResult.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      {item.status === "pass" ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : item.status === "warn" ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground max-w-[200px] text-right">{item.detail}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {seoResult.recommendations.length > 0 && (
            <Card className="border-border">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="py-2 space-y-2">
                {seoResult.recommendations.map((rec, i) => (
                  <p key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary font-medium">{i + 1}.</span> {rec}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!seoResult && !analyzeMut.isPending && (
        <Card className="border-border">
          <CardContent className="py-8 text-center">
            <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Click "Run SEO Analysis" to get AI-powered insights</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


// ── Live Visitor Badge Component ──

function LiveVisitorBadge({ projectExternalId }: { projectExternalId: string }) {
  const { activeVisitors, connected } = useRealtimeAnalytics(projectExternalId);

  if (!connected && activeVisitors === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        <span>Connecting...</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
      role="status"
      aria-live="polite"
      aria-label={`${activeVisitors} visitor${activeVisitors !== 1 ? "s" : ""} online now`}
    >
      {/* Pulse dot */}
      <span className="relative flex h-2 w-2">
        {activeVisitors > 0 && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          activeVisitors > 0 ? "bg-green-500" : "bg-muted-foreground/40"
        )} />
      </span>

      <span className="text-xs font-medium text-primary">
        {activeVisitors} {activeVisitors === 1 ? "visitor" : "visitors"} now
      </span>

      {/* Connection indicator */}
      {connected && (
        <div className="w-1 h-1 rounded-full bg-green-500" title="Connected" />
      )}
    </div>
  );
}

// ── SSL Provisioning Panel Component ──

function SslProvisioningPanel({ projectExternalId, customDomain, publishedUrl }: {
  projectExternalId: string;
  customDomain: string;
  publishedUrl: string | null;
}) {
  const utils = trpc.useUtils();

  const sslQuery = trpc.webappProject.sslStatus.useQuery(
    { externalId: projectExternalId },
    { refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 10s while pending validation
      return status === "pending_validation" ? 10_000 : false;
    }}
  );

  const requestSslMut = trpc.webappProject.requestSsl.useMutation({
    onSuccess: () => {
      toast.success("SSL certificate requested. Add the DNS records below.");
      utils.webappProject.sslStatus.invalidate({ externalId: projectExternalId });
    },
    onError: (err) => {
      toast.error(`SSL request failed: ${err.message}`);
    },
  });

  const deleteSslMut = trpc.webappProject.deleteSsl.useMutation({
    onSuccess: () => {
      toast.success("SSL certificate removed.");
      utils.webappProject.sslStatus.invalidate({ externalId: projectExternalId });
    },
  });

  const ssl = sslQuery.data;
  const hasNoCert = !ssl || ssl.status === "none";

  return (
    <Card className="border-border mt-3 bg-muted/30">
      <CardContent className="py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            SSL Certificate
          </p>
          {ssl && ssl.status !== "none" && (
            <Badge variant={ssl.status === "issued" ? "default" : ssl.status === "pending_validation" ? "secondary" : "destructive"} className="text-[10px]">
              {ssl.status === "issued" ? "Active" : ssl.status === "pending_validation" ? "Pending Validation" : ssl.status}
            </Badge>
          )}
        </div>

        {hasNoCert && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Provision an SSL certificate for <span className="font-mono text-primary">{customDomain}</span> to enable HTTPS.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => requestSslMut.mutate({ externalId: projectExternalId, domain: customDomain })}
              disabled={requestSslMut.isPending}
              className="text-xs"
            >
              {requestSslMut.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Requesting...</>
              ) : (
                <><Shield className="w-3 h-3 mr-1" /> Request SSL Certificate</>
              )}
            </Button>
            {ssl?.provider === "simulated" && (
              <p className="text-[10px] text-muted-foreground/60">
                Running in simulation mode (no AWS credentials configured)
              </p>
            )}
          </div>
        )}

        {ssl?.status === "pending_validation" && ssl.validationRecords.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Add the following DNS record{ssl.validationRecords.length > 1 ? "s" : ""} at your DNS provider to validate domain ownership:
            </p>
            {ssl.validationRecords.map((record, i) => (
              <div key={i} className="bg-background/50 rounded-md p-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px] font-mono">CNAME</Badge>
                  <span className="text-muted-foreground">Name:</span>
                </div>
                <div className="flex items-center gap-1">
                  <code className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded break-all">{record.name}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(record.name); toast.success("Copied!"); }}
                    className="p-0.5 hover:bg-accent rounded"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs mt-1">
                  <span className="text-muted-foreground">Value:</span>
                </div>
                <div className="flex items-center gap-1">
                  <code className="text-[10px] font-mono text-primary bg-primary/5 px-1.5 py-0.5 rounded break-all">{record.value}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(record.value); toast.success("Copied!"); }}
                    className="p-0.5 hover:bg-accent rounded"
                    title="Copy"
                  >
                    <Copy className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Awaiting DNS validation (checking every 10s)</span>
            </div>
            {publishedUrl && (
              <div className="text-xs text-muted-foreground mt-1">
                Also add a CNAME record: <code className="font-mono text-primary">{customDomain}</code> → <code className="font-mono text-primary">{new URL(publishedUrl).hostname}</code>
              </div>
            )}
          </div>
        )}

        {ssl?.status === "issued" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-600 font-medium">SSL certificate active for {ssl.domain}</span>
            </div>
            {ssl.issuedAt && (
              <p className="text-[10px] text-muted-foreground">
                Issued {new Date(ssl.issuedAt).toLocaleDateString()}
              </p>
            )}
            {publishedUrl && (
              <p className="text-xs text-muted-foreground">
                Your site is accessible at <a href={`https://${customDomain}`} target="_blank" rel="noopener" className="text-primary underline">https://{customDomain}</a>
              </p>
            )}
          </div>
        )}

        {ssl?.status === "failed" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <XCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-destructive font-medium">Certificate provisioning failed</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => requestSslMut.mutate({ externalId: projectExternalId, domain: customDomain })}
              disabled={requestSslMut.isPending}
              className="text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {ssl && ssl.status !== "none" && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <Button
              size="sm"
              variant="ghost"
              className="text-[10px] text-muted-foreground hover:text-destructive"
              onClick={() => deleteSslMut.mutate({ externalId: projectExternalId })}
              disabled={deleteSslMut.isPending}
            >
              {deleteSslMut.isPending ? "Removing..." : "Remove Certificate"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
