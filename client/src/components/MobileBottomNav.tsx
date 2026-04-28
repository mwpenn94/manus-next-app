/**
 * MobileBottomNav — Fixed bottom navigation bar for mobile devices.
 * Matches Manus mobile: Home, Tasks, Billing, More.
 * More menu shows: Projects, Library, Skills, Schedule, Connectors, Settings, Help.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Home, ListTodo, CreditCard, MoreHorizontal, X, Search,
  FolderOpen, BookOpen, Clock, Zap, Plug, Settings, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTask } from "@/contexts/TaskContext";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  matchPrefix?: boolean;
}

const PRIMARY_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/task", label: "Tasks", icon: ListTodo, matchPrefix: true },
  { path: "/billing", label: "Billing", icon: CreditCard },
];

const MORE_ITEMS: NavItem[] = [
  { path: "/projects", label: "Projects", icon: FolderOpen },
  { path: "/library", label: "Library", icon: BookOpen },
  { path: "/skills", label: "Skills", icon: Zap },
  { path: "/schedule", label: "Schedule", icon: Clock },
  { path: "/connectors", label: "Connectors", icon: Plug },
  { path: "/settings", label: "Settings", icon: Settings },
  { path: "/help", label: "Help", icon: HelpCircle },
];

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { tasks } = useTask();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) return location.startsWith("/task");
    return location === item.path;
  };

  const handleTasksClick = () => {
    if (tasks.length > 0) {
      navigate(`/task/${tasks[0].id}`);
    } else {
      navigate("/");
    }
  };

  const isMoreActive = MORE_ITEMS.some(
    (item) => location === item.path || location.startsWith(item.path + "/")
  );

  return (
    <>
      {/* More menu overlay */}
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div
          role="dialog"
          aria-label="More navigation options"
          className="md:hidden fixed left-0 right-0 z-50 bg-card border-t border-border rounded-t-xl shadow-2xl"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-foreground">More</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-2 -mr-1 rounded-md text-muted-foreground hover:text-foreground active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 space-y-0.5">
            {/* Search button */}
            <button
              onClick={() => {
                setMoreOpen(false);
                window.dispatchEvent(new CustomEvent("open-search-dialog"));
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors active:scale-[0.98] text-muted-foreground hover:text-foreground hover:bg-accent/50"
            >
              <Search className="w-5 h-5" />
              <span className="text-sm font-medium">Search</span>
            </button>
            {MORE_ITEMS.map((item) => {
              const active = location === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-colors active:scale-[0.98]",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-around h-14 px-2">
          {PRIMARY_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <button
                key={item.path}
                onClick={() => {
                  if (item.matchPrefix) {
                    handleTasksClick();
                  } else {
                    navigate(item.path);
                  }
                  setMoreOpen(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] h-full rounded-lg transition-colors active:scale-95",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-label={item.label}
              >
                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] h-full rounded-lg transition-colors active:scale-95",
              moreOpen || isMoreActive ? "text-primary" : "text-muted-foreground"
            )}
            aria-label="More navigation options"
          >
            <MoreHorizontal className={cn("w-5 h-5", (moreOpen || isMoreActive) && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
