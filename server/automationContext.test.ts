/**
 * §L.23 Automation Context Tests
 * Tests for the Surface 6 bidirectional context capture system
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  captureContext,
  getContextHistory,
  getLatestContext,
  clearContext,
  summarizeContextForAgent,
  _contextStore,
  type AutomationContextSnapshot,
  type ConsoleEntry,
  type NetworkCapture,
  type VisualCapture,
  type AccessibilitySnapshot,
  type PerformanceMetrics,
  type DOMMutation,
  type StorageState,
} from "./automationContext";

beforeEach(() => {
  _contextStore.clear();
});

// ── Stream 1: Visual Capture ──

describe("Stream 1: Visual Capture", () => {
  it("captures visual state with viewport and URL", () => {
    const visual: VisualCapture = {
      timestamp: Date.now(),
      pageUrl: "https://example.com",
      viewport: { width: 1920, height: 1080 },
      screenshotUrl: "https://cdn.example.com/screenshot.png",
    };
    const snap = captureContext("task-1", 0, { visual });
    expect(snap.visual).toEqual(visual);
    expect(snap.visual?.viewport.width).toBe(1920);
  });

  it("visual capture is optional", () => {
    const snap = captureContext("task-1", 0, {});
    expect(snap.visual).toBeUndefined();
  });
});

// ── Stream 2: Accessibility Tree ──

describe("Stream 2: Accessibility Snapshot", () => {
  it("captures accessibility tree and violations", () => {
    const a11y: AccessibilitySnapshot = {
      timestamp: Date.now(),
      tree: [
        { role: "heading", name: "Page Title", children: [] },
        { role: "button", name: "Submit", focused: true },
      ],
      violations: [
        {
          id: "color-contrast",
          impact: "serious",
          description: "Elements must have sufficient color contrast",
          nodes: ["#submit-btn"],
        },
      ],
    };
    const snap = captureContext("task-1", 0, { accessibility: a11y });
    expect(snap.accessibility?.tree).toHaveLength(2);
    expect(snap.accessibility?.violations).toHaveLength(1);
    expect(snap.accessibility?.violations[0].impact).toBe("serious");
  });
});

// ── Stream 3: Console Log Capture ──

describe("Stream 3: Console Log Capture", () => {
  it("captures console entries with levels", () => {
    const logs: ConsoleEntry[] = [
      { timestamp: Date.now(), level: "error", message: "Uncaught TypeError: x is not a function" },
      { timestamp: Date.now(), level: "warn", message: "Deprecated API usage" },
      { timestamp: Date.now(), level: "log", message: "App initialized" },
    ];
    const snap = captureContext("task-1", 0, { consoleLogs: logs });
    expect(snap.consoleLogs).toHaveLength(3);
    expect(snap.consoleLogs[0].level).toBe("error");
  });

  it("defaults to empty array when no logs provided", () => {
    const snap = captureContext("task-1", 0, {});
    expect(snap.consoleLogs).toEqual([]);
  });
});

// ── Stream 4: Network Capture ──

describe("Stream 4: Network Request/Response Capture", () => {
  it("captures successful and failed network requests", () => {
    const requests: NetworkCapture[] = [
      { timestamp: Date.now(), method: "GET", url: "/api/data", status: 200, duration: 150 },
      { timestamp: Date.now(), method: "POST", url: "/api/submit", status: 500, duration: 2000, error: "Internal Server Error" },
    ];
    const snap = captureContext("task-1", 0, { networkRequests: requests });
    expect(snap.networkRequests).toHaveLength(2);
    expect(snap.networkRequests[1].status).toBe(500);
  });
});

// ── Stream 5: Storage State ──

describe("Stream 5: Storage State Capture", () => {
  it("captures localStorage, sessionStorage, and cookies", () => {
    const storage: StorageState = {
      timestamp: Date.now(),
      localStorage: { theme: "dark", lang: "en" },
      sessionStorage: { token: "abc123" },
      cookies: [
        { name: "session", value: "xyz", domain: "example.com", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
      ],
    };
    const snap = captureContext("task-1", 0, { storageState: storage });
    expect(snap.storageState?.localStorage.theme).toBe("dark");
    expect(snap.storageState?.cookies).toHaveLength(1);
    expect(snap.storageState?.cookies[0].httpOnly).toBe(true);
  });
});

// ── Stream 6: Performance Metrics ──

describe("Stream 6: Performance Metrics (Core Web Vitals)", () => {
  it("captures LCP, FID, CLS, FCP, TTFB", () => {
    const perf: PerformanceMetrics = {
      timestamp: Date.now(),
      lcp: 1200,
      fid: 50,
      cls: 0.05,
      fcp: 800,
      ttfb: 200,
      domContentLoaded: 1500,
      loadComplete: 2500,
    };
    const snap = captureContext("task-1", 0, { performance: perf });
    expect(snap.performance?.lcp).toBe(1200);
    expect(snap.performance?.cls).toBe(0.05);
    expect(snap.performance?.ttfb).toBe(200);
  });

  it("handles partial performance data", () => {
    const perf: PerformanceMetrics = { timestamp: Date.now(), lcp: 2500 };
    const snap = captureContext("task-1", 0, { performance: perf });
    expect(snap.performance?.lcp).toBe(2500);
    expect(snap.performance?.fid).toBeUndefined();
  });
});

// ── Stream 7: DOM Mutations ──

describe("Stream 7: DOM Mutation Observer", () => {
  it("captures childList mutations", () => {
    const mutations: DOMMutation[] = [
      { timestamp: Date.now(), type: "childList", target: "#app", addedNodes: ["<div>New</div>"], removedNodes: [] },
    ];
    const snap = captureContext("task-1", 0, { domMutations: mutations });
    expect(snap.domMutations).toHaveLength(1);
    expect(snap.domMutations[0].type).toBe("childList");
  });

  it("captures attribute mutations", () => {
    const mutations: DOMMutation[] = [
      { timestamp: Date.now(), type: "attributes", target: "#btn", attributeName: "disabled", oldValue: "false", newValue: "true" },
    ];
    const snap = captureContext("task-1", 0, { domMutations: mutations });
    expect(snap.domMutations[0].attributeName).toBe("disabled");
  });
});

// ── Context Store Management ──

describe("Context Store Management", () => {
  it("stores multiple snapshots per task", () => {
    captureContext("task-1", 0, {});
    captureContext("task-1", 1, {});
    captureContext("task-1", 2, {});
    expect(getContextHistory("task-1")).toHaveLength(3);
  });

  it("isolates context between tasks", () => {
    captureContext("task-1", 0, {});
    captureContext("task-2", 0, {});
    expect(getContextHistory("task-1")).toHaveLength(1);
    expect(getContextHistory("task-2")).toHaveLength(1);
  });

  it("limits snapshots to 50 per task", () => {
    for (let i = 0; i < 60; i++) {
      captureContext("task-1", i, {});
    }
    expect(getContextHistory("task-1", 100)).toHaveLength(50);
  });

  it("getLatestContext returns the most recent snapshot", () => {
    captureContext("task-1", 0, { consoleLogs: [{ timestamp: 1, level: "log", message: "first" }] });
    captureContext("task-1", 1, { consoleLogs: [{ timestamp: 2, level: "log", message: "second" }] });
    const latest = getLatestContext("task-1");
    expect(latest?.actionIndex).toBe(1);
    expect(latest?.consoleLogs[0].message).toBe("second");
  });

  it("getLatestContext returns null for unknown task", () => {
    expect(getLatestContext("nonexistent")).toBeNull();
  });

  it("clearContext removes all snapshots for a task", () => {
    captureContext("task-1", 0, {});
    captureContext("task-1", 1, {});
    clearContext("task-1");
    expect(getContextHistory("task-1")).toHaveLength(0);
    expect(getLatestContext("task-1")).toBeNull();
  });

  it("getContextHistory respects limit parameter", () => {
    for (let i = 0; i < 10; i++) {
      captureContext("task-1", i, {});
    }
    expect(getContextHistory("task-1", 3)).toHaveLength(3);
    // Should return the most recent 3
    const recent = getContextHistory("task-1", 3);
    expect(recent[0].actionIndex).toBe(7);
    expect(recent[2].actionIndex).toBe(9);
  });
});

// ── Bidirectional Context: Agent Summarization ──

describe("Bidirectional Context: Agent Summarization", () => {
  it("generates empty string for unknown task", () => {
    expect(summarizeContextForAgent("nonexistent")).toBe("");
  });

  it("summarizes console errors for agent reasoning", () => {
    captureContext("task-1", 0, {
      visual: { timestamp: Date.now(), pageUrl: "https://app.com/dashboard", viewport: { width: 1920, height: 1080 } },
      consoleLogs: [
        { timestamp: Date.now(), level: "error", message: "TypeError: Cannot read property 'map' of undefined" },
        { timestamp: Date.now(), level: "error", message: "Failed to fetch /api/data" },
      ],
    });
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("Console errors (2)");
    expect(summary).toContain("TypeError");
    expect(summary).toContain("https://app.com/dashboard");
  });

  it("summarizes network failures for agent reasoning", () => {
    captureContext("task-1", 0, {
      networkRequests: [
        { timestamp: Date.now(), method: "GET", url: "/api/users", status: 403, duration: 50 },
        { timestamp: Date.now(), method: "POST", url: "/api/submit", status: 500, duration: 1000 },
      ],
    });
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("Network failures (2)");
    expect(summary).toContain("GET /api/users → 403");
  });

  it("summarizes accessibility violations", () => {
    captureContext("task-1", 0, {
      accessibility: {
        timestamp: Date.now(),
        tree: [],
        violations: [
          { id: "aria-label", impact: "critical", description: "Missing aria-label", nodes: ["#nav"] },
        ],
      },
    });
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("A11y violations (1)");
    expect(summary).toContain("[critical]");
  });

  it("summarizes performance metrics", () => {
    captureContext("task-1", 0, {
      performance: { timestamp: Date.now(), lcp: 3500, cls: 0.25 },
    });
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("LCP:3500ms");
    expect(summary).toContain("CLS:0.250");
  });

  it("summarizes DOM mutation count", () => {
    captureContext("task-1", 0, {
      domMutations: [
        { timestamp: Date.now(), type: "childList", target: "#app" },
        { timestamp: Date.now(), type: "attributes", target: "#btn", attributeName: "class" },
      ],
    });
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("DOM mutations: 2");
  });

  it("truncates summary to maxTokens limit", () => {
    // Create a large context
    for (let i = 0; i < 10; i++) {
      captureContext("task-1", i, {
        consoleLogs: Array.from({ length: 20 }, (_, j) => ({
          timestamp: Date.now(),
          level: "error" as const,
          message: `Error ${j}: ${"x".repeat(200)}`,
        })),
        networkRequests: Array.from({ length: 20 }, (_, j) => ({
          timestamp: Date.now(),
          method: "GET",
          url: `/api/endpoint-${j}/${"y".repeat(100)}`,
          status: 500,
          duration: 1000,
        })),
      });
    }
    const summary = summarizeContextForAgent("task-1", 500);
    expect(summary.length).toBeLessThanOrEqual(500 * 4 + 20); // 4 chars/token + truncation message
    expect(summary).toContain("...(truncated)");
  });

  it("includes action index and timestamp in summary", () => {
    captureContext("task-1", 5, {});
    const summary = summarizeContextForAgent("task-1");
    expect(summary).toContain("[Action 5 @");
  });
});

// ── Type Validation ──

describe("Type Validation", () => {
  it("AutomationContextSnapshot has required fields", () => {
    const snap = captureContext("task-1", 0, {});
    expect(snap.capturedAt).toBeGreaterThan(0);
    expect(snap.taskId).toBe("task-1");
    expect(snap.actionIndex).toBe(0);
    expect(Array.isArray(snap.consoleLogs)).toBe(true);
    expect(Array.isArray(snap.networkRequests)).toBe(true);
    expect(Array.isArray(snap.domMutations)).toBe(true);
  });

  it("ConsoleEntry supports all log levels", () => {
    const levels: ConsoleEntry["level"][] = ["log", "warn", "error", "info", "debug"];
    const logs: ConsoleEntry[] = levels.map((level) => ({
      timestamp: Date.now(),
      level,
      message: `Test ${level}`,
    }));
    const snap = captureContext("task-1", 0, { consoleLogs: logs });
    expect(snap.consoleLogs).toHaveLength(5);
  });

  it("AccessibilityViolation supports all impact levels", () => {
    const impacts: AccessibilitySnapshot["violations"][0]["impact"][] = ["critical", "serious", "moderate", "minor"];
    const a11y: AccessibilitySnapshot = {
      timestamp: Date.now(),
      tree: [],
      violations: impacts.map((impact) => ({
        id: `test-${impact}`,
        impact,
        description: `Test ${impact} violation`,
        nodes: [],
      })),
    };
    const snap = captureContext("task-1", 0, { accessibility: a11y });
    expect(snap.accessibility?.violations).toHaveLength(4);
  });
});
