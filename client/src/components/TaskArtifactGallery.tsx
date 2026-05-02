import { useState, useMemo, useCallback } from "react";
import {
  FileText,
  Image,
  Code,
  Globe,
  Download,
  ExternalLink,
  Eye,
  Grid3X3,
  List,
  Search,
  Filter,
  Clock,
  HardDrive,
  FileCode,
  FileSpreadsheet,
  FileImage,
  Film,
  Music,
  Archive,
  Presentation,
  Star,
  StarOff,
  ChevronRight,
  Copy,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ArtifactType = "code" | "document" | "image" | "website" | "data" | "presentation" | "video" | "audio" | "archive";
type ArtifactStatus = "ready" | "generating" | "error";

interface Artifact {
  id: string;
  name: string;
  type: ArtifactType;
  description: string;
  size: string;
  createdAt: string;
  status: ArtifactStatus;
  preview?: string;
  language?: string;
  starred: boolean;
  downloadUrl?: string;
  taskStep: string;
}

const MOCK_ARTIFACTS: Artifact[] = [
  {
    id: "a1", name: "dashboard-component.tsx", type: "code", description: "React dashboard component with real-time charts",
    size: "12.4 KB", createdAt: "2 min ago", status: "ready", language: "TypeScript", starred: true, taskStep: "Code Generation",
    preview: "import { useState, useEffect } from 'react';\nimport { LineChart, Line, XAxis } from 'recharts';\n\nexport default function Dashboard() {\n  const [data, setData] = useState([]);\n  ...",
  },
  {
    id: "a2", name: "api-documentation.md", type: "document", description: "Comprehensive API documentation with examples",
    size: "8.7 KB", createdAt: "5 min ago", status: "ready", starred: false, taskStep: "Documentation",
    preview: "# API Documentation\n\n## Authentication\nAll API requests require a Bearer token...\n\n## Endpoints\n### GET /api/users\nReturns a list of users...",
  },
  {
    id: "a3", name: "hero-banner.png", type: "image", description: "Generated hero banner for landing page",
    size: "2.1 MB", createdAt: "8 min ago", status: "ready", starred: true, taskStep: "Image Generation",
    preview: "https://placehold.co/800x400/1a1a2e/eee?text=Hero+Banner",
  },
  {
    id: "a4", name: "landing-page", type: "website", description: "Complete landing page with responsive design",
    size: "45 KB", createdAt: "12 min ago", status: "ready", starred: true, taskStep: "Web Development",
    preview: "https://placehold.co/800x600/0a0a1a/eee?text=Landing+Page+Preview",
  },
  {
    id: "a5", name: "analytics-report.csv", type: "data", description: "Monthly analytics data export with 5,000 rows",
    size: "1.8 MB", createdAt: "15 min ago", status: "ready", starred: false, taskStep: "Data Analysis",
    preview: "date,pageviews,sessions,bounce_rate\n2024-01-01,12450,8920,42.3%\n2024-01-02,13200,9100,41.8%\n...",
  },
  {
    id: "a6", name: "quarterly-review.pptx", type: "presentation", description: "Q1 quarterly review presentation with 24 slides",
    size: "5.2 MB", createdAt: "20 min ago", status: "ready", starred: false, taskStep: "Presentation",
    preview: "https://placehold.co/800x450/1a1a2e/eee?text=Quarterly+Review",
  },
  {
    id: "a7", name: "product-demo.mp4", type: "video", description: "60-second product demo video",
    size: "18.5 MB", createdAt: "25 min ago", status: "generating", starred: false, taskStep: "Video Generation",
  },
  {
    id: "a8", name: "notification-sound.mp3", type: "audio", description: "Custom notification chime",
    size: "124 KB", createdAt: "30 min ago", status: "ready", starred: false, taskStep: "Audio Generation",
  },
];

function getTypeIcon(type: ArtifactType): React.JSX.Element {
  switch (type) {
    case "code": return <FileCode className="w-4 h-4 text-yellow-400" />;
    case "document": return <FileText className="w-4 h-4 text-blue-400" />;
    case "image": return <FileImage className="w-4 h-4 text-green-400" />;
    case "website": return <Globe className="w-4 h-4 text-purple-400" />;
    case "data": return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    case "presentation": return <Presentation className="w-4 h-4 text-orange-400" />;
    case "video": return <Film className="w-4 h-4 text-red-400" />;
    case "audio": return <Music className="w-4 h-4 text-pink-400" />;
    case "archive": return <Archive className="w-4 h-4 text-muted-foreground" />;
  }
}

function getTypeBg(type: ArtifactType): string {
  switch (type) {
    case "code": return "bg-yellow-500/10";
    case "document": return "bg-blue-500/10";
    case "image": return "bg-green-500/10";
    case "website": return "bg-purple-500/10";
    case "data": return "bg-emerald-500/10";
    case "presentation": return "bg-orange-500/10";
    case "video": return "bg-red-500/10";
    case "audio": return "bg-pink-500/10";
    case "archive": return "bg-muted";
  }
}

export default function TaskArtifactGallery(): React.JSX.Element {
  const [artifacts, setArtifacts] = useState<Artifact[]>(MOCK_ARTIFACTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArtifactType | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = artifacts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") {
      result = result.filter((a) => a.type === typeFilter);
    }
    return result;
  }, [artifacts, searchQuery, typeFilter]);

  const selected = artifacts.find((a) => a.id === selectedArtifact);

  const handleToggleStar = useCallback((id: string) => {
    setArtifacts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, starred: !a.starred } : a))
    );
  }, []);

  const stats = useMemo(() => ({
    total: artifacts.length,
    totalSize: "93.8 MB",
    ready: artifacts.filter((a) => a.status === "ready").length,
  }), [artifacts]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Archive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Task Artifacts</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} artifacts, {stats.totalSize} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors">
            <Download className="w-3.5 h-3.5" />
            Download All
          </button>
          <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "grid" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn("p-1.5 rounded-md transition-colors", viewMode === "list" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search artifacts..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {(["all", "code", "document", "image", "website", "data", "presentation"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-2 py-1 text-[10px] rounded-md transition-colors capitalize whitespace-nowrap",
                typeFilter === type ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Artifact Grid/List */}
        <div className={cn("overflow-y-auto p-4", selected ? "w-[55%] border-r border-border" : "flex-1")}>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((artifact) => (
                <button
                  key={artifact.id}
                  className={cn(
                    "text-left rounded-xl border overflow-hidden transition-all hover:shadow-md",
                    selectedArtifact === artifact.id ? "border-primary/30 ring-1 ring-primary/20" : "border-border hover:border-primary/20"
                  )}
                  onClick={() => setSelectedArtifact(artifact.id)}
                >
                  {/* Preview Thumbnail */}
                  <div className={cn("h-28 flex items-center justify-center", getTypeBg(artifact.type))}>
                    {artifact.status === "generating" ? (
                      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    ) : artifact.preview && (artifact.type === "image" || artifact.type === "website" || artifact.type === "presentation") ? (
                      <img src={artifact.preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                        {getTypeIcon(artifact.type)}
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3 bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(artifact.type)}
                      <span className="text-xs font-medium truncate">{artifact.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{artifact.description}</p>
                    <div className="flex items-center justify-between mt-2 text-[9px] text-muted-foreground">
                      <span>{artifact.size}</span>
                      <span>{artifact.createdAt}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((artifact) => (
                <button
                  key={artifact.id}
                  className={cn(
                    "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    selectedArtifact === artifact.id ? "bg-primary/5" : "hover:bg-accent/30"
                  )}
                  onClick={() => setSelectedArtifact(artifact.id)}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", getTypeBg(artifact.type))}>
                    {artifact.status === "generating" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : (
                      getTypeIcon(artifact.type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{artifact.name}</span>
                      {artifact.starred && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{artifact.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-muted-foreground">
                    <span>{artifact.size}</span>
                    <span>{artifact.createdAt}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", getTypeBg(selected.type))}>
                  {getTypeIcon(selected.type)}
                </div>
                <div>
                  <h3 className="text-base font-semibold">{selected.name}</h3>
                  <p className="text-xs text-muted-foreground">{selected.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggleStar(selected.id)}
                  className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                >
                  {selected.starred ? (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  ) : (
                    <Star className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Size</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                  {selected.size}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Created</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  {selected.createdAt}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Type</span>
                <span className="text-sm font-medium capitalize">{selected.type}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Task Step</span>
                <span className="text-sm font-medium">{selected.taskStep}</span>
              </div>
            </div>

            {/* Preview */}
            {selected.preview && (
              <div>
                <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  Preview
                </h4>
                {selected.type === "code" || selected.type === "document" || selected.type === "data" ? (
                  <div className="relative">
                    <pre className="p-4 rounded-lg bg-[#0d1117] border border-border text-xs text-green-400 font-mono overflow-x-auto leading-relaxed max-h-64">
                      {selected.preview}
                    </pre>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selected.preview || "").catch(() => {});
                        setCopiedId(selected.id);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/50 hover:bg-background text-muted-foreground transition-colors"
                    >
                      {copiedId === selected.id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img src={selected.preview} alt={selected.name} className="w-full" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
