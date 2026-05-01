import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Flag, RotateCcw, SkipForward, Check } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type LabelCategory = {
  id: string;
  name: string;
  color: string;
  shortcut: string;
};

type DataSample = {
  id: number;
  content: string;
};

type Annotation = {
  sampleId: number;
  labelId: string;
  timestamp: number;
};

// --- MOCK DATA ---
const LABEL_CATEGORIES: LabelCategory[] = [
  { id: 'cat1', name: 'Positive', color: 'bg-green-500', shortcut: '1' },
  { id: 'cat2', name: 'Negative', color: 'bg-red-500', shortcut: '2' },
  { id: 'cat3', name: 'Neutral', color: 'bg-yellow-500', shortcut: '3' },
  { id: 'cat4', name: 'Question', color: 'bg-blue-500', shortcut: '4' },
  { id: 'cat5', name: 'Spam', color: 'bg-purple-500', shortcut: '5' },
];

const TEXT_SAMPLES: DataSample[] = [
  { id: 1, content: 'The new update is fantastic! I love the new features.' },
  { id: 2, content: 'I\'m having trouble with the login page, it keeps crashing.' },
  { id: 3, content: 'The service will be down for maintenance tonight from 10 PM to 11 PM.' },
  { id: 4, content: 'Can you tell me where to find the documentation for the API?' },
  { id: 5, content: 'BUY CHEAP WATCHES NOW!!! LIMITED TIME OFFER!' },
  { id: 6, content: 'The performance has improved significantly since the last patch.' },
  { id: 7, content: 'I think the UI could be a bit more intuitive.' },
  { id: 8, content: 'What are the pricing plans for the premium subscription?' },
  { id: 9, content: 'This is an unsolicited commercial advertisement.' },
  { id: 10, content: 'The customer support was very helpful and resolved my issue quickly.' },
];

// --- COMPONENT ---
export default function AnnotationWorkbench() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[]>([]);
  const [flagged, setFlagged] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<number[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const totalSamples = TEXT_SAMPLES.length;
  const currentSample = TEXT_SAMPLES[currentIndex];

  const annotatedCount = useMemo(() => new Set(annotations.map(a => a.sampleId)).size, [annotations]);
  const progress = (annotatedCount / totalSamples) * 100;

  const handleNext = useCallback(() => {
    if (annotatedCount + skipped.length >= totalSamples) {
      setIsCompleted(true);
      return;
    }
    if (currentIndex < totalSamples - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, totalSamples, annotatedCount, skipped.length]);

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleAnnotation = useCallback((labelId: string) => {
    const newAnnotation: Annotation = {
      sampleId: currentSample.id,
      labelId,
      timestamp: Date.now(),
    };
    const updatedAnnotations = annotations.filter(a => a.sampleId !== currentSample.id);
    setAnnotations([...updatedAnnotations, newAnnotation]);
    setHistory(prev => [...prev, newAnnotation]);
    handleNext();
  }, [annotations, currentSample, handleNext]);

  const handleUndo = () => {
    if (history.length > 0) {
      const lastAnnotation = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setAnnotations(annotations.filter(a => a.timestamp !== lastAnnotation.timestamp));
      const sampleIndex = TEXT_SAMPLES.findIndex(s => s.id === lastAnnotation.sampleId);
      if (sampleIndex !== -1) setCurrentIndex(sampleIndex);
    }
  };

  const handleSkip = () => {
    if (!skipped.includes(currentSample.id)) {
      setSkipped(prev => [...prev, currentSample.id]);
    }
    handleNext();
  };

  const handleFlag = () => {
    setFlagged(prev => {
      if (prev.includes(currentSample.id)) {
        return prev.filter(id => id !== currentSample.id);
      } else {
        return [...prev, currentSample.id];
      }
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isCompleted) return;
      const label = LABEL_CATEGORIES.find(l => l.shortcut === event.key);
      if (label) {
        handleAnnotation(label.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAnnotation, isCompleted]);

  const currentAnnotation = useMemo(() => annotations.find(a => a.sampleId === currentSample.id), [annotations, currentSample]);
  const isFlagged = useMemo(() => flagged.includes(currentSample.id), [flagged, currentSample]);
  const interAnnotatorAgreement = 0.87; // Mock data

  const resetState = () => {
    setCurrentIndex(0);
    setAnnotations([]);
    setHistory([]);
    setFlagged([]);
    setSkipped([]);
    setIsCompleted(false);
  }

  if (isCompleted) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center justify-center h-[700px] bg-background text-foreground">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <Card className="text-center p-8 border-border">
            <CardHeader>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: 360 }} transition={{ delay: 0.2, type: 'spring' }}>
                <Check className="w-16 h-16 mx-auto text-green-500" />
              </motion.div>
              <CardTitle className="text-2xl mt-4">Batch Complete!</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You have successfully annotated all items in this batch.</p>
              <div className="mt-6 text-left space-y-2">
                <p><strong>Total Items:</strong> {totalSamples}</p>
                <p><strong>Annotated:</strong> {annotatedCount}</p>
                <p><strong>Skipped:</strong> {skipped.length}</p>
                <p><strong>Flagged:</strong> {flagged.length}</p>
              </div>
              <Button className="mt-8" onClick={resetState}>Start New Batch</Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl mx-auto p-4 bg-background text-foreground font-sans">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Annotation Workbench</CardTitle>
            <div className="text-sm text-muted-foreground">
              Item {currentIndex + 1} of {totalSamples}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Main Content Area */}
              <div className="flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSample.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="bg-muted/30 min-h-[120px]">
                      <CardContent className="p-6">
                        <p className="text-lg leading-relaxed">{currentSample.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Side Panel */}
              <div className="w-full lg:w-1/3">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Labels</h3>
                    <div className="flex flex-col gap-2">
                      {LABEL_CATEGORIES.map((label) => (
                        <motion.div key={label.id} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            variant={currentAnnotation?.labelId === label.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleAnnotation(label.id)}
                            className="w-full justify-start"
                          >
                            <span className={cn('w-3 h-3 rounded-full mr-2', label.color)}></span>
                            {label.name}
                            <span className="ml-auto text-xs text-muted-foreground">{label.shortcut}</span>
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Controls</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handlePrev} disabled={currentIndex === 0}><ArrowLeft className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Previous Item</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={handleNext} disabled={currentIndex >= totalSamples - 1}><ArrowRight className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Next Item</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" onClick={handleUndo} disabled={history.length === 0}><RotateCcw className="h-4 w-4 mr-2" />Undo</Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Undo last annotation</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="secondary" onClick={handleSkip}><SkipForward className="h-4 w-4 mr-2" />Skip</Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Skip this item</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant={isFlagged ? 'destructive' : 'outline'} onClick={handleFlag} className="col-span-2"><Flag className="h-4 w-4 mr-2" />{isFlagged ? 'Unflag' : 'Flag for Review'}</Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{isFlagged ? 'Remove Flag' : 'Flag for Review'}</p></TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Progress</h3>
                    <Progress value={progress} className="w-full" />
                    <div className="text-xs text-muted-foreground mt-1">Completed: {annotatedCount} / {totalSamples}</div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Agreement Score</h3>
                    <div className="flex items-center justify-between text-sm">
                      <span>Inter-Annotator Agreement</span>
                      <span className="font-mono text-lg">{interAnnotatorAgreement.toFixed(2)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">History</h3>
                    <div className="h-24 overflow-y-auto rounded-md border border-border p-2 space-y-1 bg-muted/20">
                      {history.slice().reverse().map((item) => {
                        const label = LABEL_CATEGORIES.find(l => l.id === item.labelId);
                        return (
                          <div key={item.timestamp} className="text-xs p-1 bg-muted/50 rounded-sm flex items-center justify-between">
                            <span>Sample {item.sampleId} &rarr; {label?.name}</span>
                            <span className={cn('w-2 h-2 rounded-full', label?.color)}></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
