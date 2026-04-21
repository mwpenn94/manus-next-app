/**
 * AppLayout — Real-Wired Three-Panel Layout
 *
 * LEFT:   Task sidebar (280px) — real task list from DB, server-side search,
 *         status filter tabs, favorite indicators, archive/delete
 * CENTER: Main content area (flexible) — home or chat view
 * RIGHT:  Contextual — nothing on home, workspace on task view
 *
 * Auth-aware: Shows user avatar, login/logout, persisted tasks
 * Mobile: Responsive sidebar drawer with overlay, stacked workspace, touch UX
 * Bridge: Real-time connection status indicator in sidebar footer
 */
import { useState, useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTask } from "@/contexts/TaskContext";
import { useBridge } from "@/contexts/BridgeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import MobileBottomNav from "@/components/MobileBottomNav";
import NotificationCenter from "@/components/NotificationCenter";
import NetworkBanner from "@/components/NetworkBanner";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSWUpdate } from "@/hooks/useSWUpdate";
import {
  Search,
  Plus,
  Settings,
  CreditCard,
  PanelLeftClose,
  PanelLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  LogIn,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  Star,
  Trash2,
  Filter,
  Brain,
  Clock as ClockIcon,
  Film,
  Video,
  FolderOpen,
  Paintbrush,
  Presentation,
  Puzzle,
  FileText,
  Plug,
  Wrench,
  Users,
  Monitor,
  MessageSquare,
  Sparkles,
  Coins,
  GitBranch,
  BookOpen,
  BarChart3,
  Sun,
  Moon,
  Globe,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-foreground/70" />;
    case "error":
      return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function UserInitials({ name }: { name: string | null | undefined }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";
  return (
    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-foreground">
      {initials}
    </div>
  );
}

function BridgeStatusBadge() {
  const { status, quality } = useBridge();
  if (status === "disconnected") return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-1 rounded-md bg-sidebar-accent/50">
      {status === "connected" ? (
        <Wifi className="w-3 h-3 text-foreground/70" />
      ) : status === "connecting" ? (
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-400" />
      )}
      <span
        className={cn(
          "text-[10px]",
          status === "connected"
            ? "text-foreground/70"
            : status === "connecting"
            ? "text-muted-foreground"
            : "text-foreground/40"
        )}
      >
        Bridge{" "}
        {status === "connected"
          ? `connected${quality.latencyMs ? ` · ${quality.latencyMs}ms` : ""}`
          : status === "connecting"
          ? "connecting..."
          : "error"}
      </span>
    </div>
  );
}

type StatusFilter = "all" | "running" | "completed" | "error";

// ── Sidebar status badges ──

function ConnectorStatusBadge() {
  const connectors = trpc.connector.list.useQuery(undefined, { staleTime: 60_000 });
  const connected = connectors.data?.filter((c: any) => c.status === "connected").length ?? 0;
  if (!connected) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70 font-medium">
      {connected}
    </span>
  );
}

function GitHubStatusBadge() {
  const repos = trpc.github.repos.useQuery(undefined, { staleTime: 60_000 });
  const count = repos.data?.length ?? 0;
  if (!count) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-foreground/70 font-medium">
      {count}
    </span>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  useSWUpdate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewTask: () => {
      setActiveTask(null);
      navigate("/");
    },
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [location, navigate] = useLocation();
  const { tasks, activeTaskId, setActiveTask } = useTask();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { preference, theme, cycleTheme } = useTheme();

  // Server-side search when query is long enough
  const searchEnabled = isAuthenticated && searchQuery.trim().length >= 2;
  const serverSearch = trpc.task.search.useQuery(
    {
      query: searchQuery.trim(),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
      ...(statusFilter !== "all" ? { statusFilter } : {}),
    },
    { enabled: searchEnabled, placeholderData: (prev: any) => prev }
  );

  // Archive mutation
  const utils = trpc.useUtils();
  const archiveMutation = trpc.task.archive.useMutation({
    onSuccess: () => {
      setConfirmDeleteId(null);
      // Invalidate the task list cache so the archived task disappears
      utils.task.list.invalidate();
      utils.task.search.invalidate();
    },
    onError: () => { toast.error("Failed to delete task"); },
  });

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location]);

  // Close mobile drawer on resize to desktop
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 768) setMobileDrawerOpen(false);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

  // Determine displayed tasks: server search results or local filtered list
  const displayedTasks = (() => {
    // If searching and server results are available, use them
    if (searchEnabled && serverSearch.data) {
      const serverResults = serverSearch.data.map((st: any) => ({
        id: st.externalId,
        title: st.title,
        status: st.status,
        updatedAt: new Date(st.updatedAt),
        favorite: st.favorite,
        source: "server" as const,
      }));
      if (statusFilter !== "all") {
        return serverResults.filter((t: any) => t.status === statusFilter);
      }
      return serverResults;
    }

    // Otherwise, filter local tasks
    let filtered = tasks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter((t) => t.createdAt >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      filtered = filtered.filter((t) => t.createdAt <= to);
    }
    return filtered.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      updatedAt: t.updatedAt,
      favorite: 0,
      source: "local" as const,
    }));
  })();

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleDeleteTask = (externalId: string) => {
    archiveMutation.mutate({ externalId });
    if (activeTaskId === externalId) {
      setActiveTask(null);
      navigate("/");
    }
  };

  const statusFilters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: tasks.length },
    { id: "running", label: "Running", count: tasks.filter(t => t.status === "running").length },
    { id: "completed", label: "Done", count: tasks.filter(t => t.status === "completed").length },
    { id: "error", label: "Error", count: tasks.filter(t => t.status === "error").length },
  ];

  const sidebarContent = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-lg" role="img" aria-label="Manus Next">
            🐾
          </span>
          <span
            className="text-[15px] font-semibold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            manus next
          </span>
        </Link>
        <button
          onClick={() => {
            setSidebarOpen(false);
            setMobileDrawerOpen(false);
          }}
          className="p-2.5 md:p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="w-4 h-4 hidden md:block" />
          <X className="w-4 h-4 md:hidden" />
        </button>
      </div>

      {/* Credits Counter + Model Badge — Gap 1 & 2 */}
      <div className="px-3 pt-2 pb-1 shrink-0 flex items-center gap-2">
        <Link
          href="/billing"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors group flex-1 min-w-0"
          title="View usage & billing"
        >
          <Coins className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-sidebar-foreground tabular-nums">
            {isAuthenticated ? `${((tasks.filter(t => t.status === "completed").length * 150) + (tasks.filter(t => t.status === "running").length * 50)).toLocaleString()}` : "--"}
          </span>
          <span className="text-[10px] text-muted-foreground">credits</span>
        </Link>
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-md bg-muted border border-border shrink-0" title="Current model tier">
          <Sparkles className="w-3 h-3 text-foreground" />
          <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">v2.0</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks & messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 md:h-8 pl-8 pr-10 text-sm bg-sidebar-accent rounded-md border-0 text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={cn(
                "p-0.5 rounded transition-colors",
                showDateFilter || dateFrom || dateTo
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Date range filter"
            >
              <Filter className="w-3 h-3" />
            </button>
          </div>
        </div>
        {/* Date range filter */}
        {showDateFilter && (
          <div className="mt-2 flex gap-1.5 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 h-7 px-2 text-[10px] bg-sidebar-accent rounded border-0 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
              placeholder="From"
            />
            <span className="text-[10px] text-muted-foreground">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 h-7 px-2 text-[10px] bg-sidebar-accent rounded border-0 text-sidebar-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Filter Tabs */}
      <div className="px-3 pb-2 shrink-0">
        <div className="flex gap-0.5 bg-sidebar-accent/50 rounded-md p-0.5">
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                "flex-1 text-[10px] py-2 md:py-1.5 rounded transition-colors font-medium min-h-[36px] flex items-center justify-center",
                statusFilter === f.id
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                  : "text-muted-foreground hover:text-sidebar-foreground"
              )}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && statusFilter !== f.id && (
                <span className="ml-0.5 text-muted-foreground">{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* New Task Button */}
      <div className="px-3 pb-2 shrink-0">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 h-10 md:h-9 text-sm bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent active:scale-[0.98] transition-all"
          onClick={() => {
            setActiveTask(null);
            navigate("/");
            setMobileDrawerOpen(false);
          }}
        >
          <Plus className="w-4 h-4" />
          New task
          <kbd className="ml-auto text-[10px] text-muted-foreground bg-sidebar-accent px-1.5 py-0.5 rounded font-mono hidden md:inline">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 overscroll-contain">
        {searchEnabled && serverSearch.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Searching...</span>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="text-3xl mb-3 opacity-40" aria-hidden="true">
              {searchQuery ? "🔍" : statusFilter !== "all" ? "📋" : "📋"}
            </div>
            <p className="text-xs">
              {searchQuery
                ? "No matching tasks found"
                : statusFilter !== "all"
                ? `No ${statusFilter} tasks`
                : "Create a new task to get started"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayedTasks.map((task) => (
              <div key={task.id} className="group relative">
                <button
                  onClick={() => {
                    setActiveTask(task.id);
                    navigate(`/task/${task.id}`);
                    setMobileDrawerOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 md:py-2.5 rounded-lg transition-all active:scale-[0.98]",
                    activeTaskId === task.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Manus-style status dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.status === "running" && "bg-foreground animate-pulse",
                        task.status === "completed" && "bg-foreground/70",
                        task.status === "error" && "bg-red-400",
                        task.status !== "running" && task.status !== "completed" && task.status !== "error" && "bg-muted-foreground/40"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-[13px] font-medium truncate leading-tight flex-1">
                          {task.title}
                        </p>
                        {task.favorite === 1 && (
                          <Star className="w-3 h-3 text-foreground fill-foreground shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeAgo(task.updatedAt)}
                        </span>
                        {task.status === "running" && (
                          <span className="text-[9px] px-1.5 py-px rounded-full bg-muted text-foreground font-medium">
                            In progress
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                {/* Delete button on hover */}
                {isAuthenticated && (
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {confirmDeleteId === task.id ? (
                      <div className="flex gap-1 bg-popover border border-border rounded-md shadow-lg p-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                          className="text-[10px] px-2 py-1 bg-destructive text-destructive-foreground rounded hover:opacity-90"
                        >
                          Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="text-[10px] px-2 py-1 bg-muted text-foreground rounded hover:bg-accent"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(task.id);
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete task"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bridge Status */}
      <BridgeStatusBadge />

      {/* Sidebar Footer — Nav links (scrollable) */}
      <div className="border-t border-sidebar-border p-2 space-y-0.5 overflow-y-auto flex-1 min-h-0">
        {/* Section: Manus Next */}
        <div className="px-3 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" aria-label="Section: Manus Next">Manus Next</span>
        </div>
        <Link
          href="/analytics"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/analytics"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </Link>
        <Link
          href="/memory"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/memory"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Brain className="w-4 h-4" />
          Memory
        </Link>
        <Link
          href="/projects"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/projects" || location.startsWith("/project/")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Projects
        </Link>
        <Link
          href="/library"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/library"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <BookOpen className="w-4 h-4" />
          Library
        </Link>
        <Link
          href="/schedule"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/schedule"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <ClockIcon className="w-4 h-4" />
          Schedules
        </Link>
        <Link
          href="/replay"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/replay"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Film className="w-4 h-4" />
          Replay
        </Link>
        <Link
          href="/skills"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/skills"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Puzzle className="w-4 h-4" />
          Skills
        </Link>
        <Link
          href="/slides"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/slides"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Presentation className="w-4 h-4" />
          Slides
        </Link>
        <Link
          href="/design"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/design"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Paintbrush className="w-4 h-4" />
          Design
        </Link>
        <Link
          href="/meetings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/meetings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <FileText className="w-4 h-4" />
          Meetings
        </Link>
        <Link
          href="/connectors"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/connectors"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Plug className="w-4 h-4" />
          <span className="flex-1">Connectors</span>
          <ConnectorStatusBadge />
        </Link>
        <Link
          href="/github"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location.startsWith("/github")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <GitBranch className="w-4 h-4" />
          <span className="flex-1">GitHub</span>
          <GitHubStatusBadge />
        </Link>
        <Link
          href="/webapp-builder"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/webapp-builder"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Wrench className="w-4 h-4" />
          App Builder
        </Link>
        <Link
          href="/team"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/team"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Users className="w-4 h-4" />
          Team
        </Link>
        <Link
          href="/computer"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/computer"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Monitor className="w-4 h-4" />
          Computer
        </Link>
        <Link
          href="/figma-import"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/figma-import"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Paintbrush className="w-4 h-4" />
          Figma Import
        </Link>
        <Link
          href="/desktop-app"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/desktop-app"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Wrench className="w-4 h-4" />
          Desktop App
        </Link>
        {/* Section: Other */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" aria-label="Section: Other">Other</span>
        </div>
        <Link
          href="/messaging"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/messaging"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Messaging
        </Link>
        <Link
          href="/mail"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/mail"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          Mail Manus
        </Link>
        <Link
          href="/deployments"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/deployments"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Globe className="w-4 h-4" />
          Deployed Websites
        </Link>
        <Link
          href="/data-controls"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/data-controls"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Shield className="w-4 h-4" />
          Data Controls
        </Link>
        <Link
          href="/video"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/video"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Video className="w-4 h-4" />
          Video
        </Link>
        {/* Section: General */}
        <div className="px-3 pt-3 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground" aria-label="Section: General">General</span>
        </div>
        <Link
          href="/discover"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/discover"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Discover
        </Link>
        <Link
          href="/webhooks"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/webhooks"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Plug className="w-4 h-4" />
          Integrations
        </Link>
        <Link
          href="/billing"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/billing"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Usage & Billing
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm transition-colors active:scale-[0.98]",
            location === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      {/* Referral/Invite Banner — Manus parity */}
      {isAuthenticated && (
        <div className="mx-2 mb-1 p-2.5 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer hover:bg-sidebar-accent transition-colors"
          onClick={() => { navigator.clipboard.writeText(window.location.origin); toast.success("Invite link copied!"); }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-sidebar-foreground">Share with a friend</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 ml-5.5">Get 500 credits each</p>
        </div>
      )}

      {/* Auth Section — pinned at bottom, never scrolls away */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        {authLoading ? (
          <div className="flex items-center gap-2.5 px-3 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 px-3 py-2.5 md:py-2">
            <button onClick={() => navigate("/profile")} className="shrink-0 hover:opacity-80 transition-opacity" title="View profile">
              <UserInitials name={user.name} />
            </button>
            <button onClick={() => navigate("/profile")} className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity" title="View profile">
              <p className="text-sm text-sidebar-foreground truncate">
                {user.name || user.email || "User"}
              </p>
            </button>
            <button
              onClick={cycleTheme}
              className="p-2.5 md:p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title={`Theme: ${preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}`}
              aria-label={`Theme: ${preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}. Click to cycle.`}
            >
              {preference === 'system' ? <Monitor className="w-3.5 h-3.5" /> : preference === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="p-2.5 md:p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Settings"
              aria-label="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => toast.info("Tips & help coming soon!")}
              className="p-2.5 md:p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Help & tips"
              aria-label="Help & tips"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-sidebar-accent transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-md text-sm text-foreground hover:bg-sidebar-accent/50 transition-colors w-full active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4" />
            Sign in with Manus
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── MOBILE OVERLAY ── */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-[2px]"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR (Desktop) ── */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
        )}
      >
        {sidebarContent}
      </nav>

      {/* ── LEFT SIDEBAR (Mobile Drawer) ── */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[300px] max-w-[85vw] bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-out md:hidden",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — always visible on mobile, desktop only when sidebar closed */}
        <header
          className={cn(
            "h-14 flex items-center px-4 border-b border-border shrink-0",
            sidebarOpen ? "md:hidden" : ""
          )}
        >
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileDrawerOpen(true);
              } else {
                setSidebarOpen(true);
              }
            }}
            className="p-2 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 md:hidden" />
            <PanelLeft className="w-4 h-4 hidden md:block" />
          </button>
          <Link href="/" className="flex items-center gap-2 ml-3">
            <span className="text-lg">🐾</span>
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              manus next
            </span>
          </Link>
          <div className="ml-auto">
            <NotificationCenter />
          </div>
        </header>

        {/* Network status banner */}
        <NetworkBanner />

        {/* Page content */}
        <main className="flex-1 overflow-hidden pb-14 md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
