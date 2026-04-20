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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion, AnimatePresence } from "framer-motion";
import ModeToggle, { type AgentMode } from "@/components/ModeToggle";
import ShareDialog from "@/components/ShareDialog";
import TaskProgressCard from "@/components/TaskProgressCard";
import ActiveToolIndicator from "@/components/ActiveToolIndicator";
import SandboxViewer from "@/components/SandboxViewer";
import ModelSelector from "@/components/ModelSelector";
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
import PublishSheet from "@/components/PublishSheet";
import SiteLiveSheet from "@/components/SiteLiveSheet";
import { MediaCapturePanel } from "@/components/MediaCapturePanel";
import HandsFreeOverlay from "@/components/HandsFreeOverlay";
import { useHandsFreeMode } from "@/hooks/useHandsFreeMode";
import { useEdgeTTS, splitSentences } from "@/hooks/useEdgeTTS";
import { Headphones } from "lucide-react";

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
  general: [
    "Tell me more about this",
    "Create a visual summary",
    "What are the next steps?",
    "Export this as a document",
  ],
};

function getFollowUpSuggestions(messages: Message[]): string[] {
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  if (!lastAssistant) return FOLLOW_UP_SUGGESTIONS.general;
  const content = lastAssistant.content.toLowerCase();
  if (content.includes("```") || content.includes("function") || content.includes("import")) return FOLLOW_UP_SUGGESTIONS.code;
  if (content.includes("research") || content.includes("study") || content.includes("analysis")) return FOLLOW_UP_SUGGESTIONS.research;
  if (content.length > 500) return FOLLOW_UP_SUGGESTIONS.writing;
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
  const rateMutation = trpc.task.rateTask.useMutation();

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
            <span key={star} className={cn("text-sm", star <= selectedRating ? "text-amber-400" : "text-muted-foreground/30")}>
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
              star <= (hoveredStar || selectedRating) ? "text-amber-400" : "text-muted-foreground/30"
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
    case "clicking": return <MousePointer2 className={cn(iconClass, "text-amber-400")} />;
    case "executing": return <Terminal className={cn(iconClass, "text-green-400")} />;
    case "creating": return <FileText className={cn(iconClass, "text-purple-400")} />;
    case "searching": return <Search className={cn(iconClass, "text-cyan-400")} />;
    case "generating": return <ImageIcon className={cn(iconClass, "text-pink-400")} />;
    case "thinking": return <Brain className={cn(iconClass, "text-primary")} />;
    case "writing": return <FileText className={cn(iconClass, "text-indigo-400")} />;
    case "researching": return <Search className={cn(iconClass, "text-teal-400")} />;
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
    case "writing": return <span>Writing document</span>;
    case "researching": return <span>Wide research <span className="text-muted-foreground">{(action as any).label}</span></span>;
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
      <div className="flex-1 min-w-0 text-xs text-foreground/80 leading-relaxed pt-0.5">
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
                      <Globe className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-foreground/70 truncate">{title}</p>
                        {urlMatch && (
                          <p className="text-[9px] text-muted-foreground/50 font-mono truncate">{urlMatch[1]}</p>
                        )}
                      </div>
                      {urlMatch && (
                        <button
                          onClick={() => window.open(urlMatch[1], "_blank")}
                          className="p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors shrink-0"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
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

function MessageBubble({ message, isLast, onRegenerate, canRegenerate, userTTSVoice, ttsRateStr }: { message: Message; isLast: boolean; onRegenerate?: () => void; canRegenerate?: boolean; userTTSVoice?: string; ttsRateStr?: string }) {
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
              manus next
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
        ) : (
          /* Standard text message rendering */
          <div
            className={cn(
              "rounded-xl text-sm leading-relaxed",
              isUser
                ? "bg-primary/12 border border-primary/20 text-foreground px-4 py-3"
                : "text-foreground/90"
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
              <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0">
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
    { id: "images", label: "Images", icon: ImageIcon, count: imageArtifacts.data?.length },
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
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
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
                  <p className="text-[10px] mt-1 opacity-60">Screenshots will appear here when the agent browses the web</p>
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
                                <td className="text-right pr-4 pl-4 py-0 select-none text-muted-foreground/40 text-[10px] w-10 align-top">
                                  {i + 1}
                                </td>
                                <td className="pr-4 py-0 whitespace-pre-wrap text-foreground/80">
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
                  <p className="text-[10px] mt-1 opacity-60">Code files will appear here as the agent creates them</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="p-4 h-full overflow-y-auto bg-[oklch(0.1_0.005_60)]">
            {latestTerminal ? (
              <pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap text-foreground/80">
                {latestTerminal.content}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <Terminal className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No terminal output yet</p>
                  <p className="text-[10px] mt-1 opacity-60">Terminal commands will appear here as the agent executes them</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "images" && (
          <div className="h-full overflow-hidden flex flex-col">
            {imageArtifacts.data && imageArtifacts.data.length > 0 ? (
              <>
                {/* Selected image preview */}
                {(() => {
                  const selected = imageArtifacts.data[selectedImageIdx ?? 0] as any;
                  if (!selected) return null;
                  return (
                    <div className="flex-1 flex items-center justify-center p-4 bg-black/5 relative">
                      <img
                        src={selected.url}
                        alt={selected.label || "Generated image"}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                      />
                      <div className="absolute top-3 right-3 flex items-center gap-1">
                        <button
                          onClick={() => selected.url && window.open(selected.url, "_blank")}
                          className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                          title="Open full size"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (selected.url) {
                              const a = document.createElement("a");
                              a.href = selected.url;
                              a.download = selected.label || "image";
                              a.click();
                            }
                          }}
                          className="p-1.5 rounded-md bg-black/40 text-white hover:bg-black/60 transition-colors"
                          title="Download"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                      {selected.label && (
                        <div className="absolute bottom-3 left-3 right-3">
                          <p className="text-[11px] text-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded truncate">
                            {selected.label}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {/* Thumbnail strip */}
                <div className="shrink-0 border-t border-border p-2 overflow-x-auto">
                  <div className="flex items-center gap-2">
                    {imageArtifacts.data.map((img: any, i: number) => (
                      <button
                        key={img.id || i}
                        onClick={() => setSelectedImageIdx(i)}
                        className={cn(
                          "w-14 h-14 rounded-md overflow-hidden border-2 shrink-0 transition-all",
                          (selectedImageIdx ?? 0) === i
                            ? "border-primary shadow-sm shadow-primary/20"
                            : "border-border hover:border-foreground/30"
                        )}
                      >
                        <img
                          src={img.url}
                          alt={img.label || `Image ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs">No generated images yet</p>
                  <p className="text-[10px] mt-1 opacity-60">Images will appear here when the agent generates them</p>
                </div>
              </div>
            )}
          </div>
        )}

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
                            <p className="text-[10px] mt-1 opacity-60">Click download to view this file</p>
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
                  <p className="text-[10px] mt-1 opacity-60">PDF, DOCX, and Markdown files will appear here</p>
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
  const transcribeMutation = trpc.voice.transcribe.useMutation();

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
          setVoiceError(err.message || "Transcription failed. Please try again.");
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
      return { type: "executing", command: args?.description || label, status };
    case "browsing":
      return { type: "browsing", url: args?.url || label, status };
    case "creating":
      return { type: "creating", file: args?.file || label, status };
    case "writing":
      return { type: "writing", label: label, status };
    case "researching":
      return { type: "researching", label: label, status };
    case "thinking":
    default:
      return { type: "thinking", status };
  }
}

// ── Main TaskView ──

export default function TaskView() {
  const [, params] = useRoute("/task/:id");
  const [, navigate] = useLocation();
  const { tasks, activeTask, setActiveTask, addMessage, removeLastMessage, updateTaskStatus, renameTask: renameTaskFn, markAutoStreamed } = useTask();
  const { status: bridgeStatus, sendRaw: bridgeSend, lastEvent } = useBridge();
  const { isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [agentActions, setAgentActions] = useState<AgentAction[]>([]);
  const [streamImages, setStreamImages] = useState<string[]>([]);
  const [stepProgress, setStepProgress] = useState<{ completed: number; total: number; turn: number } | null>(null);
  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>("quality");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [mediaPanelOpen, setMediaPanelOpen] = useState(false);
  const [mediaPanelMode, setMediaPanelMode] = useState<"screen" | "camera" | "upload" | null>(null);
  const [mediaAttachments, setMediaAttachments] = useState<Array<{ url: string; mimeType: string; type: string }>>([]);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
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

  // tRPC mutations for task management
  const utils = trpc.useUtils();
  const archiveMutation = trpc.task.archive.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate();
      utils.task.search.invalidate();
    },
    onError: () => toast.error("Failed to delete task"),
  });
  const favoriteMutation = trpc.task.toggleFavorite.useMutation({
    onError: () => toast.error("Failed to update bookmark"),
  });
  const systemPromptMutation = trpc.task.updateSystemPrompt.useMutation({
    onSuccess: () => toast.success("System prompt saved"),
    onError: () => toast.error("Failed to save system prompt"),
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
  const userTTSRate = (prefsQuery.data?.generalSettings as any)?.ttsRate || 1.0;
  const ttsRateStr = userTTSRate === 1.0 ? undefined : `${userTTSRate > 1 ? "+" : ""}${Math.round((userTTSRate - 1) * 100)}%`;

  // ── Hands-Free Voice Mode (P15) ──
  const handsFreeInputRef = useRef<string>("");
  const handsFree = useHandsFreeMode({
    voice: userTTSVoice,
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
  useEffect(() => {
    if (!task) return;
    if (streaming) return; // Already streaming
    if (task.autoStreamed) return; // Already auto-streamed for this task (persisted in context)
    // Only trigger if: exactly 1 message, it's a user message, and no assistant response yet
    if (task.messages.length !== 1) return;
    const firstMsg = task.messages[0];
    if (firstMsg.role !== "user") return;
    // Mark as auto-streamed immediately in context to prevent re-triggering on remount
    markAutoStreamed(task.id);

    // Trigger the SSE stream for the initial message
    (async () => {
      // If bridge is connected, dispatch to the Sovereign agent instead
      if (bridgeStatus === "connected") {
        bridgeSend("task.message", {
          taskId: task.id,
          content: firstMsg.content,
          files: [],
        });
        return;
      }

      setStreaming(true);
      setStreamContent("");
      setAgentActions([]);
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

        const response = await fetch("/api/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ messages, taskExternalId: task.id, mode: agentMode }),
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
                accumulatedRef.current = accumulated;
                setStreamContent(accumulated);
              }
              if (data.tool_start) {
                const display = data.tool_start.display || {};
                const actionType = display.type || "thinking";
                const newAction = mapToolToAction(actionType, display.label || data.tool_start.name, data.tool_start.args, "active");
                actions.push(newAction);
                actionsRef.current = [...actions];
                setAgentActions([...actions]);
              }
              if (data.tool_result) {
                // Mark the matching action as done and attach preview
                const idx = actions.findIndex(a => a.status === "active");
                if (idx >= 0) {
                  const preview = data.tool_result.preview ? String(data.tool_result.preview).slice(0, 500) : undefined;
                  actions[idx] = { ...actions[idx], status: "done", preview } as AgentAction;
                  actionsRef.current = [...actions];
                  setAgentActions([...actions]);
                }
              }
              if (data.image) {
                images.push(data.image);
                setStreamImages([...images]);
                accumulated += `\n\n![Generated Image](${data.image})\n\n`;
                accumulatedRef.current = accumulated;
                setStreamContent(accumulated);
              }
              if (data.document) {
                const docTitle = data.document.title || "Document";
                const docUrl = data.document.url;
                accumulated += `\n\n📄 **${docTitle}** — [Download Document](${docUrl})\n\n`;
                accumulatedRef.current = accumulated;
                setStreamContent(accumulated);
              }
              if (data.done) {
                accumulated = data.content || accumulated;
                accumulatedRef.current = accumulated;
                // Append images to content if they were generated
                if (images.length > 0 && !accumulated.includes(images[0])) {
                  for (const img of images) {
                    accumulated += `\n\n![Generated Image](${img})`;
                  }
                  accumulatedRef.current = accumulated;
                }
              }
              if (data.status) {
                if (data.status === "running") updateTaskStatus(task.id, "running");
                if (data.status === "completed") updateTaskStatus(task.id, "completed");
              }
              if (data.step_progress) {
                setStepProgress(data.step_progress);
              }
              if (data.error) {
                accumulated += `\n\n\u26a0\ufe0f ${data.error}`;
                accumulatedRef.current = accumulated;
                setStreamContent(accumulated);
              }
            } catch { /* skip malformed lines */ }
          }
        }

        // Mark all remaining active actions as done
        setStepProgress(null);
        const finalActions = actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
        addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
      } catch (err: any) {
        if (err.name === "AbortError") {
          if (accumulated.trim()) {
            addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
          }
        } else {
          // Provide user-friendly error messages instead of raw browser errors
          let errorMsg = "Something went wrong. Please try again.";
          if (err.message === "Load failed" || err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.") {
            errorMsg = "Connection lost. The server may have restarted. Please try again.";
          } else if (err.message?.includes("timeout")) {
            errorMsg = "The request timed out. Please try again with a shorter message.";
          } else if (err.message) {
            errorMsg = `I encountered an error: ${err.message}. Please try again.`;
          }
          addMessage(task.id, {
            role: "assistant",
            content: errorMsg,
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

    // If bridge is connected, dispatch to the Sovereign agent
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
    setStreamContent("");
    setAgentActions([]);
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

      // Pass taskExternalId so server can resolve per-task system prompt
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages, taskExternalId: task.id, mode: agentMode }),
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
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
            if (data.tool_start) {
              const display = data.tool_start.display || {};
              const actionType = display.type || "thinking";
              const newAction = mapToolToAction(actionType, display.label || data.tool_start.name, data.tool_start.args, "active");
              actions.push(newAction);
              actionsRef.current = [...actions];
              setAgentActions([...actions]);
            }
            if (data.tool_result) {
              const idx = actions.findIndex(a => a.status === "active");
              if (idx >= 0) {
                const preview = data.tool_result.preview ? String(data.tool_result.preview).slice(0, 500) : undefined;
                actions[idx] = { ...actions[idx], status: "done", preview } as AgentAction;
                actionsRef.current = [...actions];
                setAgentActions([...actions]);
              }
            }
            if (data.image) {
              images.push(data.image);
              setStreamImages([...images]);
              accumulated += `\n\n![Generated Image](${data.image})\n\n`;
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
            if (data.document) {
              // Inject download link into accumulated content so it appears in the chat
              const docTitle = data.document.title || "Document";
              const docUrl = data.document.url;
              accumulated += `\n\n📄 **${docTitle}** — [Download Document](${docUrl})\n\n`;
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
            if (data.done) {
              accumulated = data.content || accumulated;
              accumulatedRef.current = accumulated;
              if (images.length > 0 && !accumulated.includes(images[0])) {
                for (const img of images) {
                  accumulated += `\n\n![Generated Image](${img})`;
                }
                accumulatedRef.current = accumulated;
              }
            }
            if (data.status) {
              if (data.status === "running") updateTaskStatus(task.id, "running");
              if (data.status === "completed") updateTaskStatus(task.id, "completed");
            }
            if (data.step_progress) {
              setStepProgress(data.step_progress);
            }
            if (data.error) {
              accumulated += `\n\n\u26a0\ufe0f ${data.error}`;
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      setStepProgress(null);
      const finalActions = actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) {
          addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
        }
      } else {
        // Provide user-friendly error messages instead of raw browser errors
        let errorMsg = "Something went wrong. Please try again.";
        if (err.message === "Load failed" || err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.") {
          errorMsg = "Connection lost. The server may have restarted. Please try again.";
        } else if (err.message?.includes("timeout")) {
          errorMsg = "The request timed out. Please try again with a shorter message.";
        } else if (err.message) {
          errorMsg = `I encountered an error: ${err.message}. Please try again.`;
        }
        addMessage(task.id, {
          role: "assistant",
          content: errorMsg,
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
  }, [input, task, addMessage, bridgeStatus, bridgeSend, files, clearFiles]);

  // ── Hands-Free Send (P15) — streams and auto-speaks response ──
  const handleHandsFreeSend = useCallback(async (spokenText: string) => {
    if (!task) return;
    handsFree.notifyProcessing();
    setStreaming(true);
    setStreamContent("");
    setAgentActions([]);
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

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages, taskExternalId: task.id, mode: agentMode }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

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
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
            if (data.tool_start) {
              const display = data.tool_start.display || {};
              const actionType = display.type || "thinking";
              const newAction = mapToolToAction(actionType, display.label || data.tool_start.name, data.tool_start.args, "active");
              actions.push(newAction);
              actionsRef.current = [...actions];
              setAgentActions([...actions]);
            }
            if (data.tool_result) {
              const idx = actions.findIndex(a => a.status === "active");
              if (idx >= 0) {
                const preview = data.tool_result.preview ? String(data.tool_result.preview).slice(0, 500) : undefined;
                actions[idx] = { ...actions[idx], status: "done", preview } as AgentAction;
                actionsRef.current = [...actions];
                setAgentActions([...actions]);
              }
            }
            if (data.image) {
              images.push(data.image);
              setStreamImages([...images]);
              accumulated += `\n\n![Generated Image](${data.image})\n\n`;
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
            if (data.done) {
              accumulated = data.content || accumulated;
              accumulatedRef.current = accumulated;
            }
            if (data.error) {
              accumulated += `\n\n\u26a0\ufe0f ${data.error}`;
              accumulatedRef.current = accumulated;
              setStreamContent(accumulated);
            }
          } catch { /* skip malformed lines */ }
        }
      }

      setStepProgress(null);
      const finalActions = actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });

      // ── Auto-speak the response via Edge TTS ──
      handsFree.notifyComplete(accumulated);
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) {
          addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped]*", actions: actions.length > 0 ? actions : undefined });
        }
      } else {
        const errorMsg = "Something went wrong. Please try again.";
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
    setStreamContent("");
    setAgentActions([]);
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

      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: conversationMessages, taskExternalId: task.id, mode: agentMode }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

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
            if (data.delta) { accumulated += data.delta; accumulatedRef.current = accumulated; setStreamContent(accumulated); }
            if (data.tool_start) {
              const display = data.tool_start.display || {};
              const actionType = display.type || "thinking";
              actions.push(mapToolToAction(actionType, display.label || data.tool_start.name, data.tool_start.args, "active"));
              actionsRef.current = [...actions];
              setAgentActions([...actions]);
            }
            if (data.tool_result) {
              const idx = actions.findIndex(a => a.status === "active");
              if (idx >= 0) {
                const preview = data.tool_result.preview ? String(data.tool_result.preview).slice(0, 500) : undefined;
                actions[idx] = { ...actions[idx], status: "done", preview } as AgentAction;
                actionsRef.current = [...actions];
                setAgentActions([...actions]);
              }
            }
            if (data.image) { images.push(data.image); setStreamImages([...images]); accumulated += `\n\n![Generated Image](${data.image})\n\n`; accumulatedRef.current = accumulated; setStreamContent(accumulated); }
            if (data.document) { accumulated += `\n\n📄 **${data.document.title || "Document"}** — [Download Document](${data.document.url})\n\n`; accumulatedRef.current = accumulated; setStreamContent(accumulated); }
            if (data.done) { accumulated = data.content || accumulated; accumulatedRef.current = accumulated; }
            if (data.status) {
              if (data.status === "running") updateTaskStatus(task.id, "running");
              if (data.status === "completed") updateTaskStatus(task.id, "completed");
            }
            if (data.step_progress) setStepProgress(data.step_progress);
            if (data.error) { accumulated += `\n\n\u26a0\ufe0f ${data.error}`; accumulatedRef.current = accumulated; setStreamContent(accumulated); }
          } catch { /* skip */ }
        }
      }

      setStepProgress(null);
      const finalActions = actions.map(a => a.status === "active" ? { ...a, status: "done" as const } : a);
      addMessage(task.id, { role: "assistant", content: accumulated, actions: finalActions.length > 0 ? finalActions : undefined });
    } catch (err: any) {
      if (err.name === "AbortError") {
        if (accumulated.trim()) addMessage(task.id, { role: "assistant", content: accumulated + "\n\n*[Generation stopped by user]*", actions: actions.length > 0 ? actions : undefined });
      } else {
        let errorMsg = "Something went wrong. Please try again.";
        if (err.message === "Load failed" || err.message === "Failed to fetch" || err.message === "NetworkError when attempting to fetch resource.") {
          errorMsg = "Connection lost. The server may have restarted. Please try again.";
        } else if (err.message?.includes("timeout")) {
          errorMsg = "The request timed out. Please try again with a shorter message.";
        } else if (err.message) {
          errorMsg = `I encountered an error: ${err.message}. Please try again.`;
        }
        addMessage(task.id, { role: "assistant", content: errorMsg });
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
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium shrink-0 whitespace-nowrap">
                Completed
              </span>
            )}
            {/* Cost visibility indicator */}
            {(task.status === "running" || task.status === "completed") && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 whitespace-nowrap shrink-0" title="Estimated task cost">
                <span className="text-[10px] text-muted-foreground font-mono">
                  {agentMode === "speed" ? "~$0.02" : agentMode === "max" ? "~$0.50" : "~$0.15"}
                </span>
                <span className="text-[9px] text-muted-foreground/60">
                  {agentMode === "speed" ? "speed" : agentMode === "max" ? "max" : "quality"}
                </span>
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
            <ModelSelector compact className="hidden md:flex" />
            {/* Mode Toggle */}
            <ModeToggle mode={agentMode} onChange={setAgentMode} className="hidden md:flex mr-1" />
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
              {shareCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            {/* Bookmark */}
            <button
              onClick={handleToggleFavorite}
              className={cn(
                "p-1.5 rounded-md transition-colors hidden md:flex",
                isFavorited ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
                        const lines = [`# ${task.title}\n`, `Created: ${task.createdAt.toLocaleString()}\n`, `Status: ${task.status}\n`, `---\n`];
                        for (const msg of task.messages) {
                          const label = msg.role === "user" ? "**You**" : msg.role === "assistant" ? "**Assistant**" : "**System**";
                          lines.push(`${label} (${msg.timestamp.toLocaleString()})\n\n${msg.content}\n\n---\n`);
                        }
                        const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${task.title.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 40).trim()}.md`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setShowMoreMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Transcript
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-5 overscroll-contain">
          {task.messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isLast={i === task.messages.length - 1}
              canRegenerate={!streaming && msg.role === "assistant" && i === task.messages.length - 1}
              onRegenerate={handleRegenerate}
              userTTSVoice={userTTSVoice}
              ttsRateStr={ttsRateStr}
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
                  <span className="text-xs font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>manus next</span>
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
                {/* Streaming text content */}
                {streamContent ? (
                  <div className="text-sm text-foreground/90 prose prose-sm prose-invert max-w-none">
                    <Streamdown>{streamContent}</Streamdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                {/* Active Tool Indicator — NS19 */}
                <ActiveToolIndicator actions={agentActions} streaming={streaming} />
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
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-400">Task completed</span>
                </div>
                {task.completedSteps && task.totalSteps && (
                  <span className="text-[11px] text-muted-foreground">
                    {task.completedSteps}/{task.totalSteps} steps
                  </span>
                )}
              </div>
              <TaskRating taskId={task.id} />
            </div>
            {/* Suggested follow-ups */}
            <div className="flex flex-wrap gap-2">
              {getFollowUpSuggestions(task?.messages ?? []).map((suggestion, i) => (
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
                      <span className="text-foreground/80 max-w-[150px] truncate">{f.fileName}</span>
                      <span className="text-muted-foreground/60 text-[10px] shrink-0">{ext}{sizeLabel ? ` · ${sizeLabel}` : ""}</span>
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
              placeholder={streaming ? "Type a follow-up message..." : "Send a message..."}
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
                    anchorRef={plusButtonRef}
                  />
                </div>
                {/* GitHub integration badge */}
                <GitHubBadge onClick={() => window.open('/github', '_self')} />
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
          <p className="text-[10px] text-muted-foreground text-center mt-2 hidden md:block">
            Manus Next may make mistakes. Verify important information.
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
