/**
 * Illustrations Router — Generate custom AI illustrations for capability surfaces.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { generateImage } from "../_core/imageGeneration";

const ILLUSTRATION_PROMPTS: Record<string, string> = {
  "hero-documents": "Minimalist dark illustration of floating document pages with warm amber glow, abstract geometric shapes, professional tech aesthetic, no text, 16:9",
  "hero-research": "Abstract dark illustration of interconnected knowledge nodes with warm gold highlights, neural network aesthetic, no text, 16:9",
  "hero-music": "Dark minimalist illustration of sound waves and musical notation in amber/gold gradients, abstract audio visualization, no text, 16:9",
  "hero-data": "Dark abstract illustration of data charts with warm amber highlights, geometric data visualization, no text, 16:9",
  "hero-slides": "Minimalist dark illustration of presentation slides floating in perspective with amber accent lighting, no text, 16:9",
  "hero-desktop": "Dark illustration of a desktop application window with warm amber UI elements, native app aesthetic, no text, 16:9",
  "hero-webapp": "Abstract dark illustration of a web browser with code and preview panels, warm gold highlights, no text, 16:9",
  "hero-browser": "Dark minimalist illustration of browser automation with floating web elements and amber connection lines, no text, 16:9",
  "icon-browser": "Simple flat icon of a web browser window, amber/gold on dark background, minimal geometric style, square",
  "icon-computer": "Simple flat icon of a desktop monitor, amber/gold on dark background, minimal geometric style, square",
  "icon-document": "Simple flat icon of a document page, amber/gold on dark background, minimal geometric style, square",
  "icon-voice": "Simple flat icon of a microphone with sound waves, amber/gold on dark background, minimal geometric style, square",
  "icon-code": "Simple flat icon of code brackets, amber/gold on dark background, minimal geometric style, square",
  "icon-data": "Simple flat icon of a bar chart, amber/gold on dark background, minimal geometric style, square",
  "icon-music": "Simple flat icon of a musical note, amber/gold on dark background, minimal geometric style, square",
  "icon-video": "Simple flat icon of a film frame, amber/gold on dark background, minimal geometric style, square",
  "empty-tasks": "Minimalist dark illustration of an empty inbox with a single amber sparkle, peaceful void aesthetic, no text, square",
  "empty-documents": "Minimalist dark illustration of a blank page with a warm amber pen, creative potential aesthetic, no text, square",
  "empty-data": "Minimalist dark illustration of empty chart axes with a single amber data point, discovery aesthetic, no text, square",
  "empty-music": "Minimalist dark illustration of silent headphones with a single amber note, anticipation aesthetic, no text, square",
  "empty-research": "Minimalist dark illustration of an empty magnifying glass with amber light, curiosity aesthetic, no text, square",
};

export const illustrationsRouter = router({
  listTypes: protectedProcedure.query(() => {
    return Object.keys(ILLUSTRATION_PROMPTS).map((key) => ({
      id: key,
      category: key.split("-")[0],
      name: key.split("-").slice(1).join(" "),
    }));
  }),
  generate: protectedProcedure
    .input(z.object({ type: z.string().min(1), customPrompt: z.string().optional() }))
    .mutation(async ({ input }) => {
      const prompt = input.customPrompt || ILLUSTRATION_PROMPTS[input.type];
      if (!prompt) throw new Error(`Unknown illustration type: ${input.type}`);
      const result = await generateImage({ prompt });
      return { url: result.url ?? "", type: input.type };
    }),
  generateBatch: protectedProcedure
    .input(z.object({ category: z.enum(["hero", "icon", "empty"]) }))
    .mutation(async ({ input }) => {
      const keys = Object.keys(ILLUSTRATION_PROMPTS).filter((k) => k.startsWith(input.category + "-"));
      const results: Array<{ type: string; url: string }> = [];
      for (const key of keys.slice(0, 3)) {
        try {
          const prompt = ILLUSTRATION_PROMPTS[key];
          if (!prompt) continue;
          const result = await generateImage({ prompt });
          if (result.url) results.push({ type: key, url: result.url });
        } catch (err) {
          console.error(`[Illustrations] Failed to generate ${key}:`, err);
        }
      }
      return results;
    }),
});
