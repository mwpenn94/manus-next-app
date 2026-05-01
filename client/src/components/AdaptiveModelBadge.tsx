
/**
 * AdaptiveModelBadge.tsx
 * 
 * A compact, inline React component to display which AI model was selected for a response and why.
 * It features a colored dot indicating the model's tier (fast, balanced, powerful),
 * the model name, and a tooltip on hover that reveals the routing reason and latency.
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Define model tiers for color-coding
const MODEL_TIERS: { [key: string]: 'fast' | 'balanced' | 'powerful' } = {
  'gpt-4o': 'powerful',
  'gpt-4.1-mini': 'fast',
  'gemini-2.5-flash': 'fast',
  'gemini-2.5-pro': 'powerful',
  'claude-3.5-sonnet': 'powerful',
  'claude-3-opus': 'powerful',
  'claude-3-sonnet': 'balanced',
  'claude-3-haiku': 'fast',
};

const TIER_COLORS = {
  fast: 'bg-green-500',
  balanced: 'bg-blue-500',
  powerful: 'bg-purple-500',
};

interface AdaptiveModelBadgeProps {
  /** The name of the AI model that was used. */
  model: string;
  /** The reason why this model was selected by the router. */
  reason?: string;
  /** The inference latency in milliseconds. */
  latency?: number;
  /** Optional additional CSS classes. */
  className?: string;
}

const AdaptiveModelBadge: React.FC<AdaptiveModelBadgeProps> = ({ model, reason, latency, className }) => {
  const tier = MODEL_TIERS[model.toLowerCase()] || 'balanced';
  const tierColor = TIER_COLORS[tier];

  const formattedModelName = model
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-2 py-0.5 text-xs font-medium text-muted-foreground backdrop-blur-sm',
              className
            )}
          >
            <motion.div
              className={cn('h-1.5 w-1.5 rounded-full', tierColor)}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            />
            <span>{formattedModelName}</span>
          </motion.div>
        </TooltipTrigger>
        {(reason || latency) && (
          <TooltipContent side="top" align="center" className="max-w-xs">
            <div className="flex flex-col gap-1.5 p-1 text-center">
              {reason && <p className="text-sm font-medium text-foreground">{reason}</p>}
              {latency !== undefined && (
                <p className="text-xs text-muted-foreground">Latency: {latency}ms</p>
              )}
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};

export default AdaptiveModelBadge;
