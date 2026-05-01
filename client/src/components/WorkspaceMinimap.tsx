
/**
 * @file WorkspaceMinimap.tsx
 * @description A React component that displays a miniaturized preview of content, 
 * similar to a code editor's minimap, allowing for quick navigation.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WorkspaceMinimapProps {
  /** The full string content to be displayed in the minimap. */
  content: string;
  /** The range of lines currently visible in the main view. */
  visibleRange: { start: number; end: number };
  /** The total number of lines in the content. */
  totalLines: number;
  /** Callback function triggered on click to navigate to a specific line. */
  onNavigate: (line: number) => void;
  /** Optional additional CSS classes for the container. */
  className?: string;
}

const LINE_HEIGHT_PX = 2; // Each line is represented by a 2px tall block
const MAX_HEIGHT_PX = 200;

/**
 * A miniaturized preview of content for quick navigation.
 */
const WorkspaceMinimap: React.FC<WorkspaceMinimapProps> = ({ 
  content,
  visibleRange,
  totalLines,
  onNavigate,
  className 
}) => {
  const minimapRef = React.useRef<HTMLDivElement>(null);

  const handleNavigation = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapRef.current) return;

    const rect = minimapRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    
    const contentHeight = totalLines * LINE_HEIGHT_PX;
    const visibleContentHeight = Math.min(contentHeight, MAX_HEIGHT_PX);

    const clickedLine = Math.round((clickY / visibleContentHeight) * totalLines);
    onNavigate(Math.max(0, Math.min(totalLines, clickedLine)));
  };

  const lines = React.useMemo(() => content.split('\n'), [content]);

  const visibleAreaTop = (visibleRange.start / totalLines) * 100;
  const visibleAreaHeight = ((visibleRange.end - visibleRange.start) / totalLines) * 100;

  return (
    <div
      ref={minimapRef}
      className={cn(
        'relative w-16 bg-card border border-border rounded-md overflow-hidden select-none',
        'cursor-pointer group',
        className
      )}
      style={{ maxHeight: `${MAX_HEIGHT_PX}px` }}
      onClick={handleNavigation}
    >
      <div className="absolute inset-0 font-mono text-muted-foreground/20 whitespace-pre" style={{ lineHeight: `${LINE_HEIGHT_PX}px`, fontSize: '2px' }}>
        {lines.map((line, index) => (
          <div key={index} className="w-full overflow-hidden" style={{ height: `${LINE_HEIGHT_PX}px` }}>{line}</div>
        ))}
      </div>
      
      <motion.div
        className="absolute left-0 w-full bg-primary/20 border-y border-primary/50"
        style={{
          top: `${visibleAreaTop}%`,
          height: `${visibleAreaHeight}%`,
        }}
        animate={{
          top: `${visibleAreaTop}%`,
          height: `${visibleAreaHeight}%`,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />

      <div className="absolute top-1 right-1 text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
        1
      </div>
      <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
        {totalLines}
      </div>
    </div>
  );
};

export default WorkspaceMinimap;
