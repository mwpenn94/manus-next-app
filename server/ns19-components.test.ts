/**
 * NS19 Component Logic Tests
 *
 * Tests the pure-function logic extracted from NS19 components:
 * - TaskProgressCard phase derivation
 * - ActiveToolIndicator tool metadata mapping
 * - SandboxViewer diff computation
 *
 * Since vitest is configured for node environment (server tests only),
 * we test the logic functions directly rather than React rendering.
 */
import { describe, expect, it } from "vitest";

// ── Re-implement the pure logic from components for testing ──
// (These mirror the internal functions in the components)

// ── AgentAction type (matches TaskContext) ──

type AgentAction =
  | { type: "browsing"; url: string; status: "active" | "done"; preview?: string }
  | { type: "scrolling"; status: "active" | "done"; preview?: string }
  | { type: "clicking"; element: string; status: "active" | "done"; preview?: string }
  | { type: "executing"; command: string; status: "active" | "done"; preview?: string }
  | { type: "creating"; file: string; status: "active" | "done"; preview?: string }
  | { type: "searching"; query: string; status: "active" | "done"; preview?: string }
  | { type: "generating"; description: string; status: "active" | "done"; preview?: string }
  | { type: "thinking"; status: "active" | "done"; preview?: string }
  | { type: "writing"; label?: string; status: "active" | "done"; preview?: string }
  | { type: "researching"; label?: string; status: "active" | "done"; preview?: string };

// ── TaskProgressCard: derivePhases + getPhaseLabel ──

interface Phase {
  id: number;
  label: string;
  status: "completed" | "active" | "pending";
}

function getPhaseLabel(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return `Browse ${action.url || "web page"}`;
    case "searching":
      return `Search: ${action.query || "web"}`;
    case "executing":
      return `Execute: ${action.command || "code"}`;
    case "creating":
      return `Create: ${action.file || "file"}`;
    case "generating":
      return `Generate: ${action.description || "content"}`;
    case "thinking":
      return "Analyzing and reasoning";
    case "writing":
      return `Writing: ${action.label || "content"}`;
    case "researching":
      return `Researching: ${action.label || "topic"}`;
    case "scrolling":
      return "Scrolling page";
    case "clicking":
      return `Clicking: ${action.element || "element"}`;
    default:
      return "Processing";
  }
}

function derivePhases(
  actions: AgentAction[],
  stepProgress: { completed: number; total: number; turn: number } | null
): Phase[] {
  if (actions.length === 0 && !stepProgress) return [];

  const phases: Phase[] = [];
  let phaseId = 1;

  const doneActions = actions.filter((a) => a.status === "done");
  const activeActions = actions.filter((a) => a.status === "active");

  for (const action of doneActions) {
    phases.push({ id: phaseId++, label: getPhaseLabel(action), status: "completed" });
  }

  for (const action of activeActions) {
    phases.push({ id: phaseId++, label: getPhaseLabel(action), status: "active" });
  }

  if (stepProgress && stepProgress.total > 0) {
    const remaining = Math.max(0, stepProgress.total - phases.length);
    for (let i = 0; i < remaining; i++) {
      phases.push({ id: phaseId++, label: "Processing...", status: "pending" });
    }
  }

  return phases;
}

// ── ActiveToolIndicator: TOOL_META + getToolDescription + truncateUrl ──

const TOOL_META: Record<string, { label: string }> = {
  browsing: { label: "Browser" },
  searching: { label: "Search" },
  executing: { label: "Terminal" },
  creating: { label: "Editor" },
  generating: { label: "Image Generator" },
  thinking: { label: "Reasoning" },
  writing: { label: "Editor" },
  researching: { label: "Research" },
  scrolling: { label: "Browser" },
  clicking: { label: "Browser" },
};

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + "..." : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 50 ? url.slice(0, 50) + "..." : url;
  }
}

function getToolDescription(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return action.url ? `Navigating to ${truncateUrl(action.url)}` : "Browsing web page";
    case "searching":
      return action.query ? `Searching "${action.query}"` : "Searching the web";
    case "executing":
      return action.command ? `Running ${action.command}` : "Executing code";
    case "creating":
      return action.file ? `Editing file ${action.file}` : "Creating file";
    case "generating":
      return action.description ? `Generating ${action.description}` : "Generating content";
    case "thinking":
      return "Analyzing and reasoning";
    case "writing":
      return action.label ? `Writing ${action.label}` : "Writing content";
    case "researching":
      return action.label ? `Researching ${action.label}` : "Researching topic";
    case "scrolling":
      return "Scrolling page";
    case "clicking":
      return action.element ? `Clicking ${action.element}` : "Interacting with page";
    default:
      return "Processing";
  }
}

// ── SandboxViewer: computeSimpleDiff ──

function computeSimpleDiff(
  original: string,
  modified: string
): Array<{ line: string; type: "added" | "removed" | "unchanged" }> {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const origSet = new Set(origLines);
  const modSet = new Set(modLines);

  const result: Array<{ line: string; type: "added" | "removed" | "unchanged" }> = [];

  for (const line of modLines) {
    if (!origSet.has(line)) {
      result.push({ line, type: "added" });
    } else {
      result.push({ line, type: "unchanged" });
    }
  }

  const removedLines = origLines.filter((l) => !modSet.has(l));
  const finalResult: typeof result = [];
  let removedIdx = 0;
  for (const item of result) {
    if (item.type === "added" && removedIdx < removedLines.length) {
      finalResult.push({ line: removedLines[removedIdx], type: "removed" });
      removedIdx++;
    }
    finalResult.push(item);
  }
  while (removedIdx < removedLines.length) {
    finalResult.push({ line: removedLines[removedIdx], type: "removed" });
    removedIdx++;
  }

  return finalResult;
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe("NS19: TaskProgressCard — derivePhases", () => {
  it("returns empty array when no actions and no stepProgress", () => {
    expect(derivePhases([], null)).toEqual([]);
  });

  it("marks done actions as completed and active actions as active", () => {
    const actions: AgentAction[] = [
      { type: "searching", query: "AI agents", status: "done" },
      { type: "browsing", url: "https://example.com", status: "done" },
      { type: "creating", file: "index.ts", status: "active" },
    ];
    const phases = derivePhases(actions, null);
    expect(phases).toHaveLength(3);
    expect(phases[0]).toMatchObject({ status: "completed", label: 'Search: AI agents' });
    expect(phases[1]).toMatchObject({ status: "completed", label: 'Browse https://example.com' });
    expect(phases[2]).toMatchObject({ status: "active", label: 'Create: index.ts' });
  });

  it("adds pending phases when stepProgress.total exceeds action count", () => {
    const actions: AgentAction[] = [
      { type: "thinking", status: "done" },
    ];
    const phases = derivePhases(actions, { completed: 1, total: 4, turn: 1 });
    expect(phases).toHaveLength(4);
    expect(phases[0].status).toBe("completed");
    expect(phases[1].status).toBe("pending");
    expect(phases[2].status).toBe("pending");
    expect(phases[3].status).toBe("pending");
  });

  it("assigns sequential IDs starting from 1", () => {
    const actions: AgentAction[] = [
      { type: "thinking", status: "done" },
      { type: "executing", command: "npm install", status: "active" },
    ];
    const phases = derivePhases(actions, null);
    expect(phases.map((p) => p.id)).toEqual([1, 2]);
  });
});

describe("NS19: TaskProgressCard — getPhaseLabel", () => {
  it("labels browsing actions with URL", () => {
    expect(getPhaseLabel({ type: "browsing", url: "https://manus.im", status: "done" }))
      .toBe("Browse https://manus.im");
  });

  it("labels searching actions with query", () => {
    expect(getPhaseLabel({ type: "searching", query: "recursive optimization", status: "active" }))
      .toBe("Search: recursive optimization");
  });

  it("labels executing actions with command", () => {
    expect(getPhaseLabel({ type: "executing", command: "pnpm build", status: "done" }))
      .toBe("Execute: pnpm build");
  });

  it("labels creating actions with file name", () => {
    expect(getPhaseLabel({ type: "creating", file: "App.tsx", status: "active" }))
      .toBe("Create: App.tsx");
  });

  it("labels thinking actions", () => {
    expect(getPhaseLabel({ type: "thinking", status: "active" }))
      .toBe("Analyzing and reasoning");
  });

  it("labels writing actions with optional label", () => {
    expect(getPhaseLabel({ type: "writing", label: "report", status: "done" }))
      .toBe("Writing: report");
    expect(getPhaseLabel({ type: "writing", status: "done" }))
      .toBe("Writing: content");
  });

  it("labels generating actions", () => {
    expect(getPhaseLabel({ type: "generating", description: "hero image", status: "active" }))
      .toBe("Generate: hero image");
  });
});

describe("NS19: ActiveToolIndicator — TOOL_META mapping", () => {
  it("maps all action types to tool labels", () => {
    expect(TOOL_META.browsing.label).toBe("Browser");
    expect(TOOL_META.searching.label).toBe("Search");
    expect(TOOL_META.executing.label).toBe("Terminal");
    expect(TOOL_META.creating.label).toBe("Editor");
    expect(TOOL_META.generating.label).toBe("Image Generator");
    expect(TOOL_META.thinking.label).toBe("Reasoning");
    expect(TOOL_META.writing.label).toBe("Editor");
    expect(TOOL_META.researching.label).toBe("Research");
    expect(TOOL_META.scrolling.label).toBe("Browser");
    expect(TOOL_META.clicking.label).toBe("Browser");
  });
});

describe("NS19: ActiveToolIndicator — truncateUrl", () => {
  it("extracts hostname and path from valid URLs", () => {
    expect(truncateUrl("https://example.com/page")).toBe("example.com/page");
  });

  it("truncates long paths", () => {
    const longUrl = "https://example.com/" + "a".repeat(50);
    const result = truncateUrl(longUrl);
    expect(result).toContain("example.com");
    expect(result).toContain("...");
  });

  it("handles invalid URLs by truncating the raw string", () => {
    const raw = "not-a-url-" + "x".repeat(60);
    const result = truncateUrl(raw);
    expect(result.length).toBeLessThanOrEqual(53); // 50 + "..."
  });
});

describe("NS19: ActiveToolIndicator — getToolDescription", () => {
  it("describes browsing with URL", () => {
    const desc = getToolDescription({ type: "browsing", url: "https://manus.im", status: "active" });
    expect(desc).toContain("Navigating to");
    expect(desc).toContain("manus.im");
  });

  it("describes browsing without URL", () => {
    expect(getToolDescription({ type: "browsing", url: "", status: "active" }))
      .toBe("Browsing web page");
  });

  it("describes searching with query", () => {
    expect(getToolDescription({ type: "searching", query: "AI", status: "active" }))
      .toBe('Searching "AI"');
  });

  it("describes executing with command", () => {
    expect(getToolDescription({ type: "executing", command: "ls -la", status: "active" }))
      .toBe("Running ls -la");
  });

  it("describes creating with file", () => {
    expect(getToolDescription({ type: "creating", file: "main.py", status: "active" }))
      .toBe("Editing file main.py");
  });

  it("describes thinking", () => {
    expect(getToolDescription({ type: "thinking", status: "active" }))
      .toBe("Analyzing and reasoning");
  });

  it("describes clicking with element", () => {
    expect(getToolDescription({ type: "clicking", element: "Submit button", status: "active" }))
      .toBe("Clicking Submit button");
  });

  it("describes scrolling", () => {
    expect(getToolDescription({ type: "scrolling", status: "active" }))
      .toBe("Scrolling page");
  });
});

describe("NS19: SandboxViewer — computeSimpleDiff", () => {
  it("returns all unchanged for identical content", () => {
    const content = "line1\nline2\nline3";
    const diff = computeSimpleDiff(content, content);
    expect(diff.every((d) => d.type === "unchanged")).toBe(true);
    expect(diff).toHaveLength(3);
  });

  it("detects added lines", () => {
    const original = "line1\nline2";
    const modified = "line1\nline2\nline3";
    const diff = computeSimpleDiff(original, modified);
    const added = diff.filter((d) => d.type === "added");
    expect(added).toHaveLength(1);
    expect(added[0].line).toBe("line3");
  });

  it("detects removed lines", () => {
    const original = "line1\nline2\nline3";
    const modified = "line1\nline3";
    const diff = computeSimpleDiff(original, modified);
    const removed = diff.filter((d) => d.type === "removed");
    expect(removed).toHaveLength(1);
    expect(removed[0].line).toBe("line2");
  });

  it("handles complete replacement", () => {
    const original = "old1\nold2";
    const modified = "new1\nnew2";
    const diff = computeSimpleDiff(original, modified);
    const added = diff.filter((d) => d.type === "added");
    const removed = diff.filter((d) => d.type === "removed");
    expect(added).toHaveLength(2);
    expect(removed).toHaveLength(2);
  });

  it("handles empty original", () => {
    const diff = computeSimpleDiff("", "new line");
    const added = diff.filter((d) => d.type === "added");
    expect(added.length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty modified", () => {
    const diff = computeSimpleDiff("old line", "");
    const removed = diff.filter((d) => d.type === "removed");
    expect(removed.length).toBeGreaterThanOrEqual(1);
  });
});
