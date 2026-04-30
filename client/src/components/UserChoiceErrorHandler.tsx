import { useState } from "react";
import { AlertTriangle, ArrowRight, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorOption {
  label: string;
  description?: string;
  action: () => void;
}

interface UserChoiceErrorHandlerProps {
  errorMessage: string;
  options: ErrorOption[];
  onCustomSubmit: (instruction: string) => void;
  className?: string;
}

/**
 * UserChoiceErrorHandler — Manus-style interactive error recovery.
 * Instead of a generic "Retry" button, presents:
 * 1. Plain prose explanation of what went wrong
 * 2. 2-3 clear options the user can choose
 * 3. A text input for custom instruction
 */
export function UserChoiceErrorHandler({
  errorMessage,
  options,
  onCustomSubmit,
  className,
}: UserChoiceErrorHandlerProps) {
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customInput.trim()) {
      onCustomSubmit(customInput.trim());
      setCustomInput("");
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3",
        className
      )}
    >
      {/* Error explanation */}
      <div className="flex items-start gap-2.5">
        <div className="w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
        </div>
        <p className="text-sm text-foreground leading-relaxed">{errorMessage}</p>
      </div>

      {/* Options */}
      {options.length > 0 && (
        <div className="space-y-1.5 pl-8">
          {options.map((option, i) => (
            <button
              key={i}
              onClick={option.action}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/60 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all group"
            >
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              <div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {option.label}
                </span>
                {option.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom instruction toggle + input */}
      <div className="pl-8">
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Or tell me what to do instead...</span>
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Tell me how to proceed..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:border-primary/50 focus:outline-none transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
