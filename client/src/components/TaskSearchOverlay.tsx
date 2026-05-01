import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: number;
}

interface SearchMatch {
  messageId: string;
  matchIndex: number;
  snippet: string;
}

interface TaskSearchOverlayProps {
  messages: Message[];
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string, matchIndex: number) => void;
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const TaskSearchOverlay = ({
  messages,
  isOpen,
  onClose,
  onNavigateToMessage,
}: TaskSearchOverlayProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedSearchTerm = useDebounce(searchTerm, 150);

  const matches = useMemo<SearchMatch[]>(() => {
    if (!debouncedSearchTerm) return [];
    const results: SearchMatch[] = [];
    const lowercasedTerm = debouncedSearchTerm.toLowerCase();

    messages.forEach(message => {
      const content = message.content.toLowerCase();
      let matchIndex = -1;
      while ((matchIndex = content.indexOf(lowercasedTerm, matchIndex + 1)) !== -1) {
        const start = Math.max(0, matchIndex - 15);
        const end = Math.min(message.content.length, matchIndex + lowercasedTerm.length + 15);
        const snippet = `...${message.content.substring(start, end)}...`;
        results.push({ messageId: message.id, matchIndex, snippet });
      }
    });

    return results;
  }, [debouncedSearchTerm, messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isOpen]);

  useEffect(() => {
    if (matches.length > 0) {
        const currentMatch = matches[currentMatchIndex];
        onNavigateToMessage(currentMatch.messageId, currentMatch.matchIndex);
    } else if (debouncedSearchTerm) {
        onNavigateToMessage('', -1); // Clear highlight if no matches
    }
  }, [currentMatchIndex, matches, onNavigateToMessage, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [debouncedSearchTerm]);

  const handleNext = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % matches.length);
    }
  }, [matches.length]);

  const handlePrev = useCallback(() => {
    if (matches.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
    }
  }, [matches.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
          className="absolute top-4 right-4 z-50 bg-card border border-border rounded-lg shadow-lg p-2 flex items-center space-x-2 w-96"
        >
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search messages..."
            className="flex-grow bg-background border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'ArrowUp') { e.preventDefault(); handlePrev(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); handleNext(); }
            }}
          />
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {matches.length > 0
              ? `${currentMatchIndex + 1} of ${matches.length}`
              : debouncedSearchTerm ? '0 of 0' : ''}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrev} disabled={matches.length === 0}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext} disabled={matches.length === 0}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// This hook should be used in the parent component that contains the chat area
// to listen for the Cmd/Ctrl+F shortcut.
export const useTaskSearchShortcut = (onOpen: () => void) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                onOpen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onOpen]);
};

// Example of how to render highlighted content in the parent component
export const HighlightedContent = ({ text, searchTerm, currentMatchIndex }: { text: string; searchTerm: string; currentMatchIndex: number }) => {
    if (!searchTerm) return <>{text}</>;

    const lowercasedText = text.toLowerCase();
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    let matchCount = -1;

    let matchIndex = -1;
    while ((matchIndex = lowercasedText.indexOf(lowercasedSearchTerm, lastIndex)) !== -1) {
        matchCount++;
        // Add the text part before the match
        parts.push(text.substring(lastIndex, matchIndex));

        // Add the highlighted match
        const isCurrent = matchCount === currentMatchIndex;
        parts.push(
            <mark key={matchIndex} className={cn(
                "p-0 m-0 rounded",
                isCurrent ? "bg-orange-400/50" : "bg-yellow-300/50"
            )}>
                {text.substring(matchIndex, matchIndex + searchTerm.length)}
            </mark>
        );

        lastIndex = matchIndex + searchTerm.length;
    }

    // Add the remaining text part
    parts.push(text.substring(lastIndex));

    return <>{parts}</>;
};