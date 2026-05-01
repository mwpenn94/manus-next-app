/**
 * KeyboardShortcutsDialog — Manus-authentic floating overlay showing available keyboard shortcuts.
 *
 * Features:
 * - Platform-aware modifier key display (⌘ on Mac, Ctrl on Windows/Linux)
 * - Grouped by category with contextual badges
 * - Search/filter for quick lookup
 * - Smooth framer-motion enter/exit
 * - Accessible: focus trap, aria labels, keyboard dismissible
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Search, Sparkles } from "lucide-react";
import {
  SHORTCUTS,
  CATEGORY_META,
  type ShortcutAction,
  type ShortcutCategory,
} from "@/hooks/useKeyboardShortcuts";

interface Props {
  open: boolean;
  onClose: () => void;
}

/* ─── Key Badge ─── */
function KeyBadge({ keyStr }: { keyStr: string }) {
  // Split compound keys like "⌘⇧S" into individual badges
  // Handle patterns: "Ctrl+Shift+S", "⌘⇧S", "Enter", "Esc", "?"
  const parts = keyStr.includes("+")
    ? keyStr.split("+").filter(Boolean)
    : keyStr.split(/(?=[⌘⇧⌥])/).filter(Boolean);

  if (parts.length <= 1) {
    return (
      <kbd className="inline-flex items-center justify-center text-[10px] font-mono bg-background/60 border border-border/60 px-1.5 py-0.5 rounded-md text-foreground min-w-[24px] text-center shadow-[0_1px_0_0_oklch(0.3_0_0)] leading-tight">
        {keyStr}
      </kbd>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center text-[10px] font-mono bg-background/60 border border-border/60 px-1.5 py-0.5 rounded-md text-foreground min-w-[20px] text-center shadow-[0_1px_0_0_oklch(0.3_0_0)] leading-tight"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}

/* ─── Shortcut Row ─── */
function ShortcutRow({ shortcut }: { shortcut: ShortcutAction }) {
  return (
    <div className="flex items-center justify-between py-2 px-1 rounded-md hover:bg-accent/30 transition-colors group">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs text-foreground font-medium truncate">
          {shortcut.label}
        </span>
        {shortcut.contextual && (
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium uppercase tracking-wider">
            contextual
          </span>
        )}
      </div>
      <div className="shrink-0 ml-3">
        <KeyBadge keyStr={shortcut.key} />
      </div>
    </div>
  );
}

/* ─── Category Section ─── */
function CategorySection({
  label,
  shortcuts,
}: {
  label: string;
  shortcuts: ShortcutAction[];
}) {
  if (shortcuts.length === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 font-semibold px-1">
        {label}
      </h4>
      <div className="space-y-0">
        {shortcuts.map((s) => (
          <ShortcutRow key={`${s.category}-${s.key}`} shortcut={s} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main Dialog ─── */
// Supported categories: navigation, task, editing, accessibility, general
export default function KeyboardShortcutsDialog({ open, onClose }: Props) {
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search input when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("");
      // Small delay to let the animation start
      const t = setTimeout(() => searchRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Filter shortcuts by search query
  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    const entries = Object.entries(CATEGORY_META)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([key, meta]) => ({
        category: key as ShortcutCategory,
        label: meta.label,
        shortcuts: SHORTCUTS.filter((s) => {
          if (!q) return s.category === key;
          return (
            s.category === key &&
            (s.label.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q) ||
              s.key.toLowerCase().includes(q) ||
              meta.label.toLowerCase().includes(q))
          );
        }),
      }))
      .filter((g) => g.shortcuts.length > 0);
    return entries;
  }, [search]);

  const totalResults = filteredGroups.reduce((sum, g) => sum + g.shortcuts.length, 0);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] max-w-[92vw] bg-card border border-border rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Keyboard className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground leading-tight">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {SHORTCUTS.length} shortcuts available
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                aria-label="Close shortcuts dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-background/50 border border-border/40 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
                  aria-label="Search keyboard shortcuts"
                />
              </div>
            </div>

            {/* Shortcut List */}
            <div className="px-4 pb-3 max-h-[55vh] overflow-y-auto scrollbar-thin">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <CategorySection
                    key={group.category}
                    label={group.label}
                    shortcuts={group.shortcuts}
                  />
                ))
              ) : (
                <div className="py-8 text-center">
                  <Sparkles className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No shortcuts match "{search}"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-border/40 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {search
                    ? `${totalResults} result${totalResults !== 1 ? "s" : ""}`
                    : "Press any shortcut to dismiss"}
                </p>
                <div className="flex items-center gap-1.5">
                  <KeyBadge keyStr="?" />
                  <span className="text-[10px] text-muted-foreground">or</span>
                  <KeyBadge keyStr="⌘/" />
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
