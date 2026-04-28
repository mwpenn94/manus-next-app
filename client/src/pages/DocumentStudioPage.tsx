/**
 * DocumentStudioPage — Unified document generation hub.
 * Supports: DOCX, XLSX, PDF, Diagrams, and AI-assisted generation.
 * Matches Manus pattern: clean workspace with progressive disclosure.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Table,
  Presentation,
  GitBranch,
  Sparkles,
  Download,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
  FileType,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type FormatTab = "ai" | "docx" | "xlsx" | "pdf" | "diagram";

const FORMAT_TABS: { id: FormatTab; label: string; icon: typeof FileText; description: string }[] = [
  { id: "ai", label: "AI Generate", icon: Wand2, description: "Describe what you need — AI picks the best format" },
  { id: "docx", label: "Word", icon: FileText, description: "Create structured Word documents" },
  { id: "xlsx", label: "Excel", icon: FileSpreadsheet, description: "Build spreadsheets with data" },
  { id: "pdf", label: "PDF", icon: FileType, description: "Generate styled PDF documents" },
  { id: "diagram", label: "Diagram", icon: GitBranch, description: "Create Mermaid diagrams" },
];

export default function DocumentStudioPage() {
  const [activeTab, setActiveTab] = useState<FormatTab>("ai");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [generatedFilename, setGeneratedFilename] = useState<string>("");
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Document Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Generate documents, spreadsheets, presentations, and diagrams
          </p>
        </div>

        {/* Format Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {FORMAT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setGeneratedUrl(null);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Panel */}
        <Card className="border-border">
          <CardContent className="p-6">
            {activeTab === "ai" && (
              <AIGeneratePanel
                onGenerated={(url, filename) => {
                  setGeneratedUrl(url);
                  setGeneratedFilename(filename);
                }}
              />
            )}
            {activeTab === "docx" && (
              <DocxPanel
                onGenerated={(url, filename) => {
                  setGeneratedUrl(url);
                  setGeneratedFilename(filename);
                }}
              />
            )}
            {activeTab === "xlsx" && (
              <XlsxPanel
                onGenerated={(url, filename) => {
                  setGeneratedUrl(url);
                  setGeneratedFilename(filename);
                }}
              />
            )}
            {activeTab === "pdf" && (
              <PdfPanel
                onGenerated={(url, filename) => {
                  setGeneratedUrl(url);
                  setGeneratedFilename(filename);
                }}
              />
            )}
            {activeTab === "diagram" && (
              <DiagramPanel
                onGenerated={(url, filename) => {
                  setGeneratedUrl(url);
                  setGeneratedFilename(filename);
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Generated Result */}
        {generatedUrl && (
          <Card className="mt-4 border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {generatedFilename}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Document generated successfully
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => window.open(generatedUrl, "_blank")}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = generatedUrl;
                    a.download = generatedFilename;
                    a.click();
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── AI Generate Panel ────────────────────────────────────────────────────────

function AIGeneratePanel({
  onGenerated,
}: {
  onGenerated: (url: string, filename: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"auto" | "docx" | "xlsx" | "pdf">("auto");
  const generateMutation = trpc.document.generateWithAI.useMutation({
    onSuccess: (data) => {
      onGenerated(data.url, data.filename);
      toast.success(`Document generated: ${data.filename}`);
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Describe what you need
        </label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Create a project status report with milestones table, risk assessment, and next steps..."
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {(["auto", "docx", "xlsx", "pdf"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                format === f
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "auto" ? "Auto" : f.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <Button
          onClick={() => generateMutation.mutate({ prompt, format })}
          disabled={!prompt.trim() || generateMutation.isPending}
          className="gap-1.5"
        >
          {generateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate
        </Button>
      </div>
    </div>
  );
}

// ─── DOCX Panel ───────────────────────────────────────────────────────────────

function DocxPanel({
  onGenerated,
}: {
  onGenerated: (url: string, filename: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const mutation = trpc.document.generateDocx.useMutation({
    onSuccess: (data) => {
      onGenerated(data.url, data.filename);
      toast.success("Word document created");
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter document content (paragraphs separated by blank lines)..."
        rows={8}
        className="resize-none font-mono text-sm"
      />
      <Button
        onClick={() => {
          const sections = content
            .split(/\n\n+/)
            .filter(Boolean)
            .map((block) => {
              if (block.startsWith("# "))
                return { type: "heading" as const, level: 1, text: block.slice(2) };
              if (block.startsWith("## "))
                return { type: "heading" as const, level: 2, text: block.slice(3) };
              if (block.startsWith("- "))
                return {
                  type: "list" as const,
                  items: block.split("\n").map((l) => l.replace(/^-\s*/, "")),
                };
              return { type: "paragraph" as const, text: block };
            });
          mutation.mutate({ title, sections });
        }}
        disabled={!title.trim() || !content.trim() || mutation.isPending}
        className="gap-1.5"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        Create Word Document
      </Button>
    </div>
  );
}

// ─── XLSX Panel ───────────────────────────────────────────────────────────────

function XlsxPanel({
  onGenerated,
}: {
  onGenerated: (url: string, filename: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [csvData, setCsvData] = useState("");
  const mutation = trpc.document.generateXlsx.useMutation({
    onSuccess: (data) => {
      onGenerated(data.url, data.filename);
      toast.success("Spreadsheet created");
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Spreadsheet title"
      />
      <Textarea
        value={csvData}
        onChange={(e) => setCsvData(e.target.value)}
        placeholder="Paste CSV data (first row = headers)..."
        rows={8}
        className="resize-none font-mono text-sm"
      />
      <Button
        onClick={() => {
          const lines = csvData.split("\n").filter(Boolean);
          if (lines.length < 2) return;
          const headers = lines[0].split(",").map((h) => h.trim());
          const rows = lines.slice(1).map((l) => l.split(",").map((c) => c.trim()));
          mutation.mutate({
            title,
            sheets: [{ name: "Sheet1", headers, rows }],
          });
        }}
        disabled={!title.trim() || !csvData.trim() || mutation.isPending}
        className="gap-1.5"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Table className="w-4 h-4" />
        )}
        Create Spreadsheet
      </Button>
    </div>
  );
}

// ─── PDF Panel ────────────────────────────────────────────────────────────────

function PdfPanel({
  onGenerated,
}: {
  onGenerated: (url: string, filename: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const mutation = trpc.document.generatePdf.useMutation({
    onSuccess: (data) => {
      onGenerated(data.url, data.filename);
      toast.success("PDF created");
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Document title"
      />
      <Textarea
        value={htmlContent}
        onChange={(e) => setHtmlContent(e.target.value)}
        placeholder="Enter HTML content (or plain text — it will be wrapped in styled HTML)..."
        rows={8}
        className="resize-none font-mono text-sm"
      />
      <Button
        onClick={() => {
          const html = htmlContent.includes("<")
            ? htmlContent
            : `<h1>${title}</h1>${htmlContent
                .split("\n\n")
                .map((p) => `<p>${p}</p>`)
                .join("")}`;
          mutation.mutate({ title, htmlContent: html });
        }}
        disabled={!title.trim() || !htmlContent.trim() || mutation.isPending}
        className="gap-1.5"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileType className="w-4 h-4" />
        )}
        Create PDF
      </Button>
    </div>
  );
}

// ─── Diagram Panel ────────────────────────────────────────────────────────────

function DiagramPanel({
  onGenerated,
}: {
  onGenerated: (url: string, filename: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [mermaidCode, setMermaidCode] = useState(
    "graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Action 1]\n    B -->|No| D[Action 2]\n    C --> E[End]\n    D --> E"
  );
  const [previewHtml, setPreviewHtml] = useState("");
  const mutation = trpc.document.generateDiagram.useMutation({
    onSuccess: (data) => {
      onGenerated(data.url, data.filename);
      toast.success("Diagram created");
    },
    onError: (err) => {
      toast.error(`Failed: ${err.message}`);
    },
  });

  // Generate live preview HTML
  const updatePreview = () => {
    const html = `<!DOCTYPE html><html><head><script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script><style>body{margin:0;padding:16px;background:#1a1a2e;display:flex;justify-content:center;align-items:center;min-height:100vh}.mermaid{color:#e0e0e0}</style></head><body><div class="mermaid">${mermaidCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div><script>mermaid.initialize({startOnLoad:true,theme:'dark'})<\/script></body></html>`;
    setPreviewHtml(html);
  };

  return (
    <div className="space-y-4">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Diagram title"
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Mermaid Code</p>
          <Textarea
            value={mermaidCode}
            onChange={(e) => setMermaidCode(e.target.value)}
            placeholder="Enter Mermaid diagram code..."
            rows={10}
            className="resize-none font-mono text-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={updatePreview}
            className="mt-2 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Preview
          </Button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Live Preview</p>
          {previewHtml ? (
            <div className="border border-border rounded-lg overflow-hidden" style={{ height: "260px" }}>
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full"
                sandbox="allow-scripts"
                title="Diagram Preview"
              />
            </div>
          ) : (
            <div className="border border-border rounded-lg flex items-center justify-center text-muted-foreground text-sm" style={{ height: "260px" }}>
              Click Preview to render diagram
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={() => mutation.mutate({ title, mermaidCode })}
        disabled={!title.trim() || !mermaidCode.trim() || mutation.isPending}
        className="gap-1.5"
      >
        {mutation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GitBranch className="w-4 h-4" />
        )}
        Create Diagram
      </Button>
    </div>
  );
}
