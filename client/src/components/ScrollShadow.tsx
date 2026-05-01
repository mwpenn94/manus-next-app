import * as React from 'react';
import { cn } from '@/lib/utils';

interface ScrollShadowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const ScrollShadow = React.forwardRef<HTMLDivElement, ScrollShadowProps>(
  ({ children, className, ...props }, ref) => {
    const [isTopShadowVisible, setTopShadowVisible] = React.useState(false);
    const [isBottomShadowVisible, setBottomShadowVisible] = React.useState(false);

    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const topSentinelRef = React.useRef<HTMLDivElement>(null);
    const bottomSentinelRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const scrollElement = scrollContainerRef.current;
      if (!scrollElement) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement;
        setTopShadowVisible(scrollTop > 0);
        setBottomShadowVisible(scrollTop < scrollHeight - clientHeight);
      };

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.target === topSentinelRef.current) {
              setTopShadowVisible(!entry.isIntersecting);
            } else if (entry.target === bottomSentinelRef.current) {
              setBottomShadowVisible(!entry.isIntersecting);
            }
          });
        },
        { root: scrollElement, threshold: 1.0 }
      );

      if (topSentinelRef.current) observer.observe(topSentinelRef.current);
      if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

      // Initial check
      handleScroll();

      return () => {
        observer.disconnect();
      };
    }, []);

    return (
      <div ref={ref} className={cn('relative overflow-hidden', className)} {...props}>
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background/80 to-transparent z-10 pointer-events-none transition-opacity duration-300',
            isTopShadowVisible ? 'opacity-100' : 'opacity-0'
          )}
        />
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto h-full"
        >
          <div ref={topSentinelRef} className="h-px" />
          {children}
          <div ref={bottomSentinelRef} className="h-px" />
        </div>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/80 to-transparent z-10 pointer-events-none transition-opacity duration-300',
            isBottomShadowVisible ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>
    );
  }
);

ScrollShadow.displayName = 'ScrollShadow';

export default ScrollShadow;
