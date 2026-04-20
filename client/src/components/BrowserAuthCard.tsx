/**
 * BrowserAuthCard — Manus-style inline chat card for browser authorization
 *
 * Matches the Manus pattern: Globe icon, explanation text,
 * three stacked buttons: "No, use default browser", "Check again",
 * "Use My Browser on Crimson-Hawk"
 */
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type BrowserChoice = "default" | "check" | "crimson-hawk";

interface BrowserAuthCardProps {
  onChoice: (choice: BrowserChoice) => void;
  disabled?: boolean;
  className?: string;
}

export default function BrowserAuthCard({ onChoice, disabled, className }: BrowserAuthCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-5 max-w-md",
        className
      )}
    >
      {/* Header with globe icon and explanation */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Globe className="w-4.5 h-4.5 text-primary" />
        </div>
        <p className="text-sm text-foreground leading-relaxed">
          Authorize Manus to use a new tab from My Browser to complete your task.
        </p>
      </div>

      {/* Three stacked action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onChoice("default")}
          disabled={disabled}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          No, use default browser
        </button>
        <button
          onClick={() => onChoice("check")}
          disabled={disabled}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          Check again
        </button>
        <button
          onClick={() => onChoice("crimson-hawk")}
          disabled={disabled}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-accent transition-colors disabled:opacity-50"
        >
          Use My Browser on Crimson-Hawk
        </button>
      </div>
    </div>
  );
}
