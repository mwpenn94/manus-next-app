
import * as React from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, Undo } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * AutoTitleRefinement shows when a task title has been auto-refined by the LLM.
 * It displays the original and refined titles, and provides actions to accept or revert the suggestion.
 */
interface AutoTitleRefinementProps {
  /** The original title before refinement. */
  originalTitle: string;
  /** The new, AI-suggested title. */
  refinedTitle: string;
  /** Callback function to accept the new title. */
  onAccept: () => void;
  /** Callback function to revert to the original title. */
  onRevert: () => void;
  /** Optional additional class names. */
  className?: string;
}

const AutoTitleRefinement: React.FC<AutoTitleRefinementProps> = ({
  originalTitle,
  refinedTitle,
  onAccept,
  onRevert,
  className,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -15, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn(
        "flex items-center w-full gap-4 p-2 pl-3 pr-1 rounded-md bg-card border border-border text-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 flex-grow min-w-0">
        <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
        <div className="flex flex-col flex-grow min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="truncate text-foreground">{refinedTitle}</p>
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
              AI suggested
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate line-through">{originalTitle}</p>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0 gap-0.5">
        <Button variant="ghost" size="icon" onClick={onAccept} aria-label="Accept suggestion">
          <Check className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRevert} aria-label="Revert to original">
          <Undo className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default AutoTitleRefinement;
