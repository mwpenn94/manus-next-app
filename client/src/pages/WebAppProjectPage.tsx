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
  ChevronRight, MoreHorizontal, Copy, RotateCcw
} from "lucide-react";
import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ManagementPanel = "preview" | "code" | "dashboard" | "settings" | "deployments";
type SettingsTab = "general" | "domains" | "secrets" | "github" | "notifications";

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

  // Mutations
  const updateProjectMut = trpc.webappProject.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated");
      projectQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deployMut = trpc.webappProject.deploy.useMutation({
    onSuccess: () => {
      toast.success("Deployment started");
      projectQuery.refetch();
      deploymentsQuery.refetch();
      setDeployConfirmOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteProjectMut = trpc.webappProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      navigate("/webapp-builder");
    },
    onError: (err) => toast.error(err.message),
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/webapp-builder")}>
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
                {project.publishedUrl || `${project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.sovereign.app`}
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
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5 mr-1" /> Download ZIP
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

            {/* Clone command */}
            <Card className="border-border mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Clone Command</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted rounded px-3 py-2 text-xs font-mono text-muted-foreground">
                    git clone https://github.com/{project.name}.git
                  </code>
                  <Button variant="ghost" size="sm" onClick={() => {
                    navigator.clipboard.writeText(`git clone https://github.com/${project.name}.git`);
                    toast.success("Copied to clipboard");
                  }}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Panel */}
        {activePanel === "dashboard" && (
          <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold mb-6">Dashboard</h2>

            {/* Status Cards */}
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
                    <span className="text-xs text-muted-foreground">Page Views</span>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-lg font-semibold">{project.totalPageViews?.toLocaleString() || 0}</span>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Unique Visitors</span>
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-lg font-semibold">{project.totalUniqueVisitors?.toLocaleString() || 0}</span>
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
                        <Input defaultValue={project.name} className="mt-1"
                          onBlur={(e) => {
                            if (e.target.value !== project.name) {
                              updateProjectMut.mutate({ externalId: project.externalId, name: e.target.value });
                            }
                          }}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea defaultValue={project.description || ""} className="mt-1" rows={3}
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
                          <span className="text-sm text-muted-foreground">.sovereign.app</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Your app will be available at <code>{project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.sovereign.app</code></p>
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
                        <p className="text-xs text-muted-foreground mt-1">Point a CNAME record to your .sovereign.app subdomain</p>
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

              {/* Notifications Settings */}
              {settingsTab === "notifications" && (
                <div className="max-w-lg space-y-6">
                  <h3 className="text-lg font-semibold mb-4">Notifications</h3>
                  <Card className="border-border">
                    <CardContent className="py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Deploy Notifications</p>
                          <p className="text-xs text-muted-foreground">Get notified when deployments complete</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Error Alerts</p>
                          <p className="text-xs text-muted-foreground">Get notified when builds fail</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Analytics Reports</p>
                          <p className="text-xs text-muted-foreground">Weekly traffic summary</p>
                        </div>
                        <Switch />
                      </div>
                    </CardContent>
                  </Card>
                </div>
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
              <span>URL: <strong>{project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-")}.sovereign.app</strong></span>
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
