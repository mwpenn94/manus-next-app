/**
 * KeyboardShortcutsDialog — Floating overlay showing available keyboard shortcuts.
 * Triggered by Cmd+/ or the ? button.
 */
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { SHORTCUTS, type ShortcutAction } from "@/hooks/useKeyboardShortcuts";

interface Props {
  open: boolean;
  onClose: () => void;
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutAction }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-foreground">{shortcut.description}</span>
      <kbd className="text-[10px] font-mono bg-muted border border-border px-2 py-0.5 rounded text-muted-foreground min-w-[40px] text-center">
        {shortcut.key}
      </kbd>
    </div>
  );
}

export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
  const categories = {
    navigation: "Navigation",
    task: "Tasks",
    editing: "Editing",
    general: "General",
  };

  const grouped = Object.entries(categories).map(([key, label]) => ({
    label,
    shortcuts: SHORTCUTS.filter((s) => s.category === key),
  }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] max-w-[90vw] bg-card border border-border rounded-xl shadow-2xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
              {grouped.map((group) => (
                <div key={group.label} className="mb-3 last:mb-0">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
                    {group.label}
                  </h4>
                  {group.shortcuts.map((s) => (
                    <ShortcutRow key={s.key} shortcut={s} />
                  ))}
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-[10px] text-muted-foreground text-center">
                Press <kbd className="font-mono bg-muted px-1 rounded">?</kbd> or <kbd className="font-mono bg-muted px-1 rounded">⌘/</kbd> to toggle this dialog
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
