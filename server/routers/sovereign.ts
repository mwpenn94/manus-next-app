/**
 * Sovereign Router — tRPC procedures for multi-provider routing and management
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as sovereign from "../services/sovereign";
import * as db from "../db";

export const sovereignRouter = router({
  /** Route a request through the Sovereign layer (provider selection + execution) */
  route: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.string(),
        content: z.string(),
      })),
      requiredCapabilities: z.array(z.string()).optional(),
      maxCost: z.number().optional(),
      preferredProvider: z.string().optional(),
      taskType: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return sovereign.routeRequest({
        ...input,
        userId: ctx.user.id,
      });
    }),

  /** Get routing statistics */
  stats: protectedProcedure
    .query(async ({ ctx }) => {
      return sovereign.getRoutingStats(ctx.user.id);
    }),

  /** Get circuit breaker status (admin/debug) */
  circuitStatus: protectedProcedure
    .query(async () => {
      return sovereign.getCircuitBreakerStatus();
    }),

  /** List active providers */
  providers: protectedProcedure
    .query(async () => {
      return db.getActiveProviders();
    }),

  /** Seed default providers */
  seedProviders: protectedProcedure
    .mutation(async () => {
      await sovereign.seedDefaultProviders();
      return { success: true };
    }),

  /** Get usage stats for a specific provider */
  providerUsage: protectedProcedure
    .input(z.object({
      providerId: z.number(),
      days: z.number().min(1).max(365).default(7),
    }))
    .query(async ({ input }) => {
      return db.getProviderUsageStats(input.providerId, input.days);
    }),
});
