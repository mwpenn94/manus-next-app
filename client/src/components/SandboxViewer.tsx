/**
 * SandboxViewer — "Manus's computer" panel
 *
 * Full-screen overlay showing the agent's sandbox environment.
 * Features:
 * - Header: close (X) button, title "Manus's computer", takeover button
 * - Code viewer with file name header + syntax highlighting (react-syntax-highlighter)
 * - Diff/Original/Modified tab switcher (segmented control) with proper diff (diff library)
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
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { diffLines as computeDiffLines, Change } from "diff";

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

// ── File Extension to Language Mapping ──

function getLanguageFromFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    ps1: "powershell",
    md: "markdown",
    mdx: "mdx",
    graphql: "graphql",
    gql: "graphql",
    dockerfile: "docker",
    makefile: "makefile",
    vue: "markup",
    svelte: "markup",
    env: "bash",
    ini: "ini",
    conf: "nginx",
    tf: "hcl",
    proto: "protobuf",
    r: "r",
    dart: "dart",
    lua: "lua",
    zig: "zig",
    wasm: "wasm",
  };
  return map[ext] || "text";
}

// ── Diff View with proper diff library ──

interface DiffViewProps {
  original: string;
  modified: string;
}

function DiffView({ original, modified }: DiffViewProps) {
  const changes = useMemo(() => computeDiffLines(original, modified), [original, modified]);

  let lineNum = 0;
  return (
    <div className="py-2 font-mono text-xs">
      {changes.map((change: Change, idx: number) => {
        const lines = change.value.split("\n");
        // Remove trailing empty string from split
        if (lines[lines.length - 1] === "") lines.pop();

        return lines.map((line, lineIdx) => {
          lineNum++;
          const type = change.added ? "added" : change.removed ? "removed" : "unchanged";
          return (
            <div
              key={`${idx}-${lineIdx}`}
              className={cn(
                "flex leading-6 whitespace-pre-wrap break-all",
                type === "added" && "bg-green-500/10",
                type === "removed" && "bg-red-500/10"
              )}
            >
              <span className="w-12 shrink-0 text-right pr-3 select-none text-muted-foreground border-r border-border/30">
                {lineNum}
              </span>
              <span
                className={cn(
                  "w-5 shrink-0 text-center select-none",
                  type === "added" && "text-green-400",
                  type === "removed" && "text-red-400",
                  type === "unchanged" && "text-muted-foreground"
                )}
              >
                {type === "added" ? "+" : type === "removed" ? "-" : " "}
              </span>
              <span
                className={cn(
                  "flex-1 px-3",
                  type === "added" && "text-green-300",
                  type === "removed" && "text-red-300 line-through opacity-70",
                  type === "unchanged" && "text-muted-foreground"
                )}
              >
                {line || " "}
              </span>
            </div>
          );
        });
      })}
    </div>
  );
}

// ── Syntax Highlighted Code View ──

const syntaxThemeOverrides: Record<string, React.CSSProperties> = {
  'code[class*="language-"]': {
    background: "transparent",
    fontSize: "12px",
    lineHeight: "1.5rem",
  },
  'pre[class*="language-"]': {
    background: "transparent",
    margin: 0,
    padding: "0.5rem 0",
  },
};

// Merge oneDark with our overrides
const customStyle = { ...oneDark, ...syntaxThemeOverrides };

function CodeView({ content, filename }: { content: string; filename?: string }) {
  const language = filename ? getLanguageFromFile(filename) : "text";

  return (
    <SyntaxHighlighter
      language={language}
      style={customStyle}
      showLineNumbers
      lineNumberStyle={{
        minWidth: "3rem",
        paddingRight: "1rem",
        textAlign: "right",
        color: "var(--color-muted-foreground)",
        borderRight: "1px solid oklch(0.3 0 0 / 0.3)",
        marginRight: "0.75rem",
        userSelect: "none",
      }}
      customStyle={{
        background: "transparent",
        margin: 0,
        padding: "0.5rem 0",
        fontSize: "12px",
        lineHeight: "1.5rem",
      }}
      wrapLongLines
    >
      {content}
    </SyntaxHighlighter>
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
                  {viewMode === "diff" && originalContent && codeContent ? (
                    <DiffView original={originalContent} modified={codeContent} />
                  ) : (codeContent || originalContent) ? (
                    <CodeView
                      content={viewMode === "original" ? (originalContent || "") : (codeContent || "")}
                      filename={activeFile}
                    />
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
