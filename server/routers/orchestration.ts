/**
 * Orchestration Router — Task queue management, priority, concurrency, and timeout controls
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  canStartTask,
  getTaskQueue,
  getOrchestrationStatus,
  setTaskPriority,
  setTaskTimeout,
  incrementRetry,
} from "../services/orchestration";

export const orchestrationRouter = router({
  /** Check if the user can start a new task (hasn't hit concurrent limit) */
  canStart: protectedProcedure.query(async ({ ctx }) => {
    return canStartTask(ctx.user.id);
  }),

  /** Get the user's task queue ordered by priority */
  queue: protectedProcedure.query(async ({ ctx }) => {
    return getTaskQueue(ctx.user.id);
  }),

  /** Get orchestration status (running count, queued count, limits) */
  status: protectedProcedure.query(async ({ ctx }) => {
    return getOrchestrationStatus(ctx.user.id);
  }),

  /** Set task priority (1=high, 2=normal, 3=low) */
  setPriority: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return setTaskPriority(input.taskId, ctx.user.id, input.priority);
    }),

  /** Set per-task timeout in seconds */
  setTimeout: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        timeoutSeconds: z.number().min(30).max(3600),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return setTaskTimeout(input.taskId, ctx.user.id, input.timeoutSeconds);
    }),

  /** Increment retry count and check if retries are exhausted */
  retry: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(async ({ input }) => {
      return incrementRetry(input.taskId);
    }),
});
