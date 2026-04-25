import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createWebappBuild, getUserWebappBuilds, getWebappBuild, updateWebappBuild } from "../db";

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
        generatedHtml: z.string().optional(),
        sourceCode: z.string().optional(),
        status: z.enum(["draft", "generating", "ready", "published", "error"]).optional(),
        title: z.string().max(200).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await updateWebappBuild(id, updates);
        return { success: true };
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
