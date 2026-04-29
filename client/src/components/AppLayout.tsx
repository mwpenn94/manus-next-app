/**
 * AppLayout — Real Manus Sidebar Layout (Cycle 14)
 *
 * Sidebar structure matches real Manus exactly:
 * 1. Fixed header: "manus" logo + collapse button
 * 2. Top nav: New task, Agent, Search (Ctrl+K), Library
 * 3. Scrollable middle: Projects tree (collapsible folders with nested tasks) + All tasks + Share banner
 * 4. Bottom icon bar: settings, grid/apps, monitor + "from ∞ Meta"
 *
 * Auth-aware, mobile drawer, dark theme default
 */
import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useTask } from "@/contexts/TaskContext";
import { useBridge } from "@/contexts/BridgeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import MobileBottomNav from "@/components/MobileBottomNav";
import BrandAvatar from "@/components/BrandAvatar";
import ModelSelector, { MODE_TO_MODEL, MODEL_TO_MODE } from "@/components/ModelSelector";
import NotificationCenter from "@/components/NotificationCenter";
import NetworkBanner from "@/components/NetworkBanner";
import { CreditWarningBanner } from "@/components/CreditWarningBanner";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ImageLightbox from "@/components/ImageLightbox";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
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
  Menu,
  X,
  Star,
  Trash2,
  Filter,
  Brain,
  FolderOpen,
  Users,
  Monitor,
  Sparkles,
  BookOpen,
  Sun,
  Moon,
  Keyboard,
  Globe,
  ChevronDown,
  ChevronRight,
  Pin,
  MoreHorizontal,
  Share2,
  Pencil,
  ExternalLink,
  FolderInput,
  FolderMinus,
  FileText,
  LayoutGrid,
  Crosshair,
  Copy,
  BarChart3,
  HelpCircle,
  Home,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConnectorsSheet, { ConnectorsBadge } from "@/components/ConnectorsSheet";
import ShareDialog from "@/components/ShareDialog";

/* ─── Helper: format relative time ─── */
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

/* ─── Helper: user initials avatar ─── */
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

/* ─── Task status dot (Manus-style) ─── */
function TaskStatusDot({ status }: { status: string }) {
  return (
    <div
      className={cn(
        "w-2 h-2 rounded-full shrink-0 mt-[5px]",
        status === "running" && "bg-blue-500 animate-pulse",
        status === "completed" && "bg-muted-foreground/60",
        status === "error" && "bg-red-400",
        status !== "running" && status !== "completed" && status !== "error" && "bg-muted-foreground/30"
      )}
    />
  );
}

/* ─── Task status icon (for All Tasks section) ─── */
function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />;
    case "completed":
      return <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
    case "error":
      return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />;
  }
}

/* ─── Task context menu (appears on hover "...") ─── */
interface TaskContextMenuProps {
  taskId: string;
  taskTitle: string;
  taskFavorite: number;
  projectId?: number | null;
  projects: Array<{ id: number; externalId: string; name: string }>;
  onDelete: (id: string) => void;
  onFavorite: (id: string, fav: number) => void;
  onRename: (id: string, title: string) => void;
  onAssignProject: (taskServerId: number, projectExternalId: string | null) => void;
  taskServerId?: number;
  onShare?: (taskId: string, taskTitle: string) => void;
}

function TaskContextMenu({
  taskId,
  taskTitle,
  taskFavorite,
  projectId,
  projects,
  onDelete,
  onFavorite,
  onRename,
  onAssignProject,
  taskServerId,
  onShare,
}: TaskContextMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1 rounded text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors opacity-0 group-hover/task:opacity-100"
          onClick={(e) => e.stopPropagation()}
          aria-label="Task options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            if (onShare) {
              onShare(taskId, taskTitle);
            } else {
              navigator.clipboard.writeText(`${window.location.origin}/task/${taskId}`);
              toast.success("Link copied to clipboard");
            }
          }}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            const newTitle = prompt("Rename task:", taskTitle);
            if (newTitle && newTitle.trim() && newTitle.trim() !== taskTitle) {
              onRename(taskId, newTitle.trim());
            }
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onFavorite(taskId, taskFavorite === 1 ? 0 : 1);
          }}
        >
          <Star className={cn("w-4 h-4 mr-2", taskFavorite === 1 && "fill-current")} />
          {taskFavorite === 1 ? "Remove from favorites" : "Add to favorites"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            window.open(`/task/${taskId}`, "_blank");
          }}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in new tab
        </DropdownMenuItem>
        {projects.length > 0 && taskServerId && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="w-4 h-4 mr-2" />
              Move to project
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {projects.map((p) => (
                <DropdownMenuItem
                  key={p.externalId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssignProject(taskServerId, p.externalId);
                  }}
                  className={cn(projectId === p.id && "bg-accent")}
                >
                  <span className="text-sm mr-1.5">📁</span>
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        {projectId && taskServerId && (
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onAssignProject(taskServerId, null);
            }}
          >
            <FolderMinus className="w-4 h-4 mr-2" />
            Remove from project
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(taskId);
          }}
          className="text-red-400 focus:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Project Tree Node (collapsible folder with nested tasks) ─── */
interface ProjectTreeNodeProps {
  project: { id: number; externalId: string; name: string; icon: string | null; pinned: number };
  projectTasks: Array<{
    id: string;
    title: string;
    status: string;
    favorite: number;
    projectId?: number | null;
    serverId?: number;
    updatedAt: Date;
  }>;
  activeTaskId: string | null;
  allProjects: Array<{ id: number; externalId: string; name: string }>;
  onTaskClick: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onFavoriteTask: (taskId: string, fav: number) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onShareTask?: (taskId: string, taskTitle: string) => void;
  onAssignProject: (taskServerId: number, projectExternalId: string | null) => void;
  onProjectClick?: (projectId: number) => void;
}

function ProjectTreeNode({
  project,
  projectTasks,
  activeTaskId,
  onTaskClick,
  onDeleteTask,
  onFavoriteTask,
  onRenameTask,
  onShareTask,
  onAssignProject,
  onProjectClick,
  allProjects,
}: ProjectTreeNodeProps) {
  // Auto-expand if any child task is active
  const hasActiveChild = projectTasks.some((t) => t.id === activeTaskId);
  const [expanded, setExpanded] = useState(hasActiveChild || projectTasks.length > 0);

  // Auto-expand when active child changes
  useEffect(() => {
    if (hasActiveChild) setExpanded(true);
  }, [hasActiveChild]);

  return (
    <div>
      {/* Project folder row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-sidebar-accent/50 transition-colors group/proj"
      >
        <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-[13px] text-sidebar-foreground truncate flex-1 font-medium">
          {project.name}
        </span>
        {project.pinned === 1 && (
          <Pin className="w-3 h-3 text-muted-foreground/50 shrink-0" />
        )}
        <ChevronRight
          className={cn(
            "w-3 h-3 text-muted-foreground transition-transform duration-200 shrink-0",
            expanded && "rotate-90"
          )}
        />
      </button>

      {/* Nested tasks */}
      {expanded && projectTasks.length > 0 && (
        <div className="ml-3 border-l border-sidebar-border/50">
          {projectTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "group/task flex items-center gap-2 pl-3 pr-1 py-1.5 ml-1 rounded-md cursor-pointer transition-colors",
                activeTaskId === task.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/40 text-sidebar-foreground"
              )}
              onClick={() => onTaskClick(task.id)}
            >
              <TaskStatusDot status={task.status} />
              <span className="text-[13px] truncate flex-1 min-w-0">{task.title}</span>
              <TaskContextMenu
                taskId={task.id}
                taskTitle={task.title}
                taskFavorite={task.favorite}
                projectId={task.projectId}
                projects={allProjects}
                onDelete={onDeleteTask}
                onFavorite={onFavoriteTask}
                onRename={onRenameTask}
                onShare={onShareTask}
                onAssignProject={onAssignProject}
                taskServerId={task.serverId}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty project — show hint */}
      {expanded && projectTasks.length === 0 && (
        <div className="ml-7 py-1.5">
          <span className="text-[11px] text-muted-foreground/50 italic">No tasks yet</span>
        </div>
      )}
    </div>
  );
}

/* ─── SidebarProjectTree — Full project tree with nested tasks ─── */
interface SidebarProjectTreeProps {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    favorite: number;
    projectId?: number | null;
    serverId?: number;
    updatedAt: Date;
  }>;
  activeTaskId: string | null;
  onTaskClick: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onFavoriteTask: (taskId: string, fav: number) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onShareTask?: (taskId: string, taskTitle: string) => void;
  navigate: (path: string) => void;
}

function SidebarProjectTree({
  tasks,
  activeTaskId,
  onTaskClick,
  onDeleteTask,
  onFavoriteTask,
  onRenameTask,
  onShareTask,
  navigate,
}: SidebarProjectTreeProps) {
  const projectsQuery = trpc.project.list.useQuery(undefined, { staleTime: 30000 });
  const projects = projectsQuery.data ?? [];
  const utils = trpc.useUtils();

  const assignMutation = trpc.project.assignTask.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      utils.task.list.invalidate();
      toast.success("Task moved");
    },
    onError: () => { toast.error("Failed to move task"); },
  });

  const handleAssignProject = useCallback(
    (taskServerId: number, projectExternalId: string | null) => {
      assignMutation.mutate({ taskId: taskServerId, projectExternalId });
    },
    [assignMutation]
  );

  const allProjectsMeta = useMemo(
    () => projects.map((p: any) => ({ id: p.id, externalId: p.externalId, name: p.name })),
    [projects]
  );

  // Group tasks by projectId
  const tasksByProject = useMemo(() => {
    const map = new Map<number, typeof tasks>();
    for (const task of tasks) {
      if (task.projectId) {
        const existing = map.get(task.projectId) ?? [];
        existing.push(task);
        map.set(task.projectId, existing);
      }
    }
    return map;
  }, [tasks]);

  if (projects.length === 0 && !projectsQuery.isLoading) {
    return (
      <div className="px-3 py-2">
        {/* Projects header with + button even when empty */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Projects
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Create new"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/projects")}>
                <FolderOpen className="w-4 h-4 mr-2" />
                New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { navigate("/"); }}>
                <FileText className="w-4 h-4 mr-2" />
                New Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-[11px] text-muted-foreground/50 italic px-1">No projects yet</p>
      </div>
    );
  }

  return (
    <div className="px-2 py-1">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Projects
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Create new"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate("/projects")}>
              <FolderOpen className="w-4 h-4 mr-2" />
              New Project
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { navigate("/"); }}>
              <FileText className="w-4 h-4 mr-2" />
              New Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Loading state */}
      {projectsQuery.isLoading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-0.5">
          {projects.map((project: any) => (
            <ProjectTreeNode
              key={project.externalId}
              project={project}
              projectTasks={tasksByProject.get(project.id) ?? []}
              activeTaskId={activeTaskId}
              allProjects={allProjectsMeta}
              onTaskClick={onTaskClick}
              onDeleteTask={onDeleteTask}
              onFavoriteTask={onFavoriteTask}
              onRenameTask={onRenameTask}
              onShareTask={onShareTask}
              onAssignProject={handleAssignProject}
              onProjectClick={(eid) => navigate(`/project/${eid}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── All Tasks Section (flat list at bottom of scrollable area) ─── */
interface AllTasksSectionProps {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    favorite: number;
    projectId?: number | null;
    serverId?: number;
    updatedAt: Date;
  }>;
  activeTaskId: string | null;
  projects: Array<{ id: number; externalId: string; name: string }>;
  onTaskClick: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onFavoriteTask: (taskId: string, fav: number) => void;
  onRenameTask: (taskId: string, title: string) => void;
  onShareTask?: (taskId: string, taskTitle: string) => void;
  onAssignProject: (taskServerId: number, projectExternalId: string | null) => void;
  statusFilter: string;
  onStatusFilterChange: (filter: string) => void;
}

function AllTasksSection({
  tasks: allTasks,
  activeTaskId,
  projects,
  onTaskClick,
  onDeleteTask,
  onFavoriteTask,
  onRenameTask,
  onShareTask,
  onAssignProject,
  statusFilter,
  onStatusFilterChange,
}: AllTasksSectionProps) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilterDropdown) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilterDropdown]);

  const filters = [
    { id: "all", label: "All" },
    { id: "running", label: "Running" },
    { id: "completed", label: "Completed" },
    { id: "error", label: "Error" },
    { id: "favorites", label: "Favorites" },
  ];

  // Apply filter
  const filteredTasks = useMemo(() => {
    if (statusFilter === "favorites") return allTasks.filter((t) => t.favorite === 1);
    if (statusFilter !== "all") return allTasks.filter((t) => t.status === statusFilter);
    return allTasks;
  }, [allTasks, statusFilter]);

  return (
    <div className="px-2 py-1 mt-2">
      {/* Section header */}
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          All tasks
        </span>
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={cn(
              "p-1 rounded transition-colors",
              statusFilter !== "all"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
            title="Filter tasks"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
          {showFilterDropdown && (
            <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-border bg-popover text-popover-foreground shadow-xl overflow-hidden py-1">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    onStatusFilterChange(f.id);
                    setShowFilterDropdown(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-accent/50",
                    statusFilter === f.id && "bg-accent/30 font-medium"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground/60">
            {statusFilter !== "all" ? `No ${statusFilter} tasks` : "No tasks yet"}
          </p>
          {statusFilter === "all" && (
            <p className="text-[11px] text-muted-foreground/40 mt-1">
              Start a new task from the input above
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-0.5">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "group/task flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                activeTaskId === task.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/40 text-sidebar-foreground"
              )}
              onClick={() => onTaskClick(task.id)}
            >
              <TaskStatusDot status={task.status} />
              <span className="text-[13px] truncate flex-1 min-w-0">{task.title}</span>
              {task.favorite === 1 && (
                <Star className="w-3 h-3 text-foreground fill-foreground shrink-0" />
              )}
              <TaskContextMenu
                taskId={task.id}
                taskTitle={task.title}
                taskFavorite={task.favorite}
                projectId={task.projectId}
                projects={projects}
                onDelete={onDeleteTask}
                onFavorite={onFavoriteTask}
                onRename={onRenameTask}
                onShare={onShareTask}
                onAssignProject={onAssignProject}
                taskServerId={task.serverId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Apps/Grid dropdown (houses the old SidebarNav items) ─── */
function AppsGridMenu({ location }: { location: string }) {
  const { user } = useAuth();
  const userRole = user?.role || "user";

  const items = useMemo(() => {
    const all = [
      { href: "/projects", label: "Projects", icon: "📁" },
      { href: "/library", label: "Library", icon: "📚" },
      { href: "/skills", label: "Skills", icon: "⚡" },
      { href: "/schedule", label: "Schedule", icon: "📅" },
      { href: "/connectors", label: "Connectors", icon: "🔌" },
      { href: "/memory", label: "Memory", icon: "🧠" },
      { href: "/github", label: "GitHub", icon: "🔗" },
      { href: "/billing", label: "Billing", icon: "💳" },
      { href: "/discover", label: "Discover", icon: "🧭" },
      { href: "/help", label: "Help", icon: "❓" },
      ...(userRole === "admin"
        ? [
            { href: "/webhooks", label: "Webhooks", icon: "🪝" },
            { href: "/data-controls", label: "Data Controls", icon: "🛡️" },
          ]
        : []),
    ];
    return all;
  }, [userRole]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          title="Apps & Tools"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" side="top" className="w-56 max-h-80 overflow-y-auto">
        {items.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-2 w-full",
                location === item.href && "bg-accent"
              )}
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─── Bridge Status (compact for bottom bar) ─── */
function BridgeStatusBadge() {
  const { status, quality } = useBridge();
  if (status === "disconnected") return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 mx-2 mb-1 rounded-md bg-sidebar-accent/50">
      {status === "connected" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
      ) : status === "connecting" ? (
        <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      )}
      <span className="text-[10px] text-muted-foreground">
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

/* ═══════════════════════════════════════════════════════════════════
   MAIN LAYOUT
   ═══════════════════════════════════════════════════════════════════ */

export default function AppLayout({ children }: { children: ReactNode }) {
  useSWUpdate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [connectorsSheetOpen, setConnectorsSheetOpen] = useState(false);
  const [shareDialogState, setShareDialogState] = useState<{ open: boolean; taskId: string; taskTitle: string }>({ open: false, taskId: "", taskTitle: "" });
  const [selectedModelId, setSelectedModelId] = useState(() => {
    try {
      // Primary: read the model ID directly
      const direct = localStorage.getItem("manus-selected-model");
      if (direct && ["manus-next-limitless", "manus-next-max", "manus-next-standard", "manus-next-lite"].includes(direct)) return direct;
      // Fallback: read agent mode and map to model ID
      const m = localStorage.getItem("manus-agent-mode");
      if (m && MODE_TO_MODEL[m]) return MODE_TO_MODEL[m];
    } catch {}
    return "manus-next-max";
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [location, navigate] = useLocation();
  const { tasks, activeTaskId, setActiveTask, updateTaskFavorite, renameTask } = useTask();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const { preference, theme, cycleTheme } = useTheme();

  // Archive mutation
  const utils = trpc.useUtils();
  const archiveMutation = trpc.task.archive.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      utils.task.search.invalidate();
    },
    onError: () => {
      toast.error("Failed to delete task");
    },
  });

  // Favorite mutation
  const favoriteMutation = trpc.task.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
    },
    onError: () => {
      toast.error("Failed to update favorite");
    },
  });

  // Project assign mutation
  const assignMutation = trpc.project.assignTask.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      utils.task.list.invalidate();
      toast.success("Task moved");
    },
    onError: () => { toast.error("Failed to move task"); },
  });

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location]);

  // Listen for custom event from Home page to open mobile drawer
  useEffect(() => {
    const handler = () => setMobileDrawerOpen(true);
    window.addEventListener("open-mobile-drawer", handler);
    return () => window.removeEventListener("open-mobile-drawer", handler);
  }, []);

  // Listen for custom event from MobileBottomNav to open search dialog
  useEffect(() => {
    const handler = () => setSearchOpen(true);
    window.addEventListener("open-search-dialog", handler);
    return () => window.removeEventListener("open-search-dialog", handler);
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

  // Projects query for the All Tasks context menu
  const projectsQuery = trpc.project.list.useQuery(undefined, { enabled: isAuthenticated });
  const allProjectsMeta = useMemo(
    () => (projectsQuery.data ?? []).map((p: any) => ({ id: p.id, externalId: p.externalId, name: p.name })),
    [projectsQuery.data]
  );

  // Prepare task list for sidebar
  const sidebarTasks = useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        favorite: t.favorite ?? 0,
        projectId: t.projectId,
        serverId: t.serverId,
        updatedAt: t.updatedAt,
      })),
    [tasks]
  );

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onNewTask: () => {
      setActiveTask(null);
      navigate("/");
    },
    onToggleSidebar: () => setSidebarOpen((prev) => !prev),
    onOpenSearch: () => setSearchOpen(true),
    onCycleTheme: cycleTheme,
    onNavigatePrevTask: () => {
      if (!tasks.length) return;
      const currentIdx = tasks.findIndex((t) => t.id === activeTaskId);
      const prevIdx = currentIdx <= 0 ? tasks.length - 1 : currentIdx - 1;
      const prevTask = tasks[prevIdx];
      if (prevTask) {
        setActiveTask(prevTask.id);
        navigate(`/task/${prevTask.id}`);
      }
    },
    onNavigateNextTask: () => {
      if (!tasks.length) return;
      const currentIdx = tasks.findIndex((t) => t.id === activeTaskId);
      const nextIdx = currentIdx >= tasks.length - 1 ? 0 : currentIdx + 1;
      const nextTask = tasks[nextIdx];
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

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    externalId: string;
    title: string;
  }>({ open: false, externalId: "", title: "" });

  const handleDeleteTask = useCallback(
    (externalId: string) => {
      const task = tasks.find((t) => t.id === externalId);
      setDeleteConfirm({
        open: true,
        externalId,
        title: task?.title || "this task",
      });
    },
    [tasks]
  );

  const confirmDeleteTask = () => {
    archiveMutation.mutate({ externalId: deleteConfirm.externalId });
    if (activeTaskId === deleteConfirm.externalId) {
      setActiveTask(null);
      navigate("/");
    }
    setDeleteConfirm({ open: false, externalId: "", title: "" });
  };

  const handleFavoriteTask = useCallback(
    (taskId: string, fav: number) => {
      updateTaskFavorite(taskId, fav);
      favoriteMutation.mutate({ externalId: taskId });
    },
    [updateTaskFavorite, favoriteMutation]
  );

  const handleRenameTask = useCallback(
    (taskId: string, title: string) => {
      renameTask(taskId, title);
      toast.success(`Renamed to "${title}"`);
    },
    [renameTask]
  );

  const handleShareTask = useCallback(
    (taskId: string, taskTitle: string) => {
      setShareDialogState({ open: true, taskId, taskTitle });
    },
    []
  );

  const handleAssignProject = useCallback(
    (taskServerId: number, projectExternalId: string | null) => {
      assignMutation.mutate({ taskId: taskServerId, projectExternalId });
    },
    [assignMutation]
  );

  const handleTaskClick = useCallback(
    (taskId: string) => {
      setActiveTask(taskId);
      navigate(`/task/${taskId}`);
      setMobileDrawerOpen(false);
    },
    [setActiveTask, navigate]
  );

  /* ─── SIDEBAR CONTENT ─── */
  const sidebarContent = (
    <>
      {/* ═══ Fixed Header ═══ */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandAvatar size="md" />
          <span
            className="text-[15px] font-semibold tracking-tight text-sidebar-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            manus
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors hidden md:flex"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
        <button
          onClick={() => setMobileDrawerOpen(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors md:hidden"
          title="Close sidebar"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ═══ Top Nav Items ═══ */}
      <div className="px-2 pt-2 pb-1 shrink-0 space-y-0.5">
        <button
          onClick={() => {
            setActiveTask(null);
            navigate("/");
            setMobileDrawerOpen(false);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors active:scale-[0.98]"
        >
          <Pencil className="w-4 h-4 text-muted-foreground" />
          New task
        </button>
        <Link
          href="/discover"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Crosshair className="w-4 h-4 text-muted-foreground" />
          Agent
        </Link>
        <button
          onClick={() => {
            setSearchOpen(true);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          Search
          <kbd className="ml-auto text-[10px] text-muted-foreground bg-sidebar-accent px-1.5 py-0.5 rounded font-mono">
            Ctrl+K
          </kbd>
        </button>
        <Link
          href="/library"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          Library
        </Link>
      </div>

      {/* ═══ Scrollable Middle Section ═══ */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain min-h-0"
        tabIndex={0}
        role="region"
        aria-label="Task list"
      >
        {/* Projects Tree */}
        {isAuthenticated && (
          <SidebarProjectTree
            tasks={sidebarTasks}
            activeTaskId={activeTaskId}
            onTaskClick={handleTaskClick}
            onDeleteTask={handleDeleteTask}
            onFavoriteTask={handleFavoriteTask}
            onRenameTask={handleRenameTask}
            onShareTask={handleShareTask}
            navigate={(path) => {
              navigate(path);
              setMobileDrawerOpen(false);
            }}
          />
        )}

        {/* All Tasks Section */}
        {isAuthenticated && (
          <AllTasksSection
            tasks={sidebarTasks}
            activeTaskId={activeTaskId}
            projects={allProjectsMeta}
            onTaskClick={handleTaskClick}
            onDeleteTask={handleDeleteTask}
            onFavoriteTask={handleFavoriteTask}
            onRenameTask={handleRenameTask}
            onShareTask={handleShareTask}
            onAssignProject={handleAssignProject}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        )}

        {/* Bridge Status */}
        <BridgeStatusBadge />

        {/* Share Banner */}
        {isAuthenticated && (
          <div
            className="mx-2 my-2 p-2.5 rounded-lg bg-sidebar-accent/50 border border-sidebar-border cursor-pointer hover:bg-sidebar-accent transition-colors"
            onClick={() => {
              navigator.clipboard.writeText(window.location.origin);
              toast.success("Invite link copied!");
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-sidebar-foreground">
                    Share Manus with a friend
                  </p>
                  <p className="text-[10px] text-muted-foreground">Get 500 credits each</p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
      {/* End scrollable middle section */}

      {/* ═══ Bottom Icon Bar — pinned at bottom ═══ */}
      <div className="border-t border-sidebar-border shrink-0 bg-sidebar">
        {authLoading ? (
          <div className="flex items-center justify-center px-3 py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : isAuthenticated && user ? (
          <div className="flex items-center justify-between px-3 py-2">
            {/* Left: icon buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate("/settings")}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <AppsGridMenu location={location} />
              <button
                onClick={() => setConnectorsSheetOpen(true)}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors relative"
                title="Connectors"
              >
                <Plug className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/help")}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Help & Knowledge Base"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                onClick={cycleTheme}
                className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title={`Theme: ${preference === "system" ? "System" : preference === "light" ? "Light" : "Dark"}`}
              >
                {preference === "system" ? (
                  <Monitor className="w-4 h-4" />
                ) : preference === "light" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </div>
            {/* Right: "from ∞ Meta" */}
            <span className="text-[10px] text-muted-foreground select-none">
              from <span className="font-medium">∞</span> Meta
            </span>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-foreground hover:bg-sidebar-accent/50 transition-colors w-full active:scale-[0.98]"
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
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      {/* ── MOBILE OVERLAY ── */}
      {mobileDrawerOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-[2px]"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* ── LEFT SIDEBAR (Desktop) ── */}
      <nav
        aria-label="Main navigation"
        className={cn(
          "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          sidebarOpen ? "w-[260px]" : "w-12 overflow-hidden"
        )}
      >
        {sidebarOpen ? sidebarContent : (
          <div className="flex flex-col items-center py-3 gap-2 h-full">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Open sidebar"
              aria-label="Open sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="Home"
              aria-label="Home"
            >
              <Home className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setActiveTask(null);
                navigate("/");
              }}
              className="p-2 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="New task"
              aria-label="New task"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </nav>

      {/* ── LEFT SIDEBAR (Mobile Drawer) ── */}
      <nav
        aria-label="Mobile navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-[300px] max-w-[85vw] bg-sidebar border-r border-sidebar-border transition-transform duration-200 ease-out md:hidden",
          mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {sidebarContent}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top bar — always visible on mobile, desktop only when sidebar closed */}
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
            <BrandAvatar size="sm" />
            <span
              className="text-[15px] font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              manus
            </span>
          </Link>
          {/* ModelSelector */}
          <div className="ml-3">
            <ModelSelector
              compact
              selectedModelId={selectedModelId}
              onModelChange={(modelId) => {
                setSelectedModelId(modelId);
                try {
                  localStorage.setItem("manus-selected-model", modelId);
                  localStorage.setItem(
                    "manus-agent-mode",
                    MODEL_TO_MODE[modelId] || "quality"
                  );
                } catch {}
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={cycleTheme}
              className="p-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={`Theme: ${preference === "system" ? "System" : preference === "light" ? "Light" : "Dark"}`}
              aria-label={`Theme: ${preference === "system" ? "System" : preference === "light" ? "Light" : "Dark"}. Click to cycle.`}
            >
              {preference === "system" ? (
                <Monitor className="w-4 h-4" />
              ) : preference === "light" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
            {isAuthenticated && <NotificationCenter />}
          </div>
        </header>

        {/* Status banners */}
        <div role="status" aria-label="System notifications" aria-live="polite" className="shrink-0">
          <NetworkBanner />
          <CreditWarningBanner />
        </div>

        {/* Page content — flex container so children's h-full is constrained */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 min-h-0 flex flex-col overflow-hidden pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation — outside main to avoid clipping */}
      <MobileBottomNav />

      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsDialog open={showHelp} onClose={() => setShowHelp(false)} />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open && setDeleteConfirm({ open: false, externalId: "", title: "" })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{deleteConfirm.title}&rdquo;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          currentIndex={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index: number) => setLightbox({ ...lightbox, index })}
        />
      )}

      {/* Universal Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search tasks, projects, pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {/* Tasks */}
          {sidebarTasks.length > 0 && (
            <CommandGroup heading="Tasks">
              {sidebarTasks
                .filter((t) => t.title)
                .slice(0, 10)
                .map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.title}
                    onSelect={() => {
                      setActiveTask(t.id);
                      navigate(`/task/${t.id}`);
                      setSearchOpen(false);
                    }}
                  >
                    {t.status === "running" ? (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-blue-400" />
                    ) : t.status === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-400" />
                    ) : t.status === "error" ? (
                      <AlertCircle className="w-3.5 h-3.5 mr-2 text-red-400" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    )}
                    <span className="truncate">{t.title}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          )}
          {/* Projects */}
          {allProjectsMeta.length > 0 && (
            <CommandGroup heading="Projects">
              {allProjectsMeta.map((p) => (
                <CommandItem
                  key={p.externalId}
                  value={p.name}
                  onSelect={() => {
                    navigate(`/projects/${p.externalId}`);
                    setSearchOpen(false);
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <span className="truncate">{p.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {/* Pages */}
          <CommandGroup heading="Pages">
            <CommandItem value="Home" onSelect={() => { navigate("/"); setSearchOpen(false); }}>
              <Globe className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Home
            </CommandItem>
            <CommandItem value="Projects" onSelect={() => { navigate("/projects"); setSearchOpen(false); }}>
              <FolderOpen className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Projects
            </CommandItem>
            <CommandItem value="Library" onSelect={() => { navigate("/library"); setSearchOpen(false); }}>
              <BookOpen className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Library
            </CommandItem>
            <CommandItem value="Skills" onSelect={() => { navigate("/skills"); setSearchOpen(false); }}>
              ⚡ Skills
            </CommandItem>
            <CommandItem value="Schedule" onSelect={() => { navigate("/schedule"); setSearchOpen(false); }}>
              📅 Schedule
            </CommandItem>
            <CommandItem value="Memory" onSelect={() => { navigate("/memory"); setSearchOpen(false); }}>
              <Brain className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Memory
            </CommandItem>
            <CommandItem value="Billing" onSelect={() => { navigate("/billing"); setSearchOpen(false); }}>
              💳 Billing
            </CommandItem>
            <CommandItem value="Settings" onSelect={() => { navigate("/settings"); setSearchOpen(false); }}>
              <Settings className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              Settings
            </CommandItem>
            <CommandItem value="Help" onSelect={() => { navigate("/help"); setSearchOpen(false); }}>
              ❓ Help
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Connectors Bottom Sheet (P27) — accessible from sidebar plug icon */}
      <ConnectorsSheet
        open={connectorsSheetOpen}
        onOpenChange={setConnectorsSheetOpen}
      />
      <ShareDialog
        open={shareDialogState.open}
        onOpenChange={(open) => setShareDialogState((s) => ({ ...s, open }))}
        taskExternalId={shareDialogState.taskId}
        taskTitle={shareDialogState.taskTitle}
      />
    </div>
  );
}
