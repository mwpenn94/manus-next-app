/**
 * NotificationCenter — In-app notification bell with dropdown
 *
 * Shows unread count badge, lists recent notifications with
 * mark-read and mark-all-read actions.
 * Groups stale_completed notifications with a batch "Resume All" action.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { Bell, Check, CheckCheck, X, Clock, Play, AlertCircle, Share2, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string | null;
  taskExternalId: string | null;
  read: number;
  createdAt: Date;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: unreadData } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30s
  });
  const unreadCount: number = typeof unreadData === "number" ? unreadData : 0;
  const { data: notifications = [], refetch } = trpc.notification.list.useQuery(
    { limit: 30 },
    { enabled: open }
  );

  const markRead = trpc.notification.markRead.useMutation({
    onSuccess: () => { refetch(); },
  });
  const markAllRead = trpc.notification.markAllRead.useMutation({
    onSuccess: () => { refetch(); },
  });
  const resumeStale = trpc.task.resumeStale.useMutation({
    onSuccess: () => {
      toast.success("Task resumed");
      utils.task.list.invalidate();
      refetch();
    },
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

  // Group stale_completed notifications
  const { staleGroup, otherNotifications } = useMemo(() => {
    const stale: Notification[] = [];
    const other: Notification[] = [];
    for (const n of notifications as Notification[]) {
      if (n.type === "stale_completed") {
        stale.push(n);
      } else {
        other.push(n);
      }
    }
    return { staleGroup: stale, otherNotifications: other };
  }, [notifications]);

  const handleResumeAll = () => {
    const taskIds = staleGroup
      .map(n => n.taskExternalId)
      .filter((id): id is string => !!id);
    const unique = Array.from(new Set(taskIds));
    for (const id of unique) {
      resumeStale.mutate({ externalId: id });
    }
    // Mark all stale notifications as read
    for (const n of staleGroup) {
      if (!n.read) markRead.mutate({ id: n.id });
    }
    toast.info(`Resuming ${unique.length} task${unique.length !== 1 ? "s" : ""}...`);
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "task_completed": return <Check className="w-3.5 h-3.5 text-emerald-400" />;
      case "task_error": return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
      case "share_viewed": return <Share2 className="w-3.5 h-3.5 text-blue-400" />;
      case "stale_completed": return <Clock className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Info className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const renderNotification = (n: Notification) => (
    <div
      key={n.id}
      className={cn(
        "px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer group",
        !n.read && "bg-primary/5"
      )}
      onClick={() => {
        if (!n.read) markRead.mutate({ id: n.id });
        if (n.taskExternalId) {
          navigate(`/task/${n.taskExternalId}`);
          setOpen(false);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">{typeIcon(n.type)}</span>
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm leading-tight",
            n.read ? "text-muted-foreground" : "text-foreground font-medium"
          )}>
            {n.title}
          </p>
          {n.content && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!n.read && (
          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
        )}
      </div>
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              <>
                {/* Stale-completed group */}
                {staleGroup.length > 0 && (
                  <div className="border-b border-border">
                    <div className="px-4 py-2.5 bg-amber-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">
                          {staleGroup.length} auto-completed task{staleGroup.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResumeAll();
                        }}
                        disabled={resumeStale.isPending}
                        className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        Resume All
                      </button>
                    </div>
                    {staleGroup.slice(0, 3).map(renderNotification)}
                    {staleGroup.length > 3 && (
                      <div className="px-4 py-2 text-[10px] text-muted-foreground text-center">
                        +{staleGroup.length - 3} more auto-completed
                      </div>
                    )}
                  </div>
                )}

                {/* Other notifications */}
                {otherNotifications.map(renderNotification)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
