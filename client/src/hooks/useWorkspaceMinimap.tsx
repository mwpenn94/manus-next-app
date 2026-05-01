
import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface UseWorkspaceMinimapProps {
  containerRef: React.RefObject<HTMLElement>;
  lineHeight?: number;
}

interface MinimapState {
  totalLines: number;
  startLine: number;
  endLine: number;
  visibleLines: number;
  handleMinimapClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function useWorkspaceMinimap({
  containerRef,
  lineHeight = 20, // Assuming a default line height of 20px
}: UseWorkspaceMinimapProps): MinimapState {
  const [dimensions, setDimensions] = React.useState({
    totalLines: 0,
    startLine: 0,
    endLine: 0,
    visibleLines: 0,
  });

  const calculateDimensions = React.useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const totalLines = Math.floor(scrollHeight / lineHeight);
      const visibleLines = Math.floor(clientHeight / lineHeight);
      const startLine = Math.floor(scrollTop / lineHeight);
      const endLine = startLine + visibleLines;

      setDimensions({
        totalLines,
        startLine,
        endLine,
        visibleLines,
      });
    }
  }, [containerRef, lineHeight]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    calculateDimensions();

    const scrollListener = () => calculateDimensions();
    container.addEventListener('scroll', scrollListener);

    const resizeObserver = new ResizeObserver(calculateDimensions);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', scrollListener);
      resizeObserver.unobserve(container);
    };
  }, [calculateDimensions, containerRef]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current && dimensions.totalLines > 0) {
      const minimapRect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - minimapRect.top;
      const clickYPercent = clickY / minimapRect.height;
      const newScrollTop = clickYPercent * containerRef.current.scrollHeight;
      containerRef.current.scrollTo({ top: newScrollTop, behavior: 'smooth' });
    }
  };

  return { ...dimensions, handleMinimapClick };
}

interface MinimapOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  containerRef: React.RefObject<HTMLElement>;
}

export const MinimapOverlay = React.forwardRef<HTMLDivElement, MinimapOverlayProps>(
  ({ containerRef, className, ...props }, ref) => {
    const {
      totalLines,
      startLine,
      visibleLines,
      handleMinimapClick,
    } = useWorkspaceMinimap({ containerRef });

    if (totalLines === 0) {
      return null;
    }

    const viewportHeightPercent = (visibleLines / totalLines) * 100;
    const viewportTopPercent = (startLine / totalLines) * 100;

    return (
      <div
        ref={ref}
        className={cn(
          'absolute top-4 right-4 w-16 h-32 bg-card/50 backdrop-blur-sm rounded-md overflow-hidden cursor-pointer',
          className
        )}
        onClick={handleMinimapClick}
        {...props}
      >
        <div className="relative w-full h-full">
          {/* Placeholder for code representation - could be improved with actual code rendering */}
          <div className="absolute inset-0 bg-transparent" />

          {/* Viewport Indicator */}
          <motion.div
            className="absolute w-full bg-primary/20"
            style={{
              height: `${viewportHeightPercent}%`,
              top: `${viewportTopPercent}%`,
            }}
            initial={false}
            animate={{ 
              top: `${viewportTopPercent}%`,
              height: `${viewportHeightPercent}%`
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 50 }}
          />
        </div>
      </div>
    );
  }
);

MinimapOverlay.displayName = 'MinimapOverlay';
