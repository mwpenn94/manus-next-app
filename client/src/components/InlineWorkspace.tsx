import { useState } from "react";
import { Monitor, Terminal, FileCode, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceAction {
  id: string;
  type: "read" | "write" | "execute" | "browse" | "think";
  label: string;
  detail?: string;
  timestamp?: string;
  status?: "running" | "done" | "error";
}

interface InlineWorkspaceProps {
  actions: WorkspaceAction[];
  title?: string;
  collapsed?: boolean;
  className?: string;
}

const ACTION_ICONS = {
  read: FileCode,
  write: FileCode,
  execute: Terminal,
  browse: Monitor,
  think: Monitor,
};

const ACTION_COLORS = {
  read: "text-blue-400",
  write: "text-emerald-400",
  execute: "text-amber-400",
  browse: "text-purple-400",
  think: "text-muted-foreground",
};

/**
 * InlineWorkspace — Manus-aligned "computer" panel that appears inline in chat/task streams.
 * Shows the AI's actions in real-time: reading files, writing code, executing commands, browsing.
 * Provides transparency into the agent's process with progressive disclosure.
 */
export function InlineWorkspace({
  actions,
  title = "Sovereign AI's workspace",
  collapsed: initialCollapsed = false,
  className,
}: InlineWorkspaceProps) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const runningCount = actions.filter((a) => a.status === "running").length;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/50 overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-accent/30 transition-colors"
      >
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Monitor className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground flex-1 text-left">
          {title}
        </span>
        {runningCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary status-pulse">
            {runningCount} active
          </span>
        )}
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Actions list */}
      {!collapsed && (
        <div className="border-t border-border/50 bg-background/30 max-h-[300px] overflow-y-auto">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.type];
            return (
              <div
                key={action.id}
                className="flex items-start gap-2.5 px-4 py-2 border-b border-border/30 last:border-0"
              >
                <Icon
                  className={cn(
                    "w-3.5 h-3.5 mt-0.5 shrink-0",
                    ACTION_COLORS[action.type]
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    {action.label}
                  </p>
                  {action.detail && (
                    <p
                      className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate"
                      title={action.detail}
                    >
                      {action.detail}
                    </p>
                  )}
                </div>
                {action.status === "running" && (
                  <div className="flex gap-0.5 mt-1">
                    <div className="thinking-dot w-1 h-1 rounded-full bg-primary" />
                    <div className="thinking-dot w-1 h-1 rounded-full bg-primary" />
                    <div className="thinking-dot w-1 h-1 rounded-full bg-primary" />
                  </div>
                )}
                {action.status === "done" && (
                  <span className="text-[10px] text-emerald-400">done</span>
                )}
                {action.status === "error" && (
                  <span className="text-[10px] text-destructive">error</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default InlineWorkspace;
