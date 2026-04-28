import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * SlidePanel — Manus-aligned right-side overlay panel.
 * Slides in from the right with backdrop dimming.
 * Used for notifications, file browsers, settings, detail views.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  width = "w-[420px] max-w-[90vw]",
  children,
  className,
}: SlidePanelProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="slide-panel-backdrop"
        data-state={open ? "open" : "closed"}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn("slide-panel", width, className)}
        data-state={open ? "open" : "closed"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </>
  );
}

export default SlidePanel;
