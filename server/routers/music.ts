/**
 * Music Router — AI music generation and management
 * 
 * Uses LLM to generate music descriptions/compositions,
 * manages music library with metadata.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

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
  createdAt: number;
}

const musicLibrary = new Map<string, MusicTrack>();

export const musicRouter = router({
  /** Generate a new music track */
  generate: protectedProcedure
    .input(z.object({
      prompt: z.string().min(3).max(500),
      genre: z.string().max(10000).default("ambient"),
      mood: z.string().max(10000).default("calm"),
      duration: z.number().min(15).max(300).default(60),
      instruments: z.array(z.string().max(10000)).optional(),
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
1. A creative title
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
          musicLibrary.set(id, track);
        } catch (err) {
          track.status = "error";
          track.composition = `Generation failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          musicLibrary.set(id, track);
        }
      })();

      return { id, status: "generating" };
    }),

  /** Get a specific track */
  get: protectedProcedure
    .input(z.object({ id: z.string().max(500) }))
    .query(({ input }) => {
      return musicLibrary.get(input.id) || null;
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
    .input(z.object({ id: z.string().max(500) }))
    .mutation(async ({ ctx, input }) => {
      const track = musicLibrary.get(input.id);
      if (!track || track.userId !== ctx.user.id) {
        throw new Error("Track not found");
      }
      await Promise.resolve(musicLibrary.delete(input.id));
      return { success: true };
    }),
});
