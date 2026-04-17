/**
 * TaskView — "Warm Void" Manus-Authentic Task Interface
 * 
 * Convergence Pass 1: Enhanced streaming simulation, richer action steps,
 * workspace tabs (Browser, Code, Terminal), progress timeline, typing indicator.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { useRoute } from "wouter";
import { useTask, type Message, type AgentAction } from "@/contexts/TaskContext";
import {
  Send,
  Paperclip,
  Globe,
  MousePointer2,
  ScrollText,
  Terminal,
  FileText,
  Search,
  ImageIcon,
  Brain,
  ChevronDown,
  ChevronUp,
  Share2,
  Bookmark,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  SkipForward,
  Loader2,
  Code,
  MonitorPlay,
  ExternalLink,
  Copy,
  RotateCcw,
  CheckCircle2,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";

const WORKSPACE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663357378777/mLRoMfUBgPHZe3zeGnUGcR/workspace-browser-preview-M5EZ4xXZcCHLkWY7VcLLGZ.webp";

// ── Action rendering ──

function ActionIcon({ type }: { type: AgentAction["type"] }) {
  const iconClass = "w-3 h-3";
  switch (type) {
    case "browsing": return <Globe className={cn(iconClass, "text-blue-400")} />;
    case "scrolling": return <ScrollText className={cn(iconClass, "text-muted-foreground")} />;
    case "clicking": return <MousePointer2 className={cn(iconClass, "text-amber-400")} />;
    case "executing": return <Terminal className={cn(iconClass, "text-green-400")} />;
    case "creating": return <FileText className={cn(iconClass, "text-purple-400")} />;
    case "searching": return <Search className={cn(iconClass, "text-cyan-400")} />;
    case "generating": return <ImageIcon className={cn(iconClass, "text-pink-400")} />;
    case "thinking": return <Brain className={cn(iconClass, "text-primary")} />;
  }
}

function ActionLabel({ action }: { action: AgentAction }) {
  switch (action.type) {
    case "browsing": return <span>Browsing <span className="text-muted-foreground font-mono text-[11px] break-all">{action.url}</span></span>;
    case "scrolling": return <span>Scrolling page</span>;
    case "clicking": return <span>Clicking <span className="text-muted-foreground">{action.element}</span></span>;
    case "executing": return <span>Running <code className="text-[11px] bg-muted/50 px-1 py-0.5 rounded">{action.command}</code></span>;
    case "creating": return <span>Creating <code className="text-[11px] bg-muted/50 px-1 py-0.5 rounded">{action.file}</code></span>;
    case "searching": return <span>Searching <span className="text-muted-foreground italic">"{action.query}"</span></span>;
    case "generating": return <span>Generating <span className="text-muted-foreground">{action.description}</span></span>;
    case "thinking": return <span>Reasoning about next steps...</span>;
  }
}

function ActionStep({ action, index, total }: { action: AgentAction; index: number; total: number }) {
  const isActive = action.status === "active";
  const isDone = action.status === "done";

  return (
    <div className="flex items-start gap-2.5 py-1.5 px-3 relative">
      {/* Timeline line */}
      {index < total - 1 && (
        <div className="absolute left-[21px] top-[22px] w-px h-[calc(100%-6px)] bg-border" />
      )}
      {/* Status dot */}
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px relative z-10",
        isActive ? "bg-primary/20" : isDone ? "bg-muted" : "bg-muted/50"
      )}>
        {isActive ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ActionIcon type={action.type} />
        )}
      </div>
      {/* Label */}
      <div className="flex-1 min-w-0 text-xs text-foreground/80 leading-relaxed pt-0.5">
        <ActionLabel action={action} />
      </div>
    </div>
  );
}

// ── Typing indicator ──

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <span className="text-sm">🐾</span>
      </div>
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/30">
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

// ── Message bubble ──

function MessageBubble({ message, isLast }: { message: Message; isLast: boolean }) {
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const isUser = message.role === "user";
  const hasActions = message.actions && message.actions.length > 0;
  const doneCount = message.actions?.filter(a => a.status === "done").length ?? 0;
  const totalCount = message.actions?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 mb-5", isUser ? "flex-row-reverse" : "")}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm">🐾</span>
        </div>
      )}

      <div className={cn("max-w-[80%]", isUser ? "ml-auto" : "")}>
        {/* Sender label */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              manus next
            </span>
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Message content */}
        <div
          className={cn(
            "rounded-xl text-sm leading-relaxed",
            isUser
              ? "bg-primary/12 border border-primary/20 text-foreground px-4 py-3"
              : "text-foreground/90"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}
        </div>

        {/* Action steps */}
        {hasActions && (
          <div className="mt-2.5">
            <button
              onClick={() => setActionsExpanded(!actionsExpanded)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1.5 group"
            >
              {actionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>
                {doneCount === totalCount ? (
                  <span className="text-emerald-400">{totalCount} steps completed</span>
                ) : (
                  <span>{doneCount} of {totalCount} steps</span>
                )}
              </span>
            </button>
            <AnimatePresence>
              {actionsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden bg-card/50 rounded-lg border border-border/50 py-1"
                >
                  {message.actions!.map((action, i) => (
                    <ActionStep key={i} action={action} index={i} total={totalCount} />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* User timestamp */}
        {isUser && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Workspace Panel ──

type WorkspaceTab = "browser" | "code" | "terminal";

function WorkspacePanel({ task }: { task: ReturnType<typeof useTask>["activeTask"] }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("browser");

  if (!task) return null;

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Globe }[] = [
    { id: "browser", label: "Browser", icon: Globe },
    { id: "code", label: "Code", icon: Code },
    { id: "terminal", label: "Terminal", icon: Terminal },
  ];

  return (
    <div className={cn(
      "border-l border-border bg-card flex flex-col transition-all duration-300 shrink-0",
      expanded ? "w-[560px]" : "w-[400px]"
    )}>
      {/* Workspace Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <MonitorPlay className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-xs font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Manus's Computer
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-0 border-b border-border shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
        <div className="ml-auto pr-2">
          {task.status === "running" && (
            <div className="flex items-center gap-1.5 px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">live</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "browser" && (
          <>
            {/* URL Bar */}
            {task.workspaceUrl && (
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
                    {task.workspaceUrl}
                  </span>
                </div>
                <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Open in new tab">
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
            {/* Browser Preview */}
            <div className="flex-1 h-full">
              <img
                src={WORKSPACE_IMG}
                alt="Browser preview"
                className="w-full h-full object-cover object-top"
              />
            </div>
          </>
        )}

        {activeTab === "code" && (
          <div className="p-4 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-mono">research_summary.md</span>
              <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <pre className="text-xs text-foreground/80 font-mono leading-relaxed whitespace-pre-wrap">
{`# Autonomous AI Systems — Research Summary

## Key Findings

### 1. Multi-Agent Coordination
Recent advances in multi-agent systems show
promising results in collaborative task solving.
Frameworks like CrewAI and AutoGen enable
sophisticated agent orchestration.

### 2. Browser-Based Agents
Playwright and CDP-based approaches dominate
the browser automation landscape for AI agents.
Key challenges: anti-bot detection, dynamic
content handling, and session management.

### 3. Computer Use
Anthropic's computer use API and similar
approaches enable visual interaction with
desktop applications. Screen parsing accuracy
has improved significantly.

## Recommendations
- Adopt hybrid Playwright + CDP approach
- Implement robust retry mechanisms
- Use vision models for complex UI navigation`}
            </pre>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="p-4 h-full overflow-y-auto bg-[oklch(0.1_0.005_60)]">
            <pre className="text-xs font-mono leading-relaxed">
              <span className="text-green-400">ubuntu@manus</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-blue-400">~/research</span>
              <span className="text-muted-foreground">$ </span>
              <span className="text-foreground">wget -O paper.pdf https://arxiv.org/pdf/2401.xxxxx</span>
              {"\n"}
              <span className="text-muted-foreground">--2026-04-17 15:30:12--</span>
              {"\n"}
              <span className="text-muted-foreground">Resolving arxiv.org... 151.101.1.42</span>
              {"\n"}
              <span className="text-muted-foreground">HTTP request sent, awaiting response... 200 OK</span>
              {"\n"}
              <span className="text-muted-foreground">Length: 2,847,291 (2.7M) [application/pdf]</span>
              {"\n"}
              <span className="text-muted-foreground">Saving to: 'paper.pdf'</span>
              {"\n\n"}
              <span className="text-foreground">paper.pdf           100%[==================&gt;]   2.71M  12.4MB/s    in 0.2s</span>
              {"\n\n"}
              <span className="text-green-400">ubuntu@manus</span>
              <span className="text-muted-foreground">:</span>
              <span className="text-blue-400">~/research</span>
              <span className="text-muted-foreground">$ </span>
              <span className="text-foreground typing-cursor">python3 analyze.py --input paper.pdf</span>
            </pre>
          </div>
        )}
      </div>

      {/* Timeline / Progress */}
      <div className="h-10 flex items-center justify-between px-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <button className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors" title="Jump to live">
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-muted-foreground">
            {task.status === "running" ? "Watching live" : "Session ended"}
          </span>
        </div>
        {task.totalSteps && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((task.completedSteps || 0) / task.totalSteps) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
              {task.completedSteps || 0}/{task.totalSteps}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main TaskView ──

export default function TaskView() {
  const [, params] = useRoute("/task/:id");
  const { tasks, activeTask, setActiveTask, addMessage } = useTask();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Set active task from URL
  useEffect(() => {
    if (params?.id) {
      setActiveTask(params.id);
    }
  }, [params?.id, setActiveTask]);

  const task = activeTask || tasks.find((t) => t.id === params?.id);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [task?.messages.length]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [task?.id]);

  const isTyping = useMemo(() => {
    if (!task) return false;
    const lastMsg = task.messages[task.messages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.actions?.some(a => a.status === "active");
  }, [task]);

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Task not found</p>
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage(task.id, { role: "user", content: input });
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="h-full flex">
      {/* ── CONVERSATION PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Task Header */}
        <div className="h-12 flex items-center justify-between px-6 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate" style={{ fontFamily: "var(--font-heading)" }}>
              {task.title}
            </h2>
            {task.status === "running" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0">
                Running
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Share">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Bookmark">
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="More">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
          {task.messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} isLast={i === task.messages.length - 1} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>

        {/* Input */}
        <div className="px-6 pb-4 pt-2 border-t border-border shrink-0">
          <div className="relative bg-card border border-border rounded-xl focus-within:border-primary/30 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Send a message..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-10 text-foreground placeholder:text-muted-foreground focus:outline-none text-sm leading-relaxed"
            />
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Attach file">
                  <Paperclip className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                  input.trim()
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-muted-foreground"
                )}
                title="Send"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Manus Next may make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* ── WORKSPACE PANEL ── */}
      <WorkspacePanel task={task} />
    </div>
  );
}
