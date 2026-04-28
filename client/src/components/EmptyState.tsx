import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

/**
 * EmptyState — Consistent empty state component for pages without data.
 * Matches Manus pattern of centered, minimal empty states with clear CTAs.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6 text-center",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3
        className="text-lg font-semibold text-foreground mb-1.5"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} size="sm" className="gap-1.5">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
