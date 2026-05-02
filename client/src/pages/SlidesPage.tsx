import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Presentation, Plus, Loader2, Eye, Clock, AlertCircle, Sparkles, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import HeroIllustration from "@/components/HeroIllustration";

function ExportPdfButton({ deckId, title }: { deckId: number; title: string }) {
  const exportMutation = trpc.slides.exportPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(`Exported ${data.filename} (print to PDF)`);
    },
    onError: (err) => { toast.error(`Export failed: ${err.message}`); },
  });
  return (
    <Button size="sm" variant="outline" className="mt-2 w-full gap-1.5" onClick={() => exportMutation.mutate({ id: deckId })} disabled={exportMutation.isPending}>
      {exportMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Export PDF
    </Button>
  );
}

function ExportPptxButton({ deckId, title }: { deckId: number; title: string }) {
  const exportMutation = trpc.slides.exportPptx.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success(`Exported ${data.filename}`);
    },
    onError: (err) => { toast.error(`Export failed: ${err.message}`); },
  });
  return (
    <Button
      size="sm"
      variant="outline"
      className="mt-3 w-full gap-1.5"
      onClick={() => exportMutation.mutate({ id: deckId })}
      disabled={exportMutation.isPending}
    >
      {exportMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      Export PPTX
    </Button>
  );
}

export default function SlidesPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState(8);

  const utils = trpc.useUtils();
  const { data: decks = [], isLoading } = trpc.slides.list.useQuery(undefined, {
    staleTime: 30_000,
    enabled: !!user,
    refetchInterval: 5000,
  });

  const generateMutation = trpc.slides.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generating "${data.title}"...`);
      setPrompt("");
      utils.slides.list.invalidate();
    },
    onError: (err) => { toast.error(`Failed: ${err.message}`); },
  });

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({ prompt: prompt.trim(), slideCount });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "generating": return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "ready": return <Eye className="w-4 h-4 text-green-500" />;
      case "error": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <HeroIllustration
          type="hero-slides"
          title="Slides"
          subtitle="AI-powered presentation generation — describe your topic and get a complete slide deck"
          icon={<Presentation className="w-5 h-5 text-primary" />}
        />
        <div className="flex items-center justify-end mb-4">
          <Badge variant="secondary">{decks.length} decks</Badge>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Generate New Presentation</CardTitle>
            <CardDescription>Describe your topic and AI will create a slide deck</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="e.g. Quarterly business review for Q1 2026..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="flex-1"
              />
              <Input
                type="number"
                min={3}
                max={30}
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                className="w-20"
                title="Number of slides"
                aria-label="Number of slides"
              />
              <Button onClick={handleGenerate} disabled={!prompt.trim() || generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : decks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Presentation className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No presentations yet. Generate your first one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.map((deck) => (
              <Card key={deck.id} className="hover:border-primary/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">{deck.title}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(deck.status ?? "generating")}
                      <Badge variant={deck.status === "ready" ? "default" : deck.status === "error" ? "destructive" : "secondary"}>
                        {deck.status}
                      </Badge>
                    </div>
                  </div>
                  {deck.prompt && <CardDescription className="line-clamp-2">{deck.prompt}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{(deck.slides as unknown[])?.length ?? 0} slides</span>
                    <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
                  </div>
                  {deck.status === "ready" && deck.slides && (
                    <div className="mt-3 space-y-1">
                      {(deck.slides as Array<{ title: string }>).slice(0, 3).map((slide, i) => (
                        <div key={i} className="text-xs text-muted-foreground truncate">
                          {i + 1}. {slide.title}
                        </div>
                      ))}
                      {(deck.slides as unknown[]).length > 3 && (
                        <div className="text-xs text-muted-foreground">+{(deck.slides as unknown[]).length - 3} more...</div>
                      )}
                    </div>
                  )}
                  {deck.status === "ready" && (
                    <>
                      <ExportPptxButton deckId={deck.id} title={deck.title ?? "slides"} />
                      <ExportPdfButton deckId={deck.id} title={deck.title ?? "slides"} />
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
