/**
 * AppLayout — "Warm Void" Manus-Authentic Three-Panel Layout
 *
 * LEFT:   Task sidebar (280px) — task list, search, +New task
 * CENTER: Main content area (flexible) — home or chat view
 * RIGHT:  Contextual — nothing on home, workspace on task view
 *
 * Design: warm charcoal #141414 base, muted gold #C4A052 accent
 */
import { useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useTask } from "@/contexts/TaskContext";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function TaskStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "running":
      return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
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

export default function AppLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();
  const { tasks, activeTaskId, setActiveTask } = useTask();

  const filteredTasks = tasks.filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isHome = location === "/";

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* ── LEFT SIDEBAR ── */}
      <aside
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="text-lg" role="img" aria-label="Manus Next">🐾</span>
            <span
              className="text-[15px] font-semibold tracking-tight text-sidebar-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              manus next
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-sm bg-sidebar-accent rounded-md border-0 text-sidebar-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-sidebar-ring"
            />
          </div>
        </div>

        {/* New Task Button */}
        <div className="px-3 pb-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-sm bg-transparent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => {
              setActiveTask(null);
              navigate("/");
            }}
          >
            <Plus className="w-4 h-4" />
            New task
            <kbd className="ml-auto text-[10px] text-muted-foreground bg-sidebar-accent px-1.5 py-0.5 rounded font-mono">
              ⌘K
            </kbd>
          </Button>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="text-3xl mb-3 opacity-40">📋</div>
              <p className="text-xs">Create a new task to get started</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setActiveTask(task.id);
                    navigate(`/task/${task.id}`);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-md transition-colors group",
                    activeTaskId === task.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <TaskStatusIcon status={task.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatTimeAgo(task.updatedAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <Link
            href="/billing"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
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
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              location === "/settings"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
              U
            </div>
            <span className="text-sm text-sidebar-foreground">Guest User</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar when sidebar is closed */}
        {!sidebarOpen && (
          <div className="h-14 flex items-center px-4 border-b border-border">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
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
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
