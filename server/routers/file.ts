import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createTaskFile,
  getTaskFiles,
  verifyTaskOwnership,
  getTaskThumbnails,
} from "../db";

export const fileRouter = router({
  /** Record a file upload in the database (actual S3 upload happens via /api/upload) */
  record: protectedProcedure
    .input(z.object({
      taskExternalId: z.string().max(50),
      fileName: z.string().max(500),
      fileKey: z.string().max(500),
      url: z.string().url(),
      mimeType: z.string().optional(),
      size: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createTaskFile({
        taskExternalId: input.taskExternalId,
        userId: ctx.user.id,
        fileName: input.fileName,
        fileKey: input.fileKey,
        url: input.url,
        mimeType: input.mimeType ?? null,
        size: input.size ?? null,
      });
      return { success: true };
    }),

  /** List files for a task */
  list: protectedProcedure
    .input(z.object({ taskExternalId: z.string().max(50) }))
    .query(async ({ ctx, input }) => {
      await verifyTaskOwnership(input.taskExternalId, ctx.user.id);
      return getTaskFiles(input.taskExternalId);
    }),

  /** Batch-fetch first image thumbnail per task for sidebar previews */
  thumbnails: protectedProcedure
    .input(z.object({ taskExternalIds: z.array(z.string().max(50)).max(100) }))
    .query(async ({ input }) => {
      return getTaskThumbnails(input.taskExternalIds);
    }),
});
