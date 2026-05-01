import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, CheckCircle2, XCircle, Loader, Circle, GitCommit, GitBranch, User, Package, Clock, RefreshCw } from 'lucide-react';

// Type definitions
type Status = 'success' | 'fail' | 'running' | 'pending';

interface Job {
  id: string;
  name: string;
  status: Status;
  duration: string;
}

interface Stage {
  id: string;
  name: string;
  status: Status;
  jobs: Job[];
  duration: string;
}

interface Pipeline {
  id: string;
  status: Status;
  trigger: {
    commit: string;
    branch: string;
    author: string;
  };
  stages: Stage[];
  artifacts: Array<{ name: string; url: string }>;
}

// Mock Data
const initialPipeline: Pipeline = {
  id: 'pipe_12345',
  status: 'fail',
  trigger: {
    commit: 'a1b2c3d4e5f6',
    branch: 'feature/new-cicd-view',
    author: 'Alex Johnson',
  },
  artifacts: [
    { name: 'webapp-build.zip', url: '#' },
    { name: 'test-report.xml', url: '#' },
  ],
  stages: [
    { id: 'stage_build', name: 'Build', status: 'success', duration: '2m 30s', jobs: [
        { id: 'job_1', name: 'Install Dependencies', status: 'success', duration: '1m 10s' },
        { id: 'job_2', name: 'Compile TypeScript', status: 'success', duration: '1m 20s' },
    ] },
    { id: 'stage_lint', name: 'Lint', status: 'success', duration: '1m 15s', jobs: [
        { id: 'job_3', name: 'ESLint Check', status: 'success', duration: '45s' },
        { id: 'job_4', name: 'Style & Type Check', status: 'success', duration: '30s' },
    ] },
    { id: 'stage_test', name: 'Test', status: 'fail', duration: '5m 45s', jobs: [
        { id: 'job_5', name: 'Unit Tests (Jest)', status: 'success', duration: '2m 0s' },
        { id: 'job_6', name: 'Integration Tests', status: 'fail', duration: '3m 45s' },
        { id: 'job_7', name: 'E2E Tests (Playwright)', status: 'pending', duration: '-' },
    ] },
    { id: 'stage_deploy', name: 'Deploy', status: 'pending', duration: '-', jobs: [
        { id: 'job_8', name: 'Deploy to Staging Env', status: 'pending', duration: '-' },
    ] },
    { id: 'stage_smoke', name: 'Smoke Test', status: 'pending', duration: '-', jobs: [
        { id: 'job_9', name: 'Run Smoke Tests on Staging', status: 'pending', duration: '-' },
    ] },
  ],
};

const statusConfig: { [key in Status]: { Icon: React.ComponentType<{ className: string }>; colorClasses: string; bg: string; } } = {
  success: { Icon: CheckCircle2, colorClasses: 'text-green-500', bg: 'bg-green-500' },
  fail: { Icon: XCircle, colorClasses: 'text-red-500', bg: 'bg-red-500' },
  running: { Icon: Loader, colorClasses: 'text-blue-500', bg: 'bg-blue-500' },
  pending: { Icon: Circle, colorClasses: 'text-muted-foreground', bg: 'bg-gray-500' },
};

const PipelineHeader: React.FC<{ pipeline: Pipeline }> = ({ pipeline }) => (
  <Card className="mb-6 bg-card/60 backdrop-blur-xl border-border/50">
    <CardHeader>
      <div className="flex flex-wrap justify-between items-center gap-2">
        <CardTitle className="text-xl">Pipeline Run #12345</CardTitle>
        <Badge variant={pipeline.status === 'fail' ? 'destructive' : 'default'} className={cn('capitalize', statusConfig[pipeline.status].bg, 'text-white')}>{pipeline.status}</Badge>
      </div>
    </CardHeader>
    <CardContent className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-2">
        <div className="flex items-center space-x-2 truncate"><GitCommit className="h-4 w-4 flex-shrink-0" /> <span className="truncate font-mono text-xs" title={pipeline.trigger.commit}>commit {pipeline.trigger.commit}</span></div>
        <div className="flex items-center space-x-2 truncate"><GitBranch className="h-4 w-4 flex-shrink-0" /> <span className="truncate font-mono text-xs" title={pipeline.trigger.branch}>{pipeline.trigger.branch}</span></div>
        <div className="flex items-center space-x-2 truncate"><User className="h-4 w-4 flex-shrink-0" /> <span className="truncate" title={pipeline.trigger.author}>{pipeline.trigger.author}</span></div>
        <div className="flex items-center space-x-2 truncate"><Package className="h-4 w-4 flex-shrink-0" /> <a href="#" className="hover:underline">{pipeline.artifacts.length} Artifacts</a></div>
    </CardContent>
  </Card>
);

const JobRow: React.FC<{ job: Job }> = ({ job }) => {
    const { Icon, colorClasses } = statusConfig[job.status];
    return (
        <div className="flex items-center justify-between py-2 px-2 hover:bg-muted/50 rounded-md transition-colors">
            <div className="flex items-center space-x-3">
                <Icon className={cn('h-4 w-4', colorClasses, { 'animate-spin': job.status === 'running' })} />
                <span className="text-sm text-foreground">{job.name}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center space-x-1.5"><Clock className="h-3 w-3" /><span>{job.duration}</span></div>
        </div>
    );
};

const StageCard: React.FC<{ stage: Stage; onRetry: (stageId: string) => void; isExpanded: boolean; onToggle: (stageId: string) => void; }> = ({ stage, onRetry, isExpanded, onToggle }) => {
    const { Icon, colorClasses, bg } = statusConfig[stage.status];

    return (
        <motion.div layout="position" className={cn('rounded-lg border bg-card/80 transition-colors', isExpanded ? 'border-primary/30' : 'border-border/60')}>
            <Card className="w-72 flex-shrink-0 bg-transparent border-none">
                <CardHeader className="cursor-pointer select-none" onClick={() => onToggle(stage.id)}>
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center space-x-3">
                            <Icon className={cn('h-6 w-6', colorClasses, { 'animate-spin': stage.status === 'running' })} />
                            <span className="text-foreground">{stage.name}</span>
                        </CardTitle>
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}><ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" /></motion.div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center space-x-1.5 pt-1"><Clock className="h-3 w-3" /><span>{stage.duration}</span></div>
                </CardHeader>
                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.section
                            key="content"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                        >
                            <CardContent className="pt-0 pb-3">
                                <Separator className="mb-2 bg-border/50" />
                                <div className="space-y-1">
                                    {stage.jobs.map(job => <JobRow key={job.id} job={job} />)}
                                </div>
                                {stage.status === 'fail' && (
                                    <Button variant="outline" size="sm" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); onRetry(stage.id); }}>
                                        <RefreshCw className="h-4 w-4 mr-2" /> Retry Failed Jobs
                                    </Button>
                                )}
                            </CardContent>
                        </motion.section>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
};

const StageConnector: React.FC = () => (
    <div className="w-8 flex-shrink-0 flex items-center justify-center">
        <div className="w-full h-px bg-border" />
    </div>
);

export default function CICDPipelineView() {
  const [pipeline, setPipeline] = useState<Pipeline>(initialPipeline);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set(['stage_test']));

  const handleToggleStage = useCallback((stageId: string) => {
    setExpandedStages(prev => {
        const newSet = new Set(prev);
        if (newSet.has(stageId)) {
            newSet.delete(stageId);
        } else {
            newSet.add(stageId);
        }
        return newSet;
    });
  }, []);

  const handleRetryStage = useCallback((stageId: string) => {
    setPipeline(prev => {
        const newStages = prev.stages.map(s => {
            if (s.id === stageId) {
                const newJobs = s.jobs.map(j => j.status === 'fail' ? { ...j, status: 'running' as Status, duration: '-' } : j);
                return { ...s, status: 'running' as Status, jobs: newJobs, duration: '...' };
            }
            return s;
        });
        return { ...prev, stages: newStages };
    });
  }, []);

  const overallStatus = useMemo(() => {
    if (pipeline.stages.some(s => s.status === 'fail')) return 'fail';
    if (pipeline.stages.some(s => s.status === 'running')) return 'running';
    if (pipeline.stages.every(s => s.status === 'success')) return 'success';
    return 'pending';
  }, [pipeline.stages]);

  useEffect(() => {
    const runningStage = pipeline.stages.find(s => s.status === 'running');
    if (runningStage) {
        const timer = setTimeout(() => {
            setPipeline(prev => {
                const newStages = prev.stages.map(s => {
                    if (s.id === runningStage.id) {
                        const allJobsPass = Math.random() > 0.2; // 80% chance of success
                        return {
                            ...s,
                            status: (allJobsPass ? 'success' : 'fail') as Status,
                            duration: allJobsPass ? '3m 15s' : '4m 05s',
                            jobs: s.jobs.map(j => ({ ...j, status: (allJobsPass ? 'success' : j.status === 'running' ? 'fail' : j.status) as Status, duration: '...' }))
                        };
                    }
                    return s;
                });
                return { ...prev, stages: newStages };
            });
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [pipeline]);

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-4 lg:p-8 font-sans w-full">
        <PipelineHeader pipeline={{...pipeline, status: overallStatus}} />
        <div className="mb-6 px-1">
            <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="flex h-full">
                    {pipeline.stages.map((stage) => (
                        <Tooltip key={stage.id}>
                            <TooltipTrigger asChild>
                                <motion.div layout className={cn('h-full transition-colors duration-500', statusConfig[stage.status].bg)} style={{ flexBasis: `${100 / pipeline.stages.length}%` }} />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{stage.name}: <span className="capitalize">{stage.status}</span></p>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </div>
        <div className="flex items-start overflow-x-auto pb-4 -m-4 p-4">
          {pipeline.stages.map((stage, index) => (
            <React.Fragment key={stage.id}>
              <StageCard 
                stage={stage} 
                onRetry={handleRetryStage} 
                isExpanded={expandedStages.has(stage.id)}
                onToggle={handleToggleStage}
              />
              {index < pipeline.stages.length - 1 && <StageConnector />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
