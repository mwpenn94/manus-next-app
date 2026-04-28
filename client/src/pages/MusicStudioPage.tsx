/**
 * MusicStudioPage — AI music generation interface.
 * Matches Manus music-gen capability: prompt-based music creation.
 */
import { useState } from "react";
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
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    const newTrack: MusicTrack = {
      id: Date.now().toString(),
      title: title || `${genre} Track`,
      prompt,
      genre,
      duration: "0:30",
      status: "generating",
      createdAt: new Date().toISOString(),
    };

    setTracks((prev) => [newTrack, ...prev]);

    // Simulate generation (in production, this would call the music generation API)
    setTimeout(() => {
      setTracks((prev) =>
        prev.map((t) =>
          t.id === newTrack.id
            ? { ...t, status: "ready" as const, duration: "0:30" }
            : t
        )
      );
      setIsGenerating(false);
      toast.success("Music track generated");
    }, 5000);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
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
                disabled={!prompt.trim() || isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
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
                        setPlayingId(playingId === track.id ? null : track.id);
                        toast.info(
                          playingId === track.id
                            ? "Playback paused"
                            : "Music playback requires deployed audio — feature coming soon"
                        );
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

                  {/* Waveform visualization (decorative) */}
                  {track.status === "ready" && (
                    <div className="mt-3 flex items-center gap-0.5 h-6">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 rounded-full transition-all",
                            playingId === track.id
                              ? "bg-primary animate-pulse"
                              : "bg-primary/20"
                          )}
                          style={{
                            height: `${Math.random() * 100}%`,
                            minHeight: "2px",
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
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
