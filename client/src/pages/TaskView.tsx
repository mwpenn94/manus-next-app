/**
 * TaskView — "Warm Void" Manus-Authentic Task Interface
 * 
 * Convergence Pass 2: Mobile responsive — workspace stacks below conversation
 * on small screens with a toggle button, touch-friendly tap targets.
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRoute } from "wouter";
import { useTask, type Message, type AgentAction } from "@/contexts/TaskContext";
import { useBridge } from "@/contexts/BridgeContext";
import { useFileUpload, type UploadedFile } from "@/hooks/useFileUpload";
import {
  Send,
  Paperclip,
  X,
  File as FileIcon,
  Upload,
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
  Loader2,
  Code,
  MonitorPlay,
  ExternalLink,
  Copy,
  RotateCcw,
  CheckCircle2,
  ArrowDown,
  PanelBottomOpen,
  PanelBottomClose,
  Square,
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

      <div className={cn("max-w-[90%] md:max-w-[80%]", isUser ? "ml-auto" : "")}>
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

function WorkspacePanel({ task, isMobile, onClose, bridgeStatus }: { task: ReturnType<typeof useTask>["activeTask"]; isMobile?: boolean; onClose?: () => void; bridgeStatus?: string }) {
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
      "bg-card flex flex-col",
      isMobile
        ? "border-t border-border h-[50vh] max-h-[50vh]"
        : "border-l border-border transition-all duration-300 shrink-0",
      !isMobile && (expanded ? "w-[560px]" : "w-[400px]")
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
          {bridgeStatus === "connected" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
              Bridge Live
            </span>
          )}
          {bridgeStatus === "connecting" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
              Connecting...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close workspace"
            >
              <PanelBottomClose className="w-3.5 h-3.5" />
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex items-center gap-0 border-b border-border shrink-0 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
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
                <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Open in new tab">
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
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
              <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Copy">
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
          <button className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Jump to live">
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
  const { status: bridgeStatus, sendRaw: bridgeSend, lastEvent } = useBridge();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dragCounterRef = useRef(0);
  const taskExternalId = activeTask?.id || params?.id;
  const { files, uploading, progress, error: uploadError, upload, openPicker, handleFileChange, removeFile, clearFiles, inputRef: fileInputRef } = useFileUpload(taskExternalId);

  // Listen for bridge events and add them as assistant messages
  useEffect(() => {
    if (!lastEvent || !task) return;
    if (lastEvent.type === "agent.message") {
      const payload = lastEvent.payload as { content?: string; actions?: AgentAction[] };
      if (payload.content) {
        addMessage(task.id, {
          role: "assistant",
          content: payload.content,
          actions: payload.actions,
        });
      }
    }
  }, [lastEvent]);

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

  const handleSend = useCallback(async () => {
    if (!input.trim() || !task) return;
    const userContent = files.length > 0
      ? `${input}\n\n📎 Attached: ${files.map(f => f.fileName).join(", ")}`
      : input;
    addMessage(task.id, { role: "user", content: userContent });

    // If bridge is connected, dispatch the message to the Sovereign agent
    if (bridgeStatus === "connected") {
      bridgeSend("task.message", {
        taskId: task.id,
        content: input,
        files: files.map(f => ({ url: f.url, name: f.fileName })),
      });
      setInput("");
      clearFiles();
      inputRef.current?.focus();
      return;
    }

    // Otherwise, use SSE streaming from the LLM
    const currentInput = input;
    setInput("");
    clearFiles();
    inputRef.current?.focus();
    setStreaming(true);
    setStreamContent("");

    let accumulated = "";

    try {
      const systemPrompt = "You are Manus Next, an advanced AI assistant. You help users with research, coding, data analysis, content creation, and more. Be helpful, concise, and proactive. When the user attaches files, acknowledge them and incorporate them into your response.";
      const conversationMessages = task.messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationMessages,
        { role: "user" as const, content: currentInput },
      ];

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.delta) {
              accumulated += data.delta;
              setStreamContent(accumulated);
            }
            if (data.done) {
              accumulated = data.content || accumulated;
            }
            if (data.error) {
              accumulated += `\n\n⚠️ ${data.error}`;
              setStreamContent(accumulated);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      // Add the final message
      addMessage(task.id, { role: "assistant", content: accumulated });
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User stopped generation — save whatever was accumulated
        if (accumulated.trim()) {
          addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*" });
        }
      } else {
        addMessage(task.id, {
          role: "assistant",
          content: `I encountered an error: ${err.message}. Please try again.`,
        });
      }
    } finally {
      abortControllerRef.current = null;
      setStreaming(false);
      setStreamContent("");
    }
  }, [input, task, addMessage, bridgeStatus, bridgeSend, files, clearFiles]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // ── Drag-and-drop handlers ──
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      // Directly call the upload function for each dropped file
      for (const file of Array.from(droppedFiles)) {
        await upload(file);
      }
    }
  }, [upload]);

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* ── CONVERSATION PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Task Header */}
        <div className="h-12 flex items-center justify-between px-4 md:px-6 border-b border-border shrink-0">
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
            {/* Mobile workspace toggle */}
            <button
              onClick={() => setMobileWorkspaceOpen(!mobileWorkspaceOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:hidden active:scale-95"
              title={mobileWorkspaceOpen ? "Hide workspace" : "Show workspace"}
            >
              {mobileWorkspaceOpen ? (
                <PanelBottomClose className="w-4 h-4" />
              ) : (
                <PanelBottomOpen className="w-4 h-4" />
              )}
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden md:flex" title="Share">
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden md:flex" title="Bookmark">
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="More">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 overscroll-contain">
          {task.messages.map((msg, i) => (
            <MessageBubble key={msg.id} message={msg} isLast={i === task.messages.length - 1} />
          ))}
            {isTyping && <TypingIndicator />}
            {streaming && streamContent && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 mb-5"
              >
                <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm">🐾</span>
                </div>
                <div className="max-w-[90%] md:max-w-[80%]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>manus next</span>
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  </div>
                  <div className="text-sm text-foreground/90 prose prose-sm prose-invert max-w-none">
                    <Streamdown>{streamContent}</Streamdown>
                  </div>
                </div>
              </motion.div>
            )}
            {streaming && !streamContent && <TypingIndicator />}
          </div>

        {/* Input */}
        <div
          className="px-4 md:px-6 pb-3 md:pb-4 pt-2 border-t border-border shrink-0 relative"
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary/40 rounded-xl backdrop-blur-sm"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-primary" />
                  <span className="text-sm font-medium text-primary">Drop files here</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
            {/* Attached files preview */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs">
                    <FileIcon className="w-3 h-3 text-primary" />
                    <span className="text-foreground/80 max-w-[120px] truncate">{f.fileName}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploading && (
              <div className="px-4 pb-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {uploadError && (
              <p className="px-4 pb-2 text-xs text-destructive">{uploadError}</p>
            )}
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.html,.css"
                />
                <button
                  onClick={openPicker}
                  disabled={uploading}
                  className={cn(
                    "p-2 md:p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95",
                    uploading && "opacity-50 cursor-not-allowed"
                  )}
                  title="Attach file"
                >
                  {uploading ? <Upload className="w-4 h-4 animate-pulse" /> : <Paperclip className="w-4 h-4" />}
                </button>
              </div>
              {streaming ? (
                <button
                  onClick={handleStopGeneration}
                  className="w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all active:scale-95 bg-destructive/80 text-destructive-foreground hover:bg-destructive"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className={cn(
                    "w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center transition-all active:scale-95",
                    input.trim()
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "bg-muted text-muted-foreground"
                  )}
                  title="Send"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2 hidden md:block">
            Manus Next may make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* ── WORKSPACE PANEL (Desktop — side panel) ── */}
      <div className="hidden md:block">
        <WorkspacePanel task={task} bridgeStatus={bridgeStatus} />
      </div>

      {/* ── WORKSPACE PANEL (Mobile — bottom sheet) ── */}
      <AnimatePresence>
        {mobileWorkspaceOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "50vh" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden overflow-hidden"
          >
            <WorkspacePanel
              task={task}
              isMobile
              bridgeStatus={bridgeStatus}
              onClose={() => setMobileWorkspaceOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
