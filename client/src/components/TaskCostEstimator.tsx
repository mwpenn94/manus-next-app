
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ChevronDown, HelpCircle, Wrench, Cpu, ChevronsRight, FileInput, FileOutput } from 'lucide-react';

// --- Type Definitions ---
type Complexity = 'simple' | 'moderate' | 'complex' | 'very_complex';

interface TaskCostEstimatorProps {
  prompt: string;
  estimatedTokens: { input: number; output: number; total: number };
  estimatedCost: { min: number; max: number; likely: number; currency: string };
  estimatedDuration: { min: number; max: number; likely: number }; // in seconds
  complexity: Complexity;
  toolsLikely: Array<{ name: string; probability: number }>;
  isVisible: boolean;
  confidence: number; // 0 to 1
}

// --- Helper Functions & Constants ---

const complexityConfig: Record<Complexity, { label: string; className: string; icon: React.ReactNode }> = {
  simple: { label: 'Simple', className: 'bg-green-500/20 text-green-500 border-green-500/30', icon: <Cpu size={14} /> },
  moderate: { label: 'Moderate', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30', icon: <Cpu size={14} /> },
  complex: { label: 'Complex', className: 'bg-orange-500/20 text-orange-500 border-orange-500/30', icon: <Cpu size={14} /> },
  very_complex: { label: 'Very Complex', className: 'bg-red-500/20 text-red-500 border-red-500/30', icon: <Cpu size={14} /> },
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}min${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
};

const formatCurrency = (value: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value);
}

// --- Sub-components ---

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }> = ({ icon, label, value, className }) => (
  <div className={cn("flex items-center justify-between text-sm text-muted-foreground", className)}>
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-mono text-foreground">{value}</span>
  </div>
);

// --- Main Component ---

export const TaskCostEstimator: React.FC<TaskCostEstimatorProps> = ({
  estimatedTokens,
  estimatedCost,
  estimatedDuration,
  complexity,
  toolsLikely,
  isVisible,
  confidence,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const complexityInfo = complexityConfig[complexity];

  const confidenceLabel = useMemo(() => {
    if (confidence > 0.9) return 'High';
    if (confidence > 0.7) return 'Medium';
    return 'Low';
  }, [confidence]);

  const sortedTools = useMemo(() => 
    [...toolsLikely].sort((a, b) => b.probability - a.probability).slice(0, 3),
  [toolsLikely]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }}
          className="overflow-hidden"
        >
          <Card className="border-border/50 bg-background/80 backdrop-blur-sm">
            <CardHeader className="p-3 flex-row items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <div className="flex items-center gap-3">
                <HelpCircle className="text-muted-foreground" size={18} />
                <CardTitle className="text-base font-medium">Cost & Complexity Estimate</CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={cn("font-semibold", complexityInfo.className)}>{complexityInfo.label}</Badge>
                <ChevronDown className={cn("transform transition-transform duration-200", isExpanded && "rotate-180")} size={18} />
              </div>
            </CardHeader>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" as const }}
              >
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="space-y-2">
                     <InfoRow 
                        icon={<span className="text-lg">{estimatedCost.currency === 'USD' ? '$' : '€'}</span>} 
                        label="Estimated Cost" 
                        value={`${formatCurrency(estimatedCost.min, estimatedCost.currency)} - ${formatCurrency(estimatedCost.max, estimatedCost.currency)} (likely ${formatCurrency(estimatedCost.likely, estimatedCost.currency)})`}
                    />
                    <InfoRow 
                        icon={<span className="text-lg">⏱</span>} 
                        label="Estimated Duration" 
                        value={`${formatDuration(estimatedDuration.min)} - ${formatDuration(estimatedDuration.max)} (likely ${formatDuration(estimatedDuration.likely)})`}
                    />
                  </div>

                  <div className="p-3 rounded-md border border-border/50 bg-accent/30 space-y-3">
                    <h4 className="font-semibold text-sm text-foreground">Breakdown</h4>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><FileInput size={14}/> Input Tokens</div>
                        <div className="font-mono text-foreground">{estimatedTokens.input.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><FileOutput size={14}/> Output Tokens</div>
                        <div className="font-mono text-foreground">{estimatedTokens.output.toLocaleString()}</div>
                    </div>
                     <div className="flex items-center justify-between text-sm text-muted-foreground font-bold">
                        <div className="flex items-center gap-2"><ChevronsRight size={14}/> Total Tokens</div>
                        <div className="font-mono text-foreground">{estimatedTokens.total.toLocaleString()}</div>
                    </div>
                  </div>

                  {sortedTools.length > 0 && (
                    <div className="p-3 rounded-md border border-border/50 bg-accent/30 space-y-3">
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-2"><Wrench size={14}/> Likely Tools</h4>
                        <div className="space-y-2">
                            {sortedTools.map(tool => (
                                <div key={tool.name} className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>{tool.name}</span>
                                    <span className="font-mono text-foreground">{Math.round(tool.probability * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground/80 pt-2">
                    <div className="flex items-center gap-2">
                        <span>Confidence: {confidenceLabel}</span>
                        <Progress value={confidence * 100} className="w-20 h-1.5" />
                    </div>
                    <p>This is an automated estimate and may vary.</p>
                  </div>
                </CardContent>
              </motion.div>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
