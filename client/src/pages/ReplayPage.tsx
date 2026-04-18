import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRoute } from "wouter";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Film,
  Loader2,
  Clock,
  ChevronLeft,
} from "lucide-react";
import { useLocation } from "wouter";

export default function ReplayPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, params] = useRoute("/replay/:taskId");
  const [, navigate] = useLocation();
  const taskId = params?.taskId ? Number(params.taskId) : null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eventsQuery = trpc.replay.events.useQuery(
    { taskId: taskId! },
    { enabled: !!taskId && isAuthenticated }
  );

  const events = eventsQuery.data ?? [];

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

  if (!taskId) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2 mb-2">
            <Film className="w-6 h-6" />
            Session Replay
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Replay recorded task sessions to review agent actions step by step.
            Navigate to a specific task and click "Replay" to start.
          </p>
          <Card>
            <CardContent className="py-12 text-center">
              <Film className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">Select a task to replay</p>
              <p className="text-xs text-muted-foreground mt-1">
                Session events are recorded during task execution
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentEvent = events[currentIndex];
  const progress = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0;
  const currentTime = currentEvent ? `${(currentEvent.offsetMs / 1000).toFixed(1)}s` : "0s";
  const totalTime = events.length > 0 ? `${(events[events.length - 1].offsetMs / 1000).toFixed(1)}s` : "0s";

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
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
            {/* Current Event Display */}
            <Card className="mb-4">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                    {currentEvent?.eventType ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {currentTime}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Event {currentIndex + 1} of {events.length}
                  </span>
                </div>
                <pre className="text-sm text-foreground bg-muted/50 rounded p-3 overflow-x-auto max-h-64 whitespace-pre-wrap font-mono">
                  {currentEvent
                    ? (() => {
                        try {
                          return JSON.stringify(JSON.parse(currentEvent.payload), null, 2);
                        } catch {
                          return currentEvent.payload;
                        }
                      })()
                    : "No event selected"}
                </pre>
              </CardContent>
            </Card>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{currentTime}</span>
                <span>{totalTime}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={handleRestart} title="Restart">
                <SkipBack className="w-4 h-4" />
              </Button>
              {isPlaying ? (
                <Button size="icon" onClick={handlePause} title="Pause">
                  <Pause className="w-4 h-4" />
                </Button>
              ) : (
                <Button size="icon" onClick={handlePlay} title="Play">
                  <Play className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={handleSkipForward} title="Skip +10">
                <SkipForward className="w-4 h-4" />
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

            {/* Event Timeline */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Event Timeline</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {events.map((event, i) => (
                  <button
                    key={event.id}
                    onClick={() => {
                      setCurrentIndex(i);
                      setIsPlaying(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                      i === currentIndex
                        ? "bg-primary/10 text-primary"
                        : i < currentIndex
                        ? "text-muted-foreground hover:bg-muted/50"
                        : "text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-mono mr-2">
                      {(event.offsetMs / 1000).toFixed(1)}s
                    </span>
                    <span className="font-medium">{event.eventType}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
