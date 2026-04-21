/**
 * FigmaImportPage — Import designs from Figma
 * Capability #39: Import from Figma
 *
 * Supports:
 * - Figma URL parsing (extracts file key, node IDs)
 * - Design token extraction via agent
 * - Component generation from Figma design descriptions
 * - Export to React/Tailwind code
 */
import { useState, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Code, Palette, Type, Loader2, LogIn,
  Copy, CheckCircle2, Sparkles, ArrowLeft, Layers,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type DesignToken = {
  type: "color" | "typography" | "spacing" | "radius" | "shadow";
  name: string;
  value: string;
  cssVar: string;
};

type ImportResult = {
  tokens: DesignToken[];
  components: string[];
  code: string;
  cssVariables: string;
};

function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("figma.com")) return null;
    const match = u.pathname.match(/\/(file|design|proto)\/([a-zA-Z0-9]+)/);
    if (!match) return null;
    return { fileKey: match[2], nodeId: u.searchParams.get("node-id") ?? undefined };
  } catch {
    return null;
  }
}

export default function FigmaImportPage() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [figmaUrl, setFigmaUrl] = useState("");
  const [designDescription, setDesignDescription] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parsedUrl, setParsedUrl] = useState<{ fileKey: string; nodeId?: string } | null>(null);

  const handleUrlChange = useCallback((url: string) => {
    setFigmaUrl(url);
    setParsedUrl(parseFigmaUrl(url));
  }, []);

  const handleImport = useCallback(async () => {
    if (!figmaUrl.trim() && !designDescription.trim()) {
      toast.error("Provide a Figma URL or describe your design");
      return;
    }
    setIsImporting(true);
    try {
      const prompt = figmaUrl.trim()
        ? `Import this Figma design and generate React/Tailwind components. Figma URL: ${figmaUrl}. ${designDescription ? `Additional context: ${designDescription}` : ""} Extract design tokens and generate clean React components.`
        : `Generate React/Tailwind components based on this design description: ${designDescription}. Extract design tokens and generate clean React components.`;

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, mode: "quality" }),
      });

      if (!response.ok) throw new Error("Import failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) fullContent += data.content;
            } catch { /* skip */ }
          }
        }
      }

      // Try to parse structured JSON from response
      try {
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setResult({
            tokens: parsed.tokens ?? [],
            components: parsed.components ?? [],
            code: parsed.code ?? fullContent,
            cssVariables: parsed.cssVariables ?? "",
          });
        } else {
          throw new Error("no json");
        }
      } catch {
        // No canned fallback — show the raw agent response as code
        setResult({
          tokens: [],
          components: [],
          code: fullContent || "The agent could not extract structured design tokens. Try providing a more detailed design description.",
          cssVariables: "",
        });
      }
      toast.success("Design imported!");
    } catch (err: any) {
      toast.error("Import failed: " + err.message);
    } finally {
      setIsImporting(false);
    }
  }, [figmaUrl, designDescription]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Layers className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Figma Import</h2>
            <p className="text-muted-foreground mb-4">Sign in to import designs from Figma.</p>
            <Button onClick={() => (window.location.href = getLoginUrl())}>
              <LogIn className="w-4 h-4 mr-2" /> Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Import from Figma
            </h1>
            <p className="text-sm text-muted-foreground">Convert Figma designs to React components</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Figma URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input value={figmaUrl} onChange={(e) => handleUrlChange(e.target.value)} placeholder="https://www.figma.com/file/..." className="mb-2" />
                {parsedUrl && (
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" />
                    <span className="text-muted-foreground">File: <code className="text-foreground">{parsedUrl.fileKey}</code></span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> Design Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={designDescription} onChange={(e) => setDesignDescription(e.target.value)} placeholder="Describe the design..." rows={5} className="mb-3" />
                <Button onClick={handleImport} disabled={isImporting || (!figmaUrl.trim() && !designDescription.trim())} className="w-full">
                  {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  {isImporting ? "Importing..." : "Import & Generate"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {!result ? (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Import a design to see results</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {result.tokens.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Palette className="w-4 h-4 text-primary" /> Tokens ({result.tokens.length})
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.cssVariables, "CSS")}>
                          <Copy className="w-3 h-3 mr-1" /> CSS
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {result.tokens.map((t, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-[10px]">{t.type}</Badge>
                              <span className="text-foreground">{t.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {t.type === "color" && <div className="w-4 h-4 rounded border border-border" style={{ backgroundColor: t.value }} />}
                              <code className="text-muted-foreground">{t.value}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {result.components.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Type className="w-4 h-4 text-primary" /> Components
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {result.components.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {result.code && (
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Code className="w-4 h-4 text-primary" /> Code
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.code, "Code")}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-x-auto max-h-80 overflow-y-auto">
                        <code>{result.code}</code>
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
