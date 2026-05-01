import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence, Variants } from 'framer-motion';
import { ZoomIn, ZoomOut, CheckCircle, XCircle, Loader, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ExecutionStatus = 'running' | 'completed' | 'failed' | 'queued';

export interface Execution {
  id: string;
  tool: string;
  startTime: number;
  endTime: number;
  status: ExecutionStatus;
  dependencies?: string[];
  result?: string;
}

interface AgentExecutionTimelineProps {
  executions: Execution[];
  currentTime: number;
  onSelectExecution: (id: string | null) => void;
  selectedId?: string | null;
  totalDuration: number;
}

const statusConfig: Record<ExecutionStatus, { color: string; border: string; icon: React.ElementType }> = {
  running: { color: 'bg-blue-500', border: 'border-blue-400', icon: Loader },
  completed: { color: 'bg-green-500', border: 'border-green-400', icon: CheckCircle },
  failed: { color: 'bg-red-500', border: 'border-red-400', icon: XCircle },
  queued: { color: 'bg-gray-500', border: 'border-gray-400', icon: Clock },
};

const BAR_HEIGHT = 28;
const BAR_Y_SPACING = 40;

export const AgentExecutionTimeline: React.FC<AgentExecutionTimelineProps> = ({
  executions,
  currentTime,
  onSelectExecution,
  selectedId,
  totalDuration,
}) => {
  const [zoom, setZoom] = useState(1); // 1 = 100px per second
  const containerRef = useRef<HTMLDivElement>(null);

  const scale = useMemo(() => 100 * zoom, [zoom]);
  const timelineWidth = totalDuration * scale;

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const scrollTarget = (currentTime * scale) - (container.clientWidth / 2);
      container.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }
  }, [currentTime, scale]);

  const executionMap = useMemo(() => new Map(executions.map((exec, i) => [exec.id, { ...exec, y: i * BAR_Y_SPACING }])), [executions]);

  const timeMarkers = useMemo(() => {
    const markers = [];
    const interval = zoom < 0.5 ? 10 : 5;
    for (let i = 0; i <= totalDuration; i += interval) {
      markers.push(
        <div
          key={`marker-${i}`}
          className="absolute h-full top-0"
          style={{ left: `${i * scale}px` }}
        >
          <div className="w-px h-full bg-border"></div>
          <span className="absolute -top-5 text-xs text-muted-foreground">{i}s</span>
        </div>
      );
    }
    return markers;
  }, [totalDuration, scale, zoom]);

  const selectedExecution = useMemo(() => selectedId ? executionMap.get(selectedId) : null, [selectedId, executionMap]);

  const detailsVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', duration: 0.4 } },
    exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.2 } },
  };

  return (
    <div className="w-full flex flex-col h-full bg-background">
      <div className="flex-grow relative p-8 overflow-hidden">
        <div ref={containerRef} className="absolute inset-0 overflow-auto">
          <div className="relative" style={{ width: timelineWidth, height: executions.length * BAR_Y_SPACING }}>
            {timeMarkers}
            <svg width={timelineWidth} height={executions.length * BAR_Y_SPACING} className="absolute top-0 left-0">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              {Array.from(executionMap.values()).map(exec =>
                exec.dependencies?.map(depId => {
                  const dep = executionMap.get(depId);
                  if (!dep) return null;
                  const startX = (dep.startTime + (dep.endTime - dep.startTime)) * scale;
                  const startY = dep.y + BAR_HEIGHT / 2;
                  const endX = exec.startTime * scale - 5;
                  const endY = exec.y + BAR_HEIGHT / 2;
                  const midX = startX + (endX - startX) / 2;

                  return (
                    <path
                      key={`${dep.id}-${exec.id}`}
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      stroke="#6b7280"
                      strokeWidth="1.5"
                      fill="none"
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })
              )}
            </svg>
            {Array.from(executionMap.values()).map((exec) => {
              const { color, border } = statusConfig[exec.status];
              const width = (exec.endTime - exec.startTime) * scale;
              const progressWidth = exec.status === 'running' ? ((currentTime - exec.startTime) / (exec.endTime - exec.startTime)) * 100 : 100;

              return (
                <motion.div
                  key={exec.id}
                  layout
                  initial={{ opacity: 0, y: exec.y + 10 }}
                  animate={{ opacity: 1, y: exec.y }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={cn(
                    'absolute rounded-md cursor-pointer transition-all duration-300',
                    selectedId === exec.id ? `ring-2 ring-offset-2 ring-offset-background ring-primary` : `hover:ring-1 hover:ring-primary/50`
                  )}
                  style={{ left: exec.startTime * scale, top: exec.y, height: BAR_HEIGHT, minWidth: '4px' }}
                  onClick={() => onSelectExecution(exec.id)}
                >
                  <div className={cn('h-full w-full rounded-md overflow-hidden', border)} style={{width: `${width}px`}}>
                    <motion.div
                      className={cn('h-full', color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${exec.status === 'queued' ? 100 : progressWidth}%` }}
                      transition={{ duration: exec.status === 'running' ? 1 : 0.5, ease: 'linear' as const }}
                    />
                  </div>
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white truncate pr-2" style={{maxWidth: `${width - 8}px`}}>
                    {exec.tool}
                  </span>
                </motion.div>
              );
            })}
            <div
              className="absolute top-0 w-0.5 bg-red-500 h-full z-10"
              style={{ left: `${currentTime * scale}px` }}
            />
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 p-4 border-t border-border flex items-center justify-between">
        <div className="flex-grow">
          <AnimatePresence mode="wait">
            {selectedExecution && (
              <motion.div key={selectedExecution.id} variants={detailsVariants} initial="hidden" animate="visible" exit="exit">
                <Card className="w-full max-w-2xl">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Selected Execution</CardTitle>
                    {React.createElement(statusConfig[selectedExecution.status].icon, { className: 'h-4 w-4 text-muted-foreground' })}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedExecution.tool}</div>
                    <p className="text-xs text-muted-foreground">
                      Duration: {(selectedExecution.endTime - selectedExecution.startTime).toFixed(2)}s | Status: {selectedExecution.status}
                    </p>
                    {selectedExecution.result && (
                      <pre className="mt-2 text-xs bg-muted p-2 rounded-md overflow-auto max-h-20">
                        <code>{selectedExecution.result}</code>
                      </pre>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.1, z / 1.5))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(5, z * 1.5))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
