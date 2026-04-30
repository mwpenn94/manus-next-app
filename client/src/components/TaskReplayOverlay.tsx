/**
 * TaskReplayOverlay — In-task step-by-step replay with timeline scrubber
 *
 * Activated when ?replay=1 is present on /task/:id.
 * Replays the task's messages as a step-by-step timeline with:
 * - Play/pause/step-forward/step-back controls
 * - Timeline scrubber (range slider)
 * - Speed selector (0.5x, 1x, 2x, 4x)
 * - Action step visualization with timestamps
 * - Keyboard shortcuts (Space, ←→, Shift+←→, 1-4 speed)
 *
 * Pass 50 — Replay Mode UI
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import BrandAvatar from "@/components/BrandAvatar";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  MessageSquare,
  Zap,
  Globe,
  Search,
  ImageIcon,
  Code,
  Terminal,
  Brain,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Maximize2,
  Minimize2,
  User,
} from "lucide-react";
import type { Message, AgentAction } from "@/contexts/TaskContext";

// ── Step metadata for visual rendering ──
interface StepMeta {
  icon: typeof Globe;
  label: string;
  color: string;
  bgColor: string;
}

const ACTION_TYPE_META: Record<string, StepMeta> = {
  searching: { icon: Search, label: "Searching", color: "text-orange-400", bgColor: "bg-orange-500/10" },
  browsing: { icon: Globe, label: "Browsing", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  generating: { icon: ImageIcon, label: "Generating", color: "text-pink-400", bgColor: "bg-pink-500/10" },
  executing: { icon: Terminal, label: "Executing", color: "text-green-400", bgColor: "bg-green-500/10" },
  creating: { icon: FileText, label: "Creating", color: "text-teal-400", bgColor: "bg-teal-500/10" },
  writing: { icon: FileText, label: "Writing", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  researching: { icon: Brain, label: "Researching", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  building: { icon: Code, label: "Building", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  editing: { icon: Code, label: "Editing", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  reading: { icon: FileText, label: "Reading", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
  installing: { icon: Terminal, label: "Installing", color: "text-lime-400", bgColor: "bg-lime-500/10" },
  thinking: { icon: Brain, label: "Thinking", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  analyzing: { icon: Brain, label: "Analyzing", color: "text-indigo-400", bgColor: "bg-indigo-500/10" },
  designing: { icon: ImageIcon, label: "Designing", color: "text-rose-400", bgColor: "bg-rose-500/10" },
  versioning: { icon: Code, label: "Versioning", color: "text-gray-400", bgColor: "bg-gray-500/10" },
  deploying: { icon: Globe, label: "Deploying", color: "text-green-400", bgColor: "bg-green-500/10" },
  sending: { icon: MessageSquare, label: "Sending", color: "text-blue-400", bgColor: "bg-blue-500/10" },
};

function getActionMeta(type: string): StepMeta {
  return ACTION_TYPE_META[type] || { icon: Zap, label: type || "Step", color: "text-muted-foreground", bgColor: "bg-muted/50" };
}

// ── Timeline step: either a message or an action within a message ──
interface TimelineStep {
  id: string;
  type: "user_message" | "assistant_message" | "action" | "system_card";
  label: string;
  description?: string;
  timestamp: Date;
  offsetMs: number;
  meta: StepMeta;
  messageIndex: number;
  actionIndex?: number;
  content?: string;
  preview?: string;
}

function buildTimeline(messages: Message[]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const startTime = messages[0]?.timestamp?.getTime() || Date.now();

  for (let mi = 0; mi < messages.length; mi++) {
    const msg = messages[mi];
    const msgTime = msg.timestamp?.getTime() || startTime;
    const offsetMs = msgTime - startTime;

    if (msg.role === "user") {
      steps.push({
        id: `msg-${mi}`,
        type: "user_message",
        label: "User Message",
        description: msg.content.slice(0, 120),
        timestamp: msg.timestamp || new Date(startTime),
        offsetMs: Math.max(0, offsetMs),
        meta: { icon: User, label: "User", color: "text-foreground", bgColor: "bg-primary/10" },
        messageIndex: mi,
        content: msg.content,
      });
    } else if (msg.role === "assistant") {
      // If the message has actions, create a step for each action
      if (msg.actions && msg.actions.length > 0) {
        for (let ai = 0; ai < msg.actions.length; ai++) {
          const action = msg.actions[ai];
          const actionMeta = getActionMeta(action.type);
          const actionLabel = (action as any).query || (action as any).url || (action as any).command ||
            (action as any).file || (action as any).label || (action as any).description || actionMeta.label;
          steps.push({
            id: `msg-${mi}-action-${ai}`,
            type: "action",
            label: actionMeta.label,
            description: typeof actionLabel === "string" ? actionLabel.slice(0, 120) : actionMeta.label,
            timestamp: msg.timestamp || new Date(startTime),
            offsetMs: Math.max(0, offsetMs + ai * 500), // Stagger actions by 500ms
            meta: actionMeta,
            messageIndex: mi,
            actionIndex: ai,
            preview: action.preview,
          });
        }
      }
      // Always add the assistant message itself as a step (the text response)
      if (msg.content && msg.content.trim()) {
        steps.push({
          id: `msg-${mi}-text`,
          type: "assistant_message",
          label: "Response",
          description: msg.content.slice(0, 120),
          timestamp: msg.timestamp || new Date(startTime),
          offsetMs: Math.max(0, offsetMs + (msg.actions?.length || 0) * 500),
          meta: { icon: MessageSquare, label: "Response", color: "text-blue-400", bgColor: "bg-blue-500/10" },
          messageIndex: mi,
          content: msg.content,
        });
      }
    } else if (msg.cardType) {
      // System cards (webapp_preview, checkpoint, etc.)
      steps.push({
        id: `msg-${mi}-card`,
        type: "system_card",
        label: msg.cardType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        description: msg.content?.slice(0, 120),
        timestamp: msg.timestamp || new Date(startTime),
        offsetMs: Math.max(0, offsetMs),
        meta: { icon: Zap, label: "System", color: "text-muted-foreground", bgColor: "bg-muted/50" },
        messageIndex: mi,
        content: msg.content,
      });
    }
  }

  return steps.sort((a, b) => a.offsetMs - b.offsetMs);
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

// ── Step Card ──
function StepCard({
  step,
  isActive,
  isPast,
  onClick,
}: {
  step: TimelineStep;
  isActive: boolean;
  isPast: boolean;
  onClick: () => void;
}) {
  const Icon = step.meta.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all border",
        isActive
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
          : isPast
            ? "border-transparent bg-transparent opacity-70 hover:opacity-100 hover:bg-muted/30"
            : "border-transparent bg-transparent opacity-40 hover:opacity-70 hover:bg-muted/20"
      )}
      onClick={onClick}
    >
      <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5", step.meta.bgColor)}>
        <Icon className={cn("w-3.5 h-3.5", step.meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">{step.label}</span>
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(step.offsetMs)}
          </span>
        </div>
        {step.description && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-relaxed">
            {step.description}
          </p>
        )}
        {isActive && step.preview && (
          <div className="mt-1.5 text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5 max-h-20 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono">{step.preview.slice(0, 300)}</pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Overlay ──
interface TaskReplayOverlayProps {
  messages: Message[];
  onClose: () => void;
  scrollToMessage?: (messageIndex: number) => void;
}

export default function TaskReplayOverlay({ messages, onClose, scrollToMessage }: TaskReplayOverlayProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeStepRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const timeline = useMemo(() => buildTimeline(messages), [messages]);

  // Auto-scroll to active step
  useEffect(() => {
    if (activeStepRef.current && timelineContainerRef.current) {
      activeStepRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentIndex]);

  // Scroll the main chat to the corresponding message
  useEffect(() => {
    if (timeline[currentIndex] && scrollToMessage) {
      scrollToMessage(timeline[currentIndex].messageIndex);
    }
  }, [currentIndex, timeline, scrollToMessage]);

  // Playback logic
  const playNext = useCallback(() => {
    if (currentIndex >= timeline.length - 1) {
      setIsPlaying(false);
      return;
    }
    const current = timeline[currentIndex];
    const next = timeline[currentIndex + 1];
    // Use offset difference, with a minimum of 200ms and max of 3000ms
    const rawDelay = (next.offsetMs - current.offsetMs) / playbackSpeed;
    const delay = Math.max(200, Math.min(rawDelay || 800, 3000));
    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, delay);
  }, [currentIndex, timeline, playbackSpeed]);

  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      playNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, playNext, timeline.length]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          if (e.shiftKey) setCurrentIndex(prev => Math.max(prev - 5, 0));
          else setCurrentIndex(prev => Math.max(prev - 1, 0));
          setIsPlaying(false);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          if (e.shiftKey) setCurrentIndex(prev => Math.min(prev + 5, timeline.length - 1));
          else setCurrentIndex(prev => Math.min(prev + 1, timeline.length - 1));
          setIsPlaying(false);
          break;
        case "Home":
        case "0":
          e.preventDefault();
          setCurrentIndex(0);
          setIsPlaying(false);
          break;
        case "End":
          e.preventDefault();
          setCurrentIndex(timeline.length - 1);
          setIsPlaying(false);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "1":
          e.preventDefault();
          setPlaybackSpeed(0.5);
          break;
        case "2":
          e.preventDefault();
          setPlaybackSpeed(1);
          break;
        case "3":
          e.preventDefault();
          setPlaybackSpeed(2);
          break;
        case "4":
          e.preventDefault();
          setPlaybackSpeed(4);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [timeline.length, onClose]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => {
    setIsPlaying(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const handleRestart = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const currentStep = timeline[currentIndex];
  const totalDuration = timeline.length > 0 ? timeline[timeline.length - 1].offsetMs : 0;
  const currentTime = currentStep ? formatTime(currentStep.offsetMs) : "0:00";
  const totalTime = formatTime(totalDuration);

  // Summary stats
  const userMessages = timeline.filter(s => s.type === "user_message").length;
  const actionSteps = timeline.filter(s => s.type === "action").length;
  const assistantMessages = timeline.filter(s => s.type === "assistant_message").length;

  if (timeline.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl shadow-2xl px-6 py-4 flex items-center gap-3"
      >
        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">No steps to replay in this task</span>
        <Button variant="ghost" size="sm" onClick={onClose} className="ml-2">
          <X className="w-3.5 h-3.5" />
        </Button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={cn(
          "fixed z-50 bg-card border border-border rounded-xl shadow-2xl shadow-black/30 transition-all duration-200",
          expanded
            ? "bottom-4 left-4 right-4 md:left-8 md:right-8 max-h-[70vh]"
            : "bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <BrandAvatar size="sm" />
            </div>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Task Replay
            </span>
            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted font-mono">
              {timeline.length} steps
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? "Minimize" : "Expand"}
            >
              {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Close replay">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="w-2.5 h-2.5" />
            {userMessages} messages
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            {actionSteps} actions
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" />
            {assistantMessages} responses
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-2.5 h-2.5" />
            {totalTime}
          </span>
        </div>

        {/* Timeline scrubber */}
        <div className="px-4 pt-3 pb-2">
          <Slider
            min={0}
            max={Math.max(timeline.length - 1, 0)}
            value={[currentIndex]}
            onValueChange={([val]) => {
              setCurrentIndex(val);
              setIsPlaying(false);
            }}
            className="w-full"
            aria-label="Timeline scrubber"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono tabular-nums">
            <span>{currentTime}</span>
            <span>Step {currentIndex + 1} / {timeline.length}</span>
            <span>{totalTime}</span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-1.5 px-4 pb-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleRestart} title="Restart (Home)">
            <SkipBack className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setCurrentIndex(prev => Math.max(prev - 1, 0)); setIsPlaying(false); }}
            title="Previous step (←)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          {isPlaying ? (
            <Button size="icon" className="h-8 w-8" onClick={handlePause} title="Pause (Space)">
              <Pause className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="icon" className="h-8 w-8" onClick={handlePlay} title="Play (Space)">
              <Play className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setCurrentIndex(prev => Math.min(prev + 1, timeline.length - 1)); setIsPlaying(false); }}
            title="Next step (→)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setCurrentIndex(timeline.length - 1); setIsPlaying(false); }}
            title="Skip to end (End)"
          >
            <SkipForward className="w-3 h-3" />
          </Button>

          {/* Speed selector */}
          <div className="flex items-center gap-0.5 ml-3 border-l border-border/50 pl-3">
            {[0.5, 1, 2, 4].map(speed => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-1.5 text-[10px] font-mono",
                  playbackSpeed === speed && "shadow-sm"
                )}
                onClick={() => setPlaybackSpeed(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        {/* Step timeline (expanded mode) */}
        {expanded && (
          <div
            ref={timelineContainerRef}
            className="border-t border-border/30 max-h-[40vh] overflow-y-auto px-2 py-2 space-y-0.5"
          >
            {timeline.map((step, i) => (
              <div key={step.id} ref={i === currentIndex ? activeStepRef : undefined}>
                <StepCard
                  step={step}
                  isActive={i === currentIndex}
                  isPast={i < currentIndex}
                  onClick={() => {
                    setCurrentIndex(i);
                    setIsPlaying(false);
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Current step indicator (compact mode) */}
        {!expanded && currentStep && (
          <div className="px-4 pb-3 pt-1">
            <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-lg border", "border-primary/30 bg-primary/5")}>
              <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", currentStep.meta.bgColor)}>
                <currentStep.meta.icon className={cn("w-3.5 h-3.5", currentStep.meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-foreground">{currentStep.label}</span>
                {currentStep.description && (
                  <p className="text-[10px] text-muted-foreground truncate">{currentStep.description}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Keyboard hint */}
        <div className="px-4 pb-2 text-center">
          <p className="text-[9px] text-muted-foreground">
            <kbd className="px-1 py-0.5 rounded bg-muted text-[8px] font-mono">Space</kbd> play/pause
            {" "}<kbd className="px-1 py-0.5 rounded bg-muted text-[8px] font-mono">←→</kbd> step
            {" "}<kbd className="px-1 py-0.5 rounded bg-muted text-[8px] font-mono">Esc</kbd> close
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
