/**
 * LiveOrchestrationGraph — Real-time task orchestration visualization
 *
 * Shows the agent's tool execution flow as a live DAG during streaming.
 * Each tool call becomes a node with status (active/done/failed).
 * Sequential calls are connected with animated edges showing data flow.
 * Nodes are expandable to show tool input/output previews.
 * Time-based layout shows parallel vs sequential execution.
 *
 * Key Manus-parity feature: users see the actual execution graph
 * in real-time, not just a flat list of steps.
 */
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Code, FileText, Search, Image, Terminal,
  Brain, Zap, CheckCircle2, Loader2, XCircle, Clock,
  ChevronDown, ChevronRight, Layers, Maximize2, Minimize2,
  ArrowDown, Timer
} from "lucide-react";

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
  input?: string;
  output?: string;
  startedAt?: number;
  completedAt?: number;
  [key: string]: any;
};

interface OrchestrationNode {
  id: number;
  label: string;
  type: string;
  status: "pending" | "active" | "done" | "failed";
  duration?: number;
  preview?: string;
  input?: string;
  output?: string;
  startedAt?: number;
  completedAt?: number;
  isParallel?: boolean;
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

/** Animated edge connector between nodes */
function AnimatedEdge({ status, isParallel }: { status: string; isParallel?: boolean }) {
  const edgeColor = status === "done" ? "bg-emerald-500/40" : status === "active" ? "bg-blue-500/60" : "bg-border/40";
  return (
    <div className="relative flex items-center justify-center h-4 ml-[15px]">
      <div className={cn("w-px h-full", edgeColor, "transition-colors duration-300")} />
      {/* Animated data flow dot */}
      {status === "active" && (
        <motion.div
          className="absolute w-1.5 h-1.5 rounded-full bg-blue-400"
          initial={{ top: 0, opacity: 0 }}
          animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      )}
      {/* Parallel indicator */}
      {isParallel && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-3 h-px bg-blue-400/40" />
      )}
    </div>
  );
}

/** Expandable node content showing input/output */
function NodeDetails({ node }: { node: OrchestrationNode }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="mt-1.5 pt-1.5 border-t border-border/30 space-y-1">
        {node.input && (
          <div className="text-[10px]">
            <span className="text-muted-foreground/70 font-medium">Input: </span>
            <span className="text-muted-foreground font-mono">{node.input.slice(0, 120)}{node.input.length > 120 ? "..." : ""}</span>
          </div>
        )}
        {node.output && (
          <div className="text-[10px]">
            <span className="text-muted-foreground/70 font-medium">Output: </span>
            <span className="text-muted-foreground font-mono">{node.output.slice(0, 120)}{node.output.length > 120 ? "..." : ""}</span>
          </div>
        )}
        {node.duration !== undefined && node.duration > 0 && (
          <div className="text-[10px] flex items-center gap-1 text-muted-foreground/60">
            <Timer className="w-2.5 h-2.5" />
            <span>{node.duration < 1000 ? `${node.duration}ms` : `${(node.duration / 1000).toFixed(1)}s`}</span>
          </div>
        )}
        {!node.input && !node.output && node.preview && (
          <div className="text-[10px] text-muted-foreground font-mono">
            {node.preview.slice(0, 200)}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LiveOrchestrationGraph({ actions, planSteps, isStreaming, className }: LiveOrchestrationGraphProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"timeline" | "compact">("timeline");

  const toggleNode = useCallback((id: number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Transform agentActions into orchestration nodes with timing data
  const nodes: OrchestrationNode[] = useMemo(() => {
    const result: OrchestrationNode[] = [];

    if (planSteps && planSteps.length > 0) {
      planSteps.forEach((step, i) => {
        const matchingAction = actions[i];
        if (matchingAction) {
          const startedAt = matchingAction.startedAt;
          const completedAt = matchingAction.completedAt;
          const duration = startedAt && completedAt ? completedAt - startedAt : undefined;
          result.push({
            id: i,
            label: getActionLabel(matchingAction) || step,
            type: matchingAction.type,
            status: matchingAction.status === "active" ? "active" : matchingAction.status === "done" ? "done" : "failed",
            preview: matchingAction.preview,
            input: matchingAction.input || matchingAction.query || matchingAction.command || matchingAction.url,
            output: matchingAction.output || matchingAction.preview,
            duration,
            startedAt,
            completedAt,
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
      actions.forEach((action, i) => {
        const startedAt = action.startedAt;
        const completedAt = action.completedAt;
        const duration = startedAt && completedAt ? completedAt - startedAt : undefined;
        // Detect parallel execution: if this action started before the previous one completed
        const prevAction = i > 0 ? actions[i - 1] : null;
        const isParallel = prevAction?.completedAt && startedAt
          ? startedAt < prevAction.completedAt
          : false;
        result.push({
          id: i,
          label: getActionLabel(action),
          type: action.type,
          status: action.status === "active" ? "active" : action.status === "done" ? "done" : "failed",
          preview: action.preview,
          input: action.input || action.query || action.command || action.url,
          output: action.output || action.preview,
          duration,
          startedAt,
          completedAt,
          isParallel,
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
  const totalDuration = nodes.reduce((sum, n) => sum + (n.duration || 0), 0);

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
          {/* Total duration */}
          {totalDuration > 0 && (
            <span className="text-[9px] text-muted-foreground/60 font-mono flex items-center gap-0.5">
              <Timer className="w-2.5 h-2.5" />
              {totalDuration < 1000 ? `${totalDuration}ms` : `${(totalDuration / 1000).toFixed(1)}s`}
            </span>
          )}
          {/* View mode toggle */}
          <button
            onClick={() => setViewMode(v => v === "timeline" ? "compact" : "timeline")}
            className="p-0.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={viewMode === "timeline" ? "Compact view" : "Timeline view"}
          >
            {viewMode === "timeline" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
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
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
          <AnimatePresence mode="popLayout">
            {nodes.map((node, i) => {
              const Icon = TYPE_ICONS[node.type] || Brain;
              const style = STATUS_STYLES[node.status];
              const isExpanded = expandedNodes.has(node.id);
              const hasDetails = node.input || node.output || node.preview || (node.duration && node.duration > 0);
              const prevNode = i > 0 ? nodes[i - 1] : null;
              const edgeStatus = prevNode?.status === "done" ? "done" : prevNode?.status === "active" ? "active" : "pending";

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="relative"
                >
                  {/* Animated edge connector */}
                  {i > 0 && viewMode === "timeline" && (
                    <AnimatedEdge status={edgeStatus} isParallel={node.isParallel} />
                  )}

                  {/* Compact separator */}
                  {i > 0 && viewMode === "compact" && (
                    <div className="h-0.5" />
                  )}

                  {/* Node */}
                  <div
                    className={cn(
                      "flex items-start gap-2.5 px-2.5 py-2 rounded-lg border transition-all duration-200",
                      style.bg, style.border,
                      node.status === "active" && "shadow-md " + style.glow,
                      hasDetails && "cursor-pointer hover:brightness-110",
                      node.isParallel && "ml-4 border-l-2 border-l-blue-400/40",
                    )}
                    onClick={() => hasDetails && toggleNode(node.id)}
                  >
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
                        {/* Duration badge */}
                        {node.duration !== undefined && node.duration > 0 && viewMode === "timeline" && (
                          <span className="text-[9px] text-muted-foreground/50 font-mono ml-auto shrink-0">
                            {node.duration < 1000 ? `${node.duration}ms` : `${(node.duration / 1000).toFixed(1)}s`}
                          </span>
                        )}
                      </div>
                      {/* Inline preview for compact mode */}
                      {!isExpanded && node.preview && node.status === "done" && viewMode === "compact" && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                          {node.preview}
                        </p>
                      )}
                      {/* Expandable details */}
                      <AnimatePresence>
                        {isExpanded && hasDetails && <NodeDetails node={node} />}
                      </AnimatePresence>
                    </div>
                    {/* Expand indicator */}
                    <div className="shrink-0 flex items-center gap-1">
                      {hasDetails && (
                        <ChevronDown className={cn(
                          "w-3 h-3 text-muted-foreground/40 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} />
                      )}
                      <span className="text-[9px] text-muted-foreground/60 font-mono">
                        #{i + 1}
                      </span>
                    </div>
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
              className="flex items-center gap-2 px-2.5 py-1.5 mt-2 text-[10px] text-muted-foreground"
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
