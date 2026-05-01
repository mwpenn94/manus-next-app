import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Trash2, Copy, ShieldAlert, CircleX, Wrench, Search, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Type Definitions
type ExperimentStatus = 'running' | 'completed' | 'failed';

interface Metrics {
  accuracy: number;
  f1: number;
  auc: number;
}

interface Hyperparameters {
  learning_rate: number;
  batch_size: number;
  epochs: number;
  optimizer: string;
}

interface Experiment {
  id: string;
  status: ExperimentStatus;
  metrics: Metrics;
  hyperparameters: Hyperparameters;
  duration: string;
  tags: string[];
  notes: string;
}

// Mock Data
const mockExperiments: Experiment[] = Array.from({ length: 15 }, (_, i) => ({
  id: `run-20240501-${i + 1}`,
  status: (['completed', 'running', 'failed'] as ExperimentStatus[])[i % 3],
  metrics: {
    accuracy: parseFloat((0.85 + Math.random() * 0.14).toFixed(4)),
    f1: parseFloat((0.82 + Math.random() * 0.15).toFixed(4)),
    auc: parseFloat((0.90 + Math.random() * 0.09).toFixed(4)),
  },
  hyperparameters: {
    learning_rate: [0.001, 0.01, 0.005][i % 3],
    batch_size: [32, 64, 128][i % 3],
    epochs: [50, 100, 200][i % 3],
    optimizer: ['Adam', 'SGD', 'RMSprop'][i % 3],
  },
  duration: `${Math.floor(Math.random() * 120) + 5}m ${Math.floor(Math.random() * 60)}s`,
  tags: [['classification', 'nlp', 'resnet'], ['regression', 'vision'], ['gan', 'unsupervised']][i % 3].concat(`exp-${i}`),
  notes: ['Initial baseline', 'Increased learning rate', 'Testing new architecture', ''][i % 4],
}));

const MetricChart = ({ experiments }: { experiments: Experiment[] }) => {
    if (experiments.length === 0) return null;

    const metrics = ['accuracy', 'f1', 'auc'];
    const maxMetricValue = 1;

    return (
        <Card className="bg-muted/50">
            <CardHeader>
                <CardTitle>Metric Comparison</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-4">
                    {metrics.map(metric => (
                        <div key={metric}>
                            <h3 className="text-center font-semibold text-muted-foreground mb-4 capitalize">{metric}</h3>
                            <div className="flex justify-around items-end h-48">
                                {experiments.map((exp, index) => (
                                    <TooltipProvider key={exp.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <motion.div
                                                    className="w-8 rounded-t-lg cursor-pointer"
                                                    style={{ backgroundColor: `hsl(${index * 360 / experiments.length}, 70%, 50%)` }}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${exp.metrics[metric as keyof Metrics] / maxMetricValue * 100}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>{exp.id}: {exp.metrics[metric as keyof Metrics]}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default function ExperimentTracker() {
    const [experiments, setExperiments] = useState<Experiment[]>(mockExperiments);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tagFilter, setTagFilter] = useState<string>('');
    const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        experiments.forEach(exp => exp.tags.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [experiments]);

    const filteredExperiments = useMemo(() => {
        return experiments
            .filter(exp => statusFilter === 'all' || exp.status === statusFilter)
            .filter(exp => tagFilter === '' || exp.tags.includes(tagFilter));
    }, [experiments, statusFilter, tagFilter]);

    const selectedExperiments = useMemo(() => {
        return experiments.filter(exp => selectedIds.has(exp.id));
    }, [experiments, selectedIds]);

    const handleSelect = useCallback((id: string, isSelected: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(id);
            } else {
                newSet.delete(id);
            }
            return newSet;
        });
    }, []);

    const handleDelete = useCallback(() => {
        if (deleteCandidate) {
            setExperiments(prev => prev.filter(exp => exp.id !== deleteCandidate));
            setSelectedIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(deleteCandidate);
                return newSet;
            });
            setDeleteCandidate(null);
        }
    }, [deleteCandidate]);

    const getStatusBadge = (status: ExperimentStatus) => {
        switch (status) {
            case 'completed': return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
            case 'running': return <Badge variant="outline" className="text-blue-400 border-blue-500/30">Running</Badge>;
            case 'failed': return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
        }
    };

    return (
        <div className="bg-background text-foreground min-h-screen p-4 md:p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">ML Experiment Tracker</h1>
                <p className="text-muted-foreground">Monitor, compare, and manage your machine learning runs.</p>
            </header>

            <AnimatePresence>
                {selectedExperiments.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="mb-8">
                        <MetricChart experiments={selectedExperiments} />
                    </motion.div>
                )}
            </AnimatePresence>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <CardTitle>Experiments</CardTitle>
                        <div className="flex gap-2 flex-wrap">
                            <Select onValueChange={setStatusFilter} defaultValue="all">
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="running">Running</SelectItem>
                                    <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-[200px] justify-between">
                                        {tagFilter || "Filter by tag"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <Input placeholder="Search tags..." className="m-1 w-[calc(100%-0.5rem)]" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagFilter(e.target.value)} />
                                    <div className="max-h-60 overflow-auto">
                                    {allTags.map(tag => (
                                        <Button key={tag} variant="ghost" className="w-full justify-start" onClick={() => setTagFilter(tag)}>{tag}</Button>
                                    ))}
                                    </div>
                                     <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => setTagFilter("")}>Clear Filter</Button>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Compare</TableHead>
                                    <TableHead>Run ID</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Accuracy</TableHead>
                                    <TableHead>F1 Score</TableHead>
                                    <TableHead>AUC</TableHead>
                                    <TableHead>Hyperparameters</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence>
                                    {filteredExperiments.map(exp => (
                                        <motion.tr key={exp.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hover:bg-muted/50">
                                            <TableCell><Checkbox checked={selectedIds.has(exp.id)} onCheckedChange={(checked) => handleSelect(exp.id, !!checked)} /></TableCell>
                                            <TableCell className="font-mono text-sm">{exp.id}</TableCell>
                                            <TableCell>{getStatusBadge(exp.status)}</TableCell>
                                            <TableCell>{exp.metrics.accuracy}</TableCell>
                                            <TableCell>{exp.metrics.f1}</TableCell>
                                            <TableCell>{exp.metrics.auc}</TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="text-xs text-muted-foreground cursor-pointer">View Params</div>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="font-mono text-xs">
                                                            {Object.entries(exp.hyperparameters).map(([key, value]) => (
                                                                <div key={key}><strong>{key}:</strong> {value}</div>
                                                            ))}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell>{exp.duration}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{exp.notes}</TableCell>
                                            <TableCell className="text-right">
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild><Button variant="ghost" size="icon"><Copy className="h-4 w-4" /></Button></TooltipTrigger>
                                                        <TooltipContent><p>Reproduce Run</p></TooltipContent>
                                                    </Tooltip>
                                                    <Button variant="ghost" size="icon" onClick={() => setDeleteCandidate(exp.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                </TooltipProvider>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-destructive"/>Are you sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete the experiment run <span className="font-mono font-bold">{deleteCandidate}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteCandidate(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
