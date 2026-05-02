import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserPersonalizationPreferences,
  upsertPersonalizationPreference,
  deletePersonalizationPreference,
  resetPersonalizationPreferences,
  getUserPersonalizationRules,
  createPersonalizationRule,
  togglePersonalizationRule,
  deletePersonalizationRule,
  getUserLearningLog,
  addLearningLogEntry,
} from "../db";

export const personalizationRouter = router({
  // ── Preferences ──
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return getUserPersonalizationPreferences(ctx.user.id);
  }),

  upsertPreference: protectedProcedure
    .input(z.object({
      category: z.string().min(1).max(64),
      label: z.string().min(1).max(256),
      value: z.number().min(0).max(100).default(50),
      confidence: z.number().min(0).max(100).default(50),
      source: z.enum(["explicit", "inferred", "default"]).default("explicit"),
      active: z.number().min(0).max(1).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await upsertPersonalizationPreference({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  deletePreference: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePersonalizationPreference(input.id, ctx.user.id);
      return { success: true };
    }),

  resetPreferences: protectedProcedure
    .mutation(async ({ ctx }) => {
      await resetPersonalizationPreferences(ctx.user.id);
      return { success: true };
    }),

  // ── Rules ──
  getRules: protectedProcedure.query(async ({ ctx }) => {
    return getUserPersonalizationRules(ctx.user.id);
  }),

  createRule: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      condition: z.string().min(1),
      action: z.string().min(1),
      impact: z.string().default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createPersonalizationRule({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  toggleRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      active: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      await togglePersonalizationRule(input.id, ctx.user.id, input.active);
      return { success: true };
    }),

  deleteRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deletePersonalizationRule(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Learning Log ──
  getLearningLog: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      return getUserLearningLog(ctx.user.id, input?.limit ?? 50);
    }),

  addLearningEntry: protectedProcedure
    .input(z.object({
      eventType: z.enum(["preference_learned", "pattern_detected", "adaptation_applied", "feedback_received"]),
      description: z.string().min(1),
      confidence: z.number().min(0).max(100).default(50),
      preferenceId: z.number().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await addLearningLogEntry({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),
});
