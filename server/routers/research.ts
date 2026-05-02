/**
 * Research Router — Multi-step autonomous research agent
 * 
 * Implements iterative research synthesis:
 * 1. Decompose topic into sub-questions
 * 2. Search/synthesize each sub-question via LLM
 * 3. Compile findings into structured report with citations
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

interface ResearchResult {
  id: string;
  topic: string;
  depth: string;
  status: "running" | "complete" | "error";
  sections: { heading: string; content: string; sources: string[] }[];
  summary: string;
  startedAt: number;
  completedAt?: number;
}

// In-memory research cache (per-session) with eviction policy
const RESEARCH_CACHE_MAX = 200;
const RESEARCH_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const researchCache = new Map<string, ResearchResult>();

/** Evict stale or overflow entries from researchCache */
function evictResearchCache() {
  const now = Date.now();
  // Remove entries older than TTL
  const keysToEvict: string[] = [];
  researchCache.forEach((val, key) => {
    const age = now - (val.completedAt ?? val.startedAt);
    if (age > RESEARCH_CACHE_TTL_MS) {
      keysToEvict.push(key);
    }
  });
  keysToEvict.forEach(k => researchCache.delete(k));
  // If still over max, remove oldest entries
  if (researchCache.size > RESEARCH_CACHE_MAX) {
    const sorted = Array.from(researchCache.entries()).sort(
      (a, b) => (a[1].startedAt) - (b[1].startedAt)
    );
    const toRemove = sorted.slice(0, researchCache.size - RESEARCH_CACHE_MAX);
    toRemove.forEach(([key]) => researchCache.delete(key));
  }
}

export const researchRouter = router({
  /** Start a new research session */
  start: protectedProcedure
    .input(z.object({
      topic: z.string().min(3).max(500),
      depth: z.enum(["quick", "standard", "deep"]).default("standard"),
      focusAreas: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = `research-${ctx.user.id}-${Date.now()}`;
      const result: ResearchResult = {
        id,
        topic: input.topic,
        depth: input.depth,
        status: "running",
        sections: [],
        summary: "",
        startedAt: Date.now(),
      };
      evictResearchCache();
      researchCache.set(id, result);

      // Run research asynchronously
      (async () => {
        try {
          // Step 1: Decompose into sub-questions
          const decompose = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a research planning agent. Given a topic, decompose it into ${input.depth === "quick" ? "3" : input.depth === "deep" ? "7" : "5"} focused sub-questions for comprehensive research. Return a JSON array of objects with "heading" and "question" fields.${input.focusAreas?.length ? ` Focus areas: ${input.focusAreas.join(", ")}` : ""}`,
              },
              { role: "user", content: input.topic },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "research_plan",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          heading: { type: "string" },
                          question: { type: "string" },
                        },
                        required: ["heading", "question"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["questions"],
                  additionalProperties: false,
                },
              },
            },
          });

          const plan = JSON.parse(String(decompose.choices[0].message.content || "{}"));
          const questions = plan.questions || [];

          // Step 2: Research each sub-question
          for (const q of questions) {
            const research = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: "You are a research analyst. Provide a thorough, well-sourced analysis of the given question. Include specific data points, statistics, and cite sources where possible. Format citations as [Source Name, Year] inline.",
                },
                { role: "user", content: `Research question: ${q.question}\n\nContext: This is part of a larger research project on "${input.topic}"` },
              ],
            });

            const content = String(research.choices[0].message.content || "");
            // Extract inline citations
            const sourceMatches = content.match(/\[([^\]]+)\]/g) || [];
            const sources = Array.from(new Set(sourceMatches.map((s: string) => s.replace(/[\[\]]/g, ""))));

            result.sections.push({
              heading: q.heading,
              content,
              sources,
            });
            researchCache.set(id, { ...result });
          }

          // Step 3: Generate executive summary
          const summaryPrompt = result.sections
            .map((s) => `## ${s.heading}\n${s.content}`)
            .join("\n\n");

          const summaryResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a research editor. Synthesize the following research sections into a concise executive summary (3-5 paragraphs). Highlight key findings, trends, and actionable insights.",
              },
              { role: "user", content: summaryPrompt },
            ],
          });

          result.summary = String(summaryResponse.choices[0].message.content || "");
          result.status = "complete";
          result.completedAt = Date.now();
          researchCache.set(id, result);
        } catch (err) {
          result.status = "error";
          result.summary = `Research failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          researchCache.set(id, result);
        }
      })();

      return { id, status: "running" };
    }),

  /** Get research results */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const result = researchCache.get(input.id);
      if (!result) return null;
      return result;
    }),

  /** List all research sessions for current user */
  list: protectedProcedure.query(({ ctx }) => {
    const userPrefix = `research-${ctx.user.id}-`;
    const results: ResearchResult[] = [];
    researchCache.forEach((v, k) => {
      if (k.startsWith(userPrefix)) results.push(v);
    });
    return results.sort((a, b) => b.startedAt - a.startedAt);
  }),
});
