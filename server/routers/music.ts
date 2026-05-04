/**
 * Music Router — AI music generation and management
 * 
 * Uses LLM to generate music compositions with structured descriptions.
 * Attempts audio generation via the built-in Forge API (speech synthesis
 * with musical prompt as fallback). If audio generation is unavailable,
 * returns the composition text with audioUrl: null (degraded delivery).
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

interface MusicTrack {
  id: string;
  userId: number;
  title: string;
  prompt: string;
  genre: string;
  mood: string;
  duration: number;
  status: "generating" | "ready" | "error";
  composition: string; // LLM-generated musical description/notation
  audioUrl: string | null; // URL to generated audio (null if degraded delivery)
  audioStatus: "pending" | "generating" | "ready" | "unavailable";
  createdAt: number;
}

const musicLibrary = new Map<string, MusicTrack>();

/**
 * Attempt to generate audio via built-in TTS/audio API.
 * Returns a URL if successful, null if the service is unavailable.
 */
async function attemptAudioGeneration(
  composition: string,
  _genre: string,
  _mood: string,
  _duration: number
): Promise<string | null> {
  try {
    const forgeUrl = ENV.forgeApiUrl;
    const forgeKey = ENV.forgeApiKey;
    if (!forgeUrl || !forgeKey) return null;

    // Try the forge audio/speech endpoint for a spoken composition
    const response = await fetch(`${forgeUrl}/v1/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${forgeKey}`,
      },
      body: JSON.stringify({
        model: "tts-1",
        input: composition.slice(0, 4096),
        voice: "alloy",
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return null;

    // Upload the audio to S3
    const audioBuffer = Buffer.from(await response.arrayBuffer());
    if (audioBuffer.length < 1000) return null; // Too small, likely error

    const { storagePut } = await import("../storage");
    const suffix = Math.random().toString(36).slice(2, 8);
    const key = `music/generated-${suffix}.mp3`;
    const { url } = await storagePut(key, audioBuffer, "audio/mpeg");
    return url;
  } catch {
    return null;
  }
}

export const musicRouter = router({
  /** Generate a new music track */
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(3).max(500),
      genre: z.string().default("ambient"),
      mood: z.string().default("calm"),
      duration: z.number().min(15).max(300).default(60),
      instruments: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = `track-${ctx.user.id}-${Date.now()}`;
      const track: MusicTrack = {
        id,
        userId: ctx.user.id,
        title: "",
        prompt: input.prompt,
        genre: input.genre,
        mood: input.mood,
        duration: input.duration,
        status: "generating",
        composition: "",
        audioUrl: null,
        audioStatus: "pending",
        createdAt: Date.now(),
      };
      musicLibrary.set(id, track);

      // Generate asynchronously
      (async () => {
        try {
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a music composer AI. Generate a detailed musical composition description based on the user's request. Include:
1. A creative title (on the first line as a markdown heading)
2. Tempo (BPM)
3. Key signature
4. Time signature
5. Detailed section-by-section breakdown (intro, verse, chorus, bridge, outro)
6. Instrumentation details
7. Dynamic markings
8. Mood progression

Format as structured markdown. Be specific about musical elements.`,
              },
              {
                role: "user",
                content: `Create a ${input.duration}-second ${input.genre} track with a ${input.mood} mood.${input.instruments?.length ? ` Instruments: ${input.instruments.join(", ")}` : ""}\n\nDescription: ${input.prompt}`,
              },
            ],
          });

          const composition = String(response.choices[0].message.content || "");
          // Extract title from first line
          const titleMatch = composition.match(/^#\s*(.+)/m) || composition.match(/Title:\s*(.+)/i);
          track.title = titleMatch ? titleMatch[1].trim() : `${input.genre} - ${input.mood}`;
          track.composition = composition;
          track.status = "ready";

          // Attempt audio generation (non-blocking for the composition result)
          track.audioStatus = "generating";
          musicLibrary.set(id, { ...track });

          const audioUrl = await attemptAudioGeneration(
            composition,
            input.genre,
            input.mood,
            input.duration
          );

          track.audioUrl = audioUrl;
          track.audioStatus = audioUrl ? "ready" : "unavailable";
          musicLibrary.set(id, { ...track });
        } catch (err) {
          track.status = "error";
          track.composition = `Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          track.audioStatus = "unavailable";
          musicLibrary.set(id, { ...track });
        }
      })();

      return { id, status: "generating" };
    }),

  /** Get a specific track */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      const track = musicLibrary.get(input.id);
      if (!track || track.userId !== ctx.user.id) return null;
      return track;
    }),

  /** List all tracks for current user */
  list: protectedProcedure.query(({ ctx }) => {
    const tracks: MusicTrack[] = [];
    musicLibrary.forEach((track) => {
      if (track.userId === ctx.user.id) tracks.push(track);
    });
    return tracks.sort((a, b) => b.createdAt - a.createdAt);
  }),

  /** Delete a track */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const track = musicLibrary.get(input.id);
      if (!track || track.userId !== ctx.user.id) {
        throw new Error("Track not found");
      }
      await Promise.resolve(musicLibrary.delete(input.id));
      return { success: true };
    }),
});
