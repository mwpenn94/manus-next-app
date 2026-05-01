/**
 * Pipeline Router — CRUD for data pipelines and pipeline runs
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { randomUUID } from "crypto";

export const pipelineRouter = router({
  /** List pipelines for the current user */
  list: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      return db.getUserDataPipelines(ctx.user.id, input?.limit ?? 50, input?.offset ?? 0);
    }),

  /** Get a single pipeline by ID */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await db.getDataPipelineById(input.id);
      if (!pipeline || pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found" });
      }
      return pipeline;
    }),

  /** Create a new pipeline */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(256),
      description: z.string().max(5000).optional(),
      pipelineType: z.string().max(50).default("etl"),
      sourceConfig: z.record(z.string().max(10000), z.unknown()).optional(),
      transformSteps: z.array(z.object({
        name: z.string().max(1000),
        type: z.string().max(1000),
        config: z.record(z.string().max(10000), z.unknown()).optional(),
      })).optional(),
      destinationConfig: z.record(z.string().max(10000), z.unknown()).optional(),
      schedule: z.string().max(100).optional(),
      accessTier: z.string().max(50).default("internal"),
      tags: z.array(z.string().max(10000)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createDataPipeline({
        externalId: randomUUID(),
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        pipelineType: input.pipelineType,
        sourceConfig: (input.sourceConfig as Record<string, unknown>) ?? null,
        transformSteps: (input.transformSteps as any) ?? null,
        destinationConfig: (input.destinationConfig as Record<string, unknown>) ?? null,
        schedule: input.schedule ?? null,
        accessTier: input.accessTier,
        tags: input.tags ?? null,
        status: "draft",
        runCount: 0,
      });
      return result;
    }),

  /** Update a pipeline */
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
      description: z.string().max(5000).optional(),
      pipelineType: z.string().max(50).optional(),
      sourceConfig: z.record(z.string().max(10000), z.unknown()).optional(),
      transformSteps: z.array(z.object({
        name: z.string().max(1000),
        type: z.string().max(1000),
        config: z.record(z.string().max(10000), z.unknown()).optional(),
      })).optional(),
      destinationConfig: z.record(z.string().max(10000), z.unknown()).optional(),
      schedule: z.string().max(100).optional(),
      accessTier: z.string().max(50).optional(),
      status: z.enum(["draft", "active", "paused", "error", "archived"]).optional(),
      tags: z.array(z.string().max(10000)).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await db.getDataPipelineById(input.id);
      if (!pipeline || pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found" });
      }
      const { id, ...updates } = input;
      await db.updateDataPipeline(id, updates as any);
      return { success: true };
    }),

  /** Delete a pipeline */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await db.getDataPipelineById(input.id);
      if (!pipeline || pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found" });
      }
      await db.deleteDataPipeline(input.id);
      return { success: true };
    }),

  /** List runs for a pipeline */
  runs: protectedProcedure
    .input(z.object({
      pipelineId: z.number(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const pipeline = await db.getDataPipelineById(input.pipelineId);
      if (!pipeline || pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found" });
      }
      return db.getPipelineRuns(input.pipelineId, input.limit);
    }),

  /** Start a pipeline run */
  startRun: protectedProcedure
    .input(z.object({ pipelineId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await db.getDataPipelineById(input.pipelineId);
      if (!pipeline || pipeline.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pipeline not found" });
      }
      const run = await db.createPipelineRun({
        pipelineId: input.pipelineId,
        userId: ctx.user.id,
        status: "running",
        recordsProcessed: 0,
        recordsFailed: 0,
      });
      return run;
    }),
});
