/**
 * useNetworkStatus — Graceful degradation hook
 * 
 * G10: Detects offline/online transitions, provides reconnect state,
 * and shows a banner when the network is unavailable.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // true if we recovered from offline
  lastOnlineAt: Date | null;
  reconnecting: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const wasOfflineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setReconnecting(false);
    setLastOnlineAt(new Date());
    setWasOffline(true);
    // Clear the "was offline" indicator after 5 seconds
    if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
    wasOfflineTimerRef.current = setTimeout(() => setWasOffline(false), 5000);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setReconnecting(true);
  }, []);

  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (wasOfflineTimerRef.current) clearTimeout(wasOfflineTimerRef.current);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, wasOffline, lastOnlineAt, reconnecting };
}
