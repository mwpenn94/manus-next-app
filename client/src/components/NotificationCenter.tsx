/**
 * NotificationCenter — In-app notification bell with dropdown
 *
 * Shows unread count badge, lists recent notifications with
 * mark-read and mark-all-read actions.
 */
import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, ExternalLink, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const unreadCount: number = typeof unreadData === "number" ? unreadData : 0;
  const { data: notifications = [], refetch } = trpc.notification.list.useQuery(
    { limit: 20 },
    { enabled: open }
  );

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => refetch(),
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => refetch(),
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const typeIcon = (type: string) => {
    switch (type) {
      case "task_completed": return "✓";
      case "task_error": return "✕";
      case "share_viewed": return "👁";
      default: return "ℹ";
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="Notifications"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl shadow-black/20 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Read all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  className={cn(
                    "px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer group",
                    !n.readAt && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!n.readAt) markRead.mutate({ id: n.id });
                    if (n.taskExternalId) {
                      navigate(`/task/${n.taskExternalId}`);
                      setOpen(false);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{typeIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm leading-tight",
                        n.readAt ? "text-muted-foreground" : "text-foreground font-medium"
                      )}>
                        {n.title}
                      </p>
                      {n.content && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.readAt && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
