/**
 * LiveOrchestrationGraph — Real-time task orchestration visualization
 *
 * Shows the agent's tool execution flow as a live DAG during streaming.
 * Each tool call becomes a node with status (active/done/failed).
 * Sequential calls are connected with edges showing execution flow.
 * AEGIS plan steps are shown as planned nodes that light up when executed.
 *
 * This is a key Manus-parity feature: users see the actual execution graph
 * in real-time, not just a flat list of steps.
 */
import { useMemo, useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Code, FileText, Search, Image, Terminal,
  Brain, Zap, CheckCircle2, Loader2, XCircle, Clock,
  ChevronDown, ChevronRight, Layers
} from "lucide-react";

// Use the same AgentAction type as TaskContext (discriminated union)
// We extract a label from whatever fields are available
type AgentAction = {
  type: string;
  status: "active" | "done" | "error";
  preview?: string;
  label?: string;
  url?: string;
  query?: string;
  command?: string;
  file?: string;
  element?: string;
  description?: string;
  packages?: string;
  [key: string]: any;
};

interface OrchestrationNode {
  id: number;
  label: string;
  type: string;
  status: "pending" | "active" | "done" | "failed";
  duration?: number;
  preview?: string;
}

interface LiveOrchestrationGraphProps {
  actions: AgentAction[];
  planSteps?: string[];
  isStreaming: boolean;
  className?: string;
}

function getActionLabel(action: AgentAction): string {
  if (action.label) return action.label;
  if (action.url) return action.url.length > 40 ? action.url.slice(0, 40) + "..." : action.url;
  if (action.query) return `Search: ${action.query}`;
  if (action.command) return action.command.length > 40 ? action.command.slice(0, 40) + "..." : action.command;
  if (action.file) return action.file;
  if (action.element) return `Click: ${action.element}`;
  if (action.description) return action.description;
  if (action.packages) return `Install: ${action.packages}`;
  return action.type.charAt(0).toUpperCase() + action.type.slice(1);
}

const TYPE_ICONS: Record<string, typeof Globe> = {
  browsing: Globe,
  searching: Search,
  creating: Code,
  editing: Code,
  writing: FileText,
  thinking: Brain,
  executing: Terminal,
  generating: Image,
  analyzing: Zap,
};

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  done:    { bg: "bg-emerald-500/20", border: "border-emerald-500/50", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  active:  { bg: "bg-blue-500/20", border: "border-blue-500/50", text: "text-blue-400", glow: "shadow-blue-500/30" },
  pending: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-500", glow: "" },
  failed:  { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-400", glow: "shadow-red-500/20" },
};

export default function LiveOrchestrationGraph({ actions, planSteps, isStreaming, className }: LiveOrchestrationGraphProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  // Transform agentActions into orchestration nodes
  const nodes: OrchestrationNode[] = useMemo(() => {
    const result: OrchestrationNode[] = [];

    // First, add plan steps as pending nodes (if available and not yet executed)
    if (planSteps && planSteps.length > 0) {
      planSteps.forEach((step, i) => {
        // Check if this plan step has been executed (match by index or label similarity)
        const matchingAction = actions[i];
        if (matchingAction) {
          result.push({
            id: i,
            label: getActionLabel(matchingAction) || step,
            type: matchingAction.type,
            status: matchingAction.status === "active" ? "active" : matchingAction.status === "done" ? "done" : "failed",
            preview: matchingAction.preview,
          });
        } else {
          result.push({
            id: i,
            label: step,
            type: "thinking",
            status: "pending",
          });
        }
      });
    } else {
      // No plan steps — just show actions as they come
      actions.forEach((action, i) => {
        result.push({
          id: i,
          label: getActionLabel(action),
          type: action.type,
          status: action.status === "active" ? "active" : action.status === "done" ? "done" : "failed",
          preview: action.preview,
        });
      });
    }

    return result;
  }, [actions, planSteps]);

  // Auto-scroll to bottom when new nodes appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [nodes.length]);

  const completedCount = nodes.filter(n => n.status === "done").length;
  const totalCount = nodes.length;
  const activeNode = nodes.find(n => n.status === "active");

  if (nodes.length === 0 && !isStreaming) {
    return (
      <div className={cn("flex items-center justify-center h-full text-muted-foreground text-sm", className)}>
        <div className="text-center space-y-2">
          <Layers className="w-8 h-8 mx-auto opacity-40" />
          <p>No orchestration data yet</p>
          <p className="text-xs opacity-60">Start a task to see the execution graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header with progress */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-0.5 rounded hover:bg-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <span className="text-xs font-medium text-foreground">Execution Graph</span>
          {isStreaming && activeNode && (
            <span className="text-[10px] text-blue-400 animate-pulse">Live</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            {completedCount}/{totalCount}
          </span>
          {/* Mini progress bar */}
          <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : "0%" }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* Graph content */}
      {!collapsed && (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          <AnimatePresence mode="popLayout">
            {nodes.map((node, i) => {
              const Icon = TYPE_ICONS[node.type] || Brain;
              const style = STATUS_STYLES[node.status];
              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="relative"
                >
                  {/* Connector line */}
                  {i > 0 && (
                    <div className="absolute -top-1 left-[15px] w-px h-2 bg-border/50" />
                  )}
                  {/* Node */}
                  <div className={cn(
                    "flex items-start gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200",
                    style.bg, style.border,
                    node.status === "active" && "shadow-md " + style.glow,
                  )}>
                    {/* Status icon */}
                    <div className="shrink-0 mt-0.5">
                      {node.status === "active" ? (
                        <Loader2 className={cn("w-4 h-4 animate-spin", style.text)} />
                      ) : node.status === "done" ? (
                        <CheckCircle2 className={cn("w-4 h-4", style.text)} />
                      ) : node.status === "failed" ? (
                        <XCircle className={cn("w-4 h-4", style.text)} />
                      ) : (
                        <Clock className={cn("w-4 h-4", style.text)} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <Icon className={cn("w-3 h-3 shrink-0", style.text)} />
                        <span className={cn(
                          "text-xs font-medium truncate",
                          node.status === "pending" ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {node.label}
                        </span>
                      </div>
                      {node.preview && node.status === "done" && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {node.preview}
                        </p>
                      )}
                    </div>
                    {/* Step number */}
                    <span className="text-[9px] text-muted-foreground/60 font-mono shrink-0">
                      #{i + 1}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Streaming indicator at bottom */}
          {isStreaming && !activeNode && nodes.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-muted-foreground"
            >
              <div className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span>Processing next step...</span>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
