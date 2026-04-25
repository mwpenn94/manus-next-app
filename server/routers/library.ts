import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const libraryRouter = router({
    artifacts: protectedProcedure
      .input(z.object({
        type: z.string().max(64).optional(),
        search: z.string().max(256).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserLibraryArtifacts } = await import("../db");
        return getUserLibraryArtifacts(ctx.user.id, input);
      }),

    files: protectedProcedure
      .input(z.object({
        search: z.string().max(256).optional(),
        limit: z.number().min(1).max(100).optional(),
        offset: z.number().min(0).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const { getUserLibraryFiles } = await import("../db");
        return getUserLibraryFiles(ctx.user.id, input);
      }),

    /** Extract text from a PDF file (by URL) */
    extractPdfText: protectedProcedure
      .input(z.object({
        url: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdfUrl } = await import("../pdfExtraction");
        return extractTextFromPdfUrl(input.url);
      }),

    /** Extract text from an uploaded PDF (base64 encoded) */
    extractPdfFromUpload: protectedProcedure
      .input(z.object({
        base64: z.string().max(41_943_040), // ~31MB file (base64 overhead)
        fileName: z.string().max(512).optional(),
      }))
      .mutation(async ({ input }) => {
        const { extractTextFromPdfBuffer } = await import("../pdfExtraction");
        const buffer = Buffer.from(input.base64, "base64");
        return extractTextFromPdfBuffer(buffer);
      }),
  });
