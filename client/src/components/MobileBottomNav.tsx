/**
 * MobileBottomNav — Fixed bottom navigation bar for mobile devices.
 * Matches Manus v26.3.5 mobile exactly:
 * - Bottom tab bar: Home (house), Tasks (list), Billing (card), More (•••)
 * - More menu: full-screen dark list with Search at top, Help highlighted at bottom
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Home, ListTodo, CreditCard, MoreHorizontal, X, Search,
  FolderOpen, BookOpen, Clock, Zap, Plug, Settings, HelpCircle,
  Github, Brain, Compass, Webhook, Shield,
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
  { path: "/memory", label: "Memory", icon: Brain },
  { path: "/github", label: "GitHub", icon: Github },
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/webhooks", label: "Webhooks", icon: Webhook },
  { path: "/data-controls", label: "Data Controls", icon: Shield },
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

  // Prevent body scroll when More menu is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [moreOpen]);

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
      {/* Full-screen More menu — matches Manus dark full-screen list */}
      {moreOpen && (
        <div
          role="dialog"
          aria-label="More navigation options"
          className="md:hidden fixed inset-0 z-50 bg-background flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 h-14 shrink-0">
            <span className="text-base font-semibold text-foreground">More</span>
            <button
              onClick={() => setMoreOpen(false)}
              className="p-2 -mr-2 rounded-md text-muted-foreground hover:text-foreground active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Search button */}
            <button
              onClick={() => {
                setMoreOpen(false);
                window.dispatchEvent(new CustomEvent("open-search-dialog"));
              }}
              className="flex items-center gap-4 w-full px-3 py-3.5 rounded-lg transition-colors active:scale-[0.98] text-foreground hover:bg-accent/30"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
              <span className="text-[15px] font-medium">Search</span>
            </button>

            {/* Navigation items */}
            {MORE_ITEMS.map((item) => {
              const active = location === item.path;
              const isHelp = item.path === "/help";
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-4 w-full px-3 py-3.5 rounded-lg transition-colors active:scale-[0.98]",
                    isHelp
                      ? "bg-primary/10 text-primary"
                      : active
                      ? "text-primary bg-primary/5"
                      : "text-foreground hover:bg-accent/30"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5",
                    isHelp ? "text-primary" : active ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-[15px] font-medium",
                    isHelp && "text-primary"
                  )}>{item.label}</span>
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
