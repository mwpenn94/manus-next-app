/**
 * DevToolsSplitView — Resizable split panel for dev tools
 * Desktop: ResizablePanelGroup with drag handle
 * Mobile: Tabbed fallback with leftLabel/rightLabel
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

interface DevToolsSplitViewProps {
  leftLabel: string;
  rightLabel: string;
  left: React.ReactNode;
  right: React.ReactNode;
  defaultLeftSize?: number;
  className?: string;
}

export default function DevToolsSplitView({
  leftLabel,
  rightLabel,
  left,
  right,
  defaultLeftSize = 50,
  className,
}: DevToolsSplitViewProps) {
  const [mobileTab, setMobileTab] = useState<"left" | "right">("left");

  return (
    <div className={cn("h-full", className)}>
      {/* Desktop: Resizable split */}
      <div className="hidden md:flex h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={defaultLeftSize} minSize={20}>
            <div className="h-full overflow-auto">
              {left}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={100 - defaultLeftSize} minSize={20}>
            <div className="h-full overflow-auto">
              {right}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: Tabbed fallback */}
      <div className="md:hidden h-full flex flex-col">
        <div className="flex border-b border-border">
          <button
            onClick={() => setMobileTab("left")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium transition-colors",
              mobileTab === "left"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            {leftLabel}
          </button>
          <button
            onClick={() => setMobileTab("right")}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium transition-colors",
              mobileTab === "right"
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground"
            )}
          >
            {rightLabel}
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {mobileTab === "left" ? left : right}
        </div>
      </div>
    </div>
  );
}
