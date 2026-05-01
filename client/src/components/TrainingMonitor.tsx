import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Pause, Square, AlertTriangle, Cpu, MemoryStick, Hourglass, Target, LineChart, BookOpen, Zap } from 'lucide-react';

// --- TYPE DEFINITIONS ---
type EpochData = { epoch: number; trainLoss: number; valLoss: number; accuracy: number; };
type Hyperparameters = { [key: string]: string | number; };
type TrainingStatus = 'running' | 'paused' | 'stopped' | 'completed';

// --- MOCK DATA GENERATION ---
const generateMockData = (epochs: number): EpochData[] => {
  const data: EpochData[] = [];
  let lastTrainLoss = 1.5;
  let lastValLoss = 1.6;
  let lastAccuracy = 0.4;
  for (let i = 1; i <= epochs; i++) {
    const progress = i / epochs;
    const trainLossDelta = (Math.random() * 0.1 + 0.05) * (1 - progress * 0.8);
    const valLossDelta = (Math.random() * 0.08 + 0.04) * (1 - progress * 0.7);
    const accuracyGain = (Math.random() * 0.02 + 0.01) * (1 - lastAccuracy);
    lastTrainLoss = Math.max(0.1, lastTrainLoss - trainLossDelta);
    lastValLoss = Math.max(0.15, lastValLoss - valLossDelta);
    lastAccuracy = Math.min(0.98, lastAccuracy + accuracyGain);
    data.push({ epoch: i, trainLoss: lastTrainLoss, valLoss: lastValLoss, accuracy: lastAccuracy });
  }
  return data;
};

const mockHyperparameters: Hyperparameters = {
  'Learning Rate': '1e-4', 'Batch Size': 64, 'Optimizer': 'AdamW',
  'Architecture': 'ResNet-50', 'Dataset Size': '1.2M images', 'Scheduler': 'CosineAnnealingLR'
};

const TOTAL_EPOCHS = 50;

// --- SUB-COMPONENTS ---
const MetricCard = ({ title, value, icon, footer }: { title: string; value: string; icon: React.ReactNode; footer?: string | React.ReactNode }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {footer && <div className="text-xs text-muted-foreground">{footer}</div>}
    </CardContent>
  </Card>
);

const LossCurveChart = ({ data, width, height }: { data: EpochData[], width: number, height: number }) => {
  const [hoveredEpoch, setHoveredEpoch] = useState<EpochData | null>(null);
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const xScale = (epoch: number) => padding.left + (epoch / TOTAL_EPOCHS) * innerWidth;
  const yScale = (loss: number) => padding.top + innerHeight - (loss / 1.6) * innerHeight;

  const trainPath = useMemo(() => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.epoch)} ${yScale(d.trainLoss)}`).join(' '), [data, width, height]);
  const valPath = useMemo(() => data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(d.epoch)} ${yScale(d.valLoss)}`).join(' '), [data, width, height]);

  return (
    <div className="relative">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => setHoveredEpoch(null)}>
        {/* Axes */}
        <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + innerHeight} className="stroke-border" />
        <line x1={padding.left} y1={padding.top + innerHeight} x2={padding.left + innerWidth} y2={padding.top + innerHeight} className="stroke-border" />
        {/* Paths */}
        <motion.path d={trainPath} fill="none" className="stroke-blue-500" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeInOut' }} />
        <motion.path d={valPath} fill="none" className="stroke-amber-500" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: 'easeInOut', delay: 0.2 }} />
        {/* Data points and hover targets */}
        {data.map(d => (
          <circle key={`val-${d.epoch}`} cx={xScale(d.epoch)} cy={yScale(d.valLoss)} r="8" fill="transparent" onMouseEnter={() => setHoveredEpoch(d)} />
        ))}
        {data.map(d => (
          <circle key={`train-${d.epoch}`} cx={xScale(d.epoch)} cy={yScale(d.trainLoss)} r="8" fill="transparent" onMouseEnter={() => setHoveredEpoch(d)} />
        ))}
      </svg>
      <AnimatePresence>
        {hoveredEpoch && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className="absolute p-2 text-xs rounded-md shadow-lg pointer-events-none bg-popover text-popover-foreground"
            style={{ left: xScale(hoveredEpoch.epoch) + 5, top: yScale(hoveredEpoch.valLoss) - 40 }}
          >
            <div>Epoch: {hoveredEpoch.epoch}</div>
            <div>Train: {hoveredEpoch.trainLoss.toFixed(3)}</div>
            <div>Val: {hoveredEpoch.valLoss.toFixed(3)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GpuGauge = ({ utilization }: { utilization: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (utilization / 100) * circumference;
  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-full h-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="stroke-muted" strokeWidth="10" fill="transparent" />
        <motion.circle
          cx="50" cy="50" r={radius} className="stroke-blue-500" strokeWidth="10" fill="transparent"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5 }} transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{utilization}%</span>
        <span className="text-xs text-muted-foreground">GPU</span>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function TrainingMonitor() {
  const [status, setStatus] = useState<TrainingStatus>('running');
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [trainingData, setTrainingData] = useState<EpochData[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [gpuUtil, setGpuUtil] = useState(85);
  const [memUsage, setMemUsage] = useState(60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const allEpochData = useMemo(() => generateMockData(TOTAL_EPOCHS), []);

  const appendLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]);
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (status === 'running') {
      if (currentEpoch === 0 && trainingData.length === 0) appendLog(`Training started. Target: ${TOTAL_EPOCHS} epochs.`);
      intervalRef.current = setInterval(() => {
        setCurrentEpoch(prevEpoch => {
          if (prevEpoch >= TOTAL_EPOCHS) {
            if(intervalRef.current) clearInterval(intervalRef.current);
            setStatus('completed');
            appendLog('Training completed successfully.');
            return TOTAL_EPOCHS;
          }
          const nextEpoch = prevEpoch + 1;
          const newDataPoint = allEpochData[nextEpoch - 1];
          setTrainingData(prevData => [...prevData, newDataPoint]);
          appendLog(`Epoch ${newDataPoint.epoch}/${TOTAL_EPOCHS} - Train Loss: ${newDataPoint.trainLoss.toFixed(4)}, Val Loss: ${newDataPoint.valLoss.toFixed(4)}, Acc: ${newDataPoint.accuracy.toFixed(3)}`);
          
          setGpuUtil(80 + Math.floor(Math.random() * 15));
          setMemUsage(55 + Math.floor(Math.random() * 10));

          if (nextEpoch > 20 && allEpochData[nextEpoch - 1].valLoss > allEpochData[nextEpoch - 6].valLoss) {
            if(intervalRef.current) clearInterval(intervalRef.current);
            setStatus('stopped');
            appendLog('Early stopping triggered: validation loss not improving.');
            return nextEpoch;
          }

          return nextEpoch;
        });
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [status, allEpochData, appendLog, currentEpoch, trainingData.length]);

  const handleControl = (newStatus: TrainingStatus) => {
    setStatus(newStatus);
    appendLog(`Training ${newStatus} by user.`);
  };

  const currentMetrics = trainingData[trainingData.length - 1] || { accuracy: 0, trainLoss: 0, valLoss: 0 };
  const eta = status === 'running' ? ((TOTAL_EPOCHS - currentEpoch) * 2) / 60 : 0;

  return (
    <TooltipProvider>
      <div className="bg-background text-foreground p-4 sm:p-6 lg:p-8 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Training Monitor</h1>
              <p className="text-muted-foreground">Live monitoring of ResNet-50 on ImageNet-1.2M</p>
            </div>
            <div className="flex items-center gap-2">
              {status === 'running' && <Button variant="outline" onClick={() => handleControl('paused')}><Pause className="mr-2 h-4 w-4" /> Pause</Button>}
              {status === 'paused' && <Button variant="outline" onClick={() => handleControl('running')}><Play className="mr-2 h-4 w-4" /> Resume</Button>}
              {(status === 'running' || status === 'paused') && <Button variant="destructive" onClick={() => handleControl('stopped')}><Square className="mr-2 h-4 w-4" /> Stop</Button>}
              <AnimatePresence>
                {status === 'stopped' && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}><Badge variant="destructive" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Early Stopping</Badge></motion.div>}
                {status === 'completed' && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}><Badge className="bg-green-600 text-white flex items-center gap-2"><Target className="h-4 w-4" /> Completed</Badge></motion.div>}
              </AnimatePresence>
            </div>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard title="Accuracy" value={`${(currentMetrics.accuracy * 100).toFixed(1)}%`} icon={<Target className="h-4 w-4 text-muted-foreground" />} footer="Validation accuracy" />
            <MetricCard title="Validation Loss" value={currentMetrics.valLoss.toFixed(4)} icon={<LineChart className="h-4 w-4 text-muted-foreground" />} footer={`Train: ${currentMetrics.trainLoss.toFixed(4)}`} />
            <MetricCard title="Learning Rate" value="1.00e-4" icon={<Zap className="h-4 w-4 text-muted-foreground" />} footer="Cosine Annealing" />
            <MetricCard title="Epoch" value={`${currentEpoch} / ${TOTAL_EPOCHS}`} icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} footer={<Progress value={(currentEpoch / TOTAL_EPOCHS) * 100} className="h-2 mt-2" />} />
            <MetricCard title="ETA" value={`${eta.toFixed(1)} min`} icon={<Hourglass className="h-4 w-4 text-muted-foreground" />} footer="Estimated time remaining" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Loss Curve</CardTitle>
                <CardDescription>Training (blue) and validation (amber) loss across epochs.</CardDescription>
              </CardHeader>
              <CardContent className='overflow-x-auto'>
                <LossCurveChart data={trainingData} width={700} height={300} />
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>System Utilization</CardTitle></CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <GpuGauge utilization={gpuUtil} />
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-sm items-center"><MemoryStick className="h-4 w-4 mr-2" /><span>VRAM Usage</span><span>{memUsage}%</span></div>
                    <Progress value={memUsage} className="h-3" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Hyperparameters</CardTitle></CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      {Object.entries(mockHyperparameters).map(([key, value]) => (
                        <TableRow key={key}>
                          <TableCell className="font-medium text-xs p-2">{key}</TableCell>
                          <TableCell className="text-right text-xs p-2">{value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Training Logs</CardTitle></CardHeader>
            <CardContent>
              <div ref={logContainerRef} className="h-48 bg-muted rounded-md p-3 text-xs font-mono overflow-y-auto scroll-smooth">
                {logs.map((log, i) => <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{duration: 0.5}}>{log}</motion.div>)}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
