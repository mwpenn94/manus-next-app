/**
 * AEGIS Router — tRPC procedures for the AEGIS pre/post-flight pipeline
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as aegis from "../services/aegis";
import * as db from "../db";

export const aegisRouter = router({
  /** Run pre-flight analysis on a prompt (classify, cache check, optimize) */
  preFlight: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(50000),
      taskExternalId: z.string().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await aegis.runPreFlight(input.prompt, ctx.user.id, input.taskExternalId);
      return result;
    }),

  /** Run post-flight analysis on LLM output (quality score, fragments, lessons) */
  postFlight: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      output: z.string().max(10000),
      taskType: z.string().max(1000),
      costCredits: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const result = await aegis.runPostFlight(input.sessionId, input.output, input.taskType, input.costCredits);
      return result;
    }),

  /** Classify a prompt without running the full pipeline */
  classify: protectedProcedure
    .input(z.object({ prompt: z.string().min(1) }))
    .query(async ({ input }) => {
      return aegis.classifyTask(input.prompt);
    }),

  /** Check if a prompt is cached */
  checkCache: protectedProcedure
    .input(z.object({ prompt: z.string().min(1) }))
    .query(async ({ input }) => {
      return aegis.checkCache(input.prompt);
    }),

  /** Get AEGIS session statistics for the current user */
  stats: protectedProcedure
    .input(z.object({ days: z.number().min(1).max(365).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return db.getAegisSessionStats(ctx.user.id, input?.days ?? 30);
    }),
});
