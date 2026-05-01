/**
 * Pass 52 — Tests for critical chat UX fixes
 *
 * 1. Duplicate image dedup in buildStreamCallbacks.onDone
 * 2. Onboarding dedup (only one onboarding system active)
 * 3. Auto-scroll dependency tracking
 * 4. Streaming section refactor (TaskProgressCard removed)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── 1. Duplicate Image Dedup ──

describe("buildStreamCallbacks — duplicate image dedup", () => {
  const callbacksPath = path.resolve(__dirname, "../client/src/lib/buildStreamCallbacks.ts");
  const src = fs.readFileSync(callbacksPath, "utf-8");

  it("checks each image individually instead of just the first", () => {
    // Old pattern: state.images[0] — only checked first image
    expect(src).not.toContain("!state.accumulated.includes(state.images[0])");
    // New pattern: checks each image in the loop
    expect(src).toContain("!state.accumulated.includes(img)");
  });

  it("uses per-image guard before appending markdown", () => {
    // The check and append should be in the correct order within the for loop
    const checkIdx = src.indexOf("!state.accumulated.includes(img)");
    const appendIdx = src.indexOf("![Generated Image](${img})");
    expect(checkIdx).toBeGreaterThan(-1);
    expect(appendIdx).toBeGreaterThan(-1);
    // The includes check should come before the append
    expect(checkIdx).toBeLessThan(appendIdx);
  });

  it("tracks appended flag to avoid unnecessary ref updates", () => {
    expect(src).toContain("let appended = false");
    expect(src).toContain("appended = true");
    expect(src).toContain("if (appended)");
  });
});

// ── 2. Onboarding Dedup ──

describe("onboarding — single system active", () => {
  const appPath = path.resolve(__dirname, "../client/src/App.tsx");
  const appSrc = fs.readFileSync(appPath, "utf-8");

  it("does NOT render OnboardingTour component", () => {
    expect(appSrc).not.toContain("<OnboardingTour");
  });

  it("still renders OnboardingTooltips component", () => {
    expect(appSrc).toContain("<OnboardingTooltips");
  });

  it("does NOT import OnboardingTour as a live import", () => {
    // Should not have an active import statement for OnboardingTour
    const lines = appSrc.split("\n");
    const activeImport = lines.find(l =>
      l.includes("import") && l.includes("OnboardingTour") && !l.startsWith("//")
    );
    expect(activeImport).toBeUndefined();
  });

  // Verify the new onboarding also sets the old key
  const tooltipsPath = path.resolve(__dirname, "../client/src/components/OnboardingTooltips.tsx");
  const tooltipsSrc = fs.readFileSync(tooltipsPath, "utf-8");

  it("OnboardingTooltips sets old sovereign key on dismiss", () => {
    expect(tooltipsSrc).toContain("sovereign-onboarding-complete");
  });
});

// ── 3. Auto-scroll ──

describe("auto-scroll — streaming dependency tracking", () => {
  const taskViewPath = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
  const src = fs.readFileSync(taskViewPath, "utf-8");

  it("has userScrolledUpRef for scroll-up guard", () => {
    expect(src).toContain("userScrolledUpRef");
  });

  it("tracks scroll position with passive listener", () => {
    expect(src).toContain("addEventListener(\"scroll\"");
    expect(src).toContain("passive: true");
  });

  it("auto-scroll depends on streamContent", () => {
    // Find the auto-scroll useEffect dependency array
    const scrollEffectMatch = src.match(/useEffect\(\(\) => \{[\s\S]*?scrollRef\.current\.scrollHeight[\s\S]*?\}, \[([^\]]+)\]\)/);
    expect(scrollEffectMatch).toBeTruthy();
    const deps = scrollEffectMatch![1];
    expect(deps).toContain("streamContent");
  });

  it("auto-scroll depends on agentActions.length", () => {
    const scrollEffectMatch = src.match(/useEffect\(\(\) => \{[\s\S]*?scrollRef\.current\.scrollHeight[\s\S]*?\}, \[([^\]]+)\]\)/);
    expect(scrollEffectMatch).toBeTruthy();
    const deps = scrollEffectMatch![1];
    expect(deps).toContain("agentActions.length");
  });

  it("auto-scroll depends on streaming state", () => {
    const scrollEffectMatch = src.match(/useEffect\(\(\) => \{[\s\S]*?scrollRef\.current\.scrollHeight[\s\S]*?\}, \[([^\]]+)\]\)/);
    expect(scrollEffectMatch).toBeTruthy();
    const deps = scrollEffectMatch![1];
    expect(deps).toContain("streaming");
  });

  it("respects userScrolledUpRef guard", () => {
    expect(src).toContain("!userScrolledUpRef.current");
  });

  it("uses requestAnimationFrame for smooth scrolling", () => {
    // The auto-scroll should use rAF
    const rAFMatch = src.match(/requestAnimationFrame\(\(\) => \{[\s\S]*?scrollRef\.current[\s\S]*?scrollHeight/);
    expect(rAFMatch).toBeTruthy();
  });
});

// ── 4. Streaming Section Refactor ──

describe("streaming section — TaskProgressCard removed, inline step counter", () => {
  const taskViewPath = path.resolve(__dirname, "../client/src/pages/TaskView.tsx");
  const src = fs.readFileSync(taskViewPath, "utf-8");

  it("does NOT use TaskProgressCard component in JSX", () => {
    expect(src).not.toContain("<TaskProgressCard");
  });

  it("does NOT have active TaskProgressCard import", () => {
    const lines = src.split("\n");
    const activeImport = lines.find(l =>
      l.includes("import") && l.includes("TaskProgressCard") && !l.startsWith("//")
    );
    expect(activeImport).toBeUndefined();
  });

  it("has inline step counter with progress bar", () => {
    // Step counter shows in header badge and collapsible
    expect(src).toContain("stepProgress.completed}/{stepProgress.total}");
  });

  it("ActiveToolIndicator renders before action steps", () => {
    const toolIndicatorIdx = src.indexOf("<ActiveToolIndicator");
    const actionStepsIdx = src.indexOf("StreamingStepsCollapsible actions={agentActions}");
    // Both should exist in the streaming section
    expect(toolIndicatorIdx).toBeGreaterThan(-1);
    expect(actionStepsIdx).toBeGreaterThan(-1);
    // ActiveToolIndicator should come first
    expect(toolIndicatorIdx).toBeLessThan(actionStepsIdx);
  });

  it("action steps use space-y-0.5 instead of bordered card", () => {
    // Should NOT have the old bordered card wrapper for streaming actions
    expect(src).not.toContain("bg-card/50 rounded-lg border border-border/50 py-1\">\n                    <GroupedActionsList actions={agentActions}");
    // Should have the new compact wrapper
    expect(src).toContain("space-y-0.5");
  });
});
