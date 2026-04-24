/**
 * ModelSelector ↔ AgentMode Wiring Tests
 *
 * Tests the Limitless tier UI wiring across ModelSelector, TaskView, and Home:
 * 1. ModelSelector renders all 4 tiers including Limitless
 * 2. MODEL_TO_MODE mapping is correct for all 4 tiers
 * 3. localStorage persistence logic in Home.tsx
 * 4. TaskView agentMode initialization from localStorage
 * 5. ModeToggle onChange persists to localStorage
 * 6. Color contrast fixes in dark theme
 * 7. Bidirectional sync between ModelSelector and ModeToggle
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

// ═══════════════════════════════════════════════════════════════════════════════
// §1 — ModelSelector: Limitless Tier Presence
// ═══════════════════════════════════════════════════════════════════════════════
describe("ModelSelector — Limitless tier in dropdown", () => {
  const src = read("client/src/components/ModelSelector.tsx");

  it("defines Limitless model option with id 'manus-next-limitless'", () => {
    expect(src).toContain('"manus-next-limitless"');
  });

  it("Limitless model has name 'Manus Limitless'", () => {
    expect(src).toContain('"Manus Limitless"');
  });

  it("Limitless model has tier 'limitless'", () => {
    expect(src).toContain('tier: "limitless"');
  });

  it("Limitless model uses Infinity icon", () => {
    expect(src).toContain("Infinity");
    // Imported from lucide-react
    expect(src).toMatch(/import\s*\{[^}]*Infinity[^}]*\}\s*from\s*["']lucide-react["']/);
  });

  it("renders ∞ badge for Limitless tier", () => {
    expect(src).toContain("∞");
    expect(src).toContain('tier === "limitless"');
  });

  it("Limitless badge has amber styling", () => {
    expect(src).toContain("bg-amber-500/15");
    expect(src).toContain("text-amber-400");
  });

  it("MODELS array has exactly 4 entries (Limitless, Max, Standard, Lite)", () => {
    // Count id: " occurrences in the MODELS array
    const modelIds = src.match(/id:\s*"manus-next-/g);
    expect(modelIds).toHaveLength(4);
  });

  it("Limitless is the first option in the dropdown (index 0)", () => {
    const limitlessPos = src.indexOf('"manus-next-limitless"');
    const maxPos = src.indexOf('"manus-next-max"');
    const standardPos = src.indexOf('"manus-next-standard"');
    const litePos = src.indexOf('"manus-next-lite"');
    expect(limitlessPos).toBeLessThan(maxPos);
    expect(maxPos).toBeLessThan(standardPos);
    expect(standardPos).toBeLessThan(litePos);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §2 — MODEL_TO_MODE Mapping
// ═══════════════════════════════════════════════════════════════════════════════
describe("MODEL_TO_MODE — Model ID to agent mode mapping", () => {
  const src = read("client/src/components/ModelSelector.tsx");

  it("exports MODEL_TO_MODE mapping", () => {
    expect(src).toContain("export const MODEL_TO_MODE");
  });

  it("maps manus-next-limitless → limitless", () => {
    expect(src).toMatch(/"manus-next-limitless":\s*"limitless"/);
  });

  it("maps manus-next-max → max", () => {
    expect(src).toMatch(/"manus-next-max":\s*"max"/);
  });

  it("maps manus-next-standard → quality", () => {
    expect(src).toMatch(/"manus-next-standard":\s*"quality"/);
  });

  it("maps manus-next-lite → speed", () => {
    expect(src).toMatch(/"manus-next-lite":\s*"speed"/);
  });

  it("MODEL_TO_MODE has exactly 4 entries", () => {
    const entries = src.match(/"manus-next-\w+":\s*"\w+"/g);
    // Filter to only those within MODEL_TO_MODE block
    const modelToModeBlock = src.slice(src.indexOf("MODEL_TO_MODE"));
    const mappingEntries = modelToModeBlock.match(/"manus-next-\w+":\s*"\w+"/g);
    expect(mappingEntries).toHaveLength(4);
  });

  it("persists agent mode to localStorage on model change", () => {
    expect(src).toContain('localStorage.setItem("manus-agent-mode"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §3 — Home.tsx: localStorage Persistence for Selected Model
// ═══════════════════════════════════════════════════════════════════════════════
describe("Home.tsx — localStorage model persistence", () => {
  const src = read("client/src/pages/Home.tsx");

  it("reads selected model from localStorage on init", () => {
    expect(src).toContain('localStorage.getItem("manus-selected-model")');
  });

  it("writes selected model to localStorage on change", () => {
    expect(src).toContain('localStorage.setItem("manus-selected-model"');
  });

  it("defaults to manus-next-max when no stored value", () => {
    expect(src).toContain('"manus-next-max"');
  });

  it("renders ModelSelector component", () => {
    expect(src).toContain("<ModelSelector");
    expect(src).toContain("onModelChange");
  });

  it("passes selectedModel state to ModelSelector", () => {
    expect(src).toContain("selectedModelId={selectedModel}");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §4 — TaskView.tsx: agentMode Initialization from localStorage
// ═══════════════════════════════════════════════════════════════════════════════
describe("TaskView.tsx — agentMode localStorage initialization", () => {
  const src = read("client/src/pages/TaskView.tsx");

  it("reads agentMode from localStorage on init", () => {
    expect(src).toContain('localStorage.getItem("manus-agent-mode")');
  });

  it("validates stored mode against allowed values", () => {
    expect(src).toContain('"speed"');
    expect(src).toContain('"quality"');
    expect(src).toContain('"max"');
    expect(src).toContain('"limitless"');
    // Checks that the includes() validation is present
    expect(src).toMatch(/\.includes\(stored\)/);
  });

  it("defaults to quality when no stored mode", () => {
    // The fallback return value after the localStorage try/catch
    expect(src).toMatch(/return\s*"quality"/);
  });

  it("renders ModelSelector with onModelChange handler", () => {
    expect(src).toContain("<ModelSelector");
    expect(src).toContain("onModelChange");
  });

  it("ModelSelector onModelChange syncs to agentMode state", () => {
    // The onModelChange handler should call setAgentMode
    expect(src).toContain("setAgentMode");
    // And should have the model-to-mode mapping
    expect(src).toContain('"manus-next-limitless": "limitless"');
    expect(src).toContain('"manus-next-max": "max"');
    expect(src).toContain('"manus-next-standard": "quality"');
    expect(src).toContain('"manus-next-lite": "speed"');
  });

  it("ModelSelector onModelChange persists to localStorage", () => {
    expect(src).toContain('localStorage.setItem("manus-selected-model", modelId)');
    expect(src).toContain('localStorage.setItem("manus-agent-mode"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §5 — TaskView.tsx: ModeToggle ↔ localStorage Sync
// ═══════════════════════════════════════════════════════════════════════════════
describe("TaskView.tsx — ModelSelector localStorage persistence", () => {
  const src = read("client/src/pages/TaskView.tsx");

  it("renders ModelSelector component", () => {
    expect(src).toContain("<ModelSelector");
  });
  it("ModelSelector receives selectedModelId based on agentMode", () => {
    expect(src).toContain("MODE_TO_MODEL[agentMode]");
  });
  it("ModelSelector onChange updates agentMode state", () => {
    expect(src).toContain("setAgentMode(newMode)");
  });
  it("ModelSelector onChange persists mode to localStorage", () => {
    expect(src).toContain('localStorage.setItem("manus-agent-mode"');
  });
});
// ═══════════════════════════════════════════════════════════════════════════════
// §5b — Home.tsx: Limitless Mode Styling
// ═══════════════════════════════════════════════════════════════════════════════
describe("ModelSelector — Limitless mode styling", () => {
  const src = read("client/src/components/ModelSelector.tsx");
  it("Limitless mode has amber styling", () => {
    expect(src).toContain("bg-amber-500/15");
    expect(src).toContain("text-amber-400");
  });

  it("Limitless mode label is 'Limitless'", () => {
    expect(src).toContain('"Manus Limitless"');
  });

  it("MODES array has exactly 4 entries", () => {
    const modeIds = src.match(/id:\s*"manus-next-/g);
    expect(modeIds).toHaveLength(4);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §7 — Color Contrast Fixes (Dark Theme)
// ═══════════════════════════════════════════════════════════════════════════════
describe("Color contrast — dark theme accessibility fixes", () => {
  const css = read("client/src/index.css");

  it("dark theme muted-foreground has lightness >= 0.75 for WCAG AA contrast", () => {
    // Find the .dark { ... } block (starts at '.dark {' line, not @custom-variant)
    const darkBlockStart = css.indexOf(".dark {\n");
    expect(darkBlockStart).toBeGreaterThan(0);
    const darkBlock = css.slice(darkBlockStart, darkBlockStart + 1500);
    const match = darkBlock.match(/--muted-foreground:\s*oklch\(([0-9.]+)/);
    expect(match).toBeTruthy();
    const lightness = parseFloat(match![1]);
    expect(lightness).toBeGreaterThanOrEqual(0.75);
  });

  it("dark theme secondary-foreground has lightness >= 0.75", () => {
    const darkBlockStart = css.indexOf(".dark {\n");
    const darkBlock = css.slice(darkBlockStart, darkBlockStart + 1500);
    const match = darkBlock.match(/--secondary-foreground:\s*oklch\(([0-9.]+)/);
    expect(match).toBeTruthy();
    const lightness = parseFloat(match![1]);
    expect(lightness).toBeGreaterThanOrEqual(0.75);
  });

  it("dark theme sidebar-foreground has lightness >= 0.75", () => {
    const darkBlockStart = css.indexOf(".dark {\n");
    const darkBlock = css.slice(darkBlockStart, darkBlockStart + 1500);
    const match = darkBlock.match(/--sidebar-foreground:\s*oklch\(([0-9.]+)/);
    expect(match).toBeTruthy();
    const lightness = parseFloat(match![1]);
    expect(lightness).toBeGreaterThanOrEqual(0.75);
  });

  it("placeholder opacity override is present for WCAG compliance", () => {
    expect(css).toContain("::placeholder");
    expect(css).toContain("opacity: 1");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §8 — Server-Side TierConfig Alignment
// ═══════════════════════════════════════════════════════════════════════════════
describe("TierConfig — 4 tiers match UI labels", () => {
  const src = read("server/agentStream.ts");

  it("TIER_CONFIGS has speed tier", () => {
    expect(src).toMatch(/speed:\s*\{/);
  });

  it("TIER_CONFIGS has quality tier", () => {
    expect(src).toMatch(/quality:\s*\{/);
  });

  it("TIER_CONFIGS has max tier", () => {
    expect(src).toMatch(/max:\s*\{/);
  });

  it("TIER_CONFIGS has limitless tier", () => {
    expect(src).toMatch(/limitless:\s*\{/);
  });

  it("limitless tier uses Infinity for maxTurns", () => {
    const limitlessBlock = src.slice(src.indexOf("limitless:"), src.indexOf("limitless:") + 300);
    expect(limitlessBlock).toContain("Infinity");
    expect(limitlessBlock).toContain("maxTurns: Infinity");
  });

  it("limitless tier uses Infinity for maxTokensPerCall", () => {
    const limitlessBlock = src.slice(src.indexOf("limitless:"), src.indexOf("limitless:") + 300);
    expect(limitlessBlock).toContain("maxTokensPerCall: Infinity");
  });

  it("limitless tier uses Infinity for maxContinuationRounds", () => {
    const limitlessBlock = src.slice(src.indexOf("limitless:"), src.indexOf("limitless:") + 300);
    expect(limitlessBlock).toContain("maxContinuationRounds: Infinity");
  });

  it("getTierConfig falls back to quality for unknown modes", () => {
    expect(src).toContain("TIER_CONFIGS.quality");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §9 — Shared Types: AgentMode includes 'limitless'
// ═══════════════════════════════════════════════════════════════════════════════
describe("Shared types — AgentMode type includes limitless", () => {
  const src = read("shared/ManusNextChat.types.ts");

  it("AgentMode type includes 'limitless'", () => {
    expect(src).toContain('"limitless"');
  });

  it("AgentMode type includes all 4 modes", () => {
    expect(src).toContain('"speed"');
    expect(src).toContain('"quality"');
    expect(src).toContain('"max"');
    expect(src).toContain('"limitless"');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// §10 — Bidirectional Sync: ModelSelector ↔ ModeToggle via localStorage
// ═══════════════════════════════════════════════════════════════════════════════
describe("Bidirectional sync — ModelSelector ↔ agentMode", () => {
  const taskView = read("client/src/pages/TaskView.tsx");
  it("TaskView renders ModelSelector", () => {
    expect(taskView).toContain("<ModelSelector");
  });
  it("ModelSelector shares agentMode state via setAgentMode", () => {
    expect(taskView).toContain("setAgentMode");
    expect(taskView).toContain("MODE_TO_MODEL[agentMode]");
  });
  it("ModelSelector writes both model and mode to localStorage", () => {
    expect(taskView).toContain('localStorage.setItem("manus-selected-model"');
    expect(taskView).toContain('localStorage.setItem("manus-agent-mode"');
  });
  it("agentMode is used in streaming calls", () => {
    expect(taskView).toContain("mode: agentMode");
  });
});
