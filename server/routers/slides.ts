import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { createSlideDeck, getSlideDeck, getUserSlideDecks, updateSlideDeck } from "../db";
import { storagePut } from "../storage";
import PptxGenJS from "pptxgenjs";

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
    /** Export a slide deck as PPTX */
    exportPptx: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const deck = await getSlideDeck(input.id);
        if (!deck || deck.userId !== ctx.user.id) {
          throw new Error("Deck not found");
        }
        const slides = (deck.slides as Array<{ title: string; content: string; notes?: string }>) || [];
        const pptx = new PptxGenJS();
        pptx.title = deck.title || "Presentation";
        pptx.author = "Sovereign AI";
        for (const slide of slides) {
          const s = pptx.addSlide();
          s.addText(slide.title || "", {
            x: 0.5, y: 0.3, w: 9, h: 0.8,
            fontSize: 28, bold: true, color: "1a1a1a",
          });
          s.addText(slide.content || "", {
            x: 0.5, y: 1.3, w: 9, h: 5,
            fontSize: 14, color: "333333", valign: "top",
            paraSpaceAfter: 6,
          });
          if (slide.notes) {
            s.addNotes(slide.notes);
          }
        }
        const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
        const filename = `${(deck.title || "slides").replace(/[^a-zA-Z0-9]/g, "_")}.pptx`;
        const { url } = await storagePut(
          `slides/${ctx.user.id}/${Date.now()}-${filename}`,
          buffer,
          "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        );
        return { url, filename };
      }),
  });
