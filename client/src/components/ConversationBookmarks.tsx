
/**
 * A collapsible panel that displays a list of bookmarked messages.
 * It allows users to quickly navigate to or remove bookmarked messages.
 */
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, X } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming a utility function for conditional classes

// Helper to format time relative to now
const formatRelativeTime = (timestamp: number) => {
  const now = new Date();
  const then = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

interface BookmarkItem {
  messageId: string;
  content: string;
  timestamp: number;
}

interface ConversationBookmarksProps {
  bookmarks: BookmarkItem[];
  onJumpTo: (messageId: string) => void;
  onRemove: (messageId: string) => void;
  className?: string;
}

const ConversationBookmarks: React.FC<ConversationBookmarksProps> = ({ bookmarks, onJumpTo, onRemove, className }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={cn('bg-card border border-border rounded-lg w-full max-w-sm', className)}>
      <button
        className="flex items-center justify-between w-full p-3 text-left text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          <span className="font-medium">Bookmarked Messages</span>
        </div>
        <div className="flex items-center gap-2">
            {bookmarks.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary-foreground">
                    {bookmarks.length}
                </span>
            )}
            <motion.div animate={{ rotate: isOpen ? 0 : -90 }}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down h-4 w-4 transition-transform duration-200"><path d="m6 9 6 6 6-6"/></svg>
            </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: 'auto' },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-border">
              {bookmarks.length > 0 ? (
                <ul className="space-y-2">
                  <AnimatePresence>
                    {bookmarks.map((bookmark) => (
                      <motion.li
                        key={bookmark.messageId}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                      >
                        <button onClick={() => onJumpTo(bookmark.messageId)} className="flex-1 text-left pr-2">
                          <p className="text-sm truncate text-foreground">
                            {bookmark.content.substring(0, 60)}
                            {bookmark.content.length > 60 ? '...' : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(bookmark.timestamp)}</p>
                        </button>
                        <button
                          onClick={() => onRemove(bookmark.messageId)}
                          className="p-1 rounded-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <p className="text-sm text-center text-muted-foreground">No bookmarks yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConversationBookmarks;
