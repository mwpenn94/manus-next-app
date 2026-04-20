/**
 * TaskPauseCard — Manus-style inline card shown when the agent pauses
 * and needs user guidance/input to continue.
 *
 * Shows a pause icon, explanation of what the agent needs,
 * and action buttons (e.g., "Provide input", "Skip", "Cancel task").
 */
import { Pause, MessageSquare, SkipForward, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export type PauseReason =
  | "needs_guidance"
  | "needs_credentials"
  | "needs_confirmation"
  | "needs_file"
  | "rate_limited"
  | "error_recovery";

interface TaskPauseCardProps {
  reason: PauseReason;
  message: string;
  onProvideInput?: () => void;
  onSkip?: () => void;
  onCancel?: () => void;
  className?: string;
}

const REASON_CONFIG: Record<PauseReason, { label: string; color: string }> = {
  needs_guidance: { label: "Needs your guidance", color: "text-amber-500" },
  needs_credentials: { label: "Needs credentials", color: "text-amber-500" },
  needs_confirmation: { label: "Needs confirmation", color: "text-blue-500" },
  needs_file: { label: "Needs a file", color: "text-amber-500" },
  rate_limited: { label: "Rate limited", color: "text-orange-500" },
  error_recovery: { label: "Error — needs help", color: "text-destructive" },
};

export default function TaskPauseCard({
  reason,
  message,
  onProvideInput,
  onSkip,
  onCancel,
  className,
}: TaskPauseCardProps) {
  const config = REASON_CONFIG[reason];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-amber-500/30 rounded-xl p-4 max-w-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Pause className="w-4 h-4 text-amber-500" />
        </div>
        <span className={cn("text-sm font-semibold", config.color)}>
          {config.label}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {message}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {onProvideInput && (
          <button
            onClick={onProvideInput}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="w-4 h-4" />
            Provide input
          </button>
        )}
        {onSkip && (
          <button
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Skip this step
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-destructive text-sm hover:bg-destructive/10 transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Cancel task
          </button>
        )}
      </div>
    </motion.div>
  );
}
