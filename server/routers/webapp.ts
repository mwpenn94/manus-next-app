import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createWebappBuild, getUserWebappBuilds, getWebappBuild, updateWebappBuild } from "../db";
import { invokeLLM } from "../_core/llm";

export const webappRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserWebappBuilds(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getWebappBuild(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1).max(10000),
        title: z.string().max(200).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createWebappBuild({ userId: ctx.user.id, prompt: input.prompt, title: input.title });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        generatedHtml: z.string().max(50000).optional(),
        sourceCode: z.string().max(50000).optional(),
        status: z.enum(["draft", "generating", "ready", "published", "error"]).optional(),
        title: z.string().max(200).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateWebappBuild(id, updates);
        return { success: true };
      }),
    /** Iterative refinement: send current HTML + feedback to LLM for improvement */
    iterate: protectedProcedure
      .input(z.object({
        id: z.number(),
        feedback: z.string().min(1).max(2000),
      }))
      .mutation(async ({ input }) => {
        const build = await getWebappBuild(input.id);
        if (!build) throw new TRPCError({ code: "NOT_FOUND" });

        await updateWebappBuild(input.id, { status: "generating" });

        try {
          const currentHtml = build.generatedHtml || "<html><body><h1>Empty</h1></body></html>";
          const response = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a web developer. The user has an existing HTML page and wants improvements. Return ONLY the complete updated HTML code, nothing else. No markdown fences.`,
              },
              {
                role: "user",
                content: `Current HTML:\n\n${currentHtml.slice(0, 8000)}\n\nFeedback: ${input.feedback}\n\nReturn the improved complete HTML:`,
              },
            ],
          });

          const newHtml = String(response.choices[0].message.content || "");
          await updateWebappBuild(input.id, {
            generatedHtml: newHtml,
            status: "ready",
          });
          return { success: true, html: newHtml };
        } catch (err) {
          await updateWebappBuild(input.id, { status: "error" });
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : "Iteration failed",
          });
        }
      }),
    publish: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const build = await getWebappBuild(input.id);
        if (!build || !build.generatedHtml) throw new TRPCError({ code: "NOT_FOUND", message: "No HTML to publish" });
        const { storagePut } = await import("../storage");
        const { nanoid } = await import("nanoid");
        const key = `webapps/${nanoid(12)}/index.html`;
        const { url } = await storagePut(key, Buffer.from(build.generatedHtml, "utf-8"), "text/html");
        await updateWebappBuild(input.id, { publishedUrl: url, publishedKey: key, status: "published" });
        return { url, key };
      }),
  });
