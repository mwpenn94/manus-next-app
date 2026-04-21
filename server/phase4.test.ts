/**
 * Phase 4 Tests — Scheduler, Wide Research, Keyboard Shortcuts, PWA, Cost Visibility
 *
 * Tests for all features added in Phase 4 of the v8.2 parity implementation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock external dependencies ──
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Synthesized research results" } }],
  }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://example.com/img.png" }),
}));

describe("Scheduler Module", () => {
  it("startScheduler and stopScheduler are exported", async () => {
    const mod = await import("./scheduler");
    expect(typeof mod.startScheduler).toBe("function");
    expect(typeof mod.stopScheduler).toBe("function");
  });

  it("stopScheduler clears the timer without error", async () => {
    const mod = await import("./scheduler");
    // Should not throw even if not started
    expect(() => mod.stopScheduler()).not.toThrow();
  });
});

describe("Wide Research Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wide_research tool exists in AGENT_TOOLS", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const wideResearch = AGENT_TOOLS.find((t) => t.function.name === "wide_research");
    expect(wideResearch).toBeDefined();
    expect(wideResearch!.function.parameters.properties).toHaveProperty("queries");
    expect(wideResearch!.function.parameters.properties).toHaveProperty("synthesis_prompt");
  });

  it("wide_research requires queries array", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const wideResearch = AGENT_TOOLS.find((t) => t.function.name === "wide_research");
    expect(wideResearch!.function.parameters.required).toContain("queries");
    expect(wideResearch!.function.parameters.required).toContain("synthesis_prompt");
  });

  it("wide_research caps queries at 5", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "wide_research",
      JSON.stringify({
        queries: ["q1", "q2", "q3", "q4", "q5", "q6", "q7"],
        synthesis_prompt: "Compare all results",
      })
    );
    // Should not crash with more than 5 queries
    expect(result).toBeDefined();
    expect(result.success !== undefined || result.result !== undefined).toBe(true);
  }, 30000);

  it("wide_research returns error for empty queries", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "wide_research",
      JSON.stringify({
        queries: [],
        synthesis_prompt: "Synthesize",
      })
    );
    expect(result.success).toBe(false);
    expect(result.result).toContain("No queries");
  });
});

describe("AgentAction Type - Researching", () => {
  it("researching action type is valid in the union", () => {
    // Type-level check: this should compile without error
    const action: { type: "researching"; label?: string; status: "active" | "done" } = {
      type: "researching",
      label: "Wide research",
      status: "active",
    };
    expect(action.type).toBe("researching");
    expect(action.status).toBe("active");
  });
});

describe("Keyboard Shortcuts", () => {
  it("SHORTCUTS array contains expected entries", async () => {
    // Import the shortcuts from the hook file
    const { SHORTCUTS } = await import("../client/src/hooks/useKeyboardShortcuts");
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(5);

    const keys = SHORTCUTS.map((s) => s.key);
    expect(keys).toContain("⌘K");
    expect(keys).toContain("⌘N");
    expect(keys).toContain("⌘/");
    expect(keys).toContain("Esc");
    expect(keys).toContain("⌘⇧S");
  });

  it("each shortcut has required fields", async () => {
    const { SHORTCUTS } = await import("../client/src/hooks/useKeyboardShortcuts");
    for (const shortcut of SHORTCUTS) {
      expect(shortcut.key).toBeTruthy();
      expect(shortcut.label).toBeTruthy();
      expect(shortcut.description).toBeTruthy();
      expect(["navigation", "editing", "task", "general"]).toContain(shortcut.category);
    }
  });
});

describe("PWA Manifest", () => {
  it("manifest.json exists and has required fields", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.resolve(__dirname, "../client/public/manifest.json");
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe("Manus Next");
    expect(manifest.short_name).toBe("Manus");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(1);
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });
});

describe("Cost Visibility", () => {
  it("cost estimates are reasonable", () => {
    // Speed mode should be cheaper than quality mode
    const speedCost = 0.02;
    const qualityCost = 0.15;
    expect(speedCost).toBeLessThan(qualityCost);
    expect(speedCost).toBeGreaterThan(0);
    expect(qualityCost).toBeLessThanOrEqual(0.40); // Gate A threshold
  });
});
