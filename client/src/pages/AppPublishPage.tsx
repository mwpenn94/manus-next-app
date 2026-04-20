/**
 * AppPublishPage — Mobile App Publishing Pipeline
 * Capability #42: App Publishing
 *
 * Manage builds, generate CI/CD workflows, track store submissions.
 */
import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket, Plus, Loader2, LogIn, ArrowLeft,
  CheckCircle2, XCircle, Clock, Hammer, Copy,
  FileCode, ListChecks, ChevronRight, Package,
} from "lucide-react";
import { toast } from "sonner";

type BuildPlatform = "ios" | "android" | "web_pwa";
type BuildMethod = "pwa_manifest" | "capacitor_local" | "github_actions" | "expo_eas" | "manual_xcode" | "manual_android_studio";

const BUILD_METHOD_META: Record<BuildMethod, { label: string; cost: string; description: string }> = {
  pwa_manifest: { label: "PWA Deploy", cost: "Free", description: "Deploy as a Progressive Web App — no build step needed" },
  github_actions: { label: "GitHub Actions", cost: "Free (2000 min/mo)", description: "Automated CI/CD builds on every push or manual trigger" },
  capacitor_local: { label: "Capacitor Local Build", cost: "Free", description: "Build locally with Android Studio or Xcode" },
  expo_eas: { label: "Expo EAS Build", cost: "$3/build", description: "Cloud builds via Expo Application Services" },
  manual_xcode: { label: "Manual Xcode", cost: "Free", description: "Build and archive manually in Xcode" },
  manual_android_studio: { label: "Manual Android Studio", cost: "Free", description: "Build APK/AAB manually in Android Studio" },
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  queued: Clock,
  building: Hammer,
  success: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle,
};

export default function AppPublishPage() {
  const { isAuthenticated } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<BuildPlatform>("web_pwa");
  const [selectedMethod, setSelectedMethod] = useState<BuildMethod>("pwa_manifest");
  const [showWorkflow, setShowWorkflow] = useState(false);

  const projects = trpc.mobileProject.list.useQuery(undefined, { enabled: isAuthenticated });
  const builds = trpc.appPublish.builds.useQuery(
    { mobileProjectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const allBuilds = trpc.appPublish.userBuilds.useQuery(undefined, { enabled: isAuthenticated });
  const createBuild = trpc.appPublish.createBuild.useMutation({
    onSuccess: () => {
      toast.success("Build created!");
      builds.refetch();
      allBuilds.refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const checklist = trpc.appPublish.getPublishChecklist.useQuery(
    { platform: selectedPlatform },
    { enabled: isAuthenticated }
  );
  const workflow = trpc.appPublish.generateGitHubWorkflow.useQuery(
    { framework: "capacitor", platform: selectedPlatform, buildOnPush: false },
    { enabled: showWorkflow }
  );

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">App Publishing</h2>
            <p className="text-muted-foreground mb-4">Sign in to build and publish your mobile apps.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          App Publishing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build, package, and publish your mobile apps to app stores
        </p>
      </div>

      <Tabs defaultValue="builds" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builds"><Package className="w-3.5 h-3.5 mr-1.5" />Builds</TabsTrigger>
          <TabsTrigger value="new"><Plus className="w-3.5 h-3.5 mr-1.5" />New Build</TabsTrigger>
          <TabsTrigger value="checklist"><ListChecks className="w-3.5 h-3.5 mr-1.5" />Checklist</TabsTrigger>
          <TabsTrigger value="cicd"><FileCode className="w-3.5 h-3.5 mr-1.5" />CI/CD</TabsTrigger>
        </TabsList>

        {/* ── Builds Tab ── */}
        <TabsContent value="builds" className="space-y-4">
          {allBuilds.isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !allBuilds.data?.length ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No builds yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a mobile project first, then start a build to package your app.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allBuilds.data.map((build) => {
                const StatusIcon = STATUS_ICONS[build.status] ?? Clock;
                const methodMeta = BUILD_METHOD_META[build.buildMethod as BuildMethod];
                return (
                  <Card key={build.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <StatusIcon className={`w-5 h-5 ${
                            build.status === "success" ? "text-green-500" :
                            build.status === "failed" ? "text-red-500" :
                            build.status === "building" ? "text-yellow-500 animate-pulse" :
                            "text-muted-foreground"
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground text-sm">
                                {build.platform === "web_pwa" ? "PWA" : build.platform === "android" ? "Android" : "iOS"} Build
                              </span>
                              <Badge variant={build.status === "success" ? "default" : build.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                                {build.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">{build.version}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {methodMeta?.label ?? build.buildMethod} · {new Date(build.startedAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        {build.artifactUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={build.artifactUrl} target="_blank" rel="noopener noreferrer">
                              Download
                            </a>
                          </Button>
                        )}
                      </div>
                      {build.errorMessage && (
                        <p className="text-xs text-red-400 mt-2 bg-red-500/10 p-2 rounded">{build.errorMessage}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── New Build Tab ── */}
        <TabsContent value="new" className="space-y-6">
          {/* Select project */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">1. Select Project</CardTitle>
            </CardHeader>
            <CardContent>
              {projects.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : !projects.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  No mobile projects found. Create one in the Mobile Projects page first.
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.data.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`w-full text-left p-3 border rounded-lg transition-all ${
                        selectedProjectId === p.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.framework}</span>
                        </div>
                        {selectedProjectId === p.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Select platform */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">2. Target Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {(["web_pwa", "android", "ios"] as BuildPlatform[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPlatform(p)}
                    className={`flex-1 p-3 border rounded-lg text-center transition-all ${
                      selectedPlatform === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {p === "web_pwa" ? "PWA" : p === "android" ? "Android" : "iOS"}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {p === "web_pwa" ? "Free" : p === "android" ? "$25 account" : "$99/yr account"}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Select build method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">3. Build Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(Object.entries(BUILD_METHOD_META) as [BuildMethod, typeof BUILD_METHOD_META[BuildMethod]][]).map(([method, meta]) => (
                  <button
                    key={method}
                    onClick={() => setSelectedMethod(method)}
                    className={`w-full text-left p-3 border rounded-lg transition-all ${
                      selectedMethod === method ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{meta.label}</span>
                          <Badge variant="outline" className="text-[10px]">{meta.cost}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      </div>
                      {selectedMethod === method && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => {
              if (!selectedProjectId) { toast.error("Select a project first"); return; }
              createBuild.mutate({
                mobileProjectId: selectedProjectId,
                platform: selectedPlatform,
                buildMethod: selectedMethod,
              });
            }}
            disabled={!selectedProjectId || createBuild.isPending}
            className="w-full"
          >
            {createBuild.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
            Start Build
          </Button>
        </TabsContent>

        {/* ── Checklist Tab ── */}
        <TabsContent value="checklist" className="space-y-4">
          <div className="flex gap-3 mb-4">
            {(["web_pwa", "android", "ios"] as BuildPlatform[]).map((p) => (
              <Button
                key={p}
                variant={selectedPlatform === p ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlatform(p)}
              >
                {p === "web_pwa" ? "PWA" : p === "android" ? "Android" : "iOS"}
              </Button>
            ))}
          </div>

          {checklist.isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <div className="space-y-2">
              {checklist.data?.map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        item.required ? "border-primary" : "border-muted-foreground/30"
                      }`}>
                        {item.required && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{item.item}</span>
                          {item.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── CI/CD Tab ── */}
        <TabsContent value="cicd" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">GitHub Actions Workflow</CardTitle>
              <CardDescription>Generate a CI/CD workflow for automated builds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4">
                {(["web_pwa", "android", "ios"] as BuildPlatform[]).map((p) => (
                  <Button
                    key={p}
                    variant={selectedPlatform === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setSelectedPlatform(p); setShowWorkflow(false); }}
                  >
                    {p === "web_pwa" ? "PWA" : p === "android" ? "Android" : "iOS"}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowWorkflow(true)}
                disabled={showWorkflow && workflow.isLoading}
              >
                {workflow.isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCode className="w-4 h-4 mr-2" />}
                Generate Workflow
              </Button>
              {showWorkflow && workflow.data && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <code className="text-xs text-muted-foreground">{workflow.data.filename}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(workflow.data!.workflow);
                        toast.success("Workflow copied to clipboard!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                    {workflow.data.workflow}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
