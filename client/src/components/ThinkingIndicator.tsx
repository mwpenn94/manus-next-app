import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  label?: string;
  variant?: "dots" | "pulse" | "bar";
  className?: string;
}

/**
 * ThinkingIndicator — Manus-aligned "is thinking..." / "is working" status.
 * Provides visual feedback during AI processing with multiple animation variants.
 */
export function ThinkingIndicator({
  label = "Thinking",
  variant = "dots",
  className,
}: ThinkingIndicatorProps) {
  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="w-2 h-2 rounded-full bg-primary status-pulse" />
        <span className="text-sm text-muted-foreground">{label}...</span>
      </div>
    );
  }

  if (variant === "bar") {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary status-pulse" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{
              animation: "thinking-bar 2s ease-in-out infinite",
              width: "40%",
            }}
          />
        </div>
      </div>
    );
  }

  // Default: dots
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex gap-1">
        <div className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary" />
        <div className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary" />
        <div className="thinking-dot w-1.5 h-1.5 rounded-full bg-primary" />
      </div>
    </div>
  );
}

export default ThinkingIndicator;
