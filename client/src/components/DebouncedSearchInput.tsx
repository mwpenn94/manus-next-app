
"use client";

import * as React from "react";
import { Search, X, LoaderCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DebouncedSearchInputProps {
  onSearch: (query: string, signal: AbortSignal) => Promise<void> | void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
  debounceMs?: number;
}

const DebouncedSearchInput: React.FC<DebouncedSearchInputProps> = ({
  onSearch,
  placeholder = "Search...",
  className,
  initialValue = "",
  debounceMs = 300,
}) => {
  const [value, setValue] = React.useState(initialValue);
  const [isSearching, setIsSearching] = React.useState(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const handleClear = () => {
    setValue("");
  };

  React.useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }

    debounceTimerRef.current = setTimeout(async () => {
      const newAbortController = new AbortController();
      abortControllerRef.current = newAbortController;
      
      setIsSearching(true);
      try {
        await onSearch(value, newAbortController.signal);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error("Search failed:", error);
        }
      } finally {
        if (!newAbortController.signal.aborted) {
            setIsSearching(false);
        }
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [value, onSearch, debounceMs]);

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9 pr-10"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
        <AnimatePresence mode="wait">
          {isSearching ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="h-4 w-4"
            >
              <LoaderCircle className="h-full w-full animate-spin text-muted-foreground" />
            </motion.div>
          ) : value ? (
            <motion.div
              key="clear"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <button
                type="button"
                onClick={handleClear}
                className="h-4 w-4 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-full w-full" />
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DebouncedSearchInput;
