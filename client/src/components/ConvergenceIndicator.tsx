/**
 * ConvergenceIndicator — Enhanced convergence progress visualization
 *
 * Renders inline in chat to show the agent's recursive optimization loop progress.
 * Displays: pass number, pass type, reasoning mode, temperature, score trajectory,
 * convergence status, and failure log.
 *
 * GAP E: Richer convergence UI with temperature, pass type, score trajectory.
 */
import { motion } from "framer-motion";
import {
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Target,
  Shield,
  Telescope,
  Layers,
  Zap,
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
  Thermometer,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PassType =
  | "landscape"
  | "depth"
  | "adversarial"
  | "future_state"
  | "synthesis"
  | "exploration"
  | "fundamental_redesign";

export type ConvergenceStatus = "running" | "converged" | "needs_more";
export type ReasoningMode = "convergent" | "divergent" | "adaptive";

interface ConvergenceIndicatorProps {
  /** Current pass number */
  passNumber: number;
  /** Total passes completed so far */
  totalPasses?: number;
  /** Type of the current pass */
  passType: PassType;
  /** Current convergence status */
  status: ConvergenceStatus;
  /** Brief description of what this pass is doing */
  description?: string;
  /** Quality rating (1-10) */
  rating?: number;
  /** Consecutive convergence confirmations (need 100 for full convergence) */
  convergenceCount?: number;
  /** Reasoning mode: convergent, divergent, or adaptive */
  reasoningMode?: ReasoningMode;
  /** Current temperature (0.0-1.0) */
  temperature?: number;
  /** Score change from previous pass */
  scoreDelta?: number;
  /** Signal assessment for this pass */
  signalAssessment?: string;
  /** What was tried and didn't work */
  failureLog?: string;
  /** Divergence budget used (0-100%) */
  divergenceBudgetUsed?: number;
}

const PASS_CONFIG: Record<
  PassType,
  { icon: React.ElementType; label: string; color: string }
> = {
  landscape: { icon: Telescope, label: "Landscape", color: "text-blue-400" },
  depth: { icon: Target, label: "Depth", color: "text-purple-400" },
  adversarial: { icon: Shield, label: "Adversarial", color: "text-red-400" },
  future_state: { icon: Sparkles, label: "Future-State", color: "text-amber-400" },
  synthesis: { icon: Layers, label: "Synthesis", color: "text-green-400" },
  exploration: { icon: Compass, label: "Exploration", color: "text-cyan-400" },
  fundamental_redesign: { icon: Zap, label: "Redesign", color: "text-orange-400" },
};

const MODE_CONFIG: Record<ReasoningMode, { label: string; color: string }> = {
  convergent: { label: "Conv", color: "bg-green-500/10 text-green-400" },
  divergent: { label: "Div", color: "bg-cyan-500/10 text-cyan-400" },
  adaptive: { label: "Adapt", color: "bg-amber-500/10 text-amber-400" },
};

function TemperatureGauge({ value }: { value: number }) {
  // Color transitions: blue (cold/converging) -> yellow (warm) -> red (hot/diverging)
  const getColor = (t: number) => {
    if (t < 0.3) return "bg-blue-400";
    if (t < 0.6) return "bg-amber-400";
    return "bg-red-400";
  };

  return (
    <div className="flex items-center gap-1" title={`Temperature: ${value.toFixed(2)}`}>
      <Thermometer className="w-3 h-3 text-muted-foreground" />
      <div className="w-10 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor(value))}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

function ScoreDeltaIndicator({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-green-400">
        <TrendingUp className="w-3 h-3" />+{delta.toFixed(1)}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="flex items-center gap-0.5 text-[10px] text-red-400">
        <TrendingDown className="w-3 h-3" />{delta.toFixed(1)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
      <Minus className="w-3 h-3" />0.0
    </span>
  );
}

export default function ConvergenceIndicator({
  passNumber,
  totalPasses,
  passType,
  status,
  description,
  rating,
  convergenceCount = 0,
  reasoningMode,
  temperature,
  scoreDelta,
  signalAssessment,
  failureLog,
  divergenceBudgetUsed,
}: ConvergenceIndicatorProps) {
  const config = PASS_CONFIG[passType] || PASS_CONFIG.landscape;
  const Icon = config.icon;
  const modeConfig = reasoningMode ? MODE_CONFIG[reasoningMode] : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-border/40 bg-card/30 overflow-hidden"
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        {/* Pass icon */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            status === "running" ? "bg-primary/10" : "bg-muted/50"
          )}
        >
          {status === "running" ? (
            <RefreshCw className={cn("w-4 h-4 animate-spin", config.color)} />
          ) : status === "converged" ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <Icon className={cn("w-4 h-4", config.color)} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-foreground">
              Pass {passNumber}
            </span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider",
                status === "running"
                  ? "bg-primary/10 text-primary"
                  : status === "converged"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-amber-500/10 text-amber-400"
              )}
            >
              {config.label}
            </span>
            {modeConfig && (
              <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", modeConfig.color)}>
                {modeConfig.label}
              </span>
            )}
            {rating !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                {rating}/10
              </span>
            )}
            {scoreDelta !== undefined && <ScoreDeltaIndicator delta={scoreDelta} />}
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>

        {/* Right side: temperature + convergence progress */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {temperature !== undefined && <TemperatureGauge value={temperature} />}
          <div className="flex items-center gap-1.5">
            <div className="w-16 h-1.5 rounded-full bg-muted-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-green-400 transition-all duration-300"
                style={{ width: `${Math.min((convergenceCount / 100) * 100, 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground tabular-nums">
              {convergenceCount}/100
            </span>
          </div>
        </div>
      </div>

      {/* Signal assessment row (if provided) */}
      {signalAssessment && (
        <div className="px-3.5 py-1.5 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground/80 italic truncate">
            Signal: {signalAssessment}
          </p>
        </div>
      )}

      {/* Failure log row (if provided) */}
      {failureLog && (
        <div className="px-3.5 py-1.5 border-t border-border/20 bg-red-500/3">
          <p className="text-[10px] text-red-400/80 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="truncate">{failureLog}</span>
          </p>
        </div>
      )}

      {/* Divergence budget (if provided and in divergent/adaptive mode) */}
      {divergenceBudgetUsed !== undefined && divergenceBudgetUsed > 0 && (
        <div className="px-3.5 py-1 border-t border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-muted-foreground">Divergence budget:</span>
            <div className="w-20 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  divergenceBudgetUsed > 80 ? "bg-red-400" : divergenceBudgetUsed > 50 ? "bg-amber-400" : "bg-cyan-400"
                )}
                style={{ width: `${Math.min(divergenceBudgetUsed, 100)}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground tabular-nums">{divergenceBudgetUsed}%</span>
          </div>
        </div>
      )}

      {/* Convergence achieved bar */}
      {status === "converged" && (
        <div className="px-3.5 py-1.5 bg-green-500/5 border-t border-green-500/10">
          <p className="text-[10px] text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            Convergence achieved after {totalPasses ?? passNumber} passes
          </p>
        </div>
      )}
    </motion.div>
  );
}
