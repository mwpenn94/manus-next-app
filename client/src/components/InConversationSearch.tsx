/**
 * InConversationSearch — Floating search bar for searching within a task's messages
 *
 * Manus parity: Cmd+F / Ctrl+F triggers a floating search overlay within the chat,
 * allowing users to search through message content with match highlighting,
 * prev/next navigation, and match count display.
 *
 * Convergence Pass 5 — Step 1
 */
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/contexts/TaskContext";

interface SearchMatch {
  messageIndex: number;
  startOffset: number;
  endOffset: number;
}

interface InConversationSearchProps {
  open: boolean;
  onClose: () => void;
  messages: Message[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Escape special regex characters in a search string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function InConversationSearch({
  open,
  onClose,
  messages,
  scrollRef,
}: InConversationSearchProps) {
  const [query, setQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Compute matches whenever query or messages change
  const matches: SearchMatch[] = useMemo(() => {
    if (!query.trim()) return [];
    const escaped = escapeRegex(query.trim());
    const regex = new RegExp(escaped, "gi");
    const result: SearchMatch[] = [];

    messages.forEach((msg, msgIdx) => {
      // Only search user and assistant messages (skip system/card-only)
      if (msg.role !== "user" && msg.role !== "assistant") return;
      const content = msg.content || "";
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        result.push({
          messageIndex: msgIdx,
          startOffset: match.index,
          endOffset: match.index + match[0].length,
        });
      }
    });

    return result;
  }, [query, messages]);

  // Reset current match when query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [query]);

  // Auto-focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [open]);

  // Apply highlights and scroll to current match
  useEffect(() => {
    if (!scrollRef.current || !query.trim()) {
      // Clear all highlights when query is empty
      clearHighlights(scrollRef.current);
      return;
    }

    // Apply highlights to all message elements
    applyHighlights(scrollRef.current, query.trim(), currentMatchIndex, matches);

    // Scroll to current match
    if (matches.length > 0) {
      const activeHighlight = scrollRef.current?.querySelector("[data-search-active]");
      if (activeHighlight) {
        activeHighlight.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [query, currentMatchIndex, matches, scrollRef]);

  // Clear highlights on close
  useEffect(() => {
    if (!open) {
      clearHighlights(scrollRef.current);
      setQuery("");
      setCurrentMatchIndex(0);
    }
  }, [open, scrollRef]);

  const goToNext = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const goToPrev = useCallback(() => {
    if (matches.length === 0) return;
    setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goToPrev();
        } else {
          goToNext();
        }
      }
    },
    [onClose, goToNext, goToPrev]
  );

  if (!open) return null;

  return (
    <div className="absolute top-0 right-0 z-30 m-2 md:m-3">
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg shadow-lg shadow-black/20 px-3 py-1.5">
        <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search in conversation..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-48 md:w-64"
          aria-label="Search in conversation"
        />
        {/* Match count */}
        {query.trim() && (
          <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
            {matches.length > 0
              ? `${currentMatchIndex + 1}/${matches.length}`
              : "0 results"}
          </span>
        )}
        {/* Prev/Next */}
        <button
          onClick={goToPrev}
          disabled={matches.length === 0}
          className={cn(
            "p-1 rounded transition-colors",
            matches.length > 0
              ? "text-muted-foreground hover:text-foreground hover:bg-accent"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title="Previous match (Shift+Enter)"
          aria-label="Previous match"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={goToNext}
          disabled={matches.length === 0}
          className={cn(
            "p-1 rounded transition-colors",
            matches.length > 0
              ? "text-muted-foreground hover:text-foreground hover:bg-accent"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title="Next match (Enter)"
          aria-label="Next match"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        {/* Close */}
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="Close (Escape)"
          aria-label="Close search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Clear all search highlights from the DOM.
 */
function clearHighlights(container: HTMLElement | null) {
  if (!container) return;
  const marks = container.querySelectorAll("mark[data-search-highlight]");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
      parent.normalize();
    }
  });
}

/**
 * Apply search highlights to text nodes within the message container.
 * Uses TreeWalker to find text nodes and wraps matches in <mark> elements.
 */
function applyHighlights(
  container: HTMLElement,
  query: string,
  activeMatchIndex: number,
  matches: SearchMatch[]
) {
  // First clear existing highlights
  clearHighlights(container);

  if (!query || matches.length === 0) return;

  const escaped = escapeRegex(query);
  const regex = new RegExp(escaped, "gi");

  // Find all message bubble elements
  const messageBubbles = container.querySelectorAll("[data-message-content]");

  let globalMatchCounter = 0;

  messageBubbles.forEach((bubble) => {
    const walker = document.createTreeWalker(bubble, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      textNodes.push(node);
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      const nodeMatches: Array<{ start: number; end: number; isActive: boolean }> = [];

      let match: RegExpExecArray | null;
      const localRegex = new RegExp(escaped, "gi");
      while ((match = localRegex.exec(text)) !== null) {
        nodeMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          isActive: globalMatchCounter === activeMatchIndex,
        });
        globalMatchCounter++;
      }

      if (nodeMatches.length === 0) continue;

      // Build replacement fragment
      const frag = document.createDocumentFragment();
      let lastEnd = 0;

      for (const m of nodeMatches) {
        // Text before match
        if (m.start > lastEnd) {
          frag.appendChild(document.createTextNode(text.slice(lastEnd, m.start)));
        }
        // Highlighted match
        const mark = document.createElement("mark");
        mark.setAttribute("data-search-highlight", "true");
        if (m.isActive) {
          mark.setAttribute("data-search-active", "true");
          mark.className = "bg-primary/40 text-foreground rounded-sm px-0.5";
        } else {
          mark.className = "bg-amber-500/25 text-foreground rounded-sm px-0.5";
        }
        mark.textContent = text.slice(m.start, m.end);
        frag.appendChild(mark);
        lastEnd = m.end;
      }

      // Remaining text after last match
      if (lastEnd < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastEnd)));
      }

      textNode.parentNode?.replaceChild(frag, textNode);
    }
  });
}

/**
 * Hook to manage Cmd+F / Ctrl+F keyboard shortcut for in-conversation search.
 */
export function useConversationSearch() {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return {
    searchOpen,
    setSearchOpen,
    openSearch: () => setSearchOpen(true),
    closeSearch: () => setSearchOpen(false),
  };
}
