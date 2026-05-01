
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface WorkspaceSplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftTitle: string;
  rightTitle: string;
  defaultSplit?: number; // percentage
  onSplitChange?: (percentage: number) => void;
  orientation?: 'horizontal' | 'vertical';
  storageKey?: string;
}

export const WorkspaceSplitView = ({
  leftPanel,
  rightPanel,
  leftTitle,
  rightTitle,
  defaultSplit = 50,
  onSplitChange,
  orientation: initialOrientation = 'horizontal',
  storageKey = 'workspace-split-view',
}: WorkspaceSplitViewProps) => {
  const getInitialSplit = () => {
    if (typeof window !== 'undefined') {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue) {
        const parsed = parseFloat(storedValue);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 80) {
          return parsed;
        }
      }
    }
    return defaultSplit;
  };

  const [split, setSplit] = useState(getInitialSplit());
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const orientation = isMobile ? 'vertical' : initialOrientation;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(split));
    }
  }, [split, storageKey]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    e.preventDefault();

    requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let newSplit;

      if (orientation === 'horizontal') {
        newSplit = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSplit = ((e.clientY - rect.top) / rect.height) * 100;
      }

      if (newSplit < 20) newSplit = 20;
      if (newSplit > 80) newSplit = 80;

      setSplit(newSplit);
      onSplitChange?.(newSplit);
    });
  }, [isDragging, onSplitChange, orientation]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp, { once: true });
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDoubleClick = () => {
    const newSplit = 50;
    setSplit(newSplit);
    onSplitChange?.(newSplit);
  };

  const toggleLeftCollapse = () => {
    const nextState = !isLeftCollapsed;
    setIsLeftCollapsed(nextState);
    if (nextState && isRightCollapsed) {
      setIsRightCollapsed(false);
    }
  };

  const toggleRightCollapse = () => {
    const nextState = !isRightCollapsed;
    setIsRightCollapsed(nextState);
    if (nextState && isLeftCollapsed) {
      setIsLeftCollapsed(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === '[') {
          e.preventDefault();
          leftPanelRef.current?.focus();
        } else if (e.key === ']') {
          e.preventDefault();
          rightPanelRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const mainSize = orientation === 'horizontal' ? 'width' : 'height';

  const leftPanelStyle = {
    [mainSize]: isLeftCollapsed ? '0%' : isRightCollapsed ? '100%' : `${split}%`,
  };
  const rightPanelStyle = {
    [mainSize]: isRightCollapsed ? '0%' : isLeftCollapsed ? '100%' : `${100 - split}%`,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex h-full w-full bg-background overflow-hidden',
        orientation === 'vertical' ? 'flex-col' : 'flex-row'
      )}
    >
      <AnimatePresence initial={false}>
        {!isLeftCollapsed && (
          <motion.div
            ref={leftPanelRef}
            style={leftPanelStyle}
            initial={{ [mainSize]: isRightCollapsed ? '100%' : `${split}%` }}
            animate={{ [mainSize]: leftPanelStyle[mainSize] }}
            exit={{ [mainSize]: '0%' }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 40 }}
            className={cn('overflow-auto', { 'min-w-0': orientation === 'horizontal', 'min-h-0': orientation === 'vertical' })}
            tabIndex={-1}
          >
            <div className="flex items-center justify-between p-2 border-b border-border h-10 flex-shrink-0">
              <span className="font-semibold text-sm truncate">{leftTitle}</span>
              <Button variant="ghost" size="icon" onClick={toggleRightCollapse} className={cn(isRightCollapsed && 'rotate-180')}>
                {orientation === 'horizontal' ? <ChevronLeft className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4 transform -rotate-90" />}
              </Button>
            </div>
            <div className={cn('h-[calc(100%-2.5rem)] overflow-auto', isLeftCollapsed && 'hidden')}>
              {leftPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isLeftCollapsed && !isRightCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className={cn(
            'flex items-center justify-center group flex-shrink-0',
            orientation === 'horizontal' ? 'cursor-col-resize w-2' : 'cursor-row-resize h-2'
          )}
        >
          <div
            className={cn(
              'bg-border group-hover:bg-primary transition-colors duration-200',
              orientation === 'horizontal' ? 'w-0.5 h-full' : 'h-0.5 w-full'
            )}
          />
        </div>
      )}

      <AnimatePresence initial={false}>
        {!isRightCollapsed && (
          <motion.div
            ref={rightPanelRef}
            style={rightPanelStyle}
            initial={{ [mainSize]: isLeftCollapsed ? '100%' : `${100 - split}%` }}
            animate={{ [mainSize]: rightPanelStyle[mainSize] }}
            exit={{ [mainSize]: '0%' }}
            transition={{ type: 'spring' as const, stiffness: 400, damping: 40 }}
            className={cn('overflow-auto', { 'min-w-0': orientation === 'horizontal', 'min-h-0': orientation === 'vertical' })}
            tabIndex={-1}
          >
            <div className="flex items-center justify-between p-2 border-b border-border h-10 flex-shrink-0">
              <span className="font-semibold text-sm truncate">{rightTitle}</span>
              <Button variant="ghost" size="icon" onClick={toggleLeftCollapse} className={cn(isLeftCollapsed && 'rotate-180')}>
                {orientation === 'horizontal' ? <ChevronRight className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 transform rotate-90" />}
              </Button>
            </div>
            <div className={cn('h-[calc(100%-2.5rem)] overflow-auto', isRightCollapsed && 'hidden')}>
              {rightPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLeftCollapsed && (
        <Button variant="ghost" size="icon" onClick={toggleLeftCollapse} className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-background border">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      {isRightCollapsed && (
        <Button variant="ghost" size="icon" onClick={toggleRightCollapse} className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-background border">
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
