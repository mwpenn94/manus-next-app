/**
 * ReasoningDepthIndicator — Real-time cognitive state transparency
 * 
 * Shows the agent's current thinking budget, context utilization,
 * turn depth, and mode tier. Manus parity+: no other AI agent UI
 * exposes this level of reasoning transparency.
 */
import { cn } from "@/lib/utils";
import { Brain, Zap, Layers, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ReasoningDepthData {
  turn: number;
  maxTurns: number;
  thinkingBudget: number;
  contextUtilization: number;
  contextTokens: number;
  contextCapacity: number;
  continuationRound: number;
  mode: string;
  toolCallsCompleted: number;
}

interface Props {
  data: ReasoningDepthData | null;
  isStreaming: boolean;
  className?: string;
}

const MODE_LABELS: Record<string, string> = {
  speed: "Speed",
  quality: "Quality",
  max: "Max",
  limitless: "Limitless",
};

const MODE_COLORS: Record<string, string> = {
  speed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  quality: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  max: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  limitless: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

export default function ReasoningDepthIndicator({ data, isStreaming, className }: Props) {
  if (!data || !isStreaming) return null;

  const { turn, maxTurns, thinkingBudget, contextUtilization, mode, toolCallsCompleted, continuationRound } = data;

  // Context pressure color
  const contextColor = contextUtilization > 80
    ? "text-amber-400"
    : contextUtilization > 60
    ? "text-yellow-400"
    : "text-emerald-400";

  const turnProgress = maxTurns > 0 && isFinite(maxTurns) ? (turn / maxTurns) * 100 : 0;
  const tierLabel = MODE_LABELS[mode] || mode;
  const tierBadgeClass = MODE_COLORS[mode] || "bg-muted text-muted-foreground border-border";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-card/60 border border-border/40 text-[10px] backdrop-blur-sm",
          className
        )}
      >
        {/* Tier badge */}
        <span className={cn("px-1.5 py-0.5 rounded-full font-medium border text-[9px]", tierBadgeClass)}>
          {tierLabel}
        </span>

        {/* Thinking budget */}
        <div className="flex items-center gap-1 text-muted-foreground" title={`Thinking budget: ${thinkingBudget.toLocaleString()} tokens`}>
          <Brain className="w-2.5 h-2.5" />
          <span className="font-mono">{thinkingBudget >= 1000 ? `${(thinkingBudget / 1024).toFixed(0)}K` : thinkingBudget}</span>
        </div>

        {/* Context utilization */}
        <div className="flex items-center gap-1" title={`Context: ${contextUtilization}% utilized`}>
          <Layers className="w-2.5 h-2.5 text-muted-foreground" />
          <span className={cn("font-mono", contextColor)}>
            {contextUtilization}%
          </span>
        </div>

        {/* Turn progress */}
        <div className="flex items-center gap-1 text-muted-foreground" title={`Turn ${turn}/${isFinite(maxTurns) ? maxTurns : "∞"}`}>
          <Gauge className="w-2.5 h-2.5" />
          <span className="font-mono">{turn}/{isFinite(maxTurns) ? maxTurns : "∞"}</span>
          {isFinite(maxTurns) && maxTurns > 0 && (
            <div className="w-10 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/60 transition-all duration-300"
                style={{ width: `${Math.min(turnProgress, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Tool calls count */}
        {toolCallsCompleted > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground" title={`${toolCallsCompleted} tool calls completed`}>
            <Zap className="w-2.5 h-2.5" />
            <span className="font-mono">{toolCallsCompleted}</span>
          </div>
        )}

        {/* Continuation indicator */}
        {continuationRound > 0 && (
          <span className="text-[9px] text-primary/70 font-mono" title="Auto-continuation round">
            +{continuationRound}
          </span>
        )}

        {/* Active pulse */}
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
