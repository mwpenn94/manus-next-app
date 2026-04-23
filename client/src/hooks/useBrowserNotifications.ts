/**
 * useBrowserNotifications — Browser Notification API integration
 *
 * Requests permission and dispatches native browser push notifications
 * when new in-app notifications arrive (task complete, task error, etc.)
 * so users are alerted even when the tab is not focused.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";

type NotificationPermission = "default" | "granted" | "denied";

const STORAGE_KEY = "browser-notifications-enabled";

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });

  const lastSeenCountRef = useRef<number | null>(null);

  // Poll unread count to detect new notifications
  const { data: unreadCount } = trpc.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 15000, // Check every 15s
    enabled: enabled && permission === "granted",
  });

  // Fetch latest notification for display
  const { data: latestNotifications } = trpc.notification.list.useQuery(
    { limit: 1 },
    {
      enabled: enabled && permission === "granted",
      refetchInterval: 15000,
    }
  );

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("[BrowserNotifications] Not supported in this browser");
      return "denied" as NotificationPermission;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setEnabled(true);
        localStorage.setItem(STORAGE_KEY, "true");
      }
      return result;
    } catch (err) {
      console.error("[BrowserNotifications] Permission request failed:", err);
      return "denied" as NotificationPermission;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem(STORAGE_KEY, "false");
      return;
    }

    if (permission === "granted") {
      setEnabled(true);
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      const result = await requestPermission();
      if (result === "granted") {
        setEnabled(true);
        localStorage.setItem(STORAGE_KEY, "true");
      }
    }
  }, [enabled, permission, requestPermission]);

  // Dispatch browser notification when new unread notifications appear
  useEffect(() => {
    if (!enabled || permission !== "granted") return;
    if (typeof unreadCount !== "number") return;

    // Skip on first load — just record the baseline
    if (lastSeenCountRef.current === null) {
      lastSeenCountRef.current = unreadCount;
      return;
    }

    // New notification arrived
    if (unreadCount > lastSeenCountRef.current) {
      // Only show if tab is not focused
      if (document.hidden || !document.hasFocus()) {
        const latest = latestNotifications?.[0] as any;
        const title = latest?.title || "New notification";
        const body = latest?.content || "You have a new notification in Manus Next";
        const icon = "/favicon.ico";

        try {
          const notification = new Notification(title, {
            body,
            icon,
            tag: `manus-${Date.now()}`,
            silent: false,
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
            // Navigate to task if available
            if (latest?.taskExternalId) {
              window.location.hash = `#/task/${latest.taskExternalId}`;
            }
          };

          // Auto-close after 10 seconds
          setTimeout(() => notification.close(), 10000);
        } catch (err) {
          console.warn("[BrowserNotifications] Failed to show notification:", err);
        }
      }
    }

    lastSeenCountRef.current = unreadCount;
  }, [unreadCount, enabled, permission, latestNotifications]);

  return {
    /** Whether browser notifications are supported */
    supported: typeof window !== "undefined" && "Notification" in window,
    /** Current permission state */
    permission,
    /** Whether the user has enabled browser notifications */
    enabled,
    /** Toggle browser notifications on/off (requests permission if needed) */
    toggle,
    /** Explicitly request permission */
    requestPermission,
  };
}
