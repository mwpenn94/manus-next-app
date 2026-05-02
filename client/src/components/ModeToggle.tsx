/**
 * ModeToggle — Speed / Quality / Max / Limitless mode switch
 *
 * Speed mode: fewer tool turns, faster responses, concise output (Manus 1.6 Lite aligned)
 * Quality mode: full tool depth, thorough research, detailed output (Manus 1.6 aligned)
 * Max mode: flagship tier — strategic, autonomous, deep chains (Manus 1.6 Max aligned)
 * Limitless mode: no constraints — unlimited depth and continuity, runs as long as needed
 */
import { Zap, Sparkles, Crown, Infinity } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentMode = "speed" | "quality" | "max" | "limitless";

interface ModeToggleProps {
  mode: AgentMode;
  onChange: (mode: AgentMode) => void;
  className?: string;
}

const MODES: { id: AgentMode; label: string; icon: typeof Zap; title: string; activeClass: string }[] = [
  {
    id: "speed",
    label: "Speed",
    icon: Zap,
    title: "Speed mode: faster, more concise responses (Manus 1.6 Lite aligned)",
    activeClass: "bg-muted text-foreground shadow-sm",
  },
  {
    id: "quality",
    label: "Quality",
    icon: Sparkles,
    title: "Quality mode: thorough research, detailed responses (Manus 1.6 aligned)",
    activeClass: "bg-primary/20 text-primary shadow-sm",
  },
  {
    id: "max",
    label: "Max",
    icon: Crown,
    title: "Max mode: flagship tier — strategic, autonomous, deep chains (Manus 1.6 Max aligned)",
    activeClass: "bg-violet-500/20 text-violet-400 shadow-sm",
  },
  {
    id: "limitless",
    label: "Limitless",
    icon: Infinity,
    title: "Limitless mode: no constraints — unlimited depth and continuity, runs as long as needed",
    activeClass: "bg-primary/20 text-primary shadow-sm",
  },
];

export default function ModeToggle({ mode, onChange, className }: ModeToggleProps) {
  return (
    <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50", className)}>
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
              isActive ? m.activeClass : "text-muted-foreground hover:text-foreground"
            )}
            title={m.title}
            aria-pressed={isActive}
          >
            <Icon className="w-3 h-3" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
