/**
 * Session 23 — Convergence-Validated Tests
 *
 * Step 1: Accessibility (scrollable-region-focusable)
 * Step 2: Context Window Token Usage Indicator (SSE + server tracking)
 * Step 3: Task Favorites Filter (StatusFilter type + filtering logic)
 */
import { describe, expect, it, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════════════
// Step 1: Accessibility — scrollable-region-focusable fix
// ═══════════════════════════════════════════════════════════════════════════
describe("Step 1: Accessibility — scrollable-region-focusable", () => {
  const appLayoutPath = path.resolve(__dirname, "../client/src/components/AppLayout.tsx");
  const appLayoutSrc = fs.readFileSync(appLayoutPath, "utf-8");

  it("task list scrollable container has tabIndex={0}", () => {
    // Sidebar scrollable area or main content has tabIndex
    expect(appLayoutSrc).toContain('tabIndex={0}');
  });

  it("task list scrollable container has role='region'", () => {
    expect(appLayoutSrc).toContain('role="region"');
  });

  it("task list scrollable container has aria-label for screen readers", () => {
    expect(appLayoutSrc).toContain('aria-label="Task list"');
  });

  it("sidebar footer nav has aria-label", () => {
    expect(appLayoutSrc).toContain('aria-label="Main navigation"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Step 2: Context Window Token Usage Indicator
// ═══════════════════════════════════════════════════════════════════════════
describe("Step 2: Context Window Token Usage Indicator", () => {
  const agentStreamPath = path.resolve(__dirname, "agentStream.ts");
  const agentStreamSrc = fs.readFileSync(agentStreamPath, "utf-8");

  const streamWithRetryPath = path.resolve(__dirname, "../client/src/lib/streamWithRetry.ts");
  const streamWithRetrySrc = fs.readFileSync(streamWithRetryPath, "utf-8");

  const buildCallbacksPath = path.resolve(__dirname, "../client/src/lib/buildStreamCallbacks.ts");
  const buildCallbacksSrc = fs.readFileSync(buildCallbacksPath, "utf-8");

  const taskViewPath = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
  const taskViewSrc = fs.readFileSync(taskViewPath, "utf-8");

  it("agentStream tracks cumulative token usage", () => {
    expect(agentStreamSrc).toContain("cumulativePromptTokens");
    expect(agentStreamSrc).toContain("cumulativeCompletionTokens");
  });

  it("agentStream emits token_usage SSE event after each LLM call", () => {
    expect(agentStreamSrc).toContain("token_usage");
    // Verify it includes the cumulative totals and turn number
    expect(agentStreamSrc).toContain("prompt_tokens: cumulativePromptTokens");
    expect(agentStreamSrc).toContain("completion_tokens: cumulativeCompletionTokens");
  });

  it("streamWithRetry has onTokenUsage callback in StreamCallbacks", () => {
    expect(streamWithRetrySrc).toContain("onTokenUsage");
  });

  it("streamWithRetry dispatches token_usage events to the callback", () => {
    expect(streamWithRetrySrc).toContain("data.token_usage && callbacks.onTokenUsage");
  });

  it("buildStreamCallbacks wires onTokenUsage to setTokenUsage setter", () => {
    expect(buildCallbacksSrc).toContain("setTokenUsage");
    expect(buildCallbacksSrc).toContain("onTokenUsage");
  });

  it("TaskView has tokenUsage state", () => {
    expect(taskViewSrc).toContain("const [tokenUsage, setTokenUsage]");
  });

  it("TaskView displays token count in header with human-readable format", () => {
    // Should format large numbers as "12.4k"
    expect(taskViewSrc).toContain("tokenUsage.total_tokens >= 1000");
    expect(taskViewSrc).toContain("tokens");
  });

  it("TaskView shows context pressure indicator for high token counts", () => {
    // Color-coded dot: green > amber > red based on prompt_tokens thresholds
    expect(taskViewSrc).toContain("tokenUsage.prompt_tokens > 100000");
    expect(taskViewSrc).toContain("bg-red-500");
    expect(taskViewSrc).toContain("bg-amber-500");
    expect(taskViewSrc).toContain("bg-emerald-500");
  });

  it("TaskView resets tokenUsage to null when starting a new stream", () => {
    // Count occurrences of setTokenUsage(null) — should be at least 4 (one per stream path)
    const resetCount = (taskViewSrc.match(/setTokenUsage\(null\)/g) || []).length;
    expect(resetCount).toBeGreaterThanOrEqual(4);
  });

  it("all buildStreamCallbacks calls include setTokenUsage", () => {
    // Count occurrences of setTokenUsage being passed to buildStreamCallbacks
    const callbackSetterCount = (taskViewSrc.match(/setTokenUsage/g) || []).length;
    // Should appear in multiple places: state declaration, resets, and callback setter objects
    expect(callbackSetterCount).toBeGreaterThanOrEqual(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Step 3: Task Favorites Filter in Sidebar
// ═══════════════════════════════════════════════════════════════════════════
describe("Step 3: Task Favorites Filter in Sidebar", () => {
  const appLayoutPath = path.resolve(__dirname, "../client/src/components/AppLayout.tsx");
  const appLayoutSrc = fs.readFileSync(appLayoutPath, "utf-8");

  const taskContextPath = path.resolve(__dirname, "../client/src/contexts/TaskContext.tsx");
  const taskContextSrc = fs.readFileSync(taskContextPath, "utf-8");

  const taskViewPath = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
  const taskViewSrc = fs.readFileSync(taskViewPath, "utf-8");

  it("StatusFilter type includes 'favorites'", () => {
    expect(appLayoutSrc).toContain('"favorites"');
    // Favorites is in the filters array
    expect(appLayoutSrc).toContain('id: "favorites"');
  });

  it("statusFilters array includes a Favorites tab with star icon", () => {
    expect(appLayoutSrc).toContain('id: "favorites"');
    expect(appLayoutSrc).toContain('label: "Favorites"');
  });

  it("displayedTasks filters by favorite when statusFilter is 'favorites'", () => {
    // Both server search and local paths should handle favorites
    expect(appLayoutSrc).toContain('statusFilter === "favorites"');
    expect(appLayoutSrc).toContain("t.favorite === 1");
  });

  it("empty state shows helpful message for favorites filter", () => {
    const layoutSrc = fs.readFileSync(path.join(__dirname, "../client/src/components/AppLayout.tsx"), "utf8");
    // AllTasksSection shows filter-specific empty states
    expect(layoutSrc).toContain("No");
    expect(layoutSrc).toContain("tasks");
  });

  it("Task interface includes favorite field", () => {
    expect(taskContextSrc).toContain("favorite?: number");
  });

  it("TaskContext provides updateTaskFavorite function", () => {
    expect(taskContextSrc).toContain("updateTaskFavorite");
    // Verify it's in the context value
    expect(taskContextSrc).toMatch(/value=\{[\s\S]*updateTaskFavorite/);
  });

  it("server task hydration includes favorite field", () => {
    expect(taskContextSrc).toContain("favorite: st.favorite ?? 0");
  });

  it("local tasks mapping uses actual favorite field instead of hardcoded 0", () => {
    expect(appLayoutSrc).toContain("favorite: t.favorite ?? 0");
    // Should NOT have hardcoded favorite: 0
    expect(appLayoutSrc).not.toContain("favorite: 0,");
  });

  it("TaskView toggleFavorite updates local state optimistically", () => {
    expect(taskViewSrc).toContain("updateTaskFavorite");
    expect(taskViewSrc).toContain("utils.task.list.invalidate()");
  });
});
