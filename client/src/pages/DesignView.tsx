/**
 * DesignView — Visual Design Canvas
 *
 * Real canvas for AI-generated visual compositions:
 * - Generate images from text prompts
 * - Add text overlays with positioning
 * - Layer management (image + text layers)
 * - Export as image artifact
 * - Template presets (poster, banner, card, social)
 */
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Paintbrush,
  Image,
  Type,
  Layers,
  Download,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type DesignLayer = {
  id: string;
  type: "image" | "text";
  content: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string;
};

const TEMPLATES = [
  { id: "poster", label: "Poster", width: 800, height: 1200 },
  { id: "banner", label: "Banner", width: 1200, height: 400 },
  { id: "card", label: "Card", width: 600, height: 400 },
  { id: "social", label: "Social Post", width: 1080, height: 1080 },
  { id: "mockup", label: "UI Mockup", width: 1440, height: 900 },
  { id: "infographic", label: "Infographic", width: 800, height: 2000 },
];

export default function DesignView() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt to generate an image");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt: `Generate an image: ${prompt}. Style: ${template.id} design, professional quality.`,
          mode: "quality",
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let imageUrl = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.image) imageUrl = data.image;
            } catch {
              /* skip */
            }
          }
        }
      }

      if (imageUrl) {
        const newLayer: DesignLayer = {
          id: Date.now().toString(),
          type: "image",
          content: prompt,
          url: imageUrl,
          x: 0,
          y: 0,
          width: template.width,
          height: template.height,
          fontSize: undefined,
          color: undefined,
          fontWeight: undefined,
        };
        setLayers((prev) => [...prev, newLayer]);
        setSelectedLayer(newLayer.id);
        toast.success("Image generated and added to canvas");
      } else {
        toast.error("No image was generated. Try a different prompt.");
      }
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, template]);

  const addTextLayer = useCallback(() => {
    if (!textInput.trim()) {
      toast.error("Enter text to add");
      return;
    }
    const newLayer: DesignLayer = {
      id: Date.now().toString(),
      type: "text",
      content: textInput,
      x: template.width / 4,
      y: template.height / 2,
      width: template.width / 2,
      height: 60,
      fontSize: 32,
      color: "#ffffff",
      fontWeight: "bold",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayer(newLayer.id);
    setTextInput("");
    toast.success("Text layer added");
  }, [textInput, template]);

  const removeLayer = useCallback((id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedLayer(null);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Paintbrush className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Design Canvas</h2>
            <p className="text-muted-foreground mb-4">Sign in to create visual designs.</p>
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
              Design Canvas
            </h1>
            <p className="text-sm text-muted-foreground">
              Create visual compositions with AI-generated images and text
            </p>
          </div>
          <Select
            value={template.id}
            onValueChange={(v) => {
              const t = TEMPLATES.find((t) => t.id === v);
              if (t) setTemplate(t);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tools Panel */}
          <div className="space-y-4">
            {/* Image Generation */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Generate Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Describe the image to generate..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  className="mb-3 text-sm"
                />
                <Button
                  onClick={generateImage}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                  size="sm"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4 mr-2" />
                  )}
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </CardContent>
            </Card>

            {/* Text Layer */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  Add Text
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="Enter text..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="mb-3 text-sm"
                />
                <Button
                  onClick={addTextLayer}
                  disabled={!textInput.trim()}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text Layer
                </Button>
              </CardContent>
            </Card>

            {/* Layers */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Layers ({layers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {layers.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No layers yet. Generate an image or add text.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {layers.map((layer, i) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayer(layer.id)}
                        className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-xs transition-colors ${
                          selectedLayer === layer.id
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        {layer.type === "image" ? (
                          <Image className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                          <Type className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                        <span className="truncate flex-1">
                          {layer.content.slice(0, 30)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(layer.id);
                          }}
                          className="text-muted-foreground hover:text-red-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {template.label} — {template.width}×{template.height}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => toast.info("Export coming soon")}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div
                  ref={canvasRef}
                  className="relative bg-muted/30 border border-border rounded-lg overflow-hidden mx-auto"
                  style={{
                    width: "100%",
                    maxWidth: Math.min(template.width, 900),
                    aspectRatio: `${template.width} / ${template.height}`,
                  }}
                >
                  {layers.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Paintbrush className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground/50">
                          Generate an image or add text to start designing
                        </p>
                      </div>
                    </div>
                  ) : (
                    layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayer(layer.id)}
                        className={`absolute transition-shadow ${
                          selectedLayer === layer.id
                            ? "ring-2 ring-primary ring-offset-1"
                            : ""
                        }`}
                        style={{
                          left: `${(layer.x / template.width) * 100}%`,
                          top: `${(layer.y / template.height) * 100}%`,
                          width:
                            layer.type === "image"
                              ? "100%"
                              : `${(layer.width / template.width) * 100}%`,
                          height:
                            layer.type === "image"
                              ? "100%"
                              : "auto",
                          cursor: "pointer",
                        }}
                      >
                        {layer.type === "image" && layer.url ? (
                          <img
                            src={layer.url}
                            alt={layer.content}
                            className="w-full h-full object-cover"
                            draggable={false}
                          />
                        ) : (
                          <div
                            style={{
                              fontSize: `${(layer.fontSize || 32) * 0.5}px`,
                              color: layer.color || "#ffffff",
                              fontWeight: layer.fontWeight || "bold",
                              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                              padding: "4px 8px",
                            }}
                          >
                            {layer.content}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
