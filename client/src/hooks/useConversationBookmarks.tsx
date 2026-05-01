
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo, ReactNode } from 'react';
import { Bookmark, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// 1. Context and Provider
// =======================

interface ConversationBookmarksContextValue {
  bookmarkedIds: Set<string>;
  toggleBookmark: (messageId: string) => void;
  isBookmarked: (messageId: string) => boolean;
  getBookmarks: () => string[];
}

const ConversationBookmarksContext = createContext<ConversationBookmarksContextValue | null>(null);

export function ConversationBookmarksProvider({ taskId, children }: { taskId: string; children: ReactNode }) {
  const localStorageKey = useMemo(() => `manus-bookmarks-${taskId}`, [taskId]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem(localStorageKey);
      if (storedBookmarks) {
        const parsed = JSON.parse(storedBookmarks);
        if (Array.isArray(parsed)) {
            setBookmarkedIds(new Set(parsed));
        }
      }
    } catch (error) {
      console.error("Failed to load bookmarks from localStorage", error);
      setBookmarkedIds(new Set());
    }
  }, [localStorageKey]);

  const updateLocalStorage = useCallback((newBookmarks: Set<string>) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(Array.from(newBookmarks)));
    } catch (error) {
      console.error("Failed to save bookmarks to localStorage", error);
    }
  }, [localStorageKey]);

  const toggleBookmark = useCallback((messageId: string) => {
    setBookmarkedIds(prevBookmarks => {
      const newBookmarks = new Set(prevBookmarks);
      if (newBookmarks.has(messageId)) {
        newBookmarks.delete(messageId);
      } else {
        newBookmarks.add(messageId);
      }
      updateLocalStorage(newBookmarks);
      return newBookmarks;
    });
  }, [updateLocalStorage]);

  const isBookmarked = useCallback((messageId: string) => {
    return bookmarkedIds.has(messageId);
  }, [bookmarkedIds]);

  const getBookmarks = useCallback(() => {
    return Array.from(bookmarkedIds);
  }, [bookmarkedIds]);

  const value = useMemo(() => ({
    bookmarkedIds,
    toggleBookmark,
    isBookmarked,
    getBookmarks,
  }), [bookmarkedIds, toggleBookmark, isBookmarked, getBookmarks]);

  return (
    <ConversationBookmarksContext.Provider value={value}>
      {children}
    </ConversationBookmarksContext.Provider>
  );
}

// 2. The Public Hook
// ==================

export function useConversationBookmarks() {
  const context = useContext(ConversationBookmarksContext);
  if (!context) {
    throw new Error('useConversationBookmarks must be used within a ConversationBookmarksProvider');
  }
  return context;
}

// 3. BookmarkButton Component
// ===========================

interface BookmarkButtonProps {
  messageId: string;
  className?: string;
}

export function BookmarkButton({ messageId, className }: BookmarkButtonProps) {
  const { toggleBookmark, isBookmarked } = useConversationBookmarks();
  const bookmarked = isBookmarked(messageId);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-6 w-6 text-foreground/40 transition-colors hover:text-foreground/80',
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        toggleBookmark(messageId);
      }}
      aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current text-primary')} />
    </Button>
  );
}

// 4. BookmarkPanel Component
// ==========================

interface BookmarkPanelProps {
  onBookmarkClick: (messageId: string) => void;
  onClose: () => void;
  className?: string;
}

export function BookmarkPanel({ onBookmarkClick, onClose, className }: BookmarkPanelProps) {
  const { bookmarkedIds, getBookmarks } = useConversationBookmarks();
  const bookmarks = getBookmarks();

  return (
    <AnimatePresence>
      {bookmarkedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={cn('absolute bottom-full right-0 mb-2 w-80', className)}
        >
          <Card className="shadow-lg bg-card/80 backdrop-blur-lg">
            <CardHeader className="flex flex-row items-center justify-between p-4">
              <CardTitle className="text-base font-medium">Bookmarked Messages</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-auto max-h-60">
                <div className="p-2">
                  {bookmarks.length > 0 ? (
                    <ul className="space-y-1">
                      {bookmarks.map((id) => (
                        <li key={id}>
                          <button
                            onClick={() => onBookmarkClick(id)}
                            className="w-full text-left p-2 rounded-md text-sm text-foreground/80 hover:bg-primary/10 hover:text-foreground transition-colors truncate"
                          >
                            Message: ...{id.slice(-12)}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-center text-sm text-foreground/60 p-4">No bookmarks yet.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
