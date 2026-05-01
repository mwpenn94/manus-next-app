import React, { useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Flag, Eye, Package } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type MilestoneStatus = 'completed' | 'current' | 'upcoming';
export type MilestoneType = 'start' | 'checkpoint' | 'review' | 'delivery';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  date: number; // Unix timestamp
  status: MilestoneStatus;
  type: MilestoneType;
}

export interface TaskTimelineViewProps {
  milestones: Milestone[];
  onMilestoneClick: (id: string) => void;
  selectedMilestoneId?: string;
  startDate: number; // Unix timestamp
  endDate: number;   // Unix timestamp
}

const milestoneIcons: Record<MilestoneType, React.ElementType> = {
  start: Play,
  checkpoint: Flag,
  review: Eye,
  delivery: Package,
};

const statusColors: Record<MilestoneStatus, string> = {
  completed: 'bg-green-500',
  current: 'bg-blue-500',
  upcoming: 'bg-muted',
};

const getPosition = (date: number, start: number, end: number) => {
  const totalDuration = end - start;
  if (totalDuration <= 0) return 0;
  const progress = (date - start) / totalDuration;
  return Math.max(0, Math.min(1, progress));
};

export const TaskTimelineView: React.FC<TaskTimelineViewProps> = ({ 
  milestones, 
  onMilestoneClick, 
  selectedMilestoneId, 
  startDate, 
  endDate 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentMilestoneRef = useRef<HTMLButtonElement>(null);

  const sortedMilestones = useMemo(() => 
    [...milestones].sort((a, b) => a.date - b.date), 
    [milestones]
  );

  const currentMilestone = useMemo(() => 
    sortedMilestones.find(m => m.status === 'current') || sortedMilestones[sortedMilestones.length - 1],
    [sortedMilestones]
  );

  const progress = useMemo(() => 
    currentMilestone ? getPosition(currentMilestone.date, startDate, endDate) : 0,
    [currentMilestone, startDate, endDate]
  );

  useEffect(() => {
    if (currentMilestoneRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = currentMilestoneRef.current;
      const containerWidth = container.offsetWidth;
      const elementOffset = element.offsetLeft;
      const elementWidth = element.offsetWidth;

      container.scrollTo({
        left: elementOffset - containerWidth / 2 + elementWidth / 2,
        behavior: 'smooth',
      });
    }
  }, [currentMilestone]);

  const totalDuration = endDate - startDate;

  // Generate date markers for the timeline (e.g., monthly)
  const dateMarkers = useMemo(() => {
    if (totalDuration <= 0) return [];
    const markers = [];
    const start = new Date(startDate * 1000);
    const end = new Date(endDate * 1000);
    let current = new Date(start);
    current.setDate(1);
    current.setHours(0, 0, 0, 0);

    while (current <= end) {
      markers.push({ 
        date: current.getTime() / 1000,
        label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
      current.setMonth(current.getMonth() + 1);
    }
    return markers;
  }, [startDate, endDate, totalDuration]);

  return (
    <TooltipProvider>
      <Card className="w-full p-4 md:p-6">
        <div className="relative w-full">
          {/* Desktop Timeline */}
          <div ref={containerRef} className="hidden md:block w-full overflow-x-auto pb-8 scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-muted/20">
            <div className="relative w-full" style={{ minWidth: '800px', height: '100px' }}>
              {/* Timeline track */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full" />
              {/* Progress line */}
              <motion.div 
                className="absolute top-1/2 -translate-y-1/2 h-1 bg-blue-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 1, ease: 'easeInOut' as const }}
              />

              {/* Date Markers */}
              {dateMarkers.map(marker => (
                <div 
                  key={marker.date}
                  className="absolute top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ left: `${getPosition(marker.date, startDate, endDate) * 100}%`, transform: 'translateX(-50%) translateY(20px)' }}
                >
                  <span className="block h-2 w-px bg-border -translate-y-2"/>
                  {marker.label}
                </div>
              ))}

              {/* Milestones */}
              {sortedMilestones.map(milestone => {
                const Icon = milestoneIcons[milestone.type];
                const position = getPosition(milestone.date, startDate, endDate);
                const isSelected = milestone.id === selectedMilestoneId;

                return (
                  <Tooltip key={milestone.id}>
                    <TooltipTrigger asChild>
                      <motion.button
                        ref={milestone.status === 'current' ? currentMilestoneRef : null}
                        onClick={() => onMilestoneClick(milestone.id)}
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center focus:outline-none transition-all duration-300',
                          statusColors[milestone.status],
                          isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-primary' : 'ring-0'
                        )}
                        style={{ left: `${position * 100}%` }}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {milestone.status === 'current' && (
                          <motion.div 
                            className="absolute inset-0 rounded-full bg-blue-500"
                            animate={{ 
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 0, 0.5]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1.5, 
                              ease: 'easeInOut' as const
                            }}
                          />
                        )}
                        <Icon className="w-4 h-4 text-primary-foreground" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">{new Date(milestone.date * 1000).toLocaleDateString()}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="block md:hidden">
            <div className="relative border-l-2 border-muted pl-6">
              {/* Progress line */}
              <motion.div 
                className="absolute top-0 left-[-1px] w-0.5 bg-blue-500"
                initial={{ height: 0 }}
                animate={{ height: `${progress * 100}%` }}
                transition={{ duration: 1, ease: 'easeInOut' as const }}
              />
              {sortedMilestones.map((milestone, index) => {
                const Icon = milestoneIcons[milestone.type];
                const isSelected = milestone.id === selectedMilestoneId;

                return (
                  <div key={milestone.id} className="relative pb-8">
                    {/* Dot */}
                    <div className="absolute -left-[31px] top-1 w-8 h-8 rounded-full flex items-center justify-center">
                      <div className={cn('w-4 h-4 rounded-full', statusColors[milestone.status])} />
                      {milestone.status === 'current' && (
                        <motion.div 
                          className="absolute w-4 h-4 rounded-full bg-blue-500"
                          animate={{ scale: [1, 2, 1], opacity: [0.7, 0, 0.7] }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' as const }}
                        />
                      )}
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <button 
                        onClick={() => onMilestoneClick(milestone.id)}
                        className={cn(
                          'block w-full text-left p-3 rounded-lg transition-colors',
                          isSelected ? 'bg-accent' : 'hover:bg-accent/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">{milestone.title}</p>
                            <p className="text-sm text-muted-foreground">{new Date(milestone.date * 1000).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </TooltipProvider>
  );
};
