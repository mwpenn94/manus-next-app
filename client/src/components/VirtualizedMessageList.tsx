
import React, { useState, useRef, useEffect, useMemo, useCallback, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

// --- Type Definitions ---

export interface Message {
  id: string | number;
  role: 'user' | 'assistant' | 'tool';
  content: React.ReactNode;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  renderMessage: (message: Message, index: number) => React.ReactNode;
  className?: string;
}

export interface VirtualizedMessageListRef {
  scrollToBottom: () => void;
  scrollToIndex: (index: number) => void;
}

// --- Constants ---

const ESTIMATED_HEIGHTS: Record<Message['role'], number> = {
  user: 80,
  assistant: 200,
  tool: 60,
};

const BUFFER_SIZE = 5; // Number of items to render above and below the visible area

// --- Main Component ---

const VirtualizedMessageList = forwardRef<VirtualizedMessageListRef, VirtualizedMessageListProps>((
  { messages, renderMessage, className }, 
  ref
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Height & Position Calculations ---

  const getEstimatedHeight = (role: Message['role']) => ESTIMATED_HEIGHTS[role] || 100;

  const { totalHeight, positionCache } = useMemo(() => {
    let currentHeight = 0;
    const cache = messages.map(msg => {
      const position = currentHeight;
      currentHeight += getEstimatedHeight(msg.role);
      return position;
    });
    return { totalHeight: currentHeight, positionCache: cache };
  }, [messages]);

  // --- Scroll Handling ---

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  // --- Imperative Handle for Scrolling ---

  useImperativeHandle(ref, () => ({
    scrollToBottom: () => {
      if (containerRef.current) {
        containerRef.current.scrollTop = totalHeight - containerRef.current.clientHeight;
      }
    },
    scrollToIndex: (index: number) => {
      if (containerRef.current && index >= 0 && index < positionCache.length) {
        containerRef.current.scrollTop = positionCache[index];
      }
    },
  }));

  // --- Auto-scroll to bottom on new message ---
  useEffect(() => {
    if (containerRef.current) {
        // Heuristic: if we are close to the bottom, auto-scroll.
        const isScrolledToBottom = containerRef.current.scrollHeight - containerRef.current.scrollTop - containerRef.current.clientHeight < 200;
        if (isScrolledToBottom) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }
  }, [messages.length, totalHeight]);


  // --- Visible Item Calculation ---

  const getVisibleRange = useCallback(() => {
    const containerHeight = containerRef.current?.clientHeight || 0;
    
    let startIndex = 0;
    while (startIndex < positionCache.length && positionCache[startIndex] < scrollTop - (BUFFER_SIZE * 100)) {
        startIndex++;
    }

    let endIndex = startIndex;
    while (endIndex < positionCache.length && positionCache[endIndex] < scrollTop + containerHeight + (BUFFER_SIZE * 100)) {
        endIndex++;
    }

    startIndex = Math.max(0, startIndex - BUFFER_SIZE);
    endIndex = Math.min(messages.length - 1, endIndex + BUFFER_SIZE);

    return { startIndex, endIndex };
  }, [scrollTop, positionCache, messages.length]);

  const { startIndex, endIndex } = getVisibleRange();

  const visibleMessages = useMemo(() => {
    const items = [];
    for (let i = startIndex; i <= endIndex; i++) {
      items.push(
        <div
          key={messages[i].id}
          style={{ 
            position: 'absolute',
            top: `${positionCache[i]}px`,
            width: '100%',
            minHeight: `${getEstimatedHeight(messages[i].role)}px`
          }}
        >
          {renderMessage(messages[i], i)}
        </div>
      );
    }
    return items;
  }, [startIndex, endIndex, messages, renderMessage, positionCache]);

  // --- Render ---

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={cn("overflow-y-auto w-full h-full relative", className)}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleMessages}
      </div>
    </div>
  );
});

VirtualizedMessageList.displayName = 'VirtualizedMessageList';

export default VirtualizedMessageList;
