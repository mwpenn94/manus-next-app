import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { 
  createVideoProject,
  deleteVideoProject,
  getUserVideoProjects,
  getVideoProjectByExternalId,
 } from "../db";

export const videoRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserVideoProjects(ctx.user.id);
    }),
    generate: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        prompt: z.string().min(1).max(2000),
        sourceImages: z.array(z.string().url()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const externalId = nanoid();
        const project = await createVideoProject({
          externalId,
          userId: ctx.user.id,
          title: input.title,
          prompt: input.prompt,
          sourceImages: input.sourceImages ?? [],
          provider: "ffmpeg",
          status: "pending",
        });
        // §L.25 degraded-delivery: currently queues as pending.
        // A background worker would pick up and process via ffmpeg-slideshow (free),
        // replicate-svd (freemium), or veo3 (premium) based on available API keys.
        return { externalId, status: "pending" };
      }),
    get: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
      .query(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        return project;
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        await deleteVideoProject(project.id, ctx.user.id);
        return { success: true };
      }),
  });
