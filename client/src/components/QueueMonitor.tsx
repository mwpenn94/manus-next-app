import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, AlertCircle, Trash2, Eye, LineChart, Server, Users, MessageSquare } from "lucide-react";

// TypeScript interfaces
interface Queue {
  id: string;
  name: string;
  depth: number;
  throughput: number;
  consumers: number;
  dlqCount: number;
  status: "running" | "paused";
  depthHistory: number[];
}

// Mock Data
const Sparkline = ({ data, width = 120, height = 40, color = "#8884d8" }: { data: number[]; width?: number; height?: number; color?: string; }) => {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min === 0 ? 1 : max - min;

  const points = data.map(
    (d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * (height - 4) + 2}`
  ).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </svg>
  );
};

const initialQueues: Queue[] = [
  {
    id: "q1",
    name: "high-priority-tasks",
    depth: 1258, throughput: 150, consumers: 10,
    dlqCount: 23, status: "running",
    depthHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 1000)),
  },
  {
    id: "q2",
    name: "background-jobs",
    depth: 5432, throughput: 35, consumers: 5,
    dlqCount: 1, status: "running",
    depthHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 5000)),
  },
  {
    id: "q3",
    name: "email-notifications",
    depth: 2, throughput: 500, consumers: 2,
    dlqCount: 0, status: "running",
    depthHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 50)),
  },
  {
    id: "q4",
    name: "data-processing-pipeline",
    depth: 8765, throughput: 12, consumers: 8,
    dlqCount: 128, status: "paused",
    depthHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 10000)),
  },
  {
    id: "q5",
    name: "real-time-events",
    depth: 75, throughput: 1200, consumers: 20,
    dlqCount: 0, status: "running",
    depthHistory: Array.from({ length: 20 }, () => Math.floor(Math.random() * 200)),
  },
];

export default function QueueMonitor() {
    const [queues, setQueues] = useState<Queue[]>(initialQueues);
  const [purgeCandidate, setPurgeCandidate] = useState<Queue | null>(null);
  const [peekQueue, setPeekQueue] = useState<Queue | null>(null);

  const mockMessages = useMemo(() => {
    if (!peekQueue) return [];
    return Array.from({ length: Math.min(peekQueue.depth, 10) }, (_, i) => ({
      id: `msg-${i}`,
      timestamp: new Date(Date.now() - i * 1000 * 60 * Math.random()).toISOString(),
      payload: JSON.stringify({ event: `event_${i}`, data: { userId: `user_${Math.floor(Math.random() * 100)}`, value: Math.random() * 1000 } }, null, 2),
    }));
  }, [peekQueue]);

  const handleToggleStatus = useCallback((id: string) => {
    setQueues(currentQueues =>
      currentQueues.map(q =>
        q.id === id ? { ...q, status: q.status === 'running' ? 'paused' : 'running' } : q
      )
    );
  }, []);

  const handleConfirmPurge = useCallback(() => {
    if (purgeCandidate) {
      setQueues(currentQueues =>
        currentQueues.map(q =>
          q.id === purgeCandidate.id ? { ...q, depth: 0, dlqCount: 0 } : q
        )
      );
      setPurgeCandidate(null);
    }
  }, [purgeCandidate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueues(currentQueues =>
        currentQueues.map(q => {
          if (q.status === 'paused') return q;
          const change = (Math.random() - 0.5) * q.throughput * 0.1;
          const newDepth = Math.max(0, Math.floor(q.depth + change));
          const newHistory = [...q.depthHistory.slice(1), newDepth];
          return { ...q, depth: newDepth, depthHistory: newHistory };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-background text-foreground p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold mb-6">Queue Monitor</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                <AnimatePresence>
          {queues.map((queue) => (
            <motion.div key={queue.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }}>
              <Card className="bg-card border-border/40 hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium truncate">{queue.name}</CardTitle>
                  <Badge variant={queue.status === 'running' ? 'default' : 'secondary'} className={cn(queue.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400', 'border-none')}>
                    {queue.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{queue.depth.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Messages Waiting</p>
                  <div className="mt-2 -mx-2">
                    <Sparkline data={queue.depthHistory} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mt-4 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <LineChart className="w-4 h-4" />
                      <span>{queue.throughput.toLocaleString()} msg/s</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{queue.consumers} consumers</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span>{queue.dlqCount.toLocaleString()} in DLQ</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-end gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleStatus(queue.id)}>
                          {queue.status === 'running' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{queue.status === 'running' ? 'Pause Consumers' : 'Resume Consumers'}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-500 hover:text-yellow-600" onClick={() => setPeekQueue(queue)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Peek Messages</p>
                      </TooltipContent>
                    </Tooltip>
                    <DialogTrigger asChild>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => setPurgeCandidate(queue)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Purge Queue</p>
                        </TooltipContent>
                      </Tooltip>
                    </DialogTrigger>
                  </TooltipProvider>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Dialog open={!!purgeCandidate} onOpenChange={(isOpen) => !isOpen && setPurgeCandidate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to purge this queue?</DialogTitle>
            <DialogDescription>
              This will permanently delete all messages in the "{purgeCandidate?.name}" queue, including those in the DLQ. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeCandidate(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmPurge}>Purge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!peekQueue} onOpenChange={(isOpen) => !isOpen && setPeekQueue(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Peeking Messages: {peekQueue?.name}</DialogTitle>
            <DialogDescription>
              Showing up to 10 of the latest messages in the queue.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 bg-muted/50 rounded-md border border-border/40 max-h-[60vh] overflow-y-auto">
            {mockMessages.length > 0 ? (
              mockMessages.map(msg => (
                <div key={msg.id} className="p-4 border-b border-border/40 last:border-b-0">
                  <p className="text-xs text-muted-foreground mb-1">ID: {msg.id} | Timestamp: {new Date(msg.timestamp).toLocaleString()}</p>
                  <pre className="text-sm bg-background p-2 rounded-md whitespace-pre-wrap"><code>{msg.payload}</code></pre>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <MessageSquare className="mx-auto h-12 w-12" />
                <p className="mt-4">No messages in this queue to peek.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeekQueue(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
