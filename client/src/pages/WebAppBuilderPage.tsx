/**
 * WebAppBuilderPage — Full-stack web app creation, live preview, and publishing
 *
 * Capabilities #27-29:
 * - Prompt-to-app generation via agent
 * - Live iframe preview with hot reload
 * - Publishing pipeline (checkpoint + publish button guidance)
 */
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Streamdown } from "streamdown";
import {
  Code,
  Eye,
  Rocket,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ExternalLink,
  Copy,
  CheckCircle2,
  Globe,
  Paintbrush,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type BuildStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  output?: string;
};

export default function WebAppBuilderPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [appName, setAppName] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [activeTab, setActiveTab] = useState("builder");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const buildApp = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Describe the web app you want to build");
      return;
    }

    setIsBuilding(true);
    setBuildSteps([
      { id: "plan", label: "Planning architecture", status: "running" },
      { id: "generate", label: "Generating code", status: "pending" },
      { id: "preview", label: "Building preview", status: "pending" },
      { id: "publish", label: "Ready to publish", status: "pending" },
    ]);

    try {
      // Use agent to generate the app
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

      // Update step: planning done
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
            } catch {
              /* skip */
            }
          }
        }
      }

      // Extract HTML from response
      const htmlMatch = fullContent.match(/```html\n([\s\S]*?)```/);
      const html = htmlMatch ? htmlMatch[1] : fullContent;

      setGeneratedCode(html);
      setPreviewHtml(html);

      // Update steps
      setBuildSteps((prev) =>
        prev.map((s) => ({
          ...s,
          status: "done",
        }))
      );

      setActiveTab("preview");
      toast.success("Web app generated successfully!");
    } catch (err: any) {
      toast.error("Build failed: " + err.message);
      setBuildSteps((prev) =>
        prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s))
      );
    } finally {
      setIsBuilding(false);
    }
  }, [prompt, appName]);

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Web App Builder
            </h1>
            <p className="text-sm text-muted-foreground">
              Describe your app and let AI build it for you
            </p>
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
                    />
                    <Textarea
                      placeholder="Describe what your web app should do. Be specific about features, layout, and functionality..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={8}
                      className="mb-4"
                    />
                    <Button onClick={buildApp} disabled={isBuilding || !prompt.trim()} className="w-full">
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
                      <div className="space-y-3">
                        {buildSteps.map((step) => (
                          <div key={step.id} className="flex items-center gap-3">
                            {step.status === "running" ? (
                              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                            ) : step.status === "done" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            ) : step.status === "error" ? (
                              <div className="w-4 h-4 rounded-full bg-red-500/20 shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                            )}
                            <span
                              className={`text-sm ${
                                step.status === "done"
                                  ? "text-foreground"
                                  : step.status === "running"
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            >
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (iframeRef.current) {
                          iframeRef.current.srcdoc = previewHtml;
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const blob = new Blob([previewHtml], { type: "text/html" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                      }}
                    >
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
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px] text-xs font-mono text-foreground">
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
                  <h3 className="text-lg font-semibold mb-2">Ready to Go Live</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Your app has been generated and is ready for publishing. Use the Manus Management UI
                    to publish it to your custom domain.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Code generated and previewed
                    </div>
                    <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Ready for checkpoint
                    </div>
                    <div className="flex items-center gap-3 justify-center text-sm text-muted-foreground">
                      <Badge variant="outline">Next Step</Badge>
                      Click Publish in the Management UI header
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
