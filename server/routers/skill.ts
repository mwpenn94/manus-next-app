import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getUserSkills, installSkill, toggleSkill, uninstallSkill } from "../db";
import { skills } from "../../drizzle/schema";

export const skillRouter = router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getUserSkills(ctx.user.id);
    }),
    install: protectedProcedure
      .input(z.object({
        skillId: z.string().min(1).max(128),
        name: z.string().min(1).max(256),
        description: z.string().max(2000).optional(),
        category: z.string().max(128).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await installSkill({
          userId: ctx.user.id,
          skillId: input.skillId,
          name: input.name,
          description: input.description ?? null,
          category: input.category ?? null,
        });
        return { success: true };
      }),
    uninstall: protectedProcedure
      .input(z.object({ skillId: z.string().max(500) }))
      .mutation(async ({ ctx, input }) => {
        await uninstallSkill(ctx.user.id, input.skillId);
        return { success: true };
      }),
    toggle: protectedProcedure
      .input(z.object({ skillId: z.string().max(500), enabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await toggleSkill(ctx.user.id, input.skillId, input.enabled);
        return { success: true };
      }),
    /** Execute a skill by running its instructions through the LLM */
    execute: protectedProcedure
      .input(z.object({
        skillId: z.string().max(500),
        prompt: z.string().min(1),
        context: z.string().max(50000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const skills = await getUserSkills(ctx.user.id);
        const skill = skills.find(s => s.skillId === input.skillId && s.enabled);
        if (!skill) throw new TRPCError({ code: "NOT_FOUND", message: "Skill not found or not enabled" });
        const { invokeLLM } = await import("../_core/llm");
        const response = await invokeLLM({
          messages: [
            { role: "system", content: `You are executing the "${skill.name}" skill. ${skill.description || ""}\n\nFollow the skill's purpose precisely and produce high-quality output.${input.context ? `\n\nAdditional context: ${input.context}` : ""}` },
            { role: "user", content: input.prompt },
          ],
        });
        const content = typeof response.choices?.[0]?.message?.content === "string"
          ? response.choices[0].message.content
          : "Skill execution produced no output.";
        return { result: content, skillId: input.skillId };
      }),
  });
