import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, CheckCircle, AlertCircle, Clock, Database, Filter, Settings, HardDrive, X } from 'lucide-react';

export interface Stage {
  id: string;
  name: string;
  type: 'source' | 'transform' | 'filter' | 'sink';
  status: 'idle' | 'processing' | 'completed' | 'error';
  recordsIn: number;
  recordsOut: number;
  duration?: number;
}

export interface Connection {
  from: string;
  to: string;
}

export interface DataPipelineViewerProps {
  stages: Stage[];
  connections: Connection[];
  isRunning: boolean;
  onStageClick: (id: string) => void;
  selectedStageId?: string;
}

const StageCard = ({ 
  stage, 
  isSelected, 
  onClick, 
  setRef 
}: { 
  stage: Stage; 
  isSelected: boolean; 
  onClick: () => void;
  setRef: (id: string, el: HTMLDivElement | null) => void;
}) => {
  const typeColors = {
    source: "border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400",
    transform: "border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    filter: "border-yellow-500/50 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    sink: "border-purple-500/50 bg-purple-500/10 text-purple-600 dark:text-purple-400"
  };

  const TypeIcon = {
    source: Database,
    transform: Settings,
    filter: Filter,
    sink: HardDrive
  }[stage.type];

  const isError = stage.status === 'error';
  const isProcessing = stage.status === 'processing';

  return (
    <Card 
      ref={(el) => setRef(stage.id, el)}
      className={cn(
        "w-64 cursor-pointer transition-all duration-200 relative z-10 bg-card",
        isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md",
        isError ? "border-red-500 bg-red-500/5" : "",
        isProcessing ? "border-primary/50" : ""
      )}
      onClick={onClick}
    >
      {isProcessing && (
        <motion.div 
          className="absolute -inset-[2px] rounded-xl border-2 border-primary pointer-events-none"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }}
        />
      )}
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("capitalize flex items-center gap-1", typeColors[stage.type])}>
            <TypeIcon className="w-3 h-3" />
            {stage.type}
          </Badge>
          {stage.status === 'processing' && <Activity className="w-4 h-4 text-primary animate-pulse" />}
          {stage.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
          {stage.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
          {stage.status === 'idle' && <Clock className="w-4 h-4 text-muted-foreground" />}
        </div>
        <CardTitle className="text-base mt-2 truncate" title={stage.name}>{stage.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">In</span>
            <span className="font-medium">{stage.recordsIn.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Out</span>
            <span className="font-medium">{stage.recordsOut.toLocaleString()}</span>
          </div>
        </div>
        {stage.status === 'completed' && stage.duration !== undefined && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {stage.duration}ms
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DataPipelineViewer = ({
  stages,
  connections,
  isRunning,
  onStageClick,
  selectedStageId
}: DataPipelineViewerProps) => {
  const [positions, setPositions] = useState<Record<string, { x: number, y: number, width: number, height: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setStageRef = useCallback((id: string, el: HTMLDivElement | null) => {
    stageRefs.current[id] = el;
  }, []);

  const updatePositions = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const newPositions: Record<string, { x: number, y: number, width: number, height: number }> = {};
    
    Object.entries(stageRefs.current).forEach(([id, el]) => {
      if (el) {
        const rect = el.getBoundingClientRect();
        newPositions[id] = {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top,
          width: rect.width,
          height: rect.height
        };
      }
    });
    
    setPositions(newPositions);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      updatePositions();
    }, 100);
    
    window.addEventListener('resize', updatePositions);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
    };
  }, [updatePositions, stages, connections]);

  const levelGroups = useMemo(() => {
    const levels: Record<string, number> = {};
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    
    stages.forEach(s => {
      inDegree[s.id] = 0;
      adj[s.id] = [];
      levels[s.id] = 0;
    });
    
    connections.forEach(c => {
      if (adj[c.from]) {
        adj[c.from].push(c.to);
      }
      if (inDegree[c.to] !== undefined) {
        inDegree[c.to] = (inDegree[c.to] || 0) + 1;
      }
    });
    
    const queue: string[] = [];
    stages.forEach(s => {
      if (inDegree[s.id] === 0) {
        queue.push(s.id);
      }
    });
    
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const curr = queue.shift()!;
      visited.add(curr);
      
      adj[curr].forEach(next => {
        levels[next] = Math.max(levels[next], levels[curr] + 1);
        inDegree[next]--;
        if (inDegree[next] === 0 && !visited.has(next)) {
          queue.push(next);
        }
      });
    }
    
    stages.forEach(s => {
      if (!visited.has(s.id)) {
        levels[s.id] = 0;
      }
    });
    
    const groups: Stage[][] = [];
    stages.forEach(s => {
      const lvl = levels[s.id] || 0;
      if (!groups[lvl]) groups[lvl] = [];
      groups[lvl].push(s);
    });
    
    return groups.filter(g => g && g.length > 0);
  }, [stages, connections]);

  const selectedStage = useMemo(() => 
    stages.find(s => s.id === selectedStageId), 
  [stages, selectedStageId]);

  return (
    <div className="flex h-full w-full border rounded-lg overflow-hidden bg-background">
      <div className="flex-1 overflow-auto bg-muted/10 relative">
        <div className="relative min-w-max min-h-max p-12" ref={containerRef}>
          <svg className="absolute inset-0 pointer-events-none w-full h-full" style={{ zIndex: 0 }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" className="text-muted-foreground">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" opacity={0.3} />
              </marker>
            </defs>
            {connections.map((conn) => {
              const fromPos = positions[conn.from];
              const toPos = positions[conn.to];
              if (!fromPos || !toPos) return null;
              
              const startX = fromPos.x + fromPos.width;
              const startY = fromPos.y + fromPos.height / 2;
              const endX = toPos.x;
              const endY = toPos.y + toPos.height / 2;
              
              const controlPointOffset = Math.max(Math.abs(endX - startX) / 2, 50);
              const path = `M ${startX} ${startY} C ${startX + controlPointOffset} ${startY}, ${endX - controlPointOffset} ${endY}, ${endX} ${endY}`;
              
              return (
                <g key={`${conn.from}-${conn.to}`}>
                  <path 
                    d={path} 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth={2} 
                    className="text-muted-foreground/30" 
                    markerEnd="url(#arrowhead)"
                  />
                  {isRunning && (
                    <motion.path
                      d={path}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="text-primary"
                      strokeDasharray="6 6"
                      animate={{ strokeDashoffset: [12, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "linear" as const }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          
          <div className="flex flex-row items-stretch justify-start gap-24 relative z-10">
            {levelGroups.map((group, i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-8">
                {group.map(stage => (
                  <StageCard 
                    key={stage.id} 
                    stage={stage} 
                    isSelected={selectedStageId === stage.id}
                    onClick={() => onStageClick(stage.id)}
                    setRef={setStageRef}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {selectedStage && (
        <div className="w-80 border-l bg-card p-6 overflow-auto flex-shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedStage.name}</h3>
              <Button variant="ghost" size="icon" onClick={() => onStageClick('')}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid gap-6">
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className="w-fit capitalize">{selectedStage.type}</Badge>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="outline" className="w-fit capitalize">{selectedStage.status}</Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Records In</span>
                    <span className="text-xl font-semibold">{selectedStage.recordsIn.toLocaleString()}</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Records Out</span>
                    <span className="text-xl font-semibold">{selectedStage.recordsOut.toLocaleString()}</span>
                  </CardContent>
                </Card>
              </div>
              
              {selectedStage.duration !== undefined && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{selectedStage.duration} ms</span>
                </div>
              )}
              
              {selectedStage.status === 'error' && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm">
                  An error occurred during processing in this stage. Check logs for details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
