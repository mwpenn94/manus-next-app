import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createDesign, deleteDesign, getDesign, getUserDesigns, updateDesign } from "../db";
import { designs } from "../../drizzle/schema";

export const designRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserDesigns(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) return null;
        return design;
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(200),
        canvasState: z.record(z.string().max(10000), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createDesign({ userId: ctx.user.id, name: input.name, canvasState: input.canvasState });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().max(200).optional(),
        canvasState: z.record(z.string().max(10000), z.unknown()).optional(),
        thumbnailUrl: z.string().max(2000).optional(),
        exportUrl: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to update this design" });
        const { id, ...updates } = input;
        await updateDesign(id, updates);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteDesign(input.id, ctx.user.id);
        return { success: true };
      }),
    export: protectedProcedure
      .input(z.object({ id: z.number(), format: z.enum(["png", "svg"]).optional() }))
      .mutation(async ({ ctx, input }) => {
        const design = await getDesign(input.id);
        if (!design || design.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to export this design" });
        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");
        const key = `designs/${nanoid(12)}.json`;
        const { url } = await storagePut(key, Buffer.from(JSON.stringify(design.canvasState), "utf-8"), "application/json");
        await updateDesign(input.id, { exportUrl: url });
        return { url };
      }),
  });
