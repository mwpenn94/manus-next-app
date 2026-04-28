/**
 * MusicStudioPage — AI music generation interface.
 * Matches Manus music-gen capability: prompt-based music creation.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Music,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
  Clock,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MusicTrack {
  id: string;
  title: string;
  prompt: string;
  genre: string;
  duration: string;
  url?: string;
  status: "generating" | "ready" | "error";
  createdAt: string;
}

const GENRE_PRESETS = [
  "Ambient", "Electronic", "Lo-fi", "Cinematic", "Jazz",
  "Classical", "Rock", "Hip-Hop", "World", "Experimental",
];

export default function MusicStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("Ambient");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const generateMutation = trpc.music.generate.useMutation({
    onSuccess: (data) => {
      setPollingId(data.id);
      toast.info("Generating music composition...");
    },
    onError: (err) => { toast.error(`Generation failed: ${err.message}`); },
  });

  // Poll for track status
  const trackQuery = trpc.music.get.useQuery(
    { id: pollingId! },
    {
      enabled: !!pollingId,
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === "ready" || data?.status === "error") return false;
        return 2000;
      },
    }
  );

  useEffect(() => {
    if (!trackQuery.data) return;
    const d = trackQuery.data;
    if (d.status === "ready" || d.status === "error") {
      setPollingId(null);
      const updated: MusicTrack = {
        id: d.id,
        title: d.title || `${d.genre} Track`,
        prompt: d.prompt,
        genre: d.genre,
        duration: `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}`,
        status: d.status,
        createdAt: new Date(d.createdAt).toISOString(),
      };
      setTracks(prev => {
        const exists = prev.find(t => t.id === d.id);
        if (exists) return prev.map(t => t.id === d.id ? updated : t);
        return [updated, ...prev];
      });
      if (d.status === "ready") toast.success("Music composition generated");
      else toast.error("Generation failed");
    }
  }, [trackQuery.data]);

  const handleGenerate = () => {
    if (!prompt.trim()) return;

    const placeholder: MusicTrack = {
      id: `pending-${Date.now()}`,
      title: title || `${genre} Track`,
      prompt,
      genre,
      duration: "0:00",
      status: "generating",
      createdAt: new Date().toISOString(),
    };
    setTracks(prev => [placeholder, ...prev]);

    generateMutation.mutate({
      prompt,
      genre: genre.toLowerCase(),
      mood: "creative",
      duration: 60,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1
              className="text-2xl font-semibold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Music Studio
            </h1>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary uppercase tracking-wider">
              beta
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate original music tracks from text descriptions
          </p>
        </div>

        {/* Generation Form */}
        <Card className="mb-6">
          <CardContent className="p-6 space-y-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Track title (optional)"
            />

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want... e.g., 'A calm ambient track with soft piano, gentle strings, and rain sounds. Slow tempo, perfect for deep focus work.'"
              rows={3}
              className="resize-none"
            />

            {/* Genre Presets */}
            <div className="flex flex-wrap gap-1.5">
              {GENRE_PRESETS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs transition-colors",
                    genre === g
                      ? "bg-primary/15 text-primary font-medium"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || generateMutation.isPending || !!pollingId}
                className="gap-1.5"
              >
                {generateMutation.isPending || !!pollingId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Track
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Track List */}
        {tracks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              Generated Tracks
            </h2>
            {tracks.map((track) => (
              <Card key={track.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Play Button */}
                    <button
                      onClick={() => {
                        if (track.status !== "ready") return;
                        // Find the audio element for this track and toggle play/pause
                        const audioEl = document.querySelector(`audio[src="${track.url}"]`) as HTMLAudioElement | null;
                        if (audioEl) {
                          if (playingId === track.id) {
                            audioEl.pause();
                          } else {
                            audioEl.play().catch(() => {});
                          }
                        }
                        setPlayingId(playingId === track.id ? null : track.id);
                      }}
                      disabled={track.status !== "ready"}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
                        track.status === "ready"
                          ? "bg-primary/15 text-primary hover:bg-primary/25"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {track.status === "generating" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : playingId === track.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.prompt.slice(0, 60)}
                        {track.prompt.length > 60 ? "..." : ""}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                        {track.genre}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {track.duration}
                      </span>
                      {track.status === "ready" && track.url && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            if (track.url) {
                              const a = document.createElement("a");
                              a.href = track.url;
                              a.download = `${track.title}.mp3`;
                              a.click();
                            }
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Audio Player with Waveform Visualization */}
                  {track.status === "ready" && (
                    <div className="mt-3">
                      {track.url ? (
                        <audio
                          controls
                          className="w-full h-8 [&::-webkit-media-controls-panel]:bg-card [&::-webkit-media-controls-current-time-display]:text-xs [&::-webkit-media-controls-time-remaining-display]:text-xs"
                          src={track.url}
                          onPlay={() => setPlayingId(track.id)}
                          onPause={() => setPlayingId(null)}
                          onEnded={() => setPlayingId(null)}
                        />
                      ) : null}
                      {/* Animated waveform bars */}
                      <div className="flex items-end gap-[2px] h-8 mt-2">
                        {Array.from({ length: 48 }).map((_, i) => {
                          const h = 15 + Math.sin(i * 0.5) * 40 + Math.cos(i * 0.3) * 25;
                          return (
                            <div
                              key={i}
                              className={cn(
                                "w-[3px] rounded-full transition-all duration-300",
                                playingId === track.id
                                  ? "bg-primary"
                                  : "bg-primary/20"
                              )}
                              style={{
                                height: playingId === track.id
                                  ? `${Math.max(10, h + Math.sin(Date.now() / 200 + i) * 15)}%`
                                  : `${h}%`,
                                animationDelay: `${i * 30}ms`,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Music className="w-7 h-7 text-primary" />
            </div>
            <h3
              className="text-lg font-semibold text-foreground mb-1.5"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Create Original Music
            </h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Describe the mood, genre, instruments, and style you want.
              The AI will generate a unique music track for you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
