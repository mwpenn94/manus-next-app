/**
 * DataAnalysisPage — Structured data analysis and visualization workspace.
 * Matches Manus data-analysis capability: upload data, get AI-powered analysis.
 */
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Database,
  Upload,
  Loader2,
  Sparkles,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

type AnalysisMode = "explore" | "visualize" | "summarize" | "query";

const ANALYSIS_MODES: { id: AnalysisMode; label: string; icon: typeof Database; description: string }[] = [
  { id: "explore", label: "Explore", icon: Database, description: "Understand data structure and quality" },
  { id: "visualize", label: "Visualize", icon: BarChart3, description: "Generate charts and graphs" },
  { id: "summarize", label: "Summarize", icon: TrendingUp, description: "Key statistics and insights" },
  { id: "query", label: "Query", icon: Table, description: "Ask questions about your data" },
];

export default function DataAnalysisPage() {
  const [mode, setMode] = useState<AnalysisMode>("explore");
  const [dataInput, setDataInput] = useState("");
  const [question, setQuestion] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeMutation = trpc.dataAnalysis.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(data.analysis || "");
      setIsAnalyzing(false);
      toast.success("Analysis complete");
    },
    onError: (err) => {
      setIsAnalyzing(false);
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    if (!dataInput.trim()) {
      toast.error("Please provide data to analyze");
      return;
    }
    setIsAnalyzing(true);

    // Parse the pasted data into headers + rows for the analyze endpoint
    const lines = dataInput.trim().split("\n").filter(l => l.trim());
    const delimiter = lines[0]?.includes("\t") ? "\t" : ",";
    const headers = lines[0]?.split(delimiter).map(h => h.trim()) || [];
    const allRows = lines.slice(1).map(l => l.split(delimiter).map(c => c.trim()));
    const sampleRows = allRows.slice(0, 20);

    const modeQuestions: Record<AnalysisMode, string> = {
      explore: "Analyze this dataset: provide data structure overview, quality assessment, basic statistics, and initial observations.",
      visualize: "Suggest the best visualizations for this data. For each: chart type, axes, and key insights it would reveal.",
      summarize: "Provide executive summary, key metrics, notable trends, anomalies, and actionable recommendations.",
      query: question || "Describe this dataset.",
    };

    analyzeMutation.mutate({
      headers,
      sampleRows,
      question: modeQuestions[mode],
      totalRows: allRows.length,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Data Analysis
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload or paste data for AI-powered analysis, visualization, and insights
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Input */}
          <div className="lg:col-span-1 space-y-4">
            {/* Mode Selection */}
            <div className="space-y-1.5">
              {ANALYSIS_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    mode === m.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-card border border-border hover:border-primary/20"
                  )}
                >
                  <m.icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      mode === m.id ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        mode === m.id ? "text-primary" : "text-foreground"
                      )}
                    >
                      {m.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {m.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Data Input */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Paste your data (CSV, JSON, or table format)
              </label>
              <Textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder="Name,Revenue,Growth\nAlpha Corp,1200000,15%\nBeta Inc,890000,22%\n..."
                rows={10}
                className="resize-none font-mono text-xs"
              />
            </div>

            {/* Query input for query mode */}
            {mode === "query" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Your question
                </label>
                <Textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., Which company has the highest growth rate?"
                  rows={2}
                  className="resize-none"
                />
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={!dataInput.trim() || isAnalyzing}
              className="w-full gap-1.5"
            >
              {isAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Analyze
            </Button>
          </div>

          {/* Right: Results */}
          <div className="lg:col-span-2">
            {analysisResult ? (
              <Card>
                <CardContent className="p-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{analysisResult}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            ) : isAnalyzing ? (
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing your data...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Database className="w-7 h-7 text-primary" />
                </div>
                <h3
                  className="text-lg font-semibold text-foreground mb-1.5"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  Paste Data to Begin
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                  Paste CSV, JSON, or tabular data on the left, choose an analysis
                  mode, and click Analyze.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
