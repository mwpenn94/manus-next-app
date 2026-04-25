import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { createSlideDeck, getSlideDeck, getUserSlideDecks, updateSlideDeck } from "../db";

export const slidesRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSlideDecks(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const deck = await getSlideDeck(input.id);
        if (!deck || deck.userId !== ctx.user.id) return null;
        return deck;
      }),
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        template: z.string().default("blank"),
        slideCount: z.number().min(3).max(30).default(8),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("../_core/llm");
        const title = input.prompt.length > 60 ? input.prompt.slice(0, 60) + "..." : input.prompt;
        const deckId = await createSlideDeck({
          userId: ctx.user.id,
          title,
          prompt: input.prompt,
          template: input.template,
          status: "generating",
        });
        // Generate slides via LLM (async, non-blocking)
        (async () => {
          try {
            const response = await invokeLLM({
              messages: [
                { role: "system", content: `You are a presentation designer. Generate exactly ${input.slideCount} slides as a JSON array. Each slide has: title (string), content (markdown string with bullet points), notes (optional speaker notes string). Return ONLY valid JSON array, no markdown fences.` },
                { role: "user", content: `Create a presentation about: ${input.prompt}\n\nTemplate style: ${input.template}` },
              ],
            });
            const rawContent = response.choices?.[0]?.message?.content ?? "[]";
            const text = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
            // Extract JSON from response
            const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            const slides = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            await updateSlideDeck(deckId, { slides, status: "ready" });
          } catch (err) {
            console.error("[Slides] Generation failed:", err);
            await updateSlideDeck(deckId, { status: "error" });
          }
        })();
        return { id: deckId, title };
      }),
  });
