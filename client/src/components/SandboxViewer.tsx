/**
 * SandboxViewer — "Manus's computer" panel
 *
 * Full-screen overlay showing the agent's sandbox environment.
 * Features:
 * - Header: close (X) button, title "Manus's computer", takeover button
 * - Code viewer with file name header + syntax-aware display
 * - Diff/Original/Modified tab switcher (segmented control)
 * - Browser preview mode when agent is browsing
 * - Active tool indicator ("Manus is using Editor")
 * - Progress scrubber with Live indicator
 * - Floating left toolbar (back, interact, keyboard, clipboard, phone, close)
 * - Step navigation (|◀ • Live ▶|)
 */
import { useState, useMemo } from "react";
import {
  X,
  MonitorSmartphone,
  ArrowLeftToLine,
  Hand,
  Keyboard,
  ClipboardCopy,
  Smartphone,
  XCircle,
  SkipBack,
  SkipForward,
  PenLine,
  Globe,
  Terminal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentAction } from "@/contexts/TaskContext";

// ── Types ──

type ViewMode = "diff" | "original" | "modified";

interface SandboxViewerProps {
  open: boolean;
  onClose: () => void;
  actions: AgentAction[];
  streaming: boolean;
  /** Currently active file being edited */
  activeFile?: string;
  /** Code content for the active file */
  codeContent?: string;
  /** Original code content (before edits) for diff view */
  originalContent?: string;
  /** Browser screenshot URL when in browser mode */
  browserScreenshot?: string;
  /** Browser URL when in browser mode */
  browserUrl?: string;
  /** Step progress for scrubber */
  stepProgress?: { completed: number; total: number; turn: number } | null;
}

// ── Diff Highlighting ──

function DiffLine({ line, type, lineNum }: { line: string; type: "added" | "removed" | "unchanged"; lineNum: number }) {
  return (
    <div
      className={cn(
        "flex font-mono text-xs leading-6 whitespace-pre-wrap break-all",
        type === "added" && "bg-muted/50",
        type === "removed" && "bg-red-500/10"
      )}
    >
      <span className="w-12 shrink-0 text-right pr-3 select-none text-muted-foreground border-r border-border/30">
        {lineNum}
      </span>
      <span
        className={cn(
          "w-5 shrink-0 text-center select-none",
          type === "added" && "text-muted-foreground",
          type === "removed" && "text-red-400",
          type === "unchanged" && "text-muted-foreground"
        )}
      >
        {type === "added" ? "+" : type === "removed" ? "-" : " "}
      </span>
      <span
        className={cn(
          "flex-1 px-3",
          type === "added" && "text-muted-foreground",
          type === "removed" && "text-red-300 line-through opacity-70",
          type === "unchanged" && "text-muted-foreground"
        )}
      >
        {line || " "}
      </span>
    </div>
  );
}

function computeSimpleDiff(
  original: string,
  modified: string
): Array<{ line: string; type: "added" | "removed" | "unchanged" }> {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const origSet = new Set(origLines);
  const modSet = new Set(modLines);

  const result: Array<{ line: string; type: "added" | "removed" | "unchanged" }> = [];

  for (const line of modLines) {
    if (!origSet.has(line)) {
      result.push({ line, type: "added" });
    } else {
      result.push({ line, type: "unchanged" });
    }
  }

  const removedLines = origLines.filter((l) => !modSet.has(l));
  const finalResult: typeof result = [];
  let removedIdx = 0;
  for (const item of result) {
    if (item.type === "added" && removedIdx < removedLines.length) {
      finalResult.push({ line: removedLines[removedIdx], type: "removed" });
      removedIdx++;
    }
    finalResult.push(item);
  }
  while (removedIdx < removedLines.length) {
    finalResult.push({ line: removedLines[removedIdx], type: "removed" });
    removedIdx++;
  }

  return finalResult;
}

// ── Code Line Numbers ──

function CodeLine({ line, lineNum }: { line: string; lineNum: number }) {
  return (
    <div className="flex font-mono text-xs leading-6 whitespace-pre-wrap break-all">
      <span className="w-12 shrink-0 text-right pr-3 select-none text-muted-foreground border-r border-border/30">
        {lineNum}
      </span>
      <span className="flex-1 px-3 text-foreground">{line || " "}</span>
    </div>
  );
}

// ── Tool Icon ──

function getToolInfo(
  actions: AgentAction[]
): { icon: typeof PenLine; label: string; description: string } | null {
  const active = actions.find((a) => a.status === "active");
  if (!active) return null;

  switch (active.type) {
    case "creating":
      return {
        icon: PenLine,
        label: "Editor",
        description: `Editing file ${active.file || "..."}`,
      };
    case "writing":
      return {
        icon: PenLine,
        label: "Editor",
        description: `Writing ${active.label || "content"}`,
      };
    case "browsing":
      return {
        icon: Globe,
        label: "Browser",
        description: `Browsing ${active.url || "web page"}`,
      };
    case "executing":
      return {
        icon: Terminal,
        label: "Terminal",
        description: `Running ${active.command || "command"}`,
      };
    case "searching":
      return {
        icon: Globe,
        label: "Search",
        description: `Searching "${active.query || "..."}"`,
      };
    default:
      return {
        icon: PenLine,
        label: "Editor",
        description: "Processing...",
      };
  }
}

// ── Floating Toolbar ──

function FloatingToolbar() {
  const tools = [
    { icon: ArrowLeftToLine, label: "Back", separator: true },
    { icon: Hand, label: "Interact" },
    { icon: Keyboard, label: "Keyboard" },
    { icon: ClipboardCopy, label: "Clipboard" },
    { icon: Smartphone, label: "Phone", separator: true },
    { icon: XCircle, label: "Close" },
  ];

  const handleToolClick = (label: string) => {
    // These are visual-only controls for the sandbox viewer
    // In production Manus, these control the remote desktop session
    console.log(`[SandboxViewer] Toolbar action: ${label}`);
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 hidden md:flex">
      <div className="flex flex-col items-center gap-0 bg-muted/80 backdrop-blur-sm rounded-2xl border border-border/50 py-2 px-1.5 shadow-xl">
        {tools.map((tool, i) => (
          <div key={tool.label}>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              title={tool.label}
              onClick={() => handleToolClick(tool.label)}
            >
              <tool.icon className="w-5 h-5" />
            </button>
            {tool.separator && i < tools.length - 1 && (
              <div className="w-6 h-px bg-border/50 mx-auto my-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

export default function SandboxViewer({
  open,
  onClose,
  actions,
  streaming,
  activeFile,
  codeContent,
  originalContent,
  browserScreenshot,
  browserUrl,
  stepProgress,
}: SandboxViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("modified");
  const [userHasControl, setUserHasControl] = useState(false);

  const toolInfo = useMemo(() => getToolInfo(actions), [actions]);

  // Detect if we're in browser mode
  const isBrowserMode = useMemo(() => {
    const active = actions.find((a) => a.status === "active");
    return active?.type === "browsing" || active?.type === "scrolling" || active?.type === "clicking";
  }, [actions]);

  const diffLines = useMemo(() => {
    if (viewMode !== "diff" || !originalContent || !codeContent) return [];
    return computeSimpleDiff(originalContent, codeContent);
  }, [viewMode, originalContent, codeContent]);

  const displayContent = useMemo(() => {
    if (viewMode === "original") return originalContent || "";
    if (viewMode === "modified") return codeContent || "";
    return "";
  }, [viewMode, originalContent, codeContent]);

  const progressPercent = stepProgress
    ? Math.min(100, (stepProgress.completed / Math.max(1, stepProgress.total)) * 100)
    : streaming
      ? 75
      : 0;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
        role="dialog"
        aria-label="Sandbox viewer"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            title="Close"
            aria-label="Close sandbox viewer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2
            className="text-base font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Manus's computer
          </h2>
          <button
            onClick={() => setUserHasControl(!userHasControl)}
            className={cn(
              "h-9 px-3 rounded-full border flex items-center gap-2 text-sm font-medium transition-all",
              userHasControl
                ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                : "bg-muted/50 border-border text-foreground hover:bg-muted"
            )}
            title={userHasControl ? "Return control" : "Take control"}
            aria-label={userHasControl ? "Return control to agent" : "Take control of sandbox"}
          >
            <MonitorSmartphone className="w-4 h-4" />
            <span className="hidden sm:inline">{userHasControl ? "Return control" : "Take control"}</span>
          </button>
        </div>

        {/* Main content area */}
        <div className="flex-1 relative overflow-hidden px-4 md:px-8 pb-4">
          <FloatingToolbar />

          {/* Content card */}
          <div className="h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden md:ml-16">
            {/* Browser mode */}
            {isBrowserMode ? (
              <>
                {/* URL bar */}
                {browserUrl && (
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {browserUrl}
                    </span>
                  </div>
                )}
                <div className="flex-1 overflow-auto bg-white relative">
                  {browserUrl ? (
                    <iframe
                      src={browserUrl}
                      className="w-full h-full border-0 absolute inset-0"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      title="Browser preview"
                    />
                  ) : browserScreenshot ? (
                    <img
                      src={browserScreenshot}
                      alt="Browser preview"
                      className="w-full h-auto"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center">
                        <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Browser preview loading...</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* File name header */}
                {activeFile && (
                  <div className="px-4 py-2.5 border-b border-border bg-muted/30 text-center">
                    <span className="text-xs text-muted-foreground font-mono">
                      {activeFile}
                    </span>
                  </div>
                )}

                {/* Code content */}
                <div className="flex-1 overflow-auto">
                  {viewMode === "diff" && diffLines.length > 0 ? (
                    <div className="py-2">
                      {diffLines.map((dl, i) => (
                        <DiffLine key={i} line={dl.line} type={dl.type} lineNum={i + 1} />
                      ))}
                    </div>
                  ) : displayContent ? (
                    <div className="py-2">
                      {displayContent.split("\n").map((line, i) => (
                        <CodeLine key={i} line={line} lineNum={i + 1} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center h-full text-muted-foreground p-12">
                      <div className="text-center">
                        <MonitorSmartphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Waiting for agent activity...</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          Code and file edits will appear here
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* View mode tabs — segmented control at bottom */}
                <div className="flex items-center justify-center gap-0.5 py-2 px-4 border-t border-border bg-muted/20">
                  <div className="inline-flex bg-muted/50 rounded-lg p-0.5">
                    {(["diff", "original", "modified"] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={cn(
                          "px-4 py-1.5 rounded-md text-xs font-medium transition-all capitalize",
                          viewMode === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === "diff" ? "Diff" : mode === "original" ? "Original" : "Modified"}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom section: tool indicator + scrubber + navigation */}
        <div className="px-4 md:px-8 pb-4 space-y-3 shrink-0">
          {/* Active tool indicator */}
          {toolInfo && streaming && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-muted/50 border border-border flex items-center justify-center shrink-0">
                <toolInfo.icon className="w-5 h-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-foreground">
                    <span className="text-muted-foreground">Manus is using </span>
                    <span className="font-medium">{toolInfo.label}</span>
                  </p>
                  <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {toolInfo.description}
                </p>
              </div>
            </div>
          )}

          {/* Progress scrubber */}
          <div className="px-4">
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground/40 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step navigation */}
          <div className="flex items-center justify-center gap-8 py-2">
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Previous step"
              aria-label="Previous step"
              onClick={() => console.log('[SandboxViewer] Previous step')}
            >
              <SkipBack className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  streaming ? "bg-foreground animate-pulse" : "bg-muted-foreground/40"
                )}
              />
              <span className="text-sm font-medium text-foreground">
                {streaming ? "Live" : "Paused"}
              </span>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Next step"
              aria-label="Next step"
              onClick={() => console.log('[SandboxViewer] Next step')}
            >
              <SkipForward className="w-6 h-6" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
