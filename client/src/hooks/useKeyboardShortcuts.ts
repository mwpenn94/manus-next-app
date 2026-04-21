/**
 * Global Keyboard Shortcuts Hook
 *
 * Provides power-user keyboard navigation across the app.
 * Platform-aware: shows ⌘ on Mac, Ctrl on Windows/Linux.
 *
 * Shortcuts:
 * - Cmd/Ctrl+K: Focus home search / new task input
 * - Cmd/Ctrl+N: New task (navigate home)
 * - Cmd/Ctrl+/: Toggle keyboard shortcut help
 * - Cmd/Ctrl+Shift+S: Toggle sidebar
 * - Cmd/Ctrl+Shift+V: Toggle hands-free mode
 * - Cmd/Ctrl+Shift+T: Cycle theme (dark → light → system)
 * - Cmd/Ctrl+.: Stop generation (when streaming)
 * - Cmd/Ctrl+↑ / Cmd/Ctrl+↓: Navigate between tasks
 * - ?: Show keyboard shortcuts (when not in input)
 * - Escape: Close modals / cancel current action
 * - Enter: Send message (in chat)
 * - Shift+Enter: New line in message
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";

/* ─── Platform Detection ─── */
const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** Returns the platform-appropriate modifier symbol */
export const MOD_KEY = isMac ? "⌘" : "Ctrl+";
export const SHIFT_KEY = "⇧";
export const ALT_KEY = isMac ? "⌥" : "Alt+";

export type ShortcutCategory = "navigation" | "editing" | "task" | "accessibility" | "general";

export interface ShortcutAction {
  /** Display key combination — uses platform-aware symbols */
  key: string;
  /** Short label for the action */
  label: string;
  /** Longer description of what the shortcut does */
  description: string;
  /** Category for grouping in the overlay */
  category: ShortcutCategory;
  /** Whether this shortcut is context-dependent (only works in certain views) */
  contextual?: boolean;
}

/** All registered shortcuts — platform-aware symbols */
export const SHORTCUTS: ShortcutAction[] = [
  // Navigation
  { key: `${MOD_KEY}K`, label: "Quick Focus", description: "Focus search or chat input", category: "navigation" },
  { key: `${MOD_KEY}N`, label: "New Task", description: "Start a new conversation", category: "navigation" },
  { key: `${MOD_KEY}${SHIFT_KEY}S`, label: "Sidebar", description: "Toggle sidebar panel", category: "navigation" },
  { key: `${MOD_KEY}\u2191`, label: "Previous Task", description: "Navigate to previous task", category: "navigation", contextual: true },
  { key: `${MOD_KEY}\u2193`, label: "Next Task", description: "Navigate to next task", category: "navigation", contextual: true },

  // Task Management
  { key: `${MOD_KEY}.`, label: "Stop", description: "Stop generation", category: "task", contextual: true },

  // Editing
  { key: "Enter", label: "Send", description: "Send message", category: "editing" },
  { key: `${SHIFT_KEY}Enter`, label: "New Line", description: "Insert new line in message", category: "editing" },

  // Accessibility
  { key: `${MOD_KEY}${SHIFT_KEY}V`, label: "Hands-Free", description: "Toggle hands-free voice mode", category: "accessibility", contextual: true },
  { key: `${MOD_KEY}${SHIFT_KEY}T`, label: "Theme", description: "Cycle theme (dark / light / system)", category: "accessibility" },

  // General
  { key: `${MOD_KEY}/`, label: "Shortcuts", description: "Toggle this shortcuts overlay", category: "general" },
  { key: "?", label: "Help", description: "Show keyboard shortcuts", category: "general" },
  { key: "Esc", label: "Close", description: "Close dialog or cancel action", category: "general" },
];

/** Category display order and labels */
export const CATEGORY_META: Record<ShortcutCategory, { label: string; order: number }> = {
  navigation: { label: "Navigation", order: 0 },
  task: { label: "Tasks", order: 1 },
  editing: { label: "Editing", order: 2 },
  accessibility: { label: "Accessibility", order: 3 },
  general: { label: "General", order: 4 },
};

export interface KeyboardShortcutOptions {
  onNewTask?: () => void;
  onToggleSidebar?: () => void;
  onEscape?: () => void;
  onFocusInput?: () => void;
  onStopGeneration?: () => void;
  onCycleTheme?: () => void;
  onNavigatePrevTask?: () => void;
  onNavigateNextTask?: () => void;
}

export function useKeyboardShortcuts(options?: KeyboardShortcutOptions) {
  const [showHelp, setShowHelp] = useState(false);
  const [, navigate] = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Cmd+K: Focus input
      if (isMod && e.key === "k") {
        e.preventDefault();
        options?.onFocusInput?.();
        return;
      }

      // Cmd+N: New task
      if (isMod && e.key === "n" && !e.shiftKey) {
        e.preventDefault();
        if (options?.onNewTask) {
          options.onNewTask();
        } else {
          navigate("/");
        }
        return;
      }

      // Cmd+/: Toggle shortcuts help
      if (isMod && e.key === "/") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Cmd+Shift+S: Toggle sidebar
      if (isMod && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        options?.onToggleSidebar?.();
        return;
      }

      // Cmd+Shift+T: Cycle theme
      if (isMod && e.shiftKey && (e.key === "T" || e.key === "t")) {
        e.preventDefault();
        options?.onCycleTheme?.();
        return;
      }

      // Cmd+.: Stop generation
      if (isMod && e.key === ".") {
        e.preventDefault();
        options?.onStopGeneration?.();
        return;
      }

      // Cmd+↑: Previous task
      if (isMod && e.key === "ArrowUp" && !e.shiftKey) {
        e.preventDefault();
        options?.onNavigatePrevTask?.();
        return;
      }

      // Cmd+↓: Next task
      if (isMod && e.key === "ArrowDown" && !e.shiftKey) {
        e.preventDefault();
        options?.onNavigateNextTask?.();
        return;
      }

      // ? key (no modifier, not in input): Toggle shortcuts help
      if (e.key === "?" && !isMod && !isInput) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      // Escape: Close dialogs / cancel
      if (e.key === "Escape") {
        if (showHelp) {
          setShowHelp(false);
          return;
        }
        options?.onEscape?.();
        return;
      }
    },
    [navigate, options, showHelp]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /** Grouped shortcuts sorted by category order */
  const groupedShortcuts = useMemo(() => {
    const entries = Object.entries(CATEGORY_META)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, meta]) => ({
        category: key as ShortcutCategory,
        label: meta.label,
        shortcuts: SHORTCUTS.filter((s) => s.category === key),
      }))
      .filter((g) => g.shortcuts.length > 0);
    return entries;
  }, []);

  return {
    showHelp,
    setShowHelp,
    shortcuts: SHORTCUTS,
    groupedShortcuts,
    isMac,
  };
}
