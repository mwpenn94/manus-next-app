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
      .input(z.object({ externalId: z.string() }))
      .query(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        return project;
      }),
    delete: protectedProcedure
      .input(z.object({ externalId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const project = await getVideoProjectByExternalId(input.externalId);
        if (!project || project.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
        await deleteVideoProject(project.id, ctx.user.id);
        return { success: true };
      }),

    /** Analyze a video URL (YouTube or direct) with AI — returns structured analysis */
    analyze: protectedProcedure
      .input(z.object({
        url: z.string().url(),
        prompt: z.string().min(1).max(2000).default("Summarize the key points of this video"),
        extractFrames: z.boolean().default(true),
        timestamps: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");

        // Get YouTube metadata if applicable
        const isYouTube = /youtube\.com|youtu\.be/.test(input.url);
        let videoTitle = "";
        if (isYouTube) {
          try {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(input.url)}&format=json`;
            const resp = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });
            if (resp.ok) {
              const data = await resp.json() as any;
              videoTitle = data.title || "";
            }
          } catch { /* ignore */ }
        }

        const systemPrompt = `You are a video analysis expert. Analyze the provided video content and respond to the user's prompt. ${input.timestamps ? "Include timestamps where relevant." : ""} ${input.extractFrames ? "Describe key visual frames and transitions." : ""} Be detailed and specific about visual content, audio content, text overlays, and any other relevant information.`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  {
                    type: "file_url" as const,
                    file_url: { url: input.url, mime_type: "video/mp4" as const },
                  },
                  {
                    type: "text" as const,
                    text: `${videoTitle ? `Video title: "${videoTitle}"\n` : ""}Video source: ${isYouTube ? "YouTube" : "Direct"}\nURL: ${input.url}\n\nAnalysis request: ${input.prompt}`,
                  },
                ] as any,
              },
            ] as any,
            maxTokens: 4096,
          });

          const analysis = String(response?.choices?.[0]?.message?.content || "Unable to analyze video content.");
          return {
            success: true,
            title: videoTitle || input.url.slice(0, 80),
            source: isYouTube ? "youtube" as const : "direct" as const,
            analysis,
          };
        } catch (err: any) {
          // Fallback if LLM doesn't support video file_url
          if (err.message?.includes("unsupported") || err.message?.includes("file_url")) {
            return {
              success: false,
              title: videoTitle || input.url.slice(0, 80),
              source: isYouTube ? "youtube" as const : "direct" as const,
              analysis: `Direct video analysis is not available in the current model configuration. Video URL: ${input.url}\n\nAlternatives:\n1. Open the URL in a browser and describe what you see\n2. If it's a YouTube video, search for its transcript`,
            };
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Video analysis failed: ${err.message}` });
        }
      }),
  });
