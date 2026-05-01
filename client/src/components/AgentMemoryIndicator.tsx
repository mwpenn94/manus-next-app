import React from 'react';
import { Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * A component that indicates which memories/knowledge were recalled for context.
 * It displays a brain icon with a count of recalled items. On hover or click,
 * it expands to show a list of the recalled memory keys with their relevance scores.
 */
interface AgentMemoryIndicatorProps {
  /**
   * An array of recalled items, each with a key and a relevance score (0-1).
   * If null or empty, the component will not render.
   */
  recalledItems: { key: string; relevance: number }[] | null;
  /**
   * Optional className to be applied to the root element.
   */
  className?: string;
}

const AgentMemoryIndicator: React.FC<AgentMemoryIndicatorProps> = ({ recalledItems, className }) => {
  if (!recalledItems || recalledItems.length === 0) {
    return null;
  }

  const sortedItems = [...recalledItems].sort((a, b) => b.relevance - a.relevance);

  const getRelevanceColor = (relevance: number) => {
    if (relevance > 0.75) return 'bg-green-500';
    if (relevance > 0.5) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div
          className={cn(
            'relative flex items-center gap-2 cursor-pointer rounded-full bg-card/50 hover:bg-card/80 p-2 border border-border transition-colors',
            className
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Brain className="h-5 w-5 text-muted-foreground" />
          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {recalledItems.length}
          </div>
        </motion.div>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-card border-border text-foreground">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Recalled Memories</h4>
            <p className="text-sm text-muted-foreground">
              Contextual information retrieved for this turn.
            </p>
          </div>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {sortedItems.map((item) => (
              <div key={item.key} className="grid grid-cols-[1fr_auto] items-center gap-2 text-sm">
                <span className="truncate" title={item.key}>{item.key}</span>
                <div className="w-20 h-2 rounded-full bg-muted">
                  <motion.div
                    className={cn('h-2 rounded-full', getRelevanceColor(item.relevance))}
                    style={{ width: `${item.relevance * 100}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.relevance * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AgentMemoryIndicator;
