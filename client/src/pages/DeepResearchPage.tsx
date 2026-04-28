/**
 * DeepResearchPage — Autonomous multi-source research agent.
 * Matches Manus deep research capability: user provides a topic,
 * AI conducts multi-step research and produces a cited report.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  FileText,
  ExternalLink,
  Download,
  BookOpen,
  Globe,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

interface ResearchResult {
  id: string;
  query: string;
  report: string;
  sources: string[];
  createdAt: string;
  status: "running" | "complete" | "error";
}

export default function DeepResearchPage() {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [activeResearch, setActiveResearch] = useState<ResearchResult | null>(null);
  const [history, setHistory] = useState<ResearchResult[]>([]);

  const [pollingId, setPollingId] = useState<string | null>(null);

  // Poll for research results when we have an active research ID
  const researchQuery = trpc.research.get.useQuery(
    { id: pollingId! },
    {
      enabled: !!pollingId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === "complete" || data?.status === "error") return false;
        return 3000;
      },
    }
  );

  // Update active research when polling data changes
  useEffect(() => {
    if (!researchQuery.data) return;
    const d = researchQuery.data;
    const result: ResearchResult = {
      id: d.id,
      query: d.topic,
      report: d.summary || d.sections.map(s => `## ${s.heading}\n\n${s.content}`).join("\n\n"),
      sources: d.sections.flatMap(s => s.sources),
      createdAt: new Date(d.startedAt).toISOString(),
      status: d.status === "complete" ? "complete" : d.status === "error" ? "error" : "running",
    };
    setActiveResearch(result);
    if (d.status === "complete") {
      setPollingId(null);
      setHistory(prev => {
        const exists = prev.find(h => h.id === result.id);
        if (exists) return prev.map(h => h.id === result.id ? result : h);
        return [result, ...prev];
      });
      toast.success("Research complete");
    } else if (d.status === "error") {
      setPollingId(null);
      toast.error("Research failed");
    }
  }, [researchQuery.data]);

  const startMutation = trpc.research.start.useMutation({
    onSuccess: (data) => {
      setPollingId(data.id);
      toast.info("Research started — this may take a few minutes");
    },
    onError: (err) => {
      toast.error(`Research failed: ${err.message}`);
      if (activeResearch) {
        setActiveResearch({ ...activeResearch, status: "error" });
      }
    },
  });

  const handleStartResearch = () => {
    if (!query.trim()) return;
    const placeholder: ResearchResult = {
      id: Date.now().toString(),
      query,
      report: "",
      sources: [],
      createdAt: new Date().toISOString(),
      status: "running",
    };
    setActiveResearch(placeholder);

    const depthPrompt =
      depth === "quick"
        ? "Provide a brief, focused answer with key facts."
        : depth === "deep"
        ? "Conduct an exhaustive, multi-source analysis. Include citations, data points, competing perspectives, and a structured report with executive summary, methodology, findings, and recommendations."
        : "Provide a thorough analysis with key findings, supporting evidence, and actionable insights.";

    startMutation.mutate({
      topic: query,
      depth,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Deep Research
          </h1>
          <p className="text-sm text-muted-foreground">
            Autonomous multi-source research agent — provide a topic and get a comprehensive, cited report
          </p>
        </div>

        {/* Research Input */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="space-y-4">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What would you like to research? e.g., 'Analyze the competitive landscape of AI code assistants in 2026, including market share, pricing models, and technical differentiators'"
                rows={3}
                className="resize-none"
              />

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {(["quick", "standard", "deep"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDepth(d)}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                        depth === d
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d === "quick" && <Clock className="w-3 h-3 inline mr-1" />}
                      {d === "standard" && <Search className="w-3 h-3 inline mr-1" />}
                      {d === "deep" && <BookOpen className="w-3 h-3 inline mr-1" />}
                      {d}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={handleStartResearch}
                  disabled={!query.trim() || startMutation.isPending || !!pollingId}
                  className="gap-1.5"
                >
                  {startMutation.isPending || !!pollingId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Research
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Research */}
        {activeResearch && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {activeResearch.status === "running" ? (
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                ) : activeResearch.status === "complete" ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-destructive/15 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-destructive" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {activeResearch.query.slice(0, 80)}
                    {activeResearch.query.length > 80 ? "..." : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activeResearch.status === "running"
                      ? "Researching..."
                      : activeResearch.status === "complete"
                      ? "Research complete"
                      : "Research failed"}
                  </p>
                </div>
              </div>

              {activeResearch.report && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Streamdown>{activeResearch.report}</Streamdown>
                </div>
              )}

              {activeResearch.status === "running" && (
                <div className="space-y-3 mt-4">
                  {["Searching sources...", "Analyzing findings...", "Synthesizing report..."].map(
                    (step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                        <span className="text-xs text-muted-foreground">{step}</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Research History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Research History
            </h2>
            <div className="space-y-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveResearch(item)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors",
                    activeResearch?.id === item.id && "border-primary/50 bg-primary/5"
                  )}
                >
                  <p className="text-sm text-foreground truncate">{item.query}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!activeResearch && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Search className="w-7 h-7 text-primary" />
            </div>
            <h3
              className="text-lg font-semibold text-foreground mb-1.5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Start a Research Project
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Describe a topic, question, or analysis you need. The AI will conduct
              multi-source research and produce a comprehensive, cited report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
