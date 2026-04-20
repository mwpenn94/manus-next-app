/**
 * TakeControlCard — Manus-style inline card for sandbox take-over flow
 *
 * When the agent needs the user to interact with the sandbox browser
 * (e.g., login, CAPTCHA, personal info), this card appears with
 * "Take control" / "Return control" buttons.
 */
import { Monitor, Hand, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TakeControlCardProps {
  /** What the agent needs the user to do */
  reason: string;
  /** Whether user currently has control */
  userHasControl: boolean;
  onTakeControl?: () => void;
  onReturnControl?: () => void;
  className?: string;
}

export default function TakeControlCard({
  reason,
  userHasControl,
  onTakeControl,
  onReturnControl,
  className,
}: TakeControlCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card border border-border rounded-xl p-4 max-w-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Monitor className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">
          {userHasControl ? "You have control" : "Agent needs your help"}
        </span>
      </div>

      {/* Explanation */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {userHasControl
          ? "You're currently controlling the sandbox. Return control to the agent when you're done."
          : reason}
      </p>

      {/* Action */}
      {!userHasControl ? (
        <button
          onClick={onTakeControl}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Hand className="w-4 h-4" />
          Take control
        </button>
      ) : (
        <button
          onClick={onReturnControl}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
        >
          <ArrowLeftRight className="w-4 h-4" />
          Return control to agent
        </button>
      )}
    </motion.div>
  );
}
