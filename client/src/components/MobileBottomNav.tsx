/**
 * MobileBottomNav — Fixed bottom navigation bar for mobile devices.
 * Shows on screens < md breakpoint. Provides quick access to Home, Tasks, Billing,
 * and a "More" menu that exposes Manus-aligned sidebar destinations.
 *
 * Uses env(safe-area-inset-bottom) for iOS notch/home-indicator devices.
 * Touch targets are minimum 44px for accessibility.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Home, ListTodo, CreditCard, MoreHorizontal, X,
  Brain, FolderOpen, Clock, BookOpen, Settings, BarChart3, Globe,
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
  { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/memory", label: "Memory", icon: Brain },
  { path: "/projects", label: "Projects", icon: FolderOpen },
  { path: "/library", label: "Library", icon: BookOpen },
  { path: "/schedule", label: "Schedules", icon: Clock },
  { path: "/browser", label: "Browser", icon: Globe },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { tasks } = useTask();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close more menu on navigation
  useEffect(() => {
    setMoreOpen(false);
  }, [location]);

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return location.startsWith("/task");
    }
    return location === item.path;
  };

  const handleTasksClick = () => {
    if (tasks.length > 0) {
      navigate(`/task/${tasks[0].id}`);
    } else {
      navigate("/");
    }
  };

  const isMoreActive = MORE_ITEMS.some((item) => location === item.path || location.startsWith(item.path + "/"));

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
          className="md:hidden fixed left-0 right-0 z-50 bg-card border-t border-border rounded-t-xl shadow-2xl max-h-[60vh] overflow-y-auto"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card/95 backdrop-blur-md">
            <span className="text-sm font-medium text-foreground">More</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-2 -mr-1 rounded-md text-muted-foreground hover:text-foreground active:scale-95"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1 p-3">
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
                    "flex flex-col items-center justify-center gap-1.5 py-3 min-h-[56px] rounded-lg transition-colors active:scale-95",
                    active
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                  <span className="text-[10px] font-medium leading-none text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom nav bar — with safe-area-inset-bottom for iOS */}
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
                  active
                    ? "text-primary"
                    : "text-muted-foreground"
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
              moreOpen || isMoreActive
                ? "text-primary"
                : "text-muted-foreground"
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
