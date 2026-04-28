/**
 * TaskCompletedCard — Manus-style task completion indicator with star rating
 *
 * Shows green checkmark "Task completed" text, replay link, share button,
 * then a "Rate this result" bar with 5 interactive star icons.
 * Matches the Manus mobile UI exactly.
 */
import { useState } from "react";
import { Check, Star, RotateCcw, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

interface TaskCompletedCardProps {
  taskId: string;
  onRate?: (taskId: string, rating: number) => void;
  onShare?: () => void;
  className?: string;
}

export default function TaskCompletedCard({ taskId, onRate, onShare, className }: TaskCompletedCardProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [, navigate] = useLocation();

  const handleRate = (value: number) => {
    setRating(value);
    setSubmitted(true);
    onRate?.(taskId, value);
  };

  const displayRating = hoveredStar || rating;

  return (
    <div className={cn("space-y-3 w-full", className)}>
      {/* Task completed indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Task completed</span>
      </motion.div>

      {/* Replay & Share row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex items-center gap-2"
      >
        <button
          onClick={() => navigate(`/task/${taskId}?replay=1`)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card border border-border/60 rounded-lg hover:bg-accent transition-colors"
          aria-label="View replay"
        >
          <RotateCcw className="w-3 h-3" />
          View Replay
        </button>
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card border border-border/60 rounded-lg hover:bg-accent transition-colors"
            aria-label="Share task"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        )}
      </motion.div>

      {/* Rating widget */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border/60 rounded-xl px-4 py-3 flex items-center justify-between max-w-md"
      >
        <span className="text-sm text-muted-foreground">
          {submitted ? "Thanks for your feedback!" : "Rate this result"}
        </span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => handleRate(value)}
              onMouseEnter={() => setHoveredStar(value)}
              onMouseLeave={() => setHoveredStar(0)}
              disabled={submitted}
              className={cn(
                "p-0.5 transition-all",
                submitted ? "cursor-default" : "cursor-pointer hover:scale-110"
              )}
              aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "w-5 h-5 transition-colors",
                  value <= displayRating
                    ? "text-foreground fill-foreground"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
