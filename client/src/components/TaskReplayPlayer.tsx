import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Rewind, FastForward, Bot, User, Terminal, FileCode, Globe, Server, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';

// Type definitions
type StepAction = 'prompt' | 'browse' | 'read' | 'write' | 'exec' | 'deploy' | 'error' | 'finish';

interface TaskStep {
  id: number;
  action: StepAction;
  title: string;
  content: string | React.ReactNode;
  duration: number; // in milliseconds
}

// Mock Data
const mockTaskSteps: TaskStep[] = [
  { id: 1, action: 'prompt', title: 'User Prompt', content: 'Build a simple weather app.', duration: 1000 },
  { id: 2, action: 'browse', title: 'Browsing for weather APIs', content: 'Navigating to weatherapi.com', duration: 2000 },
  { id: 3, action: 'read', title: 'Reading API documentation', content: 'Scraping key endpoints and parameters from the documentation page.', duration: 3000 },
  { id: 4, action: 'write', title: 'Creating API client', content: 'Writing `api.ts` to handle weather data fetching.', duration: 4000 },
  { id: 5, action: 'exec', title: 'Installing dependencies', content: 'Running `npm install axios`', duration: 2500 },
  { id: 6, action: 'error', title: 'Execution Error', content: '`axios` not found. Forgot to save package.json.', duration: 1500 },
  { id: 7, action: 'write', title: 'Fixing dependency issue', content: 'Adding `axios` to package.json and running `npm install` again.', duration: 3500 },
  { id: 8, action: 'write', title: 'Building UI component', content: 'Creating `WeatherCard.tsx` to display the weather information.', duration: 5000 },
  { id: 9, action: 'exec', title: 'Running tests', content: 'Executing `npm test` to verify component behavior.', duration: 3000 },
  { id: 10, action: 'deploy', title: 'Deploying to Vercel', content: 'Starting deployment process for the application.', duration: 4500 },
  { id: 11, action: 'browse', title: 'Verifying deployment', content: 'Checking the deployed URL for functionality.', duration: 2000 },
  { id: 12, action: 'finish', title: 'Task Completed', content: 'The weather app has been successfully built and deployed.', duration: 1000 },
];

const ActionIcon = ({ action, isActive }: { action: StepAction; isActive: boolean }) => {
  const iconColor = isActive ? 'text-blue-600' : 'text-slate-500 dark:text-slate-400';
  const icons: Record<StepAction, React.ReactNode> = {
    prompt: <User className={cn('w-4 h-4', iconColor)} />,
    browse: <Globe className={cn('w-4 h-4', iconColor)} />,
    read: <FileCode className={cn('w-4 h-4', iconColor)} />,
    write: <FileCode className={cn('w-4 h-4', iconColor)} />,
    exec: <Terminal className={cn('w-4 h-4', iconColor)} />,
    deploy: <Server className={cn('w-4 h-4', iconColor)} />,
    error: <AlertTriangle className={cn('w-4 h-4', 'text-red-500')} />,
    finish: <Zap className={cn('w-4 h-4', 'text-green-500')} />,
  };
  return <div className={cn('flex items-center justify-center w-8 h-8 rounded-full transition-colors', isActive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-slate-800')}>{icons[action]}</div>;
};

export default function TaskReplayPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [elapsedTime, setElapsedTime] = useState(0);

  const totalDuration = useMemo(() => mockTaskSteps.reduce((acc, step) => acc + step.duration, 0), []);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const messageStreamRef = useRef<HTMLDivElement>(null);

  const resetToStep = (stepIndex: number) => {
    const newElapsedTime = mockTaskSteps.slice(0, stepIndex).reduce((acc, step) => acc + step.duration, 0);
    setElapsedTime(newElapsedTime);
    setCurrentStepIndex(stepIndex);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentStepIndex === mockTaskSteps.length - 1) {
        resetToStep(0);
      }
      setIsPlaying(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleScrub = (value: number[]) => {
    const newElapsedTime = value[0];
    setElapsedTime(newElapsedTime);

    let accumulatedDuration = 0;
    for (let i = 0; i < mockTaskSteps.length; i++) {
      accumulatedDuration += mockTaskSteps[i].duration;
      if (accumulatedDuration >= newElapsedTime) {
        if (i !== currentStepIndex) {
          setCurrentStepIndex(i);
        }
        break;
      }
    }
  };

  const handleSkip = (direction: 'forward' | 'backward') => {
    const newIndex = direction === 'forward' ? currentStepIndex + 1 : currentStepIndex - 1;
    if (newIndex >= 0 && newIndex < mockTaskSteps.length) {
      resetToStep(newIndex);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const nextTime = prev + (100 * playbackSpeed);
          if (nextTime >= totalDuration) {
            setCurrentStepIndex(mockTaskSteps.length - 1);
            setIsPlaying(false);
            return totalDuration;
          }

          let accumulatedDuration = 0;
          for (let i = 0; i < mockTaskSteps.length; i++) {
            accumulatedDuration += mockTaskSteps[i].duration;
            if (accumulatedDuration > nextTime) {
              if (i !== currentStepIndex) {
                setCurrentStepIndex(i);
              }
              break;
            }
          }
          return nextTime;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, totalDuration, currentStepIndex]);

  useEffect(() => {
    if (timelineRef.current) {
      const activeStepElement = timelineRef.current.children[currentStepIndex] as HTMLDivElement;
      if (activeStepElement) {
        activeStepElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentStepIndex]);

  useEffect(() => {
    if (messageStreamRef.current) {
        const scrollable = messageStreamRef.current.children[0] as HTMLDivElement;
        if(scrollable) {
            scrollable.scrollTop = scrollable.scrollHeight;
        }
    }
  }, [currentStepIndex]);

  const currentStep = mockTaskSteps[currentStepIndex];

  return (
    <Card className="w-full max-w-5xl mx-auto my-8 shadow-2xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-sans" >
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100">Task Replay</CardTitle>
        </div>
        <Badge variant="outline" className="font-mono text-sm">Step {currentStepIndex + 1} of {mockTaskSteps.length}</Badge>
      </CardHeader>
      <CardContent className="p-0 flex flex-col md:flex-row h-[70vh] max-h-[800px]">
        <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Timeline</h3>
          </div>
          <ScrollArea className="flex-grow">
            <div ref={timelineRef} className="p-2 space-y-1">
              {mockTaskSteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  onClick={() => resetToStep(index)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    currentStepIndex === index
                      ? "bg-blue-100 dark:bg-blue-900/50"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  )}
                  animate={{ scale: currentStepIndex === index ? 1.03 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <ActionIcon action={step.action} isActive={currentStepIndex === index} />
                  <div className="flex-grow overflow-hidden">
                    <p className={cn(
                      "font-medium text-sm truncate",
                      currentStepIndex === index ? "text-blue-800 dark:text-blue-200" : "text-slate-700 dark:text-slate-300"
                    )}>{step.title}</p>
                  </div>
                  {index < currentStepIndex && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }}>
                       <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="w-full md:w-2/3 flex flex-col bg-white dark:bg-slate-950">
          <ScrollArea className="flex-grow p-6" ref={messageStreamRef}>
            <AnimatePresence initial={false}>
              {mockTaskSteps.slice(0, currentStepIndex + 1).map((step, index) => (
                <motion.div
                  key={step.id}
                  className="flex items-start gap-4 mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  layout
                >
                  <ActionIcon action={step.action} isActive={true} />
                  <div className="flex-grow pt-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{step.title}</p>
                    <div className="text-slate-600 dark:text-slate-400 mt-1 prose prose-sm dark:prose-invert max-w-none">
                      {typeof step.content === 'string' ? <p>{step.content}</p> : step.content}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </ScrollArea>
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 sm:gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleSkip('backward')} disabled={currentStepIndex === 0}>
                      <Rewind className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Previous Step</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={handlePlayPause} className="w-10 h-10 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>{isPlaying ? 'Pause' : 'Play'}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleSkip('forward')} disabled={currentStepIndex === mockTaskSteps.length - 1}>
                      <FastForward className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Next Step</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-grow flex items-center gap-2">
                 <Slider
                    min={0}
                    max={totalDuration}
                    step={1}
                    value={[elapsedTime]}
                    onValueChange={handleScrub}
                    className="w-full"
                  />
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 4].map(speed => (
                  <Button
                    key={speed}
                    variant={playbackSpeed === speed ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => handleSpeedChange(speed)}
                    className="w-10 sm:w-12 text-xs sm:text-sm"
                  >
                    {speed}x
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}