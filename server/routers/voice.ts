import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

export const voiceRouter = router({
    transcribe: protectedProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { transcribeAudio } = await import("../_core/voiceTranscription");
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: input.prompt,
        });
        if ("error" in result) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return { text: result.text, language: result.language };
      }),

    /** Synthesize text to speech using Edge TTS */
    synthesize: protectedProcedure
      .input(z.object({
        text: z.string().min(1).max(10000),
        voice: z.string().optional(),
        rate: z.string().optional(),
        pitch: z.string().optional(),
        volume: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { synthesizeSpeech } = await import("../tts");
        const audioBuffer = await synthesizeSpeech({
          text: input.text,
          voice: input.voice,
          rate: input.rate,
          pitch: input.pitch,
          volume: input.volume,
        });
        // Return base64-encoded MP3 audio
        return {
          audio: audioBuffer.toString("base64"),
          mimeType: "audio/mpeg",
          size: audioBuffer.length,
        };
      }),

    /** List available TTS voices, optionally filtered by language */
    listVoices: protectedProcedure
      .input(z.object({
        language: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const { getVoicesByLanguage } = await import("../tts");
        return getVoicesByLanguage(input?.language);
      }),

    /** List available TTS languages with voice counts */
    listLanguages: protectedProcedure
      .query(async () => {
        const { getAvailableLanguages } = await import("../tts");
        return getAvailableLanguages();
      }),
  });
