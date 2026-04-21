/**
 * MobileProjectsPage — Mobile Development Hub
 * Capability #43: Mobile Development
 *
 * Manage mobile app projects: PWA, Capacitor, or Expo.
 * Configure manifests, generate service workers, and prepare for builds.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Smartphone, Plus, Trash2, Settings, Loader2, LogIn,
  Globe, Layers, Zap, ArrowLeft, ChevronRight, Check,
  Download, FileCode, Palette, Box,
} from "lucide-react";
import { toast } from "sonner";

type Framework = "pwa" | "capacitor" | "expo";
type Platform = "ios" | "android" | "web";

const FRAMEWORK_META: Record<Framework, { label: string; icon: typeof Globe; description: string; cost: string; platforms: Platform[] }> = {
  pwa: {
    label: "Progressive Web App (PWA)",
    icon: Globe,
    description: "Install from browser. Works on all platforms. No app store required. Best free option.",
    cost: "Free",
    platforms: ["web", "android", "ios"],
  },
  capacitor: {
    label: "Capacitor (Native Wrapper)",
    icon: Layers,
    description: "Wrap your web app in a native container. Access device APIs. Publish to app stores.",
    cost: "Free (build) / $25-$99 (store accounts)",
    platforms: ["android", "ios"],
  },
  expo: {
    label: "Expo (React Native)",
    icon: Zap,
    description: "Full React Native experience with managed builds. Best for complex native apps.",
    cost: "Free (local) / $3/build (EAS)",
    platforms: ["android", "ios"],
  },
};

export default function MobileProjectsPage() {
  const { isAuthenticated } = useAuth();
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedFramework, setSelectedFramework] = useState<Framework | null>(null);
  const [projectName, setProjectName] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["web", "android"]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const projects = trpc.mobileProject.list.useQuery(undefined, { enabled: isAuthenticated });
  const activeProject = trpc.mobileProject.get.useQuery(
    { externalId: activeProjectId! },
    { enabled: !!activeProjectId && view === "detail" }
  );
  const createProject = trpc.mobileProject.create.useMutation({
    onSuccess: (data) => {
      toast.success("Mobile project created!");
      projects.refetch();
      if (data?.externalId) {
        setActiveProjectId(data.externalId);
        setView("detail");
      }
    },
    onError: (err) => { toast.error(err.message); },
  });
  const deleteProject = trpc.mobileProject.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted");
      projects.refetch();
      setView("list");
    },
    onError: (err) => { toast.error(err.message); },
  });
  const generatePwa = trpc.mobileProject.generatePwaManifest.useMutation({
    onSuccess: () => {
      toast.success("PWA manifest generated!");
      activeProject.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });
  const generateSw = trpc.mobileProject.generateServiceWorker.useQuery(
    { cacheName: `manus-pwa-v1` },
    { enabled: false }
  );
  const generateCapacitor = trpc.mobileProject.generateCapacitorConfig.useMutation({
    onSuccess: () => {
      toast.success("Capacitor config generated!");
      activeProject.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });
  const generateExpo = trpc.mobileProject.generateExpoConfig.useMutation({
    onSuccess: () => {
      toast.success("Expo config generated!");
      activeProject.refetch();
    },
    onError: (err) => { toast.error(err.message); },
  });

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleCreate = () => {
    if (!selectedFramework || !projectName.trim() || !selectedPlatforms.length) return;
    createProject.mutate({
      name: projectName.trim(),
      framework: selectedFramework,
      platforms: selectedPlatforms,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Mobile Development</h2>
            <p className="text-muted-foreground mb-4">Sign in to create mobile app projects.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Project List ──
  if (view === "list") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Mobile Projects
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build mobile apps from your web project — PWA, Capacitor, or Expo
            </p>
          </div>
          <Button onClick={() => { setView("create"); setSelectedFramework(null); setProjectName(""); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>

        {projects.isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !projects.data?.length ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No mobile projects yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Create a mobile project to package your web app for phones and tablets. PWA is the easiest free option.
              </p>
              <Button onClick={() => { setView("create"); setSelectedFramework(null); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Mobile App
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.data.map((project) => {
              const fw = FRAMEWORK_META[project.framework as Framework];
              const Icon = fw?.icon ?? Smartphone;
              return (
                <Card
                  key={project.id}
                  className="hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => { setActiveProjectId(project.externalId); setView("detail"); }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{project.name}</span>
                            <Badge variant="secondary" className="text-xs">{fw?.label ?? project.framework}</Badge>
                            <Badge variant={project.status === "ready" ? "default" : "outline"} className="text-xs">
                              {project.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(project.platforms as Platform[])?.join(", ")} · {project.bundleId}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Framework comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          {(Object.entries(FRAMEWORK_META) as [Framework, typeof FRAMEWORK_META[Framework]][]).map(([key, fw]) => {
            const Icon = fw.icon;
            return (
              <Card key={key} className="bg-muted/30">
                <CardContent className="p-4">
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <h4 className="text-sm font-medium text-foreground">{fw.label}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{fw.description}</p>
                  <Badge variant="outline" className="text-[10px] mt-2">{fw.cost}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Create Project ──
  if (view === "create") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </button>
        <h2 className="text-xl font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
          Create Mobile Project
        </h2>

        <div className="space-y-6">
          {/* Framework selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Framework</label>
            <div className="space-y-3">
              {(Object.entries(FRAMEWORK_META) as [Framework, typeof FRAMEWORK_META[Framework]][]).map(([key, fw]) => {
                const Icon = fw.icon;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedFramework(key);
                      setSelectedPlatforms(key === "pwa" ? ["web", "android"] : ["android"]);
                    }}
                    className={`w-full text-left p-4 border rounded-xl transition-all ${
                      selectedFramework === key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{fw.label}</span>
                          <Badge variant="outline" className="text-[10px]">{fw.cost}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{fw.description}</p>
                      </div>
                      {selectedFramework === key && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platforms */}
          {selectedFramework && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Target Platforms</label>
              <div className="flex gap-3">
                {FRAMEWORK_META[selectedFramework].platforms.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all ${
                      selectedPlatforms.includes(p) ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {selectedPlatforms.includes(p) && <Check className="w-3.5 h-3.5" />}
                    {p === "web" ? "Web" : p === "android" ? "Android" : "iOS"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Project Name</label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Mobile App"
              className="h-11"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={!selectedFramework || !projectName.trim() || !selectedPlatforms.length || createProject.isPending}
            className="w-full"
          >
            {createProject.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Create Project
          </Button>
        </div>
      </div>
    );
  }

  // ── Project Detail ──
  if (view === "detail" && activeProject.data) {
    const project = activeProject.data;
    const fw = FRAMEWORK_META[project.framework as Framework];

    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => setView("list")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                {project.name}
              </h2>
              <Badge variant="secondary">{fw?.label}</Badge>
              <Badge variant={project.status === "ready" ? "default" : "outline"}>{project.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {project.bundleId} · {(project.platforms as Platform[])?.join(", ")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteProject.mutate({ id: project.id })}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>

        <Tabs defaultValue="config" className="space-y-4">
          <TabsList>
            <TabsTrigger value="config"><Settings className="w-3.5 h-3.5 mr-1.5" />Configuration</TabsTrigger>
            <TabsTrigger value="assets"><Palette className="w-3.5 h-3.5 mr-1.5" />Assets</TabsTrigger>
            <TabsTrigger value="code"><FileCode className="w-3.5 h-3.5 mr-1.5" />Generated Code</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            {project.framework === "pwa" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">PWA Manifest</CardTitle>
                  <CardDescription>Generate a web app manifest for installability</CardDescription>
                </CardHeader>
                <CardContent>
                  {project.pwaManifest ? (
                    <div>
                      <Badge className="mb-3">Generated</Badge>
                      <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-48 font-mono">
                        {JSON.stringify(project.pwaManifest, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generatePwa.mutate({
                        projectId: project.externalId,
                        name: project.displayName || project.name,
                        shortName: project.name.slice(0, 12),
                        themeColor: "#000000",
                        backgroundColor: "#ffffff",
                      })}
                      disabled={generatePwa.isPending}
                    >
                      {generatePwa.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                      Generate Manifest
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {project.framework === "capacitor" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Capacitor Config</CardTitle>
                  <CardDescription>Generate capacitor.config.ts for native builds</CardDescription>
                </CardHeader>
                <CardContent>
                  {project.capacitorConfig ? (
                    <div>
                      <Badge className="mb-3">Generated</Badge>
                      <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-48 font-mono">
                        {JSON.stringify(project.capacitorConfig, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateCapacitor.mutate({
                        projectId: project.externalId,
                        appId: project.bundleId || `com.manus.${project.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                        appName: project.displayName || project.name,
                      })}
                      disabled={generateCapacitor.isPending}
                    >
                      {generateCapacitor.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Box className="w-4 h-4 mr-2" />}
                      Generate Config
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {project.framework === "expo" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Expo Config</CardTitle>
                  <CardDescription>Generate app.json / app.config.ts for Expo builds</CardDescription>
                </CardHeader>
                <CardContent>
                  {project.expoConfig ? (
                    <div>
                      <Badge className="mb-3">Generated</Badge>
                      <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-48 font-mono">
                        {JSON.stringify(project.expoConfig, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateExpo.mutate({
                        projectId: project.externalId,
                        slug: project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                      })}
                      disabled={generateExpo.isPending}
                    >
                      {generateExpo.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                      Generate Config
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">App Icon</CardTitle>
                <CardDescription>Upload or generate an app icon (512x512 recommended)</CardDescription>
              </CardHeader>
              <CardContent>
                {project.iconUrl ? (
                  <img src={project.iconUrl} alt="App icon" className="w-24 h-24 rounded-2xl border border-border" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                    <Palette className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Use the Design page to generate an icon, then set it via the project settings.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="code" className="space-y-4">
            {project.framework === "pwa" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Service Worker</CardTitle>
                  <CardDescription>Add offline support and caching</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => {
                      generateSw.refetch().then((res) => {
                        if (res.data) {
                          navigator.clipboard.writeText(res.data.code);
                          toast.success("Service worker code copied to clipboard!");
                        }
                      });
                    }}
                  >
                    <FileCode className="w-4 h-4 mr-2" />
                    Copy Service Worker Code
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  if (view === "detail" && activeProject.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return null;
}
