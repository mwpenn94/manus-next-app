import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { addTaskEvent, getReplayableTasks, getTaskEvents, verifyTaskOwnershipById } from "../db";
import { tasks } from "../../drizzle/schema";

export const replayRouter = router({
    /** List tasks that have recorded replay events */
    sessions: protectedProcedure.query(async ({ ctx }) => {
      return getReplayableTasks(ctx.user.id);
    }),

    events: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getTaskEvents(input.taskId);
      }),

    addEvent: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        eventType: z.string().max(100),
        payload: z.string().max(100000),
        offsetMs: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        await addTaskEvent(input);
        return { success: true };
      }),
  });
