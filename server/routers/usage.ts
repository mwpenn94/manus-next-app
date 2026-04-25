import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getStrategyStats, getTaskPerformance, getTaskTrends, getUserTaskStats } from "../db";
import { tasks } from "../../drizzle/schema";

export const usageRouter = router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      return getUserTaskStats(ctx.user.id);
    }),
    /** Task activity over the last N days — returns array of { date, count, completed, errors } */
    taskTrends: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getTaskTrends(ctx.user.id, input?.days ?? 30);
      }),
    /** Average task duration (completed tasks only) and average messages per task */
    performance: protectedProcedure.query(async ({ ctx }) => {
      return getTaskPerformance(ctx.user.id);
    }),
    /** Agent self-correction strategy telemetry — success rates by strategy and trigger pattern */
    strategyStats: protectedProcedure.query(async ({ ctx }) => {
      return getStrategyStats(ctx.user.id);
    }),
  });
