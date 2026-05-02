import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit, ChevronDown, ChevronsRight, Clock, Layers, Lightbulb, Zap } from 'lucide-react';

// Type definitions for the reasoning process
type Strategy = 'Decomposing task' | 'Evaluating options' | 'Self-correcting' | 'Synthesizing results' | 'Formulating query' | 'Analyzing data';

interface ReasoningStep {
  id: string;
  strategy: Strategy;
  thought: string;
  details?: string; // Verbose content
  confidence: number; // 0-100
  timeMs: number;
  depth: number;
}

// Mock data for a complex research task
const mockReasoningSteps: ReasoningStep[] = [
  {
    id: 'step-1',
    strategy: 'Decomposing task',
    thought: 'Break down the main research goal into smaller, manageable sub-problems.',
    details: 'The user wants to understand the impact of AI on renewable energy adoption. I need to investigate: 1. AI applications in grid management. 2. AI for predictive maintenance of turbines/panels. 3. AI in optimizing energy trading. 4. Challenges and future trends.',
    confidence: 95,
    timeMs: 150,
    depth: 1,
  },
  {
    id: 'step-2',
    strategy: 'Formulating query',
    thought: 'Formulate initial search queries for academic and industry sources.',
    details: 'Query 1: \'AI applications in smart grid optimization for renewables\'. Query 2: \'predictive maintenance algorithms for wind turbines using machine learning\'. Query 3: \'economic impact of AI on energy markets\'.',
    confidence: 92,
    timeMs: 210,
    depth: 2,
  },
  {
    id: 'step-3',
    strategy: 'Analyzing data',
    thought: 'Synthesize findings from the top 5 research papers on grid management.',
    details: 'Key themes emerging: reinforcement learning for load balancing, improved forecast accuracy by up to 30% using LSTMs, and the importance of decentralized AI agents for grid stability. Contradictory findings on the cost-effectiveness for smaller grids.',
    confidence: 88,
    timeMs: 850,
    depth: 3,
  },
  {
    id: 'step-4',
    strategy: 'Evaluating options',
    thought: 'Assess the relevance of predictive maintenance data against the core research question.',
    details: 'The data on predictive maintenance is extensive. While technically interesting, it\'s a supporting point. I should focus on the broader economic and adoption impact rather than deep technical details of one application.',
    confidence: 90,
    timeMs: 320,
    depth: 3,
  },
  {
    id: 'step-5',
    strategy: 'Self-correcting',
    thought: 'Refocus research from technical implementation to strategic impact.',
    details: 'Initial path was too tech-focused. Pivoting to analyze policy documents and market reports. This aligns better with the user\'s implied goal of understanding the business and strategic landscape.',
    confidence: 98,
    timeMs: 180,
    depth: 2,
  },
  {
    id: 'step-6',
    strategy: 'Synthesizing results',
    thought: 'Construct the final answer by integrating all analyzed information.',
    details: 'Final synthesis: AI significantly accelerates renewable energy adoption by improving efficiency (grid management, maintenance) and economic viability (trading). Key challenges are data privacy and high initial investment. The future trend is towards autonomous, interconnected energy systems.',
    confidence: 96,
    timeMs: 1200,
    depth: 1,
  },
];

const strategyColors: Record<Strategy, string> = {
  'Decomposing task': 'bg-oklch(65.69% 0.15 258.55 / .2) text-oklch(65.69% 0.15 258.55) border-oklch(65.69% 0.15 258.55 / .5)',
  'Formulating query': 'bg-oklch(71.72% 0.17 145.3 / .2) text-oklch(71.72% 0.17 145.3) border-oklch(71.72% 0.17 145.3 / .5)',
  'Analyzing data': 'bg-oklch(77.9% 0.13 50.57 / .2) text-oklch(77.9% 0.13 50.57) border-oklch(77.9% 0.13 50.57 / .5)',
  'Evaluating options': 'bg-oklch(71.94% 0.19 330.32 / .2) text-oklch(71.94% 0.19 330.32) border-oklch(71.94% 0.19 330.32 / .5)',
  'Self-correcting': 'bg-oklch(69.92% 0.22 22.53 / .2) text-oklch(69.92% 0.22 22.53) border-oklch(69.92% 0.22 22.53 / .5)',
  'Synthesizing results': 'bg-oklch(68.75% 0.23 216.56 / .2) text-oklch(68.75% 0.23 216.56) border-oklch(68.75% 0.23 216.56 / .5)',
};

const ThinkingIndicator = () => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-oklch(68.75% 0.23 216.56) opacity-75"></span>
      <span className="relative inline-flex rounded-full h-3 w-3 bg-oklch(68.75% 0.23 216.56 / .8)"></span>
    </span>
    Thinking
    <motion.div
      className="flex gap-0.5"
      initial="start"
      animate="end"
      variants={{
        start: {},
        end: { transition: { staggerChildren: 0.2 } },
      }}
    >
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-1 w-1 bg-muted-foreground rounded-full"
          variants={{
            start: { y: '0%' },
            end: { y: ['0%', '-50%', '0%'] },
          }}
          transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  </div>
);

const ReasoningStepItem: React.FC<{ step: ReasoningStep; isVerbose: boolean; }> = ({ step, isVerbose }) => {
  const [isOpen, setIsOpen] = useState(isVerbose);

  React.useEffect(() => {
    setIsOpen(isVerbose);
  }, [isVerbose]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 95) return 'bg-oklch(71.72% 0.17 145.3)'; // Green
    if (confidence > 85) return 'bg-oklch(77.9% 0.13 50.57)'; // Yellow
    return 'bg-oklch(69.92% 0.22 22.53)'; // Red
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group">
      <CollapsibleTrigger asChild>
        <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
          <div className="flex flex-col items-center gap-1">
            <div className="p-1.5 bg-background rounded-full border">
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')} />
            </div>
            <div className="w-px h-full bg-border group-last:hidden" />
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">{step.thought}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                <span>{step.depth}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5">
              <Badge variant="outline" className={cn('text-xs', strategyColors[step.strategy])}>{step.strategy}</Badge>
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="pl-12 pr-4 pb-4 -mt-2"
        >
          <div className="p-4 border rounded-md bg-background/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">{step.details}</p>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-oklch(77.9% 0.13 50.57)" />
                      <span>Confidence</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Agent\'s confidence in this step</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center gap-2 w-24">
                <Progress value={step.confidence} className={cn('h-1.5', getConfidenceColor(step.confidence))} />
                <span className="font-mono w-8 text-right">{step.confidence}%</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-oklch(68.75% 0.23 216.56)" />
                      <span>Time</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Time taken for this reasoning step</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="font-mono">{step.timeMs}ms</span>
            </div>
          </div>
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default function AgentReasoningDisplay() {
  const [isReasoning, setIsReasoning] = useState(true);
  const [isVerbose, setIsVerbose] = useState(false);
  const [steps, setSteps] = useState<ReasoningStep[]>(mockReasoningSteps.slice(0, 3));

  // Simulate real-time reasoning steps
  React.useEffect(() => {
    setIsReasoning(true);
    const interval = setInterval(() => {
      setSteps(prevSteps => {
        if (prevSteps.length < mockReasoningSteps.length) {
          return [...prevSteps, mockReasoningSteps[prevSteps.length]];
        } else {
          setIsReasoning(false);
          clearInterval(interval);
          return prevSteps;
        }
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const totalReasoningTime = useMemo(() => steps.reduce((acc, step) => acc + step.timeMs, 0), [steps]);
  const maxDepth = useMemo(() => Math.max(0, ...steps.map(s => s.depth)), [steps]);

  const toggleAll = useCallback(() => {
    setIsVerbose(prev => !prev);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto font-sans">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-6 w-6" />
          <CardTitle>Agent Reasoning</CardTitle>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2">
            <label htmlFor="verbose-mode" className="text-sm font-medium text-muted-foreground">Verbose</label>
            <Switch id="verbose-mode" checked={isVerbose} onCheckedChange={toggleAll} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {steps.map((step, index) => (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              >
                <ReasoningStepItem step={step} isVerbose={isVerbose} />
              </motion.div>
            ))}
          </AnimatePresence>

          {isReasoning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-4 p-3"
            >
              <ThinkingIndicator />
            </motion.div>
          )}
        </div>
        
        <Separator className="my-4" />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold flex items-center gap-1.5">
              {isReasoning ? (
                <>
                  <Zap className="h-4 w-4 text-oklch(68.75% 0.23 216.56)" /> Reasoning
                </>
              ) : (
                <>
                  <ChevronsRight className="h-4 w-4 text-oklch(71.72% 0.17 145.3)" /> Executing
                </>
              )}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Total Time</span>
            <span className="font-semibold font-mono">{totalReasoningTime}ms</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground">Max Depth</span>
            <span className="font-semibold font-mono">{maxDepth}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
