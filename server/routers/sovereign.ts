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

  /** Recent routing decisions for transparency */
  recentDecisions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      return db.getRecentRoutingDecisions(input?.limit ?? 20);
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

  /** Multi-model compare — run the same prompt through multiple providers in parallel */
  compare: protectedProcedure
    .input(z.object({
      prompt: z.string().min(1).max(10000),
      providers: z.array(z.string()).min(1).max(5),
      systemPrompt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const messages = [
        ...(input.systemPrompt ? [{ role: "system" as const, content: input.systemPrompt }] : []),
        { role: "user" as const, content: input.prompt },
      ];

      const results = await Promise.allSettled(
        input.providers.map(async (provider) => {
          const start = Date.now();
          try {
            const result = await sovereign.routeRequest({
              messages,
              preferredProvider: provider,
              userId: ctx.user.id,
            });
            return {
              provider: result.provider,
              model: result.model,
              output: result.output,
              latencyMs: result.latencyMs,
              cost: result.cost,
              status: "success" as const,
            };
          } catch (err: unknown) {
            return {
              provider,
              model: "unknown",
              output: "",
              latencyMs: Date.now() - start,
              cost: 0,
              status: "error" as const,
              error: err instanceof Error ? err.message : "Unknown error",
            };
          }
        })
      );

      return results.map((r) =>
        r.status === "fulfilled" ? r.value : {
          provider: "unknown",
          model: "unknown",
          output: "",
          latencyMs: 0,
          cost: 0,
          status: "error" as const,
          error: r.reason?.message ?? "Promise rejected",
        }
      );
    }),
});
