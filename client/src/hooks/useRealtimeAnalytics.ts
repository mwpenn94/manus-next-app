/**
 * useRealtimeAnalytics — React hook for live visitor count via WebSocket
 *
 * Connects to /api/analytics/ws?projectId=xxx and receives:
 *   - visitor_count: updated active visitor count
 *   - heartbeat: periodic keepalive with current count
 *
 * Returns { activeVisitors, recentPaths, connected }
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface LiveAnalyticsMessage {
  type: "visitor_count" | "visitor_event" | "heartbeat" | "pong";
  projectId: string;
  activeVisitors: number;
  recentPaths?: string[];
  timestamp: number;
}

interface RealtimeAnalyticsState {
  /** Number of currently active visitors */
  activeVisitors: number;
  /** Most recent paths being viewed */
  recentPaths: string[];
  /** Whether the WebSocket is connected */
  connected: boolean;
}

export function useRealtimeAnalytics(projectExternalId: string | null | undefined): RealtimeAnalyticsState {
  const [state, setState] = useState<RealtimeAnalyticsState>({
    activeVisitors: 0,
    recentPaths: [],
    connected: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connect = useCallback(() => {
    if (!projectExternalId) return;

    // Build WebSocket URL from current location
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/analytics/ws?projectId=${encodeURIComponent(projectExternalId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({ ...prev, connected: true }));

        // Start ping interval for keepalive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20_000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: LiveAnalyticsMessage = JSON.parse(event.data);

          if (msg.type === "visitor_count" || msg.type === "heartbeat") {
            setState(prev => ({
              ...prev,
              activeVisitors: msg.activeVisitors,
              recentPaths: msg.recentPaths || prev.recentPaths,
            }));
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connected: false }));
        cleanup();

        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5_000);
      };

      ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      // Reconnect after 5 seconds on connection failure
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5_000);
    }
  }, [projectExternalId]);

  const cleanup = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, cleanup]);

  return state;
}
