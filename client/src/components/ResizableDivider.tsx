/**
 * ResizableDivider — Draggable splitter between panels
 *
 * Features:
 * - Drag to resize left/right panels
 * - Double-click to reset to default position
 * - Persists position to localStorage
 * - Min/max width constraints
 * - Visual hover/active indicator
 * - Keyboard accessible (arrow keys)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "manus-workspace-divider-pos";
const DEFAULT_RATIO = 0.5; // 50/50 split
const MIN_RATIO = 0.25; // min 25% for either panel
const MAX_RATIO = 0.75; // max 75% for either panel

interface ResizableDividerProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onRatioChange: (ratio: number) => void;
  className?: string;
}

export function useWorkspaceDivider() {
  const [ratio, setRatio] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= MIN_RATIO && parsed <= MAX_RATIO) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_RATIO;
  });

  const updateRatio = useCallback((newRatio: number) => {
    const clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, newRatio));
    setRatio(clamped);
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch {}
  }, []);

  const resetRatio = useCallback(() => {
    setRatio(DEFAULT_RATIO);
    try {
      localStorage.setItem(STORAGE_KEY, DEFAULT_RATIO.toString());
    } catch {}
  }, []);

  return { ratio, updateRatio, resetRatio };
}

export default function ResizableDivider({
  containerRef,
  onRatioChange,
  className,
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    []
  );

  const handleDoubleClick = useCallback(() => {
    onRatioChange(DEFAULT_RATIO);
    try {
      localStorage.setItem(STORAGE_KEY, DEFAULT_RATIO.toString());
    } catch {}
  }, [onRatioChange]);

  // Global mouse move/up handlers during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = x / rect.width;
      const clamped = Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio));
      onRatioChange(clamped);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // Prevent text selection during drag
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, containerRef, onRatioChange]);

  // Keyboard accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const step = 0.02; // 2% per keypress
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const dividerRect = dividerRef.current?.getBoundingClientRect();
        if (dividerRect) {
          const currentRatio = (dividerRect.left - rect.left) / rect.width;
          onRatioChange(currentRatio - step);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const dividerRect = dividerRef.current?.getBoundingClientRect();
        if (dividerRect) {
          const currentRatio = (dividerRect.left - rect.left) / rect.width;
          onRatioChange(currentRatio + step);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        onRatioChange(DEFAULT_RATIO);
      }
    },
    [containerRef, onRatioChange]
  );

  return (
    <div
      ref={dividerRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={50}
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative w-1 shrink-0 cursor-col-resize select-none group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className
      )}
    >
      {/* Wider hit area for easier grabbing */}
      <div className="absolute inset-y-0 -left-1 -right-1" />

      {/* Visual indicator line */}
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 -translate-x-1/2 w-[2px] rounded-full transition-all duration-150",
          isDragging
            ? "bg-primary w-[3px]"
            : isHovered
              ? "bg-primary/60 w-[3px]"
              : "bg-border/60"
        )}
      />

      {/* Drag handle dots (visible on hover/drag) */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity duration-150",
          isDragging || isHovered ? "opacity-100" : "opacity-0"
        )}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "w-1 h-1 rounded-full",
              isDragging ? "bg-primary" : "bg-muted-foreground/60"
            )}
          />
        ))}
      </div>
    </div>
  );
}
