import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  createTaskTemplate,
  deleteTaskTemplate,
  bulkDeleteTaskTemplates,
  getUserTaskTemplates,
  incrementTemplateUsage,
  updateTaskTemplate,
 } from "../db";

export const templatesRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserTaskTemplates(ctx.user.id);
    }),
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(256),
        prompt: z.string().min(1),
        icon: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTaskTemplate({ ...input, userId: ctx.user.id });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        prompt: z.string().min(1).optional(),
        icon: z.string().max(64).optional(),
        category: z.string().max(64).optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateTaskTemplate(id, ctx.user.id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTaskTemplate(input.id, ctx.user.id);
        return { success: true };
      }),
    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1).max(100) }))
      .mutation(async ({ ctx, input }) => {
        await bulkDeleteTaskTemplates(input.ids, ctx.user.id);
        return { success: true };
      }),
    use: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await incrementTemplateUsage(input.id, ctx.user.id);
        return { success: true };
      }),
  });
