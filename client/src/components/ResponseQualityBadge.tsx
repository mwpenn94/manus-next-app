
/**
 * ResponseQualityBadge displays AEGIS quality scores for a completed message.
 * It can render in a compact (default) or expanded view.
 */
import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ResponseQualityBadgeProps {
  quality: Record<string, number> | null | undefined;
  compact?: boolean;
}

const ResponseQualityBadge: React.FC<ResponseQualityBadgeProps> = ({ quality, compact = true }) => {
  if (!quality || Object.keys(quality).length === 0) {
    return null;
  }

  const scores = Object.values(quality);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const dotColor = avgScore > 0.8 ? "bg-green-500" : avgScore > 0.6 ? "bg-amber-500" : "bg-red-500";

  if (compact) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={cn("w-2.5 h-2.5 rounded-full", dotColor)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-card border-border p-2">
            <div className="flex flex-col space-y-1">
              <p className="text-xs font-bold text-foreground">Quality Score</p>
              {Object.entries(quality).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center space-x-2 text-xs">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/, ' ')}</span>
                  <span className="text-foreground font-mono">{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, staggerChildren: 0.05 }}
      className="flex flex-col space-y-1.5 p-3 bg-card border border-border rounded-lg"
    >
      {Object.entries(quality).map(([key, value]) => (
        <motion.div key={key} className="grid grid-cols-3 items-center gap-2 text-xs" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-muted-foreground capitalize truncate">{key.replace(/_/, ' ')}</span>
          <div className="col-span-2 bg-border rounded-full h-1.5">
            <motion.div
              className="bg-primary h-1.5 rounded-full"
              style={{ width: `${Math.max(value * 100, 0)}%`, transformOrigin: "left" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ResponseQualityBadge;
