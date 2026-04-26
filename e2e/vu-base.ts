/**
 * VU Base — Shared Virtual User test infrastructure
 * Provides common setup, teardown, helpers, and verdict types
 * for all VU persona spec files (vu-{1..8}-*.spec.ts)
 *
 * Created: 2026-04-25 (v1.1 Bootstrap)
 */

import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";

// ── Verdict Types ──
export type VUVerdict = "PASS" | "FAIL" | "DEGRADED" | "UNREACHABLE";

export interface VUScenarioResult {
  scenarioId: string;
  persona: string;
  axisVerdicts: {
    A: VUVerdict;
    B: VUVerdict;
    C: VUVerdict;
    D: VUVerdict;
  };
  evidence: {
    screenshots: string[];
    domDumps: string[];
    networkLogs: string[];
    agentTraces: string[];
  };
  duration_ms: number;
  notes: string;
}

// ── Shared Fixtures ──
export const vuTest = base.extend<{
  vuPage: Page;
  baseURL: string;
  captureDir: string;
}>({
  baseURL: async ({}, use) => {
    const url = process.env.VU_BASE_URL || "http://localhost:3000";
    await use(url);
  },

  captureDir: async ({}, use, testInfo) => {
    const dir = `captures/vu-${testInfo.project.name}-cycle-${process.env.VU_CYCLE || "0"}`;
    await use(dir);
  },

  vuPage: async ({ page, baseURL }, use) => {
    // Navigate to base URL and wait for app to load
    await page.goto(baseURL, { waitUntil: "networkidle", timeout: 30000 });
    await use(page);
  },
});

// ── Helper Functions ──

/**
 * Capture screenshot and DOM dump for evidence
 */
export async function captureEvidence(
  page: Page,
  scenarioId: string,
  captureDir: string,
  label: string
): Promise<{ screenshot: string; domDump: string }> {
  const screenshotPath = `${captureDir}/${scenarioId}-${label}.png`;
  const domDumpPath = `${captureDir}/${scenarioId}-${label}.html`;

  await page.screenshot({ path: screenshotPath, fullPage: true });
  const html = await page.content();
  const fs = await import("fs");
  await fs.promises.mkdir(captureDir, { recursive: true });
  await fs.promises.writeFile(domDumpPath, html);

  return { screenshot: screenshotPath, domDump: domDumpPath };
}

/**
 * Wait for streaming chat response to complete
 */
export async function waitForStreamingComplete(page: Page, timeout = 60000): Promise<void> {
  await page.waitForFunction(
    () => {
      const statusEl = document.querySelector("[data-testid='agent-status']");
      if (!statusEl) return true; // No status element means not streaming
      const text = statusEl.textContent?.toLowerCase() || "";
      return text.includes("completed") || text.includes("done") || text.includes("idle");
    },
    { timeout }
  );
}

/**
 * Submit a task via the home input
 */
export async function submitTask(page: Page, taskText: string): Promise<void> {
  const textarea = page.locator("textarea").first();
  await textarea.fill(taskText);
  await textarea.press("Enter");
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const greeting = await page.locator("h1").first().textContent({ timeout: 5000 });
    return greeting?.includes("Hello") || false;
  } catch {
    return false;
  }
}

/**
 * Run axe-core accessibility scan
 */
export async function runAxeScan(page: Page): Promise<{
  violations: number;
  serious: number;
  details: Array<{ id: string; impact: string; nodes: number }>;
}> {
  // Inject axe-core
  await page.addScriptTag({
    url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js",
  });

  const results = await page.evaluate(async () => {
    // @ts-ignore
    const axeResults = await window.axe.run();
    return {
      violations: axeResults.violations.length,
      serious: axeResults.violations.filter(
        (v: any) => v.impact === "serious" || v.impact === "critical"
      ).length,
      details: axeResults.violations.map((v: any) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.length,
      })),
    };
  });

  return results;
}

/**
 * Throttle network to 3G speeds
 */
export async function throttleTo3G(context: BrowserContext): Promise<void> {
  const cdp = await context.newCDPSession(context.pages()[0]);
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (750 * 1024) / 8, // 750 Kbps
    uploadThroughput: (250 * 1024) / 8, // 250 Kbps
    latency: 100, // 100ms RTT
  });
}

/**
 * Simulate offline/online toggle
 */
export async function toggleOffline(context: BrowserContext, offline: boolean): Promise<void> {
  const cdp = await context.newCDPSession(context.pages()[0]);
  await cdp.send("Network.emulateNetworkConditions", {
    offline,
    downloadThroughput: offline ? 0 : -1,
    uploadThroughput: offline ? 0 : -1,
    latency: offline ? 0 : 0,
  });
}

/**
 * Create a verdict result object
 */
export function createResult(
  scenarioId: string,
  persona: string,
  verdicts: { A: VUVerdict; B: VUVerdict; C: VUVerdict; D: VUVerdict },
  evidence: VUScenarioResult["evidence"],
  duration_ms: number,
  notes: string
): VUScenarioResult {
  return {
    scenarioId,
    persona,
    axisVerdicts: verdicts,
    evidence,
    duration_ms,
    notes,
  };
}

export { expect };
