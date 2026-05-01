/**
 * automation.ts — tRPC router for scheduled automation management
 */
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { automationSchedules, scheduleExecutionHistory } from "../../drizzle/schema";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, createScheduleExecution, getScheduleExecutions, getUserScheduleExecutions, updateScheduleExecution } from "../db";
import { TRPCError } from "@trpc/server";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

export const automationRouter = router({
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "paused", "completed", "failed"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const conditions = [eq(automationSchedules.userId, ctx.user.id)];
      if (input?.status) {
        conditions.push(eq(automationSchedules.status, input.status));
      }
      const schedules = await db
        .select()
        .from(automationSchedules)
        .where(and(...conditions))
        .orderBy(desc(automationSchedules.createdAt))
        .limit(input?.limit ?? 50)
        .offset(input?.offset ?? 0);
      return { schedules, total: schedules.length };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const [schedule] = await db
        .select()
        .from(automationSchedules)
        .where(and(
          eq(automationSchedules.id, input.id),
          eq(automationSchedules.userId, ctx.user.id)
        ))
        .limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
      return schedule;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      mode: z.string().default("schedule"),
      triggerType: z.enum(["cron", "interval"]).default("cron"),
      cronExpression: z.string().optional(),
      intervalSeconds: z.number().min(300).optional(),
      workflowDefinition: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [result] = await db
        .insert(automationSchedules)
        .values({
          userId: ctx.user.id,
          name: input.name,
          description: input.description ?? null,
          mode: input.mode,
          triggerType: input.triggerType,
          cronExpression: input.cronExpression ?? null,
          intervalSeconds: input.intervalSeconds ?? null,
          workflowDefinition: (input.workflowDefinition as Record<string, unknown>) ?? null,
          status: "active",
          runCount: 0,
        })
        .$returningId();
      return { id: result.id, name: input.name, status: "active" };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      status: z.enum(["active", "paused"]).optional(),
      cronExpression: z.string().optional(),
      intervalSeconds: z.number().min(300).optional(),
      workflowDefinition: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(automationSchedules)
        .where(and(
          eq(automationSchedules.id, input.id),
          eq(automationSchedules.userId, ctx.user.id)
        ))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });

      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      if (input.cronExpression !== undefined) updates.cronExpression = input.cronExpression;
      if (input.intervalSeconds !== undefined) updates.intervalSeconds = input.intervalSeconds;
      if (input.workflowDefinition !== undefined) updates.workflowDefinition = input.workflowDefinition;

      if (Object.keys(updates).length > 0) {
        await db.update(automationSchedules).set(updates).where(eq(automationSchedules.id, input.id));
      }
      return { id: input.id, updated: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [existing] = await db
        .select()
        .from(automationSchedules)
        .where(and(
          eq(automationSchedules.id, input.id),
          eq(automationSchedules.userId, ctx.user.id)
        ))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
      await db.delete(automationSchedules).where(eq(automationSchedules.id, input.id));
      return { id: input.id, deleted: true };
    }),

  /** Execute a schedule (creates a run record) */
  execute: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [schedule] = await db
        .select()
        .from(automationSchedules)
        .where(and(
          eq(automationSchedules.id, input.id),
          eq(automationSchedules.userId, ctx.user.id)
        ))
        .limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });

      const execution = await createScheduleExecution({
        scheduleId: input.id,
        userId: ctx.user.id,
        status: "running",
        triggerType: "manual",
      });

      // Update schedule run count and lastRunAt
      await db.update(automationSchedules).set({
        runCount: (schedule.runCount ?? 0) + 1,
        lastRunAt: Date.now(),
      }).where(eq(automationSchedules.id, input.id));

      return execution;
    }),

  /** Get execution history for a specific schedule */
  getExecutionHistory: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await requireDb();
      const [schedule] = await db
        .select()
        .from(automationSchedules)
        .where(and(
          eq(automationSchedules.id, input.scheduleId),
          eq(automationSchedules.userId, ctx.user.id)
        ))
        .limit(1);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
      return getScheduleExecutions(input.scheduleId, input.limit);
    }),

  /** Get all execution history for the current user */
  allExecutions: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getUserScheduleExecutions(ctx.user.id, input?.limit ?? 50);
    }),
});
