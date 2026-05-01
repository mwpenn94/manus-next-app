import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { diffWords } from 'diff';
import { X, ArrowRightLeft, ThumbsUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface Task {
  id: string;
  title: string;
  output: string;
  duration: number;
  tokens: number;
  cost: number;
  model: string;
}

interface TaskComparisonViewProps {
  taskA: Task;
  taskB: Task;
  onSwap: () => void;
  onClose: () => void;
  onPrefer: (taskId: string) => void;
}

const MetricDisplay = ({ label, valueA, valueB, unit, higherIsBetter = false }: {
  label: string;
  valueA: number;
  valueB: number;
  unit: string;
  higherIsBetter?: boolean;
}) => {
  const aIsWinner = higherIsBetter ? valueA > valueB : valueA < valueB;
  const bIsWinner = higherIsBetter ? valueB > valueA : valueB < valueA;
  const isTie = valueA === valueB;

  return (
    <div className="text-center px-2">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="grid grid-cols-2 items-baseline gap-2 mt-1">
          <span className={cn("text-lg font-bold truncate", !isTie && aIsWinner ? "text-green-400" : "text-foreground")}>
            {label === 'Cost' ? `$${valueA.toFixed(4)}` : valueA.toLocaleString()}
          </span>
          <span className={cn("text-lg font-bold truncate", !isTie && bIsWinner ? "text-green-400" : "text-foreground")}>
            {label === 'Cost' ? `$${valueB.toFixed(4)}` : valueB.toLocaleString()}
          </span>
      </div>
       <div className="text-xs text-muted-foreground mt-1">{unit}</div>
    </div>
  );
};

const DiffPart = ({ part, side }: { part: { value: string; added?: boolean; removed?: boolean }, side: 'A' | 'B' }) => {
    const baseClasses = "px-0.5 rounded";
    if (part.added) {
        return side === 'B' ? <span className={cn(baseClasses, "bg-green-500/20")}>{part.value}</span> : null;
    }
    if (part.removed) {
        return side === 'A' ? <span className={cn(baseClasses, "bg-red-500/20")}>{part.value}</span> : null;
    }
    return <span>{part.value}</span>;
};

export const TaskComparisonView: React.FC<TaskComparisonViewProps> = ({ taskA, taskB, onSwap, onClose, onPrefer }) => {
  const [showDiff, setShowDiff] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);

  const scrollARef = useRef<HTMLDivElement>(null);
  const scrollBRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<'A' | 'B' | null>(null);

  const handleScroll = (scrollingSide: 'A' | 'B') => {
    if (!syncScroll || isScrollingRef.current) return;

    isScrollingRef.current = scrollingSide;

    const sourceEl = scrollingSide === 'A' ? scrollARef.current : scrollBRef.current;
    const targetEl = scrollingSide === 'A' ? scrollBRef.current : scrollARef.current;

    if (sourceEl && targetEl) {
        const { scrollTop, scrollHeight, clientHeight } = sourceEl;
        if (scrollHeight > clientHeight) {
            const scrollRatio = scrollTop / (scrollHeight - clientHeight);
            targetEl.scrollTop = scrollRatio * (targetEl.scrollHeight - targetEl.clientHeight);
        }
    }
    
    // Use requestAnimationFrame to reset the lock after the browser has painted the frame
    requestAnimationFrame(() => {
        isScrollingRef.current = null;
    });
  };

  const differences = showDiff ? diffWords(taskA.output, taskB.output) : [];
  const wordCountA = taskA.output.split(/\s+/).filter(Boolean).length;
  const wordCountB = taskB.output.split(/\s+/).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeInOut" as const }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-7xl h-[90vh] flex flex-col">
        <CardHeader className="flex-shrink-0 pr-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Task Comparison</CardTitle>
              <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Switch id="diff-switch" checked={showDiff} onCheckedChange={setShowDiff} />
                    <Label htmlFor="diff-switch">Highlight Diffs</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch id="sync-scroll-switch" checked={syncScroll} onCheckedChange={setSyncScroll} />
                    <Label htmlFor="sync-scroll-switch">Sync Scroll</Label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={onSwap} aria-label="Swap Sides">
                <ArrowRightLeft className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Comparison">
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-3 divide-x divide-border">
            <MetricDisplay label="Duration" valueA={taskA.duration} valueB={taskB.duration} unit="ms" />
            <MetricDisplay label="Tokens" valueA={taskA.tokens} valueB={taskB.tokens} unit="tokens" />
            <MetricDisplay label="Cost" valueA={taskA.cost} valueB={taskB.cost} unit="USD" />
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden grid grid-cols-2 gap-x-4">
            <AnimatePresence initial={false}>
                <motion.div layout key={taskA.id} className="flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <h3 className="font-semibold text-lg truncate pr-2" title={taskA.title}>{taskA.title}</h3>
                        <Badge variant="outline">{taskA.model}</Badge>
                    </div>
                    <Card className="flex-grow flex flex-col overflow-hidden">
                        <ScrollArea className="flex-grow" onScroll={() => handleScroll('A')}>
                            <div ref={scrollARef} className="p-4 h-full font-mono text-sm whitespace-pre-wrap break-words">
                                {showDiff 
                                    ? differences.map((part, index) => <DiffPart key={index} part={part} side='A' />)
                                    : taskA.output
                                }
                            </div>
                        </ScrollArea>
                        <Separator />
                        <div className="flex-shrink-0 p-2 flex justify-between items-center text-sm text-muted-foreground">
                            <span>{wordCountA.toLocaleString()} words</span>
                            <Button size="sm" variant="outline" onClick={() => onPrefer(taskA.id)}>
                                <ThumbsUp className="h-4 w-4 mr-2" /> Prefer A
                            </Button>
                        </div>
                    </Card>
                </motion.div>
                <motion.div layout key={taskB.id} className="flex flex-col h-full overflow-hidden">
                    <div className="flex justify-between items-center mb-2 flex-shrink-0">
                        <h3 className="font-semibold text-lg truncate pr-2" title={taskB.title}>{taskB.title}</h3>
                        <Badge variant="outline">{taskB.model}</Badge>
                    </div>
                    <Card className="flex-grow flex flex-col overflow-hidden">
                        <ScrollArea className="flex-grow" onScroll={() => handleScroll('B')}>
                            <div ref={scrollBRef} className="p-4 h-full font-mono text-sm whitespace-pre-wrap break-words">
                                {showDiff 
                                    ? differences.map((part, index) => <DiffPart key={index} part={part} side='B' />)
                                    : taskB.output
                                }
                            </div>
                        </ScrollArea>
                        <Separator />
                        <div className="flex-shrink-0 p-2 flex justify-between items-center text-sm text-muted-foreground">
                            <span>{wordCountB.toLocaleString()} words</span>
                            <Button size="sm" variant="outline" onClick={() => onPrefer(taskB.id)}>
                                <ThumbsUp className="h-4 w-4 mr-2" /> Prefer B
                            </Button>
                        </div>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};
