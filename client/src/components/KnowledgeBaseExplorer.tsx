import { useState, useMemo, useCallback } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  FileText,
  Globe,
  Database,
  Code,
  Tag,
  Clock,
  Star,
  StarOff,
  ChevronRight,
  ExternalLink,
  Filter,
  Upload,
  Loader2,
  Eye,
  MessageSquare,
  Brain,
  Layers,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

type KnowledgeType = "document" | "webpage" | "code" | "api" | "dataset" | "conversation";
type KnowledgeStatus = "indexed" | "processing" | "error" | "stale";

interface KnowledgeEntry {
  id: string;
  title: string;
  type: KnowledgeType;
  source: string;
  status: KnowledgeStatus;
  addedAt: string;
  lastAccessed: string;
  size: string;
  tags: string[];
  starred: boolean;
  relevanceScore: number;
  excerpt: string;
  chunks: number;
}

const MOCK_ENTRIES: KnowledgeEntry[] = [
  {
    id: "k1",
    title: "React 19 Migration Guide",
    type: "webpage",
    source: "react.dev",
    status: "indexed",
    addedAt: "2 hours ago",
    lastAccessed: "5 min ago",
    size: "24 KB",
    tags: ["react", "migration", "frontend"],
    starred: true,
    relevanceScore: 0.95,
    excerpt: "React 19 introduces several new APIs including useOptimistic, useActionState, and the use() hook for reading resources in render...",
    chunks: 12,
  },
  {
    id: "k2",
    title: "Project Architecture Documentation",
    type: "document",
    source: "docs/architecture.md",
    status: "indexed",
    addedAt: "1 day ago",
    lastAccessed: "30 min ago",
    size: "18 KB",
    tags: ["architecture", "internal", "design"],
    starred: true,
    relevanceScore: 0.92,
    excerpt: "The application follows a modular architecture with tRPC for type-safe API communication, Drizzle ORM for database access...",
    chunks: 8,
  },
  {
    id: "k3",
    title: "Tailwind CSS v4 Documentation",
    type: "webpage",
    source: "tailwindcss.com",
    status: "indexed",
    addedAt: "3 days ago",
    lastAccessed: "1 hour ago",
    size: "156 KB",
    tags: ["css", "tailwind", "styling"],
    starred: false,
    relevanceScore: 0.88,
    excerpt: "Tailwind CSS v4 introduces a new engine built on Rust, with significant performance improvements and a simplified configuration...",
    chunks: 45,
  },
  {
    id: "k4",
    title: "Database Schema Reference",
    type: "code",
    source: "drizzle/schema.ts",
    status: "indexed",
    addedAt: "5 hours ago",
    lastAccessed: "15 min ago",
    size: "8 KB",
    tags: ["database", "schema", "drizzle"],
    starred: false,
    relevanceScore: 0.91,
    excerpt: "export const users = mysqlTable('users', { id: int('id').primaryKey().autoincrement(), openId: varchar('open_id', { length: 255 })...",
    chunks: 4,
  },
  {
    id: "k5",
    title: "Stripe Integration Patterns",
    type: "document",
    source: "stripe.com/docs",
    status: "indexed",
    addedAt: "1 week ago",
    lastAccessed: "2 hours ago",
    size: "42 KB",
    tags: ["stripe", "payments", "integration"],
    starred: false,
    relevanceScore: 0.85,
    excerpt: "Checkout Sessions provide a hosted payment page that handles the complexity of collecting payment details securely...",
    chunks: 18,
  },
  {
    id: "k6",
    title: "API Response Formats Dataset",
    type: "dataset",
    source: "internal/api-samples.json",
    status: "processing",
    addedAt: "10 min ago",
    lastAccessed: "Never",
    size: "2.3 MB",
    tags: ["api", "data", "samples"],
    starred: false,
    relevanceScore: 0,
    excerpt: "Processing... 67% complete",
    chunks: 0,
  },
  {
    id: "k7",
    title: "Previous Task Conversation",
    type: "conversation",
    source: "Task #42: Build Dashboard",
    status: "indexed",
    addedAt: "3 hours ago",
    lastAccessed: "1 hour ago",
    size: "12 KB",
    tags: ["conversation", "dashboard", "context"],
    starred: false,
    relevanceScore: 0.78,
    excerpt: "User requested a real-time analytics dashboard with WebSocket support. Key decisions: used recharts for visualization, implemented...",
    chunks: 6,
  },
];

function getTypeIcon(type: KnowledgeType): React.JSX.Element {
  switch (type) {
    case "document": return <FileText className="w-4 h-4 text-blue-400" />;
    case "webpage": return <Globe className="w-4 h-4 text-green-400" />;
    case "code": return <Code className="w-4 h-4 text-yellow-400" />;
    case "api": return <Layers className="w-4 h-4 text-purple-400" />;
    case "dataset": return <Database className="w-4 h-4 text-orange-400" />;
    case "conversation": return <MessageSquare className="w-4 h-4 text-cyan-400" />;
  }
}

function getStatusIndicator(status: KnowledgeStatus): React.JSX.Element {
  switch (status) {
    case "indexed": return <div className="w-2 h-2 rounded-full bg-green-500" />;
    case "processing": return <Loader2 className="w-3 h-3 text-amber-500 animate-spin" />;
    case "error": return <div className="w-2 h-2 rounded-full bg-red-500" />;
    case "stale": return <div className="w-2 h-2 rounded-full bg-amber-500" />;
  }
}

export default function KnowledgeBaseExplorer(): React.JSX.Element {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(MOCK_ENTRIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | "all">("all");
  const [sortBy, setSortBy] = useState<"relevance" | "recent" | "name">("relevance");
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        e.title.toLowerCase().includes(q) ||
        e.tags.some((t) => t.includes(q)) ||
        e.excerpt.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((e) => e.type === typeFilter);
    }
    if (showStarredOnly) {
      result = result.filter((e) => e.starred);
    }
    switch (sortBy) {
      case "relevance":
        return [...result].sort((a, b) => b.relevanceScore - a.relevanceScore);
      case "recent":
        return result;
      case "name":
        return [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [entries, searchQuery, typeFilter, sortBy, showStarredOnly]);

  const selected = entries.find((e) => e.id === selectedEntry);

  const handleToggleStar = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedEntry === id) setSelectedEntry(null);
  }, [selectedEntry]);

  const stats = useMemo(() => ({
    total: entries.length,
    indexed: entries.filter((e) => e.status === "indexed").length,
    totalChunks: entries.reduce((s, e) => s + e.chunks, 0),
  }), [entries]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Knowledge Base</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} sources, {stats.totalChunks} chunks indexed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-muted hover:bg-accent transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <button
            onClick={() => setShowStarredOnly(!showStarredOnly)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showStarredOnly ? "bg-amber-500/10 text-amber-500" : "hover:bg-accent text-muted-foreground"
            )}
          >
            <Star className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(["all", "document", "webpage", "code", "dataset", "conversation"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={cn(
                  "px-2 py-1 text-[10px] rounded-md transition-colors capitalize",
                  typeFilter === type ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as typeof sortBy)}
            className="text-[10px] bg-transparent text-muted-foreground border-0 focus:outline-none cursor-pointer"
          >
            <option value="relevance">By Relevance</option>
            <option value="recent">By Recent</option>
            <option value="name">By Name</option>
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Entry List */}
        <div className={cn("overflow-y-auto", selected ? "w-80 border-r border-border" : "flex-1")}>
          {filteredEntries.map((entry) => (
            <button
              key={entry.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 transition-colors",
                selectedEntry === entry.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedEntry(entry.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">{getTypeIcon(entry.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{entry.title}</span>
                    {getStatusIndicator(entry.status)}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{entry.source}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{entry.excerpt}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {entry.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                    {entry.relevanceScore > 0 && (
                      <span className="text-[9px] text-primary ml-auto">{Math.round(entry.relevanceScore * 100)}% match</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleToggleStar(entry.id);
                  }}
                  className="shrink-0 p-1"
                >
                  {entry.starred ? (
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  ) : (
                    <StarOff className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
                  )}
                </button>
              </div>
            </button>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                {getTypeIcon(selected.type)}
                <div>
                  <h3 className="text-lg font-semibold">{selected.title}</h3>
                  <p className="text-xs text-muted-foreground">{selected.source}</p>
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
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {getStatusIndicator(selected.status)}
                  <span className="text-xs capitalize">{selected.status}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground">Chunks</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs">{selected.chunks} chunks</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground">Size</span>
                <span className="text-xs block mt-1">{selected.size}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground">Last Accessed</span>
                <span className="text-xs block mt-1">{selected.lastAccessed}</span>
              </div>
            </div>

            {/* Tags */}
            <div className="mb-5">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Content Preview */}
            <div>
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                Content Preview
              </h4>
              <div className="p-4 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground leading-relaxed">
                {selected.excerpt}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
