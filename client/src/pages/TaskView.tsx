/**
 * TaskView — Real-wired task interface
 * 
 * Workspace panel: real artifacts from DB via tRPC
 * Voice input: MediaRecorder → S3 upload → Whisper transcription
 * Header buttons: Share (clipboard), Bookmark (DB toggle), More (dropdown with system prompt + delete)
 * System prompt: per-task override sent to /api/stream
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useTask, type Message, type AgentAction } from "@/contexts/TaskContext";
import { useBridge } from "@/contexts/BridgeContext";
import { useFileUpload, type UploadedFile } from "@/hooks/useFileUpload";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrandAvatar from "@/components/BrandAvatar";
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
  BookmarkCheck,
  MoreHorizontal,
  Maximize2,
  Minimize2,
  Loader2,
  Code,
  MonitorPlay,
  ExternalLink,
  Copy,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  ArrowDown,
  PanelBottomOpen,
  PanelBottomClose,
  PanelRightOpen,
  PanelRightClose,
  Square,
  Mic,
  Plus,
  MicOff,
  Trash2,
  Settings2,
  Check,
  Download,
  Volume2,
  VolumeX,
  Pause,
  Pencil,
  AlertTriangle,
  ArrowUp,
  Monitor,
  Camera,
  Video,
  Hammer,
  Package,
  GitBranch,
  BarChart3,
  Palette,
  Mail,
  BookOpen,
  Infinity,
  Crown,
  Sparkles,
  Zap,
  BookmarkPlus,
  Grid2x2,
  Maximize,
  FolderOpen,
  Link2 as LinkIcon,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "@/components/ImageLightbox";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";
import ModeToggle, { type AgentMode } from "@/components/ModeToggle";
import ShareDialog from "@/components/ShareDialog";
// TaskProgressCard replaced by inline step counter (Pass 52)
import { BranchBanner, ChildBranches, BranchButton } from "@/components/BranchIndicator";
import { BranchTreeView } from "@/components/BranchTreeView";
import { BranchCompareView } from "@/components/BranchCompareView";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import ActiveToolIndicator from "@/components/ActiveToolIndicator";
import SandboxViewer from "@/components/SandboxViewer";
import ModelSelector, { MODE_TO_MODEL, MODEL_TO_MODE } from "@/components/ModelSelector";
import PlusMenu from "@/components/PlusMenu";
import SpecializedInputBar, { type SpecializedMode } from "@/components/SpecializedInputBar";
import GitHubBadge from "@/components/GitHubBadge";
import ConnectorsSheet, { ConnectorsBadge } from "@/components/ConnectorsSheet";
import ResizableDivider, { useWorkspaceDivider } from "@/components/ResizableDivider";
import VoiceRecordingUI, { VoiceWaveStyles } from "@/components/VoiceRecordingUI";
import { useTTS } from "@/hooks/useTTS";
import BrowserAuthCard from "@/components/BrowserAuthCard";
import TaskPauseCard from "@/components/TaskPauseCard";
import TakeControlCard from "@/components/TakeControlCard";
import WebappPreviewCard from "@/components/WebappPreviewCard";
import CheckpointCard from "@/components/CheckpointCard";
import TaskCompletedCard from "@/components/TaskCompletedCard";
import ConvergenceIndicator from "@/components/ConvergenceIndicator";
import InteractiveOutputCard from "@/components/InteractiveOutputCard";
import PublishSheet from "@/components/PublishSheet";
import SiteLiveSheet from "@/components/SiteLiveSheet";
import { MediaCapturePanel } from "@/components/MediaCapturePanel";
import HandsFreeOverlay from "@/components/HandsFreeOverlay";
import { useHandsFreeMode } from "@/hooks/useHandsFreeMode";
import { useEdgeTTS, splitSentences } from "@/hooks/useEdgeTTS";
import { Headphones } from "lucide-react";
import { streamWithRetry, getStreamErrorMessage, isStreamErrorMessage } from "@/lib/streamWithRetry";
import { buildStreamCallbacks, type StreamState } from "@/lib/buildStreamCallbacks";
import InConversationSearch, { useConversationSearch } from "@/components/InConversationSearch";
import TaskReplayOverlay from "@/components/TaskReplayOverlay";
import ExecutionPlanDisplay from "@/components/ExecutionPlanDisplay";
import { useSearch } from "wouter";

// ── Suggested Follow-ups (Gap 4) ──

const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = {
  research: [
    "Go deeper on the top 3 findings",
    "Create a presentation from this research",
    "Find counter-arguments to the main thesis",
    "Summarize this for a non-technical audience",
  ],
  code: [
    "Add unit tests for this code",
    "Optimize for performance",
    "Add error handling and edge cases",
    "Create documentation for this",
  ],
  writing: [
    "Make it more concise",
    "Expand on the key points",
    "Adjust the tone to be more formal",
    "Translate to another language",
  ],
  generation_incomplete: [
    "Please generate it now",
    "Here's the content I want: ",
    "Try again with a simpler approach",
    "What information do you need from me?",
  ],
  generation_done: [
    "Refine and improve this",
    "Create a different version",
    "Export in another format",
    "Add more detail to this",
  ],
  image: [
    "Create a variation of this",
    "Adjust the style",
    "Generate a different concept",
    "Make it more professional",
  ],
  general: [
    "Tell me more about this",
    "Create a visual summary",
    "What are the next steps?",
    "Export this as a document",
  ],
};

function getFollowUpSuggestions(messages: Message[]): string[] {
  const lastUser = [...messages].reverse().find(m => m.role === "user");
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  if (!lastAssistant) return FOLLOW_UP_SUGGESTIONS.general;

  const userContent = (typeof lastUser?.content === "string" ? lastUser.content : "").toLowerCase();
  const assistantContent = lastAssistant.content.toLowerCase();

  // Check if user asked for generation but agent didn't produce an artifact
  const userWantedGeneration = /\b(generate|create|make|build|draft)\s+(me\s+)?a?\s*(pdf|document|image|picture|slide|presentation|spreadsheet|report|file|app|website|video|audio)\b/i.test(userContent);
  const hasArtifact = /\[.*?\]\(https?:\/\/.*?\)|generated.*?(document|image|pdf|slide)|here.*?(is|are).*?(your|the).*?(document|pdf|image|file|slide)/i.test(assistantContent);
  const agentAskedForInput = /what.*?(content|would you|should|like me|topic|details|information|include)|please.*?(provide|specify|tell me|share)/i.test(assistantContent);

  // Priority 1: User wanted generation but nothing was produced
  if (userWantedGeneration && !hasArtifact) {
    if (agentAskedForInput) {
      // Agent is asking for clarification — suggest providing content
      return [
        "Here's what I want: ",
        "Just make a sample PDF with placeholder content",
        "Use any relevant content you think works",
        "Let me describe what I need...",
      ];
    }
    return FOLLOW_UP_SUGGESTIONS.generation_incomplete;
  }

  // Priority 2: Generation was completed — suggest refinement
  if (userWantedGeneration && hasArtifact) {
    return FOLLOW_UP_SUGGESTIONS.generation_done;
  }

  // Priority 3: Image-related content
  if (/generated.*?image|image.*?generated|\!\[.*?\]\(.*?\)/i.test(assistantContent)) {
    return FOLLOW_UP_SUGGESTIONS.image;
  }

  // Priority 4: Code-related content
  if (assistantContent.includes("```") || /\b(function|import|export|const|class|def )\b/.test(assistantContent)) {
    return FOLLOW_UP_SUGGESTIONS.code;
  }

  // Priority 5: Research-related content
  if (/\b(research|study|analysis|findings|sources|according to|evidence)\b/.test(assistantContent)) {
    return FOLLOW_UP_SUGGESTIONS.research;
  }

  // Priority 6: Long-form writing
  if (assistantContent.length > 500) return FOLLOW_UP_SUGGESTIONS.writing;

  return FOLLOW_UP_SUGGESTIONS.general;
}

// ── Task Quality Rating (Gap 5) ──

function TaskRating({ taskId, onRate }: { taskId: string; onRate?: (rating: number) => void }) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Load existing rating from DB
  const { data: existingRating } = trpc.task.getTaskRating.useQuery(
    { taskExternalId: taskId },
    { enabled: !!taskId }
  );
  const rateMutation = trpc.task.rateTask.useMutation({
    onError: (err) => { toast.error("Rating failed: " + err.message); },
  });

  // Sync existing rating on load
  useEffect(() => {
    if (existingRating?.rating && !submitted) {
      setSelectedRating(existingRating.rating);
      setSubmitted(true);
    }
  }, [existingRating, submitted]);

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    setSubmitted(true);
    onRate?.(rating);
    rateMutation.mutate({ taskExternalId: taskId, rating });
    toast.success(`Rated ${rating}/5 — thank you for your feedback!`);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Rated</span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <span key={star} className={cn("text-sm", star <= selectedRating ? "text-foreground" : "text-muted-foreground")}>
              ★
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">Rate this response</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            onClick={() => handleRate(star)}
            className="text-sm transition-colors cursor-pointer hover:scale-110"
            title={`Rate ${star}/5`}
          >
            <span className={cn(
              star <= (hoveredStar || selectedRating) ? "text-foreground" : "text-muted-foreground"
            )}>
              ★
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Action rendering ──

function ActionIcon({ type }: { type: AgentAction["type"] }) {
  const iconClass = "w-3 h-3";
  switch (type) {
    case "browsing": return <Globe className={cn(iconClass, "text-blue-400")} />;
    case "scrolling": return <ScrollText className={cn(iconClass, "text-muted-foreground")} />;
    case "clicking": return <MousePointer2 className={cn(iconClass, "text-foreground")} />;
    case "executing": return <Terminal className={cn(iconClass, "text-green-400")} />;
    case "creating": return <FileText className={cn(iconClass, "text-purple-400")} />;
    case "searching": return <Search className={cn(iconClass, "text-cyan-400")} />;
    case "generating": return <ImageIcon className={cn(iconClass, "text-pink-400")} />;
    case "thinking": return <Brain className={cn(iconClass, "text-primary")} />;
    case "writing": return <FileText className={cn(iconClass, "text-indigo-400")} />;
    case "researching": return <Search className={cn(iconClass, "text-teal-400")} />;
    case "building": return <Hammer className={cn(iconClass, "text-orange-400")} />;
    case "editing": return <Pencil className={cn(iconClass, "text-amber-400")} />;
    case "reading": return <BookOpen className={cn(iconClass, "text-sky-400")} />;
    case "installing": return <Package className={cn(iconClass, "text-emerald-400")} />;
    case "versioning": return <GitBranch className={cn(iconClass, "text-violet-400")} />;
    case "analyzing": return <BarChart3 className={cn(iconClass, "text-yellow-400")} />;
    case "designing": return <Palette className={cn(iconClass, "text-rose-400")} />;
    case "sending": return <Mail className={cn(iconClass, "text-blue-300")} />;
    case "deploying": return <Upload className={cn(iconClass, "text-emerald-400")} />;
  }
}

function ActionLabel({ action }: { action: AgentAction }) {
  const labelClass = "text-muted-foreground";
  const codeClass = "text-[11px] bg-muted/50 px-1 py-0.5 rounded";
  switch (action.type) {
    case "browsing": return <span>Browsing <span className={cn(labelClass, "font-mono text-[11px] break-all")}>{action.url}</span></span>;
    case "scrolling": return <span>Scrolling page</span>;
    case "clicking": return <span>Clicking <span className={labelClass}>{action.element}</span></span>;
    case "executing": return <span>Running <code className={codeClass}>{action.command}</code></span>;
    case "creating": return <span>Creating <code className={codeClass}>{action.file}</code></span>;
    case "searching": return <span>Searching <span className={cn(labelClass, "italic")}>"{action.query}"</span></span>;
    case "generating": return <span>Generating <span className={labelClass}>{action.description}</span></span>;
    case "thinking": return <span>Reasoning about next steps...</span>;
    case "writing": return <span>{action.label || "Writing document"}</span>;
    case "researching": return <span>{action.label || "Wide research"}</span>;
    case "building": return <span>{action.label || "Building project"}</span>;
    case "editing": return <span>{action.label || (action.file ? <>Editing <code className={codeClass}>{action.file}</code></> : "Editing file")}</span>;
    case "reading": return <span>{action.label || (action.file ? <>Reading <code className={codeClass}>{action.file}</code></> : "Reading file")}</span>;
    case "installing": return <span>{action.label || (action.packages ? <>Installing <code className={codeClass}>{action.packages}</code></> : "Installing dependencies")}</span>;
    case "versioning": return <span>{action.label || "Git operation"}</span>;
    case "analyzing": return <span>{action.label || "Analyzing data"}</span>;
    case "designing": return <span>{action.label || "Creating design"}</span>;
    case "sending": return <span>{action.label || "Sending message"}</span>;
    case "deploying": return <span>{action.label || "Deploying webapp"}</span>;
  }
}

// ── Action Grouping Logic ──
// Groups consecutive actions of similar types into collapsible groups (Manus parity)

type ActionGroup = {
  type: "single";
  action: AgentAction;
  index: number;
} | {
  type: "group";
  label: string;
  groupType: string;
  actions: AgentAction[];
  startIndex: number;
};

function groupActions(actions: AgentAction[]): ActionGroup[] {
  if (actions.length === 0) return [];
  const groups: ActionGroup[] = [];
  let i = 0;
  
  // Define which action types can be grouped together
  const groupableTypes: Record<string, string> = {
    editing: "file_ops",
    creating: "file_ops",
    reading: "file_ops",
    writing: "file_ops",
    browsing: "browsing",
    scrolling: "browsing",
    clicking: "browsing",
    executing: "terminal",
    installing: "terminal",
    searching: "research",
    researching: "research",
    building: "app_building",
    deploying: "app_building",
    versioning: "app_building",
  };
  
  const groupLabels: Record<string, string> = {
    file_ops: "File operations",
    browsing: "Browser actions",
    terminal: "Terminal commands",
    research: "Research & search",
    app_building: "App building",
  };
  
  while (i < actions.length) {
    const action = actions[i];
    const groupKey = groupableTypes[action.type];
    
    if (groupKey) {
      // Look ahead for consecutive actions of the same group
      let j = i + 1;
      while (j < actions.length && groupableTypes[actions[j].type] === groupKey) {
        j++;
      }
      const count = j - i;
      if (count >= 3) {
        // Group 3+ consecutive similar actions
        groups.push({
          type: "group",
          label: groupLabels[groupKey] || groupKey,
          groupType: groupKey,
          actions: actions.slice(i, j),
          startIndex: i,
        });
        i = j;
        continue;
      }
    }
    groups.push({ type: "single", action, index: i });
    i++;
  }
  return groups;
}

function ActionGroupHeader({ group }: { group: Extract<ActionGroup, { type: "group" }> }) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = group.actions.filter(a => a.status === "done").length;
  const totalCount = group.actions.length;
  const allDone = doneCount === totalCount;
  const hasActive = group.actions.some(a => a.status === "active");
  
  // Pick icon based on group type
  const groupIcons: Record<string, typeof Globe> = {
    file_ops: FileText,
    browsing: Globe,
    terminal: Terminal,
    research: Search,
  };
  const Icon = groupIcons[group.groupType] || Brain;
  
  return (
    <div className="py-1 px-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group hover:bg-accent/30 rounded-md px-1 py-1 -mx-1 transition-colors"
      >
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
          hasActive ? "bg-primary/20" : allDone ? "bg-muted" : "bg-muted/50"
        )}>
          {hasActive ? (
            <Loader2 className="w-3 h-3 text-primary animate-spin" />
          ) : allDone ? (
            <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
          ) : (
            <Icon className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
        <span className="text-xs text-foreground flex-1">
          {group.label}
          {group.groupType === "file_ops" && !expanded && (
            <span className="text-[10px] text-muted-foreground ml-1.5 font-mono">
              {group.actions.slice(0, 3).map(a => {
                const file = (a as any).file || (a as any).label || "";
                const name = file.split("/").pop() || file;
                return name;
              }).filter(Boolean).join(", ")}
              {group.actions.length > 3 && ` +${group.actions.length - 3}`}
            </span>
          )}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {doneCount}/{totalCount}
        </span>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden ml-2 border-l border-border/50 pl-1"
          >
            {group.actions.map((action, i) => (
              <ActionStep key={i} action={action} index={i} total={group.actions.length} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GroupedActionsList({ actions }: { actions: AgentAction[] }) {
  const groups = groupActions(actions);
  return (
    <>
      {groups.map((group, i) => (
        group.type === "group" ? (
          <ActionGroupHeader key={`group-${i}`} group={group} />
        ) : (
          <ActionStep key={`single-${i}`} action={group.action} index={group.index} total={actions.length} />
        )
      ))}
    </>
  );
}

/**
 * StreamingStepsCollapsible — Manus dual display pattern
 * Shows a collapsible timeline of completed steps with the latest active step visible.
 * Text content always renders below the steps (bottom position).
 */
function StreamingStepsCollapsible({ actions, stepProgress }: { actions: AgentAction[]; stepProgress: { completed: number; total: number; turn: number } | null }) {
  const [expanded, setExpanded] = useState(false);
  const completedActions = actions.filter(a => a.status === "done");
  const activeActions = actions.filter(a => a.status === "active");
  const hasCompletedSteps = completedActions.length > 0;

  return (
    <div className="mb-2">
      {/* Collapsible completed steps */}
      {hasCompletedSteps && (
        <div className="mb-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", expanded && "rotate-90")} />
            <span>{completedActions.length} step{completedActions.length !== 1 ? "s" : ""} completed</span>
            {stepProgress && stepProgress.total > 0 && (
              <span className="font-mono tabular-nums ml-1">({stepProgress.completed}/{stepProgress.total})</span>
            )}
          </button>
          {expanded && (
            <div className="ml-2 mt-1 border-l border-border/50 pl-2">
              <GroupedActionsList actions={completedActions} />
            </div>
          )}
        </div>
      )}
      {/* Active step always visible */}
      {activeActions.length > 0 && (
        <div className="space-y-0.5">
          <GroupedActionsList actions={activeActions} />
        </div>
      )}
    </div>
  );
}

/** Elapsed timer for active tool steps — shows MM:SS matching Manus production */
function StepElapsedTimer() {
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
    <span className="text-[10px] font-mono text-muted-foreground tabular-nums ml-1.5">
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

function ActionStep({ action, index, total }: { action: AgentAction; index: number; total: number }) {
  const isActive = action.status === "active";
  const isDone = action.status === "done";
  const isError = action.status === "error";
  const [previewExpanded, setPreviewExpanded] = useState(false);

  return (
    <div className="flex items-start gap-2.5 py-1.5 px-3 relative">
      {index < total - 1 && (
        <div className="absolute left-[21px] top-[22px] w-px h-[calc(100%-6px)] bg-border" />
      )}
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-px relative z-10",
        isActive ? "bg-primary/20" : isDone ? "bg-muted" : isError ? "bg-destructive/20" : "bg-muted/50"
      )}>
        {isActive ? (
          <Loader2 className="w-3 h-3 text-primary animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
        ) : isError ? (
          <AlertTriangle className="w-3 h-3 text-destructive" />
        ) : (
          <ActionIcon type={action.type} />
        )}
      </div>
      <div className="flex-1 min-w-0 text-xs text-foreground leading-relaxed pt-0.5">
        <div className="flex items-center gap-1">
          <ActionLabel action={action} />
          {isActive && <StepElapsedTimer />}
          {isDone && action.preview && (
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {previewExpanded ? "hide" : "show"}
            </button>
          )}
        </div>
        {/* Inline screenshot for browsing actions */}
        {(action.type as string === "browsing") && action.preview?.startsWith("http") && (
          <div className="mt-1.5 rounded-md overflow-hidden border border-border/50 max-w-[280px]">
            <img
              src={action.preview}
              alt="Browser screenshot"
              className="w-full h-auto rounded-md cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(action.preview!, "_blank")}
              loading="lazy"
            />
          </div>
        )}
        {previewExpanded && action.preview && (
          <div className="mt-1.5 rounded bg-muted/50 border border-border/50 text-[11px] text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
            {action.type === "searching" && action.preview.includes("http") ? (
              <div className="divide-y divide-border/50">
                {action.preview.split("\n").filter(Boolean).slice(0, 5).map((line, i) => {
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  const title = line.replace(urlMatch?.[0] || "", "").trim() || urlMatch?.[1];
                  return (
                    <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 transition-colors">
                      <Globe className="w-3 h-3 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">{title}</p>
                        {urlMatch && (
                          <p className="text-[9px] text-muted-foreground font-mono truncate">{urlMatch[1]}</p>
                        )}
                      </div>
                      {urlMatch && (
                        <button
                          onClick={() => window.open(urlMatch[1], "_blank")}
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (action.type === "executing" || action.type === "reading" || action.type === "editing") ? (
              <div className="p-2">
                <pre className="font-mono whitespace-pre-wrap text-[10px] leading-relaxed">{action.preview}</pre>
              </div>
            ) : action.type === "installing" ? (
              <div className="p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-medium text-foreground">Install output</span>
                </div>
                <pre className="font-mono whitespace-pre-wrap text-[10px] leading-relaxed">{action.preview}</pre>
              </div>
            ) : action.type === "building" ? (
              <div className="p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Hammer className="w-3 h-3 text-orange-400" />
                  <span className="text-[10px] font-medium text-foreground">Build output</span>
                </div>
                <pre className="font-mono whitespace-pre-wrap text-[10px] leading-relaxed">{action.preview}</pre>
              </div>
            ) : action.type === "researching" ? (
              <div className="p-2 space-y-1">
                {action.preview.split("\n").filter(Boolean).map((line, i) => {
                  const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                  return urlMatch ? (
                    <div key={i} className="flex items-center gap-1.5">
                      <Globe className="w-2.5 h-2.5 shrink-0" />
                      <button
                        onClick={() => window.open(urlMatch[1], "_blank")}
                        className="text-[10px] text-blue-400 hover:underline truncate"
                      >
                        {line.replace(urlMatch[0], "").trim() || urlMatch[1]}
                      </button>
                    </div>
                  ) : (
                    <p key={i} className="text-[10px]">{line}</p>
                  );
                })}
              </div>
            ) : (
              <div className="p-2 font-mono whitespace-pre-wrap">{action.preview}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──

function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
        <BrandAvatar size="sm" />
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

function MessageBubble({ message, isLast, onRegenerate, canRegenerate, userTTSVoice, ttsRateStr, taskExternalId, messageIndex, allMessages, isEditing, editDraft, onStartEdit, onCancelEdit, onSaveEdit, onEditDraftChange, previewRefreshKey, onShare }: { message: Message; isLast: boolean; onRegenerate?: () => void; canRegenerate?: boolean; userTTSVoice?: string; ttsRateStr?: string; taskExternalId?: string; messageIndex?: number; allMessages?: Message[]; isEditing?: boolean; editDraft?: string; onStartEdit?: () => void; onCancelEdit?: () => void; onSaveEdit?: () => void; onEditDraftChange?: (val: string) => void; previewRefreshKey?: number; onShare?: () => void }) {
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const tts = useEdgeTTS();
  const isUser = message.role === "user";
  const hasActions = message.actions && message.actions.length > 0;
  const doneCount = message.actions?.filter(a => a.status === "done").length ?? 0;
  const totalCount = message.actions?.length ?? 0;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn("flex gap-3 mb-5", isUser ? "flex-row-reverse" : "")}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <BrandAvatar size="sm" />
        </div>
      )}

      <div className={cn("max-w-[90%] md:max-w-[80%] overflow-hidden break-words", isUser ? "ml-auto" : "")}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Manus
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Max
            </span>
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}

        {/* Actions accordion — rendered BEFORE text content for Manus parity */}
        {hasActions && !isUser && (
          <div className="mb-2.5">
            <button
              onClick={() => setActionsExpanded(!actionsExpanded)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1.5 group"
            >
              {actionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>
                {doneCount === totalCount ? (
                  <span className="text-muted-foreground">{totalCount} steps completed</span>
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
                  className="overflow-hidden py-1"
                >
                  <GroupedActionsList actions={message.actions!} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Card-type messages render special inline cards */}
        {message.cardType === "browser_auth" ? (
          <BrowserAuthCard
            onChoice={(choice) => {
              if (choice === "crimson-hawk") {
                toast.success("Connected to Crimson-Hawk — using your local browser");
              } else if (choice === "default") {
                toast.info("Using cloud browser (default)");
              } else {
                toast.info("Checking Crimson-Hawk connection...");
              }
            }}
          />
        ) : message.cardType === "task_pause" ? (
          <TaskPauseCard
            reason={(message.cardData?.reason as any) ?? "needs_guidance"}
            message={message.content || "The agent needs your input to continue."}
            onProvideInput={() => toast.info("Provide input")}
            onSkip={() => toast.info("Skipped")}
          />
        ) : message.cardType === "take_control" ? (
          <TakeControlCard
            reason={message.content || "The agent needs you to complete an action."}
            userHasControl={!!message.cardData?.userHasControl}
            onTakeControl={() => toast.info("Taking control...")}
            onReturnControl={() => toast.info("Returning control...")}
          />
        ) : message.cardType === "webapp_preview" ? (
          <WebappPreviewCard
            appName={(message.cardData?.appName as string) ?? "App"}
            domain={message.cardData?.domain as string}
            status={(message.cardData?.status as any) ?? "running"}
            previewUrl={message.cardData?.previewUrl as string}
            publishedUrl={message.cardData?.publishedUrl as string}
            hasUnpublishedChanges={!!message.cardData?.hasUnpublishedChanges}
            projectExternalId={message.cardData?.projectExternalId as string}
          />
        ) : message.cardType === "webapp_deployed" ? (
          /* Pass 67: Legacy webapp_deployed cards render as compact WebappPreviewCard */
          <WebappPreviewCard
            appName={(message.cardData?.appName as string) ?? "App"}
            domain={(message.cardData?.deployedUrl as string)?.replace(/^https?:\/\//, "")}
            status="published"
            publishedUrl={(message.cardData?.deployedUrl as string) ?? ""}
            projectExternalId={message.cardData?.projectExternalId as string}
          />
        ) : message.cardType === "checkpoint" ? (
          <CheckpointCard
            description={message.content || "Checkpoint saved"}
            screenshotUrl={message.cardData?.screenshotUrl as string}
            isLatest={!!message.cardData?.isLatest}
            onPreview={() => toast.info("Opening preview...")}
            onRollback={() => toast.info("Rolling back...")}
          />
        ) : message.cardType === "task_completed" ? (
          <TaskCompletedCard
            taskId={(message.cardData?.taskId as string) ?? ""}
            onRate={(id, rating) => toast.success(`Rated ${rating} stars`)}
            onShare={onShare}
          />
        ) : message.cardType === "convergence" ? (
          <ConvergenceIndicator
            passNumber={(message.cardData?.passNumber as number) ?? 1}
            totalPasses={message.cardData?.totalPasses as number}
            passType={(message.cardData?.passType as any) ?? "landscape"}
            status={(message.cardData?.status as any) ?? "running"}
            description={message.cardData?.description as string}
            rating={message.cardData?.rating as number}
            convergenceCount={(message.cardData?.convergenceCount as number) ?? 0}
            reasoningMode={message.cardData?.reasoningMode as any}
            temperature={message.cardData?.temperature as number}
            scoreDelta={message.cardData?.scoreDelta as number}
            signalAssessment={message.cardData?.signalAssessment as string}
            failureLog={message.cardData?.failureLog as string}
            divergenceBudgetUsed={message.cardData?.divergenceBudgetUsed as number}
          />
        ) : message.cardType === "interactive_output" ? (
          <InteractiveOutputCard
            type={(message.cardData?.outputType as any) ?? "website"}
            title={(message.cardData?.title as string) ?? "Output"}
            description={message.cardData?.description as string}
            previewUrl={message.cardData?.previewUrl as string}
            openUrl={message.cardData?.openUrl as string}
            downloadUrl={message.cardData?.downloadUrl as string}
            isLive={!!message.cardData?.isLive}
            statusLabel={message.cardData?.statusLabel as string}
            onPreview={() => {
              const url = message.cardData?.previewUrl as string;
              if (url) window.open(url, "_blank");
            }}
            onOpen={() => {
              const url = message.cardData?.openUrl as string;
              if (url) window.open(url, "_blank");
            }}
            onDownload={() => {
              const url = message.cardData?.downloadUrl as string;
              if (url) window.open(url, "_blank");
            }}
          />
        ) : (
          /* Standard text message rendering */
          <div
            data-message-content
            className={cn(
              "rounded-xl text-sm leading-relaxed",
              isUser
                ? "bg-primary/12 border border-primary/20 text-foreground px-4 py-3"
                : "text-foreground"
            )}
          >
            {isUser ? (
              <>
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft ?? ""}
                      onChange={(e) => onEditDraftChange?.(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit?.(); }
                        if (e.key === "Escape") { onCancelEdit?.(); }
                      }}
                      className="w-full bg-background border border-primary/30 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[60px]"
                      autoFocus
                      rows={Math.min(6, (editDraft ?? "").split("\n").length + 1)}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={onCancelEdit}
                        className="px-2.5 py-1 text-xs rounded-md text-muted-foreground hover:bg-accent transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={onSaveEdit}
                        disabled={!editDraft?.trim()}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-md transition-colors font-medium",
                          editDraft?.trim()
                            ? "bg-primary text-primary-foreground hover:opacity-90"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                      >
                        Save & Resend
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group/edit relative">
                    <p className="whitespace-pre-wrap">{message.content.replace(/\[Screen share:.*?\]|\[Video recording:.*?\]|\[Video uploaded:.*?\]/g, "").trim()}</p>
                    {onStartEdit && (
                      <button
                        onClick={onStartEdit}
                        className="absolute -top-1 -right-1 p-1 rounded-md bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity"
                        title="Edit message"
                        aria-label="Edit message"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
                {/* Media context indicators */}
                {/\[Screen share:/.test(message.content) && (
                  <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] w-fit">
                    <Monitor className="w-3 h-3" />
                    <span>{message.content.match(/\[Screen share: (.*?)\]/)?.[1] || "Screen shared"}</span>
                  </div>
                )}
                {/\[Video recording:/.test(message.content) && (
                  <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] w-fit">
                    <Camera className="w-3 h-3" />
                    <span>{message.content.match(/\[Video recording: (.*?)\]/)?.[1] || "Video recorded"}</span>
                  </div>
                )}
                {/\[Video uploaded:/.test(message.content) && (
                  <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 text-[11px] w-fit">
                    <Video className="w-3 h-3" />
                    <span>{message.content.match(/\[Video uploaded: (.*?)\]/)?.[1] || "Video uploaded"}</span>
                  </div>
                )}
              </>
            ) : isStreamErrorMessage(message.content) ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">Something went wrong while processing this request. You can retry or send a new message.</span>
              </div>
            ) : (
              <div className="prose prose-sm prose-themed max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
                <Streamdown>{message.content}</Streamdown>
              </div>
            )}
          </div>
        )}

        {/* User message actions accordion — rendered after text for user messages */}
        {hasActions && isUser && (
          <div className="mt-2.5">
            <button
              onClick={() => setActionsExpanded(!actionsExpanded)}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1.5 group"
            >
              {actionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>
                {doneCount === totalCount ? (
                  <span className="text-muted-foreground">{totalCount} steps completed</span>
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
                  className="overflow-hidden py-1"
                >
                  <GroupedActionsList actions={message.actions!} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {!isUser && (
          <div className="mt-2 flex items-center gap-1">
            {/* TTS button — Edge TTS Neural Voice (P15) */}
            <button
              onClick={() => {
                if (tts.isSpeaking) {
                  tts.stop();
                } else {
                  tts.speak(message.content, { voice: userTTSVoice, rate: ttsRateStr });
                }
              }}
              className={cn(
                "flex items-center gap-1.5 text-[11px] transition-colors px-2 py-1 rounded-md hover:bg-accent/50",
                tts.isSpeaking ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              title={tts.isSpeaking ? "Stop reading" : "Read aloud (Edge TTS)"}
              aria-label={tts.isSpeaking ? "Stop speech" : "Read message aloud"}
            >
              {tts.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : tts.isSpeaking ? (
                <VolumeX className="w-3 h-3" />
              ) : (
                <Volume2 className="w-3 h-3" />
              )}
              {tts.isLoading ? "Loading..." : tts.isSpeaking ? "Stop" : "Listen"}
              {tts.isSpeaking && (
                <span className="flex items-center gap-[2px] ml-1" aria-hidden="true">
                  <span className="w-[2px] h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                  <span className="w-[2px] h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                  <span className="w-[2px] h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
                  <span className="w-[2px] h-3 bg-primary rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
                </span>
              )}
            </button>
            {/* Regenerate button for last assistant message */}
            {isLast && canRegenerate && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent/50"
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            )}
            {/* Fork from Here — creates a new task with messages up to this point */}
            {taskExternalId && messageIndex !== undefined && allMessages && (
              <BranchButton
                taskExternalId={taskExternalId}
                message={message}
                messageIndex={messageIndex}
                allMessages={allMessages}
                className="text-[11px]"
              />
            )}
          </div>
        )}

        {/* Branch button for user messages */}
        {isUser && taskExternalId && messageIndex !== undefined && allMessages && (
          <div className="mt-1 flex justify-end">
            <BranchButton
              taskExternalId={taskExternalId}
              message={message}
              messageIndex={messageIndex}
              allMessages={allMessages}
            />
          </div>
        )}

        {isUser && (
          <p className="text-[10px] text-muted-foreground mt-1 text-right">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </motion.div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {/* Copy message text */}
        <ContextMenuItem
          onClick={() => {
            navigator.clipboard.writeText(message.content);
            toast.success("Copied to clipboard");
          }}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Message
        </ContextMenuItem>
        {/* Read aloud */}
        {!isUser && (
          <ContextMenuItem
            onClick={() => {
              if (tts.isSpeaking) {
                tts.stop();
              } else {
                tts.speak(message.content, { voice: userTTSVoice, rate: ttsRateStr });
              }
            }}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            {tts.isSpeaking ? "Stop Reading" : "Read Aloud"}
          </ContextMenuItem>
        )}
        {/* Edit user message (Pass 5 Step 2) */}
        {isUser && onStartEdit && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onStartEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Message
            </ContextMenuItem>
          </>
        )}
        {/* Fork from here */}
        {taskExternalId && messageIndex !== undefined && allMessages && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => {
                // Programmatically trigger the BranchButton dialog by finding and clicking it
                const branchBtn = document.querySelector(`[data-branch-msg-idx="${messageIndex}"]`) as HTMLButtonElement;
                if (branchBtn) branchBtn.click();
              }}
            >
              <GitBranch className="w-4 h-4 mr-2" />
              Fork from Here
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ── Workspace Panel with real artifacts ──

type WorkspaceTab = "browser" | "all" | "code" | "terminal" | "images" | "documents" | "links";

function WorkspacePanel({ task, isMobile, onClose, bridgeStatus }: { task: ReturnType<typeof useTask>["activeTask"]; isMobile?: boolean; onClose?: () => void; bridgeStatus?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("browser");
  const [selectedCodeIdx, setSelectedCodeIdx] = useState(0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedDocIdx, setSelectedDocIdx] = useState(0);
  const [imageLightboxOpen, setImageLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [imageViewMode, setImageViewMode] = useState<"preview" | "gallery">("preview");

  // Fetch user-uploaded files for this task (for image gallery)
  const userFiles = trpc.file.list.useQuery(
    { taskExternalId: task?.id || "" },
    { enabled: !!task?.id, refetchInterval: task?.status === "running" ? 5000 : false }
  );

  // Fetch real artifacts from DB — queries auto-enable when serverId becomes available
  const serverId = task?.serverId ?? 0;
  const hasServerId = !!task?.serverId;
  const isRunning = task?.status === "running";

  const browserArtifact = trpc.workspace.latest.useQuery(
    { taskId: serverId, type: "browser_screenshot" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const browserUrlArtifact = trpc.workspace.latest.useQuery(
    { taskId: serverId, type: "browser_url" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const codeArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "code" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const terminalArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "terminal" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const imageArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "generated_image" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const documentArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "document" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const documentPdfArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "document_pdf" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const documentDocxArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "document_docx" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );
  const slidesArtifacts = trpc.workspace.list.useQuery(
    { taskId: serverId, type: "slides" },
    { enabled: hasServerId, refetchInterval: isRunning ? 5000 : false }
  );

  // When serverId transitions from undefined to a value (new task synced to server),
  // force an immediate refetch of all artifact queries
  const prevServerIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (hasServerId && prevServerIdRef.current !== serverId) {
      prevServerIdRef.current = serverId;
      browserArtifact.refetch();
      browserUrlArtifact.refetch();
      codeArtifacts.refetch();
      terminalArtifacts.refetch();
      imageArtifacts.refetch();
      documentArtifacts.refetch();
      documentPdfArtifacts.refetch();
      documentDocxArtifacts.refetch();
      slidesArtifacts.refetch();
    }
  }, [hasServerId, serverId]);

  if (!task) return null;

  const currentBrowserUrl = browserUrlArtifact.data?.url || task.workspaceUrl;
  const currentScreenshot = browserArtifact.data?.url;
  const latestCode = codeArtifacts.data?.[0];
  const latestTerminal = terminalArtifacts.data?.[0];

  // Combine all document types into a single list
  const allDocuments = useMemo(() => {
    const docs: Array<{ id: number; label: string | null; content: string | null; url: string | null; createdAt: Date; docType: string }> = [];
    for (const d of documentArtifacts.data ?? []) docs.push({ ...d, docType: "markdown" });
    for (const d of documentPdfArtifacts.data ?? []) docs.push({ ...d, docType: "pdf" });
    for (const d of documentDocxArtifacts.data ?? []) docs.push({ ...d, docType: "docx" });
    for (const d of slidesArtifacts.data ?? []) docs.push({ ...d, docType: "slides" });
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documentArtifacts.data, documentPdfArtifacts.data, documentDocxArtifacts.data, slidesArtifacts.data]);

  // Collect links from messages (URLs in assistant responses)
  const extractedLinks = useMemo(() => {
    if (!task?.messages) return [];
    const urlRegex = /https?:\/\/[^\s<>"'\)\]]+/g;
    const links: Array<{ url: string; label: string; timestamp: Date }> = [];
    const seen = new Set<string>();
    for (const msg of task.messages) {
      if (msg.role !== "assistant" || !msg.content) continue;
      const matches = msg.content.match(urlRegex) || [];
      for (const url of matches) {
        const clean = url.replace(/[.,;:!?]+$/, "");
        if (!seen.has(clean)) {
          seen.add(clean);
          links.push({ url: clean, label: clean.replace(/^https?:\/\//, "").slice(0, 60), timestamp: msg.timestamp || new Date() });
        }
      }
    }
    return links;
  }, [task?.messages]);

  const totalArtifactCount = (codeArtifacts.data?.length || 0) + (terminalArtifacts.data?.length || 0) + ((imageArtifacts.data?.length || 0) + (userFiles.data?.filter((f: any) => f.mimeType?.startsWith("image/")).length || 0)) + allDocuments.length + extractedLinks.length;

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Globe; count?: number }[] = [
    { id: "browser", label: "Browser", icon: Globe },
    { id: "all", label: "All", icon: FolderOpen, count: totalArtifactCount || undefined },
    { id: "documents", label: "Docs", icon: FileText, count: allDocuments.length || undefined },
    { id: "images", label: "Images", icon: ImageIcon, count: (imageArtifacts.data?.length || 0) + (userFiles.data?.filter((f: any) => f.mimeType?.startsWith("image/")).length || 0) || undefined },
    { id: "code", label: "Code", icon: Code, count: codeArtifacts.data?.length },
    { id: "links", label: "Links", icon: LinkIcon, count: extractedLinks.length || undefined },
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
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              Bridge Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Close workspace"
              aria-label="Close workspace"
            >
              <PanelBottomClose className="w-3.5 h-3.5" />
            </button>
          )}
          {!isMobile && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={expanded ? "Collapse" : "Expand"}
              aria-label={expanded ? "Collapse workspace" : "Expand workspace"}
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">{tab.count}</span>
            )}
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
            {currentBrowserUrl && (
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-muted rounded-md px-3 py-1.5">
                  <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
                    {currentBrowserUrl}
                  </span>
                </div>
                <button
                  onClick={() => currentBrowserUrl && window.open(currentBrowserUrl, "_blank")}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Open in new tab"
                  aria-label="Open in new tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    browserArtifact.refetch();
                    browserUrlArtifact.refetch();
                  }}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Refresh"
                  aria-label="Refresh workspace"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="flex-1 h-full flex items-center justify-center">
              {currentScreenshot ? (
                <img
                  src={currentScreenshot}
                  alt="Browser preview"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No browser activity yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">Screenshots will appear here when the agent browses the web</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "code" && (
          <div className="h-full overflow-y-auto">
            {codeArtifacts.data && codeArtifacts.data.length > 0 ? (
              <div className="flex flex-col h-full">
                {/* File tabs for multiple code artifacts */}
                {codeArtifacts.data.length > 1 && (
                  <div className="flex items-center gap-0 border-b border-border px-2 pt-1 overflow-x-auto shrink-0">
                    {codeArtifacts.data.map((artifact: any, idx: number) => (
                      <button
                        key={artifact.id || idx}
                        onClick={() => setSelectedCodeIdx?.(idx)}
                        className={cn(
                          "px-3 py-1.5 text-[10px] font-mono border-b-2 transition-colors whitespace-nowrap",
                          (selectedCodeIdx ?? 0) === idx
                            ? "border-primary text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {artifact.label || `file-${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}
                {/* Code viewer with line numbers */}
                {(() => {
                  const activeCode = codeArtifacts.data[(selectedCodeIdx ?? 0)] || codeArtifacts.data[0];
                  if (!activeCode) return null;
                  const lines = (activeCode.content || "").split("\n");
                  return (
                    <div className="flex-1 overflow-auto">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground font-mono">{activeCode.label || "output"}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-muted-foreground">{lines.length} lines</span>
                          <button
                            onClick={() => {
                              if (activeCode.content) {
                                navigator.clipboard.writeText(activeCode.content);
                                toast.success("Copied to clipboard");
                              }
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {activeCode.url && (
                            <button
                              onClick={() => activeCode.url && window.open(activeCode.url, "_blank")}
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title="Open file"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-xs leading-relaxed">
                        <table className="w-full border-collapse">
                          <tbody>
                            {lines.map((line, i) => (
                              <tr key={i} className="hover:bg-muted/30 transition-colors">
                                <td className="text-right pr-4 pl-4 py-0 select-none text-muted-foreground text-[10px] w-10 align-top">
                                  {i + 1}
                                </td>
                                <td className="pr-4 py-0 whitespace-pre-wrap text-foreground">
                                  {line || " "}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <Code className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No code artifacts yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">Code files will appear here as the agent creates them</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="p-4 h-full overflow-y-auto bg-card">
            {latestTerminal ? (
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground">
                {latestTerminal.content}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No terminal output yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">Terminal commands will appear here as the agent executes them</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "images" && (() => {
          // Collect ALL images: agent-generated + user-uploaded
          const generatedImages = (imageArtifacts.data || []).map((img: any) => ({
            url: img.url,
            label: img.label || "Generated image",
            source: "generated" as const,
          }));
          const uploadedImages = (userFiles.data || [])
            .filter((f: any) => f.mimeType?.startsWith("image/"))
            .map((f: any) => ({
              url: f.url,
              label: f.fileName || "Uploaded image",
              source: "uploaded" as const,
            }));
          const allImages = [...generatedImages, ...uploadedImages];
          const allImageUrls = allImages.map((img) => img.url);

          return (
            <div className="h-full overflow-hidden flex flex-col">
              {allImages.length > 0 ? (
                <>
                  {/* View mode toggle */}
                  <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border">
                    <span className="text-[11px] text-muted-foreground">
                      {generatedImages.length > 0 && <span>{generatedImages.length} generated</span>}
                      {generatedImages.length > 0 && uploadedImages.length > 0 && <span> · </span>}
                      {uploadedImages.length > 0 && <span>{uploadedImages.length} uploaded</span>}
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-muted/50 rounded-md">
                      <button
                        onClick={() => setImageViewMode("preview")}
                        className={cn("p-1 rounded transition-colors", imageViewMode === "preview" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        title="Preview mode"
                      >
                        <Maximize className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setImageViewMode("gallery")}
                        className={cn("p-1 rounded transition-colors", imageViewMode === "gallery" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                        title="Gallery grid"
                      >
                        <Grid2x2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {imageViewMode === "preview" ? (
                    <>
                      {/* Selected image preview */}
                      {(() => {
                        const selected = allImages[selectedImageIdx ?? 0];
                        if (!selected) return null;
                        return (
                          <div
                            className="flex-1 flex items-center justify-center p-4 bg-black/5 relative cursor-pointer"
                            onClick={() => { setLightboxIdx(selectedImageIdx ?? 0); setImageLightboxOpen(true); }}
                          >
                            <img
                              src={selected.url}
                              alt={selected.label}
                              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                            />
                            <div className="absolute top-3 right-3 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => window.open(selected.url, "_blank")}
                                className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                                title="Open full size"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const a = document.createElement("a");
                                  a.href = selected.url;
                                  a.download = selected.label || "image";
                                  a.click();
                                }}
                                className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                                title="Download"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                {selected.label && (
                                  <p className="text-[11px] text-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded truncate max-w-[200px]">
                                    {selected.label}
                                  </p>
                                )}
                                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full", selected.source === "generated" ? "bg-primary/20 text-primary" : "bg-blue-500/20 text-blue-400")}>
                                  {selected.source}
                                </span>
                              </div>
                              <button
                                onClick={() => { setLightboxIdx(selectedImageIdx ?? 0); setImageLightboxOpen(true); }}
                                className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                                title="Expand"
                              >
                                <Maximize2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Thumbnail strip */}
                      <div className="shrink-0 border-t border-border p-2 overflow-x-auto">
                        <div className="flex items-center gap-2">
                          {allImages.map((img, i) => (
                            <button
                              key={`${img.source}-${i}`}
                              onClick={() => setSelectedImageIdx(i)}
                              className={cn(
                                "w-14 h-14 rounded-md overflow-hidden border-2 shrink-0 transition-all relative",
                                (selectedImageIdx ?? 0) === i
                                  ? "border-primary shadow-sm shadow-primary/20"
                                  : "border-border hover:border-foreground/30"
                              )}
                            >
                              <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                              <span className={cn("absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full", img.source === "generated" ? "bg-primary" : "bg-blue-400")} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Gallery grid view */
                    <div className="flex-1 overflow-y-auto p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {allImages.map((img, i) => (
                          <button
                            key={`gallery-${img.source}-${i}`}
                            onClick={() => { setLightboxIdx(i); setImageLightboxOpen(true); }}
                            className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-all group"
                          >
                            <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
                              <span className="text-[9px] text-white bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded truncate max-w-[80%]">
                                {img.label}
                              </span>
                              <span className={cn("w-2 h-2 rounded-full shrink-0", img.source === "generated" ? "bg-primary" : "bg-blue-400")} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                  <div>
                    <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-xs">No images yet</p>
                    <p className="text-[10px] mt-1 text-muted-foreground">Generated and uploaded images will appear here</p>
                  </div>
                </div>
              )}

              {/* Lightbox */}
              {imageLightboxOpen && allImageUrls.length > 0 && (
                <ImageLightbox
                  images={allImageUrls}
                  currentIndex={lightboxIdx}
                  onClose={() => setImageLightboxOpen(false)}
                  onNavigate={(idx) => setLightboxIdx(idx)}
                />
              )}
            </div>
          );
        })()}

        {activeTab === "documents" && (
          <div className="h-full overflow-hidden flex flex-col">
            {allDocuments.length > 0 ? (
              <>
                {/* Document list */}
                <div className="shrink-0 border-b border-border overflow-x-auto">
                  <div className="flex items-center gap-0 px-2 pt-1">
                    {allDocuments.map((doc, i) => {
                      const icon = doc.docType === "pdf" ? "📄" : doc.docType === "docx" ? "📝" : doc.docType === "slides" ? "📊" : doc.docType === "xlsx" ? "📊" : doc.docType === "csv" ? "📈" : "📋";
                      return (
                        <button
                          key={doc.id || i}
                          onClick={() => setSelectedDocIdx(i)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-[10px] border-b-2 transition-colors whitespace-nowrap",
                            (selectedDocIdx ?? 0) === i
                              ? "border-primary text-foreground"
                              : "border-transparent text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="text-xs">{icon}</span>
                          {doc.label || `Document ${i + 1}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Document preview */}
                {(() => {
                  const doc = allDocuments[selectedDocIdx ?? 0];
                  if (!doc) return null;
                  const ext = doc.docType === "pdf" ? ".pdf" : doc.docType === "docx" ? ".docx" : ".md";
                  return (
                    <div className="flex-1 overflow-auto">
                      {/* Toolbar */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                        <span className="text-[10px] text-muted-foreground">
                          {doc.label || "Document"} &middot; {ext.toUpperCase().slice(1)}
                        </span>
                        <div className="flex items-center gap-1">
                          {doc.url && (
                            <button
                              onClick={() => window.open(doc.url!, "_blank")}
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (doc.url) {
                                const a = document.createElement("a");
                                a.href = doc.url;
                                a.download = (doc.label || "document") + ext;
                                a.click();
                              } else if (doc.content) {
                                const blob = new Blob([doc.content], { type: "text/markdown" });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = (doc.label || "document") + ext;
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                            title="Download"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {/* Preview content */}
                      {(doc.docType === "pdf" || doc.docType === "slides") && doc.url ? (
                        <iframe
                          src={doc.url}
                          className="w-full h-full border-0"
                          title={doc.label || (doc.docType === "slides" ? "Slides Preview" : "PDF Preview")}
                          sandbox="allow-scripts allow-same-origin"
                        />
                      ) : (doc.docType === "xlsx" || doc.docType === "csv" || doc.docType === "docx") && doc.url ? (
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                          <div className="space-y-3">
                            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                              <span className="text-2xl">{doc.docType === "xlsx" ? "📊" : doc.docType === "csv" ? "📈" : "📝"}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc.label || "Document"}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{doc.docType.toUpperCase()} file</p>
                            </div>
                            <button
                              onClick={() => window.open(doc.url!, "_blank")}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              <Download className="w-3 h-3" />
                              Download {doc.docType.toUpperCase()}
                            </button>
                          </div>
                        </div>
                      ) : doc.content ? (
                        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{doc.content}</Streamdown>
                        </div>
                      ) : doc.url ? (
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                          <div className="space-y-3">
                            <FileText className="w-10 h-10 mx-auto opacity-30" />
                            <button
                              onClick={() => window.open(doc.url!, "_blank")}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                            >
                              <Download className="w-3 h-3" />
                              Download File
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                          <div>
                            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs">Preview not available</p>
                            <p className="text-[10px] mt-1 text-muted-foreground">Click download to view this file</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No documents yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">PDF, DOCX, and Markdown files will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* All Files Tab — Manus parity */}
        {activeTab === "all" && (
          <div className="h-full overflow-auto p-3">
            {totalArtifactCount > 0 ? (
              <div className="space-y-3">
                {allDocuments.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Documents</h4>
                    <div className="space-y-1">
                      {allDocuments.map((doc, i) => (
                        <button
                          key={doc.id || i}
                          onClick={() => { setActiveTab("documents"); setSelectedDocIdx(i); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                        >
                          <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground truncate">{doc.label || `Document ${i + 1}`}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{doc.docType.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(imageArtifacts.data?.length || 0) > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Images</h4>
                    <div className="space-y-1">
                      {imageArtifacts.data?.map((img: any, i: number) => (
                        <button
                          key={img.id || i}
                          onClick={() => { setActiveTab("images"); setSelectedImageIdx(i); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground truncate">{img.label || `Image ${i + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(codeArtifacts.data?.length || 0) > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Code</h4>
                    <div className="space-y-1">
                      {codeArtifacts.data?.map((code: any, i: number) => (
                        <button
                          key={code.id || i}
                          onClick={() => { setActiveTab("code"); setSelectedCodeIdx(i); }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                        >
                          <Code className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground truncate">{code.label || `Code ${i + 1}`}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {extractedLinks.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Links</h4>
                    <div className="space-y-1">
                      {extractedLinks.slice(0, 10).map((link, i) => (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                        >
                          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground truncate">{link.label}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No files yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">Documents, images, code, and links will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Links Tab — Manus parity */}
        {activeTab === "links" && (
          <div className="h-full overflow-auto p-3">
            {extractedLinks.length > 0 ? (
              <div className="space-y-1">
                {extractedLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-accent/50 transition-colors group"
                  >
                    <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground truncate group-hover:text-primary transition-colors">{link.label}</p>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <LinkIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No links yet</p>
                  <p className="text-[10px] mt-1 text-muted-foreground">URLs from agent responses will appear here</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timeline / Progress */}
      <div className="h-10 flex items-center justify-between px-4 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
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

// ── Voice Recording Hook ──

function useVoiceRecorder(onTranscription: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcribeMutation = trpc.voice.transcribe.useMutation({
    onError: (err) => { toast.error("Transcription failed: " + err.message); },
  });

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        if (blob.size > 16 * 1024 * 1024) {
          setVoiceError("Recording too large (max 16MB). Try a shorter recording.");
          return;
        }
        setVoiceError(null);
        setTranscribing(true);
        try {
          // Upload to S3 first
          const formData = new FormData();
          const ext = mediaRecorder.mimeType.includes("webm") ? "webm" : "m4a";
          const fileName = `voice-${Date.now()}.${ext}`;
          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": mediaRecorder.mimeType,
              "X-File-Name": fileName,
              "X-Task-Id": "voice",
            },
            credentials: "include",
            body: blob,
          });
          if (!response.ok) throw new Error("Upload failed");
          const { url } = await response.json();
          // Transcribe
          const result = await transcribeMutation.mutateAsync({
            audioUrl: url,
            language: "en",
          });
          if (result.text) {
            onTranscription(result.text);
          }
        } catch (err: any) {
          // F4.1: Provide specific error messages based on error type
          const msg = err.message || "";
          if (msg.includes("Upload failed")) {
            setVoiceError("Failed to upload audio. Please check your connection and try again.");
          } else if (msg.includes("16MB") || msg.includes("too large") || msg.includes("size")) {
            setVoiceError("Recording is too large (max 16MB). Try a shorter recording.");
          } else if (msg.includes("format") || msg.includes("unsupported")) {
            setVoiceError("Audio format not supported. Supported: webm, mp3, wav, ogg, m4a.");
          } else if (msg.includes("timeout") || msg.includes("TIMEOUT")) {
            setVoiceError("Transcription timed out. Try a shorter recording or check your connection.");
          } else if (msg.includes("rate limit") || msg.includes("429")) {
            setVoiceError("Too many requests. Please wait a moment and try again.");
          } else {
            setVoiceError(msg || "Transcription failed. Please try again.");
          }
        } finally {
          setTranscribing(false);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setVoiceError("Microphone access denied. Please allow microphone access in your browser settings.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutateAsync is stable (tRPC)
  }, [onTranscription, transcribeMutation.mutateAsync]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  /** Cancel recording — stops mic and discards audio without transcribing */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      // Remove the onstop handler so it doesn't trigger transcription
      mediaRecorderRef.current.onstop = () => {
        // Stop all tracks to release microphone
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
      };
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }
    chunksRef.current = [];
    setRecording(false);
    setVoiceError(null);
  }, []);

  return { recording, transcribing, voiceError, startRecording, stopRecording, cancelRecording, clearVoiceError: () => setVoiceError(null) };
}

// ── Helper: Map tool display type to AgentAction ──

function mapToolToAction(
  type: string,
  label: string,
  args: any,
  status: "active" | "done"
): AgentAction {
  switch (type) {
    case "searching":
      return { type: "searching", query: args?.query || label, status };
    case "generating":
      return { type: "generating", description: args?.prompt || label, status };
    case "executing":
      return { type: "executing", command: args?.description || args?.command || label, status };
    case "browsing":
      return { type: "browsing", url: args?.url || label, status };
    case "creating":
      return { type: "creating", file: args?.file || args?.name || label, status };
    case "writing":
      return { type: "writing", label, status };
    case "researching":
      return { type: "researching", label, status };
    case "building":
      return { type: "building", label, status };
    case "editing":
      return { type: "editing", label, file: args?.path || args?.file, status };
    case "reading":
      return { type: "reading", label, file: args?.path || args?.file, status };
    case "installing":
      return { type: "installing", label, packages: args?.packages, status };
    case "versioning":
      return { type: "versioning", label, status };
    case "analyzing":
      return { type: "analyzing", label, status };
    case "designing":
      return { type: "designing", label, status };
    case "sending":
      return { type: "sending", label, status };
    case "deploying":
      return { type: "deploying", label, status };
    case "thinking":
    default:
      return { type: "thinking", status };
  }
}

// ── Main TaskView ──

export default function TaskView() {
  const [, params] = useRoute("/task/:id");
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const replayRequested = useMemo(() => new URLSearchParams(searchString).get("replay") === "1", [searchString]);
  const [replayOpen, setReplayOpen] = useState(false);
  const { tasks, activeTask, setActiveTask, addMessage, removeLastMessage, replaceLastMessage, updateTaskStatus, renameTask: renameTaskFn, markAutoStreamed, updateMessageCard, updateTaskFavorite, editMessageAndTruncate } = useTask();
  const { status: bridgeStatus, sendRaw: bridgeSend, lastEvent } = useBridge();
  const { isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [streamImages, setStreamImages] = useState<string[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [stepProgress, setStepProgress] = useState<{ completed: number; total: number; turn: number } | null>(null);
  const [tokenUsage, setTokenUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_tokens: number; turn: number } | null>(null);
  const [knowledgeRecalled, setKnowledgeRecalled] = useState<{ count: number; keys: string[] } | null>(null);
  const [aegisMeta, setAegisMeta] = useState<{ classification?: { taskType: string; complexity: string }; planSteps?: string[]; quality?: Record<string, number> } | null>(null);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [desktopWorkspaceOpen, setDesktopWorkspaceOpen] = useState(() => {
    try { return localStorage.getItem("manus-workspace-panel") !== "closed"; } catch { return true; }
  });
  const toggleDesktopWorkspace = useCallback(() => {
    setDesktopWorkspaceOpen(prev => {
      const next = !prev;
      try { localStorage.setItem("manus-workspace-panel", next ? "open" : "closed"); } catch {}
      return next;
    });
  }, []);
  const { ratio: workspaceRatio, updateRatio: updateWorkspaceRatio } = useWorkspaceDivider();
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [branchTreeOpen, setBranchTreeOpen] = useState(false);
  const [branchCompareOpen, setBranchCompareOpen] = useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [shareCopied, setShareCopied] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>(() => {
    try {
      // Primary: read model ID and convert to mode
      const direct = localStorage.getItem("manus-selected-model");
      const modelToMode: Record<string, AgentMode> = {
        "manus-next-limitless": "limitless",
        "manus-next-max": "max",
        "manus-next-standard": "quality",
        "manus-next-lite": "speed",
      };
      if (direct && modelToMode[direct]) return modelToMode[direct];
      // Fallback: read agent mode directly
      const stored = localStorage.getItem("manus-agent-mode");
      if (stored && ["speed", "quality", "max", "limitless"].includes(stored)) {
        return stored as AgentMode;
      }
    } catch {}
    return "max";
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [specializedMode, setSpecializedMode] = useState<SpecializedMode>(null);
  const [connectorsSheetOpen, setConnectorsSheetOpen] = useState(false);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [mediaPanelMode, setMediaPanelMode] = useState<"screen" | "camera" | "upload" | null>(null);
  const [mediaAttachments, setMediaAttachments] = useState<Array<{ url: string; mimeType: string; type: string }>>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [lastErrorRetryable, setLastErrorRetryable] = useState(false);
  const [generationIncomplete, setGenerationIncomplete] = useState(false);
  const [agentFollowUps, setAgentFollowUps] = useState<string[]>([]);

  // In-conversation search (Pass 5 Step 1)
  const { searchOpen, closeSearch } = useConversationSearch();
  // User message edit & re-send (Pass 5 Step 2)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dragCounterRef = useRef(0);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  // Refs for saving partial content on navigation/unmount
  const accumulatedRef = useRef<string>("");
  const streamingTaskIdRef = useRef<string | null>(null);
  const actionsRef = useRef<AgentAction[]>([]);
  const taskExternalId = activeTask?.id || params?.id;
  const { files, uploading, progress, error: uploadError, upload, openPicker, handleFileChange, removeFile, clearFiles, inputRef: fileInputRef } = useFileUpload(taskExternalId);

  // Pick up pending files from Home page (transferred via window.__pendingTaskFiles)
  useEffect(() => {
    const pending = (window as any).__pendingTaskFiles as File[] | undefined;
    if (pending && pending.length > 0) {
      delete (window as any).__pendingTaskFiles;
      // Upload each pending file
      (async () => {
        for (const file of pending) {
          await upload(file);
        }
      })();
    }
  }, [upload]);

  // tRPC mutations for task management
  const utils = trpc.useUtils();
  const archiveMutation = trpc.task.archive.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      utils.task.search.invalidate();
    },
    onError: () => { toast.error("Failed to delete task"); },
  });
  const favoriteMutation = trpc.task.toggleFavorite.useMutation({
    onSuccess: () => {
      // Optimistically update local task state so the favorites filter reflects immediately
      if (task) {
        const newFav = task.favorite === 1 ? 0 : 1;
        updateTaskFavorite(task.id, newFav);
      }
      utils.task.list.invalidate();
    },
    onError: () => { toast.error("Failed to update bookmark"); },
  });
  const systemPromptMutation = trpc.task.updateSystemPrompt.useMutation({
    onSuccess: () => { toast.success("System prompt saved"); },
    onError: () => { toast.error("Failed to save system prompt"); },
  });
  const saveTemplateMutation = trpc.templates.create.useMutation({
    onSuccess: () => { toast.success("Saved as template"); },
    onError: () => { toast.error("Failed to save template"); },
  });
  const deleteLastMsgsMutation = trpc.task.deleteLastMessages.useMutation();
  const resumeStaleMutation = trpc.task.resumeStale.useMutation({
    onSuccess: () => {
      toast.success("Task resumed — you can continue where you left off");
      utils.task.list.invalidate();
      utils.task.get.invalidate();
    },
    onError: () => { toast.error("Failed to resume task"); },
  });
  const duplicateTaskMutation = trpc.task.duplicate.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
    },
    onError: () => { toast.error("Failed to duplicate task"); },
  });
  const generateTitleMut = trpc.task.generateTitle.useMutation({
    onSuccess: (data) => {
      if (data.title && task) {
        renameTaskFn(task.id, data.title);
      }
    },
  });
  const taskQuery = trpc.task.get.useQuery(
    { externalId: taskExternalId || "" },
    { enabled: !!taskExternalId && isAuthenticated }
  );

  // Voice recording
  const handleTranscription = useCallback((text: string) => {
    setInput(prev => prev ? `${prev} ${text}` : text);
    inputRef.current?.focus();
  }, []);
  const { recording, transcribing, voiceError, startRecording, stopRecording, cancelRecording, clearVoiceError } = useVoiceRecorder(handleTranscription);

  // ── User Preferences for TTS (P15) ──
  const prefsQuery = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const userTTSVoice = (prefsQuery.data?.generalSettings as any)?.ttsVoice || "en-US-AriaNeural";
  const userTTSLanguage = (prefsQuery.data?.generalSettings as any)?.ttsLanguage || "en";
  const userTTSRate = (prefsQuery.data?.generalSettings as any)?.ttsRate || 1.0;
  const ttsRateStr = userTTSRate === 1.0 ? undefined : `${userTTSRate > 1 ? "+" : ""}${Math.round((userTTSRate - 1) * 100)}%`;

  // ── Hands-Free Voice Mode (P15) ──
  const handsFreeInputRef = useRef<string>("");
  // Hands-free transcription uses the same tRPC mutation as the regular voice recorder
  const handsFreeTranscribeMutation = trpc.voice.transcribe.useMutation({
    onError: (err) => { toast.error("Voice transcription failed: " + err.message); },
  });

  const handsFree = useHandsFreeMode({
    voice: userTTSVoice,
    language: userTTSLanguage,
    autoListen: true,
    soundEffects: true,
    onTranscription: (text) => {
      handsFreeInputRef.current = text;
    },
    onSendMessage: (text) => {
      // Auto-send the transcribed message
      if (!task) return;
      addMessage(task.id, { role: "user", content: text });
      // Trigger streaming
      handleHandsFreeSend(text);
    },
    uploadAudio: async (blob: Blob, fileName: string, mimeType: string) => {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": mimeType,
          "X-File-Name": fileName,
          "X-Task-Id": "handsfree",
        },
        credentials: "include",
        body: blob,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const data = await response.json();
      return data.url;
    },
    transcribeAudio: async (audioUrl: string, language?: string) => {
      const result = await handsFreeTranscribeMutation.mutateAsync({
        audioUrl,
        language: language || "en",
      });
      return result.text || "";
    },
  });

  // Keyboard shortcut: Ctrl+Shift+V to toggle hands-free mode (Grok parity)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        if (handsFree.isActive) {
          handsFree.deactivate();
        } else {
          handsFree.activate();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handsFree.isActive, handsFree.activate, handsFree.deactivate]);

  // Edge TTS for per-message read-aloud (replaces browser SpeechSynthesis)
  const edgeTTS = useEdgeTTS();

  // Load per-task system prompt when task changes — only initialize once per task
  const promptInitRef = useRef<string | null>(null);
  useEffect(() => {
    const currentTaskId = taskExternalId || "";
    if (promptInitRef.current === currentTaskId) return; // Already initialized for this task
    if (taskQuery.isLoading) return; // Wait for data
    promptInitRef.current = currentTaskId;
    setSystemPromptDraft(taskQuery.data?.systemPrompt || "");
  }, [taskExternalId, taskQuery.data?.systemPrompt, taskQuery.isLoading]);

  // Close more menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoreMenu]);

  // Listen for bridge events
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

  // Auto-open replay mode when ?replay=1 is in URL
  useEffect(() => {
    if (replayRequested && task && task.messages.length > 0) {
      setReplayOpen(true);
    }
  }, [replayRequested, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to a specific message index (used by replay overlay)
  const scrollToMessage = useCallback((messageIndex: number) => {
    if (!scrollRef.current) return;
    const messageElements = scrollRef.current.querySelectorAll('[data-message-index]');
    const target = Array.from(messageElements).find(
      el => (el as HTMLElement).dataset.messageIndex === String(messageIndex)
    );
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Track whether user has scrolled up (to avoid forcing scroll during reading)
  const userScrolledUpRef = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      // User is "scrolled up" if more than 150px from bottom
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 150;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current && !replayOpen && !userScrolledUpRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [task?.messages.length, replayOpen, streamContent, agentActions.length, streaming]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [task?.id]);

  // Keep a ref to addMessage so the cleanup effect can call it without re-running
  // when addMessage's reference changes (which would abort the in-flight stream).
  const addMessageRef = useRef(addMessage);
  useEffect(() => { addMessageRef.current = addMessage; }, [addMessage]);

  // Save partial streaming content on page unload or component unmount
  // This ensures in-progress assistant messages aren't lost when the user navigates away
  useEffect(() => {
    const savePartialContent = () => {
      const taskId = streamingTaskIdRef.current;
      const content = accumulatedRef.current;
      if (taskId && content.trim()) {
        // Use addMessage (via ref) to persist the partial content
        addMessageRef.current(taskId, {
          role: "assistant",
          content: content + "\n\n*[Response interrupted — partial content saved]*",
          actions: actionsRef.current.length > 0 ? actionsRef.current : undefined,
        });
        // Clear refs to prevent double-save
        streamingTaskIdRef.current = null;
        accumulatedRef.current = "";
        actionsRef.current = [];
      }
    };

    const handleBeforeUnload = () => {
      savePartialContent();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount ONLY: save partial content FIRST, then abort the stream.
    // Order matters: savePartialContent reads refs that the abort's finally block would clear.
    // CRITICAL: empty dependency array ensures this only runs on mount/unmount,
    // NOT when addMessage changes (which would abort the in-flight stream).
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      savePartialContent();
      // Abort any in-flight stream so it doesn't continue running in the background
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- must only run on unmount; addMessage accessed via ref
  }, []);

  // Auto-stream for initial message in a newly created task
  // When navigating from Home, createTask adds the first user message but never calls /api/stream.
  // This effect detects that pattern and triggers the LLM stream automatically.
  // IMPORTANT: We use a ref to track which task IDs have already been auto-streamed in this
  // component instance, in addition to the context-level flag. This prevents re-triggering
  // when the dependency array changes due to message dedup or state updates.
  const autoStreamedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!task) return;
    if (streaming) return;
    if (task.autoStreamed) return;
    if (autoStreamedIdsRef.current.has(task.id)) return;
    // Only trigger if: exactly 1 message, it's a user message, and no assistant response yet
    if (task.messages.length !== 1) return;
    const firstMsg = task.messages[0];
    if (firstMsg.role !== "user") return;
    // Mark as auto-streamed immediately — both in ref (instant) and context (persisted)
    autoStreamedIdsRef.current.add(task.id);
    markAutoStreamed(task.id);

    // Trigger the SSE stream for the initial message
    (async () => {
      // Bridge integration: only route to bridge if it's truly connected AND verified.
      // Even then, add a timeout fallback — if bridge doesn't produce a task event
      // within 5 seconds, fall back to SSE streaming.
      // NOTE: For now, we always use SSE since bridge response handling (onTaskEvent)
      // is not yet wired into TaskView. The bridge path will be re-enabled when
      // full bridge ↔ TaskView event integration is implemented.
      // if (bridgeStatus === "connected") { ... }

      setStreaming(true);
      setGenerationIncomplete(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
      setKnowledgeRecalled(null);
      setLastErrorRetryable(false);
      setStreamImages([]);
      streamingTaskIdRef.current = task.id;
      accumulatedRef.current = "";
      actionsRef.current = [];
      let accumulated = "";
      const actions: AgentAction[] = [];
      const images: string[] = [];

      try {
        // System prompt is handled server-side (agentStream.ts)
        const messages = [
          { role: "user" as const, content: firstMsg.content },
        ];

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const streamState: StreamState = { accumulated: "", actions, images, sourceUrls: [] };
        const callbacks = buildStreamCallbacks(streamState, {
          setStreamContent, setAgentActions, setStreamImages, setStepProgress,
          updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
          addMessage, setIsReconnecting, setLastErrorRetryable, setTokenUsage, setGenerationIncomplete, setKnowledgeRecalled,
          updateMessageCard, setAegisMeta,
          setFollowUpSuggestions: setAgentFollowUps,
          getTaskMessages: () => task?.messages || [],
          onPreviewRefreshSignal: () => setPreviewRefreshKey((k) => k + 1),
          onPreviewUrlUpdate: (url: string) => {
            // Update the webapp_preview card's previewUrl when S3 re-upload provides a new URL
            const msgs = task?.messages || [];
            const previewMsg = msgs.find((m) => m.cardType === "webapp_preview");
            if (previewMsg?.id) {
              updateMessageCard(task.id, previewMsg.id, { previewUrl: url });
            }
          },
        });

        await streamWithRetry({
          messages, taskExternalId: task.id, mode: agentMode,
          signal: controller.signal, callbacks,
        });

        accumulated = streamState.accumulated;

        // Mark all remaining active actions as done
        setStepProgress(null);
        const finalActions = streamState.actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
        addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });

        // Auto-generate title after first agent response (only if title looks like user's raw input)
        if (task.messages.length <= 2 && accumulated.trim() && isAuthenticated) {
          const userMsg = task.messages.find(m => m.role === "user");
          if (userMsg && task.title === userMsg.content.slice(0, 50) + (userMsg.content.length > 50 ? "..." : "") || task.title === userMsg?.content.slice(0, 50)) {
            generateTitleMut.mutate({
              externalId: task.id,
              userMessage: userMsg?.content || "",
              assistantMessage: accumulated.slice(0, 2000),
            });
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          if (accumulated.trim()) {
            addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
          }
        } else {
          addMessage(task.id, {
            role: "assistant",
            content: getStreamErrorMessage(err),
          });
          // Ensure task doesn't stay stuck in "running" after a stream error
          updateTaskStatus(task.id, "error");
        }
      } finally {
        abortControllerRef.current = null;
        streamingTaskIdRef.current = null;
        accumulatedRef.current = "";
        actionsRef.current = [];
        setStreaming(false);
        setStreamContent("");
        setAgentActions([]);
        setStreamImages([]);
        setStepProgress(null);
        setAegisMeta(null);
      }
    })();
  }, [task?.id, task?.messages.length, task?.autoStreamed, streaming, bridgeStatus, bridgeSend, addMessage, markAutoStreamed, agentMode, updateTaskStatus]);

  const isTyping = useMemo(() => {
    if (!task) return false;
    const lastMsg = task.messages[task.messages.length - 1];
    return lastMsg?.role === "assistant" && lastMsg.actions?.some(a => a.status === "active");
  }, [task]);


  const handleSend = useCallback(async () => {
    if (!input.trim() || !task) return;
    // If currently streaming, queue the follow-up: add user message, abort current stream,
    // and let the user's new message trigger a fresh stream with full conversation history.
    if (streaming && abortControllerRef.current) {
      // Add the user message to the conversation immediately
      const userContent = files.length > 0
        ? `${input}\n\n📎 Attached: ${files.map(f => f.fileName).join(", ")}`
        : input;
      addMessage(task.id, { role: "user", content: userContent });
      setInput("");
      clearFiles();
      inputRef.current?.focus();
      // Abort the current stream — the finally block will reset streaming state
      abortControllerRef.current.abort();
      // Auto-trigger a new stream after a short delay to pick up the user's message.
      // This prevents the "stuck running" state where the user sends a message but
      // the agent never responds because streaming was still true.
      setTimeout(() => {
        // The finally block from the abort should have reset streaming by now.
        // If not, force-reset it so the user can interact.
        setStreaming(false);
      }, 500);
      return;
    }
    const userContent = files.length > 0
      ? `${input}\n\n📎 Attached: ${files.map(f => f.fileName).join(", ")}`
      : input;
    addMessage(task.id, { role: "user", content: userContent });

    // Bridge integration: disabled until onTaskEvent is wired into TaskView.
    // When bridge response handling is implemented, re-enable this block.
    // if (bridgeStatus === "connected") {
    //   bridgeSend("task.message", { taskId: task.id, content: input, files: files.map(f => ({ url: f.url, name: f.fileName })) });
    //   setInput(""); clearFiles(); inputRef.current?.focus();
    //   return;
    // }

    // Otherwise, use SSE streaming from the LLM
    // C8-A2: Detect "continue" / "resume" commands and enrich with context
    const CONTINUE_PATTERNS = /^\s*(continue|keep\s*going|go\s*on|resume|carry\s*on|proceed|keep\s*at\s*it)\s*[.!]?\s*$/i;
    let currentInput = input;
    if (CONTINUE_PATTERNS.test(input.trim())) {
      // Find the last assistant message to provide context for resumption
      const lastAssistant = [...task.messages].reverse().find(m => m.role === "assistant");
      const wasInterrupted = lastAssistant?.content?.includes("[Response interrupted") ||
        lastAssistant?.content?.includes("[Generation stopped") ||
        generationIncomplete || task.staleCompleted === 1;
      if (wasInterrupted && lastAssistant) {
        // Enrich the continue command with context about what was interrupted
        const truncatedPrev = lastAssistant.content.slice(-500);
        currentInput = `continue\n\n[System context: The previous response was interrupted. The last assistant message ended with: \"...${truncatedPrev}\". Please resume from where you left off.]`;
      }
    }
    const currentFiles = [...files]; // Capture files before clearing
    setInput("");
    clearFiles();
    inputRef.current?.focus();
    setStreaming(true);
    setGenerationIncomplete(false);
    setStreamContent("");
    setAgentActions([]);
    setLastErrorRetryable(false);
    setStreamImages([]);
    streamingTaskIdRef.current = task.id;
    accumulatedRef.current = "";
    actionsRef.current = [];

    let accumulated = "";
    const actions: AgentAction[] = [];
    const images: string[] = [];

    try {
      // Build conversation history (system prompt is handled server-side)
      // Send up to 50 messages for full context — server has a 200-message limit guard.
      // Filter out card-only messages (empty content with cardType) since they're UI-only.
      const conversationMessages = task.messages
        .filter(m => m.content.trim() || m.role === "user") // Keep all user msgs + non-empty assistant msgs
        .filter(m => !(m.role === "assistant" && isStreamErrorMessage(m.content))) // Skip error messages from context
        .slice(-50)
        .map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));

      // Build user message with multimodal content if files or media are attached
      const currentMedia = [...mediaAttachments];
      let userMessage: any;
      if (currentFiles.length > 0 || currentMedia.length > 0) {
        // Multimodal message: text + file references + media context
        const content: any[] = [{ type: "text", text: currentInput }];
        for (const f of currentFiles) {
          const ext = f.fileName.split(".").pop()?.toLowerCase() || "";
          const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
          const audioExts = ["mp3", "wav", "ogg", "m4a", "webm"];
          const videoExts = ["mp4", "webm", "mov", "avi", "mkv"];
          const pdfExts = ["pdf"];

          if (imageExts.includes(ext)) {
            content.push({ type: "image_url", image_url: { url: f.url, detail: "auto" } });
          } else if (audioExts.includes(ext)) {
            content.push({ type: "file_url", file_url: { url: f.url, mime_type: `audio/${ext === "mp3" ? "mpeg" : ext}` } });
          } else if (videoExts.includes(ext)) {
            content.push({ type: "file_url", file_url: { url: f.url, mime_type: `video/${ext === "mov" ? "quicktime" : ext}` } });
          } else if (pdfExts.includes(ext)) {
            content.push({ type: "file_url", file_url: { url: f.url, mime_type: "application/pdf" } });
          } else {
            // For text-based files, fetch content and inline it so the LLM can read it
            const textExts = ["txt", "md", "html", "htm", "css", "js", "ts", "tsx", "jsx", "json", "csv", "tsv", "xml", "yaml", "yml", "toml", "ini", "cfg", "conf", "log", "sh", "bash", "py", "rb", "go", "rs", "java", "c", "cpp", "h", "hpp", "sql", "graphql", "env", "gitignore", "dockerfile", "makefile"];
            if (textExts.includes(ext) || ext === "") {
              try {
                const textResp = await fetch(f.url);
                if (textResp.ok) {
                  const textBody = await textResp.text();
                  // Truncate very large files to avoid token limits (max ~50KB of text)
                  const maxChars = 50000;
                  const truncated = textBody.length > maxChars
                    ? textBody.slice(0, maxChars) + `\n\n... [File truncated at ${maxChars} characters. Total: ${textBody.length} characters]`
                    : textBody;
                  content.push({ type: "text", text: `\n--- Attached file: ${f.fileName} ---\n${truncated}\n--- End of ${f.fileName} ---` });
                } else {
                  content.push({ type: "text", text: `\n[Attached file: ${f.fileName}](${f.url}) (could not fetch content)` });
                }
              } catch {
                content.push({ type: "text", text: `\n[Attached file: ${f.fileName}](${f.url})` });
              }
            } else {
              // Binary files — just add a reference
              content.push({ type: "text", text: `\n[Attached file: ${f.fileName}](${f.url})` });
            }
          }
        }
        // Inject media attachments (screen share frames, video recordings, video uploads)
        for (const media of currentMedia) {
          if (media.type === "screen_share_frames") {
            // Screen share frames are images
            content.push({ type: "image_url", image_url: { url: media.url, detail: "auto" } });
          } else {
            // Video recordings and uploads
            const mime = media.mimeType.startsWith("video/") ? media.mimeType : "video/mp4";
            content.push({ type: "file_url", file_url: { url: media.url, mime_type: mime } });
          }
        }
        userMessage = { role: "user" as const, content };
        // Clear media attachments after building message
        setMediaAttachments([]);
      } else {
        userMessage = { role: "user" as const, content: currentInput };
      }

      const messages = [
        ...conversationMessages,
        userMessage,
      ];

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const streamState: StreamState = { accumulated: "", actions, images, sourceUrls: [] };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setTokenUsage, setGenerationIncomplete, setKnowledgeRecalled,
        updateMessageCard, setAegisMeta,
        setFollowUpSuggestions: setAgentFollowUps,
        getTaskMessages: () => task?.messages || [],
          onPreviewRefreshSignal: () => setPreviewRefreshKey((k) => k + 1),
        onPreviewUrlUpdate: (url: string) => {
          const msgs = task?.messages || [];
          const previewMsg = msgs.find((m) => m.cardType === "webapp_preview");
          if (previewMsg?.id) updateMessageCard(task.id, previewMsg.id, { previewUrl: url });
        },
      });
      await streamWithRetry({
        messages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });
      accumulated = streamState.accumulated;
      setStepProgress(null);
      const finalActions = streamState.actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) {
          addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
        }
      } else {
        addMessage(task.id, {
          role: "assistant",
          content: getStreamErrorMessage(err),
        });
        // Ensure task doesn't stay stuck in "running" after a stream error
        updateTaskStatus(task.id, "error");
      }
    } finally {
      abortControllerRef.current = null;
      streamingTaskIdRef.current = null;
      accumulatedRef.current = "";
      actionsRef.current = [];
      setStreaming(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
      setKnowledgeRecalled(null);
      setStreamImages([]);
      setStepProgress(null);
    }
  }, [input, task, addMessage, bridgeStatus, bridgeSend, files, clearFiles]);

  // ── Hands-Free Send (P15) — streams and auto-speaks response ──
  const handleHandsFreeSend = useCallback(async (spokenText: string) => {
    if (!task) return;
    handsFree.notifyProcessing();
    setStreaming(true);
    setGenerationIncomplete(false);
    setStreamContent("");
    setAgentActions([]);
    setLastErrorRetryable(false);
    setStreamImages([]);
    streamingTaskIdRef.current = task.id;
    accumulatedRef.current = "";
    actionsRef.current = [];

    let accumulated = "";
    const actions: AgentAction[] = [];
    const images: string[] = [];

    try {
      const conversationMessages = task.messages
        .filter(m => m.content.trim() || m.role === "user")
        .filter(m => !(m.role === "assistant" && isStreamErrorMessage(m.content)))
        .slice(-50)
        .map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content,
        }));
      const messages = [
        ...conversationMessages,
        { role: "user" as const, content: spokenText },
      ];

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const streamState: StreamState = { accumulated: "", actions, images, sourceUrls: [] };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setTokenUsage, setGenerationIncomplete, setKnowledgeRecalled,
        updateMessageCard, setAegisMeta,
        setFollowUpSuggestions: setAgentFollowUps,
        getTaskMessages: () => task?.messages || [],
        onPreviewRefreshSignal: () => setPreviewRefreshKey((k) => k + 1),
        onPreviewUrlUpdate: (url: string) => {
          const msgs = task?.messages || [];
          const previewMsg = msgs.find((m) => m.cardType === "webapp_preview");
          if (previewMsg?.id) updateMessageCard(task.id, previewMsg.id, { previewUrl: url });
        },
      });

      await streamWithRetry({
        messages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });

      accumulated = streamState.accumulated;

      setStepProgress(null);
      const finalActions = streamState.actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });

      // ── Auto-speak the response via Edge TTS ──
      handsFree.notifyComplete(accumulated);
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) {
          addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped]*", actions: actions.length > 0 ? actions : undefined });
        }
      } else {
        const errorMsg = getStreamErrorMessage(err);
        addMessage(task.id, { role: "assistant", content: errorMsg });
        handsFree.notifyError(errorMsg);
      }
    } finally {
      abortControllerRef.current = null;
      streamingTaskIdRef.current = null;
      accumulatedRef.current = "";
      actionsRef.current = [];
      setStreaming(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
      setKnowledgeRecalled(null);
      setStreamImages([]);
      setStepProgress(null);
    }
  }, [task, addMessage, agentMode, handsFree]);

  const handleStopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Regenerate: remove the last assistant message and re-send the conversation.
   * This re-triggers the SSE stream with the same conversation history minus the last response.
   */
  const handleRegenerate = useCallback(async () => {
    if (!task || streaming) return;
    // Check the last message is an assistant message (error or otherwise)
    const lastMsg = task.messages[task.messages.length - 1];
    if (!lastMsg || lastMsg.role !== "assistant") return;

    // Delete the last assistant message from the server DB so it doesn't reappear on reload
    if (task.serverId) {
      deleteLastMsgsMutation.mutate({ taskExternalId: task.id, count: 1 });
    }

    // Replace with a placeholder while regenerating
    replaceLastMessage(task.id, { role: "assistant", content: "" });

    // Re-send the conversation (minus the last assistant message)
    setStreaming(true);
    setGenerationIncomplete(false);
    setStreamContent("");
    setAgentActions([]);
    setLastErrorRetryable(false);
    setStreamImages([]);
    streamingTaskIdRef.current = task.id;
    accumulatedRef.current = "";
    actionsRef.current = [];
    let accumulated = "";
    const actions: AgentAction[] = [];
    const images: string[]= [];

    try {
      // Build conversation from remaining messages (exclude last assistant msg)
      const conversationMessages = task.messages
        .filter(m => m.id !== lastMsg.id) // Exclude the message being regenerated
        .filter(m => m.content.trim() || m.role === "user")
        .filter(m => !(m.role === "assistant" && isStreamErrorMessage(m.content)))
        .slice(-50)
        .map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const streamState: StreamState = { accumulated: "", actions, images, sourceUrls: [] };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setTokenUsage, setGenerationIncomplete, setKnowledgeRecalled,
        updateMessageCard, setAegisMeta,
        setFollowUpSuggestions: setAgentFollowUps,
        getTaskMessages: () => task?.messages || [],
        onPreviewRefreshSignal: () => setPreviewRefreshKey((k) => k + 1),
        onPreviewUrlUpdate: (url: string) => {
          const msgs = task?.messages || [];
          const previewMsg = msgs.find((m) => m.cardType === "webapp_preview");
          if (previewMsg?.id) updateMessageCard(task.id, previewMsg.id, { previewUrl: url });
        },
      });

      await streamWithRetry({
        messages: conversationMessages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });

      accumulated = streamState.accumulated;

      setStepProgress(null);
      const finalActions = streamState.actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
      } else {
        addMessage(task.id, { role: "assistant", content: getStreamErrorMessage(err) });
      }
    } finally {
      abortControllerRef.current = null;
      streamingTaskIdRef.current = null;
      accumulatedRef.current = "";
      actionsRef.current = [];
      setStreaming(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
      setKnowledgeRecalled(null);
      setStreamImages([]);
      setStepProgress(null);
    }
  }, [task, streaming, removeLastMessage, replaceLastMessage, addMessage, agentMode, updateTaskStatus]);

  /**
   * Edit & Re-send: modify a user message, truncate everything after it,
   * then re-stream the agent response with the updated conversation.
   * Pass 5 Step 2 — Manus parity: edit any user message inline.
   */
  const handleEditAndResend = useCallback(async (messageId: string, newContent: string) => {
    if (!task || streaming || !newContent.trim()) return;
    // 1. Edit the message and truncate everything after it
    editMessageAndTruncate(task.id, messageId, newContent);
    setEditingMessageId(null);
    setEditDraft("");
    // 2. Re-stream with the updated conversation
    setStreaming(true);
    setGenerationIncomplete(false);
    setStreamContent("");
    setAgentActions([]);
    setLastErrorRetryable(false);
    setStreamImages([]);
    streamingTaskIdRef.current = task.id;
    accumulatedRef.current = "";
    actionsRef.current = [];
    let accumulated = "";
    const actions: AgentAction[] = [];
    const images: string[] = [];
    try {
      // Build conversation from the truncated messages (need to wait for state update)
      // Since editMessageAndTruncate is synchronous on the state, we can build from current + edit
      const msgIndex = task.messages.findIndex(m => m.id === messageId);
      const truncatedMessages = task.messages.slice(0, msgIndex + 1).map((m, i) =>
        i === msgIndex ? { ...m, content: newContent } : m
      );
      const conversationMessages = truncatedMessages
        .filter(m => m.content.trim() || m.role === "user")
        .filter(m => !(m.role === "assistant" && isStreamErrorMessage(m.content)))
        .slice(-50)
        .map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const streamState: StreamState = { accumulated: "", actions, images, sourceUrls: [] };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setTokenUsage, setGenerationIncomplete, setKnowledgeRecalled,
        updateMessageCard, setAegisMeta,
        setFollowUpSuggestions: setAgentFollowUps,
        getTaskMessages: () => task?.messages || [],
        onPreviewRefreshSignal: () => setPreviewRefreshKey((k) => k + 1),
        onPreviewUrlUpdate: (url: string) => {
          const msgs = task?.messages || [];
          const previewMsg = msgs.find((m) => m.cardType === "webapp_preview");
          if (previewMsg?.id) updateMessageCard(task.id, previewMsg.id, { previewUrl: url });
        },
      });
      await streamWithRetry({
        messages: conversationMessages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });
      accumulated = streamState.accumulated;
      setStepProgress(null);
      const finalActions = streamState.actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
      toast.success("Message edited and re-sent");
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
      } else {
        addMessage(task.id, { role: "assistant", content: getStreamErrorMessage(err) });
      }
    } finally {
      abortControllerRef.current = null;
      streamingTaskIdRef.current = null;
      accumulatedRef.current = "";
      actionsRef.current = [];
      setStreaming(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
      setKnowledgeRecalled(null);
      setStreamImages([]);
      setStepProgress(null);
    }
  }, [task, streaming, editMessageAndTruncate, addMessage, agentMode, updateTaskStatus]);

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
      for (const file of Array.from(droppedFiles)) {
        await upload(file);
      }
    }
  }, [upload]);

  // ── Clipboard paste handler — supports images, docs, media, any file type ──
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) filesToUpload.push(file);
      }
    }

    if (filesToUpload.length === 0) return; // No files — let normal text paste proceed

    // Prevent default only when we have files to handle
    // (allow normal text paste to work unimpeded)
    e.preventDefault();

    for (const file of filesToUpload) {
      // Generate a meaningful filename for clipboard images (they often have no name)
      let uploadFile = file;
      if (file.name === "image.png" || file.name === "" || file.name === "blob") {
        const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        uploadFile = new File([file], `pasted-${timestamp}.${ext}`, { type: file.type });
      }
      await upload(uploadFile);
    }
  }, [upload]);

  // Hook: createShareMutation (MUST be before early returns — Rules of Hooks)
  const createShareMutation = trpc.share.create.useMutation({
    onError: (err) => {
      toast.error("Failed to create share link");
      console.error("[Share] create error:", err.message);
    },
  });

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Task not found</p>
      </div>
    );
  }
  // ── Header button handlers ──

  const handleShareUrl = async () => {
    // Auto-create a share link and copy the share URL (not the task URL)
    if (!taskExternalId || !isAuthenticated) {
      // Fallback for unauth: copy the task URL
      const url = `${window.location.origin}/task/${task.id}`;
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
      return;
    }
    try {
      const result = await createShareMutation.mutateAsync({
        taskExternalId,
      });
      const fullUrl = `${window.location.origin}/share/${result.shareToken}`;
      navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      toast.success("Share link copied!");
      setTimeout(() => setShareCopied(false), 2000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create share link");
    }
  };

  const handleShareDialog = () => {
    if (isAuthenticated) {
      // One-tap: auto-create share link and copy URL
      handleShareUrl();
    } else {
      handleShareUrl();
    }
  };

  const handleManageShares = () => {
    setShareDialogOpen(true);
  };

  const handleToggleFavorite = () => {
    if (!taskExternalId || !isAuthenticated) return;
    favoriteMutation.mutate({ externalId: taskExternalId });
  };

  const handleArchive = () => {
    if (!taskExternalId || !isAuthenticated) return;
    archiveMutation.mutate(
      { externalId: taskExternalId },
      { onSuccess: () => navigate("/") }
    );
  };

  const handleSaveSystemPrompt = () => {
    if (!taskExternalId || !isAuthenticated) return;
    systemPromptMutation.mutate({
      externalId: taskExternalId,
      systemPrompt: systemPromptDraft.trim() || null,
    });
    setShowSystemPrompt(false);
    setShowMoreMenu(false);
  };


  const isFavorited = taskQuery.data?.favorite === 1;

  return (
    <div ref={splitContainerRef} className="h-full flex flex-col md:flex-row md:pb-0">
      {/* ── CONVERSATION PANEL ── */}
      <div
        className="flex-1 flex flex-col min-w-0 min-h-0"
        style={desktopWorkspaceOpen ? { flex: `0 0 ${workspaceRatio * 100}%`, maxWidth: `${workspaceRatio * 100}%` } : undefined}
        data-workspace-constrained={desktopWorkspaceOpen ? "true" : undefined}
      >
        {/* Mobile override: workspace ratio must not constrain conversation on small screens */}
        <style>{`
          @media (max-width: 767px) {
            [data-workspace-constrained] {
              flex: 1 1 auto !important;
              max-width: 100% !important;
            }
          }
        `}</style>
        {/* Task Header */}
        <div className="h-12 flex items-center justify-between px-3 md:px-5 border-b border-border shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-medium text-foreground truncate max-w-[40vw]" style={{ fontFamily: "var(--font-heading)" }}>
              {task.title}
            </h2>
            {task.status === "running" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium shrink-0 flex items-center gap-1 whitespace-nowrap">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                {stepProgress ? `Step ${stepProgress.completed}/${stepProgress.total}` : "Running"}
              </span>
            )}
            {task.status === "error" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium shrink-0 whitespace-nowrap">
                Error
              </span>
            )}
            {task.status === "completed" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0 whitespace-nowrap">
                Completed
              </span>
            )}
            {/* Cost visibility indicator */}
            {(task.status === "running" || task.status === "completed") && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 whitespace-nowrap shrink-0" title="Estimated task cost">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {agentMode === "speed" ? "~$0.02" : agentMode === "limitless" ? "~$2.00+" : agentMode === "max" ? "~$0.50" : "~$0.15"}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {agentMode === "speed" ? "speed" : agentMode === "limitless" ? "limitless" : agentMode === "max" ? "max" : "quality"}
                </span>
              </span>
            )}
            {/* Tool turn counter — VU-02 fix */}
            {streaming && agentActions.length > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 whitespace-nowrap shrink-0" title={`${agentActions.length} tool calls executed`}>
                <span className="text-[10px] text-muted-foreground font-mono">{agentActions.length}</span>
                <span className="text-[9px] text-muted-foreground">tools</span>
              </span>
            )}
            {/* Token usage indicator — Session 23 */}
            {tokenUsage && tokenUsage.total_tokens > 0 && (
              <span
                className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 whitespace-nowrap shrink-0"
                title={`Prompt: ${tokenUsage.prompt_tokens.toLocaleString()} | Completion: ${tokenUsage.completion_tokens.toLocaleString()} | Turn ${tokenUsage.turn}`}
              >
                <span className="text-[10px] text-muted-foreground font-mono">
                  {tokenUsage.total_tokens >= 1000
                    ? `${(tokenUsage.total_tokens / 1000).toFixed(1)}k`
                    : tokenUsage.total_tokens}
                </span>
                <span className="text-[9px] text-muted-foreground">tokens</span>
                {/* Visual context pressure indicator */}
                {tokenUsage.prompt_tokens > 100000 && (
                  <span className={`w-1.5 h-1.5 rounded-full ${tokenUsage.prompt_tokens > 180000 ? 'bg-red-500 animate-pulse' : tokenUsage.prompt_tokens > 140000 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                )}
              </span>
            )}
            {/* ModelSelector — Manus-style left-aligned in header */}
            <ModelSelector
              compact
              className="hidden md:flex ml-1"
              selectedModelId={MODE_TO_MODEL[agentMode] || "manus-next-max"}
              onModelChange={(modelId) => {
                const modeMap: Record<string, AgentMode> = {
                  "manus-next-limitless": "limitless",
                  "manus-next-max": "max",
                  "manus-next-standard": "quality",
                  "manus-next-lite": "speed",
                };
                const newMode = modeMap[modelId];
                if (newMode) setAgentMode(newMode);
                try { localStorage.setItem("manus-selected-model", modelId); localStorage.setItem("manus-agent-mode", newMode || "quality"); } catch {}
              }}
            />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Mobile workspace toggle */}
            <button
              onClick={() => setMobileWorkspaceOpen(!mobileWorkspaceOpen)}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:hidden active:scale-95 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              title={mobileWorkspaceOpen ? "Hide workspace" : "Show workspace"}
              aria-label={mobileWorkspaceOpen ? "Hide workspace" : "Show workspace"}
            >
              {mobileWorkspaceOpen ? (
                <PanelBottomClose className="w-4 h-4" />
              ) : (
                <PanelBottomOpen className="w-4 h-4" />
              )}
            </button>

            {/* Desktop workspace panel toggle */}
            <button
              onClick={toggleDesktopWorkspace}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden md:flex focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              title={desktopWorkspaceOpen ? "Hide workspace" : "Show workspace"}
              aria-label={desktopWorkspaceOpen ? "Hide workspace" : "Show workspace"}
            >
              {desktopWorkspaceOpen ? (
                <PanelRightClose className="w-3.5 h-3.5" />
              ) : (
                <PanelRightOpen className="w-3.5 h-3.5" />
              )}
            </button>
            {/* Sandbox Viewer toggle — NS19 */}
            <button
              onClick={() => setSandboxOpen(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden md:flex focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              title="Manus's computer"
              aria-label="Open sandbox viewer"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
            </button>
            {/* Share */}
            <button
              onClick={handleShareDialog}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
              title={shareCopied ? "Copied!" : "Share task"}
              aria-label="Share task"
            >
              {shareCopied ? <Check className="w-3.5 h-3.5 text-muted-foreground" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            {/* Bookmark */}
            <button
              onClick={handleToggleFavorite}
              className={cn(
                "p-1.5 rounded-md transition-colors hidden md:flex",
                isFavorited ? "text-foreground hover:text-muted-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={isFavorited ? "Remove bookmark" : "Bookmark"}
              aria-label={isFavorited ? "Remove bookmark" : "Bookmark"}
              aria-pressed={isFavorited}
            >
              {isFavorited ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            </button>
            {/* More menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
                title="More options"
                aria-label="More options"
                aria-expanded={showMoreMenu}
                aria-haspopup="true"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-1 w-56 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-[60] py-1 max-h-[calc(100vh-6rem)] overflow-y-auto"
                  >
                    <button
                      onClick={() => {
                        if (!task) return;
                        setRenameDraft(task.title);
                        setRenameDialogOpen(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Rename Task
                    </button>
                    <button
                      onClick={() => { setShowSystemPrompt(!showSystemPrompt); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      System Prompt
                    </button>
                    <button
                      onClick={() => { setBranchTreeOpen(true); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Branch Tree
                    </button>
                    <button
                      onClick={() => { setBranchCompareOpen(true); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      Compare Branches
                    </button>
                    {/* Export format auto-detection */}
                    {(() => {
                      if (!task || task.messages.length === 0) return null;
                      const allContent = task.messages.map(m => m.content).join(" ");
                      const hasCode = /```[\s\S]*?```/.test(allContent);
                      const hasImages = /\.(png|jpe?g|gif|webp|svg)/i.test(allContent);
                      const hasUrls = /https?:\/\/[^\s)]+\.(pdf|docx?|xlsx?|csv|zip)/i.test(allContent);
                      const hasStructuredData = task.messages.some(m => m.actions && m.actions.length > 3);
                      let recommended = "Markdown";
                      let reason = "text-based conversation";
                      if (hasStructuredData || hasCode) {
                        recommended = "JSON";
                        reason = hasCode ? "contains code blocks" : "has structured tool actions";
                      } else if (hasImages || hasUrls) {
                        recommended = "HTML";
                        reason = hasImages ? "contains images" : "has downloadable artifacts";
                      }
                      return (
                        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-b border-border mb-0.5">
                          Recommended: <span className="text-foreground font-medium">{recommended}</span>
                          <span className="ml-1 opacity-60">({reason})</span>
                        </div>
                      );
                    })()}
                    <button
                      onClick={() => {
                        if (!task) return;
                        // Adversarial: guard empty task
                        const exportableMessages = task.messages.filter(m => m.role !== "system");
                        if (exportableMessages.length === 0) {
                          toast.error("Nothing to export — this task has no messages");
                          setShowMoreMenu(false);
                          return;
                        }
                        const lines: string[] = [];
                        lines.push(`# ${task.title}\n`);
                        lines.push(`> **Created:** ${task.createdAt.toLocaleString()}  `);
                        lines.push(`> **Status:** ${task.status}  `);
                        lines.push(`> **Messages:** ${exportableMessages.length}  `);
                        lines.push(`> **Mode:** ${(task as any).mode || "quality"}\n`);
                        lines.push(`---\n`);
                        
                        for (const msg of exportableMessages) {
                          const label = msg.role === "user" ? "👤 You" : "🤖 Assistant";
                          const time = msg.timestamp ? msg.timestamp.toLocaleString() : "";
                          lines.push(`## ${label}${time ? ` \u2014 ${time}` : ""}\n`);
                          
                          let content = msg.content || "";
                          
                          // Depth: Include tool actions as a summary block
                          if (msg.actions && msg.actions.length > 0) {
                            const actionSummary = msg.actions
                              .filter((a: any) => a.status === "done")
                              .map((a: any) => {
                                switch (a.type) {
                                  case "browsing": return `Browsed: ${a.url || "page"}`;
                                  case "searching": return `Searched: ${a.query || "web"}`;
                                  case "executing": return `Executed: \`${(a.command || "").slice(0, 60)}\``;
                                  case "creating": return `Created: ${a.file || "file"}`;
                                  case "generating": return `Generated: ${a.description || "content"}`;
                                  case "editing": return `Edited: ${a.file || a.label || "file"}`;
                                  case "reading": return `Read: ${a.file || a.label || "file"}`;
                                  case "installing": return `Installed: ${a.packages || a.label || "packages"}`;
                                  case "researching": return `Researched: ${a.label || "topic"}`;
                                  case "building": return `Built: ${a.label || "component"}`;
                                  case "analyzing": return `Analyzed: ${a.label || "data"}`;
                                  case "designing": return `Designed: ${a.label || "layout"}`;
                                  case "deploying": return `Deployed: ${a.label || "webapp"}`;
                                  default: return `${a.type}: ${a.label || a.preview || ""}`;
                                }
                              })
                              .filter(Boolean);
                            if (actionSummary.length > 0) {
                              lines.push(`<details>\n<summary>\ud83d\udee0 Actions (${actionSummary.length})</summary>\n`);
                              for (const s of actionSummary) {
                                lines.push(`- ${s}`);
                              }
                              lines.push(`\n</details>\n`);
                            }
                          }
                          
                          // Depth: Extract artifact URLs (images, docs, media)
                          const artifactUrls = content.match(/https?:\/\/\S+\.(pdf|png|jpg|jpeg|gif|svg|webp|docx|xlsx|pptx|mp3|mp4|wav)/gi);
                          const imageUrls = content.match(/https?:\/\/\S+\.(png|jpg|jpeg|gif|svg|webp)/gi);
                          
                          // Write content
                          if (content.trim()) {
                            lines.push(content + "\n");
                          }
                          
                          // Depth: Embed images as markdown images, other artifacts as links
                          if (artifactUrls && artifactUrls.length > 0) {
                            const imageSet = new Set(imageUrls || []);
                            const nonImageArtifacts = artifactUrls.filter(u => !imageSet.has(u));
                            
                            if (imageSet.size > 0) {
                              lines.push(`\n**Images:**\n`);
                              Array.from(imageSet).forEach(imgUrl => {
                                lines.push(`![Generated Image](${imgUrl})\n`);
                              });
                            }
                            if (nonImageArtifacts.length > 0) {
                              lines.push(`\n**Artifacts:**\n`);
                              for (const url of nonImageArtifacts) {
                                const ext = url.split(".").pop()?.toUpperCase() || "FILE";
                                lines.push(`- [\ud83d\udcce ${ext} File](${url})`);
                              }
                              lines.push("");
                            }
                          }
                          lines.push(`---\n`);
                        }
                        
                        lines.push(`\n*Exported from Manus on ${new Date().toLocaleString()}*\n`);
                        
                        const mdContent = lines.join("\n");
                        
                        // Adversarial: warn for very large exports (> 500KB)
                        if (mdContent.length > 500_000) {
                          toast.info(`Large export (${(mdContent.length / 1024).toFixed(0)}KB) — download may take a moment`);
                        }
                        
                        const blob = new Blob([mdContent], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        // Adversarial: safe filename — strip all non-alphanumeric except spaces/hyphens, fallback to "task-export"
                        const safeName = task.title.replace(/[^a-zA-Z0-9 \-]/g, "").trim().slice(0, 50) || "task-export";
                        a.download = `${safeName}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Task exported as Markdown");
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export as Markdown
                    </button>
                    <button
                      onClick={() => {
                        if (!task) return;
                        if (task.messages.length === 0) {
                          toast.error("Nothing to export — this task has no messages");
                          setShowMoreMenu(false);
                          return;
                        }
                        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const lines = [`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(task.title)}</title><style>
                          body{font-family:system-ui,-apple-system,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#e0e0e0;background:#111;line-height:1.6;}
                          h1{color:#d4a574;border-bottom:2px solid #333;padding-bottom:12px;}
                          .meta-block{font-size:12px;color:#888;margin-bottom:24px;}
                          hr{border:none;border-top:1px solid #333;margin:24px 0;}
                          .msg{margin:16px 0;padding:16px;border-radius:8px;}
                          .user{background:#1a1a2e;border-left:3px solid #d4a574;}
                          .assistant{background:#1a2e1a;border-left:3px solid #74d4a5;}
                          .role-label{font-size:12px;color:#888;margin-bottom:8px;font-weight:600;}
                          .actions-block{margin-top:8px;padding:8px 12px;background:#0a0a0a;border-radius:6px;font-size:11px;color:#aaa;}
                          .actions-block summary{cursor:pointer;color:#888;font-weight:600;}
                          .artifact-link{display:inline-block;margin:4px 8px 4px 0;padding:4px 10px;background:#222;border-radius:4px;color:#74d4a5;text-decoration:none;font-size:12px;}
                          .artifact-link:hover{background:#333;}
                          img.embedded{max-width:100%;border-radius:6px;margin:8px 0;}
                          pre{background:#0a0a0a;padding:12px;border-radius:6px;overflow-x:auto;}
                          code{font-family:'SF Mono',Consolas,monospace;}
                          .footer{margin-top:40px;padding-top:16px;border-top:1px solid #333;font-size:11px;color:#555;text-align:center;}
                        </style></head><body>`];
                        lines.push(`<h1>${esc(task.title)}</h1>`);
                        lines.push(`<div class="meta-block">Created: ${task.createdAt.toLocaleString()} | Status: ${task.status} | Messages: ${task.messages.length}</div><hr>`);
                        for (const msg of task.messages) {
                          if (msg.role === "system") continue;
                          const label = msg.role === "user" ? "👤 You" : "🤖 Assistant";
                          const cls = msg.role === "user" ? "user" : "assistant";
                          // Convert markdown code blocks to HTML pre/code
                          let content = esc(msg.content)
                            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>')
                            .replace(/\n/g, "<br>");
                          // Embed images inline
                          content = content.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, '<br><img class="embedded" src="$2" alt="$1"><br>');
                          lines.push(`<div class="msg ${cls}"><div class="role-label">${label} — ${msg.timestamp.toLocaleString()}</div>${content}`);
                          // Tool actions
                          if (msg.actions && msg.actions.length > 0) {
                            lines.push(`<div class="actions-block"><details><summary>🛠️ ${msg.actions.length} tool action${msg.actions.length > 1 ? "s" : ""}</summary>`);
                            for (const action of msg.actions) {
                              const actionDetail = 'url' in action ? action.url : 'command' in action ? action.command : 'file' in action ? action.file : 'query' in action ? action.query : 'description' in action ? action.description : 'element' in action ? action.element : ('label' in action ? (action.label || '') : '');
                              lines.push(`<div style="margin:4px 0;">• <strong>${esc(action.type || "action")}</strong>: ${esc(actionDetail || "")}</div>`);
                            }
                            lines.push(`</details></div>`);
                          }
                          // Extract artifact URLs
                          const urlMatches = msg.content.match(/https?:\/\/[^\s)]+\.(pdf|docx?|xlsx?|pptx?|csv|zip|png|jpe?g|gif|webp|svg|mp[34]|wav)/gi);
                          if (urlMatches && urlMatches.length > 0) {
                            const uniqueUrls = Array.from(new Set(urlMatches));
                            lines.push(`<div style="margin-top:8px;">`);
                            for (const u of uniqueUrls) {
                              const ext = u.split(".").pop()?.toUpperCase() || "FILE";
                              lines.push(`<a class="artifact-link" href="${u}" target="_blank">📎 ${ext}</a>`);
                            }
                            lines.push(`</div>`);
                          }
                          lines.push(`</div>`);
                        }
                        lines.push(`<div class="footer">Exported from Manus on ${new Date().toLocaleString()}</div>`);
                        lines.push(`</body></html>`);
                        const htmlContent = lines.join("");
                        const blob = new Blob([htmlContent], { type: "text/html" });
                        const url = URL.createObjectURL(blob);
                        const printWin = window.open(url, "_blank");
                        if (printWin) {
                          printWin.onload = () => { printWin.print(); };
                        }
                        setTimeout(() => URL.revokeObjectURL(url), 10000);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Export as PDF (Print)
                    </button>
                    <button
                      onClick={() => {
                        if (!task) return;
                        if (task.messages.length === 0) {
                          toast.error("Nothing to export — this task has no messages");
                          setShowMoreMenu(false);
                          return;
                        }
                        const jsonData = {
                          title: task.title,
                          id: task.id,
                          status: task.status,
                          createdAt: task.createdAt.toISOString(),
                          exportedAt: new Date().toISOString(),
                          messageCount: task.messages.length,
                          messages: task.messages
                            .filter(m => m.role !== "system")
                            .map(m => ({
                              role: m.role,
                              content: m.content,
                              timestamp: m.timestamp.toISOString(),
                              ...(m.actions && m.actions.length > 0 ? {
                                actions: m.actions.map(a => ({
                                  type: a.type,
                                  detail: 'url' in a ? a.url : 'command' in a ? a.command : 'file' in a ? a.file : 'query' in a ? a.query : 'description' in a ? a.description : ('label' in a ? a.label : undefined),
                                  status: a.status,
                                }))
                              } : {}),
                              ...(m.cardType ? { cardType: m.cardType } : {}),
                            })),
                        };
                        const jsonStr = JSON.stringify(jsonData, null, 2);
                        if (jsonStr.length > 500_000) {
                          toast.info(`Large export (${(jsonStr.length / 1024).toFixed(0)}KB) — download may take a moment`);
                        }
                        const blob = new Blob([jsonStr], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        const safeName = task.title.replace(/[^a-zA-Z0-9 \-]/g, "").trim().slice(0, 50) || "task-export";
                        a.download = `${safeName}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Task exported as JSON");
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Export as JSON
                    </button>
                    <button
                      onClick={handleShareDialog}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left md:hidden"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share Task
                    </button>
                    <button
                      onClick={handleToggleFavorite}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left md:hidden"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      {isFavorited ? "Remove Bookmark" : "Bookmark"}
                    </button>
                    <button
                      onClick={() => {
                        if (!task) return;
                        const firstUserMsg = task.messages.find(m => m.role === "user");
                        if (!firstUserMsg) {
                          toast.error("No user message to save as template");
                          setShowMoreMenu(false);
                          return;
                        }
                        const title = task.title.length > 60 ? task.title.slice(0, 60) + "..." : task.title;
                        const prompt = firstUserMsg.content;
                        saveTemplateMutation.mutate({ title, prompt });
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" />
                      Save as Template
                    </button>
                    <button
                      disabled={duplicateTaskMutation.isPending}
                      onClick={async () => {
                        if (!task) return;
                        // Adversarial: guard empty task
                        const userMessages = task.messages.filter(m => m.role === "user");
                        if (userMessages.length === 0) {
                          toast.error("Cannot duplicate — this task has no messages");
                          setShowMoreMenu(false);
                          return;
                        }
                        // Depth: confirm for large tasks (> 50 messages)
                        if (task.messages.length > 50) {
                          const ok = window.confirm(`This task has ${task.messages.length} messages. Duplicate all of them?`);
                          if (!ok) return;
                        }
                        try {
                          const result = await duplicateTaskMutation.mutateAsync({
                            sourceExternalId: task.id,
                          });
                          toast.success(`Duplicated as "${result.title}"`);
                          setShowMoreMenu(false);
                          navigate(`/task/${result.externalId}`);
                        } catch (err: any) {
                          toast.error(err.message || "Failed to duplicate task");
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {duplicateTaskMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {duplicateTaskMutation.isPending ? "Duplicating..." : "Duplicate Task"}
                    </button>
                    <div className="h-px bg-border my-1" />
                    {showDeleteConfirm ? (
                      <div className="px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-2">Delete this task?</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleArchive}
                            className="flex-1 text-xs px-2 py-1.5 bg-destructive text-destructive-foreground rounded hover:opacity-90 transition-opacity"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 text-xs px-2 py-1.5 bg-muted text-foreground rounded hover:bg-accent transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Task
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* System Prompt Editor (inline) */}
        <AnimatePresence>
          {showSystemPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="px-4 md:px-6 py-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Per-Task System Prompt</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleSaveSystemPrompt}
                      className="text-[10px] px-2 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowSystemPrompt(false)}
                      className="text-[10px] px-2 py-1 bg-muted text-foreground rounded hover:bg-accent transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <textarea
                  value={systemPromptDraft}
                  onChange={(e) => setSystemPromptDraft(e.target.value)}
                  placeholder="Override the default system prompt for this task. Leave empty to use global default."
                  aria-label="System prompt override"
                  rows={3}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Priority: Per-task prompt &gt; Global prompt (Settings) &gt; Default
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Branch indicators */}
        <BranchBanner taskExternalId={task.id} />
        <ChildBranches taskExternalId={task.id} />
        <BranchTreeView taskExternalId={task.id} open={branchTreeOpen} onOpenChange={setBranchTreeOpen} />
        <BranchCompareView taskExternalId={task.id} open={branchCompareOpen} onOpenChange={setBranchCompareOpen} />

        {/* In-Conversation Search Overlay (Pass 5 Step 1) */}
        <div className="relative flex-1 flex flex-col min-h-0">
        <InConversationSearch
          open={searchOpen}
          onClose={closeSearch}
          messages={task.messages}
          scrollRef={scrollRef}
        />
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 overscroll-contain" role="log" aria-live="polite" aria-label="Chat messages" aria-relevant="additions">
          {/* During streaming, hide card-type messages that were added mid-stream
              (convergence, system_notice, context_compressed) to prevent scattered
              progress indicators. They stay in the message list for history. */}
          {(streaming
            ? task.messages.filter(m => !m.cardType || ["webapp_preview", "webapp_deployed", "browser_auth", "task_pause", "take_control", "checkpoint", "task_completed", "interactive_output", "system_notice"].includes(m.cardType))
            : task.messages
          ).map((msg, i) => (
            <motion.div
              key={msg.id}
              data-message-index={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: Math.min(i * 0.02, 0.3) }}
            >
            <MessageBubble
              key={`bubble-${msg.id}`}
              message={msg}
              isLast={i === task.messages.length - 1}
              canRegenerate={!streaming && msg.role === "assistant" && i === task.messages.length - 1}
              onRegenerate={handleRegenerate}
              userTTSVoice={userTTSVoice}
              ttsRateStr={ttsRateStr}
              taskExternalId={task.id}
              messageIndex={i}
              allMessages={task.messages}
              isEditing={editingMessageId === msg.id}
              editDraft={editingMessageId === msg.id ? editDraft : undefined}
              onStartEdit={msg.role === "user" && !streaming ? () => { setEditingMessageId(msg.id); setEditDraft(msg.content); } : undefined}
              onCancelEdit={() => { setEditingMessageId(null); setEditDraft(""); }}
              onSaveEdit={() => handleEditAndResend(msg.id, editDraft)}
              onEditDraftChange={(val) => setEditDraft(val)}
              previewRefreshKey={previewRefreshKey}
              onShare={handleShareDialog}
            />
            </motion.div>
          ))}
          {isTyping && <TypingIndicator />}
          {streaming && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 mb-5"
            >
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <BrandAvatar size="sm" />
              </div>
              <div className="max-w-[90%] md:max-w-[80%]">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>manus</span>
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </div>
                {/* Agent Presence Indicator — "Manus is using [Tool]" header */}
                <ActiveToolIndicator
                  actions={agentActions}
                  streaming={streaming}
                  hasStreamContent={!!streamContent}
                  isReconnecting={isReconnecting}
                  knowledgeRecalled={knowledgeRecalled}
                />
                {/* AEGIS Execution Plan Display */}
                {aegisMeta && aegisMeta.planSteps && aegisMeta.planSteps.length > 0 && (
                  <ExecutionPlanDisplay
                    aegisMeta={aegisMeta}
                    completedSteps={stepProgress?.completed || 0}
                    isStreaming={streaming}
                    className="mb-2"
                  />
                )}
                {/* Manus dual display: collapsible steps timeline + active step */}
                {agentActions.length > 0 && (
                  <StreamingStepsCollapsible actions={agentActions} stepProgress={stepProgress} />
                )}
                {/* Streaming text content */}
                {streamContent && (
                  <div className="text-sm text-foreground prose prose-sm prose-invert max-w-none">
                    <Streamdown>{streamContent}</Streamdown>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
        </div>{/* close search wrapper */}

        {/* Task Completion Badge + Rating + Follow-ups — Gaps 3, 4, 5 */}
        {task?.status === "completed" && !streaming && (
          <div className="px-4 md:px-6 py-3 border-t border-border/50 shrink-0 space-y-3">
            {/* Completion badge + rating row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                  (generationIncomplete || task.staleCompleted === 1)
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-muted border-border"
                )}>
                  <CheckCircle2 className={cn(
                    "w-3.5 h-3.5",
                    (generationIncomplete || task.staleCompleted === 1) ? "text-amber-400" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    (generationIncomplete || task.staleCompleted === 1) ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    {generationIncomplete
                    ? "Generation incomplete — no artifact produced"
                    : task.staleCompleted === 1
                      ? "Auto-completed (inactive)"
                      : "Task completed"}
                  </span>
                </div>
                {task.staleCompleted === 1 && (
                  <button
                    onClick={async () => {
                      try {
                        await resumeStaleMutation.mutateAsync({ externalId: task.id });
                      } catch (err: any) {
                        console.error("Resume failed:", err);
                      }
                    }}
                    disabled={resumeStaleMutation.isPending}
                    className="text-xs px-3 py-1 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                  >
                    {resumeStaleMutation.isPending ? "Resuming..." : "Resume Task"}
                  </button>
                )}
                {task.completedSteps && task.totalSteps && (
                  <span className="text-[11px] text-muted-foreground">
                    {task.completedSteps}/{task.totalSteps} steps
                  </span>
                )}
              </div>
              <TaskRating taskId={task.id} />
            </div>
            {/* Suggested follow-ups — prefer agent-generated, fallback to heuristic */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(generationIncomplete
                ? FOLLOW_UP_SUGGESTIONS.generation_incomplete
                : agentFollowUps.length > 0
                  ? agentFollowUps
                  : getFollowUpSuggestions(task?.messages ?? [])
              ).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all whitespace-nowrap shrink-0"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="px-3 md:px-6 pb-3 md:pb-4 pt-2 border-t border-border shrink-0 relative"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
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
          {/* Media capture panel — screen share, video recording, upload */}
          <MediaCapturePanel
            open={mediaPanelOpen}
            onClose={() => { setMediaPanelOpen(false); setMediaPanelMode(null); }}
            onMediaCaptured={(result) => {
              // Inject media URLs into the message as file attachments
              const mediaMessage = result.type === "screen_share_frames"
                ? `[Screen share: ${result.urls.length} frames captured]`
                : result.type === "video_recording"
                  ? `[Video recording: ${result.fileName || "recording"}]`
                  : `[Video uploaded: ${result.fileName || "video"}]`;
              setInput(prev => prev ? `${prev}\n${mediaMessage}` : mediaMessage);
              // Store media URLs for multimodal context injection
              setMediaAttachments(prev => [...prev, ...result.urls.map(url => ({
                url,
                mimeType: result.mimeType,
                type: result.type,
              }))]);
            }}
            taskId={taskExternalId}
          />
          {/* Retry banner — shown when the last stream ended with a retryable error */}
          {lastErrorRetryable && !streaming && (
            <div className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm text-destructive flex-1">A temporary error occurred. You can retry your last message.</span>
              <button
                onClick={() => { setLastErrorRetryable(false); handleRegenerate(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90 transition-opacity active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}
          {/* Stale/error task recovery — shown when task is in error state or stuck running without active stream */}
          {!streaming && !lastErrorRetryable && (task.status === "error" || (task.status === "running" && !streaming)) && task.messages.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-sm text-amber-200 flex-1">
                {task.status === "error"
                  ? "This task encountered an error. You can retry or send a new message to continue."
                  : "This task appears to be stalled. Send a message to resume it."}
              </span>
              <button
                onClick={() => handleRegenerate()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-medium hover:opacity-90 transition-opacity active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          )}
          {/* Specialized input bar — iOS-style guided input for PlusMenu actions */}
          <SpecializedInputBar
            mode={specializedMode}
            onClose={() => setSpecializedMode(null)}
            onSubmit={(composedPrompt) => {
              setInput(composedPrompt);
              setSpecializedMode(null);
              // Auto-submit the composed prompt
              setTimeout(() => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
              }, 50);
            }}
            className="rounded-t-xl"
          />
          <div className={cn("relative bg-card border border-border rounded-xl focus-within:border-primary/30 transition-colors", specializedMode && "rounded-t-none border-t-0")}>
            {/* Attached files preview — above textarea */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {files.map((f, i) => {
                  const ext = f.fileName.split(".").pop()?.toUpperCase() || "FILE";
                  const sizeKB = f.size ? Math.round(f.size / 1024) : null;
                  const sizeLabel = sizeKB ? (sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`) : null;
                  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(f.fileName);
                  return (
                    <div key={i} className="relative group">
                      {isImage && f.url ? (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-border bg-muted/50">
                          <img src={f.url} alt={f.fileName} className="w-full h-full object-cover" />
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs">
                          <FileIcon className="w-3 h-3 text-primary" />
                          <span className="text-foreground max-w-[150px] truncate">{f.fileName}</span>
                          <span className="text-muted-foreground text-[10px] shrink-0">{ext}{sizeLabel ? ` · ${sizeLabel}` : ""}</span>
                          <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {uploading && (
              <div className="px-4 pt-2">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {uploadError && (
              <p className="px-4 pt-2 text-xs text-destructive">{uploadError}</p>
            )}
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
              onPaste={handlePaste}
              placeholder={streaming ? "Type a follow-up message..." : "Message Manus..."}
              aria-label="Chat message input"
              rows={1}
              className="w-full resize-none bg-transparent px-4 pt-3 pb-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0 rounded-xl text-sm leading-relaxed"
            />
            <VoiceWaveStyles />
            {/* Bottom toolbar: recording mode vs normal mode */}
            {(recording || transcribing) ? (
              /* Voice Recording UI — replaces normal toolbar when recording */
              <div className="absolute bottom-1 left-1 right-1">
                <VoiceRecordingUI
                  recording={recording}
                  transcribing={transcribing}
                  onCancel={cancelRecording}
                  onConfirm={stopRecording}
                />
              </div>
            ) : (
            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx,.txt,.csv,.json,.md,.py,.js,.ts,.html,.css,audio/*,video/*"
                />
                {/* + button (Manus-style circle) — opens PlusMenu */}
                <div className="relative">
                  <button
                    ref={plusButtonRef}
                    onClick={() => setPlusMenuOpen(!plusMenuOpen)}
                    disabled={uploading}
                    className={cn(
                      "w-8 h-8 md:w-7 md:h-7 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95",
                      uploading && "opacity-50 cursor-not-allowed",
                      plusMenuOpen && "bg-accent text-foreground"
                    )}
                    title="More options"
                    aria-label="Open action menu"
                    aria-expanded={plusMenuOpen}
                  >
                    {uploading ? <Upload className="w-3.5 h-3.5 animate-pulse" /> : <Plus className={cn("w-3.5 h-3.5 transition-transform duration-200", plusMenuOpen && "rotate-45")} />}
                  </button>
                  <PlusMenu
                    open={plusMenuOpen}
                    onClose={() => setPlusMenuOpen(false)}
                    onAddFiles={openPicker}
                    onShareScreen={() => { setMediaPanelMode("screen"); setMediaPanelOpen(true); }}
                    onRecordVideo={() => { setMediaPanelMode("camera"); setMediaPanelOpen(true); }}
                    onUploadVideo={() => { setMediaPanelMode("upload"); setMediaPanelOpen(true); }}
                    onInjectPrompt={(prompt) => {
                      // Map prompt prefixes to specialized modes
                      const modeMap: Record<string, SpecializedMode> = {
                        "Build a website for ": "build-website",
                        "Create a slide deck about ": "create-slides",
                        "Generate an image of ": "create-image",
                        "Edit this image: ": "edit-image",
                        "Create a spreadsheet for ": "create-spreadsheet",
                        "Create a video about ": "create-video",
                        "Generate audio for ": "generate-audio",
                        "Do wide research on ": "wide-research",
                      };
                      const matchedMode = modeMap[prompt];
                      if (matchedMode) {
                        setSpecializedMode(matchedMode);
                      } else {
                        setInput(prompt);
                        setTimeout(() => { const ta = document.querySelector('textarea'); if (ta) ta.focus(); }, 100);
                      }
                    }}
                    onToggleHandsFree={() => handsFree.isActive ? handsFree.deactivate() : handsFree.activate()}
                    onOpenConnectorsSheet={() => setConnectorsSheetOpen(true)}
                    anchorRef={plusButtonRef}
                  />
                </div>
                {/* Connectors badge — opens bottom sheet */}
                <ConnectorsBadge onClick={() => setConnectorsSheetOpen(true)} />
                {/* GitHub integration badge — hidden on mobile to reduce toolbar crowding */}
                <GitHubBadge onClick={() => window.open('/github', '_self')} className="hidden md:flex" />
                {/* Mobile mode selector removed — mode is controlled via ModelSelector in header */}
                {/* Attachment count badge */}
                {files.length > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-[10px] font-medium">+{files.length}</span>
                  </div>
                )}
                {/* Voice input mic button */}
                <button
                  onClick={startRecording}
                  className="p-2 md:p-1.5 rounded-md transition-colors active:scale-95 text-muted-foreground hover:text-foreground hover:bg-accent"
                  title="Voice input"
                  aria-label="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                {/* Hands-free mode button (P15) — hidden on mobile to reduce toolbar crowding */}
                <button
                  onClick={() => handsFree.isActive ? handsFree.deactivate() : handsFree.activate()}
                  className={cn(
                    "hidden md:flex p-2 md:p-1.5 rounded-md transition-colors active:scale-95",
                    handsFree.isActive
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  title={handsFree.isActive ? "Exit hands-free mode" : "Hands-free voice mode"}
                  aria-label={handsFree.isActive ? "Exit hands-free mode" : "Hands-free voice mode"}
                >
                  <Headphones className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {streaming ? (
                  <button
                    onClick={handleStopGeneration}
                    className="w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all active:scale-95 bg-foreground text-background hover:opacity-90"
                    title="Stop generation"
                    aria-label="Stop generation"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className={cn(
                      "w-8 h-8 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-all active:scale-95",
                      input.trim()
                        ? "bg-foreground text-background hover:opacity-90"
                        : "bg-muted text-muted-foreground"
                    )}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            )}
          </div>
          {voiceError && (
            <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
              <span className="flex-1">{voiceError}</span>
              <button onClick={clearVoiceError} className="text-destructive/60 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {/* Prompt length warning */}
          {input.length > 8000 && (
            <p className={cn(
              "text-[11px] mt-1.5 px-2 flex items-center gap-1",
              input.length > 15000 ? "text-destructive" : "text-yellow-500"
            )}>
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {input.length > 15000
                ? `Very long prompt (${(input.length / 1000).toFixed(1)}k chars) — may cause errors or be truncated.`
                : `Long prompt (${(input.length / 1000).toFixed(1)}k chars) — consider shortening for best results.`}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2 hidden md:block">
            Manus may make mistakes. Verify important information.
          </p>
        </div>
      </div>

      {/* ── RESIZABLE DIVIDER + WORKSPACE PANEL (Desktop) ── */}
      {desktopWorkspaceOpen && (
        <>
          <ResizableDivider
            containerRef={splitContainerRef}
            onRatioChange={updateWorkspaceRatio}
            className="hidden md:block"
          />
          <div
            className="hidden md:flex flex-col min-w-0 min-h-0"
            style={{ flex: `0 0 ${(1 - workspaceRatio) * 100}%`, maxWidth: `${(1 - workspaceRatio) * 100}%` }}
          >
            <ErrorBoundary><WorkspacePanel task={task} bridgeStatus={bridgeStatus} /></ErrorBoundary>
          </div>
        </>
      )}

      {/* ── WORKSPACE PANEL (Mobile) ── */}
      <AnimatePresence>
        {mobileWorkspaceOpen && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "50vh" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="md:hidden overflow-hidden"
          >
            <ErrorBoundary><WorkspacePanel
              task={task}
              isMobile
              bridgeStatus={bridgeStatus}
              onClose={() => setMobileWorkspaceOpen(false)}
            /></ErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hands-Free Overlay (P15) */}
      <HandsFreeOverlay
        state={handsFree.state}
        isActive={handsFree.isActive}
        onInterrupt={handsFree.interrupt}
        onDeactivate={handsFree.deactivate}
      />

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        taskExternalId={taskExternalId || ""}
        taskTitle={task.title}
      />

      {/* Sandbox Viewer Overlay — NS19 */}
      <SandboxViewer
        open={sandboxOpen}
        onClose={() => setSandboxOpen(false)}
        actions={agentActions}
        streaming={streaming}
        stepProgress={stepProgress}
        activeFile={(() => { const a = agentActions.find(x => x.status === "active" && (x.type === "creating" || x.type === "editing")); return a && "file" in a ? (a as any).file : undefined; })()}
        codeContent={(() => { const a = agentActions.find(x => x.status === "active" && (x.type === "creating" || x.type === "editing" || x.type === "writing")); return a?.preview; })()}
        browserUrl={(() => { const a = agentActions.find(x => x.status === "active" && x.type === "browsing"); return a && "url" in a ? (a as any).url : undefined; })()}
        browserScreenshot={(() => { const a = agentActions.find(x => x.status === "active" && x.type === "browsing"); return a?.preview; })()}
      />

      {/* Rename Task Dialog */}
      <AnimatePresence>
        {renameDialogOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60"
              onClick={() => setRenameDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-foreground mb-4">Rename Task</h3>
                <input
                  type="text"
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameDraft.trim()) {
                      renameTaskFn(task.id, renameDraft.trim());
                      setRenameDialogOpen(false);
                      toast.success("Task renamed");
                    }
                    if (e.key === "Escape") setRenameDialogOpen(false);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
                  autoFocus
                  placeholder="Task name"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setRenameDialogOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (renameDraft.trim()) {
                        renameTaskFn(task.id, renameDraft.trim());
                        setRenameDialogOpen(false);
                        toast.success("Task renamed");
                      }
                    }}
                    disabled={!renameDraft.trim()}
                    className={cn(
                      "px-4 py-2 text-sm rounded-lg transition-colors",
                      renameDraft.trim()
                        ? "bg-primary text-primary-foreground hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Connectors Bottom Sheet (P27) */}
      <ConnectorsSheet
        open={connectorsSheetOpen}
        onOpenChange={setConnectorsSheetOpen}
      />
      {/* Task Replay Overlay (Pass 50) */}
      <AnimatePresence>
        {replayOpen && task && (
          <TaskReplayOverlay
            messages={task.messages}
            onClose={() => {
              setReplayOpen(false);
              // Remove ?replay=1 from URL without navigation
              const url = new URL(window.location.href);
              url.searchParams.delete("replay");
              window.history.replaceState({}, "", url.pathname);
            }}
            scrollToMessage={scrollToMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
