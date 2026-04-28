import { useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressiveDisclosureProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * ProgressiveDisclosure — Manus-aligned expandable action block.
 * Used for task execution logs, settings groups, and detail sections.
 * Matches the pattern: grouped expandable blocks that prevent overwhelm
 * while allowing drill-down into specific steps.
 */
export function ProgressiveDisclosure({
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
  className,
}: ProgressiveDisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return (
    <div
      className={cn(
        "rounded-lg border border-border overflow-hidden",
        className
      )}
    >
      {/* Trigger */}
      <button
        onClick={toggle}
        className="disclosure-trigger w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
        aria-expanded={open}
      >
        <ChevronRight
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0",
            open && "rotate-90"
          )}
        />
        {icon && (
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {title}
            </span>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </button>

      {/* Content */}
      <div
        className="disclosure-content"
        data-state={open ? "open" : "closed"}
      >
        <div className="px-4 pb-4 pt-1 border-t border-border/50">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ProgressiveDisclosure;
