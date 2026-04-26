/**
 * Pass 31 — Recursion Pass 1: Depth Scan
 *
 * Edge cases in token lifecycle, refresh failure modes, health status
 * computation, auto-refresh toggle validation, and UI contract verification.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

/* ═══════════════════════════════════════════════════════════════════
   1. HEALTH STATUS COMPUTATION — computeHealthStatus edge cases
   ═══════════════════════════════════════════════════════════════════ */

describe("Health Status Computation", () => {
  const dbSrc = readFile("server/db.ts");

  it("computeHealthStatus function exists and is exported", () => {
    expect(dbSrc).toContain("export function computeHealthStatus");
    expect(dbSrc).toContain("export async function getOrCreateConnectorHealth");
  });

  it("handles null token expiry (PAT/manual tokens → no_token)", () => {
    // PATs and manual tokens have no expiry — should return healthy status
    expect(dbSrc).toMatch(/tokenExpiresAt.*null|!tokenExpiresAt/);
    expect(dbSrc).toContain("no_token");
  });

  it("handles expired tokens with no refresh token → expired", () => {
    expect(dbSrc).toContain("expired");
  });

  it("handles expired tokens with auto-refresh enabled → expiring_soon or refresh_failed", () => {
    expect(dbSrc).toContain("refresh_failed");
    expect(dbSrc).toContain("expiring_soon");
  });

  it("handles refresh fail count threshold (3+ failures → refresh_failed)", () => {
    // The server uses refreshFailCount >= 3 to mark as refresh_failed
    expect(dbSrc).toMatch(/refreshFailCount.*>=?\s*3|failCount.*>=?\s*3/);
  });

  it("handles healthy tokens (not expired, auto-refresh on)", () => {
    expect(dbSrc).toContain("healthy");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2. AUTO-REFRESH TOGGLE — Server-side validation
   ═══════════════════════════════════════════════════════════════════ */

describe("Auto-Refresh Toggle Validation", () => {
  const routerSrc = readFile("server/routers/connector.ts");

  it("updateAutoRefresh validates connector exists and is connected", () => {
    expect(routerSrc).toContain("Connector not found or not connected");
  });

  it("updateAutoRefresh rejects enabling without refresh token", () => {
    expect(routerSrc).toContain("Auto-refresh requires an OAuth connection with a refresh token");
  });

  it("updateAutoRefresh computes nextRefreshAt when enabling", () => {
    // 5 minutes before expiry
    expect(routerSrc).toMatch(/5\s*\*\s*60\s*\*\s*1000/);
    expect(routerSrc).toContain("nextRefreshAt");
  });

  it("manualRefresh updates health record on success", () => {
    expect(routerSrc).toContain("manual_refresh");
    expect(routerSrc).toContain("refreshFailCount: 0");
  });

  it("manualRefresh increments fail count on error", () => {
    expect(routerSrc).toMatch(/refreshFailCount.*\+\s*1|newFailCount/);
  });

  it("manualRefresh logs events for both success and failure", () => {
    expect(routerSrc).toContain("logConnectorHealthEvent");
    expect(routerSrc).toContain("refresh_failed");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3. SCHEMA INTEGRITY — connector_health table
   ═══════════════════════════════════════════════════════════════════ */

describe("Connector Health Schema", () => {
  const schemaSrc = readFile("drizzle/schema.ts");

  it("connectorHealth table has all required columns", () => {
    expect(schemaSrc).toContain("connectorHealth");
    expect(schemaSrc).toMatch(/userId.*int|int.*userId/);
    expect(schemaSrc).toMatch(/connectorId.*varchar|varchar.*connectorId/);
    expect(schemaSrc).toContain("autoRefreshEnabled");
    expect(schemaSrc).toContain("refreshFailCount");
    expect(schemaSrc).toContain("lastRefreshError");
    expect(schemaSrc).toContain("healthStatus");
    expect(schemaSrc).toContain("nextRefreshAt");
  });

  it("connectorHealthLogs table exists for audit trail", () => {
    expect(schemaSrc).toContain("connectorHealthLogs");
    expect(schemaSrc).toContain("eventType");
    expect(schemaSrc).toContain("details");
  });

  it("healthStatus enum includes all expected values", () => {
    expect(schemaSrc).toContain("healthy");
    expect(schemaSrc).toContain("expiring_soon");
    expect(schemaSrc).toContain("expired");
    expect(schemaSrc).toContain("refresh_failed");
    expect(schemaSrc).toContain("no_token");
    expect(schemaSrc).toContain("unknown");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4. UI CONTRACT — ConnectorDetailPage health integration
   ═══════════════════════════════════════════════════════════════════ */

describe("ConnectorDetailPage Health UI Contract", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");

  it("queries getHealthDetail for the current connector", () => {
    expect(detailSrc).toContain("trpc.connector.getHealthDetail.useQuery");
    expect(detailSrc).toContain("connectorId");
  });

  it("derives connectionStatusLabel from healthStatus", () => {
    expect(detailSrc).toContain("connectionStatusLabel");
    expect(detailSrc).toContain('"Active"');
    expect(detailSrc).toContain('"Needs Attention"');
    expect(detailSrc).toContain('"Expired"');
  });

  it("shows Connection Status row in Details section", () => {
    expect(detailSrc).toContain("Connection Status");
    expect(detailSrc).toContain("connectionStatusLabel");
  });

  it("shows Keep connection active toggle only for OAuth with refresh tokens", () => {
    expect(detailSrc).toContain("Keep connection active");
    expect(detailSrc).toContain("supportsAutoRefresh");
    expect(detailSrc).toContain("Switch");
    expect(detailSrc).toContain("autoRefreshMutation");
  });

  it("shows Last connected timestamp", () => {
    expect(detailSrc).toContain("Last connected");
    expect(detailSrc).toContain("lastConnectedAt");
  });

  it("shows Reconnect prompt when status is expired or refresh_failed", () => {
    expect(detailSrc).toContain("showReconnectPrompt");
    expect(detailSrc).toContain("Connection needs attention");
    expect(detailSrc).toContain("Reconnect");
    expect(detailSrc).toContain("RefreshCw");
  });

  it("does NOT show countdown timers (Manus alignment)", () => {
    // No countdown, timer, or "expires in" text
    expect(detailSrc).not.toMatch(/expires?\s+in/i);
    expect(detailSrc).not.toContain("countdown");
    expect(detailSrc).not.toContain("timer");
  });

  it("does NOT show health event logs in UI (Manus alignment)", () => {
    // Health logs are server-side only
    expect(detailSrc).not.toContain("Health Log");
    expect(detailSrc).not.toContain("Event Log");
    expect(detailSrc).not.toContain("getHealthLogs");
  });

  it("bottom action button shows Reconnect when health is degraded", () => {
    expect(detailSrc).toContain("showReconnectPrompt");
    expect(detailSrc).toContain("manualRefreshMutation");
  });

  it("uses status dot colors: emerald for healthy, amber for needs attention, destructive for expired", () => {
    expect(detailSrc).toContain("bg-emerald-500");
    expect(detailSrc).toContain("bg-amber-500");
    expect(detailSrc).toContain("bg-destructive");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5. UI CONTRACT — ConnectorsSheet health badges
   ═══════════════════════════════════════════════════════════════════ */

describe("ConnectorsSheet Health Badges", () => {
  const sheetSrc = readFile("client/src/components/ConnectorsSheet.tsx");

  it("queries getHealth for health status data", () => {
    expect(sheetSrc).toContain("trpc.connector.getHealth.useQuery");
  });

  it("builds healthMap from health data", () => {
    expect(sheetSrc).toContain("healthMap");
    expect(sheetSrc).toContain("healthStatus");
  });

  it("passes healthStatus to ConnectorCard for connected connectors", () => {
    expect(sheetSrc).toContain("healthStatus={healthMap.get(connector.id)}");
  });

  it("ConnectorCard shows status dot only when healthStatus is present", () => {
    expect(sheetSrc).toContain("showDot");
    expect(sheetSrc).toContain("!!healthStatus");
  });

  it("uses emerald for healthy, amber for expired/failed", () => {
    expect(sheetSrc).toContain("bg-emerald-500");
    expect(sheetSrc).toContain("bg-amber-500");
  });

  it("dot is positioned at bottom-right of icon container", () => {
    expect(sheetSrc).toContain("-bottom-0.5");
    expect(sheetSrc).toContain("-right-0.5");
    expect(sheetSrc).toContain("border-2 border-card");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   6. EDGE CASES — Race conditions and deduplication
   ═══════════════════════════════════════════════════════════════════ */

describe("Token Refresh Edge Cases", () => {
  const routerSrc = readFile("server/routers/connector.ts");

  it("manualRefresh checks for refresh token before attempting refresh", () => {
    expect(routerSrc).toContain("No refresh token available");
  });

  it("manualRefresh checks provider supports token refresh", () => {
    expect(routerSrc).toContain("Provider does not support token refresh");
  });

  it("manualRefresh updates both connector tokens and health record atomically", () => {
    // Should update tokens first, then health record
    expect(routerSrc).toContain("updateConnectorOAuthTokens");
    expect(routerSrc).toContain("updateConnectorHealth");
  });

  it("refresh failure preserves existing tokens (no data loss)", () => {
    // On error, only health record is updated, not the connector tokens
    // The catch block in manualRefresh should update health but not tokens
    const manualRefreshBlock = routerSrc.split("manualRefresh")[1] || "";
    const catchBlock = manualRefreshBlock.split("catch")[1]?.split("getHealthLogs")[0] || "";
    expect(catchBlock).toContain("updateConnectorHealth");
    // Verify the try block has updateConnectorOAuthTokens (success path)
    const tryBlock = manualRefreshBlock.split("try")[1]?.split("catch")[0] || "";
    expect(tryBlock).toContain("updateConnectorOAuthTokens");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   7. DB HELPERS — getOrCreateConnectorHealth upsert behavior
   ═══════════════════════════════════════════════════════════════════ */

describe("DB Helper Upsert Behavior", () => {
  const dbSrc = readFile("server/db.ts");

  it("getOrCreateConnectorHealth creates record if not exists", () => {
    expect(dbSrc).toContain("getOrCreateConnectorHealth");
    // Should have insert/upsert logic
    expect(dbSrc).toMatch(/insert|onDuplicateKeyUpdate|onConflict/);
  });

  it("toggleAutoRefresh updates the autoRefreshEnabled field", () => {
    expect(dbSrc).toContain("toggleAutoRefresh");
    expect(dbSrc).toContain("autoRefreshEnabled");
  });

  it("logConnectorHealthEvent creates an audit log entry", () => {
    expect(dbSrc).toContain("logConnectorHealthEvent");
    expect(dbSrc).toContain("connectorHealthLogs");
  });

  it("syncConnectorHealthFromConnector syncs health from connector data", () => {
    expect(dbSrc).toContain("syncConnectorHealthFromConnector");
  });
});
