import { cn } from "@/lib/utils";

type StatusType =
  | "running"
  | "success"
  | "error"
  | "warning"
  | "pending"
  | "idle"
  | "connected"
  | "disconnected";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusType,
  { color: string; bg: string; label: string }
> = {
  running: {
    color: "text-primary",
    bg: "bg-primary/15",
    label: "Running",
  },
  success: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/15",
    label: "Success",
  },
  error: {
    color: "text-destructive",
    bg: "bg-destructive/15",
    label: "Error",
  },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-400/15",
    label: "Warning",
  },
  pending: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Pending",
  },
  idle: {
    color: "text-muted-foreground",
    bg: "bg-muted",
    label: "Idle",
  },
  connected: {
    color: "text-emerald-400",
    bg: "bg-emerald-400/15",
    label: "Connected",
  },
  disconnected: {
    color: "text-destructive",
    bg: "bg-destructive/15",
    label: "Disconnected",
  },
};

/**
 * StatusBadge — Consistent status indicator used across all capability surfaces.
 * Matches Manus pattern of small, color-coded status pills with optional pulse animation.
 */
export function StatusBadge({
  status,
  label,
  size = "sm",
  pulse = false,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const displayLabel = label ?? config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        config.bg,
        config.color,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
    >
      <span
        className={cn(
          "rounded-full",
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2",
          status === "running" || pulse ? "status-pulse" : "",
          // Use currentColor for the dot
          "bg-current"
        )}
      />
      {displayLabel}
    </span>
  );
}

export default StatusBadge;
