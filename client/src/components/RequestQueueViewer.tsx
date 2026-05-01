import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RefreshCw, Server, Clock, AlertCircle, CheckCircle, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';

// Type Definitions
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
type JobPriority = 'critical' | 'high' | 'normal' | 'low';

interface Job {
  id: string;
  name: string;
  status: JobStatus;
  priority: JobPriority;
  retries: number;
  estimatedDuration: number; // in seconds
  elapsedTime: number; // in seconds
}

// Mock Data
const initialJobs: Job[] = [
  { id: 'job-1', name: 'Process video upload', status: 'processing', priority: 'high', retries: 0, estimatedDuration: 120, elapsedTime: 45 },
  { id: 'job-2', name: 'Generate weekly report', status: 'pending', priority: 'normal', retries: 0, estimatedDuration: 300, elapsedTime: 0 },
  { id: 'job-3', name: 'Sync user data', status: 'failed', priority: 'critical', retries: 2, estimatedDuration: 60, elapsedTime: 60 },
  { id: 'job-4', name: 'Send email notifications', status: 'pending', priority: 'low', retries: 0, estimatedDuration: 20, elapsedTime: 0 },
  { id: 'job-5', name: 'Archive old logs', status: 'completed', priority: 'low', retries: 0, estimatedDuration: 180, elapsedTime: 180 },
  { id: 'job-6', name: 'Critical system backup', status: 'pending', priority: 'critical', retries: 0, estimatedDuration: 600, elapsedTime: 0 },
  { id: 'job-7', name: 'Update search index', status: 'processing', priority: 'high', retries: 1, estimatedDuration: 240, elapsedTime: 150 },
  { id: 'job-8', name: 'User authentication cleanup', status: 'completed', priority: 'normal', retries: 0, estimatedDuration: 50, elapsedTime: 50 },
];

const priorityConfig = {
  critical: { color: 'bg-red-500', icon: <AlertCircle className="h-4 w-4" /> },
  high: { color: 'bg-orange-500', icon: <Server className="h-4 w-4" /> },
  normal: { color: 'bg-blue-500', icon: <Hourglass className="h-4 w-4" /> },
  low: { color: 'bg-gray-500', icon: <Clock className="h-4 w-4" /> },
};

const statusConfig = {
    pending: { icon: <Hourglass className="h-4 w-4 text-muted-foreground" />, label: 'Pending' },
    processing: { icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><RefreshCw className="h-4 w-4 text-blue-500" /></motion.div>, label: 'Processing' },
    completed: { icon: <CheckCircle className="h-4 w-4 text-green-500" />, label: 'Completed' },
    failed: { icon: <AlertCircle className="h-4 w-4 text-red-500" />, label: 'Failed' },
};

const RequestQueueViewer: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<JobStatus | 'all'>('all');

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setJobs(prevJobs =>
        prevJobs.map(job => {
          if (job.status === 'processing' && job.elapsedTime < job.estimatedDuration) {
            const newElapsedTime = job.elapsedTime + 1;
            if (newElapsedTime >= job.estimatedDuration) {
              return { ...job, status: 'completed', elapsedTime: job.estimatedDuration };
            }
            return { ...job, elapsedTime: newElapsedTime };
          }
          return job;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleTogglePause = () => setIsPaused(!isPaused);

  const handleRetryJob = (jobId: string) => {
    setJobs(jobs.map(j => j.id === jobId ? { ...j, status: 'pending', retries: j.retries + 1, elapsedTime: 0 } : j));
  };

  const handleRetryAllFailed = () => {
    setJobs(jobs.map(j => j.status === 'failed' ? { ...j, status: 'pending', retries: j.retries + 1, elapsedTime: 0 } : j));
  };

  const filteredJobs = useMemo(() => {
    if (activeTab === 'all') return jobs;
    return jobs.filter(job => job.status === activeTab);
  }, [jobs, activeTab]);

  const queueStats = useMemo(() => {
    return jobs.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        acc.total = (acc.total || 0) + 1;
        return acc;
    }, {} as Record<JobStatus | 'total', number>);
  }, [jobs]);

  const QueueDepthChart = () => (
    <div className="h-20 w-full bg-muted rounded-lg flex items-end">
        {Object.entries(queueStats).filter(([key]) => key !== 'total').map(([status, count]) => (
            <div key={status} style={{ height: `${(count / (queueStats.total || 1)) * 100}%` }} className={cn(
                'w-full', 
                status === 'completed' && 'bg-green-500',
                status === 'processing' && 'bg-blue-500',
                status === 'pending' && 'bg-yellow-500',
                status === 'failed' && 'bg-red-500',
            )}></div>
        ))}
    </div>
  );

  return (
    <Card className="w-full max-w-4xl mx-auto bg-card text-foreground border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Request Queue</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTogglePause} aria-label={isPaused ? 'Resume queue' : 'Pause queue'}>
            {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRetryAllFailed} aria-label="Retry all failed jobs">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Failed
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
            <h3 className="text-sm font-medium mb-2">Queue Depth</h3>
            <QueueDepthChart />
        </div>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All ({queueStats.total || 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({queueStats.pending || 0})</TabsTrigger>
            <TabsTrigger value="processing">Processing ({queueStats.processing || 0})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({queueStats.completed || 0})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({queueStats.failed || 0})</TabsTrigger>
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              <div className="mt-4 space-y-2 h-96 overflow-y-auto pr-2">
                <AnimatePresence>
                  {filteredJobs.map((job) => (
                    <JobItem key={job.id} job={job} onRetry={handleRetryJob} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
};
const JobItem: React.FC<{ job: Job; onRetry: (jobId: string) => void }> = ({ job, onRetry }) => {
  const progress = job.status === 'completed' ? 100 : Math.round((job.elapsedTime / job.estimatedDuration) * 100);
  const priority = priorityConfig[job.priority];
  const status = statusConfig[job.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className="border border-border rounded-lg p-3 flex items-center gap-4"
    >
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
        {status.icon}
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between">
            <span className="font-semibold">{job.name}</span>
            <Badge variant="outline" className="flex items-center gap-1">
                <span className={cn("h-2 w-2 rounded-full", priority.color)}></span>
                {job.priority}
            </Badge>
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {job.status === 'processing' && `Est. time remaining: ${job.estimatedDuration - job.elapsedTime}s`}
          {job.status === 'pending' && `Est. duration: ${job.estimatedDuration}s`}
          {job.status === 'completed' && `Completed in ${job.elapsedTime}s`}
          {job.status === 'failed' && `Failed after ${job.elapsedTime}s. Retries: ${job.retries}`}
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <motion.div
            className={cn(
                "h-1.5 rounded-full",
                job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      {job.status === 'failed' && (
        <Button variant="ghost" size="sm" onClick={() => onRetry(job.id)} aria-label={`Retry job ${job.name}`}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      )}
    </motion.div>
  );
};

export default RequestQueueViewer;