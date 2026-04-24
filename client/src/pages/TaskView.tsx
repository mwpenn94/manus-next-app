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
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageLightbox from "@/components/ImageLightbox";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";
import ModeToggle, { type AgentMode } from "@/components/ModeToggle";
import ShareDialog from "@/components/ShareDialog";
import TaskProgressCard from "@/components/TaskProgressCard";
import { BranchBanner, ChildBranches, BranchButton } from "@/components/BranchIndicator";
import ActiveToolIndicator from "@/components/ActiveToolIndicator";
import SandboxViewer from "@/components/SandboxViewer";
import ModelSelector, { MODE_TO_MODEL } from "@/components/ModelSelector";
import PlusMenu from "@/components/PlusMenu";
import GitHubBadge from "@/components/GitHubBadge";
import VoiceRecordingUI, { VoiceWaveStyles } from "@/components/VoiceRecordingUI";
import { useTTS } from "@/hooks/useTTS";
import BrowserAuthCard from "@/components/BrowserAuthCard";
import TaskPauseCard from "@/components/TaskPauseCard";
import TakeControlCard from "@/components/TakeControlCard";
import WebappPreviewCard from "@/components/WebappPreviewCard";
import CheckpointCard from "@/components/CheckpointCard";
import TaskCompletedCard from "@/components/TaskCompletedCard";
import ConfirmationGate from "@/components/ConfirmationGate";
import ConvergenceIndicator from "@/components/ConvergenceIndicator";
import InteractiveOutputCard from "@/components/InteractiveOutputCard";
import PublishSheet from "@/components/PublishSheet";
import SiteLiveSheet from "@/components/SiteLiveSheet";
import { MediaCapturePanel } from "@/components/MediaCapturePanel";
import HandsFreeOverlay from "@/components/HandsFreeOverlay";
import { useHandsFreeMode } from "@/hooks/useHandsFreeMode";
import { useEdgeTTS, splitSentences } from "@/hooks/useEdgeTTS";
import { Headphones } from "lucide-react";
import { streamWithRetry, getStreamErrorMessage } from "@/lib/streamWithRetry";
import { buildStreamCallbacks, type StreamState } from "@/lib/buildStreamCallbacks";

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
  }
}

function ActionStep({ action, index, total }: { action: AgentAction; index: number; total: number }) {
  const isActive = action.status === "active";
  const isDone = action.status === "done";
  const [previewExpanded, setPreviewExpanded] = useState(false);

  return (
    <div className="flex items-start gap-2.5 py-1.5 px-3 relative">
      {index < total - 1 && (
        <div className="absolute left-[21px] top-[22px] w-px h-[calc(100%-6px)] bg-border" />
      )}
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
      <div className="flex-1 min-w-0 text-xs text-foreground leading-relaxed pt-0.5">
        <div className="flex items-center gap-1">
          <ActionLabel action={action} />
          {isDone && action.preview && (
            <button
              onClick={() => setPreviewExpanded(!previewExpanded)}
              className="ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {previewExpanded ? "hide" : "show"}
            </button>
          )}
        </div>
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

function MessageBubble({ message, isLast, onRegenerate, canRegenerate, userTTSVoice, ttsRateStr, onGateApprove, onGateReject, taskExternalId, messageIndex, allMessages }: { message: Message; isLast: boolean; onRegenerate?: () => void; canRegenerate?: boolean; userTTSVoice?: string; ttsRateStr?: string; onGateApprove?: () => void; onGateReject?: () => void; taskExternalId?: string; messageIndex?: number; allMessages?: Message[] }) {
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const tts = useEdgeTTS();
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
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-sm">🐾</span>
        </div>
      )}

      <div className={cn("max-w-[90%] md:max-w-[80%]", isUser ? "ml-auto" : "")}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Manus
            </span>
            <span className="text-[10px] text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
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
            status={(message.cardData?.status as any) ?? "not_published"}
            screenshotUrl={message.cardData?.screenshotUrl as string}
            previewUrl={message.cardData?.previewUrl as string}
            onSettings={() => toast.info("Opening settings...")}
            onPublish={() => toast.info("Publishing...")}
            onVisit={() => {
              const url = message.cardData?.previewUrl as string;
              if (url) window.open(url, "_blank");
            }}
            hasUnpublishedChanges={!!message.cardData?.hasUnpublishedChanges}
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
          />
        ) : message.cardType === "confirmation_gate" ? (
          <ConfirmationGate
            action={(message.cardData?.action as string) ?? message.content}
            description={message.cardData?.description as string}
            category={(message.cardData?.category as any) ?? "general"}
            status={(message.cardData?.status as any) ?? "pending"}
            onApprove={onGateApprove}
            onReject={onGateReject}
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
            className={cn(
              "rounded-xl text-sm leading-relaxed",
              isUser
                ? "bg-primary/12 border border-primary/20 text-foreground px-4 py-3"
                : "text-foreground"
            )}
          >
            {isUser ? (
              <>
                <p className="whitespace-pre-wrap">{message.content.replace(/\[Screen share:.*?\]|\[Video recording:.*?\]|\[Video uploaded:.*?\]/g, "").trim()}</p>
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
            ) : (
              <div className="prose prose-sm prose-themed max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
                <Streamdown>{message.content}</Streamdown>
              </div>
            )}
          </div>
        )}

        {hasActions && (
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
  );
}

// ── Workspace Panel with real artifacts ──

type WorkspaceTab = "browser" | "code" | "terminal" | "images" | "documents";

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
    return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documentArtifacts.data, documentPdfArtifacts.data, documentDocxArtifacts.data]);

  const tabs: { id: WorkspaceTab; label: string; icon: typeof Globe; count?: number }[] = [
    { id: "browser", label: "Browser", icon: Globe },
    { id: "code", label: "Code", icon: Code, count: codeArtifacts.data?.length },
    { id: "terminal", label: "Terminal", icon: Terminal, count: terminalArtifacts.data?.length },
    { id: "images", label: "Images", icon: ImageIcon, count: (imageArtifacts.data?.length || 0) + (userFiles.data?.filter((f: any) => f.mimeType?.startsWith("image/")).length || 0) || undefined },
    { id: "documents", label: "Docs", icon: FileText, count: allDocuments.length || undefined },
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
          <div className="p-4 h-full overflow-y-auto bg-[oklch(0.1_0.005_60)]">
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
                      const icon = doc.docType === "pdf" ? "📄" : doc.docType === "docx" ? "📝" : "📋";
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
                      {doc.docType === "pdf" && doc.url ? (
                        <iframe
                          src={doc.url}
                          className="w-full h-full border-0"
                          title={doc.label || "PDF Preview"}
                        />
                      ) : doc.content ? (
                        <div className="p-4 prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{doc.content}</Streamdown>
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
  }, [onTranscription, transcribeMutation]);

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
    case "thinking":
    default:
      return { type: "thinking", status };
  }
}

// ── Main TaskView ──

export default function TaskView() {
  const [, params] = useRoute("/task/:id");
  const [, navigate] = useLocation();
  const { tasks, activeTask, setActiveTask, addMessage, removeLastMessage, updateTaskStatus, renameTask: renameTaskFn, markAutoStreamed, updateMessageCard, updateTaskFavorite } = useTask();
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
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>(() => {
    try {
      const stored = localStorage.getItem("manus-agent-mode");
      if (stored && ["speed", "quality", "max", "limitless"].includes(stored)) {
        return stored as AgentMode;
      }
    } catch {}
    return "quality";
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [mediaPanelMode, setMediaPanelMode] = useState<"screen" | "camera" | "upload" | null>(null);
  const [mediaAttachments, setMediaAttachments] = useState<Array<{ url: string; mimeType: string; type: string }>>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [lastErrorRetryable, setLastErrorRetryable] = useState(false);
  const [generationIncomplete, setGenerationIncomplete] = useState(false);
  const [pendingGate, setPendingGate] = useState<{
    action: string;
    description?: string;
    category?: string;
    taskId: string;
  } | null>(null);
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

  // Save partial streaming content on page unload or component unmount
  // This ensures in-progress assistant messages aren't lost when the user navigates away
  useEffect(() => {
    const savePartialContent = () => {
      const taskId = streamingTaskIdRef.current;
      const content = accumulatedRef.current;
      if (taskId && content.trim()) {
        // Use addMessage to persist the partial content
        addMessage(taskId, {
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

    // Cleanup on unmount: save partial content if still streaming
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      savePartialContent();
    };
  }, [addMessage]);

  // Auto-stream for initial message in a newly created task
  // When navigating from Home, createTask adds the first user message but never calls /api/stream.
  // This effect detects that pattern and triggers the LLM stream automatically.
  // IMPORTANT: We use a ref to track which task IDs have already been auto-streamed in this
  // component instance, in addition to the context-level flag. This prevents re-triggering
  // when the dependency array changes due to message dedup or state updates.
  const autoStreamedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!task) return;
    if (streaming) return; // Already streaming
    if (task.autoStreamed) return; // Already auto-streamed for this task (persisted in context)
    if (autoStreamedIdsRef.current.has(task.id)) return; // Already attempted in this mount
    // Only trigger if: exactly 1 message, it's a user message, and no assistant response yet
    if (task.messages.length !== 1) return;
    const firstMsg = task.messages[0];
    if (firstMsg.role !== "user") return;
    // Mark as auto-streamed immediately — both in ref (instant) and context (persisted)
    autoStreamedIdsRef.current.add(task.id);
    markAutoStreamed(task.id);

    // Trigger the SSE stream for the initial message
    (async () => {
      // If bridge is connected, dispatch to the Manus Next agent instead
      if (bridgeStatus === "connected") {
        bridgeSend("task.message", {
          taskId: task.id,
          content: firstMsg.content,
          files: [],
        });
        return;
      }

      setStreaming(true);
      setGenerationIncomplete(false);
      setStreamContent("");
      setAgentActions([]);
      setTokenUsage(null);
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

        const streamState: StreamState = { accumulated: "", actions, images };
        const callbacks = buildStreamCallbacks(streamState, {
          setStreamContent, setAgentActions, setStreamImages, setStepProgress,
          updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
          addMessage, setIsReconnecting, setLastErrorRetryable, setPendingGate, setTokenUsage, setGenerationIncomplete,
        });

        await streamWithRetry({
          messages, taskExternalId: task.id, mode: agentMode,
          signal: controller.signal, callbacks,
        });

        accumulated = streamState.accumulated;
        setPendingGate(null); // Clear gate on stream end

        // Mark all remaining active actions as done
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
      }
    })();
  }, [task?.id, task?.messages.length, task?.autoStreamed, streaming, bridgeStatus, bridgeSend, addMessage, markAutoStreamed, agentMode]);

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
      // Abort the current stream — the finally block will reset streaming state,
      // and the user can send again (or we could auto-trigger, but matching Manus
      // behavior: the new message appears and the agent picks it up on next interaction)
      abortControllerRef.current.abort();
      return;
    }
    const userContent = files.length > 0
      ? `${input}\n\n📎 Attached: ${files.map(f => f.fileName).join(", ")}`
      : input;
    addMessage(task.id, { role: "user", content: userContent });

    // If bridge is connected, dispatch to the Manus Next agent
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
      const conversationMessages = task.messages.slice(-10).map(m => ({
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
            // For other file types, add as text reference with URL
            content.push({ type: "text", text: `\n[Attached file: ${f.fileName}](${f.url})` });
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

      const streamState: StreamState = { accumulated: "", actions, images };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setPendingGate, setTokenUsage, setGenerationIncomplete,
      });

      await streamWithRetry({
        messages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });

      accumulated = streamState.accumulated;
      setPendingGate(null); // Clear gate on stream end

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
      const conversationMessages = task.messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));
      const messages = [
        ...conversationMessages,
        { role: "user" as const, content: spokenText },
      ];

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const streamState: StreamState = { accumulated: "", actions, images };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setPendingGate, setTokenUsage, setGenerationIncomplete,
      });

      await streamWithRetry({
        messages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });

      accumulated = streamState.accumulated;
      setPendingGate(null); // Clear gate on stream end

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
    // Remove the last assistant message
    const removed = removeLastMessage(task.id);
    if (!removed || removed.role !== "assistant") return;

    // Re-send the conversation (minus the removed assistant message)
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
      // Build conversation from remaining messages
      const conversationMessages = task.messages
        .filter(m => m.id !== removed.id) // Exclude the removed message
        .slice(-10)
        .map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content }));

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const streamState: StreamState = { accumulated: "", actions, images };
      const callbacks = buildStreamCallbacks(streamState, {
        setStreamContent, setAgentActions, setStreamImages, setStepProgress,
        updateTaskStatus, accumulatedRef, actionsRef, mapToolToAction, taskId: task.id,
        addMessage, setIsReconnecting, setLastErrorRetryable, setPendingGate, setTokenUsage, setGenerationIncomplete,
      });

      await streamWithRetry({
        messages: conversationMessages, taskExternalId: task.id, mode: agentMode,
        signal: controller.signal, callbacks,
      });

      accumulated = streamState.accumulated;
      setPendingGate(null); // Clear gate on stream end

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
      setStreamImages([]);
      setStepProgress(null);
    }
  }, [task, streaming, removeLastMessage, addMessage, agentMode, updateTaskStatus]);

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

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Task not found</p>
      </div>
    );
  }

  // ── Header button handlers ──

  const handleShareUrl = () => {
    const url = `${window.location.origin}/task/${task.id}`;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleShareDialog = () => {
    if (isAuthenticated) {
      setShareDialogOpen(true);
    } else {
      handleShareUrl();
    }
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
    <div className="h-full flex flex-col md:flex-row">
      {/* ── CONVERSATION PANEL ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Task Header */}
        <div className="h-12 flex items-center justify-between px-4 md:px-6 border-b border-border shrink-0">
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
            {/* Model Selector — NS19 */}
            <ModelSelector
              compact
              className="hidden md:flex"
              selectedModelId={MODE_TO_MODEL[agentMode] || "manus-next-max"}
              onModelChange={(modelId) => {
                // Sync model tier selection → agent execution mode
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
            {/* Mode Toggle */}
            <ModeToggle mode={agentMode} onChange={(mode) => {
              setAgentMode(mode);
              try { localStorage.setItem("manus-agent-mode", mode); } catch {}
            }} className="hidden md:flex mr-1" />
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
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors hidden md:flex focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none"
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
                    className="absolute right-0 top-full mt-1 w-56 bg-popover text-popover-foreground border border-border rounded-lg shadow-lg z-50 py-1"
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
                        
                        lines.push(`\n*Exported from Sovereign AI on ${new Date().toLocaleString()}*\n`);
                        
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
                        lines.push(`<div class="footer">Exported from Sovereign AI on ${new Date().toLocaleString()}</div>`);
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 overscroll-contain">
          {/* During streaming, hide card-type messages that were added mid-stream
              (convergence, system_notice, context_compressed) to prevent scattered
              progress indicators. They stay in the message list for history. */}
          {(streaming
            ? task.messages.filter(m => !m.cardType || ["webapp_preview", "confirmation_gate", "browser_auth", "task_pause", "take_control", "checkpoint", "task_completed", "interactive_output"].includes(m.cardType))
            : task.messages
          ).map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === task.messages.length - 1}
              canRegenerate={!streaming && msg.role === "assistant" && i === task.messages.length - 1}
              onRegenerate={handleRegenerate}
              userTTSVoice={userTTSVoice}
              ttsRateStr={ttsRateStr}
              taskExternalId={task.id}
              messageIndex={i}
              allMessages={task.messages}
              onGateApprove={msg.cardType === "confirmation_gate" ? async () => {
                updateMessageCard(task.id, msg.id, { status: "approved" });
                toast.success("Action approved");
                try {
                  await fetch("/api/gate-response", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ taskExternalId: task.id, approved: true }),
                  });
                } catch (e) {
                  console.error("[ConfirmationGate] Failed to send approval:", e);
                }
              } : undefined}
              onGateReject={msg.cardType === "confirmation_gate" ? async () => {
                updateMessageCard(task.id, msg.id, { status: "rejected" });
                toast.info("Action rejected \u2014 agent will find an alternative");
                try {
                  await fetch("/api/gate-response", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ taskExternalId: task.id, approved: false }),
                  });
                } catch (e) {
                  console.error("[ConfirmationGate] Failed to send rejection:", e);
                }
              } : undefined}
            />
          ))}
          {isTyping && <TypingIndicator />}
          {streaming && (
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
                  <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>manus</span>
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </div>
                {/* Task Progress Card — NS19 */}
                <TaskProgressCard
                  actions={agentActions}
                  stepProgress={stepProgress}
                  streaming={streaming}
                />
                {/* Agent action steps */}
                {agentActions.length > 0 && (
                  <div className="mb-2 bg-card/50 rounded-lg border border-border/50 py-1">
                    {agentActions.map((action, i) => (
                      <ActionStep key={i} action={action} index={i} total={agentActions.length} />
                    ))}
                  </div>
                )}
                {/* Agent Presence Indicator — Unified state system */}
                <ActiveToolIndicator
                  actions={agentActions}
                  streaming={streaming}
                  hasStreamContent={!!streamContent}
                  isReconnecting={isReconnecting}
                  pendingGate={pendingGate ? {
                    action: pendingGate.action,
                    description: pendingGate.description,
                    category: pendingGate.category,
                    onApprove: async () => {
                      try {
                        await fetch("/api/gate-response", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ taskExternalId: pendingGate.taskId, approved: true }),
                        });
                        // Update the gate message card in the message list too
                        const gateMsg = task?.messages.find(m => m.cardType === "confirmation_gate" && m.cardData?.status === "pending");
                        if (gateMsg && task) updateMessageCard(task.id, gateMsg.id, { status: "approved" });
                        toast.success("Action approved");
                      } catch (e) {
                        console.error("[Gate] Failed to send approval:", e);
                      }
                      setPendingGate(null);
                    },
                    onReject: async () => {
                      try {
                        await fetch("/api/gate-response", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ taskExternalId: pendingGate.taskId, approved: false }),
                        });
                        const gateMsg = task?.messages.find(m => m.cardType === "confirmation_gate" && m.cardData?.status === "pending");
                        if (gateMsg && task) updateMessageCard(task.id, gateMsg.id, { status: "rejected" });
                        toast.info("Action rejected \u2014 agent will find an alternative");
                      } catch (e) {
                        console.error("[Gate] Failed to send rejection:", e);
                      }
                      setPendingGate(null);
                    },
                  } : null}
                />
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

        {/* Task Completion Badge + Rating + Follow-ups — Gaps 3, 4, 5 */}
        {task?.status === "completed" && !streaming && (
          <div className="px-4 md:px-6 py-3 border-t border-border/50 shrink-0 space-y-3">
            {/* Completion badge + rating row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
                  (generationIncomplete || (task as any).staleCompleted === 1)
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-muted border-border"
                )}>
                  <CheckCircle2 className={cn(
                    "w-3.5 h-3.5",
                    (generationIncomplete || (task as any).staleCompleted === 1) ? "text-amber-400" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    (generationIncomplete || (task as any).staleCompleted === 1) ? "text-amber-400" : "text-muted-foreground"
                  )}>
                    {generationIncomplete
                    ? "Generation incomplete — no artifact produced"
                    : (task as any).staleCompleted === 1
                      ? "Auto-completed (inactive)"
                      : "Task completed"}
                  </span>
                </div>
                {(task as any).staleCompleted === 1 && (
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
            {/* Suggested follow-ups — override with generation_incomplete when server signals it */}
            <div className="flex flex-wrap gap-2">
              {(generationIncomplete
                ? FOLLOW_UP_SUGGESTIONS.generation_incomplete
                : getFollowUpSuggestions(task?.messages ?? [])
              ).map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion)}
                  className="text-xs px-3 py-1.5 rounded-full bg-card border border-border hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
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
          <div className="relative bg-card border border-border rounded-xl focus-within:border-primary/30 transition-colors">
            {/* Attached files preview — above textarea */}
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {files.map((f, i) => {
                  const ext = f.fileName.split(".").pop()?.toUpperCase() || "FILE";
                  const sizeKB = f.size ? Math.round(f.size / 1024) : null;
                  const sizeLabel = sizeKB ? (sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`) : null;
                  return (
                    <div key={i} className="flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 text-xs">
                      <FileIcon className="w-3 h-3 text-primary" />
                      <span className="text-foreground max-w-[150px] truncate">{f.fileName}</span>
                      <span className="text-muted-foreground text-[10px] shrink-0">{ext}{sizeLabel ? ` · ${sizeLabel}` : ""}</span>
                      <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
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
                    onInjectPrompt={(prompt) => { setInput(prompt); setTimeout(() => { const ta = document.querySelector('textarea'); if (ta) ta.focus(); }, 100); }}
                    anchorRef={plusButtonRef}
                  />
                </div>
                {/* GitHub integration badge */}
                <GitHubBadge onClick={() => window.open('/github', '_self')} />
                {/* Mobile mode selector — compact pill that cycles through modes */}
                <button
                  onClick={() => {
                    const modeOrder: AgentMode[] = ["max", "limitless", "quality", "speed"];
                    const currentIdx = modeOrder.indexOf(agentMode);
                    const nextMode = modeOrder[(currentIdx + 1) % modeOrder.length];
                    setAgentMode(nextMode);
                    try { localStorage.setItem("manus-agent-mode", nextMode); } catch {}
                  }}
                  className={cn(
                    "flex md:hidden items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border transition-all active:scale-95",
                    agentMode === "limitless" ? "border-amber-500/40 bg-amber-500/15 text-amber-400" :
                    agentMode === "max" ? "border-violet-500/40 bg-violet-500/15 text-violet-400" :
                    agentMode === "quality" ? "border-primary/40 bg-primary/15 text-primary" :
                    "border-border bg-muted/50 text-muted-foreground"
                  )}
                  title={`Current mode: ${agentMode}. Tap to cycle.`}
                  aria-label={`Agent mode: ${agentMode}. Tap to change mode.`}
                >
                  {agentMode === "limitless" ? <Infinity className="w-3 h-3" /> :
                   agentMode === "max" ? <Crown className="w-3 h-3" /> :
                   agentMode === "quality" ? <Sparkles className="w-3 h-3" /> :
                   <Zap className="w-3 h-3" />}
                  <span className="capitalize">{agentMode}</span>
                </button>
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
                {/* Hands-free mode button (P15) */}
                <button
                  onClick={() => handsFree.isActive ? handsFree.deactivate() : handsFree.activate()}
                  className={cn(
                    "p-2 md:p-1.5 rounded-md transition-colors active:scale-95",
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

      {/* ── WORKSPACE PANEL (Desktop) ── */}
      <div className="hidden md:block">
        <WorkspacePanel task={task} bridgeStatus={bridgeStatus} />
      </div>

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
            <WorkspacePanel
              task={task}
              isMobile
              bridgeStatus={bridgeStatus}
              onClose={() => setMobileWorkspaceOpen(false)}
            />
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
    </div>
  );
}
