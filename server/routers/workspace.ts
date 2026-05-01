import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  addWorkspaceArtifact,
  getLatestArtifactByType,
  getWorkspaceArtifacts,
  verifyTaskOwnershipById,
 } from "../db";

const ARTIFACT_TYPES = ["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document", "document_pdf", "document_docx", "document_xlsx", "document_csv", "slides", "webapp_preview", "webapp_deployed"] as const;

export const workspaceRouter = router({
    addArtifact: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        artifactType: z.enum(ARTIFACT_TYPES),
        label: z.string().optional(),
        content: z.string().optional(),
        url: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        await addWorkspaceArtifact({
          taskId: input.taskId,
          artifactType: input.artifactType,
          label: input.label ?? null,
          content: input.content ?? null,
          url: input.url ?? null,
        });
        return { success: true };
      }),

    list: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getWorkspaceArtifacts(input.taskId, input.type);
      }),

    latest: protectedProcedure
      .input(z.object({
        taskId: z.number(),
        type: z.enum(ARTIFACT_TYPES),
      }))
      .query(async ({ ctx, input }) => {
        await verifyTaskOwnershipById(input.taskId, ctx.user.id);
        return getLatestArtifactByType(input.taskId, input.type) ?? null;
      }),
  });
