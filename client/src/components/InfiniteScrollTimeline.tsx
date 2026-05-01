import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, Calendar as CalendarIcon, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// --- TYPES ---
type ItemStatus = 'completed' | 'in-progress' | 'failed';

interface TimelineItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  status: ItemStatus;
}

// --- MOCK DATA ---
const generateMockData = (count: number): TimelineItem[] => {
  const data: TimelineItem[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 4 * 60 * 60 * 1000); // 4 hours apart
    data.push({
      id: `item-${i}`,
      title: `Task ${i + 1}`,
      description: `This is the description for task number ${i + 1}. It involved several steps and was processed automatically.`,
      timestamp,
      status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in-progress' : 'failed',
    });
  }
  return data;
};

const ALL_ITEMS = generateMockData(100);

// --- HELPERS ---
const formatDateGroup = (date: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const statusColors: Record<ItemStatus, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// --- COMPONENT ---
const InfiniteScrollTimeline: React.FC = () => {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadMoreItems = useCallback(() => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setTimeout(() => {
      const nextItems = ALL_ITEMS.slice(items.length, items.length + 20);
      setItems(prev => [...prev, ...nextItems]);
      setHasMore(ALL_ITEMS.length > items.length + 20);
      setIsLoading(false);
    }, 1000);
  }, [isLoading, hasMore, items.length]);

  useEffect(() => {
    loadMoreItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    
    if (scrollTop > 300) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }

    if (scrollHeight - scrollTop - clientHeight < 200) {
      loadMoreItems();
    }
  }, [loadMoreItems]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const groupedItems = useMemo(() => {
    return items.reduce((acc, item) => {
      const group = formatDateGroup(item.timestamp);
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    }, {} as Record<string, TimelineItem[]>);
  }, [items]);

  return (
    <div className="relative h-[700px] w-full max-w-3xl mx-auto bg-background rounded-lg border border-border flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <h1 className="text-lg font-semibold text-foreground">Agent Activity</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">{items.length} / {ALL_ITEMS.length}</Badge>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                Jump to Date
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Jump to Date</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <input type="date" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" aria-label="Jump to date" />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4">
        <AnimatePresence>
          {Object.entries(groupedItems).map(([group, groupItems]) => (
            <section key={group} className="mb-8">
              <motion.h2 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-0"
              >
                {group}
              </motion.h2>
              <div className="space-y-4">
                {groupItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <Card className="bg-card/50 hover:bg-card/80 transition-colors duration-200">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                          <Badge variant="outline" className={cn('text-xs', statusColors[item.status])}>
                            {item.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {item.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </section>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">End of timeline.</p>
        )}
      </div>

      <AnimatePresence>
        {showScrollTop && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-6 right-6"
          >
            <Button size="icon" onClick={scrollToTop} aria-label="Scroll to top">
              <ChevronUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfiniteScrollTimeline;