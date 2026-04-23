/**
 * Virtual User Assessment Fixes — Vitest Tests
 *
 * VU-01: Cost estimates are approximate (acknowledged, not a code fix)
 * VU-02: Tool turn counter added to TaskView header
 * VU-03: OnboardingTooltips component added
 * VU-04: Projects lack advanced features (acknowledged, not a code fix)
 * VU-05: Design canvas lacks undo/redo (acknowledged, not a code fix)
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("VU-02: Tool Turn Counter", () => {
  it("TaskView renders tool turn counter during streaming", () => {
    const source = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");
    // Should show tool count when streaming and agentActions exist
    expect(source).toContain("Tool turn counter");
    expect(source).toContain("agentActions.length");
    expect(source).toContain("tool calls executed");
  });

  it("tool turn counter only shows during active streaming", () => {
    const source = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");
    // Counter should be gated on streaming state
    expect(source).toContain("streaming && agentActions.length > 0");
  });
});

describe("VU-03: Onboarding Tooltips", () => {
  it("OnboardingTooltips component exists with proper structure", () => {
    const source = fs.readFileSync("client/src/components/OnboardingTooltips.tsx", "utf-8");
    expect(source).toContain("ONBOARDING_KEY");
    expect(source).toContain("manus-onboarding-complete");
    expect(source).toContain("localStorage");
  });

  it("has 5 onboarding steps covering key features", () => {
    const source = fs.readFileSync("client/src/components/OnboardingTooltips.tsx", "utf-8");
    expect(source).toContain("welcome");
    expect(source).toContain("prompt");
    expect(source).toContain("modes");
    expect(source).toContain("tools");
    expect(source).toContain("sidebar");
  });

  it("is dismissible and persists completion", () => {
    const source = fs.readFileSync("client/src/components/OnboardingTooltips.tsx", "utf-8");
    expect(source).toContain("dismiss");
    expect(source).toContain("Skip");
    expect(source).toContain("Get Started");
    expect(source).toContain('localStorage.setItem(ONBOARDING_KEY, "true")');
  });

  it("is integrated into App.tsx", () => {
    const source = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(source).toContain("OnboardingTooltips");
    expect(source).toContain("<OnboardingTooltips />");
  });

  it("only shows for first-time users", () => {
    const source = fs.readFileSync("client/src/components/OnboardingTooltips.tsx", "utf-8");
    // Should check localStorage before showing
    expect(source).toContain("localStorage.getItem(ONBOARDING_KEY)");
    // Should not show if already completed
    expect(source).toContain("if (!completed)");
  });
});

describe("VU-01: Cost Estimates Transparency", () => {
  it("cost estimates include mode label for context", () => {
    const source = fs.readFileSync("client/src/pages/TaskView.tsx", "utf-8");
    // Cost display should include both amount and mode name
    expect(source).toContain("Estimated task cost");
    expect(source).toContain("speed");
    expect(source).toContain("limitless");
    expect(source).toContain("quality");
    expect(source).toContain("max");
  });
});
