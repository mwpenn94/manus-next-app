
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Play, Pause, Edit, MoreVertical, Clock, History, AlertCircle, CheckCircle, XCircle, Calendar, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- TYPES ---
type JobStatus = 'active' | 'paused' | 'failed';

interface Job {
  id: string;
  name: string;
  cron: string;
  cronDescription: string;
  status: JobStatus;
  nextRun: Date;
  lastRun: Date | null;
  avgDuration: number; // in seconds
  history: number[]; // array of run durations
}

// --- MOCK DATA ---
const mockJobs: Job[] = [
  {
    id: 'job-1',
    name: 'Daily Report Generation',
    cron: '0 0 * * *',
    cronDescription: 'Every day at midnight',
    status: 'active',
    nextRun: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
    lastRun: new Date(new Date().getTime() - 12 * 60 * 60 * 1000),
    avgDuration: 45,
    history: [40, 42, 45, 48, 43, 47, 41],
  },
  {
    id: 'job-2',
    name: 'Cache Invalidation',
    cron: '*/15 * * * *',
    cronDescription: 'Every 15 minutes',
    status: 'paused',
    nextRun: new Date(new Date().getTime() + 15 * 60 * 1000),
    lastRun: new Date(new Date().getTime() - 5 * 60 * 1000),
    avgDuration: 5,
    history: [4, 5, 6, 5, 4, 5, 5],
  },
  {
    id: 'job-3',
    name: 'Database Backup',
    cron: '0 2 * * 1',
    cronDescription: 'Every Monday at 2 AM',
    status: 'active',
    nextRun: new Date(new Date().getTime() + 6 * 24 * 60 * 60 * 1000),
    lastRun: new Date(new Date().getTime() - 24 * 60 * 60 * 1000),
    avgDuration: 320,
    history: [310, 315, 320, 330, 325, 318, 322],
  },
  {
    id: 'job-4',
    name: 'Failed API Sync',
    cron: '*/5 * * * *',
    cronDescription: 'Every 5 minutes',
    status: 'failed',
    nextRun: new Date(new Date().getTime() + 5 * 60 * 1000),
    lastRun: new Date(new Date().getTime() - 2 * 60 * 1000),
    avgDuration: 12,
    history: [10, 11, 12, 15, 13, 10, 11],
  },
];

// --- HELPER COMPONENTS ---
const Sparkline = ({ data, className }: { data: number[]; className?: string }) => {
  const width = 100;
  const height = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={cn('stroke-current', className)} strokeWidth="2" fill="none">
      <polyline points={points} />
    </svg>
  );
};

const StatusBadge = ({ status }: { status: JobStatus }) => {
  const statusConfig = {
    active: { icon: CheckCircle, color: 'text-green-400', label: 'Active' },
    paused: { icon: Pause, color: 'text-yellow-400', label: 'Paused' },
    failed: { icon: XCircle, color: 'text-red-400', label: 'Failed' },
  };
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn('flex items-center gap-1.5 border-none px-0', config.color)}>
      <config.icon className="h-4 w-4" />
      <span>{config.label}</span>
    </Badge>
  );
};

// --- MAIN COMPONENT ---
const ScheduledJobDashboard = () => {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const handleSaveJob = (jobData: Omit<Job, 'id' | 'history' | 'status'>) => {
    if (editingJob) {
      setJobs(jobs.map(j => j.id === editingJob.id ? { ...editingJob, ...jobData } : j));
    } else {
      const newJob: Job = {
        ...jobData,
        id: `job-${Date.now()}`,
        status: 'paused',
        history: [],
        lastRun: null,
      };
      setJobs([newJob, ...jobs]);
    }
    setIsModalOpen(false);
    setEditingJob(null);
  };

  const JobCard = ({ job }: { job: Job }) => (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
      <Card className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors duration-300">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium tracking-tight">{job.name}</CardTitle>
          <StatusBadge status={job.status} />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="text-sm text-muted-foreground">
            <p>{job.cronDescription}</p>
            <p className="font-mono text-xs">{job.cron}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              <span>Next: {job.nextRun.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              <span>Last: {job.lastRun ? job.lastRun.toLocaleString() : 'N/A'}</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-end mb-1">
              <span className="text-xs text-muted-foreground">Exec. History</span>
              <span className="text-xs font-medium">Avg: {job.avgDuration}s</span>
            </div>
            <Sparkline data={job.history} className="text-primary/70" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => { setEditingJob(job); setIsModalOpen(true); }} aria-label="Edit Job">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={job.status === 'active' ? 'Pause Job' : 'Resume Job'}>
            {job.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Zap className="h-4 w-4" />
            Trigger
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 bg-background text-foreground min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter">Scheduled Jobs</h1>
          <p className="text-muted-foreground">Manage and monitor your cron jobs.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingJob(null); setIsModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingJob ? 'Edit Job' : 'Create Job'}</DialogTitle>
            </DialogHeader>
            <JobForm initialData={editingJob} onSave={handleSaveJob} />
          </DialogContent>
        </Dialog>
      </header>
      <AnimatePresence>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>
      </AnimatePresence>
    </div>
  );
};

const JobForm = ({ initialData, onSave }: { initialData: Job | null, onSave: (data: any) => void }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [cron, setCron] = useState(initialData?.cron || '');
  const [cronDescription, setCronDescription] = useState(initialData?.cronDescription || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, cron, cronDescription, nextRun: new Date(), avgDuration: 0 });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="cron" className="text-right">Cron</Label>
          <Input id="cron" value={cron} onChange={e => setCron(e.target.value)} className="col-span-3" placeholder="* * * * *" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="desc" className="text-right">Description</Label>
          <Input id="desc" value={cronDescription} onChange={e => setCronDescription(e.target.value)} className="col-span-3" placeholder="e.g., Every minute" />
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">{initialData ? 'Save Changes' : 'Create Job'}</Button>
      </DialogFooter>
    </form>
  );
};

export default ScheduledJobDashboard;
