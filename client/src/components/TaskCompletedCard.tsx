/**
 * TaskCompletedCard — Manus-style task completion indicator with star rating
 *
 * Shows green checkmark "Task completed" text, then a "Rate this result"
 * bar with 5 interactive star icons. Matches the Manus mobile UI exactly.
 */
import { useState } from "react";
import { Check, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TaskCompletedCardProps {
  taskId: string;
  onRate?: (taskId: string, rating: number) => void;
  className?: string;
}

export default function TaskCompletedCard({ taskId, onRate, className }: TaskCompletedCardProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = (value: number) => {
    setRating(value);
    setSubmitted(true);
    onRate?.(taskId, value);
  };

  const displayRating = hoveredStar || rating;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Task completed indicator */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <span className="text-sm font-medium text-emerald-500">Task completed</span>
      </motion.div>

      {/* Rating widget */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between max-w-md"
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
                    ? "text-amber-400 fill-amber-400"
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
