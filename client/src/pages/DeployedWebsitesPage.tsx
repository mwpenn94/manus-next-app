import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe, ExternalLink, BarChart3, Clock, Database, FolderOpen, Search as SearchIcon,
  Loader2, Lock, Eye, Users, TrendingUp, Activity, RefreshCw, Settings, ArrowUpRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

export default function DeployedWebsitesPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"overview" | "analytics" | "database" | "storage" | "seo">("overview");

  const webappProjects = trpc.webappProject.list.useQuery(undefined, { enabled: isAuthenticated });

  const projects = useMemo(() => webappProjects.data || [], [webappProjects.data]);
  const deployedProjects = useMemo(() => projects.filter((p: any) => p.deployStatus === "deployed"), [projects]);
  const totalViews = useMemo(() => deployedProjects.reduce((sum: number, p: any) => sum + (p.totalPageViews || 0), 0), [deployedProjects]);
  const totalVisitors = useMemo(() => deployedProjects.reduce((sum: number, p: any) => sum + (p.totalUniqueVisitors || 0), 0), [deployedProjects]);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-sm text-center">
          <CardContent className="py-12">
            <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Sign in to view deployed websites.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-semibold text-foreground">Deployed Websites</h1>
          <Badge variant="secondary" className="ml-auto">{deployedProjects.length} live</Badge>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-xs">Total Sites</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{deployedProjects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs">Page Views</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{totalViews.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Unique Visitors</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{totalVisitors.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-xs">All Projects</span>
              </div>
              <p className="text-2xl font-semibold text-foreground">{projects.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4">
            {webappProjects.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Globe className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No web projects yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a project in the App Builder to get started.</p>
                  <Button variant="outline" className="mt-4" onClick={() => navigate("/webapp-builder")}>
                    Go to App Builder
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {projects.map((project: any) => (
                  <Card key={project.id} className={`hover:border-primary/30 transition-colors cursor-pointer ${project.deployStatus === "deployed" ? "border-green-500/20" : ""}`}
                    onClick={() => navigate(`/projects/webapp/${project.externalId}`)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${project.deployStatus === "deployed" ? "bg-green-500/10" : "bg-muted"}`}>
                            <Globe className={`w-5 h-5 ${project.deployStatus === "deployed" ? "text-green-500" : "text-muted-foreground"}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{project.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {project.publishedUrl || "Not deployed"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden md:block">
                            <p className="text-xs text-muted-foreground">{(project.totalPageViews || 0).toLocaleString()} views</p>
                            <p className="text-xs text-muted-foreground">{(project.totalUniqueVisitors || 0).toLocaleString()} visitors</p>
                          </div>
                          <Badge variant={project.deployStatus === "deployed" ? "default" : "secondary"} className="text-xs">
                            {project.deployStatus === "deployed" ? "Live" : project.deployStatus || "Draft"}
                          </Badge>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Traffic Overview
                </CardTitle>
                <CardDescription>Aggregate analytics across all deployed websites.</CardDescription>
              </CardHeader>
              <CardContent>
                {deployedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Deploy a website to see analytics.</p>
                ) : (
                  <div className="space-y-4">
                    {deployedProjects.map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                        <div className="flex items-center gap-3">
                          <Globe className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{project.name}</p>
                            <p className="text-xs text-muted-foreground">{project.publishedUrl || "Not deployed"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-sm font-medium text-foreground">{(project.totalPageViews || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Views</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{(project.totalUniqueVisitors || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Visitors</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/projects/webapp/${project.externalId}`); }}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database */}
          <TabsContent value="database" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> Database Viewer
                </CardTitle>
                <CardDescription>View and manage databases for your deployed projects.</CardDescription>
              </CardHeader>
              <CardContent>
                {deployedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No deployed projects with databases.</p>
                ) : (
                  <div className="space-y-3">
                    {deployedProjects.map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                        <div className="flex items-center gap-3">
                          <Database className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{project.name}</p>
                            <p className="text-xs text-muted-foreground">MySQL / TiDB</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/projects/webapp/${project.externalId}`)}>
                          <Settings className="w-3.5 h-3.5 mr-1" /> Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage */}
          <TabsContent value="storage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" /> File Storage
                </CardTitle>
                <CardDescription>Manage uploaded files and assets for your projects.</CardDescription>
              </CardHeader>
              <CardContent>
                {deployedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No deployed projects with file storage.</p>
                ) : (
                  <div className="space-y-3">
                    {deployedProjects.map((project: any) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/30 border border-border">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="w-4 h-4 text-primary" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{project.name}</p>
                            <p className="text-xs text-muted-foreground">S3 Object Storage</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/projects/webapp/${project.externalId}`)}>
                          <FolderOpen className="w-3.5 h-3.5 mr-1" /> Browse
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <SearchIcon className="w-4 h-4 text-primary" /> SEO Settings
                </CardTitle>
                <CardDescription>Optimize your deployed websites for search engines.</CardDescription>
              </CardHeader>
              <CardContent>
                {deployedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Deploy a website to configure SEO.</p>
                ) : (
                  <div className="space-y-3">
                    {deployedProjects.map((project: any) => (
                      <div key={project.id} className="p-4 rounded-lg bg-accent/30 border border-border">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-primary" />
                            <p className="text-sm font-medium text-foreground">{project.name}</p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/projects/webapp/${project.externalId}`)}>
                            <Settings className="w-3.5 h-3.5 mr-1" /> Configure
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-muted-foreground">Title</p>
                            <p className="text-foreground font-medium">{project.name}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">URL</p>
                            <p className="text-foreground font-medium truncate">{project.publishedUrl || "Not deployed"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Framework</p>
                            <p className="text-foreground font-medium">{project.framework || "Static"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Visibility</p>
                            <p className="text-foreground font-medium capitalize">{project.visibility || "Public"}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
