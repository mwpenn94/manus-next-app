import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { addMemoryEntry, deleteMemoryEntry, getUserMemories, searchMemories } from "../db";

export const memoryRouter = router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50);
      }),

    add: protectedProcedure
      .input(z.object({
        key: z.string().min(1).max(500),
        value: z.string().min(1).max(5000),
        source: z.enum(["auto", "user"]).optional(),
        taskExternalId: z.string().max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await addMemoryEntry({
          userId: ctx.user.id,
          key: input.key,
          value: input.value,
          source: input.source ?? "user",
          taskExternalId: input.taskExternalId ?? null,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMemoryEntry(input.id, ctx.user.id);
        return { success: true };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        return searchMemories(ctx.user.id, input.query, input.limit ?? 10);
      }),

    /** Unarchive a memory that was auto-archived by the decay sweep */
    unarchive: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { unarchiveMemory } = await import("../db");
        await unarchiveMemory(input.id, ctx.user.id);
        return { success: true };
      }),

    /** List archived memories */
    listArchived: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getUserMemories(ctx.user.id, input?.limit ?? 50, true);
      }),

    /** Bulk add memory entries (for file import) */
    bulkAdd: protectedProcedure
      .input(z.object({
        entries: z.array(z.object({
          key: z.string().min(1).max(500),
          value: z.string().min(1).max(5000),
          source: z.enum(["auto", "user"]).optional(),
        })).min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        let added = 0;
        for (const entry of input.entries) {
          await addMemoryEntry({
            userId: ctx.user.id,
            key: entry.key,
            value: entry.value,
            source: entry.source ?? "user",
            taskExternalId: null,
          });
          added++;
        }
        return { success: true, added };
      }),
  });
