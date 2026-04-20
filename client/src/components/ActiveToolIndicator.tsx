/**
 * ActiveToolIndicator — Manus-style "Agent is using [Tool]" indicator
 *
 * Shows below the streaming content during task execution to indicate
 * which tool the agent is currently using and what file/resource it's operating on.
 * Matches Manus: icon in circle + "Manus Next is using Editor" + context description.
 */
import {
  Globe, Search, Terminal, PenLine, Loader2,
  FileCode, Image, Brain, MousePointerClick,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentAction } from "@/contexts/TaskContext";

// ── Tool metadata ──

const TOOL_META: Record<string, { icon: typeof Globe; label: string }> = {
  browsing:    { icon: Globe,              label: "Browser" },
  searching:   { icon: Search,             label: "Search" },
  executing:   { icon: Terminal,           label: "Terminal" },
  creating:    { icon: FileCode,           label: "Editor" },
  generating:  { icon: Image,              label: "Image Generator" },
  thinking:    { icon: Brain,              label: "Reasoning" },
  writing:     { icon: PenLine,            label: "Editor" },
  researching: { icon: Search,             label: "Research" },
  scrolling:   { icon: Globe,              label: "Browser" },
  clicking:    { icon: MousePointerClick,  label: "Browser" },
};

function getToolDescription(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return action.url ? `Navigating to ${truncateUrl(action.url)}` : "Browsing web page";
    case "searching":
      return action.query ? `Searching "${action.query}"` : "Searching the web";
    case "executing":
      return action.command ? `Running ${action.command}` : "Executing code";
    case "creating":
      return action.file ? `Editing file ${action.file}` : "Creating file";
    case "generating":
      return action.description ? `Generating ${action.description}` : "Generating content";
    case "thinking":
      return "Analyzing and reasoning";
    case "writing":
      return action.label ? `Writing ${action.label}` : "Writing content";
    case "researching":
      return action.label ? `Researching ${action.label}` : "Researching topic";
    case "scrolling":
      return "Scrolling page";
    case "clicking":
      return action.element ? `Clicking ${action.element}` : "Interacting with page";
    default:
      return "Processing";
  }
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 30 ? u.pathname.slice(0, 30) + "..." : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 50 ? url.slice(0, 50) + "..." : url;
  }
}

// ── Props ──

interface ActiveToolIndicatorProps {
  actions: AgentAction[];
  streaming: boolean;
}

// ── Main Component ──

export default function ActiveToolIndicator({ actions, streaming }: ActiveToolIndicatorProps) {
  const activeAction = actions.find((a) => a.status === "active");

  if (!streaming || !activeAction) return null;

  const meta = TOOL_META[activeAction.type] || TOOL_META.thinking;
  const Icon = meta.icon;
  const description = getToolDescription(activeAction);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeAction.type + description}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-3 px-4 py-3"
      >
        {/* Tool icon in circle — matches Manus screenshot style */}
        <div className="w-10 h-10 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-foreground" />
        </div>

        {/* Label + description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Manus Next is using </span>
              <span className="font-medium">{meta.label}</span>
            </p>
            <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {description}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
