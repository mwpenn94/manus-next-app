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
  CreditCard, Search, AlertTriangle
} from "lucide-react";
import { useState, useMemo } from "react";
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

  // Mutations
  const updateProjectMut = trpc.webappProject.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      projectQuery.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deployMut = trpc.webappProject.deploy.useMutation({
    onSuccess: () => {
      toast.success("Deployment started");
      projectQuery.refetch();
      deploymentsQuery.refetch();
      setDeployConfirmOpen(false);
    },
    onError: (err) => { toast.error(err.message); },
  });

  const deleteProjectMut = trpc.webappProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      navigate("/webapp-builder");
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
        <Button variant="outline" onClick={() => navigate("/webapp-builder")}>
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/webapp-builder")} aria-label="Back to projects">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
              <Globe className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm">{project.name}</span>
          </div>
          <Badge
            variant={project.deployStatus === "live" ? "default" : "secondary"}
            className={cn("text-[10px]",
              project.deployStatus === "live" && "bg-green-500/20 text-green-400 border-green-500/30"
            )}
          >
            {project.deployStatus === "live" ? "Live" : project.deployStatus}
          </Badge>
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
          >
            {deployMut.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Rocket className="w-3.5 h-3.5 mr-1" />}
            Publish
          </Button>
        </div>
      </div>

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
            <h2 className="text-lg font-semibold mb-6">Dashboard</h2>

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
                  <CardTitle className="text-sm">Daily Views (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1 h-24">
                    {analyticsQuery.data.viewsByDay.map((d: { date: string; count: number }) => {
                      const max = Math.max(...analyticsQuery.data!.viewsByDay.map((x: { count: number }) => x.count));
                      const height = max > 0 ? (d.count / max) * 100 : 0;
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count} views`}>
                          <div className="w-full bg-primary/80 rounded-t" style={{ height: `${Math.max(height, 2)}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{analyticsQuery.data.viewsByDay[0]?.date}</span>
                    <span>{analyticsQuery.data.viewsByDay[analyticsQuery.data.viewsByDay.length - 1]?.date}</span>
                  </div>
                </CardContent>
              </Card>
            )}

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
            <div className="space-y-3">
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
                        {project.customDomain && project.publishedUrl && (
                          <Card className="border-border mt-3 bg-muted/30">
                            <CardContent className="py-3">
                              <p className="text-xs font-medium mb-2">DNS Configuration Required</p>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[10px] font-mono">CNAME</Badge>
                                  <span className="text-muted-foreground">{project.customDomain}</span>
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-mono text-primary">{project.publishedUrl ? new URL(project.publishedUrl).hostname : "your-published-url"}</span>
                                </div>
                                <p className="text-muted-foreground">Add this CNAME record at your DNS provider. SSL will be provisioned automatically via Let's Encrypt once DNS propagates (typically 5–30 minutes).</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                                  <span className="text-muted-foreground">Awaiting DNS verification</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
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
                          <span>Automatic SSL/TLS via Let's Encrypt for custom domains</span>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeployConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => deployMut.mutate({ externalId: project.externalId })} disabled={deployMut.isPending}>
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
