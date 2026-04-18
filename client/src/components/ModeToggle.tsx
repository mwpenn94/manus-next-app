/**
 * ModeToggle — Speed / Quality mode switch
 *
 * Speed mode: fewer tool turns, faster responses, concise output
 * Quality mode: full tool depth, thorough research, detailed output
 */
import { Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentMode = "speed" | "quality";

interface ModeToggleProps {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
  className?: string;
}

export default function ModeToggle({ mode, onChange, className }: ModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50", className)}>
      <button
        onClick={() => onChange("speed")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
          mode === "speed"
            ? "bg-amber-500/20 text-amber-400 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Speed mode: faster, more concise responses"
      >
        <Zap className="w-3 h-3" />
        Speed
      </button>
      <button
        onClick={() => onChange("quality")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
          mode === "quality"
            ? "bg-primary/20 text-primary shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Quality mode: thorough research, detailed responses"
      >
        <Sparkles className="w-3 h-3" />
        Quality
      </button>
    </div>
  );
}
