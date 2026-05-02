import { useState, useCallback, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Maximize2,
  Minimize2,
  Clock,
  Eye,
  Code,
  Globe,
  Terminal,
  MessageSquare,
  FileText,
  Image,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ReplayEventType = "message" | "tool_use" | "browser" | "code" | "file" | "terminal" | "image" | "thinking";

interface ReplayEvent {
  id: string;
  type: ReplayEventType;
  timestamp: number; // seconds from start
  duration: number; // seconds
  title: string;
  content: string;
  screenshot?: string;
}

const MOCK_EVENTS: ReplayEvent[] = [
  { id: "r1", type: "message", timestamp: 0, duration: 2, title: "User Request", content: "Build a responsive dashboard with real-time analytics charts" },
  { id: "r2", type: "thinking", timestamp: 2, duration: 3, title: "Planning", content: "Analyzing requirements: need recharts for charts, WebSocket for real-time data, responsive grid layout..." },
  { id: "r3", type: "terminal", timestamp: 5, duration: 4, title: "Install Dependencies", content: "$ pnpm add recharts\n$ pnpm add @tanstack/react-query" },
  { id: "r4", type: "code", timestamp: 9, duration: 8, title: "Create Dashboard Component", content: "Writing Dashboard.tsx with LineChart, BarChart, and PieChart components..." },
  { id: "r5", type: "code", timestamp: 17, duration: 5, title: "Create API Endpoints", content: "Adding tRPC procedures for analytics data fetching..." },
  { id: "r6", type: "file", timestamp: 22, duration: 2, title: "Update Routes", content: "Adding /dashboard route to App.tsx..." },
  { id: "r7", type: "browser", timestamp: 24, duration: 3, title: "Preview Dashboard", content: "Opening browser to verify layout and charts render correctly", screenshot: "https://placehold.co/800x450/0a0a1a/eee?text=Dashboard+Preview" },
  { id: "r8", type: "code", timestamp: 27, duration: 4, title: "Fix Responsive Layout", content: "Adjusting grid breakpoints for mobile and tablet views..." },
  { id: "r9", type: "terminal", timestamp: 31, duration: 3, title: "Run Tests", content: "$ pnpm test\n\nTests: 12 passed, 0 failed" },
  { id: "r10", type: "message", timestamp: 34, duration: 2, title: "Delivery", content: "Dashboard is ready with 3 chart types, responsive layout, and real-time data support." },
];

function getEventIcon(type: ReplayEventType): React.JSX.Element {
  switch (type) {
    case "message": return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
    case "tool_use": return <Code className="w-3.5 h-3.5 text-yellow-400" />;
    case "browser": return <Globe className="w-3.5 h-3.5 text-green-400" />;
    case "code": return <Code className="w-3.5 h-3.5 text-yellow-400" />;
    case "file": return <FileText className="w-3.5 h-3.5 text-purple-400" />;
    case "terminal": return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
    case "image": return <Image className="w-3.5 h-3.5 text-pink-400" />;
    case "thinking": return <Loader2 className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getEventColor(type: ReplayEventType): string {
  switch (type) {
    case "message": return "bg-blue-500";
    case "tool_use": return "bg-yellow-500";
    case "browser": return "bg-green-500";
    case "code": return "bg-yellow-500";
    case "file": return "bg-purple-500";
    case "terminal": return "bg-emerald-500";
    case "image": return "bg-pink-500";
    case "thinking": return "bg-muted-foreground";
  }
}

export default function TaskReplayViewer(): React.JSX.Element {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<string | null>("r1");
  const totalDuration = 36; // seconds
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + 0.1 * playbackSpeed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, 100);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Auto-select current event
  useEffect(() => {
    const current = MOCK_EVENTS.find(
      (e) => currentTime >= e.timestamp && currentTime < e.timestamp + e.duration
    );
    if (current) setSelectedEvent(current.id);
  }, [currentTime]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.max(0, Math.min(totalDuration, ratio * totalDuration)));
  }, []);

  const handleSkipBack = useCallback(() => {
    setCurrentTime((prev) => Math.max(0, prev - 5));
  }, []);

  const handleSkipForward = useCallback(() => {
    setCurrentTime((prev) => Math.min(totalDuration, prev + 5));
  }, []);

  const handleJumpToEvent = useCallback((event: ReplayEvent) => {
    setCurrentTime(event.timestamp);
    setSelectedEvent(event.id);
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const selected = MOCK_EVENTS.find((e) => e.id === selectedEvent);
  const progress = (currentTime / totalDuration) * 100;

  return (
    <div className="flex flex-col bg-background text-foreground rounded-xl border border-border overflow-hidden">
      {/* Main View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Event Timeline */}
        <div className="w-72 border-r border-border overflow-y-auto">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Events ({MOCK_EVENTS.length})
            </h3>
          </div>
          {MOCK_EVENTS.map((event) => {
            const isCurrent = currentTime >= event.timestamp && currentTime < event.timestamp + event.duration;
            const isPast = currentTime >= event.timestamp + event.duration;
            return (
              <button
                key={event.id}
                className={cn(
                  "w-full text-left px-4 py-2.5 border-b border-border/50 transition-colors",
                  isCurrent ? "bg-primary/5 border-l-2 border-l-primary" : isPast ? "opacity-60" : "",
                  selectedEvent === event.id && !isCurrent ? "bg-accent/20" : "hover:bg-accent/20"
                )}
                onClick={() => handleJumpToEvent(event)}
              >
                <div className="flex items-center gap-2">
                  {getEventIcon(event.type)}
                  <span className="text-xs font-medium truncate">{event.title}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto shrink-0">{formatTime(event.timestamp)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate ml-5.5">{event.content}</p>
              </button>
            );
          })}
        </div>

        {/* Content View */}
        <div className="flex-1 flex flex-col">
          {/* Preview Area */}
          <div className="flex-1 flex items-center justify-center p-6 bg-card/30">
            {selected ? (
              <div className="w-full max-w-2xl">
                <div className="flex items-center gap-2 mb-3">
                  {getEventIcon(selected.type)}
                  <h3 className="text-sm font-semibold">{selected.title}</h3>
                  <span className="text-[10px] text-muted-foreground">{formatTime(selected.timestamp)} - {formatTime(selected.timestamp + selected.duration)}</span>
                </div>
                {selected.screenshot ? (
                  <div className="rounded-lg overflow-hidden border border-border shadow-lg">
                    <img src={selected.screenshot} alt="" className="w-full" />
                  </div>
                ) : (
                  <div className="p-5 rounded-lg bg-[#0d1117] border border-border">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                      {selected.content}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Eye className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select an event to view details</p>
              </div>
            )}
          </div>

          {/* Timeline Scrubber */}
          <div className="border-t border-border bg-card/50 px-5 py-3">
            {/* Progress Bar */}
            <div
              className="relative h-6 mb-3 cursor-pointer group"
              onClick={handleSeek}
            >
              {/* Track */}
              <div className="absolute top-2.5 left-0 right-0 h-1 bg-muted rounded-full">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              {/* Event Markers */}
              {MOCK_EVENTS.map((event) => (
                <div
                  key={event.id}
                  className={cn(
                    "absolute top-1 h-4 rounded-sm opacity-40 hover:opacity-80 transition-opacity",
                    getEventColor(event.type)
                  )}
                  style={{
                    left: `${(event.timestamp / totalDuration) * 100}%`,
                    width: `${Math.max(0.5, (event.duration / totalDuration) * 100)}%`,
                  }}
                  title={event.title}
                />
              ))}
              {/* Playhead */}
              <div
                className="absolute top-0.5 w-3 h-5 bg-primary rounded-sm shadow-md -translate-x-1/2 transition-all"
                style={{ left: `${progress}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button onClick={handleSkipBack} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <Rewind className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={handleSkipForward} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors">
                  <FastForward className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-mono text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                  {[0.5, 1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] rounded-md transition-colors",
                        playbackSpeed === speed ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
                      )}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
