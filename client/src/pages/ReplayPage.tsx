/**
 * ReplayPage — Rich step-by-step session replay with session discovery
 * 
 * Two modes:
 * 1. Session List (no taskId) — shows all tasks with recorded events
 * 2. Session Replay (with taskId) — timeline viewer with playback controls
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRoute, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Film,
  Loader2,
  Clock,
  ChevronLeft,
  AlertCircle,
  Globe,
  Code,
  Terminal,
  ImageIcon,
  Search,
  FileText,
  Brain,
  MessageSquare,
  Zap,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Hash,
} from "lucide-react";
import { Streamdown } from "streamdown";

// ── Event Type Metadata ──

interface EventMeta {
  icon: typeof Globe;
  label: string;
  color: string;
  bgColor: string;
}

const EVENT_META: Record<string, EventMeta> = {
  tool_start: { icon: Zap, label: "Tool Call", color: "text-foreground", bgColor: "bg-muted/50" },
  tool_result: { icon: CheckCircle2, label: "Tool Result", color: "text-foreground/70", bgColor: "bg-muted/50" },
  tool_error: { icon: XCircle, label: "Tool Error", color: "text-red-400", bgColor: "bg-red-500/10" },
  text_delta: { icon: MessageSquare, label: "Response", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  thinking: { icon: Brain, label: "Thinking", color: "text-purple-400", bgColor: "bg-purple-500/10" },
  image: { icon: ImageIcon, label: "Image", color: "text-pink-400", bgColor: "bg-pink-500/10" },
  code: { icon: Code, label: "Code", color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  browser: { icon: Globe, label: "Browser", color: "text-sky-400", bgColor: "bg-sky-500/10" },
  search: { icon: Search, label: "Search", color: "text-orange-400", bgColor: "bg-orange-500/10" },
  document: { icon: FileText, label: "Document", color: "text-teal-400", bgColor: "bg-teal-500/10" },
  terminal: { icon: Terminal, label: "Terminal", color: "text-green-400", bgColor: "bg-green-500/10" },
};

const DEFAULT_META: EventMeta = { icon: Zap, label: "Event", color: "text-muted-foreground", bgColor: "bg-muted/50" };

function getEventMeta(eventType: string): EventMeta {
  if (EVENT_META[eventType]) return EVENT_META[eventType];
  for (const [key, meta] of Object.entries(EVENT_META)) {
    if (eventType.toLowerCase().includes(key)) return meta;
  }
  return DEFAULT_META;
}

// ── Parse event payload for rich rendering ──

interface ParsedPayload {
  toolName?: string;
  description?: string;
  content?: string;
  imageUrl?: string;
  codeContent?: string;
  codeLanguage?: string;
  url?: string;
  error?: string;
  raw: string;
}

function parsePayload(payload: string): ParsedPayload {
  try {
    const obj = JSON.parse(payload);
    return {
      toolName: obj.tool || obj.toolName || obj.name || undefined,
      description: obj.description || obj.message || obj.text || undefined,
      content: typeof obj.content === "string" ? obj.content : typeof obj.result === "string" ? obj.result : undefined,
      imageUrl: obj.imageUrl || obj.url?.match(/\.(png|jpg|jpeg|gif|webp|svg)/i) ? obj.url : undefined,
      codeContent: obj.code || obj.codeContent || undefined,
      codeLanguage: obj.language || obj.lang || undefined,
      url: obj.url || undefined,
      error: obj.error || undefined,
      raw: JSON.stringify(obj, null, 2),
    };
  } catch {
    return { raw: payload, content: payload };
  }
}

// ── Event Card Component ──

function EventCard({
  event,
  index,
  isActive,
  onClick,
}: {
  event: { id: number; eventType: string; payload: string; offsetMs: number };
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = getEventMeta(event.eventType);
  const parsed = useMemo(() => parsePayload(event.payload), [event.payload]);
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "border rounded-lg transition-all cursor-pointer",
        isActive
          ? "border-primary/40 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-border hover:border-border/80 hover:bg-muted/30"
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0", meta.bgColor)}>
          <Icon className={cn("w-3.5 h-3.5", meta.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">{meta.label}</span>
            {parsed.toolName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {parsed.toolName}
              </span>
            )}
          </div>
          {parsed.description && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{parsed.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {(event.offsetMs / 1000).toFixed(1)}s
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Preview content */}
      {isActive && !expanded && (parsed.imageUrl || parsed.codeContent || parsed.error) && (
        <div className="px-3 pb-2.5">
          {parsed.imageUrl && (
            <img
              src={parsed.imageUrl}
              alt="Generated"
              className="w-full max-h-40 object-contain rounded border border-border"
            />
          )}
          {parsed.codeContent && !parsed.imageUrl && (
            <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto max-h-24 text-foreground/80">
              {parsed.codeContent.slice(0, 500)}
            </pre>
          )}
          {parsed.error && (
            <div className="text-[11px] text-red-400 bg-red-500/10 rounded px-2 py-1.5">
              {parsed.error}
            </div>
          )}
        </div>
      )}

      {/* Expanded raw payload */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/50 mt-1 pt-2">
          {parsed.imageUrl && (
            <div className="mb-2">
              <img
                src={parsed.imageUrl}
                alt="Generated"
                className="w-full max-h-48 object-contain rounded border border-border"
              />
            </div>
          )}
          {parsed.content && !parsed.imageUrl && (
            <div className="mb-2 text-xs text-foreground/80 max-h-32 overflow-y-auto">
              <Streamdown>{parsed.content.slice(0, 1000)}</Streamdown>
            </div>
          )}
          {parsed.url && (
            <a
              href={parsed.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primary hover:underline mb-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {parsed.url.length > 60 ? parsed.url.slice(0, 60) + "..." : parsed.url}
            </a>
          )}
          <div className="relative">
            <pre className="text-[10px] font-mono bg-muted/50 rounded p-2 overflow-x-auto max-h-48 text-foreground/70 whitespace-pre-wrap">
              {parsed.raw}
            </pre>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(parsed.raw);
              }}
              className="absolute top-1 right-1 p-1 rounded bg-muted hover:bg-accent transition-colors"
              title="Copy raw payload"
            >
              <Copy className="w-2.5 h-2.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Session List Component ──

function SessionList({ onSelect }: { onSelect: (taskId: number) => void }) {
  const sessionsQuery = trpc.replay.sessions.useQuery();
  const sessions = sessionsQuery.data ?? [];

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground">No recorded sessions yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Events are recorded automatically during task execution with the agent
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => {
        const durationSec = session.durationMs ? (session.durationMs / 1000).toFixed(1) : "0";
        const statusColor =
          session.status === "completed" ? "text-foreground/70" :
          session.status === "running" ? "text-blue-400" :
          session.status === "error" ? "text-red-400" :
          "text-muted-foreground";

        return (
          <Card
            key={session.taskId}
            className="cursor-pointer hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all group"
            onClick={() => onSelect(session.taskId)}
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                  <Film className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {session.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={cn("text-[10px] font-medium uppercase", statusColor)}>
                      {session.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      {session.eventCount} events
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {durationSec}s
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3 h-3 mr-1" />
                    Replay
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main ReplayPage ──

export default function ReplayPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, params] = useRoute("/replay/:taskId");
  const [, navigate] = useLocation();
  const taskId = params?.taskId ? Number(params.taskId) : null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeCardRef = useRef<HTMLDivElement>(null);

  const eventsQuery = trpc.replay.events.useQuery(
    { taskId: taskId! },
    { enabled: !!taskId && isAuthenticated }
  );

  const events = eventsQuery.data ?? [];

  // Auto-scroll to active card during playback
  useEffect(() => {
    if (isPlaying && activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentIndex, isPlaying]);

  // Playback logic
  const playNext = useCallback(() => {
    if (currentIndex >= events.length - 1) {
      setIsPlaying(false);
      return;
    }

    const current = events[currentIndex];
    const next = events[currentIndex + 1];
    const delay = Math.max(50, (next.offsetMs - current.offsetMs) / playbackSpeed);

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, delay);
  }, [currentIndex, events, playbackSpeed]);

  useEffect(() => {
    if (isPlaying && events.length > 0) {
      playNext();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, playNext, events.length]);

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
  const handleSkipForward = () => {
    setCurrentIndex((prev) => Math.min(prev + 10, events.length - 1));
  };

  // Group events into logical steps for summary
  const stepSummary = useMemo(() => {
    const toolStarts = events.filter((e) => e.eventType === "tool_start" || e.eventType.includes("tool"));
    const textEvents = events.filter((e) => e.eventType === "text_delta" || e.eventType.includes("text"));
    return {
      totalEvents: events.length,
      toolCalls: toolStarts.length,
      textChunks: textEvents.length,
      duration: events.length > 0 ? (events[events.length - 1].offsetMs / 1000).toFixed(1) : "0",
    };
  }, [events]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Film className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sign in to view session replays</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
      </div>
    );
  }

  // Session list view (no taskId selected)
  if (!taskId) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Film className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Session Replay</h1>
              <p className="text-sm text-muted-foreground">
                Replay recorded task sessions to review agent actions step by step
              </p>
            </div>
          </div>

          <SessionList onSelect={(id) => navigate(`/replay/${id}`)} />
        </div>
      </div>
    );
  }

  // Session replay view (with taskId)
  const currentEvent = events[currentIndex];
  const progress = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0;
  const currentTime = currentEvent ? `${(currentEvent.offsetMs / 1000).toFixed(1)}s` : "0s";
  const totalTime = events.length > 0 ? `${(events[events.length - 1].offsetMs / 1000).toFixed(1)}s` : "0s";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/replay")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Film className="w-5 h-5" />
              Session Replay
            </h1>
            <p className="text-xs text-muted-foreground">
              Task #{taskId} — {events.length} events recorded
            </p>
          </div>
        </div>

        {eventsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : eventsQuery.isError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Failed to load replay events</p>
              <p className="text-xs text-muted-foreground mt-1">
                {eventsQuery.error?.message || "An unexpected error occurred"}
              </p>
              <button
                onClick={() => eventsQuery.refetch()}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Try again
              </button>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No events recorded for this task</p>
              <p className="text-xs text-muted-foreground mt-1">
                Events are recorded during task execution with the agent
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Events", value: stepSummary.totalEvents, icon: Zap },
                { label: "Tool Calls", value: stepSummary.toolCalls, icon: Terminal },
                { label: "Text Chunks", value: stepSummary.textChunks, icon: MessageSquare },
                { label: "Duration", value: `${stepSummary.duration}s`, icon: Clock },
              ].map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="py-3 px-3 flex items-center gap-2">
                    <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Playback Controls */}
            <Card className="mb-4">
              <CardContent className="py-3">
                {/* Progress bar */}
                <div className="mb-3">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(events.length - 1, 0)}
                    value={currentIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setCurrentIndex(idx);
                      setIsPlaying(false);
                    }}
                    className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                    aria-label="Timeline scrubber"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>{currentTime}</span>
                    <span>Step {currentIndex + 1} / {events.length}</span>
                    <span>{totalTime}</span>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRestart} title="Restart">
                    <SkipBack className="w-3.5 h-3.5" />
                  </Button>
                  {isPlaying ? (
                    <Button size="icon" className="h-9 w-9" onClick={handlePause} title="Pause">
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button size="icon" className="h-9 w-9" onClick={handlePlay} title="Play">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleSkipForward} title="Skip +10">
                    <SkipForward className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex items-center gap-1 ml-4">
                    {[0.5, 1, 2, 4].map((speed) => (
                      <Button
                        key={speed}
                        variant={playbackSpeed === speed ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setPlaybackSpeed(speed)}
                      >
                        {speed}x
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Event Timeline — Rich Cards */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Step-by-Step Timeline
              </h3>
              {events.map((event, i) => (
                <div key={event.id} ref={i === currentIndex ? activeCardRef : undefined}>
                  <EventCard
                    event={event}
                    index={i}
                    isActive={i === currentIndex}
                    onClick={() => {
                      setCurrentIndex(i);
                      setIsPlaying(false);
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
