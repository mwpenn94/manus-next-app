/**
 * ModeToggle — Speed / Quality / Max mode switch
 *
 * Speed mode: fewer tool turns, faster responses, concise output
 * Quality mode: full tool depth, thorough research, detailed output
 * Max mode: flagship tier — maximum tools, deepest research, most thorough output
 */
import { Zap, Sparkles, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentMode = "speed" | "quality" | "max";

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
        aria-pressed={mode === "speed"}
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
        aria-pressed={mode === "quality"}
      >
        <Sparkles className="w-3 h-3" />
        Quality
      </button>
      <button
        onClick={() => onChange("max")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
          mode === "max"
            ? "bg-violet-500/20 text-violet-400 shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Max mode: flagship tier — deepest research, most thorough responses"
        aria-pressed={mode === "max"}
      >
        <Crown className="w-3 h-3" />
        Max
      </button>
    </div>
  );
}
