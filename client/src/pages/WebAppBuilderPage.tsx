/**
 * WebAppBuilderPage — Full-stack web app creation, live preview, and publishing
 *
 * Capabilities #27-29:
 * - Prompt-to-app generation via agent → persisted to DB
 * - Live iframe preview with hot reload
 * - Real publishing pipeline (upload to S3 → public URL)
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Code, Eye, Rocket, ArrowLeft, Loader2, RefreshCw,
  ExternalLink, Copy, CheckCircle2, Globe, Paintbrush, History,
  Smartphone, Package, FolderKanban, Settings, GitBranch, Plus,
  BarChart3, Activity, Github, Search, Lock,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { toast } from "sonner";

type BuildStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
};

export default function WebAppBuilderPage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("builder");
  const [currentBuildId, setCurrentBuildId] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Real tRPC queries
  const buildsQuery = trpc.webapp.list.useQuery(undefined, { enabled: !!user });
  const projectsQuery = trpc.webappProject.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();

  // Create project mutation
  const createProjectMut = trpc.webappProject.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created");
      projectsQuery.refetch();
      navigate(`/projects/webapp/${data.externalId}`);
    },
    onError: (err) => { toast.error(err.message); },
  });

  // Real tRPC mutations
  const createBuild = trpc.webapp.create.useMutation({
    onError: (err) => { toast.error("Build creation failed: " + err.message); },
  });
  const updateBuild = trpc.webapp.update.useMutation({
    onSuccess: () => { utils.webapp.list.invalidate(); },
    onError: (err) => { toast.error("Build update failed: " + err.message); },
  });
  const publishBuild = trpc.webapp.publish.useMutation({
    onSuccess: (data) => {
      utils.webapp.list.invalidate();
      toast.success("Published! Your app is live.");
      setPublishedUrl(data.url);
    },
    onError: (err) => { toast.error("Publish failed: " + err.message); },
  });

  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const buildApp = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Describe the web app you want to build");
      return;
    }

    setIsBuilding(true);
    setPublishedUrl(null);
    setBuildSteps([
      { id: "save", label: "Saving to database", status: "running" },
      { id: "plan", label: "Planning architecture", status: "pending" },
      { id: "generate", label: "Generating code", status: "pending" },
      { id: "preview", label: "Building preview", status: "pending" },
    ]);

    try {
      // Step 1: Persist build to DB
      const build = await createBuild.mutateAsync({ prompt: prompt.trim(), title: appName || "My App" });
      setCurrentBuildId(build.id);
      setBuildSteps((prev) =>
        prev.map((s) =>
          s.id === "save" ? { ...s, status: "done" } : s.id === "plan" ? { ...s, status: "running" } : s
        )
      );

      // Step 2: Use agent to generate the app
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Build a complete single-page web application based on this description: "${prompt}". 
App name: ${appName || "My App"}
Requirements:
1. Generate a complete, self-contained HTML file with embedded CSS and JavaScript
2. Use modern design with Tailwind CSS (via CDN)
3. Make it fully responsive and interactive
4. Include all necessary functionality described
5. Return the complete HTML code wrapped in \`\`\`html code fences
Generate the complete HTML code now.`,
          mode: "quality",
        }),
      });

      if (!response.ok) throw new Error("Build failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullContent = "";

      setBuildSteps((prev) =>
        prev.map((s) =>
          s.id === "plan" ? { ...s, status: "done" } : s.id === "generate" ? { ...s, status: "running" } : s
        )
      );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.delta) fullContent += data.delta;
            } catch { /* skip */ }
          }
        }
      }

      // Extract HTML from response
      const htmlMatch = fullContent.match(/```html\n([\s\S]*?)```/);
      const html = htmlMatch ? htmlMatch[1] : fullContent;

      setGeneratedCode(html);
      setPreviewHtml(html);

      // Step 3: Persist generated code back to DB
      await updateBuild.mutateAsync({
        id: build.id,
        generatedHtml: html,
        sourceCode: html,
        status: "ready",
      });

      setBuildSteps((prev) => prev.map((s) => ({ ...s, status: "done" })));
      setActiveTab("preview");
      toast.success("Web app generated and saved!");
    } catch (err: any) {
      toast.error("Build failed: " + err.message);
      setBuildSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s))
      );
      if (currentBuildId) {
        updateBuild.mutate({ id: currentBuildId, status: "error" });
      }
    } finally {
      setIsBuilding(false);
    }
  }, [prompt, appName, createBuild, updateBuild, currentBuildId]);

  const handlePublish = useCallback(() => {
    if (!currentBuildId) {
      toast.error("No build to publish");
      return;
    }
    publishBuild.mutate({ id: currentBuildId });
  }, [currentBuildId, publishBuild]);

  const loadBuild = useCallback((build: any) => {
    setCurrentBuildId(build.id);
    setPrompt(build.prompt);
    setAppName(build.title ?? "");
    if (build.generatedHtml) {
      setGeneratedCode(build.generatedHtml);
      setPreviewHtml(build.generatedHtml);
      setActiveTab("preview");
    }
    if (build.publishedUrl) {
      setPublishedUrl(build.publishedUrl);
    }
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard");
  }, [generatedCode]);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Code className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Web App Builder</h2>
            <p className="text-muted-foreground mb-4">Sign in to build web applications.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const builds = buildsQuery.data ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Go back to home">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Web App Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              Describe your app and let AI build it for you
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/mobile-projects")}>
              <Smartphone className="w-4 h-4 mr-1.5" />
              Mobile
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/app-publish")}>
              <Package className="w-4 h-4 mr-1.5" />
              Publish
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="builder">
              <Code className="w-4 h-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewHtml}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" disabled={!generatedCode}>
              <Paintbrush className="w-4 h-4 mr-2" />
              Code
            </TabsTrigger>
            <TabsTrigger value="publish" disabled={!generatedCode}>
              <Rocket className="w-4 h-4 mr-2" />
              Publish
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History ({builds.length})
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="w-4 h-4 mr-2" />
              Projects ({projectsQuery.data?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Describe Your App</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Input
                      placeholder="App name (e.g., Task Manager)"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      className="mb-4"
                      aria-label="App name"
                    />
                    <Textarea
                      placeholder="Describe what your web app should do. Be specific about features, layout, and functionality..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={8}
                      className="mb-4"
                      aria-label="App description prompt"
                    />
                    <Button onClick={buildApp} disabled={isBuilding || !prompt.trim()} className="w-full" aria-busy={isBuilding}>
                      {isBuilding ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Rocket className="w-4 h-4 mr-2" />
                      )}
                      {isBuilding ? "Building..." : "Build App"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Build Steps */}
              <div>
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-base">Build Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {buildSteps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Describe your app and click Build to start
                      </p>
                    ) : (
                      <div className="space-y-3" aria-live="polite" aria-atomic="false" aria-label="Build progress steps" role="list">
                        {buildSteps.map((step) => (
                          <div key={step.id} className="flex items-center gap-3" role="listitem" aria-label={`${step.label}: ${step.status}`}>
                            {step.status === "running" ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                            ) : step.status === "done" ? (
                              <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : step.status === "error" ? (
                              <div className="w-4 h-4 rounded-full bg-red-500/20 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                            )}
                            <span className={`text-sm ${step.status === "done" ? "text-foreground" : step.status === "running" ? "text-primary" : "text-muted-foreground"}`}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Live Preview</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => iframeRef.current?.contentWindow?.location.reload()} aria-label="Refresh preview">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      const blob = new Blob([previewHtml], { type: "text/html" });
                      window.open(URL.createObjectURL(blob), "_blank");
                    }}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg overflow-hidden bg-white" style={{ height: "600px" }}>
                  <iframe
                    ref={iframeRef}
                    srcDoc={previewHtml}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin"
                    title="App Preview"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Generated Code</CardTitle>
                  <Button variant="outline" size="sm" onClick={copyCode} aria-label="Copy generated code to clipboard">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px] text-xs font-mono text-foreground" role="status" aria-live="polite" aria-label="Generated source code">
                  {generatedCode}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="publish" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Publish Your App</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Globe className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                  {publishedUrl ? (
                    <>
                      <h3 className="text-lg font-semibold mb-2 text-muted-foreground">Published!</h3>
                      <p className="text-muted-foreground mb-4">Your app is live at:</p>
                      <a
                        href={publishedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline break-all"
                      >
                        {publishedUrl}
                      </a>
                      <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(publishedUrl);
                          toast.success("URL copied!");
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy URL
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-2">Ready to Go Live</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Your app has been generated and saved. Publish it to get a public URL.
                      </p>
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          Code generated and previewed
                        </div>
                        <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          Saved to database
                        </div>
                      </div>
                      <Button
                        onClick={handlePublish}
                        disabled={publishBuild.isPending || !currentBuildId}
                        size="lg"
                      >
                        {publishBuild.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Rocket className="w-4 h-4 mr-2" />
                        )}
                        {publishBuild.isPending ? "Publishing..." : "Publish to S3"}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Managed Projects</h3>
              <div className="flex items-center gap-2">
                <ImportFromGitHubButton
                  onImport={(repoId, repoName) => {
                    createProjectMut.mutate({ name: repoName, framework: "react", githubRepoId: repoId });
                  }}
                  isPending={createProjectMut.isPending}
                />
                <Button size="sm" onClick={() => {
                  createProjectMut.mutate({ name: appName || "New Project", framework: "react" });
                }} disabled={createProjectMut.isPending}>
                  {createProjectMut.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                  New Project
                </Button>
              </div>
            </div>
            {projectsQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : !projectsQuery.data?.length ? (
              <Card className="border-border border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderKanban className="w-12 h-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No projects yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create a project to manage deployments, domains, and settings</p>
                  <Button onClick={() => createProjectMut.mutate({ name: "My App", framework: "react" })} disabled={createProjectMut.isPending}>
                    <Plus className="w-4 h-4 mr-1" /> Create First Project
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projectsQuery.data.map((project: any) => (
                  <Card
                    key={project.id}
                    className="border-border hover:border-primary/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/projects/webapp/${project.externalId}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Globe className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-semibold group-hover:text-primary truncate">{project.name}</span>
                        </div>
                        <Badge variant={project.deployStatus === "live" ? "default" : "secondary"} className="text-[10px] shrink-0">
                          {project.deployStatus}
                        </Badge>
                      </div>
                      {project.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{project.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Code className="w-3 h-3" />{project.framework}</span>
                        <span className="flex items-center gap-1"><Rocket className="w-3 h-3" />{project.deployTarget}</span>
                        {project.githubRepoId && <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />Connected</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Build History</CardTitle>
              </CardHeader>
              <CardContent>
                {buildsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : builds.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No builds yet. Create your first app above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {builds.map((build: any) => (
                      <div
                        key={build.id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/30 ${currentBuildId === build.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}
                        onClick={() => loadBuild(build)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{build.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{build.prompt?.slice(0, 80)}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <Badge variant={build.status === "published" ? "default" : build.status === "ready" ? "secondary" : "outline"}>
                            {build.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(build.createdAt).toLocaleDateString()}
                          </span>
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


/** Import from GitHub — lists user's remote repos and creates a project linked to the selected repo */
function ImportFromGitHubButton({ onImport, isPending }: { onImport: (repoId: number, repoName: string) => void; isPending: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const remoteReposQuery = trpc.github.listRemoteRepos.useQuery({}, { enabled: open });
  const connectRepoMut = trpc.github.connectRepo.useMutation({
    onError: (err) => { toast.error(err.message || "Failed to connect repository"); },
  });

  const filteredRepos = useMemo(() => {
    if (!remoteReposQuery.data?.repos) return [];
    const q = search.toLowerCase();
    return remoteReposQuery.data.repos.filter((r: any) =>
      r.full_name?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q)
    );
  }, [remoteReposQuery.data, search]);

  const handleSelect = async (repo: any) => {
    try {
      // First connect the repo to our DB, then create a project linked to it
      const result = await connectRepoMut.mutateAsync({
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch || "main",
        isPrivate: repo.private || false,
        htmlUrl: repo.html_url,
        description: repo.description || "",
        language: repo.language || undefined,
        starCount: repo.stargazers_count || undefined,
        forkCount: repo.forks_count || undefined,
      });
      onImport(result.id, repo.name);
      setOpen(false);
      toast.success(`Imported ${repo.full_name} as a project`);
    } catch (err: any) {
      toast.error(err.message || "Failed to import repo");
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Github className="w-4 h-4 mr-1" /> Import from GitHub
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import from GitHub</DialogTitle>
            <DialogDescription>Select a repository to create a managed project</DialogDescription>
          </DialogHeader>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh]">
            {remoteReposQuery.isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : !remoteReposQuery.data?.connected ? (
              <div className="text-center py-8">
                <Github className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">GitHub not connected. Connect GitHub in Connectors first.</p>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No repositories found</p>
              </div>
            ) : (
              filteredRepos.slice(0, 30).map((repo: any) => (
                <button
                  key={repo.id}
                  onClick={() => handleSelect(repo)}
                  disabled={connectRepoMut.isPending || isPending}
                  className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {repo.private ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate group-hover:text-primary">{repo.full_name}</p>
                    {repo.description && <p className="text-xs text-muted-foreground truncate">{repo.description}</p>}
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      {repo.language && <span>{repo.language}</span>}
                      <span>{repo.default_branch || "main"}</span>
                      {repo.private && <span className="text-amber-500">Private</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
