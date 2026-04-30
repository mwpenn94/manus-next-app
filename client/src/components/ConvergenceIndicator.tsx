/**
 * ConvergenceIndicator — Manus-style "Pass N Convergence" visual indicator
 *
 * Renders inline in chat to show the agent's self-debugging/optimization loop progress.
 * Displays pass number, pass type, and convergence status.
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PassType =
  | "landscape"
  | "depth"
  | "adversarial"
  | "future_state"
  | "synthesis"
  | "fundamental_redesign";

export type ConvergenceStatus = "running" | "converged" | "needs_more";

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
  fundamental_redesign: { icon: Zap, label: "Redesign", color: "text-orange-400" },
};

export default function ConvergenceIndicator({
  passNumber,
  totalPasses,
  passType,
  status,
  description,
  rating,
  convergenceCount = 0,
}: ConvergenceIndicatorProps) {
  const config = PASS_CONFIG[passType];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-border/40 bg-card/30 overflow-hidden"
    >
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
          <div className="flex items-center gap-2">
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
            {rating !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                {rating}/10
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>

        {/* Convergence progress */}
        <div className="flex items-center gap-1.5 shrink-0">
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

      {/* Convergence status bar */}
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
