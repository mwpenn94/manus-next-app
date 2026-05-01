import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { tasks } from "../../drizzle/schema";
import {
  createTask,
  getUserTasks,
  getTaskByExternalId,
  updateTaskStatus,
  addTaskMessage,
  getTaskMessages,
  archiveTask,
  renameTask,
  toggleTaskFavorite,
  updateTaskSystemPrompt,
  searchTasks,
  createNotification,
  upsertTaskRating,
  getTaskRating,
  verifyTaskOwnership,
  verifyTaskOwnershipById,
  deleteLastMessages,
  getDb,
} from "../db";

export const taskRouter = router({
  list: protectedProcedure
    .input(z.object({
      statusFilter: z.string().max(10000).optional(),
      includeArchived: z.boolean().optional(),
      limit: z.number().min(1).max(200).optional(),
      cursor: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getUserTasks(ctx.user.id, {
        statusFilter: input?.statusFilter,
        includeArchived: input?.includeArchived,
        limit: input?.limit,
        cursor: input?.cursor,
      });
    }),

  get: protectedProcedure
    .input(z.object({ externalId: z.string().max(50) }))
    .query(async ({ ctx, input }) => {
      const task = await getTaskByExternalId(input.externalId);
      if (!task || task.userId !== ctx.user.id) return null;
      return task;
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1).max(500), externalId: z.string().min(8).max(24).optional() }))
    .mutation(async ({ ctx, input }) => {
      const externalId = input.externalId || nanoid(12);
      return createTask({
        externalId,
        userId: ctx.user.id,
        title: input.title,
      });
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      externalId: z.string().max(50),
      status: z.enum(["idle", "running", "completed", "error", "paused", "stopped"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.externalId, ctx.user.id);
      await updateTaskStatus(input.externalId, input.status);

      if (input.status === "completed" || input.status === "error") {
        try {
          const task = await getTaskByExternalId(input.externalId);
          if (task) {
            await createNotification({
              userId: ctx.user.id,
              type: input.status === "completed" ? "task_completed" : "task_error",
              title: input.status === "completed"
                ? `Task completed: ${task.title}`
                : `Task failed: ${task.title}`,
              content: input.status === "completed"
                ? "Your task has finished successfully."
                : "Your task encountered an error.",
              taskExternalId: input.externalId,
            });
          }
        } catch (err) {
          console.error("[Notification] Failed to create auto-notification:", err);
        }
      }

      return { success: true };
    }),

  rename: protectedProcedure
    .input(z.object({
      externalId: z.string().max(50),
      title: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      await renameTask(input.externalId, ctx.user.id, input.title);
      return { success: true };
    }),

  archive: protectedProcedure
    .input(z.object({ externalId: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      await archiveTask(input.externalId, ctx.user.id);
      return { success: true };
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ externalId: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      return toggleTaskFavorite(input.externalId, ctx.user.id);
    }),

  updateSystemPrompt: protectedProcedure
    .input(z.object({
      externalId: z.string().max(50),
      systemPrompt: z.string().max(10000).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateTaskSystemPrompt(input.externalId, ctx.user.id, input.systemPrompt);
      return { success: true };
    }),

  generateTitle: protectedProcedure
    .input(z.object({
      externalId: z.string().max(50),
      userMessage: z.string().max(2000),
      assistantMessage: z.string().max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.externalId, ctx.user.id);
      try {
        const { invokeLLM } = await import("../_core/llm");
        const result = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Generate a concise task title (3-8 words, no quotes) that captures the essence of this conversation. Return ONLY the title text, nothing else.",
            },
            {
              role: "user",
              content: `User asked: ${input.userMessage.slice(0, 500)}\n\nAssistant responded: ${input.assistantMessage.slice(0, 500)}`,
            },
          ],
        });
        const rawContent = result?.choices?.[0]?.message?.content;
        const contentStr = typeof rawContent === "string" ? rawContent : "";
        const title = contentStr.trim().replace(/^["']|["']$/g, "").slice(0, 100);
        if (title && title.length > 2) {
          await renameTask(input.externalId, ctx.user.id, title);
          return { title };
        }
        return { title: null };
      } catch (err) {
        console.error("[AutoTitle] Failed to generate title:", err);
        return { title: null };
      }
    }),

  sweepStale: protectedProcedure
    .mutation(async () => {
      const { sweepStaleTasks } = await import("../db");
      const swept = await sweepStaleTasks();
      return { swept };
    }),

  resumeStale: protectedProcedure
    .input(z.object({ externalId: z.string().max(50) }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskByExternalId(input.externalId);
      if (!task || task.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      if (!task.staleCompleted) throw new TRPCError({ code: "BAD_REQUEST", message: "Task was not auto-completed" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      await db.update(tasks).set({ status: "idle", staleCompleted: 0 }).where(eq(tasks.externalId, input.externalId));
      return { success: true };
    }),

  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      dateFrom: z.string().max(10000).optional(),
      dateTo: z.string().max(10000).optional(),
      statusFilter: z.string().max(10000).optional(),
    }))
    .query(async ({ ctx, input }) => {
      return searchTasks(ctx.user.id, input.query, {
        dateFrom: input.dateFrom ? new Date(input.dateFrom) : undefined,
        dateTo: input.dateTo ? new Date(input.dateTo) : undefined,
        statusFilter: input.statusFilter,
      });
    }),

  messages: protectedProcedure
    .input(z.object({ taskId: z.number() }))
    .query(async ({ ctx, input }) => {
      await verifyTaskOwnershipById(input.taskId, ctx.user.id);
      return getTaskMessages(input.taskId);
    }),

  addMessage: protectedProcedure
    .input(z.object({
      taskId: z.number(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().max(100000),
      actions: z.array(z.record(z.string().max(10000), z.unknown())).optional(),
      cardType: z.string().max(64).optional(),
      cardData: z.record(z.string().max(10000), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyTaskOwnershipById(input.taskId, ctx.user.id);
      const externalId = nanoid(12);
      await addTaskMessage({
        taskId: input.taskId,
        externalId,
        role: input.role,
        content: input.content,
        actions: input.actions ?? null,
        cardType: input.cardType ?? null,
        cardData: input.cardData ?? null,
      });
      return { success: true, externalId };
    }),

  rateTask: protectedProcedure
    .input(z.object({
      taskExternalId: z.string().min(1).max(64),
      rating: z.number().int().min(1).max(5),
      feedback: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await upsertTaskRating(input.taskExternalId, ctx.user.id, input.rating, input.feedback);
      return { success: true, rating: result };
    }),

  getTaskRating: protectedProcedure
    .input(z.object({ taskExternalId: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.taskExternalId, ctx.user.id);
      return getTaskRating(input.taskExternalId);
    }),

  duplicate: protectedProcedure
    .input(z.object({
      sourceExternalId: z.string().min(1).max(64),
      upToMessageIndex: z.number().int().min(0).optional(),
      newTitle: z.string().min(1).max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const sourceTask = await getTaskByExternalId(input.sourceExternalId);
      if (!sourceTask || sourceTask.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Source task not found" });
      }
      const sourceMessages = await getTaskMessages(sourceTask.id);
      if (sourceMessages.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot duplicate a task with no messages" });
      }
      const messagesToCopy = input.upToMessageIndex !== undefined
        ? sourceMessages.slice(0, Math.min(input.upToMessageIndex + 1, sourceMessages.length))
        : sourceMessages;
      const newExternalId = nanoid(12);
      const title = input.newTitle || `Copy of ${sourceTask.title}`;
      const newTask = await createTask({
        externalId: newExternalId,
        userId: ctx.user.id,
        title,
        status: "idle",
        projectId: sourceTask.projectId,
      });
      if (!newTask) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to create duplicate task" });
      for (const msg of messagesToCopy) {
        await addTaskMessage({
          taskId: newTask.id,
          externalId: nanoid(),
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        });
      }
      return { externalId: newExternalId, title, messagesCopied: messagesToCopy.length };
    }),

  /**
   * Delete the last N messages from a task (used by regenerate/retry).
   * This ensures the server-side DB stays in sync with the client after retry.
   */
  deleteLastMessages: protectedProcedure
    .input(z.object({
      taskExternalId: z.string().min(1).max(64),
      count: z.number().int().min(1).max(10).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await getTaskByExternalId(input.taskExternalId);
      if (!task || task.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
      }
      await deleteLastMessages(task.id, input.count);
      return { success: true };
    }),
});
