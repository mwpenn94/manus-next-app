/**
 * ATLAS Router — tRPC procedures for goal decomposition and execution
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as atlas from "../services/atlas";
import * as db from "../db";

export const atlasRouter = router({
  /** Decompose a goal into a plan of sub-tasks */
  decompose: protectedProcedure
    .input(z.object({
      description: z.string().min(1).max(10000),
      constraints: z.string().max(5000).optional(),
      maxBudget: z.number().min(1).max(100000).optional(),
      maxTasks: z.number().min(1).max(20).optional(),
      priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return atlas.decomposeGoal(input, ctx.user.id);
    }),

  /** Execute a decomposed goal plan */
  execute: protectedProcedure
    .input(z.object({
      goalId: z.number(),
      maxBudget: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return atlas.executeGoal(input.goalId, ctx.user.id, input.maxBudget);
    }),

  /** Get status of a goal by external ID */
  getGoal: protectedProcedure
    .input(z.object({ externalId: z.string().max(500) }))
    .query(async ({ ctx, input }) => {
      const result = await atlas.getGoalStatus(input.externalId, ctx.user.id);
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });
      return result;
    }),

  /** List user's goals */
  listGoals: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).optional(),
      status: z.string().max(1000).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserGoals(ctx.user.id, { limit: input?.limit, status: input?.status });
    }),
});
