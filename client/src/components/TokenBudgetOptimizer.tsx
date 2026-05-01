import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Lock, Sparkles, Trash2, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// --- TYPE DEFINITIONS ---
type SegmentType = 'system' | 'messages' | 'tools' | 'context';

export interface TokenSegment {
  id: string;
  label: string;
  tokens: number;
  type: SegmentType;
  compressible: boolean;
  compressionRatio?: number;
}

export interface TokenBudgetOptimizerProps {
  currentTokens: number;
  maxTokens: number;
  segments: TokenSegment[];
  onCompress: (segmentId: string) => void;
  onRemove: (segmentId: string) => void;
}

// --- HELPERS & CONSTANTS ---
const SEGMENT_COLORS: Record<SegmentType, string> = {
  system: 'bg-blue-500',
  messages: 'bg-green-500',
  tools: 'bg-yellow-500',
  context: 'bg-purple-500',
};

const SEGMENT_TYPE_NAMES: Record<SegmentType, string> = {
    system: 'System Prompt',
    messages: 'Messages',
    tools: 'Tool Calls',
    context: 'Context',
};

const getOptimizationSuggestions = (segments: TokenSegment[], maxTokens: number, currentTokens: number): string[] => {
    const suggestions: string[] = [];
    const sortedCompressible = [...segments]
        .filter(s => s.compressible && s.compressionRatio)
        .sort((a, b) => (b.tokens * (b.compressionRatio || 0)) - (a.tokens * (a.compressionRatio || 0)));

    if (sortedCompressible.length > 0) {
        const bestToCompress = sortedCompressible[0];
        const savings = Math.round(bestToCompress.tokens * (bestToCompress.compressionRatio || 0));
        suggestions.push(`Compress '${bestToCompress.label}' to save ~${savings} tokens.`);
    }

    const removableSegments = segments.filter(s => s.type === 'messages' || s.type === 'context');
    const largestRemovable = [...removableSegments].sort((a, b) => b.tokens - a.tokens)[0];

    if (largestRemovable) {
        suggestions.push(`Remove '${largestRemovable.label}' to free up ${largestRemovable.tokens} tokens.`);
    }

    if (suggestions.length === 0 && currentTokens / maxTokens > 0.8) {
        suggestions.push('Consider shortening system prompts or reducing the number of examples.');
    }

    return suggestions;
};

// --- SUB-COMPONENTS ---
const TokenUsageBar: React.FC<{ segments: TokenSegment[]; maxTokens: number }> = ({ segments, maxTokens }) => {
  const totalTokens = segments.reduce((acc, s) => acc + s.tokens, 0);

  return (
    <div className="w-full">
        <div className="flex justify-between items-center mb-1 text-sm font-medium">
            <span className="text-foreground">Token Usage</span>
            <span className="text-muted-foreground">{totalTokens.toLocaleString()} / {maxTokens.toLocaleString()}</span>
        </div>
      <Progress value={(totalTokens / maxTokens) * 100} className="h-3 w-full bg-muted">
        <AnimatePresence initial={false}>
          {segments.map(segment => {
            const percentage = (segment.tokens / maxTokens) * 100;
            return (
              <motion.div
                key={segment.id}
                className={cn('h-full', SEGMENT_COLORS[segment.type])}
                style={{ width: `${percentage}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                exit={{ width: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' as const }}
              />
            );
          })}
        </AnimatePresence>
      </Progress>
      <div className="flex items-center gap-4 mt-2 text-xs">
        {Object.entries(SEGMENT_TYPE_NAMES).map(([type, name]) => (
            <div key={type} className="flex items-center gap-1.5">
                <div className={cn('w-2.5 h-2.5 rounded-full', SEGMENT_COLORS[type as SegmentType])} />
                <span>{name}</span>
            </div>
        ))}
      </div>
    </div>
  );
};

const SegmentItem: React.FC<{ segment: TokenSegment; totalTokens: number; onCompress: (id: string) => void; onRemove: (id: string) => void; }> = ({ segment, totalTokens, onCompress, onRemove }) => {
    const percentage = totalTokens > 0 ? (segment.tokens / totalTokens) * 100 : 0;
    const estimatedSavings = segment.compressible && segment.compressionRatio ? Math.round(segment.tokens * segment.compressionRatio) : 0;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
                <div className={cn('w-1.5 h-full rounded-full self-stretch', SEGMENT_COLORS[segment.type])} />
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{segment.label}</span>
                        <Badge variant="secondary" className="font-mono">{segment.type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {segment.tokens.toLocaleString()} tokens ({percentage.toFixed(1)}%)
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {segment.compressible ? (
                    <Button variant="outline" size="sm" onClick={() => onCompress(segment.id)}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Compress
                        {estimatedSavings > 0 && <span className="text-xs text-green-400 ml-2">(-{estimatedSavings})</span>}
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm pr-2">
                        <Lock className="w-4 h-4" />
                        <span>Locked</span>
                    </div>
                )}
                {(segment.type === 'messages' || segment.type === 'context') && (
                     <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => onRemove(segment.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

// --- MAIN COMPONENT ---
export const TokenBudgetOptimizer: React.FC<TokenBudgetOptimizerProps> = ({ currentTokens, maxTokens, segments, onCompress, onRemove }) => {
  const usagePercentage = (currentTokens / maxTokens) * 100;

  const sortedSegments = useMemo(() => {
    return [...segments].sort((a, b) => b.tokens - a.tokens);
  }, [segments]);

  const suggestions = useMemo(() => {
      return getOptimizationSuggestions(segments, maxTokens, currentTokens);
  }, [segments, maxTokens, currentTokens]);

  const AlertBanner = () => {
    if (usagePercentage < 80) return null;

    const isCritical = usagePercentage > 95;
    const variant = isCritical ? 'destructive' : 'default';
    const Icon = isCritical ? AlertCircle : Zap;
    const title = isCritical ? 'Critical Token Limit' : 'High Token Usage';
    const message = isCritical
      ? `You've used ${usagePercentage.toFixed(0)}% of your token budget. Further additions may fail.`
      : `You've used ${usagePercentage.toFixed(0)}% of your token budget. Consider optimizing.`

    return (
        <Alert variant={variant} className={isCritical ? "border-destructive/50 text-destructive dark:border-destructive/50" : "border-amber-500/50 text-amber-500 dark:border-amber-500/50"}>
            <Icon className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
            <span>Token Budget Optimizer</span>
            <Badge variant={usagePercentage > 95 ? 'destructive' : usagePercentage > 80 ? 'secondary' : 'outline'}>
                {usagePercentage.toFixed(1)}% Full
            </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <TokenUsageBar segments={segments} maxTokens={maxTokens} />
        
        <AlertBanner />

        {suggestions.length > 0 && (
            <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-primary"/>Optimization Suggestions</h3>
                <div className="space-y-2">
                    {suggestions.map((tip, i) => (
                        <div key={i} className="text-sm p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-start">
                            <CheckCircle className="w-4 h-4 mr-3 mt-0.5 text-primary flex-shrink-0" />
                            <span>{tip}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div>
            <h3 className="text-lg font-semibold mb-2">Context Segments</h3>
            <div className="space-y-2">
                <AnimatePresence>
                {sortedSegments.map(segment => (
                    <motion.div
                        key={segment.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' as const }}
                    >
                        <SegmentItem segment={segment} totalTokens={currentTokens} onCompress={onCompress} onRemove={onRemove} />
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};