/**
 * In-App Connector Token Auto-Refresh Timer
 *
 * Runs within the Express server process — no external cron dependency.
 * The app is sovereign: it manages its own token lifecycle.
 *
 * Checks every 30 minutes for connectors with auto-refresh enabled
 * and tokens approaching expiry. Refreshes them proactively.
 *
 * Graceful startup/shutdown: starts after server is ready, cleans up on SIGTERM.
 */
import { getDb } from "./db";
import {
  getUserConnectors,
  updateConnectorOAuthTokens,
  updateConnectorHealth,
  logConnectorHealthEvent,
  getOrCreateConnectorHealth,
} from "./db";
import { connectorHealth } from "../drizzle/schema";
import { and, eq, lte } from "drizzle-orm";

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

let timerId: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

/**
 * Core refresh logic — extracted from scheduledConnectorRefresh.ts
 * so it can run both from the timer and from the HTTP endpoint.
 */
async function refreshDueConnectors(): Promise<{
  processed: number;
  refreshed: number;
  failed: number;
  skipped: number;
}> {
  const db = await getDb();
  if (!db) {
    console.log("[AutoRefresh] Database not available, skipping cycle");
    return { processed: 0, refreshed: 0, failed: 0, skipped: 0 };
  }

  const now = new Date();

  // Find all health records with auto-refresh enabled and nextRefreshAt <= now
  const dueRecords = await db
    .select()
    .from(connectorHealth)
    .where(
      and(
        eq(connectorHealth.autoRefreshEnabled, true),
        lte(connectorHealth.nextRefreshAt, now)
      )
    );

  if (dueRecords.length === 0) {
    return { processed: 0, refreshed: 0, failed: 0, skipped: 0 };
  }

  // Lazy-load the OAuth provider registry
  const { getOAuthProvider } = await import("./connectorOAuth");

  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of dueRecords) {
    const { userId, connectorId } = record;

    try {
      // Load the user's connector to get the refresh token
      const userConns = await getUserConnectors(userId);
      const conn = userConns.find(
        (c) => c.connectorId === connectorId && c.status === "connected"
      );

      if (!conn || !conn.refreshToken) {
        // Connector disconnected or no refresh token — skip and disable
        await updateConnectorHealth(userId, connectorId, {
          autoRefreshEnabled: false,
          lastRefreshError: "Connector disconnected or no refresh token",
        });
        await logConnectorHealthEvent(
          userId,
          connectorId,
          "auto_refresh_disabled",
          "Connector disconnected or refresh token missing"
        );
        skipped++;
        continue;
      }

      // Get the OAuth provider for this connector
      const provider = getOAuthProvider(connectorId);
      if (!provider?.refreshToken) {
        await updateConnectorHealth(userId, connectorId, {
          autoRefreshEnabled: false,
          lastRefreshError: "Provider does not support token refresh",
        });
        skipped++;
        continue;
      }

      // Attempt the refresh
      const tokens = await provider.refreshToken(conn.refreshToken);
      const newExpiry = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null;

      // Update the connector's tokens
      await updateConnectorOAuthTokens(conn.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiresAt: newExpiry,
      });

      // Update health record — reset fail count, set next refresh
      const nextRefreshAt = newExpiry
        ? new Date(Math.max(Date.now() + 60000, newExpiry.getTime() - EXPIRY_BUFFER_MS))
        : null;

      await updateConnectorHealth(userId, connectorId, {
        healthStatus: "healthy",
        lastRefreshAt: new Date(),
        refreshFailCount: 0,
        lastRefreshError: null,
        nextRefreshAt,
      });

      await logConnectorHealthEvent(
        userId,
        connectorId,
        "refresh_success",
        `Token refreshed. New expiry: ${newExpiry?.toISOString() ?? "none"}`
      );

      refreshed++;
    } catch (err: any) {
      // Increment fail count
      const health = await getOrCreateConnectorHealth(userId, connectorId);
      const newFailCount = (health.refreshFailCount ?? 0) + 1;
      const isTerminal = newFailCount >= 3;

      await updateConnectorHealth(userId, connectorId, {
        refreshFailCount: newFailCount,
        lastRefreshError: err.message || "Unknown error",
        healthStatus: isTerminal ? "refresh_failed" : "expiring_soon",
        ...(isTerminal ? { autoRefreshEnabled: false } : {}),
      });

      await logConnectorHealthEvent(
        userId,
        connectorId,
        "refresh_failed",
        `Attempt ${newFailCount}: ${err.message}`
      );

      if (isTerminal) {
        await logConnectorHealthEvent(
          userId,
          connectorId,
          "auto_refresh_disabled",
          `Disabled after ${newFailCount} consecutive failures`
        );
      }

      failed++;
    }
  }

  return { processed: dueRecords.length, refreshed, failed, skipped };
}

/**
 * Run a single refresh cycle with error isolation
 */
async function runRefreshCycle(): Promise<void> {
  if (isRunning) {
    console.log("[AutoRefresh] Previous cycle still running, skipping");
    return;
  }

  isRunning = true;
  try {
    const result = await refreshDueConnectors();
    if (result.processed > 0) {
      console.log(
        `[AutoRefresh] Cycle complete: ${result.refreshed} refreshed, ${result.failed} failed, ${result.skipped} skipped`
      );
    }
  } catch (err: any) {
    console.error("[AutoRefresh] Cycle error:", err.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the auto-refresh timer. Call once after server is ready.
 */
export function startAutoRefreshTimer(): void {
  if (timerId) {
    console.log("[AutoRefresh] Timer already running");
    return;
  }

  console.log(`[AutoRefresh] Starting timer (every ${REFRESH_INTERVAL_MS / 60000}m)`);

  // Run first cycle after a short delay (let server fully initialize)
  setTimeout(() => {
    runRefreshCycle();
  }, 10_000);

  // Then run every 30 minutes
  timerId = setInterval(runRefreshCycle, REFRESH_INTERVAL_MS);
}

/**
 * Stop the auto-refresh timer. Call on server shutdown.
 */
export function stopAutoRefreshTimer(): void {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
    console.log("[AutoRefresh] Timer stopped");
  }
}

// Export for testing
export { refreshDueConnectors, runRefreshCycle, REFRESH_INTERVAL_MS, EXPIRY_BUFFER_MS };
