import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getUserProcessMetrics,
  upsertProcessMetric,
  deleteProcessMetric,
  getUserImprovementInitiatives,
  createImprovementInitiative,
  updateImprovementInitiative,
  deleteImprovementInitiative,
  getUserOptimizationCycles,
  createOptimizationCycle,
  updateOptimizationCycle,
} from "../db";

export const processImprovementRouter = router({
  // ── Metrics ──
  getMetrics: protectedProcedure.query(async ({ ctx }) => {
    return getUserProcessMetrics(ctx.user.id);
  }),

  upsertMetric: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      currentValue: z.number().default(0),
      previousValue: z.number().default(0),
      targetValue: z.number().default(100),
      unit: z.string().max(32).default("%"),
      category: z.string().max(64).default("performance"),
      history: z.array(z.object({ timestamp: z.string(), value: z.number() })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await upsertProcessMetric({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  deleteMetric: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteProcessMetric(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Initiatives ──
  getInitiatives: protectedProcedure.query(async ({ ctx }) => {
    return getUserImprovementInitiatives(ctx.user.id);
  }),

  createInitiative: protectedProcedure
    .input(z.object({
      title: z.string().min(1).max(256),
      description: z.string().optional(),
      status: z.enum(["proposed", "in_progress", "completed", "on_hold"]).default("proposed"),
      impactScore: z.number().min(0).max(100).default(50),
      owner: z.string().max(128).optional(),
      linkedMetricIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createImprovementInitiative({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  updateInitiative: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(256).optional(),
      description: z.string().optional(),
      status: z.enum(["proposed", "in_progress", "completed", "on_hold"]).optional(),
      impactScore: z.number().min(0).max(100).optional(),
      owner: z.string().max(128).optional(),
      linkedMetricIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await updateImprovementInitiative(id, ctx.user.id, updates);
      return { success: true };
    }),

  deleteInitiative: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteImprovementInitiative(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Optimization Cycles ──
  getCycles: protectedProcedure.query(async ({ ctx }) => {
    return getUserOptimizationCycles(ctx.user.id);
  }),

  createCycle: protectedProcedure
    .input(z.object({
      cycleNumber: z.number().min(1),
      phase: z.enum(["assess", "optimize", "validate"]).default("assess"),
      findings: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = await createOptimizationCycle({
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),

  updateCycle: protectedProcedure
    .input(z.object({
      id: z.number(),
      phase: z.enum(["assess", "optimize", "validate"]).optional(),
      status: z.enum(["active", "completed"]).optional(),
      findings: z.array(z.string()).optional(),
      improvements: z.array(z.string()).optional(),
      validationResults: z.object({
        passed: z.number(),
        failed: z.number(),
        notes: z.array(z.string()),
      }).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await updateOptimizationCycle(id, ctx.user.id, updates);
      return { success: true };
    }),
});
