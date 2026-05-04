/**
 * Research Router — Multi-Agent Deep Research Orchestration
 *
 * Implements a multi-agent research pipeline:
 * 1. Planning Agent: decomposes topic into sub-questions with research strategies
 * 2. Research Agents (parallel): each sub-question gets its own specialist agent
 * 3. Validation Agent: cross-references findings, identifies contradictions
 * 4. Synthesis Agent: compiles validated findings into structured report
 *
 * This mirrors the Manus deep-research pattern: autonomous multi-step research
 * with parallel execution, source triangulation, and quality gates.
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { invokeLLM } from "../_core/llm";

interface ResearchSection {
  heading: string;
  content: string;
  sources: string[];
  confidence: "high" | "medium" | "low";
  agentId: string;
}

interface ResearchResult {
  id: string;
  topic: string;
  depth: string;
  status: "planning" | "researching" | "validating" | "synthesizing" | "complete" | "error";
  plan: { heading: string; question: string; strategy: string }[];
  sections: ResearchSection[];
  validationNotes: string;
  summary: string;
  methodology: string;
  startedAt: number;
  completedAt?: number;
  agentCount: number;
  progressPct: number;
}

// In-memory research cache (per-session) with eviction policy
const RESEARCH_CACHE_MAX = 200;
const RESEARCH_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const researchCache = new Map<string, ResearchResult>();

/** Evict stale or overflow entries from researchCache */
function evictResearchCache() {
  const now = Date.now();
  const keysToEvict: string[] = [];
  researchCache.forEach((val, key) => {
    const age = now - (val.completedAt ?? val.startedAt);
    if (age > RESEARCH_CACHE_TTL_MS) {
      keysToEvict.push(key);
    }
  });
  keysToEvict.forEach(k => researchCache.delete(k));
  if (researchCache.size > RESEARCH_CACHE_MAX) {
    const sorted = Array.from(researchCache.entries()).sort(
      (a, b) => (a[1].startedAt) - (b[1].startedAt)
    );
    const toRemove = sorted.slice(0, researchCache.size - RESEARCH_CACHE_MAX);
    toRemove.forEach(([key]) => researchCache.delete(key));
  }
}

/** Specialist research agent — handles one sub-question with domain expertise */
async function runResearchAgent(
  agentId: string,
  question: string,
  strategy: string,
  topic: string,
): Promise<{ content: string; sources: string[]; confidence: "high" | "medium" | "low" }> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are Research Agent ${agentId}, a specialist analyst. Your research strategy: ${strategy}.

RULES:
- Provide thorough, evidence-based analysis with specific data points and statistics
- Cite all sources inline as [Source Name, Year] or [Organization, Report Title]
- Rate your confidence: HIGH if multiple corroborating sources, MEDIUM if limited sources, LOW if speculative
- Include quantitative data wherever possible (percentages, dollar amounts, growth rates)
- Distinguish between established facts, expert opinions, and emerging trends
- If information is uncertain or contested, explicitly state the disagreement

Format your response as:
1. Key findings (bullet points with citations)
2. Detailed analysis (2-4 paragraphs)
3. Data points and statistics
4. Limitations and gaps in available information`,
      },
      {
        role: "user",
        content: `Research question: ${question}\n\nBroader context: This is part of a comprehensive research project on "${topic}".\nResearch strategy to follow: ${strategy}`,
      },
    ],
  });

  const content = String(response.choices[0].message.content || "");
  const sourceMatches = content.match(/\[([^\]]+)\]/g) || [];
  const sources = Array.from(new Set(sourceMatches.map((s: string) => s.replace(/[\[\]]/g, ""))));

  // Determine confidence based on source count and language
  let confidence: "high" | "medium" | "low" = "medium";
  if (sources.length >= 5) confidence = "high";
  else if (sources.length <= 1 || content.includes("uncertain") || content.includes("limited data")) confidence = "low";

  return { content, sources, confidence };
}

/** Validation agent — cross-references findings for consistency */
async function runValidationAgent(
  sections: ResearchSection[],
  topic: string,
): Promise<string> {
  const sectionsText = sections
    .map((s, i) => `## Section ${i + 1}: ${s.heading} (Agent: ${s.agentId}, Confidence: ${s.confidence})\n${s.content}\nSources: ${s.sources.join(", ")}`)
    .join("\n\n---\n\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a Research Validation Agent. Your job is to cross-reference findings from multiple research agents and identify:
1. Contradictions between sections (flag specific claims that conflict)
2. Gaps in coverage (important aspects of the topic not addressed)
3. Source quality assessment (are sources credible? any single-source claims?)
4. Bias detection (are findings skewed toward a particular perspective?)
5. Confidence calibration (do the confidence ratings match the evidence quality?)

Be specific and cite the section numbers when noting issues. Keep your validation concise but thorough.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\n\nResearch findings to validate:\n\n${sectionsText}`,
      },
    ],
  });

  return String(response.choices[0].message.content || "");
}

/** Synthesis agent — produces final structured report */
async function runSynthesisAgent(
  sections: ResearchSection[],
  validationNotes: string,
  topic: string,
  depth: string,
): Promise<{ summary: string; methodology: string }> {
  const sectionsText = sections
    .map((s) => `## ${s.heading}\n${s.content}`)
    .join("\n\n");

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a Research Synthesis Agent. Produce a comprehensive executive summary that:
1. Synthesizes findings across all research sections into a coherent narrative
2. Addresses any issues raised by the validation agent
3. Highlights the most significant findings and their implications
4. Provides actionable recommendations where appropriate
5. Notes areas of uncertainty and suggests further research directions

Structure: ${depth === "deep" ? "5-7 paragraphs with sub-headings" : depth === "quick" ? "2-3 concise paragraphs" : "3-5 paragraphs"}

Also provide a brief methodology section (1 paragraph) explaining how the research was conducted.`,
      },
      {
        role: "user",
        content: `Topic: ${topic}\n\nResearch findings:\n${sectionsText}\n\nValidation notes:\n${validationNotes}`,
      },
    ],
  });

  const content = String(response.choices[0].message.content || "");

  // Extract methodology if present, otherwise generate a default
  const methodologyMatch = content.match(/(?:methodology|approach|method)[:\s]*\n([\s\S]*?)(?:\n\n|\n#|$)/i);
  const methodology = methodologyMatch
    ? methodologyMatch[1].trim()
    : `Multi-agent research pipeline with ${sections.length} specialist agents conducting parallel research, followed by cross-validation and synthesis. Research depth: ${depth}.`;

  return { summary: content, methodology };
}

export const researchRouter = router({
  /** Start a new multi-agent research session */
  start: protectedProcedure
    .input(z.object({
      topic: z.string().min(3).max(500),
      depth: z.enum(["quick", "standard", "deep"]).default("standard"),
      focusAreas: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const id = `research-${ctx.user.id}-${Date.now()}`;
      const questionCount = input.depth === "quick" ? 3 : input.depth === "deep" ? 7 : 5;

      const result: ResearchResult = {
        id,
        topic: input.topic,
        depth: input.depth,
        status: "planning",
        plan: [],
        sections: [],
        validationNotes: "",
        summary: "",
        methodology: "",
        startedAt: Date.now(),
        agentCount: questionCount + 2, // research agents + validation + synthesis
        progressPct: 0,
      };
      evictResearchCache();
      researchCache.set(id, result);

      // Run multi-agent research pipeline asynchronously
      (async () => {
        try {
          // === PHASE 1: Planning Agent ===
          result.status = "planning";
          result.progressPct = 5;
          researchCache.set(id, { ...result });

          const decompose = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are a Research Planning Agent. Given a topic, create a research plan with exactly ${questionCount} focused sub-questions. For each question, specify a research strategy that a specialist agent should follow.

Strategies should vary: "quantitative analysis", "comparative study", "historical review", "expert consensus", "case study analysis", "trend forecasting", "stakeholder analysis".

${input.focusAreas?.length ? `Priority focus areas: ${input.focusAreas.join(", ")}` : ""}

Return a JSON object with a "questions" array.`,
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
                          heading: { type: "string", description: "Section heading for the report" },
                          question: { type: "string", description: "Specific research question" },
                          strategy: { type: "string", description: "Research strategy for this question" },
                        },
                        required: ["heading", "question", "strategy"],
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
          const questions = (plan.questions || []).slice(0, questionCount);
          result.plan = questions;
          result.progressPct = 15;
          researchCache.set(id, { ...result });

          // === PHASE 2: Parallel Research Agents ===
          result.status = "researching";
          researchCache.set(id, { ...result });

          // Execute research agents in parallel (batches of 3 to avoid rate limits)
          const BATCH_SIZE = 3;
          for (let i = 0; i < questions.length; i += BATCH_SIZE) {
            const batch = questions.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
              batch.map((q: { question: string; strategy: string; heading: string }, batchIdx: number) =>
                runResearchAgent(
                  `RA-${i + batchIdx + 1}`,
                  q.question,
                  q.strategy,
                  input.topic,
                )
              )
            );

            for (let j = 0; j < batchResults.length; j++) {
              const batchResult = batchResults[j];
              const q = batch[j];
              if (batchResult.status === "fulfilled") {
                result.sections.push({
                  heading: q.heading,
                  content: batchResult.value.content,
                  sources: batchResult.value.sources,
                  confidence: batchResult.value.confidence,
                  agentId: `RA-${i + j + 1}`,
                });
              } else {
                result.sections.push({
                  heading: q.heading,
                  content: `[Research agent failed: ${batchResult.reason?.message || "Unknown error"}]`,
                  sources: [],
                  confidence: "low",
                  agentId: `RA-${i + j + 1}`,
                });
              }
            }

            // Update progress
            const completedAgents = result.sections.length;
            result.progressPct = 15 + Math.round((completedAgents / questions.length) * 55);
            researchCache.set(id, { ...result });
          }

          // === PHASE 3: Validation Agent ===
          result.status = "validating";
          result.progressPct = 75;
          researchCache.set(id, { ...result });

          result.validationNotes = await runValidationAgent(result.sections, input.topic);
          result.progressPct = 85;
          researchCache.set(id, { ...result });

          // === PHASE 4: Synthesis Agent ===
          result.status = "synthesizing";
          result.progressPct = 90;
          researchCache.set(id, { ...result });

          const synthesis = await runSynthesisAgent(
            result.sections,
            result.validationNotes,
            input.topic,
            input.depth,
          );
          result.summary = synthesis.summary;
          result.methodology = synthesis.methodology;

          // === Complete ===
          result.status = "complete";
          result.progressPct = 100;
          result.completedAt = Date.now();
          researchCache.set(id, result);
        } catch (err) {
          result.status = "error";
          result.summary = `Research pipeline failed: ${err instanceof Error ? err.message : "Unknown error"}`;
          result.progressPct = 0;
          researchCache.set(id, result);
        }
      })();

      return { id, status: "planning", agentCount: result.agentCount };
    }),

  /** Get research results (with progress tracking) */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      // IDOR protection: verify the research ID belongs to the requesting user
      const expectedPrefix = `research-${ctx.user.id}-`;
      if (!input.id.startsWith(expectedPrefix)) {
        return null;
      }
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
