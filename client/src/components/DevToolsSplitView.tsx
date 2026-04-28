/**
 * DevToolsSplitView — Responsive split-screen layout for developer tools.
 * Desktop (md+): resizable horizontal split. Mobile: tabbed view.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface DevToolsSplitViewProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  defaultLeftSize?: number;
  minLeftSize?: number;
  minRightSize?: number;
  className?: string;
}

export default function DevToolsSplitView({
  leftPanel, rightPanel, leftLabel = "Editor", rightLabel = "Preview",
  defaultLeftSize = 50, minLeftSize = 25, minRightSize = 25, className,
}: DevToolsSplitViewProps) {
  const [mobileTab, setMobileTab] = useState<"left" | "right">("left");
  return (
    <div className={cn("h-full w-full", className)}>
      <div className="hidden md:flex h-full">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={defaultLeftSize} minSize={minLeftSize}>
            <div className="h-full overflow-auto">{leftPanel}</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel minSize={minRightSize}>
            <div className="h-full overflow-auto">{rightPanel}</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <div className="md:hidden h-full flex flex-col">
        <div className="flex border-b border-border shrink-0">
          <button onClick={() => setMobileTab("left")} className={cn("flex-1 py-2.5 text-sm font-medium text-center transition-colors", mobileTab === "left" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>{leftLabel}</button>
          <button onClick={() => setMobileTab("right")} className={cn("flex-1 py-2.5 text-sm font-medium text-center transition-colors", mobileTab === "right" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>{rightLabel}</button>
        </div>
        <div className="flex-1 overflow-auto">{mobileTab === "left" ? leftPanel : rightPanel}</div>
      </div>
    </div>
  );
}
