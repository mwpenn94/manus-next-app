import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  createTask,
  getUserTasks,
  getTaskByExternalId,
  updateTaskStatus,
  addTaskMessage,
  getTaskMessages,
  getBridgeConfig,
  upsertBridgeConfig,
} from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  task: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTasks(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .query(async ({ input }) => {
        return getTaskByExternalId(input.externalId);
      }),

    create: protectedProcedure
      .input(z.object({ title: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const externalId = nanoid(12);
        return createTask({
          externalId,
          userId: ctx.user.id,
          title: input.title,
        });
      }),

    updateStatus: protectedProcedure
      .input(z.object({
        externalId: z.string(),
        status: z.enum(["idle", "running", "completed", "error"]),
      }))
      .mutation(async ({ input }) => {
        await updateTaskStatus(input.externalId, input.status);
        return { success: true };
      }),

    messages: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        return getTaskMessages(input.taskId);
      }),

    addMessage: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
        actions: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const externalId = nanoid(12);
        await addTaskMessage({
          taskId: input.taskId,
          externalId,
          role: input.role,
          content: input.content,
          actions: input.actions ?? null,
        });
        return { success: true, externalId };
      }),
  }),

  bridge: router({
    getConfig: protectedProcedure.query(async ({ ctx }) => {
      return getBridgeConfig(ctx.user.id) ?? null;
    }),

    saveConfig: protectedProcedure
      .input(z.object({
        bridgeUrl: z.string().url().optional().nullable(),
        apiKey: z.string().optional().nullable(),
        enabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertBridgeConfig({
          userId: ctx.user.id,
          bridgeUrl: input.bridgeUrl ?? null,
          apiKey: input.apiKey ?? null,
          enabled: input.enabled ? 1 : 0,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
