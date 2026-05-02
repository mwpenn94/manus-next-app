/**
 * DesignView — Visual Design Canvas with DB persistence
 *
 * Capability #15: Real canvas for AI-generated visual compositions
 * - Generate images from text prompts via agent
 * - Add text overlays with positioning
 * - Drag-to-reposition layers on canvas
 * - Layer management (image + text layers)
 * - Export to S3 (real publish, not "coming soon")
 * - Template presets (poster, banner, card, social, mockup, infographic)
 * - Save/load designs from database
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Paintbrush, Image, Type, Layers, Download, ArrowLeft,
  Loader2, Plus, Trash2, Sparkles, Save, FolderOpen,
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
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [designTitle, setDesignTitle] = useState("Untitled Design");
  const [currentDesignId, setCurrentDesignId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ layerId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // Real tRPC queries and mutations
  const designsQuery = trpc.design.list.useQuery(undefined, {
    staleTime: 30_000, enabled: !!user });
  const utils = trpc.useUtils();

  const createDesignMut = trpc.design.create.useMutation({
    onSuccess: (data: any) => {
      utils.design.list.invalidate();
      setCurrentDesignId(data.id);
      toast.success("Design saved!");
    },
    onError: (err: any) => { toast.error("Save failed: " + err.message); },
  });

  const updateDesignMut = trpc.design.update.useMutation({
    onSuccess: () => {
      utils.design.list.invalidate();
      toast.success("Design updated!");
    },
    onError: (err: any) => { toast.error("Update failed: " + err.message); },
  });

  const exportDesign = trpc.design.export.useMutation({
    onSuccess: (data: any) => {
      toast.success("Exported! Opening in new tab...");
      window.open(data.url, "_blank");
    },
    onError: (err: any) => { toast.error("Export failed: " + err.message); },
  });

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
          messages: [{ role: "user", content: `Generate an image: ${prompt}. Style: ${template.id} design, professional quality.` }],
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
            } catch { /* skip */ }
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

  // Drag-to-reposition handlers
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, layerId: string) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;
    dragRef.current = { layerId, startX: clientX, startY: clientY, origX: layer.x, origY: layer.y };
    setSelectedLayer(layerId);
  }, [layers]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = template.width / rect.width;
    const scaleY = template.height / rect.height;
    const dx = (clientX - dragRef.current.startX) * scaleX;
    const dy = (clientY - dragRef.current.startY) * scaleY;
    const newX = Math.max(0, Math.min(template.width - 50, dragRef.current.origX + dx));
    const newY = Math.max(0, Math.min(template.height - 50, dragRef.current.origY + dy));
    setLayers((prev) =>
      prev.map((l) => l.id === dragRef.current!.layerId ? { ...l, x: newX, y: newY } : l)
    );
  }, [template]);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleSave = useCallback(() => {
    const canvasState = {
      template: template.id,
      layers,
      width: template.width,
      height: template.height,
    };
    if (currentDesignId) {
      updateDesignMut.mutate({
        id: currentDesignId,
        name: designTitle,
        canvasState,
      });
    } else {
      createDesignMut.mutate({
        name: designTitle,
        canvasState,
      });
    }
  }, [currentDesignId, designTitle, template, layers, createDesignMut, updateDesignMut]);

  const handleExport = useCallback(() => {
    if (!currentDesignId) {
      toast.error("Save the design first before exporting");
      return;
    }
    exportDesign.mutate({
      id: currentDesignId,
      format: "png",
    });
  }, [currentDesignId, exportDesign]);

  const loadDesign = useCallback((design: any) => {
    setCurrentDesignId(design.id);
    setDesignTitle(design.name ?? design.title ?? "Untitled");
    try {
      const raw = design.canvasState ?? design.canvasData;
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      const t = TEMPLATES.find((t) => t.id === data.template);
      if (t) setTemplate(t);
      setLayers(data.layers ?? []);
    } catch {
      toast.error("Failed to load design data");
    }
    setShowHistory(false);
    toast.success("Design loaded");
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-sm">
          <CardContent className="p-6 text-center">
            <Paintbrush className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Design Canvas</h2>
            <p className="text-muted-foreground mb-4">Sign in to create visual designs.</p>
            <Button size="lg" className="min-h-[44px] px-8" onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const designs = designsQuery.data ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Go back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <Input
              value={designTitle}
              onChange={(e) => setDesignTitle(e.target.value)}
              className="text-xl font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0"
              style={{ fontFamily: "var(--font-heading)" }}
            />
            <p className="text-sm text-muted-foreground">
              Create visual compositions with AI-generated images and text
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
              <FolderOpen className="w-4 h-4 mr-2" />
              History ({designs.length})
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave} disabled={createDesignMut.isPending || updateDesignMut.isPending}>
              {(createDesignMut.isPending || updateDesignMut.isPending) ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exportDesign.isPending || layers.length === 0}>
              {exportDesign.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Export
            </Button>
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
        </div>

        {/* Design History Panel */}
        {showHistory && (
          <Card className="bg-card border-border mb-6">
            <CardHeader>
              <CardTitle className="text-base">Saved Designs</CardTitle>
            </CardHeader>
            <CardContent>
              {designsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : designs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No saved designs yet.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {designs.map((d: any) => (
                    <div
                      key={d.id}
                      onClick={() => loadDesign(d)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/30 ${currentDesignId === d.id ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(d.updatedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
                    {layers.map((layer) => (
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
                        <span className="truncate flex-1">{layer.content.slice(0, 30)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
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
                  {currentDesignId && (
                    <Badge variant="outline" className="text-xs">
                      Saved · ID: {currentDesignId}
                    </Badge>
                  )}
                </div>
                <div
                  ref={canvasRef}
                  className="relative bg-muted/30 border border-border rounded-lg overflow-hidden mx-auto select-none"
                  style={{
                    width: "100%",
                    maxWidth: Math.min(template.width, 900),
                    aspectRatio: `${template.width} / ${template.height}`,
                  }}
                  onMouseMove={handleDragMove}
                  onMouseUp={handleDragEnd}
                  onMouseLeave={handleDragEnd}
                  onTouchMove={handleDragMove}
                  onTouchEnd={handleDragEnd}
                >
                  {layers.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <Paintbrush className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Generate an image or add text to start designing
                        </p>
                      </div>
                    </div>
                  ) : (
                    layers.map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedLayer(layer.id)}
                        onMouseDown={(e) => handleDragStart(e, layer.id)}
                        onTouchStart={(e) => handleDragStart(e, layer.id)}
                        className={`absolute transition-shadow ${
                          selectedLayer === layer.id ? "ring-2 ring-primary ring-offset-1" : ""
                        }`}
                        style={{
                          left: `${(layer.x / template.width) * 100}%`,
                          top: `${(layer.y / template.height) * 100}%`,
                          width: layer.type === "image" ? "100%" : `${(layer.width / template.width) * 100}%`,
                          height: layer.type === "image" ? "100%" : "auto",
                          cursor: dragRef.current?.layerId === layer.id ? "grabbing" : "grab",
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
