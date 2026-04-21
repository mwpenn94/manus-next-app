/**
 * CheckpointCard — Manus-style inline card showing a saved checkpoint
 *
 * Matches the Manus pattern: small thumbnail preview, checkpoint description,
 * expandable/clickable to open preview. Shows "Rollback" for older checkpoints.
 */
import { Check, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckpointCardProps {
  description: string;
  screenshotUrl?: string;
  isLatest?: boolean;
  onPreview?: () => void;
  onRollback?: () => void;
  className?: string;
}

export default function CheckpointCard({
  description,
  screenshotUrl,
  isLatest,
  onPreview,
  onRollback,
  className,
}: CheckpointCardProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl overflow-hidden max-w-md cursor-pointer hover:border-primary/30 transition-colors group",
        className
      )}
      onClick={onPreview}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        {screenshotUrl ? (
          <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
            <img
              src={screenshotUrl}
              alt="Checkpoint preview"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-muted-foreground" />
          </div>
        )}

        {/* Description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {description}
          </p>
          {isLatest && (
            <span className="text-[10px] text-foreground/70 font-medium">Latest</span>
          )}
        </div>

        {/* Actions */}
        {!isLatest && onRollback && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRollback();
            }}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Rollback to this checkpoint"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
