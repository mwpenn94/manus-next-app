/**
 * useRealtimeAnalytics — Stub hook for live visitor tracking.
 *
 * The WebSocket endpoint (/api/analytics/ws) is not yet deployed.
 * This stub returns safe defaults so components render correctly
 * without a live connection. When the backend is ready, replace
 * this with the full WebSocket implementation.
 */
import { useState, useEffect } from "react";

export function useRealtimeAnalytics(_projectId: string) {
  const [activeVisitors] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Simulate a brief "connecting" state then settle to connected=false
    const timer = setTimeout(() => setConnected(false), 2000);
    return () => clearTimeout(timer);
  }, [_projectId]);

  return { activeVisitors, connected, recentPaths: [] as string[] };
}
