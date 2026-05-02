import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Clock,
  Eye,
  Code,
  Globe,
  Terminal,
  MessageSquare,
  FileText,
  Image,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function getEventIcon(type: string): React.JSX.Element {
  switch (type) {
    case "message": return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
    case "tool_use": return <Code className="w-3.5 h-3.5 text-yellow-400" />;
    case "browser": return <Globe className="w-3.5 h-3.5 text-green-400" />;
    case "code": return <Code className="w-3.5 h-3.5 text-yellow-400" />;
    case "file": return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    case "terminal": return <Terminal className="w-3.5 h-3.5 text-cyan-400" />;
    case "image": return <Image className="w-3.5 h-3.5 text-pink-400" />;
    default: return <Eye className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface TaskReplayViewerProps {
  taskId?: number;
}

export default function TaskReplayViewer({ taskId }: TaskReplayViewerProps): React.JSX.Element {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(taskId ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeEventIdx, setActiveEventIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: sessions = [], isLoading: loadingSessions } = trpc.replay.sessions.useQuery();
  const { data: events = [], isLoading: loadingEvents } = trpc.replay.events.useQuery(
    { taskId: selectedTaskId! },
    { enabled: !!selectedTaskId }
  );

  const totalDuration = events.length > 0
    ? Math.max(...events.map((e: any) => (e.offsetMs ?? 0))) + 2000
    : 0;

  // Playback timer
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      timerRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 100 * playbackSpeed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDuration, events.length]);

  // Track active event
  useEffect(() => {
    if (events.length === 0) return;
    let idx = 0;
    for (let i = 0; i < events.length; i++) {
      if ((events[i] as any).offsetMs <= currentTime) idx = i;
    }
    setActiveEventIdx(idx);
  }, [currentTime, events]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setCurrentTime(pct * totalDuration);
  }, [totalDuration]);

  const jumpToEvent = (idx: number) => {
    if (events[idx]) {
      setCurrentTime((events[idx] as any).offsetMs);
      setActiveEventIdx(idx);
    }
  };

  const activeEvent = events[activeEventIdx] as any;

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Play className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Task Replay</h2>
            <p className="text-xs text-muted-foreground">
              {sessions.length} replayable sessions · {events.length} events
            </p>
          </div>
        </div>
        {sessions.length > 0 && (
          <Select
            value={selectedTaskId?.toString() ?? ""}
            onValueChange={(v) => {
              setSelectedTaskId(Number(v));
              setCurrentTime(0);
              setIsPlaying(false);
              setActiveEventIdx(0);
            }}
          >
            <SelectTrigger className="w-56 h-8 text-xs">
              <SelectValue placeholder="Select a task session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s: any) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.title || `Task #${s.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Loading / Empty */}
      {(loadingSessions || loadingEvents) && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loadingSessions && !selectedTaskId && sessions.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Play className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No replay sessions available yet.</p>
            <p className="text-xs mt-1">Complete tasks to generate replay data.</p>
          </div>
        </div>
      )}

      {/* Replay Content */}
      {selectedTaskId && events.length > 0 && !loadingEvents && (
        <>
          <div className="flex flex-1 overflow-hidden">
            {/* Event Timeline */}
            <div className="w-72 border-r border-border overflow-y-auto">
              {events.map((event: any, idx: number) => (
                <button
                  key={event.id ?? idx}
                  className={cn(
                    "w-full text-left px-4 py-2.5 border-b border-border/50 transition-colors",
                    idx === activeEventIdx ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-accent/30"
                  )}
                  onClick={() => jumpToEvent(idx)}
                >
                  <div className="flex items-center gap-2">
                    {getEventIcon(event.eventType)}
                    <span className="text-xs font-medium truncate flex-1">{event.eventType}</span>
                    <span className="text-[9px] text-muted-foreground">{formatTime(event.offsetMs)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Event Detail */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeEvent && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    {getEventIcon(activeEvent.eventType)}
                    <h3 className="text-sm font-semibold">{activeEvent.eventType}</h3>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(activeEvent.offsetMs)}
                    </span>
                  </div>
                  <div className="p-4 rounded-lg bg-card border border-border">
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {typeof activeEvent.payload === "string"
                        ? (() => { try { return JSON.stringify(JSON.parse(activeEvent.payload), null, 2); } catch { return activeEvent.payload; } })()
                        : JSON.stringify(activeEvent.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="px-5 py-3 border-t border-border bg-card/50">
            {/* Progress Bar */}
            <div
              className="w-full h-2 rounded-full bg-muted mb-3 cursor-pointer relative"
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%` }}
              />
              {/* Event markers */}
              {events.map((event: any, idx: number) => (
                <div
                  key={idx}
                  className="absolute top-0 w-1 h-2 bg-foreground/30 rounded-full"
                  style={{ left: `${totalDuration > 0 ? (event.offsetMs / totalDuration) * 100 : 0}%` }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => jumpToEvent(Math.max(0, activeEventIdx - 1))}>
                  <SkipBack className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => jumpToEvent(Math.min(events.length - 1, activeEventIdx + 1))}>
                  <SkipForward className="w-3.5 h-3.5" />
                </Button>
              </div>

              <span className="text-xs text-muted-foreground font-mono">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              <div className="flex items-center gap-1">
                {[0.5, 1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={cn(
                      "px-2 py-0.5 text-[10px] rounded transition-colors",
                      playbackSpeed === speed ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
