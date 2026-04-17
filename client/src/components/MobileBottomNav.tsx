/**
 * MobileBottomNav — Fixed bottom navigation bar for mobile devices.
 * Shows on screens < md breakpoint. Provides quick access to Home, Tasks, Billing, Settings.
 */
import { useLocation } from "wouter";
import { Home, ListTodo, CreditCard, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTask } from "@/contexts/TaskContext";

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  matchPrefix?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Home", icon: Home },
  { path: "/task", label: "Tasks", icon: ListTodo, matchPrefix: true },
  { path: "/billing", label: "Billing", icon: CreditCard },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function MobileBottomNav() {
  const [location, navigate] = useLocation();
  const { tasks } = useTask();

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return location.startsWith("/task");
    }
    return location === item.path;
  };

  // Navigate to the most recent task, or first task
  const handleTasksClick = () => {
    if (tasks.length > 0) {
      navigate(`/task/${tasks[0].id}`);
    } else {
      navigate("/");
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {NAV_ITEMS.map((item) => {
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
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full rounded-lg transition-colors active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
