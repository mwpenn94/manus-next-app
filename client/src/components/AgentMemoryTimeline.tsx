import { useState, useMemo } from "react";
import {
  Brain,
  Clock,
  Search,
  Filter,
  Star,
  StarOff,
  Trash2,
  ChevronRight,
  MessageSquare,
  Code,
  Globe,
  FileText,
  Database,
  Image,
  Zap,
  BookOpen,
  Link2,
  Eye,
  Pin,
  PinOff,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MemoryType = "conversation" | "decision" | "learning" | "context" | "reference" | "preference";
type MemoryImportance = "critical" | "high" | "medium" | "low";

interface MemoryEntry {
  id: string;
  type: MemoryType;
  title: string;
  content: string;
  timestamp: string;
  importance: MemoryImportance;
  pinned: boolean;
  source: string;
  relatedIds: string[];
  tags: string[];
  accessCount: number;
}

const MOCK_MEMORIES: MemoryEntry[] = [
  {
    id: "mem1", type: "preference", title: "User prefers dark theme with warm accents",
    content: "The user consistently chooses dark backgrounds with amber/warm accent colors. They prefer Inter for body text and a monospace font for code. Spacing should be generous.",
    timestamp: "Ongoing", importance: "high", pinned: true, source: "Observation",
    relatedIds: ["mem3"], tags: ["design", "preference", "theme"], accessCount: 47,
  },
  {
    id: "mem2", type: "decision", title: "Architecture: tRPC + Drizzle ORM stack",
    content: "Project uses tRPC for type-safe API communication, Drizzle ORM with MySQL/TiDB for database access, and React 19 with Tailwind CSS 4 for the frontend. All procedures use superjson for serialization.",
    timestamp: "2 days ago", importance: "critical", pinned: true, source: "Project Setup",
    relatedIds: ["mem5"], tags: ["architecture", "stack", "decision"], accessCount: 123,
  },
  {
    id: "mem3", type: "learning", title: "Tailwind CSS 4 uses OKLCH color format",
    content: "Tailwind CSS v4's @theme inline blocks must use OKLCH color format instead of HSL. This was discovered when theme colors weren't applying correctly. Always convert HSL to OKLCH for theme definitions.",
    timestamp: "1 day ago", importance: "high", pinned: false, source: "Debugging Session",
    relatedIds: ["mem1"], tags: ["tailwind", "css", "colors", "gotcha"], accessCount: 18,
  },
  {
    id: "mem4", type: "conversation", title: "User wants hands-free mode with safety guards",
    content: "User requested autonomous operation capability with configurable safety guardrails. Critical actions (destructive operations, payments, deployments) should always require confirmation. Non-critical actions can proceed automatically.",
    timestamp: "3 hours ago", importance: "high", pinned: false, source: "Task Conversation",
    relatedIds: ["mem6"], tags: ["hands-free", "autonomy", "safety"], accessCount: 8,
  },
  {
    id: "mem5", type: "context", title: "Database schema: 15 tables with user roles",
    content: "The database includes users (with admin/user roles), tasks, projects, webapp_projects, scheduled_tasks, payments, and related tables. The user table has openId for OAuth, role for RBAC, and stripeCustomerId for payments.",
    timestamp: "1 day ago", importance: "critical", pinned: true, source: "Schema Analysis",
    relatedIds: ["mem2"], tags: ["database", "schema", "roles"], accessCount: 89,
  },
  {
    id: "mem6", type: "reference", title: "Stripe integration: test mode with sandbox",
    content: "Stripe is configured in test mode. Use card 4242 4242 4242 4242 for testing. Webhook endpoint at /api/stripe/webhook. Test events start with evt_test_. Must return {verified: true} for test events.",
    timestamp: "1 day ago", importance: "medium", pinned: false, source: "Integration Docs",
    relatedIds: [], tags: ["stripe", "payments", "testing"], accessCount: 12,
  },
  {
    id: "mem7", type: "learning", title: "Never store images in client/public/",
    content: "Local media files in the project directory cause deployment timeouts. Always use manus-upload-file --webdev to upload assets and use the returned CDN URL. Store originals in /home/ubuntu/webdev-static-assets/.",
    timestamp: "2 days ago", importance: "high", pinned: true, source: "Deployment Issue",
    relatedIds: [], tags: ["deployment", "assets", "gotcha"], accessCount: 34,
  },
  {
    id: "mem8", type: "preference", title: "User values recursive optimization methodology",
    content: "The user follows a 'recursive optimization converged' methodology. Each component and feature should go through multiple refinement passes. Quality is prioritized over speed. The convergence document should be referenced for each prompt.",
    timestamp: "Ongoing", importance: "critical", pinned: true, source: "Project Instructions",
    relatedIds: [], tags: ["methodology", "quality", "optimization"], accessCount: 156,
  },
];

function getTypeIcon(type: MemoryType): React.JSX.Element {
  switch (type) {
    case "conversation": return <MessageSquare className="w-4 h-4 text-blue-400" />;
    case "decision": return <Zap className="w-4 h-4 text-amber-400" />;
    case "learning": return <BookOpen className="w-4 h-4 text-green-400" />;
    case "context": return <Layers className="w-4 h-4 text-purple-400" />;
    case "reference": return <Link2 className="w-4 h-4 text-cyan-400" />;
    case "preference": return <Star className="w-4 h-4 text-pink-400" />;
  }
}

function getImportanceColor(importance: MemoryImportance): string {
  switch (importance) {
    case "critical": return "border-l-red-500";
    case "high": return "border-l-amber-500";
    case "medium": return "border-l-blue-500";
    case "low": return "border-l-muted";
  }
}

export default function AgentMemoryTimeline(): React.JSX.Element {
  const [memories, setMemories] = useState<MemoryEntry[]>(MOCK_MEMORIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<MemoryType | "all">("all");
  const [selectedMemory, setSelectedMemory] = useState<string | null>(null);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = memories;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.content.toLowerCase().includes(q) ||
        m.tags.some((t) => t.includes(q))
      );
    }
    if (typeFilter !== "all") {
      result = result.filter((m) => m.type === typeFilter);
    }
    if (showPinnedOnly) {
      result = result.filter((m) => m.pinned);
    }
    return result;
  }, [memories, searchQuery, typeFilter, showPinnedOnly]);

  const selected = memories.find((m) => m.id === selectedMemory);

  const handleTogglePin = (id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const stats = useMemo(() => ({
    total: memories.length,
    pinned: memories.filter((m) => m.pinned).length,
    critical: memories.filter((m) => m.importance === "critical").length,
  }), [memories]);

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Agent Memory</h2>
            <p className="text-xs text-muted-foreground">
              {stats.total} memories, {stats.pinned} pinned, {stats.critical} critical
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPinnedOnly(!showPinnedOnly)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors",
            showPinnedOnly ? "bg-amber-500/10 text-amber-500" : "bg-muted hover:bg-accent text-muted-foreground"
          )}
        >
          <Pin className="w-3.5 h-3.5" />
          Pinned
        </button>
      </div>

      {/* Search & Filter */}
      <div className="px-5 py-3 border-b border-border">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-1">
          {(["all", "conversation", "decision", "learning", "context", "reference", "preference"] as const).map((type) => (
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
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Memory List */}
        <div className={cn("overflow-y-auto", selected ? "w-80 border-r border-border" : "flex-1")}>
          {filtered.map((memory) => (
            <button
              key={memory.id}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-border/50 border-l-2 transition-colors",
                getImportanceColor(memory.importance),
                selectedMemory === memory.id ? "bg-primary/5" : "hover:bg-accent/30"
              )}
              onClick={() => setSelectedMemory(memory.id)}
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">{getTypeIcon(memory.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{memory.title}</span>
                    {memory.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{memory.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {memory.timestamp}
                    </span>
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <Eye className="w-2.5 h-2.5" />
                      {memory.accessCount}
                    </span>
                  </div>
                </div>
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
                  <h3 className="text-base font-semibold">{selected.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full capitalize",
                      selected.importance === "critical" ? "bg-red-500/10 text-red-500" :
                      selected.importance === "high" ? "bg-amber-500/10 text-amber-500" :
                      selected.importance === "medium" ? "bg-blue-500/10 text-blue-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {selected.importance}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{selected.type}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleTogglePin(selected.id)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
              >
                {selected.pinned ? (
                  <Pin className="w-4 h-4 text-amber-500" />
                ) : (
                  <PinOff className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>

            {/* Content */}
            <div className="p-4 rounded-lg bg-card border border-border text-xs leading-relaxed mb-5">
              {selected.content}
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Source</span>
                <span className="text-xs font-medium">{selected.source}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Access Count</span>
                <span className="text-xs font-medium">{selected.accessCount} times</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Timestamp</span>
                <span className="text-xs font-medium">{selected.timestamp}</span>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-[10px] text-muted-foreground block">Related</span>
                <span className="text-xs font-medium">{selected.relatedIds.length} memories</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h4 className="text-xs font-medium mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1.5">
                {selected.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
