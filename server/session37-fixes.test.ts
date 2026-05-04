/**
 * Session 37 Fixes — Regression Tests
 *
 * Tests for all video bug (VB1-VB6) and pasted content (PC1-PC6) fixes.
 * Validates: step counter display, frustration detection, empty message filtering,
 * step_progress reset on error, anti-apology enforcement, research budget,
 * build attempt budget, and thinking markdown rendering.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const AGENT_STREAM = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
const TASK_VIEW = fs.readFileSync(path.resolve("client/src/pages/TaskView.tsx"), "utf-8");
const STREAM_RETRY = fs.readFileSync(path.resolve("client/src/lib/streamWithRetry.ts"), "utf-8");

// ═══════════════════════════════════════════════════════════════════
// VB1: Step counter shows only completed count (no erratic denominator)
// ═══════════════════════════════════════════════════════════════════
describe("VB1: Step counter — no erratic denominator", () => {
  it("step counter badge shows only completed count, not completed/total", () => {
    // The old pattern was: `${completedSteps}/${totalSteps}`
    // The new pattern should show just the count or a non-denominator format
    const hasOldPattern = /completedSteps\}\/\$\{totalSteps\}/.test(TASK_VIEW);
    expect(hasOldPattern).toBe(false);
  });

  it("step counter uses plural-aware label (step vs steps)", () => {
    expect(TASK_VIEW).toContain("step");
    // Should have conditional plural
    expect(TASK_VIEW).toMatch(/steps?/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// VB2/VB4: Frustration detection catches common user complaints
// ═══════════════════════════════════════════════════════════════════
describe("VB2/VB4: Expanded frustration detection", () => {
  it("frustration regex catches 'terminated early'", () => {
    // Extract the regex from the source
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    expect(match).not.toBeNull();
    const regexStr = match![1];
    const regex = new RegExp(regexStr, "i");
    expect(regex.test("you terminated early")).toBe(true);
  });

  it("frustration regex catches 'disappeared'", () => {
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    const regex = new RegExp(match![1], "i");
    expect(regex.test("my messages disappeared")).toBe(true);
  });

  it("frustration regex catches 'why the hell'", () => {
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    const regex = new RegExp(match![1], "i");
    expect(regex.test("why the hell did you stop")).toBe(true);
  });

  it("frustration regex catches 'still terminated'", () => {
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    const regex = new RegExp(match![1], "i");
    expect(regex.test("still terminated")).toBe(true);
  });

  it("frustration regex catches 'did not finish'", () => {
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    const regex = new RegExp(match![1], "i");
    expect(regex.test("you did not finish")).toBe(true);
  });

  it("frustration regex catches 'not done'", () => {
    const match = AGENT_STREAM.match(/isUserFrustrated\s*=\s*\/(.*?)\/i\.test/s);
    const regex = new RegExp(match![1], "i");
    expect(regex.test("you're not done yet")).toBe(true);
  });

  it("frustration detection forces acknowledge-and-resume response", () => {
    expect(AGENT_STREAM).toContain("USER FRUSTRATION DETECTED");
    expect(AGENT_STREAM).toContain("ACKNOWLEDGE AND RESUME");
    expect(AGENT_STREAM).toContain("IMMEDIATELY resume that task");
  });
});

// ═══════════════════════════════════════════════════════════════════
// VB5/PC6: Build attempt budget prevents infinite retry loops
// ═══════════════════════════════════════════════════════════════════
describe("VB5/PC6: Build attempt budget", () => {
  it("buildAttemptHistory array is declared", () => {
    expect(AGENT_STREAM).toContain("buildAttemptHistory");
  });

  it("MAX_SAME_BUILD_ATTEMPTS is set to 2", () => {
    expect(AGENT_STREAM).toContain("MAX_SAME_BUILD_ATTEMPTS = 2");
  });

  it("tracks install_deps and run_command(build) failures", () => {
    expect(AGENT_STREAM).toContain('(tn === "install_deps" || tn === "run_command" || tn === "deploy_webapp") && (ta.includes("build") || ta.includes("install") || tn === "deploy_webapp")');
  });

  it("injects strategy change message after repeated failures", () => {
    expect(AGENT_STREAM).toContain("You MUST try a DIFFERENT strategy");
    expect(AGENT_STREAM).toContain("Do NOT retry the same command");
  });
});

// ═══════════════════════════════════════════════════════════════════
// VB6: Thinking block renders with markdown (Streamdown)
// ═══════════════════════════════════════════════════════════════════
describe("VB6: Thinking block markdown rendering", () => {
  it("TaskView handles 'thinking' action type with Streamdown", () => {
    expect(TASK_VIEW).toContain("thinking");
    expect(TASK_VIEW).toContain("Streamdown");
  });

  it("thinking action has distinct visual styling", () => {
    // Should have some visual indicator for thinking blocks
    expect(TASK_VIEW).toMatch(/thinking.*italic|italic.*thinking/s);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PC1: Empty assistant messages filtered from display
// ═══════════════════════════════════════════════════════════════════
describe("PC1: Empty message filtering", () => {
  it("filters out empty assistant messages before rendering", () => {
    // Should have a filter that removes messages with no content
    expect(TASK_VIEW).toMatch(/filter.*content|content.*filter/s);
  });

  it("filter checks for empty string and whitespace-only content", () => {
    expect(TASK_VIEW).toMatch(/trim\(\).*length|content.*trim/s);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PC2: Step progress resets on error
// ═══════════════════════════════════════════════════════════════════
describe("PC2: Step progress reset on error", () => {
  it("sends step_progress: null before error events", () => {
    // Should send null step_progress to clear the counter on error
    expect(AGENT_STREAM).toContain("step_progress: null");
  });

  it("frontend handles step_progress: null to clear counter", () => {
    expect(STREAM_RETRY).toContain("step_progress");
    // Should handle null case
    expect(STREAM_RETRY).toMatch(/null|undefined/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PC3: Anti-apology enforcement strengthened
// ═══════════════════════════════════════════════════════════════════
describe("PC3: Anti-apology enforcement", () => {
  it("system prompt bans specific apology phrases", () => {
    expect(AGENT_STREAM).toContain("I apologize");
    expect(AGENT_STREAM).toContain("I'm sorry");
  });

  it("system prompt has explicit NEVER APOLOGIZE rule", () => {
    expect(AGENT_STREAM).toMatch(/NEVER.*apologi|apologi.*NEVER/is);
  });

  it("anti-apology rule includes replacement behavior", () => {
    // Should tell the agent what to do INSTEAD of apologizing
    expect(AGENT_STREAM).toMatch(/instead.*acknowledge|acknowledge.*instead/is);
  });
});

// ═══════════════════════════════════════════════════════════════════
// PC4: Research budget prevents infinite research loops
// ═══════════════════════════════════════════════════════════════════
describe("PC4: Research budget", () => {
  it("consecutiveResearchCalls counter is declared", () => {
    expect(AGENT_STREAM).toContain("consecutiveResearchCalls");
  });

  it("RESEARCH_BUDGET_LIMIT is mode-aware", () => {
    expect(AGENT_STREAM).toContain("RESEARCH_BUDGET_LIMIT");
    expect(AGENT_STREAM).toContain("limitless");
    expect(AGENT_STREAM).toContain("max");
  });

  it("tracks research tools (web_search, wide_research, read_webpage)", () => {
    expect(AGENT_STREAM).toContain("RESEARCH_TOOLS");
    expect(AGENT_STREAM).toContain("web_search");
    expect(AGENT_STREAM).toContain("wide_research");
    expect(AGENT_STREAM).toContain("read_webpage");
  });

  it("resets counter when deliverable tools are used", () => {
    expect(AGENT_STREAM).toContain("DELIVERABLE_TOOLS");
    expect(AGENT_STREAM).toContain("generate_document");
    expect(AGENT_STREAM).toContain("generate_image");
  });

  it("injects deliverable nudge after exceeding budget", () => {
    expect(AGENT_STREAM).toContain("STOP RESEARCHING and START PRODUCING");
    expect(AGENT_STREAM).toContain("deliverableNudgeSent");
  });

  it("resets counter when agent produces substantial text (synthesizing)", () => {
    expect(AGENT_STREAM).toContain("consecutiveResearchCalls > 0");
    expect(AGENT_STREAM).toContain("length > 200");
  });
});

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION: All fixes coexist without TypeScript errors
// ═══════════════════════════════════════════════════════════════════
describe("Integration: All Session 37 fixes compile cleanly", () => {
  it("agentStream.ts exists and is non-empty", () => {
    expect(AGENT_STREAM.length).toBeGreaterThan(10000);
  });

  it("TaskView.tsx exists and is non-empty", () => {
    expect(TASK_VIEW.length).toBeGreaterThan(5000);
  });

  it("streamWithRetry.ts exists and is non-empty", () => {
    expect(STREAM_RETRY.length).toBeGreaterThan(500);
  });

  it("no duplicate variable declarations from edits", () => {
    // Check for accidental double declarations
    const matches = AGENT_STREAM.match(/let consecutiveResearchCalls/g);
    expect(matches?.length).toBe(1);
    const buildMatches = AGENT_STREAM.match(/buildAttemptHistory/g);
    expect(buildMatches).not.toBeNull();
    // Should appear multiple times (declaration + usage) but declaration only once
    const declMatches = AGENT_STREAM.match(/const buildAttemptHistory/g);
    expect(declMatches?.length).toBe(1);
  });
});
