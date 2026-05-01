import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { ChevronDown, RefreshCw, X, FileText, List, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ConversationSummary {
  text: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  generatedAt: number;
  messagesCovered: number;
  totalMessages: number;
}

interface ConversationSummarizerProps {
  summary: ConversationSummary | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onDismiss: () => void;
  isVisible: boolean;
}

const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const variants: Variants = {
    open: { opacity: 1, height: 'auto', marginTop: '16px' },
    closed: { opacity: 0, height: 0, marginTop: '0px' },
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left text-sm font-medium text-foreground"
      >
        <div className="flex items-center">
          {icon}
          <span className="ml-2">{title}</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
        />
      </button>
      <motion.div
        initial={isOpen ? 'open' : 'closed'}
        animate={isOpen ? 'open' : 'closed'}
        variants={variants}
        transition={{ duration: 0.3, ease: 'easeInOut' as const }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>
    </div>
  );
};

const SummarySkeleton: React.FC = () => (
  <Card className="w-full bg-background/80 backdrop-blur-sm border-border/50">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-4 w-64 mt-1" />
    </CardHeader>
    <CardContent className="pt-2">
      <Skeleton className="h-5 w-full mt-4" />
      <Skeleton className="h-5 w-5/6 mt-2" />
      <div className="border-t border-border pt-4 mt-4">
        <Skeleton className="h-5 w-1/4 mb-4" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </CardContent>
  </Card>
);

export const ConversationSummarizer: React.FC<ConversationSummarizerProps> = ({
  summary,
  isGenerating,
  onGenerate,
  onDismiss,
  isVisible,
}) => {
  const relativeTime = useMemo(() => {
    if (!summary) return '';
    const now = Date.now();
    const diffSeconds = Math.round((now - summary.generatedAt) / 1000);
    if (diffSeconds < 60) return 'just now';
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    return `${diffHours}h ago`;
  }, [summary]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' as const }}
          className="w-full px-4 pt-2"
        >
          {isGenerating ? (
            <SummarySkeleton />
          ) : summary && (
            <Card className="w-full bg-background/80 backdrop-blur-sm border-border/50 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-base font-semibold">
                    <Zap className="h-5 w-5 mr-2 text-primary" />
                    Conversation Summary
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onGenerate}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDismiss}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center space-x-2 pt-1">
                  <span>Generated {relativeTime}</span>
                  <span className="text-border">•</span>
                  <span>
                    Using {summary.messagesCovered} of {summary.totalMessages} messages
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pt-0 text-sm">
                <p className="text-foreground/90 leading-relaxed">{summary.text}</p>

                {summary.keyPoints.length > 0 && (
                  <Section title="Key Points" icon={<FileText className="h-4 w-4 text-muted-foreground" />} defaultOpen={true}>
                    <ul className="space-y-2 list-disc list-inside pl-2 text-foreground/80">
                      {summary.keyPoints.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                  </Section>
                )}

                {summary.decisions.length > 0 && (
                  <Section title="Decisions" icon={<List className="h-4 w-4 text-muted-foreground" />} defaultOpen={false}>
                    <ol className="space-y-2 list-decimal list-inside pl-2 text-foreground/80">
                      {summary.decisions.map((decision, i) => <li key={i}>{decision}</li>)}
                    </ol>
                  </Section>
                )}

                {summary.actionItems.length > 0 && (
                  <Section title="Action Items" icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />} defaultOpen={true}>
                    <ul className="space-y-2.5 text-foreground/80">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <div className="h-4 w-4 rounded-sm border border-primary mt-1 mr-3 flex-shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Section>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};