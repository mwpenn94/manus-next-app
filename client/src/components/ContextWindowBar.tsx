
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Helper for compact number formatting
const formatTokenCount = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

interface ContextWindowBarProps {
  usedTokens: number;
  maxTokens: number;
  reservedTokens?: number;
  breakdown?: {
    system: number;
    messages: number;
    tools: number;
    context: number;
  };
  className?: string;
}

export const ContextWindowBar = ({ 
  usedTokens, 
  maxTokens, 
  reservedTokens = 0, 
  breakdown, 
  className 
}: ContextWindowBarProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const usagePercent = useMemo(() => (usedTokens / maxTokens) * 100, [usedTokens, maxTokens]);
  const reservedPercent = useMemo(() => (reservedTokens / maxTokens) * 100, [reservedTokens, maxTokens]);
  const totalPercent = usagePercent + reservedPercent;

  const isOverflow = usagePercent > 100;
  const isWarning = usagePercent > 90 && !isOverflow;

  const getBarColor = () => {
    if (isOverflow) return 'bg-red-500';
    if (usagePercent > 90) return 'bg-red-500';
    if (usagePercent > 75) return 'bg-orange-500';
    if (usagePercent > 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const barColor = getBarColor();

  const renderBreakdown = () => {
    if (!breakdown) return null;
    return (
      <div className="mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
        <h4 className="font-semibold mb-1 text-foreground">Breakdown</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>System prompt:</span><span className="text-right">{formatTokenCount(breakdown.system)}</span>
          <span>Messages:</span><span className="text-right">{formatTokenCount(breakdown.messages)}</span>
          <span>Tool results:</span><span className="text-right">{formatTokenCount(breakdown.tools)}</span>
          <span>Connector context:</span><span className="text-right">{formatTokenCount(breakdown.context)}</span>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger 
          asChild
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={cn('relative w-full h-1 bg-background/50', className)}>
            <AnimatePresence>
              <motion.div 
                className={cn('h-full', barColor, { 'animate-pulse': isWarning && !isHovered })}
                initial={{ width: '0%' }}
                animate={{ width: `${isOverflow ? 100 : usagePercent}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }}
              />
            </AnimatePresence>
            {reservedTokens > 0 && !isOverflow && (
              <motion.div
                className="absolute top-0 h-full bg-primary/20"
                style={{ 
                  left: `${usagePercent}%`, 
                  backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)',
                }}
                initial={{ width: '0%' }}
                animate={{ width: `${reservedPercent}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const, delay: 0.1 }}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs bg-card border-border shadow-lg">
          <div className="text-sm font-medium">
            {isOverflow ? (
              <div className='text-red-500 font-bold'>Context limit exceeded</div>
            ) : (
              <div>
                <span>Used </span>
                <span className="font-bold text-foreground">{formatTokenCount(usedTokens)}</span>
                <span> / </span>
                <span className="font-bold text-foreground">{formatTokenCount(maxTokens)}</span>
                <span> tokens </span>
                <span className={cn('font-bold', isWarning ? 'text-red-500' : 'text-foreground')}>({usagePercent.toFixed(1)}%)</span>
              </div>
            )}
          </div>
          {renderBreakdown()}
          {reservedTokens > 0 && !isOverflow && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">+ {formatTokenCount(reservedTokens)}</span> tokens reserved for response.
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
