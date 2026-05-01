
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, RefreshCw, AlertTriangle, ShieldCheck, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ItemStatus = 'success' | 'failed' | 'skipped' | 'pending';

interface BatchItem {
  id: string;
  status: ItemStatus;
  error?: string;
}

const TOTAL_ITEMS = 247;

const generateInitialItems = (): BatchItem[] =>
  Array.from({ length: TOTAL_ITEMS }, (_, i) => ({
    id: `pass_232_conv_${i + 1}`,
    status: 'pending',
  }));

const BatchOperationProgress: React.FC = () => {
  const [items, setItems] = useState<BatchItem[]>(generateInitialItems);
  const [status, setStatus] = useState<'running' | 'paused' | 'completed' | 'canceled'>('running');
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [processedCount, setProcessedCount] = useState(0);

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        if (item.status === 'success') acc.success++;
        else if (item.status === 'failed') acc.failed++;
        else if (item.status === 'skipped') acc.skipped++;
        return acc;
      },
      { success: 0, failed: 0, skipped: 0 }
    );
  }, [items]);

  const progress = (processedCount / TOTAL_ITEMS) * 100;
  const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
  const throughput = processedCount > 0 ? processedCount / elapsedTime : 0;
  const etr = throughput > 0 ? (TOTAL_ITEMS - processedCount) / throughput : Infinity;

  useEffect(() => {
    if (status !== 'running' || processedCount >= TOTAL_ITEMS) {
      if (processedCount >= TOTAL_ITEMS) setStatus('completed');
      return;
    }

    const interval = setInterval(() => {
      setItems(prevItems => {
        const newItems = [...prevItems];
        let processedInTick = 0;
        const itemsToProcess = Math.floor(Math.random() * 5) + 3; // Process 3-7 items per tick

        for (let i = 0; i < newItems.length && processedInTick < itemsToProcess; i++) {
          if (newItems[i].status === 'pending') {
            const random = Math.random();
            if (random < 0.9) {
              newItems[i].status = 'success';
            } else if (random < 0.98) {
              newItems[i].status = 'failed';
              newItems[i].error = `Convergence failed: Epsilon too high`;
            } else {
              newItems[i].status = 'skipped';
            }
            processedInTick++;
          }
        }
        setProcessedCount(prev => prev + processedInTick);
        return newItems;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [status, processedCount]);

  const handlePauseResume = () => {
    setStatus(prev => (prev === 'running' ? 'paused' : 'running'));
  };

  const handleCancel = () => {
    setStatus('canceled');
  };

  const handleRetryFailed = useCallback(() => {
    const failedIds = new Set(items.filter(i => i.status === 'failed').map(i => i.id));
    setItems(prev => prev.map(item => (failedIds.has(item.id) ? { ...item, status: 'pending', error: undefined } : item)));
    setProcessedCount(counts.success + counts.skipped);
    setStatus('running');
  }, [items, counts]);

  const getStatusIcon = (itemStatus: ItemStatus) => {
    switch (itemStatus) {
      case 'success': return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'skipped': return <SkipForward className="h-4 w-4 text-yellow-500" />;
      default: return <div className="h-4 w-4 rounded-full bg-muted-foreground/20 animate-pulse" />;
    }
  };

  const failedItems = items.filter(item => item.status === 'failed');

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border-border/50 shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Batch 9: Convergence Pass</CardTitle>
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {status === 'running' && (
              <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Button variant="ghost" size="icon" onClick={handlePauseResume} aria-label="Pause Operation">
                  <Pause className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
            {status === 'paused' && (
              <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                <Button variant="ghost" size="icon" onClick={handlePauseResume} aria-label="Resume Operation">
                  <Play className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          {(status === 'running' || status === 'paused') && (
            <Button variant="ghost" size="icon" onClick={handleCancel} aria-label="Cancel Operation" className="text-red-500 hover:text-red-400">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
          <span>{processedCount} / {TOTAL_ITEMS} items</span>
          <div className="flex items-center gap-4">
            <span>{throughput.toFixed(1)} items/sec</span>
            <span>ETR: {isFinite(etr) ? `${Math.ceil(etr)}s` : '...'}</span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
          <motion.div
            className="bg-primary h-2.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'circOut' }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          <Badge variant="outline" className="border-green-500/50 text-green-400">Success: {counts.success}</Badge>
          <Badge variant="outline" className="border-red-500/50 text-red-400">Failed: {counts.failed}</Badge>
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">Skipped: {counts.skipped}</Badge>
        </div>
        <div className="mt-4 h-48 overflow-y-auto rounded-lg border border-border/50 p-2 bg-background/50 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs py-0.5">
                <span className="font-mono text-muted-foreground truncate">{item.id}</span>
                {getStatusIcon(item.status)}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <AnimatePresence>
        {(counts.failed > 0 || status === 'completed' || status === 'canceled') && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <CardFooter className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                {status === 'completed' && <ShieldCheck className="h-5 w-5 text-green-500" />} 
                {status === 'canceled' && <X className="h-5 w-5 text-red-500" />}
                <p className="text-sm font-medium">
                  {status === 'completed' ? `Operation completed with ${counts.failed} failure(s).` : status === 'canceled' ? 'Operation canceled.' : `${counts.failed} item(s) failed.`}
                </p>
              </div>
              {counts.failed > 0 && status !== 'canceled' && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">View Errors</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Error Summary</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-muted-foreground">Found {failedItems.length} errors.</p>
                      <Button size="sm" onClick={handleRetryFailed}><RefreshCw className="mr-2 h-4 w-4"/>Retry Failed</Button>
                    </div>
                    <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent pr-2">
                      {failedItems.map(item => (
                        <div key={item.id} className="text-sm p-2 mb-2 bg-muted/50 rounded-md border border-destructive/20">
                          <p className="font-mono text-foreground">{item.id}</p>
                          <p className="text-red-400">{item.error}</p>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default BatchOperationProgress;
