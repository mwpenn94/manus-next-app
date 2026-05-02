/**
 * InlinePreviewWidgets — Manus-style dark card widgets for terminal/file previews
 *
 * These match the Manus production UI: dark-gray rounded rectangles that appear
 * inline during agent execution to show what command is running or what file
 * is being edited. They are visually distinct from the chat text flow.
 *
 * Design reference (from Manus video analysis):
 * - Dark gray (#1e1e1e) background with subtle border
 * - Rounded corners (8px)
 * - Left-aligned icon + monospace path/command
 * - Compact height (~36px)
 * - Subtle glow/pulse when active
 */
import { useState } from "react";
import { Terminal, FileCode, Globe, Copy, Check, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import sanitizePaths from "@/lib/sanitizePaths";

interface TerminalPreviewProps {
  command: string;
  output?: string;
  isActive?: boolean;
  className?: string;
}

/**
 * TerminalPreview — Dark card showing a command being executed.
 * Matches the Manus "Using terminal" / "Executing command cd /home/ubuntu/m..." widget.
 */
export function TerminalPreview({ command, output, isActive = false, className }: TerminalPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sanitizedCmd = sanitizePaths(command);
  const truncatedCmd = sanitizedCmd.length > 60 ? sanitizedCmd.slice(0, 57) + "..." : sanitizedCmd;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "rounded-lg border overflow-hidden my-1.5 max-w-[400px]",
        "bg-[#1e1e1e] border-[#333]",
        isActive && "ring-1 ring-amber-500/30",
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => output && setExpanded(!expanded)}
      >
        <Terminal className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-amber-400" : "text-[#8b8b8b]")} />
        <span className="text-[11px] font-mono text-[#cccccc] truncate flex-1" title={command}>
          {truncatedCmd}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleCopy}
            className="p-0.5 rounded text-[#666] hover:text-[#aaa] transition-colors"
            title="Copy command"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </button>
          {output && (
            expanded ? <ChevronUp className="w-3 h-3 text-[#666]" /> : <ChevronDown className="w-3 h-3 text-[#666]" />
          )}
        </div>
      </div>

      {/* Expandable output */}
      {expanded && output && (
        <div className="border-t border-[#333] px-3 py-2 max-h-32 overflow-y-auto">
          <pre className="text-[10px] font-mono text-[#999] whitespace-pre-wrap leading-relaxed">
            {sanitizePaths(output)}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

interface FilePreviewProps {
  filePath: string;
  action?: "creating" | "editing" | "reading" | "writing";
  content?: string;
  isActive?: boolean;
  className?: string;
}

/**
 * FilePreview — Dark card showing a file being created/edited.
 * Matches the Manus "Editing file manus_demo/01_research/notes.md" widget.
 */
export function FilePreview({ filePath, action = "editing", content, isActive = false, className }: FilePreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const actionLabel = {
    creating: "Creating",
    editing: "Editing",
    reading: "Reading",
    writing: "Writing",
  }[action];

  const sanitizedPath = sanitizePaths(filePath);
  const fileName = sanitizedPath.split("/").pop() || sanitizedPath;
  const dirPath = sanitizedPath.includes("/") ? sanitizedPath.slice(0, sanitizedPath.lastIndexOf("/")) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "rounded-lg border overflow-hidden my-1.5 max-w-[400px]",
        "bg-[#1e1e1e] border-[#333]",
        isActive && "ring-1 ring-violet-500/30",
        className
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none"
        onClick={() => content && setExpanded(!expanded)}
      >
        <FileCode className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-violet-400" : "text-[#8b8b8b]")} />
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] text-[#777]">{actionLabel}</span>
          <span className="text-[11px] font-mono text-[#cccccc] truncate" title={filePath}>
            {fileName}
          </span>
          {dirPath && (
            <span className="text-[9px] text-[#555] truncate hidden sm:inline">
              {dirPath}
            </span>
          )}
        </div>
        {content && (
          expanded ? <ChevronUp className="w-3 h-3 text-[#666] shrink-0" /> : <ChevronDown className="w-3 h-3 text-[#666] shrink-0" />
        )}
      </div>

      {/* Expandable content preview */}
      {expanded && content && (
        <div className="border-t border-[#333] px-3 py-2 max-h-40 overflow-y-auto">
          <pre className="text-[10px] font-mono text-[#999] whitespace-pre-wrap leading-relaxed">
            {content.length > 500 ? content.slice(0, 500) + "\n..." : content}
          </pre>
        </div>
      )}
    </motion.div>
  );
}

interface BrowserPreviewProps {
  url: string;
  title?: string;
  screenshot?: string;
  isActive?: boolean;
  className?: string;
}

/**
 * BrowserPreview — Dark card showing a URL being browsed.
 * Matches the Manus "Browsing [url]" inline widget with optional screenshot.
 */
export function BrowserPreview({ url, title, screenshot, isActive = false, className }: BrowserPreviewProps) {
  let displayUrl: string;
  try {
    const u = new URL(url);
    displayUrl = u.hostname + (u.pathname.length > 30 ? u.pathname.slice(0, 27) + "..." : u.pathname);
  } catch {
    displayUrl = url.length > 50 ? url.slice(0, 47) + "..." : url;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "rounded-lg border overflow-hidden my-1.5 max-w-[400px]",
        "bg-[#1e1e1e] border-[#333]",
        isActive && "ring-1 ring-emerald-500/30",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <Globe className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-emerald-400" : "text-[#8b8b8b]")} />
        <div className="flex-1 min-w-0">
          {title && <p className="text-[11px] text-[#cccccc] truncate">{title}</p>}
          <p className="text-[10px] font-mono text-[#777] truncate">{displayUrl}</p>
        </div>
        <button
          onClick={() => window.open(url, "_blank")}
          className="p-0.5 rounded text-[#666] hover:text-[#aaa] transition-colors shrink-0"
          title="Open in new tab"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Optional screenshot */}
      {screenshot && (
        <div className="border-t border-[#333]">
          <img
            src={screenshot}
            alt="Browser screenshot"
            className="w-full h-auto max-h-40 object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(url, "_blank")}
            loading="lazy"
          />
        </div>
      )}
    </motion.div>
  );
}
