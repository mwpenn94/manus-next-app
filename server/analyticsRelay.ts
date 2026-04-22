/**
 * Real-Time Analytics WebSocket Relay
 *
 * Provides live visitor count updates to connected dashboard clients.
 * Tracks active visitors per project with heartbeat/timeout expiry.
 *
 * Architecture:
 *   Tracking pixel → POST /api/analytics/collect → notifyPageView()
 *   Dashboard client → WS /api/analytics/ws?projectId=xxx → receives live counts
 *
 * Active visitors expire after 30 seconds of inactivity.
 * Dashboard clients receive updates whenever the count changes.
 */

import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";

// ── Types ──

export interface ActiveVisitor {
  visitorHash: string;
  projectId: string;
  path: string;
  lastSeen: number;
  country?: string | null;
}

interface DashboardClient {
  ws: WebSocket;
  projectId: string;
  userId?: number;
}

interface LiveAnalyticsMessage {
  type: "visitor_count" | "visitor_event" | "heartbeat";
  projectId: string;
  activeVisitors: number;
  recentPaths?: string[];
  timestamp: number;
}

// ── Configuration ──

const VISITOR_EXPIRY_MS = 30_000; // 30 seconds
const CLEANUP_INTERVAL_MS = 10_000; // Clean up every 10 seconds
const HEARTBEAT_INTERVAL_MS = 15_000; // Send heartbeat every 15 seconds

// ── State ──

/** Active visitors per project: Map<projectExternalId, Map<visitorHash, ActiveVisitor>> */
const activeVisitors = new Map<string, Map<string, ActiveVisitor>>();

/** Connected dashboard clients */
const dashboardClients = new Set<DashboardClient>();

/** Cleanup timer */
let cleanupTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

// ── Visitor Tracking ──

/**
 * Notify the relay of a new page view event.
 * Called from the analytics collect endpoint.
 */
export function notifyPageView(event: {
  projectExternalId: string;
  visitorHash: string;
  path: string;
  country?: string | null;
}): void {
  const { projectExternalId, visitorHash, path, country } = event;

  if (!activeVisitors.has(projectExternalId)) {
    activeVisitors.set(projectExternalId, new Map());
  }

  const projectVisitors = activeVisitors.get(projectExternalId)!;
  const previousCount = projectVisitors.size;

  projectVisitors.set(visitorHash, {
    visitorHash,
    projectId: projectExternalId,
    path,
    lastSeen: Date.now(),
    country,
  });

  const newCount = projectVisitors.size;

  // Broadcast to dashboard clients watching this project
  if (newCount !== previousCount) {
    broadcastToProject(projectExternalId, {
      type: "visitor_count",
      projectId: projectExternalId,
      activeVisitors: newCount,
      recentPaths: getRecentPaths(projectExternalId),
      timestamp: Date.now(),
    });
  }
}

/**
 * Get current active visitor count for a project.
 */
export function getActiveVisitorCount(projectExternalId: string): number {
  const projectVisitors = activeVisitors.get(projectExternalId);
  if (!projectVisitors) return 0;

  // Clean expired visitors first
  const now = Date.now();
  Array.from(projectVisitors.entries()).forEach(([hash, visitor]) => {
    if (now - visitor.lastSeen > VISITOR_EXPIRY_MS) {
      projectVisitors.delete(hash);
    }
  });

  return projectVisitors.size;
}

/**
 * Get the most recent paths being viewed for a project.
 */
function getRecentPaths(projectExternalId: string): string[] {
  const projectVisitors = activeVisitors.get(projectExternalId);
  if (!projectVisitors) return [];

  const paths = new Set<string>();
  const visitors = Array.from(projectVisitors.values());
  for (let i = 0; i < visitors.length && paths.size < 5; i++) {
    paths.add(visitors[i].path);
  }
  return Array.from(paths);
}

// ── Broadcasting ──

function broadcastToProject(projectExternalId: string, message: LiveAnalyticsMessage): void {
  const payload = JSON.stringify(message);

  Array.from(dashboardClients).forEach(client => {
    if (client.projectId === projectExternalId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(payload);
      } catch (err) {
        // Client will be cleaned up on close
      }
    }
  });
}

// ── Cleanup ──

function cleanupExpiredVisitors(): void {
  const now = Date.now();
  const projectsToNotify: string[] = [];

  Array.from(activeVisitors.entries()).forEach(([projectId, visitors]) => {
    const previousCount = visitors.size;

    Array.from(visitors.entries()).forEach(([hash, visitor]) => {
      if (now - visitor.lastSeen > VISITOR_EXPIRY_MS) {
        visitors.delete(hash);
      }
    });

    const newCount = visitors.size;
    if (newCount !== previousCount) {
      projectsToNotify.push(projectId);
    }

    // Remove empty project maps
    if (visitors.size === 0) {
      activeVisitors.delete(projectId);
    }
  });

  // Broadcast updated counts
  for (const projectId of projectsToNotify) {
    broadcastToProject(projectId, {
      type: "visitor_count",
      projectId,
      activeVisitors: getActiveVisitorCount(projectId),
      recentPaths: getRecentPaths(projectId),
      timestamp: Date.now(),
    });
  }
}

function sendHeartbeats(): void {
  Array.from(dashboardClients).forEach(client => {
    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify({
          type: "heartbeat",
          projectId: client.projectId,
          activeVisitors: getActiveVisitorCount(client.projectId),
          timestamp: Date.now(),
        }));
      } catch {
        // Will be cleaned up on close
      }
    }
  });
}

// ── WebSocket Server ──

/**
 * Initialize the analytics WebSocket relay on the existing HTTP server.
 * Handles upgrade requests to /api/analytics/ws
 */
export function initAnalyticsRelay(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: any, socket: any, head: any) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname !== "/api/analytics/ws") {
      return; // Let other upgrade handlers handle it
    }

    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
      wss.emit("connection", ws, request, projectId);
    });
  });

  wss.on("connection", (ws: WebSocket, _request: any, projectId: string) => {
    const client: DashboardClient = { ws, projectId };
    dashboardClients.add(client);

    console.log(`[AnalyticsRelay] Dashboard client connected for project ${projectId}. Total clients: ${dashboardClients.size}`);

    // Send initial count immediately
    const initialMessage: LiveAnalyticsMessage = {
      type: "visitor_count",
      projectId,
      activeVisitors: getActiveVisitorCount(projectId),
      recentPaths: getRecentPaths(projectId),
      timestamp: Date.now(),
    };
    ws.send(JSON.stringify(initialMessage));

    ws.on("close", () => {
      dashboardClients.delete(client);
      console.log(`[AnalyticsRelay] Dashboard client disconnected. Total clients: ${dashboardClients.size}`);
    });

    ws.on("error", (err) => {
      console.warn("[AnalyticsRelay] WebSocket error:", err.message);
      dashboardClients.delete(client);
    });

    // Handle ping from client (keep-alive)
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch {
        // Ignore malformed messages
      }
    });
  });

  // Start cleanup and heartbeat timers
  cleanupTimer = setInterval(cleanupExpiredVisitors, CLEANUP_INTERVAL_MS);
  heartbeatTimer = setInterval(sendHeartbeats, HEARTBEAT_INTERVAL_MS);

  // Don't prevent process exit
  if (cleanupTimer.unref) cleanupTimer.unref();
  if (heartbeatTimer.unref) heartbeatTimer.unref();

  console.log("[AnalyticsRelay] Real-time analytics WebSocket initialized on /api/analytics/ws");
}

/**
 * Get relay statistics for monitoring.
 */
export function getRelayStats(): {
  connectedClients: number;
  trackedProjects: number;
  totalActiveVisitors: number;
} {
  let totalActiveVisitors = 0;
  Array.from(activeVisitors.keys()).forEach(projectId => {
    totalActiveVisitors += getActiveVisitorCount(projectId);
  });

  return {
    connectedClients: dashboardClients.size,
    trackedProjects: activeVisitors.size,
    totalActiveVisitors,
  };
}
