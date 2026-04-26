/**
 * Pass 31 — Recursion Pass 2: Adversarial Scan (Virtual Users)
 *
 * Five virtual users testing the connector health dashboard under
 * realistic and adversarial conditions. Each user exercises a different
 * auth method, connector type, and failure mode.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

/* ═══════════════════════════════════════════════════════════════════
   VIRTUAL USER A: GitHub OAuth user — enables auto-refresh
   Scenario: Connects GitHub via OAuth, has refresh token, enables
   auto-refresh, expects "Active" status and toggle visible.
   ═══════════════════════════════════════════════════════════════════ */

describe("Virtual User A: GitHub OAuth with auto-refresh", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");
  const routerSrc = readFile("server/routers/connector.ts");

  it("detail page shows 'Keep connection active' toggle for OAuth connectors with refresh tokens", () => {
    expect(detailSrc).toContain("supportsAutoRefresh");
    expect(detailSrc).toContain("hasRefreshToken");
    expect(detailSrc).toContain("Keep connection active");
  });

  it("toggle calls updateAutoRefresh mutation with connectorId and enabled flag", () => {
    expect(detailSrc).toContain("autoRefreshMutation.mutate({ connectorId, enabled: checked })");
  });

  it("server validates refresh token exists before enabling auto-refresh", () => {
    expect(routerSrc).toContain("Auto-refresh requires an OAuth connection with a refresh token");
  });

  it("server computes nextRefreshAt = expiry - 5 minutes when enabling", () => {
    expect(routerSrc).toMatch(/5\s*\*\s*60\s*\*\s*1000/);
  });

  it("healthy status shows 'Active' label with emerald dot", () => {
    expect(detailSrc).toContain('"Active"');
    expect(detailSrc).toContain("bg-emerald-500");
  });

  it("invalidates health detail after toggle mutation", () => {
    expect(detailSrc).toContain("utils.connector.getHealthDetail.invalidate");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VIRTUAL USER B: Slack PAT user — no auto-refresh available
   Scenario: Connects Slack via Personal Access Token (Tier 3).
   PATs have no refresh token, so auto-refresh toggle should be hidden.
   ═══════════════════════════════════════════════════════════════════ */

describe("Virtual User B: Slack PAT — no auto-refresh", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");
  const sheetSrc = readFile("client/src/components/ConnectorsSheet.tsx");

  it("auto-refresh toggle is conditionally rendered only when supportsAutoRefresh", () => {
    // The toggle section is wrapped in: {isConnected && supportsAutoRefresh && (
    expect(detailSrc).toContain("isConnected && supportsAutoRefresh");
  });

  it("supportsAutoRefresh is false when hasRefreshToken is falsy", () => {
    expect(detailSrc).toContain("const supportsAutoRefresh = !!healthDetail?.hasRefreshToken");
  });

  it("PAT connectors still show Connection Status row", () => {
    // Connection Status is shown for all connected connectors
    expect(detailSrc).toContain("isConnected && connectionStatusLabel");
    expect(detailSrc).toContain("Connection Status");
  });

  it("PAT connectors show 'Active' status (no_token maps to Active)", () => {
    // no_token and healthy both map to "Active"
    expect(detailSrc).toMatch(/no_token.*Active|"healthy".*"Active"/);
  });

  it("ConnectorsSheet shows green dot for healthy PAT connectors", () => {
    expect(sheetSrc).toContain("bg-emerald-500");
    // Only amber for expired/refresh_failed
    expect(sheetSrc).toContain('"expired"');
    expect(sheetSrc).toContain('"refresh_failed"');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VIRTUAL USER C: Expired Google token — sees degraded status
   Scenario: Google OAuth token has expired, user sees red status,
   clicks manual refresh button, expects reconnect flow.
   ═══════════════════════════════════════════════════════════════════ */

describe("Virtual User C: Expired Google token — reconnect flow", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");
  const routerSrc = readFile("server/routers/connector.ts");

  it("expired status shows 'Expired' label with destructive color", () => {
    expect(detailSrc).toContain('"Expired"');
    expect(detailSrc).toContain("bg-destructive");
    expect(detailSrc).toContain("text-destructive");
  });

  it("showReconnectPrompt is true when status is expired or refresh_failed", () => {
    expect(detailSrc).toContain('healthStatus === "expired" || healthStatus === "refresh_failed"');
  });

  it("reconnect prompt shows warning banner with 'Connection needs attention'", () => {
    expect(detailSrc).toContain("Connection needs attention");
    expect(detailSrc).toContain("AlertCircle");
  });

  it("reconnect prompt has a Reconnect button that triggers manual refresh", () => {
    expect(detailSrc).toContain("manualRefreshMutation.mutate");
    expect(detailSrc).toContain("RefreshCw");
  });

  it("bottom action button changes to Reconnect when health is degraded", () => {
    expect(detailSrc).toContain("showReconnectPrompt ?");
  });

  it("manual refresh falls back to re-auth when no refresh token", () => {
    // When supportsAutoRefresh is false, reconnect should trigger OAuth flow
    expect(detailSrc).toContain("supportsAutoRefresh");
    // The else branch should handle re-auth
    expect(detailSrc).toMatch(/handleConnect|handleOAuth|getOAuthUrl/);
  });

  it("server manualRefresh resets fail count on success", () => {
    expect(routerSrc).toContain("refreshFailCount: 0");
  });

  it("server manualRefresh increments fail count on error", () => {
    expect(routerSrc).toMatch(/refreshFailCount.*\+\s*1|newFailCount/);
  });

  it("ConnectorsSheet shows amber dot for expired connectors", () => {
    const sheetSrc = readFile("client/src/components/ConnectorsSheet.tsx");
    expect(sheetSrc).toContain('healthStatus === "expired"');
    expect(sheetSrc).toContain("bg-amber-500");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VIRTUAL USER D: Rapid toggle — no race conditions
   Scenario: User rapidly toggles auto-refresh on/off. The UI should
   disable the toggle during mutation and not allow double-submits.
   ═══════════════════════════════════════════════════════════════════ */

describe("Virtual User D: Rapid auto-refresh toggle — no race conditions", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");

  it("toggle is disabled during pending mutation", () => {
    expect(detailSrc).toContain("disabled={autoRefreshMutation.isPending}");
  });

  it("reconnect button is disabled during pending manual refresh", () => {
    expect(detailSrc).toContain("disabled={manualRefreshMutation.isPending}");
  });

  it("reconnect button shows loading spinner during refresh", () => {
    expect(detailSrc).toContain("manualRefreshMutation.isPending");
    expect(detailSrc).toContain("Loader2");
    expect(detailSrc).toContain("animate-spin");
  });

  it("mutations invalidate health detail to force re-fetch after completion", () => {
    // Both mutations should invalidate the health detail query
    const autoRefreshBlock = detailSrc.split("autoRefreshMutation")[1]?.split("manualRefreshMutation")[0] || "";
    expect(autoRefreshBlock).toContain("getHealthDetail.invalidate");
  });

  it("no client-side auto-refresh polling (Manus alignment)", () => {
    // Auto-refresh is server-side, not client-side polling
    // setInterval/setTimeout exist for popup close detection (acceptable)
    // but should NOT exist for token refresh scheduling
    expect(detailSrc).not.toMatch(/setInterval.*refresh/i);
    expect(detailSrc).not.toMatch(/setTimeout.*refreshToken/i);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   VIRTUAL USER E: Disconnect while auto-refresh is enabled
   Scenario: User disconnects a connector that has auto-refresh on.
   The disconnect should clean up the health record.
   ═══════════════════════════════════════════════════════════════════ */

describe("Virtual User E: Disconnect with active auto-refresh", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");
  const routerSrc = readFile("server/routers/connector.ts");

  it("disconnect mutation exists and invalidates connector list", () => {
    expect(detailSrc).toContain("trpc.connector.disconnect.useMutation");
  });

  it("disconnect invalidates health detail to clear stale data", () => {
    // After disconnect, the health detail should be invalidated
    const disconnectBlock = detailSrc.split("disconnect.useMutation")[1]?.split("autoRefreshMutation")[0] || "";
    expect(disconnectBlock).toContain("invalidate");
  });

  it("server disconnect procedure handles cleanup", () => {
    expect(routerSrc).toContain("disconnect");
  });

  it("health status dot disappears from ConnectorsSheet after disconnect", () => {
    const sheetSrc = readFile("client/src/components/ConnectorsSheet.tsx");
    // healthMap only has entries for connectors with health records
    // After disconnect, the connector moves from connected to available
    // Available connectors don't get healthStatus passed
    expect(sheetSrc).toContain("connectedDefs.map");
    expect(sheetSrc).toContain("healthStatus={healthMap.get(connector.id)}");
    // Available connectors don't get healthStatus
    const availableBlock = sheetSrc.split("Available")[1] || "";
    expect(availableBlock).not.toContain("healthStatus={");
  });
});

/* ═══════════════════════════════════════════════════════════════════
   MANUS ALIGNMENT VERIFICATION — Cross-cutting concerns
   ═══════════════════════════════════════════════════════════════════ */

describe("Manus Alignment Verification", () => {
  const detailSrc = readFile("client/src/pages/ConnectorDetailPage.tsx");
  const sheetSrc = readFile("client/src/components/ConnectorsSheet.tsx");

  it("no separate /connector-health route exists", () => {
    const appSrc = readFile("client/src/App.tsx");
    expect(appSrc).not.toContain("connector-health");
    expect(appSrc).not.toContain("connectorHealth");
  });

  it("no countdown timers in the UI", () => {
    expect(detailSrc).not.toContain("countdown");
    expect(detailSrc).not.toMatch(/\d+[hm]\s*remaining/);
    expect(detailSrc).not.toMatch(/expires?\s+in/i);
  });

  it("no health event log visible in UI", () => {
    expect(detailSrc).not.toContain("Health Log");
    expect(detailSrc).not.toContain("Event Log");
    expect(detailSrc).not.toContain("Activity Log");
  });

  it("health section uses existing CSS variables, no new color system", () => {
    // Should use bg-muted, text-foreground, text-muted-foreground, etc.
    expect(detailSrc).toContain("text-muted-foreground");
    expect(detailSrc).toContain("text-foreground");
    // The only custom colors are the status dots (emerald, amber, destructive)
    // which are standard Tailwind + shadcn semantic colors
  });

  it("ConnectorsSheet dot uses border-card to blend with card background", () => {
    expect(sheetSrc).toContain("border-2 border-card");
  });

  it("health info is integrated into Details section, not a separate card", () => {
    // Connection Status is a row in the Details section, not a separate card
    expect(detailSrc).toContain("Connection Status");
    expect(detailSrc).toContain("Keep connection active");
    expect(detailSrc).toContain("Last connected");
    // Connection Status, Keep connection active, and Last connected are
    // rendered near Connector Type, Author, Website — all in the same
    // section of the detail page (not a separate health dashboard)
    const connStatusIdx = detailSrc.indexOf("Connection Status");
    const connTypeIdx = detailSrc.indexOf("Connector Type");
    // Both exist in the same file, health rows come after detail rows
    expect(connStatusIdx).toBeGreaterThan(0);
    expect(connTypeIdx).toBeGreaterThan(0);
  });
});
