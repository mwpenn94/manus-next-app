/**
 * AgentPresenceIndicator — Unified real-time presence system
 *
 * Deeply aligned with Manus's visual language:
 * - Inline colored action badges (verb + detail)
 * - "Manus is using [Tool]" header with live pulse
 * - Smooth state transitions between Thinking → Tool Use → Generating
 * - Contextual descriptions for each tool action
 *
 * States represented:
 * 1. Thinking (no tool active, no text streaming) — brain pulse animation
 * 2. Tool Execution (tool_start received) — tool-specific icon + label + context
 * 3. Generating (delta streaming, no active tool) — pen animation
 * 4. Reconnecting — connection retry indicator
 */
import { useState, useEffect, useRef } from "react";
import {
  Globe, Search, Terminal, PenLine,
  FileCode, Image, Brain, MousePointerClick,
  Package, Hammer, BookOpen, GitBranch,
  BarChart3, Palette, Send, WifiOff, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AgentAction } from "@/contexts/TaskContext";

// ── Agent State Derivation ──

type AgentPresenceState =
  | "thinking"
  | "tool_active"
  | "generating"
  | "reconnecting"
  | "idle";

interface PresenceProps {
  actions: AgentAction[];
  streaming: boolean;
  hasStreamContent?: boolean;
  isReconnecting?: boolean;
  /** Knowledge recalled badge — shows count of cross-session memories injected */
  knowledgeRecalled?: { count: number; keys: string[] } | null;
}

function deriveState(props: PresenceProps): AgentPresenceState {
  if (!props.streaming) return "idle";
  if (props.isReconnecting) return "reconnecting";

  const activeAction = props.actions.find((a) => a.status === "active");
  if (activeAction) return "tool_active";
  if (props.hasStreamContent) return "generating";
  return "thinking";
}

// ── Tool Metadata ──

const TOOL_META: Record<string, {
  icon: typeof Globe;
  label: string;
  color: string;
  bgColor: string;
  pulseColor: string;
}> = {
  browsing:    { icon: Globe,              label: "Browser",          color: "text-emerald-400", bgColor: "bg-emerald-500/15", pulseColor: "ring-emerald-500/20" },
  searching:   { icon: Search,             label: "Search",           color: "text-blue-400",    bgColor: "bg-blue-500/15",    pulseColor: "ring-blue-500/20" },
  executing:   { icon: Terminal,           label: "Terminal",         color: "text-amber-400",   bgColor: "bg-amber-500/15",   pulseColor: "ring-amber-500/20" },
  creating:    { icon: FileCode,           label: "Editor",           color: "text-violet-400",  bgColor: "bg-violet-500/15",  pulseColor: "ring-violet-500/20" },
  generating:  { icon: Image,              label: "Image Generator",  color: "text-pink-400",    bgColor: "bg-pink-500/15",    pulseColor: "ring-pink-500/20" },
  thinking:    { icon: Brain,              label: "Reasoning",        color: "text-purple-400",  bgColor: "bg-purple-500/15",  pulseColor: "ring-purple-500/20" },
  writing:     { icon: PenLine,            label: "Editor",           color: "text-violet-400",  bgColor: "bg-violet-500/15",  pulseColor: "ring-violet-500/20" },
  researching: { icon: Search,             label: "Research",         color: "text-cyan-400",    bgColor: "bg-cyan-500/15",    pulseColor: "ring-cyan-500/20" },
  scrolling:   { icon: Globe,              label: "Browser",          color: "text-emerald-400", bgColor: "bg-emerald-500/15", pulseColor: "ring-emerald-500/20" },
  clicking:    { icon: MousePointerClick,  label: "Browser",          color: "text-emerald-400", bgColor: "bg-emerald-500/15", pulseColor: "ring-emerald-500/20" },
  building:    { icon: Hammer,             label: "Builder",          color: "text-orange-400",  bgColor: "bg-orange-500/15",  pulseColor: "ring-orange-500/20" },
  editing:     { icon: PenLine,            label: "Editor",           color: "text-violet-400",  bgColor: "bg-violet-500/15",  pulseColor: "ring-violet-500/20" },
  reading:     { icon: BookOpen,           label: "Reader",           color: "text-sky-400",     bgColor: "bg-sky-500/15",     pulseColor: "ring-sky-500/20" },
  installing:  { icon: Package,            label: "Package Manager",  color: "text-green-400",   bgColor: "bg-green-500/15",   pulseColor: "ring-green-500/20" },
  versioning:  { icon: GitBranch,          label: "Version Control",  color: "text-rose-400",    bgColor: "bg-rose-500/15",    pulseColor: "ring-rose-500/20" },
  analyzing:   { icon: BarChart3,          label: "Analyzer",         color: "text-indigo-400",  bgColor: "bg-indigo-500/15",  pulseColor: "ring-indigo-500/20" },
  designing:   { icon: Palette,            label: "Designer",         color: "text-fuchsia-400", bgColor: "bg-fuchsia-500/15", pulseColor: "ring-fuchsia-500/20" },
  sending:     { icon: Send,               label: "Messenger",        color: "text-teal-400",    bgColor: "bg-teal-500/15",    pulseColor: "ring-teal-500/20" },
};

function getToolDescription(action: AgentAction): string {
  switch (action.type) {
    case "browsing":
      return action.url ? `Navigating to ${truncateUrl(action.url)}` : "Browsing web page";
    case "searching":
      return action.query ? `Searching "${action.query}"` : "Searching the web";
    case "executing":
      return action.command ? `Running ${truncateCmd(action.command)}` : "Executing code";
    case "creating":
      return action.file ? `Editing ${action.file}` : "Creating file";
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
    case "building":
      return action.label || "Building project";
    case "editing":
      return action.file ? `Editing ${action.file}` : "Editing file";
    case "reading":
      return action.file ? `Reading ${action.file}` : "Reading file";
    case "installing":
      return action.label || "Installing dependencies";
    case "versioning":
      return action.label || "Managing version control";
    case "analyzing":
      return action.label || "Analyzing data";
    case "designing":
      return action.label || "Designing interface";
    case "sending":
      return action.label || "Sending notification";
    default:
      return "Processing";
  }
}

function truncateUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 25 ? u.pathname.slice(0, 25) + "..." : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + "..." : url;
  }
}

function truncateCmd(cmd: string): string {
  return cmd.length > 40 ? cmd.slice(0, 40) + "..." : cmd;
}

// ── Elapsed Timer ──

function ElapsedTimer() {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ── Live Pulse Dot ──

function LivePulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn(
        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
        color
      )} />
      <span className={cn(
        "relative inline-flex rounded-full h-2 w-2",
        color
      )} />
    </span>
  );
}

// ── Thinking State ──

function ThinkingPresence({ knowledgeRecalled }: { knowledgeRecalled?: { count: number; keys: string[] } | null }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-card ring-1 ring-border animate-pulse">
        <img src="/manus-storage/white_marble_hero_29fc0d2e.png" alt="" className="w-5 h-5 rounded-full" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          <span className="text-muted-foreground">Manus is </span>
          <span className="font-medium">thinking</span>
        </span>
        <LivePulseDot color="bg-purple-400" />
        <ElapsedTimer />
        {knowledgeRecalled && knowledgeRecalled.count > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-medium" title={knowledgeRecalled.keys.join(", ")}>
            Knowledge recalled({knowledgeRecalled.count})
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Generating State ──

function GeneratingPresence() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        "bg-violet-500/15 ring-1 ring-violet-500/20"
      )}>
        <PenLine className="w-4 h-4 text-violet-400" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          <span className="text-muted-foreground">Manus is </span>
          <span className="font-medium">writing</span>
        </span>
        <LivePulseDot color="bg-violet-400" />
      </div>
    </motion.div>
  );
}

// ── Tool Active State ──

function ToolActivePresence({ action }: { action: AgentAction }) {
  const meta = TOOL_META[action.type] || TOOL_META.thinking;
  const Icon = meta.icon;
  const description = getToolDescription(action);

  return (
    <motion.div
      key={action.type + description}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        meta.bgColor, `ring-1 ${meta.pulseColor}`
      )}>
        <Icon className={cn("w-4 h-4", meta.color)} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">
            <span className="text-muted-foreground">Manus is using </span>
            <span className="font-medium">{meta.label}</span>
          </span>
          <LivePulseDot color={meta.color.replace("text-", "bg-")} />
          <ElapsedTimer />
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

// ── Reconnecting State ──

function ReconnectingPresence() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex items-center gap-3 px-3 py-2"
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        "bg-amber-500/15 ring-1 ring-amber-500/20"
      )}>
        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-foreground">
          <span className="text-muted-foreground">Connection lost — </span>
          <span className="font-medium text-amber-400">reconnecting</span>
        </span>
        <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
      </div>
    </motion.div>
  );
}

// ── Main Exported Component ──

export default function ActiveToolIndicator({
  actions,
  streaming,
  hasStreamContent = false,
  isReconnecting = false,
  knowledgeRecalled = null,
}: PresenceProps) {
  const state = deriveState({ actions, streaming, hasStreamContent, isReconnecting });
  const activeAction = actions.find((a) => a.status === "active");

  if (state === "idle") return null;

  return (
    <AnimatePresence mode="wait">
      {state === "thinking" && <ThinkingPresence key="thinking" knowledgeRecalled={knowledgeRecalled} />}
      {state === "tool_active" && activeAction && (
        <ToolActivePresence key={`tool-${activeAction.type}`} action={activeAction} />
      )}
      {state === "generating" && <GeneratingPresence key="generating" />}
      {state === "reconnecting" && <ReconnectingPresence key="reconnecting" />}
    </AnimatePresence>
  );
}
