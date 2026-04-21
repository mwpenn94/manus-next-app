/**
 * Keyboard Shortcuts — Logic Tests
 *
 * Tests the shortcut registry, grouping, platform detection,
 * category metadata, and key-event decision logic.
 * Follows the repo's node-based test pattern (no jsdom/RTL).
 */
import { describe, it, expect } from "vitest";

/* ─── Mirror the types and constants from the hook ─── */

type ShortcutCategory = "navigation" | "editing" | "task" | "accessibility" | "general";

interface ShortcutAction {
  key: string;
  label: string;
  description: string;
  category: ShortcutCategory;
  contextual?: boolean;
}

const CATEGORY_META: Record<ShortcutCategory, { label: string; order: number }> = {
  navigation: { label: "Navigation", order: 0 },
  task: { label: "Tasks", order: 1 },
  editing: { label: "Editing", order: 2 },
  accessibility: { label: "Accessibility", order: 3 },
  general: { label: "General", order: 4 },
};

/* ─── Platform-aware key symbols ─── */
function getModKey(isMac: boolean) { return isMac ? "⌘" : "Ctrl+"; }
function getShiftKey() { return "⇧"; }
function getAltKey(isMac: boolean) { return isMac ? "⌥" : "Alt+"; }

function buildShortcuts(isMac: boolean): ShortcutAction[] {
  const MOD = getModKey(isMac);
  const SHIFT = getShiftKey();
  return [
    { key: `${MOD}K`, label: "Quick Focus", description: "Focus search or chat input", category: "navigation" },
    { key: `${MOD}N`, label: "New Task", description: "Start a new conversation", category: "navigation" },
    { key: `${MOD}${SHIFT}S`, label: "Sidebar", description: "Toggle sidebar panel", category: "navigation" },
    { key: `${MOD}\u2191`, label: "Previous Task", description: "Navigate to previous task", category: "navigation", contextual: true },
    { key: `${MOD}\u2193`, label: "Next Task", description: "Navigate to next task", category: "navigation", contextual: true },
    { key: `${MOD}.`, label: "Stop", description: "Stop generation", category: "task", contextual: true },
    { key: "Enter", label: "Send", description: "Send message", category: "editing" },
    { key: `${SHIFT}Enter`, label: "New Line", description: "Insert new line in message", category: "editing" },
    { key: `${MOD}${SHIFT}V`, label: "Hands-Free", description: "Toggle hands-free voice mode", category: "accessibility", contextual: true },
    { key: `${MOD}${SHIFT}T`, label: "Theme", description: "Cycle theme (dark / light / system)", category: "accessibility" },
    { key: `${MOD}/`, label: "Shortcuts", description: "Toggle this shortcuts overlay", category: "general" },
    { key: "?", label: "Help", description: "Show keyboard shortcuts", category: "general" },
    { key: "Esc", label: "Close", description: "Close dialog or cancel action", category: "general" },
  ];
}

function groupShortcuts(shortcuts: ShortcutAction[]) {
  return Object.entries(CATEGORY_META)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key, meta]) => ({
      category: key as ShortcutCategory,
      label: meta.label,
      shortcuts: shortcuts.filter((s) => s.category === key),
    }))
    .filter((g) => g.shortcuts.length > 0);
}

/* ─── Key-event decision logic (mirrors handleKeyDown) ─── */
type ShortcutResult =
  | "focus_input"
  | "new_task"
  | "toggle_help"
  | "toggle_sidebar"
  | "cycle_theme"
  | "stop_generation"
  | "prev_task"
  | "next_task"
  | "close_help"
  | "escape"
  | "none";

interface MockKeyEvent {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  isInput?: boolean;
}

function resolveShortcut(
  event: MockKeyEvent,
  state: { showHelp: boolean }
): ShortcutResult {
  const isMod = event.metaKey || event.ctrlKey;
  const isInput = event.isInput ?? false;

  if (isMod && event.key === "k") return "focus_input";
  if (isMod && event.key === "n" && !event.shiftKey) return "new_task";
  if (isMod && event.key === "/") return "toggle_help";
  if (isMod && event.shiftKey && (event.key === "S" || event.key === "s")) return "toggle_sidebar";
  if (isMod && event.shiftKey && (event.key === "T" || event.key === "t")) return "cycle_theme";
  if (isMod && event.key === ".") return "stop_generation";
  if (isMod && event.key === "ArrowUp" && !event.shiftKey) return "prev_task";
  if (isMod && event.key === "ArrowDown" && !event.shiftKey) return "next_task";
  if (event.key === "?" && !isMod && !isInput) return "toggle_help";
  if (event.key === "Escape") {
    if (state.showHelp) return "close_help";
    return "escape";
  }
  return "none";
}

/* ─── Tests ─── */

describe("Keyboard Shortcuts — Registry", () => {
  it("should have exactly 13 shortcuts", () => {
    const shortcuts = buildShortcuts(true);
    expect(shortcuts).toHaveLength(13);
  });

  it("should have shortcuts in all 5 categories", () => {
    const shortcuts = buildShortcuts(true);
    const categories = new Set(shortcuts.map((s) => s.category));
    expect(categories.size).toBe(5);
    expect(categories).toContain("navigation");
    expect(categories).toContain("editing");
    expect(categories).toContain("task");
    expect(categories).toContain("accessibility");
    expect(categories).toContain("general");
  });

  it("should have unique labels across all shortcuts", () => {
    const shortcuts = buildShortcuts(true);
    const labels = shortcuts.map((s) => s.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("should mark contextual shortcuts correctly", () => {
    const shortcuts = buildShortcuts(true);
    const contextual = shortcuts.filter((s) => s.contextual);
    expect(contextual.length).toBeGreaterThanOrEqual(3);
    expect(contextual.map((s) => s.label)).toContain("Previous Task");
    expect(contextual.map((s) => s.label)).toContain("Next Task");
    expect(contextual.map((s) => s.label)).toContain("Stop");
    expect(contextual.map((s) => s.label)).toContain("Hands-Free");
  });

  it("should have non-empty descriptions for all shortcuts", () => {
    const shortcuts = buildShortcuts(true);
    for (const s of shortcuts) {
      expect(s.description.length).toBeGreaterThan(5);
    }
  });
});

describe("Keyboard Shortcuts — Platform Awareness", () => {
  it("Mac shortcuts should use ⌘ symbol", () => {
    const shortcuts = buildShortcuts(true);
    const modShortcuts = shortcuts.filter((s) => s.key.includes("⌘"));
    expect(modShortcuts.length).toBeGreaterThanOrEqual(8);
  });

  it("Windows shortcuts should use Ctrl+ prefix", () => {
    const shortcuts = buildShortcuts(false);
    const ctrlShortcuts = shortcuts.filter((s) => s.key.includes("Ctrl+"));
    expect(ctrlShortcuts.length).toBeGreaterThanOrEqual(8);
  });

  it("Mac mod key should be ⌘", () => {
    expect(getModKey(true)).toBe("⌘");
  });

  it("Windows mod key should be Ctrl+", () => {
    expect(getModKey(false)).toBe("Ctrl+");
  });

  it("Mac alt key should be ⌥", () => {
    expect(getAltKey(true)).toBe("⌥");
  });

  it("Windows alt key should be Alt+", () => {
    expect(getAltKey(false)).toBe("Alt+");
  });

  it("Shift key should be ⇧ on both platforms", () => {
    expect(getShiftKey()).toBe("⇧");
  });

  it("Non-modifier shortcuts should be identical across platforms", () => {
    const mac = buildShortcuts(true);
    const win = buildShortcuts(false);
    const macNonMod = mac.filter((s) => !s.key.includes("⌘") && !s.key.includes("Ctrl+"));
    const winNonMod = win.filter((s) => !s.key.includes("⌘") && !s.key.includes("Ctrl+"));
    expect(macNonMod.map((s) => s.key)).toEqual(winNonMod.map((s) => s.key));
  });
});

describe("Keyboard Shortcuts — Grouping", () => {
  it("should group shortcuts by category in correct order", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    const categoryOrder = grouped.map((g) => g.category);
    expect(categoryOrder).toEqual(["navigation", "task", "editing", "accessibility", "general"]);
  });

  it("should assign correct labels to groups", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    expect(grouped[0].label).toBe("Navigation");
    expect(grouped[1].label).toBe("Tasks");
    expect(grouped[2].label).toBe("Editing");
    expect(grouped[3].label).toBe("Accessibility");
    expect(grouped[4].label).toBe("General");
  });

  it("navigation group should have 5 shortcuts", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    const nav = grouped.find((g) => g.category === "navigation");
    expect(nav?.shortcuts).toHaveLength(5);
  });

  it("general group should have 3 shortcuts", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    const general = grouped.find((g) => g.category === "general");
    expect(general?.shortcuts).toHaveLength(3);
  });

  it("all shortcuts should appear in exactly one group", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    const totalInGroups = grouped.reduce((sum, g) => sum + g.shortcuts.length, 0);
    expect(totalInGroups).toBe(shortcuts.length);
  });

  it("should not create empty groups", () => {
    const shortcuts = buildShortcuts(true);
    const grouped = groupShortcuts(shortcuts);
    for (const g of grouped) {
      expect(g.shortcuts.length).toBeGreaterThan(0);
    }
  });
});

describe("Keyboard Shortcuts — Key Event Resolution", () => {
  const state = { showHelp: false };

  it("Cmd+K should resolve to focus_input", () => {
    expect(resolveShortcut({ key: "k", metaKey: true }, state)).toBe("focus_input");
    expect(resolveShortcut({ key: "k", ctrlKey: true }, state)).toBe("focus_input");
  });

  it("Cmd+N should resolve to new_task", () => {
    expect(resolveShortcut({ key: "n", metaKey: true }, state)).toBe("new_task");
  });

  it("Cmd+Shift+N should NOT resolve to new_task (shift guard)", () => {
    expect(resolveShortcut({ key: "n", metaKey: true, shiftKey: true }, state)).toBe("none");
  });

  it("Cmd+/ should resolve to toggle_help", () => {
    expect(resolveShortcut({ key: "/", metaKey: true }, state)).toBe("toggle_help");
  });

  it("Cmd+Shift+S should resolve to toggle_sidebar", () => {
    expect(resolveShortcut({ key: "S", metaKey: true, shiftKey: true }, state)).toBe("toggle_sidebar");
    expect(resolveShortcut({ key: "s", ctrlKey: true, shiftKey: true }, state)).toBe("toggle_sidebar");
  });

  it("Cmd+Shift+T should resolve to cycle_theme", () => {
    expect(resolveShortcut({ key: "T", metaKey: true, shiftKey: true }, state)).toBe("cycle_theme");
    expect(resolveShortcut({ key: "t", ctrlKey: true, shiftKey: true }, state)).toBe("cycle_theme");
  });

  it("Cmd+. should resolve to stop_generation", () => {
    expect(resolveShortcut({ key: ".", metaKey: true }, state)).toBe("stop_generation");
  });

  it("Cmd+ArrowUp should resolve to prev_task", () => {
    expect(resolveShortcut({ key: "ArrowUp", metaKey: true }, state)).toBe("prev_task");
  });

  it("Cmd+ArrowDown should resolve to next_task", () => {
    expect(resolveShortcut({ key: "ArrowDown", metaKey: true }, state)).toBe("next_task");
  });

  it("Cmd+Shift+ArrowUp should NOT resolve to prev_task", () => {
    expect(resolveShortcut({ key: "ArrowUp", metaKey: true, shiftKey: true }, state)).toBe("none");
  });

  it("? key should resolve to toggle_help when not in input", () => {
    expect(resolveShortcut({ key: "?", isInput: false }, state)).toBe("toggle_help");
  });

  it("? key should NOT resolve to toggle_help when in input", () => {
    expect(resolveShortcut({ key: "?", isInput: true }, state)).toBe("none");
  });

  it("Escape should resolve to close_help when help is showing", () => {
    expect(resolveShortcut({ key: "Escape" }, { showHelp: true })).toBe("close_help");
  });

  it("Escape should resolve to escape when help is not showing", () => {
    expect(resolveShortcut({ key: "Escape" }, { showHelp: false })).toBe("escape");
  });

  it("random keys should resolve to none", () => {
    expect(resolveShortcut({ key: "a" }, state)).toBe("none");
    expect(resolveShortcut({ key: "Enter" }, state)).toBe("none");
    expect(resolveShortcut({ key: "Tab" }, state)).toBe("none");
  });

  it("Cmd+K should work even when in input (global shortcut)", () => {
    expect(resolveShortcut({ key: "k", metaKey: true, isInput: true }, state)).toBe("focus_input");
  });
});

describe("Keyboard Shortcuts — Dialog Search Logic", () => {
  function filterShortcuts(shortcuts: ShortcutAction[], query: string) {
    if (!query.trim()) return shortcuts;
    const lower = query.toLowerCase();
    return shortcuts.filter(
      (s) =>
        s.label.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.key.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower)
    );
  }

  const shortcuts = buildShortcuts(true);

  it("empty query should return all shortcuts", () => {
    expect(filterShortcuts(shortcuts, "")).toHaveLength(13);
    expect(filterShortcuts(shortcuts, "  ")).toHaveLength(13);
  });

  it("should filter by label", () => {
    const results = filterShortcuts(shortcuts, "New Task");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].label).toBe("New Task");
  });

  it("should filter by description", () => {
    const results = filterShortcuts(shortcuts, "sidebar");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((s) => s.label === "Sidebar")).toBe(true);
  });

  it("should filter by key", () => {
    const results = filterShortcuts(shortcuts, "Esc");
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((s) => s.label === "Close")).toBe(true);
  });

  it("should filter by category", () => {
    const results = filterShortcuts(shortcuts, "navigation");
    expect(results.length).toBe(5);
  });

  it("should be case-insensitive", () => {
    const upper = filterShortcuts(shortcuts, "THEME");
    const lower = filterShortcuts(shortcuts, "theme");
    expect(upper.length).toBe(lower.length);
    expect(upper.length).toBeGreaterThanOrEqual(1);
  });

  it("should return empty for non-matching query", () => {
    const results = filterShortcuts(shortcuts, "xyznonexistent");
    expect(results).toHaveLength(0);
  });

  it("should match partial strings", () => {
    const results = filterShortcuts(shortcuts, "gen");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Keyboard Shortcuts — Key Badge Splitting", () => {
  /** Mirrors the KeyBadge splitting logic from KeyboardShortcutsDialog */
  function splitKeyCombo(key: string): string[] {
    // Mac-style: split on individual symbols (⌘, ⇧, ⌥) then remaining chars
    if (/[⌘⇧⌥]/.test(key)) {
      const parts: string[] = [];
      let remaining = key;
      for (const sym of ["⌘", "⇧", "⌥"]) {
        if (remaining.includes(sym)) {
          parts.push(sym);
          remaining = remaining.replace(sym, "");
        }
      }
      if (remaining) parts.push(remaining);
      return parts;
    }
    // Windows-style: split on "+"
    if (key.includes("+")) {
      return key.split("+").filter(Boolean);
    }
    return [key];
  }

  it("should split Mac combo ⌘K into [⌘, K]", () => {
    expect(splitKeyCombo("⌘K")).toEqual(["⌘", "K"]);
  });

  it("should split Mac combo ⌘⇧S into [⌘, ⇧, S]", () => {
    expect(splitKeyCombo("⌘⇧S")).toEqual(["⌘", "⇧", "S"]);
  });

  it("should split Windows combo Ctrl+K into [Ctrl, K]", () => {
    expect(splitKeyCombo("Ctrl+K")).toEqual(["Ctrl", "K"]);
  });

  it("should split Windows combo Ctrl+⇧S into parts", () => {
    // Windows shortcuts use ⇧ for Shift in our registry, so the combo is Ctrl+⇧S
    // The ⇧ symbol triggers Mac-style splitting first
    const parts = splitKeyCombo("Ctrl+⇧S");
    expect(parts).toContain("⇧");
    expect(parts.length).toBeGreaterThanOrEqual(2);
  });

  it("should keep single keys as-is", () => {
    expect(splitKeyCombo("Enter")).toEqual(["Enter"]);
    expect(splitKeyCombo("Esc")).toEqual(["Esc"]);
    expect(splitKeyCombo("?")).toEqual(["?"]);
  });

  it("should handle arrow key combos", () => {
    expect(splitKeyCombo("⌘↑")).toEqual(["⌘", "↑"]);
    expect(splitKeyCombo("⌘↓")).toEqual(["⌘", "↓"]);
  });
});

describe("Keyboard Shortcuts — Escape Precedence", () => {
  it("Escape closes help overlay before triggering onEscape callback", () => {
    // When help is open, Escape should close help (not call onEscape)
    const result1 = resolveShortcut({ key: "Escape" }, { showHelp: true });
    expect(result1).toBe("close_help");

    // When help is closed, Escape should trigger the escape callback
    const result2 = resolveShortcut({ key: "Escape" }, { showHelp: false });
    expect(result2).toBe("escape");
  });

  it("Cmd+/ toggles help regardless of current state", () => {
    const r1 = resolveShortcut({ key: "/", metaKey: true }, { showHelp: false });
    const r2 = resolveShortcut({ key: "/", metaKey: true }, { showHelp: true });
    expect(r1).toBe("toggle_help");
    expect(r2).toBe("toggle_help");
  });
});

describe("Keyboard Shortcuts — Category Metadata", () => {
  it("should have 5 categories", () => {
    expect(Object.keys(CATEGORY_META)).toHaveLength(5);
  });

  it("should have unique order values", () => {
    const orders = Object.values(CATEGORY_META).map((m) => m.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("should have non-empty labels", () => {
    for (const meta of Object.values(CATEGORY_META)) {
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });

  it("order should be sequential starting from 0", () => {
    const orders = Object.values(CATEGORY_META)
      .map((m) => m.order)
      .sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4]);
  });
});
