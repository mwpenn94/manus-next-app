/**
 * Scheduled Connector Refresh Endpoint — /api/scheduled/connector-refresh
 *
 * Called by the Manus scheduled task agent to proactively refresh expiring
 * OAuth tokens for all users who have auto-refresh enabled.
 *
 * Auth is handled via the platform's auto-injected session cookie.
 * Must allow user.role == "user" (scheduled tasks get "user" role).
 *
 * Flow:
 * 1. Query all connectorHealth records where autoRefreshEnabled=true and nextRefreshAt <= now
 * 2. For each, load the connector's refresh_token and call provider.refreshToken()
 * 3. Update tokens, health records, and log events
 * 4. Return a summary of all refresh attempts
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getUserConnectors,
  updateConnectorOAuthTokens,
  updateConnectorHealth,
  logConnectorHealthEvent,
  getOrCreateConnectorHealth,
} from "./db";
import { getDb } from "./db";
import { connectorHealth } from "../drizzle/schema";
import { and, eq, lte } from "drizzle-orm";

interface RefreshResult {
  connectorId: string;
  userId: number;
  status: "refreshed" | "failed" | "skipped";
  error?: string;
  reason?: string;
  newExpiresAt?: string;
}

export async function handleConnectorRefresh(req: Request, res: Response) {
  try {
    // Authenticate — scheduled tasks get "user" role
    const user = await sdk.authenticateRequest(req);
    if (!user || !["user", "admin"].includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available" });
    }

    const now = new Date();
    const results: RefreshResult[] = [];

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
      return res.json({
        success: true,
        message: "No connectors due for refresh",
        refreshed: 0,
        failed: 0,
        skipped: 0,
        results: [],
        timestamp: now.toISOString(),
      });
    }

    // Lazy-load the OAuth provider registry
    const { getOAuthProvider } = await import("./connectorOAuth");

    for (const record of dueRecords) {
      const { userId, connectorId } = record;

      try {
        // Load the user's connector to get the refresh token
        const userConns = await getUserConnectors(userId);
        const conn = userConns.find(
          (c) => c.connectorId === connectorId && c.status === "connected"
        );

        // Skip PAT-based connectors — they don't use OAuth refresh
        const authMethod = (conn as any)?.authMethod;
        if (authMethod === "api_key" || authMethod === "webhook") {
          await updateConnectorHealth(userId, connectorId, {
            autoRefreshEnabled: false,
            lastRefreshError: "PAT-based auth does not support token refresh",
          });
          await logConnectorHealthEvent(
            userId,
            connectorId,
            "auto_refresh_disabled",
            "Connector uses PAT auth — refresh not applicable"
          );
          results.push({ connectorId, userId, status: "skipped", reason: "PAT auth" });
          continue;
        }

        if (!conn || !conn.refreshToken) {
          // Connector disconnected or no refresh token — skip and disable auto-refresh
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
          results.push({ connectorId, userId, status: "skipped", error: "No refresh token" });
          continue;
        }

        // Get the OAuth provider for this connector
        const provider = getOAuthProvider(connectorId);
        if (!provider?.refreshToken) {
          await updateConnectorHealth(userId, connectorId, {
            autoRefreshEnabled: false,
            lastRefreshError: "Provider does not support token refresh",
          });
          results.push({ connectorId, userId, status: "skipped", error: "Provider unsupported" });
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
        const bufferMs = 5 * 60 * 1000; // 5 minutes before expiry
        const nextRefreshAt = newExpiry
          ? new Date(Math.max(Date.now() + 60000, newExpiry.getTime() - bufferMs))
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

        results.push({
          connectorId,
          userId,
          status: "refreshed",
          newExpiresAt: newExpiry?.toISOString(),
        });
      } catch (err: any) {
        // Increment fail count
        const health = await getOrCreateConnectorHealth(userId, connectorId);
        const newFailCount = (health.refreshFailCount ?? 0) + 1;
        const isTerminal = newFailCount >= 3;

        await updateConnectorHealth(userId, connectorId, {
          refreshFailCount: newFailCount,
          lastRefreshError: err.message || "Unknown error",
          healthStatus: isTerminal ? "refresh_failed" : "expiring_soon",
          // If terminal, disable auto-refresh to prevent hammering
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

        results.push({
          connectorId,
          userId,
          status: "failed",
          error: err.message,
        });
      }
    }

    const refreshed = results.filter((r) => r.status === "refreshed").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;

    console.log(
      `[ConnectorRefresh] Processed ${results.length} connectors: ${refreshed} refreshed, ${failed} failed, ${skipped} skipped`
    );

    return res.json({
      success: true,
      message: `Processed ${results.length} connectors`,
      refreshed,
      failed,
      skipped,
      results,
      timestamp: now.toISOString(),
    });
  } catch (err: any) {
    console.error("[ConnectorRefresh] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
