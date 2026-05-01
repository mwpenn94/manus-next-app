/**
 * ExecutionPlanDisplay — Shows the AEGIS execution plan steps during streaming.
 * Displays task classification badge and numbered plan steps with progress indicators.
 * Appears only for moderate+ complexity tasks that have a generated plan.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Sparkles, CheckCircle2, Circle, Loader2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AegisMeta {
  classification?: { taskType: string; complexity: string; confidence?: number };
  planSteps?: string[];
  quality?: Record<string, number>;
}

interface ExecutionPlanDisplayProps {
  aegisMeta: AegisMeta | null;
  completedSteps?: number;
  isStreaming?: boolean;
  className?: string;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  trivial: "bg-muted text-muted-foreground",
  simple: "bg-blue-500/10 text-blue-400",
  moderate: "bg-amber-500/10 text-amber-400",
  complex: "bg-purple-500/10 text-purple-400",
  expert: "bg-rose-500/10 text-rose-400",
};

const TASK_TYPE_ICONS: Record<string, string> = {
  code: "🔧",
  research: "🔍",
  writing: "✍️",
  data: "📊",
  design: "🎨",
  planning: "📋",
  conversation: "💬",
};

export default function ExecutionPlanDisplay({
  aegisMeta,
  completedSteps = 0,
  isStreaming = false,
  className,
}: ExecutionPlanDisplayProps) {
  const [expanded, setExpanded] = useState(true);

  if (!aegisMeta || !aegisMeta.planSteps || aegisMeta.planSteps.length === 0) {
    return null;
  }

  const { classification, planSteps } = aegisMeta;
  const complexityColor = COMPLEXITY_COLORS[classification?.complexity || "moderate"] || COMPLEXITY_COLORS.moderate;
  const taskIcon = TASK_TYPE_ICONS[classification?.taskType || "conversation"] || "⚡";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className={cn("rounded-xl border border-border/60 bg-card/50 backdrop-blur-sm overflow-hidden", className)}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors text-left"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium text-foreground flex-1">
          Execution Plan
        </span>
        {classification && (
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", complexityColor)}>
            {taskIcon} {classification.taskType} · {classification.complexity}
            {classification.confidence != null && (
              <span className="ml-1 opacity-70">{Math.round(classification.confidence * 100)}%</span>
            )}
          </span>
        )}
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {/* Steps */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2.5 space-y-1">
              {planSteps.map((step, i) => {
                const isCompleted = i < completedSteps;
                const isActive = i === completedSteps && isStreaming;
                // Strip leading number + dot
                const stepText = step.replace(/^\d+\.\s*/, "");

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 py-0.5 transition-opacity duration-200",
                      isCompleted ? "opacity-60" : isActive ? "opacity-100" : "opacity-50"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    )}
                    <span className={cn(
                      "text-[11px] leading-relaxed",
                      isCompleted ? "text-muted-foreground line-through" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
                    )}>
                      {stepText}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quality scores — shown after completion */}
            {aegisMeta.quality && Object.keys(aegisMeta.quality).length > 0 && !isStreaming && (
              <div className="px-3 pb-3 pt-1 border-t border-border/40">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground">Quality Assessment</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(aegisMeta.quality).map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-0.5">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            value >= 0.8 ? "bg-emerald-500" : value >= 0.6 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(value * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground capitalize truncate w-full text-center">
                        {key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
