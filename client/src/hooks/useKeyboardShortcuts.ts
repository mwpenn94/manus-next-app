/**
 * Global Keyboard Shortcuts Hook
 *
 * Provides power-user keyboard navigation across the app.
 * Shortcuts:
 * - Cmd/Ctrl+K: Focus home search / new task
 * - Cmd/Ctrl+N: New task (navigate home)
 * - Cmd/Ctrl+/: Toggle keyboard shortcut help
 * - Escape: Close modals / cancel current action
 * - Cmd/Ctrl+Shift+S: Toggle sidebar
 */
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

export interface ShortcutAction {
  key: string;
  label: string;
  description: string;
  category: "navigation" | "editing" | "task" | "general";
}

export const SHORTCUTS: ShortcutAction[] = [
  { key: "⌘K", label: "Quick Focus", description: "Focus search / input", category: "navigation" },
  { key: "⌘N", label: "New Task", description: "Create a new task", category: "task" },
  { key: "⌘/", label: "Shortcuts", description: "Toggle shortcut help", category: "general" },
  { key: "⌘⇧S", label: "Sidebar", description: "Toggle sidebar", category: "navigation" },
  { key: "?", label: "Help", description: "Show keyboard shortcuts", category: "general" },
  { key: "Esc", label: "Escape", description: "Close dialog / cancel", category: "general" },
  { key: "Enter", label: "Send", description: "Send message (in chat)", category: "editing" },
  { key: "⇧Enter", label: "New Line", description: "New line in message", category: "editing" },
];

export function useKeyboardShortcuts(options?: {
  onNewTask?: () => void;
  onToggleSidebar?: () => void;
  onEscape?: () => void;
  onFocusInput?: () => void;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const [, navigate] = useLocation();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

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
      if (isMod && e.shiftKey && e.key === "S") {
        e.preventDefault();
        options?.onToggleSidebar?.();
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

  return {
    showHelp,
    setShowHelp,
    shortcuts: SHORTCUTS,
  };
}
