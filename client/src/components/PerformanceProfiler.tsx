import React, { useMemo } from 'react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { Wrench, Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// A vibrant, colorblind-safe palette
const PHASE_COLORS = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-fuchsia-500',
]

const getPhaseColor = (index: number) => PHASE_COLORS[index % PHASE_COLORS.length];

interface SubPhase {
  name: string;
  duration: number;
}

interface Phase {
  name: string;
  duration: number;
  percentage: number;
  children?: SubPhase[];
}

interface Profile {
  totalDuration: number;
  phases: Phase[];
}

export interface PerformanceProfilerProps {
  profile: Profile;
  compareTo?: Profile;
  onPhaseClick: (phaseName: string) => void;
  selectedPhase?: string;
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
};

const BarSegment: React.FC<{ 
    phase: Phase | SubPhase;
    color: string;
    percentage: number;
    isClickable: boolean;
    isSelected: boolean;
    onClick: () => void;
}> = ({ phase, color, percentage, isClickable, isSelected, onClick }) => {
    const segmentVariants = {
        initial: { scaleX: 0 },
        animate: { scaleX: 1 },
        exit: { scaleX: 0 },
    } as const satisfies Variants;

    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <motion.div
                        layout
                        variants={segmentVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }}
                        className={cn(
                            'h-full relative origin-left',
                            color,
                            isClickable && 'cursor-pointer hover:opacity-80 transition-opacity',
                            isSelected && 'ring-2 ring-offset-2 ring-offset-background ring-primary'
                        )}
                        style={{ width: `${percentage}%` }}
                        onClick={onClick}
                    >
                        {percentage > 5 && (
                            <div className="absolute inset-0 flex items-center justify-center px-2 text-white text-xs font-medium truncate">
                                {phase.name}
                            </div>
                        )}
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-semibold">{phase.name}</p>
                    <p>Duration: {formatDuration(phase.duration)}</p>
                    { 'percentage' in phase && <p>Share: {phase.percentage.toFixed(1)}%</p> }
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

const ComparisonMarker: React.FC<{ percentage: number, duration: number }> = ({ percentage, duration }) => (
    <TooltipProvider delayDuration={150}>
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.div
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ scaleY: 1, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="absolute -top-1 -bottom-1 w-1 bg-destructive transform -translate-x-1/2 z-10"
                    style={{ left: `${percentage}%` }}
                />
            </TooltipTrigger>
            <TooltipContent side="top">
                <p>Previous: {formatDuration(duration)}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({ 
    profile,
    compareTo,
    onPhaseClick,
    selectedPhase 
}) => {
    const selectedPhaseData = useMemo(() => 
        profile.phases.find(p => p.name === selectedPhase),
    [profile.phases, selectedPhase]);

    const subPhases = selectedPhaseData?.children;
    const totalSubPhaseDuration = useMemo(() => 
        subPhases?.reduce((acc, child) => acc + child.duration, 0) ?? 0,
    [subPhases]);

    const comparisonMarkers = useMemo(() => {
        if (!compareTo) return [];
        let cumulativePercentage = 0;
        return compareTo.phases.map(phase => {
            cumulativePercentage += phase.percentage;
            return { name: phase.name, percentage: cumulativePercentage, duration: phase.duration };
        });
    }, [compareTo]);

    return (
        <Card className="w-full overflow-hidden">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-lg font-bold">Performance Profile</CardTitle>
                    <CardDescription>Execution time breakdown</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-2xl font-bold text-right">
                    <Clock className="w-6 h-6 text-muted-foreground" />
                    <span>{formatDuration(profile.totalDuration)}</span>
                    {compareTo && (
                        <Badge variant={profile.totalDuration < compareTo.totalDuration ? "secondary" : "destructive"}>
                            {(((profile.totalDuration - compareTo.totalDuration) / compareTo.totalDuration) * 100).toFixed(0)}%
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
                {/* Main Profile Bar */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Current Run Breakdown</h3>
                    <div className="relative w-full h-8 rounded-md overflow-hidden flex bg-muted">
                        <AnimatePresence>
                            {profile.phases.map((phase, index) => (
                                <BarSegment
                                    key={phase.name}
                                    phase={phase}
                                    color={getPhaseColor(index)}
                                    percentage={phase.percentage}
                                    isClickable={!!phase.children}
                                    isSelected={phase.name === selectedPhase}
                                    onClick={() => onPhaseClick(phase.name)}
                                />
                            ))}
                        </AnimatePresence>
                        {comparisonMarkers.map(marker => (
                            <ComparisonMarker key={marker.name} percentage={marker.percentage} duration={marker.duration} />
                        ))}
                    </div>
                </div>

                {/* Sub-phase Drill Down */}
                <AnimatePresence>
                    {subPhases && subPhases.length > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" as const }}
                            className="space-y-2 overflow-hidden"
                        >
                            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Wrench className="w-4 h-4" />
                                Drilldown: {selectedPhaseData?.name} ({formatDuration(totalSubPhaseDuration)})
                            </h3>
                            <div className="w-full h-6 rounded-md overflow-hidden flex bg-muted">
                                {subPhases.map((child, index) => {
                                    const childPercentage = (child.duration / totalSubPhaseDuration) * 100;
                                    return (
                                        <BarSegment
                                            key={child.name}
                                            phase={child}
                                            color={getPhaseColor(index + 2)} // Offset colors for visual distinction
                                            percentage={childPercentage}
                                            isClickable={false}
                                            isSelected={false}
                                            onClick={() => {}}
                                        />
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Legend */}
                <div className="space-y-2">
                     <h3 className="text-sm font-medium text-muted-foreground">Legend</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {profile.phases.map((phase, index) => (
                            <div key={phase.name} className="flex items-center gap-2 text-sm">
                                <div className={cn("w-3 h-3 rounded-sm", getPhaseColor(index))} />
                                <span>{phase.name}</span>
                                <span className="text-muted-foreground">({phase.percentage.toFixed(1)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
