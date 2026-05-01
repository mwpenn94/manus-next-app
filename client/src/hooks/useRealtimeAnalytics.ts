/**
 * useRealtimeAnalytics — Live visitor tracking via WebSocket.
 *
 * Connects to /api/analytics/ws for real-time visitor counts
 * and recent page paths for a given project.
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface RealtimeAnalyticsState {
  activeVisitors: number;
  connected: boolean;
  recentPaths: string[];
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];
const PING_INTERVAL = 25000;

export function useRealtimeAnalytics(projectId: string): RealtimeAnalyticsState {
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [connected, setConnected] = useState(false);
  const [recentPaths, setRecentPaths] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!projectId || !mountedRef.current) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/analytics/ws?projectId=${encodeURIComponent(projectId)}`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setConnected(true);
        reconnectAttemptRef.current = 0;
        pingTimerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, PING_INTERVAL);
      };
      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === "visitor_count" || data.type === "heartbeat") {
            setActiveVisitors(data.activeVisitors ?? 0);
            if (data.recentPaths) setRecentPaths(data.recentPaths);
          }
        } catch { /* ignore */ }
      };
      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        wsRef.current = null;
        if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
        const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current++;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
      ws.onerror = () => { ws.close(); };
    } catch {
      const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
      reconnectAttemptRef.current++;
      reconnectTimerRef.current = setTimeout(connect, delay);
    }
  }, [projectId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      if (pingTimerRef.current) { clearInterval(pingTimerRef.current); pingTimerRef.current = null; }
    };
  }, [connect]);

  return { activeVisitors, connected, recentPaths };
}
