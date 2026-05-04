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
      recursiveOptimizationEnabled: false,
      recursiveOptimizationDepth: 3,
      recursiveOptimizationTemperature: 'balanced',
    };
  }),

  save: protectedProcedure
    .input(z.object({
      generalSettings: z.record(z.string(), z.unknown()).optional(),
      capabilities: z.record(z.string(), z.boolean()).optional(),
      systemPrompt: z.string().nullable().optional(),
      recursiveOptimizationEnabled: z.boolean().optional(),
      recursiveOptimizationDepth: z.number().min(1).max(1280).optional(),
      recursiveOptimizationTemperature: z.enum(['conservative', 'balanced', 'exploratory']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return upsertUserPreferences({
        userId: ctx.user.id,
        generalSettings: input.generalSettings ?? undefined,
        capabilities: input.capabilities ?? undefined,
        systemPrompt: input.systemPrompt !== undefined ? input.systemPrompt : undefined,
        recursiveOptimizationEnabled: input.recursiveOptimizationEnabled,
        recursiveOptimizationDepth: input.recursiveOptimizationDepth,
        recursiveOptimizationTemperature: input.recursiveOptimizationTemperature,
      });
    }),
});
