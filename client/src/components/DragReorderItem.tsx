
/**
 * A React component that wraps a child element to make it draggable for reordering within a list.
 * It uses the HTML5 drag and drop API and provides visual feedback during the drag operation.
 */
import * as React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragReorderItemProps {
  /** Unique identifier for the draggable item. */
  id: string;
  /** The index of the item in the list. */
  index: number;
  /** Callback function triggered when an item is dropped. */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** The content to be made draggable. */
  children: React.ReactNode;
  /** Whether the item is disabled and cannot be dragged. */
  disabled?: boolean;
}

const DragReorderItem = React.forwardRef<HTMLDivElement, DragReorderItemProps>(
  ({ id, index, onReorder, children, disabled = false }, ref) => {
    const [isDragging, setIsDragging] = React.useState(false);
    const [isDropTarget, setIsDropTarget] = React.useState(false);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
      setTimeout(() => setIsDragging(true), 0);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault(); // Necessary to allow dropping
      if (disabled) return;
      e.dataTransfer.dropEffect = "move";
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      setIsDropTarget(true);
    };

    const handleDragLeave = () => {
      setIsDropTarget(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (disabled) return;
      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      if (fromIndex !== index) {
        onReorder(fromIndex, index);
      }
      setIsDropTarget(false);
    };

    return (
      <div
        ref={ref}
        draggable={!disabled}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative group bg-card text-foreground transition-opacity",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          { "opacity-30": isDragging },
          { "cursor-grab": !disabled, "cursor-not-allowed": disabled }
        )}
        aria-disabled={disabled}
      >
        <div
          className={cn(
            "absolute top-0 left-0 right-0 bottom-0 border-2 border-transparent rounded-md transition-colors pointer-events-none",
            { "border-blue-500": isDropTarget }
          )}
          aria-hidden="true"
        />
        {!disabled && (
          <div className="absolute top-1/2 -translate-y-1/2 left-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        {children}
      </div>
    );
  }
);

DragReorderItem.displayName = "DragReorderItem";

export default DragReorderItem;
