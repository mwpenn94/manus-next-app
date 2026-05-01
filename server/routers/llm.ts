import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";

export const llmRouter = router({
    chat: protectedProcedure
      .input(z.object({
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string().max(50000),
        })).min(1),
      }))
      .mutation(async ({ input }) => {
        const { invokeLLM } = await import("../_core/llm");
        const response = await invokeLLM({
          messages: input.messages,
        });
        const content = response.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response.";
        return { content };
      }),
  });
