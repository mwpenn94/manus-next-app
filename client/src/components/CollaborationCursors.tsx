import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Cursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  selection?: { start: number; end: number };
  lastActive: number;
}

interface CollaborationCursorsProps {
  cursors: Cursor[];
  containerRef: React.RefObject<HTMLElement | null>;
  currentUserId: string;
}

const INACTIVE_TIMEOUT = 30 * 1000; // 30 seconds

export const CollaborationCursors: React.FC<CollaborationCursorsProps> = ({ cursors, containerRef, currentUserId }) => {
  const now = Date.now();

  const remoteCursors = useMemo(() => 
    cursors.filter(cursor => 
      cursor.userId !== currentUserId && (now - cursor.lastActive) < INACTIVE_TIMEOUT
    )
  , [cursors, currentUserId, now]);

  const showLabels = remoteCursors.length < 3;

  const renderSelection = (cursor: Cursor) => {
    if (!cursor.selection || !containerRef.current) {
      return null;
    }

    const { start, end } = cursor.selection;
    const container = containerRef.current;
    const range = document.createRange();

    try {
      // This is a simplified implementation assuming the container has a single text node.
      // For complex editors, this logic would need to be more sophisticated, likely integrating
      // with the editor's own model for mapping character offsets to screen positions.
      const textNode = container.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE && end <= (textNode as Text).length) {
        range.setStart(textNode, start);
        range.setEnd(textNode, end);
        const rects = Array.from(range.getClientRects());
        const containerRect = container.getBoundingClientRect();

        return rects.map((rect, i) => (
          <div
            key={`${cursor.userId}-selection-${i}`}
            className="absolute"
            style={{
              left: rect.left - containerRect.left,
              top: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
              backgroundColor: cursor.color,
              opacity: 0.3,
              pointerEvents: 'none',
              zIndex: -1,
            }}
          />
        ));
      }
    } catch (error) {
      console.error("Failed to render selection:", error);
    }

    return null;
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none" aria-hidden="true">
      <AnimatePresence>
        {remoteCursors.map(cursor => (
          <React.Fragment key={cursor.userId}>
            {renderSelection(cursor)}
            <motion.div
              className="absolute z-50"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                x: cursor.position.x,
                y: cursor.position.y,
                opacity: 1,
                scale: 1,
              }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
              transition={{ 
                type: "spring" as const, 
                stiffness: 700, 
                damping: 30 
              }}
            >
              <div className="relative group">
                <MousePointer2
                  className="transform -rotate-90 transition-transform duration-200 group-hover:scale-110"
                  style={{ color: cursor.color, fill: cursor.color }}
                  size={20}
                />
                <div
                  className={cn(
                    "absolute left-5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md text-xs whitespace-nowrap shadow-lg",
                    "transition-opacity duration-200",
                    showLabels ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ 
                    backgroundColor: cursor.color,
                    color: 'white' // A high-contrast text color should be chosen programmatically
                  }}
                >
                  {cursor.userName}
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>

      {remoteCursors.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-card text-card-foreground px-3 py-1.5 rounded-full text-sm shadow-lg animate-in fade-in">
          {remoteCursors.length} {remoteCursors.length === 1 ? 'other is' : 'others are'} viewing
        </div>
      )}
    </div>
  );
};