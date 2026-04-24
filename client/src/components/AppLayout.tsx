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
import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTask } from "@/contexts/TaskContext";
import { useBridge } from "@/contexts/BridgeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import MobileBottomNav from "@/components/MobileBottomNav";
import ModelSelector, { MODE_TO_MODEL, MODEL_TO_MODE } from "@/components/ModelSelector";
import NotificationCenter from "@/components/NotificationCenter";
import NetworkBanner from "@/components/NetworkBanner";
import { CreditWarningBanner } from "@/components/CreditWarningBanner";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
import ImageLightbox from "@/components/ImageLightbox";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSWUpdate } from "@/hooks/useSWUpdate";
import {
  Search,
  Plus,
  Settings,
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
  FolderOpen,
  Users,
  Monitor,
  Sparkles,
  Coins,
  BookOpen,
  BarChart3,
  Sun,
  Moon,
  Keyboard,
  Globe,
  GitBranch,
  Plug,
  Zap,
  Presentation,
  Video,
  Webhook,
  ChevronDown,
  ChevronRight,
  Compass,
  Smartphone,
  MonitorPlay,
  Mail,
  Shield,
  MessageSquare,
  Cpu,
  Laptop,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-3.5 h-3.5 text-foreground animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />;
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
        <Wifi className="w-3 h-3 text-muted-foreground" />
      ) : status === "connecting" ? (
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
      ) : (
        <WifiOff className="w-3 h-3 text-red-400" />
      )}
      <span
        className={cn(
          "text-[10px]",
          status === "connected"
            ? "text-muted-foreground"
            : status === "connecting"
            ? "text-muted-foreground"
            : "text-muted-foreground"
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

// Sidebar navigation types and data
interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPaths?: string[];
}

interface SidebarNavSection {
  label: string;
  items: SidebarNavItem[];
  collapsible?: boolean;
}

const SIDEBAR_SECTIONS: SidebarNavSection[] = [
  {
    label: "Manus",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/projects", label: "Projects", icon: FolderOpen, matchPaths: ["/project/", "/projects/webapp/"] },
      { href: "/library", label: "Library", icon: BookOpen },
      { href: "/schedule", label: "Schedules", icon: ClockIcon },
      { href: "/browser", label: "Browser", icon: Globe },
    ],
  },
  {
    label: "Tools",
    collapsible: true,
    items: [
      { href: "/github", label: "GitHub", icon: GitBranch, matchPaths: ["/github/"] },
      { href: "/connectors", label: "Connectors", icon: Plug },
      { href: "/skills", label: "Skills", icon: Zap },
      { href: "/slides", label: "Slides", icon: Presentation },
      { href: "/video", label: "Video", icon: Video },
      { href: "/computer-use", label: "Computer Use", icon: MonitorPlay },
      { href: "/discover", label: "Discover", icon: Compass },
    ],
  },
  {
    label: "More",
    collapsible: true,
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/meetings", label: "Meetings", icon: MessageSquare },
      { href: "/webhooks", label: "Webhooks", icon: Webhook },
      { href: "/deployed-websites", label: "Websites", icon: Upload },
      { href: "/desktop", label: "Desktop", icon: Laptop },
      { href: "/connect-device", label: "Devices", icon: Smartphone },
      { href: "/mobile-projects", label: "Mobile", icon: Smartphone },
      { href: "/client-inference", label: "Inference", icon: Cpu },
      { href: "/mail", label: "Mail", icon: Mail },
      { href: "/data-controls", label: "Data Controls", icon: Shield },
    ],
  },
];

function SidebarNavLink({ item, location }: { item: SidebarNavItem; location: string }) {
  const isActive = location === item.href || item.matchPaths?.some(p => location.startsWith(p));
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 md:py-1.5 rounded-md text-sm transition-colors active:scale-[0.98]",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <item.icon className="w-4 h-4" />
      {item.label}
    </Link>
  );
}

function SidebarNav({ location }: { location: string }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    const expanded: Record<string, boolean> = {};
    for (const section of SIDEBAR_SECTIONS) {
      if (section.collapsible) {
        const hasActiveItem = section.items.some(
          item => location === item.href || item.matchPaths?.some(p => location.startsWith(p))
        );
        expanded[section.label] = hasActiveItem;
      }
    }
    return expanded;
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <nav
      className="border-t border-sidebar-border p-2 space-y-0.5 shrink-0 overflow-y-auto max-h-[40vh]"
      aria-label="Sidebar navigation"
    >
      {SIDEBAR_SECTIONS.map((section) => (
        <div key={section.label}>
          {section.collapsible ? (
            <button
              onClick={() => toggleSection(section.label)}
              className="flex items-center justify-between w-full px-3 pt-1.5 pb-0.5 group"
            >
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </span>
              {expandedSections[section.label] ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="px-3 pt-1.5 pb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {section.label}
              </span>
            </div>
          )}
          {(!section.collapsible || expandedSections[section.label]) && (
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavLink key={item.href} item={item} location={location} />
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}

type StatusFilter = "all" | "running" | "completed" | "error" | "favorites" | "scheduled" | "shared";


export default function AppLayout({ children }: { children: ReactNode }) {
  useSWUpdate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
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

  // Listen for custom event from Home page to open mobile drawer
  useEffect(() => {
    const handler = () => setMobileDrawerOpen(true);
    window.addEventListener('open-mobile-drawer', handler);
    return () => window.removeEventListener('open-mobile-drawer', handler);
  }, []);

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
        matchType: st.matchType || "title",
        matchSnippet: st.matchSnippet || null,
        source: "server" as const,
      }));
      if (statusFilter === "favorites") {
        return serverResults.filter((t: any) => t.favorite === 1);
      }
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
    if (statusFilter === "favorites") {
      filtered = filtered.filter((t) => t.favorite === 1);
    } else if (statusFilter !== "all") {
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
      favorite: t.favorite ?? 0,
      source: "local" as const,
    }));
  })();

  // Batch-fetch thumbnails for displayed tasks
  const thumbnailIds = useMemo(
    () => displayedTasks.map((t: any) => t.id).filter(Boolean),
    [displayedTasks]
  );
  const thumbnailsQuery = trpc.file.thumbnails.useQuery(
    { taskExternalIds: thumbnailIds },
    { enabled: isAuthenticated && thumbnailIds.length > 0, staleTime: 60_000 }
  );
  const thumbnails = thumbnailsQuery.data || {};

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewTask: () => {
      setActiveTask(null);
      navigate("/");
    },
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onCycleTheme: cycleTheme,
    onNavigatePrevTask: () => {
      if (!displayedTasks.length) return;
      const currentIdx = displayedTasks.findIndex((t) => t.id === activeTaskId);
      const prevIdx = currentIdx <= 0 ? displayedTasks.length - 1 : currentIdx - 1;
      const prevTask = displayedTasks[prevIdx];
      if (prevTask) {
        setActiveTask(prevTask.id);
        navigate(`/task/${prevTask.id}`);
      }
    },
    onNavigateNextTask: () => {
      if (!displayedTasks.length) return;
      const currentIdx = displayedTasks.findIndex((t) => t.id === activeTaskId);
      const nextIdx = currentIdx >= displayedTasks.length - 1 ? 0 : currentIdx + 1;
      const nextTask = displayedTasks[nextIdx];
      if (nextTask) {
        setActiveTask(nextTask.id);
        navigate(`/task/${nextTask.id}`);
      }
    },
  });

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

  const favoritesCount = tasks.filter(t => t.favorite === 1).length;
  const scheduledCount = 0; // Placeholder — scheduled tasks tracked server-side
  const sharedCount = 0; // Placeholder — shared tasks tracked server-side
  const statusFilters: { id: StatusFilter; label: string; count?: number }[] = [
    { id: "all", label: "All tasks", count: tasks.length },
    { id: "running", label: "Running", count: tasks.filter(t => t.status === "running").length },
    { id: "completed", label: "Completed", count: tasks.filter(t => t.status === "completed").length },
    { id: "error", label: "Error", count: tasks.filter(t => t.status === "error").length },
    { id: "favorites", label: "Favorites", count: favoritesCount },
    { id: "scheduled", label: "Scheduled", count: scheduledCount },
    { id: "shared", label: "Shared", count: sharedCount },
  ];
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showFilterDropdown) return;
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterDropdown]);

  const sidebarContent = (
    <>
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-lg" role="img" aria-label="Manus">
            🐾
          </span>
          <span
            className="text-[15px] font-semibold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            manus
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

      {/* Task List Header with Filter Dropdown — Manus parity */}
      <div className="px-3 pb-1 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Tasks
          </span>
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                statusFilter !== "all"
                  ? "text-primary bg-primary/10 hover:bg-primary/15"
                  : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
              title="Filter tasks"
              aria-label="Filter tasks"
            >
              <Filter className="w-3.5 h-3.5" />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20 overflow-hidden py-1">
                {statusFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setStatusFilter(f.id); setShowFilterDropdown(false); }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs transition-colors",
                      "hover:bg-accent/50",
                      statusFilter === f.id && "bg-accent/30 text-foreground font-medium"
                    )}
                  >
                    <span>{f.label}</span>
                    <span className="text-muted-foreground tabular-nums">{f.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
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
      <div
        className="flex-1 overflow-y-auto px-2 py-1 overscroll-contain"
        tabIndex={0}
        role="region"
        aria-label="Task list"
      >
        {searchEnabled && serverSearch.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Searching...</span>
          </div>
        ) : displayedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <div className="text-3xl mb-3 opacity-40" aria-hidden="true">
              {searchQuery ? "🔍" : statusFilter === "favorites" ? "⭐" : statusFilter !== "all" ? "📋" : "📋"}
            </div>
            <p className="text-xs">
              {searchQuery
                ? "No matching tasks found"
                : statusFilter === "favorites"
                ? "No favorited tasks yet — star a task to pin it here"
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
                      {/* Attachment thumbnail preview */}
                      {thumbnails[task.id] && (
                        <div
                          className="mt-1 mb-0.5 cursor-zoom-in"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setLightbox({ images: [thumbnails[task.id]], index: 0 });
                          }}
                        >
                          <img
                            src={thumbnails[task.id]}
                            alt=""
                            className="w-full h-12 object-cover rounded-md opacity-70 group-hover:opacity-90 transition-opacity"
                            loading="lazy"
                          />
                        </div>
                      )}
                      {/* Search match snippet */}
                      {searchQuery && (task as any).matchSnippet && (
                        <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2 leading-relaxed">
                          <span className="text-[9px] px-1 py-px rounded bg-primary/15 text-primary/80 font-medium mr-1">
                            {(task as any).matchType === "message" ? "in messages" : "in title"}
                          </span>
                          {(task as any).matchSnippet}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeAgo(task.updatedAt)}
                        </span>
                        {task.status === "running" && (
                          <span className="text-[9px] px-1.5 py-px rounded-full bg-muted text-foreground font-medium">
                            In progress
                          </span>
                        )}
                        {(task as any).staleCompleted === 1 && (
                          <span className="text-[9px] px-1.5 py-px rounded-full bg-amber-500/20 text-amber-400 font-medium">
                            Auto-completed
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

      {/* Sidebar Footer — Grouped section nav */}
      <SidebarNav location={location} />

      {/* Referral/Invite Banner — Manus parity */}
      {isAuthenticated && (
        <div className="mx-2 mb-1 p-2.5 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer hover:bg-sidebar-accent transition-colors relative z-10"
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
      <div className="border-t border-sidebar-border shrink-0 relative z-10 bg-sidebar">
        {authLoading ? (
          <div className="flex items-center justify-center px-3 py-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : isAuthenticated && user ? (
          <>
            {/* User name row */}
            <button
              onClick={() => navigate("/profile")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 hover:bg-sidebar-accent/50 transition-colors"
              title="View profile"
            >
              <UserInitials name={user.name} />
              <span className="text-sm text-sidebar-foreground truncate flex-1 text-left">
                {(user.name || user.email || "User").split(" ")[0]}
              </span>
            </button>
            {/* Bottom icon strip — matches Manus exactly */}
            <div className="flex items-center justify-between px-2 py-1.5">
              <button
                onClick={cycleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title={`Theme: ${preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}`}
              >
                {preference === 'system' ? <Monitor className="w-4 h-4" /> : preference === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => navigate("/settings")}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowHelp(true)}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Keyboard shortcuts (?)"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <button
                onClick={() => { setSidebarOpen(false); setMobileDrawerOpen(false); }}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors hidden md:flex items-center justify-center"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </>
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
        {/* On Home route on mobile, hide this header since Home has its own header */}
        <header
          className={cn(
            "h-14 flex items-center px-4 border-b border-border shrink-0",
            sidebarOpen ? "md:hidden" : "",
            location === "/" ? "hidden md:flex" : ""
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
              manus
            </span>
          </Link>
          {/* ModelSelector — always visible, matching Manus top-left placement */}
          <div className="ml-3">
            <ModelSelector
              compact
              selectedModelId={(() => { try { const m = localStorage.getItem("manus-agent-mode"); if (m && MODE_TO_MODEL[m]) return MODE_TO_MODEL[m]; } catch {} return "manus-next-max"; })()}
              onModelChange={(modelId) => { try { localStorage.setItem("manus-selected-model", modelId); localStorage.setItem("manus-agent-mode", MODEL_TO_MODE[modelId] || "quality"); } catch {} }}
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={`Theme: ${preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}`}
              aria-label={`Theme: ${preference === 'system' ? 'System' : preference === 'light' ? 'Light' : 'Dark'}. Click to cycle.`}
            >
              {preference === 'system' ? <Monitor className="w-4 h-4" /> : preference === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationCenter />
          </div>
        </header>

        {/* Status banners — wrapped in landmark for a11y */}
        <div role="status" aria-label="System notifications" aria-live="polite">
          <NetworkBanner />
          {/* Credit exhaustion warning banner */}
          <CreditWarningBanner />
        </div>

        {/* Page content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog open={showHelp} onClose={() => setShowHelp(false)} />
      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          currentIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index: number) => setLightbox({ ...lightbox, index })}
        />
      )}
    </div>
  );
}
