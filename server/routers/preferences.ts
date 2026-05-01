import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getUserPreferences, upsertUserPreferences } from "../db";

export const preferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const prefs = await getUserPreferences(ctx.user.id);
    return prefs ?? {
      generalSettings: { notifications: true, soundEffects: false, autoExpandActions: true, compactMode: false, theme: 'dark' },
      capabilities: {},
      systemPrompt: null,
    };
  }),

  save: protectedProcedure
    .input(z.object({
      generalSettings: z.record(z.string().max(10000), z.unknown()).optional(),
      capabilities: z.record(z.string().max(10000), z.boolean()).optional(),
      systemPrompt: z.string().max(50000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertUserPreferences({
        userId: ctx.user.id,
        generalSettings: input.generalSettings ?? undefined,
        capabilities: input.capabilities ?? undefined,
        systemPrompt: input.systemPrompt !== undefined ? input.systemPrompt : undefined,
      });
    }),
});
