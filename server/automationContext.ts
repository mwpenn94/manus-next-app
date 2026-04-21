/**
 * §L.23 Automation Context — Surface 6 Bidirectional Context Flow
 *
 * Captures 7 context streams from the browser/sandbox environment
 * and feeds them back into agent reasoning for self-correction.
 *
 * Streams:
 *   1. Visual capture (page screenshots per action)
 *   2. Accessibility tree snapshot
 *   3. Console log capture
 *   4. Network request/response capture
 *   5. Storage state capture (localStorage, sessionStorage, cookies)
 *   6. Performance metrics (Core Web Vitals)
 *   7. DOM mutation observer
 */

export interface VisualCapture {
  timestamp: number;
  screenshotUrl?: string;
  viewport: { width: number; height: number };
  pageUrl: string;
}

export interface AccessibilitySnapshot {
  timestamp: number;
  tree: AccessibilityNode[];
  violations: AccessibilityViolation[];
}

export interface AccessibilityNode {
  role: string;
  name: string;
  children?: AccessibilityNode[];
  focused?: boolean;
  disabled?: boolean;
}

export interface AccessibilityViolation {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  nodes: string[];
}

export interface ConsoleEntry {
  timestamp: number;
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  source?: string;
  lineNumber?: number;
}

export interface NetworkCapture {
  timestamp: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  responseSize?: number;
  error?: string;
}

export interface StorageState {
  timestamp: number;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  cookies: CookieEntry[];
}

export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

export interface PerformanceMetrics {
  timestamp: number;
  lcp?: number;  // Largest Contentful Paint (ms)
  fid?: number;  // First Input Delay (ms)
  cls?: number;  // Cumulative Layout Shift
  fcp?: number;  // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
  domContentLoaded?: number;
  loadComplete?: number;
}

export interface DOMMutation {
  timestamp: number;
  type: "childList" | "attributes" | "characterData";
  target: string;  // CSS selector of target
  addedNodes?: string[];
  removedNodes?: string[];
  attributeName?: string;
  oldValue?: string;
  newValue?: string;
}

// ── Aggregated Context ──

export interface AutomationContextSnapshot {
  capturedAt: number;
  taskId: string;
  actionIndex: number;
  visual?: VisualCapture;
  accessibility?: AccessibilitySnapshot;
  consoleLogs: ConsoleEntry[];
  networkRequests: NetworkCapture[];
  storageState?: StorageState;
  performance?: PerformanceMetrics;
  domMutations: DOMMutation[];
}

// ── Context Store (in-memory per task) ──

const contextStore = new Map<string, AutomationContextSnapshot[]>();

export function captureContext(
  taskId: string,
  actionIndex: number,
  partial: Partial<Omit<AutomationContextSnapshot, "capturedAt" | "taskId" | "actionIndex">>
): AutomationContextSnapshot {
  const snapshot: AutomationContextSnapshot = {
    capturedAt: Date.now(),
    taskId,
    actionIndex,
    consoleLogs: partial.consoleLogs || [],
    networkRequests: partial.networkRequests || [],
    domMutations: partial.domMutations || [],
    visual: partial.visual,
    accessibility: partial.accessibility,
    storageState: partial.storageState,
    performance: partial.performance,
  };

  if (!contextStore.has(taskId)) {
    contextStore.set(taskId, []);
  }
  const snapshots = contextStore.get(taskId)!;
  snapshots.push(snapshot);

  // Keep only the last 50 snapshots per task to bound memory
  if (snapshots.length > 50) {
    snapshots.splice(0, snapshots.length - 50);
  }

  return snapshot;
}

export function getContextHistory(taskId: string, limit = 10): AutomationContextSnapshot[] {
  const snapshots = contextStore.get(taskId) || [];
  return snapshots.slice(-limit);
}

export function getLatestContext(taskId: string): AutomationContextSnapshot | null {
  const snapshots = contextStore.get(taskId);
  if (!snapshots || snapshots.length === 0) return null;
  return snapshots[snapshots.length - 1];
}

export function clearContext(taskId: string): void {
  contextStore.delete(taskId);
}

// ── Context Summarization for Agent Reasoning ──

export function summarizeContextForAgent(taskId: string, maxTokens = 2000): string {
  const history = getContextHistory(taskId, 5);
  if (history.length === 0) return "";

  const parts: string[] = [];

  for (const snap of history) {
    const lines: string[] = [];
    lines.push(`[Action ${snap.actionIndex} @ ${new Date(snap.capturedAt).toISOString()}]`);

    // Visual
    if (snap.visual) {
      lines.push(`  Page: ${snap.visual.pageUrl} (${snap.visual.viewport.width}x${snap.visual.viewport.height})`);
    }

    // Console errors (most important for debugging)
    const errors = snap.consoleLogs.filter((l) => l.level === "error");
    if (errors.length > 0) {
      lines.push(`  Console errors (${errors.length}):`);
      for (const err of errors.slice(0, 3)) {
        lines.push(`    - ${err.message.slice(0, 200)}`);
      }
    }

    // Network failures
    const failures = snap.networkRequests.filter((r) => r.status >= 400 || r.error);
    if (failures.length > 0) {
      lines.push(`  Network failures (${failures.length}):`);
      for (const fail of failures.slice(0, 3)) {
        lines.push(`    - ${fail.method} ${fail.url} → ${fail.status || fail.error}`);
      }
    }

    // Accessibility violations
    if (snap.accessibility && snap.accessibility.violations.length > 0) {
      lines.push(`  A11y violations (${snap.accessibility.violations.length}):`);
      for (const v of snap.accessibility.violations.slice(0, 3)) {
        lines.push(`    - [${v.impact}] ${v.description}`);
      }
    }

    // Performance
    if (snap.performance) {
      const p = snap.performance;
      const metrics: string[] = [];
      if (p.lcp) metrics.push(`LCP:${p.lcp}ms`);
      if (p.fid) metrics.push(`FID:${p.fid}ms`);
      if (p.cls !== undefined) metrics.push(`CLS:${p.cls.toFixed(3)}`);
      if (metrics.length > 0) {
        lines.push(`  Performance: ${metrics.join(", ")}`);
      }
    }

    // DOM mutations (count only)
    if (snap.domMutations.length > 0) {
      lines.push(`  DOM mutations: ${snap.domMutations.length}`);
    }

    parts.push(lines.join("\n"));
  }

  const summary = parts.join("\n\n");
  // Truncate to approximate token limit (4 chars per token)
  if (summary.length > maxTokens * 4) {
    return summary.slice(0, maxTokens * 4) + "\n...(truncated)";
  }
  return summary;
}

// ── Export for testing ──
export const _contextStore = contextStore;
