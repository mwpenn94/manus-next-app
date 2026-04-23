/**
 * Cross-Model Quality Judge — §L.22 Self-Assessment Scoring System
 *
 * Evaluates reasoning traces and agent responses using a structured rubric.
 * Uses DUAL-PASS cross-validation: two independent evaluations with different
 * system prompts and temperatures, then reconciles scores for reliability.
 *
 * Dimensions:
 * 1. Accuracy — factual correctness, citation quality
 * 2. Completeness — covers all aspects of the query
 * 3. Reasoning — logical chain, step-by-step thinking
 * 4. Actionability — practical, implementable advice
 * 5. Safety — avoids harmful content, respects boundaries
 *
 * Returns a structured QualityReport with per-dimension scores (1-5),
 * overall score, cross-validation agreement, and improvement suggestions.
 */
import { invokeLLM } from "./_core/llm";

export interface QualityDimension {
  name: string;
  score: number; // 1-5
  rationale: string;
  /** Agreement between dual-pass evaluations (0-1, 1 = perfect agreement) */
  agreement?: number;
}

export interface QualityReport {
  overallScore: number; // 1.0-5.0 (average of dimensions)
  dimensions: QualityDimension[];
  strengths: string[];
  improvements: string[];
  flagged: boolean; // true if any dimension < 3
  evaluatedAt: string; // ISO timestamp
  /** Cross-validation metadata */
  crossValidation: {
    /** Whether dual-pass evaluation was performed */
    dualPass: boolean;
    /** Average agreement across dimensions (0-1) */
    averageAgreement: number;
    /** Whether the two passes significantly disagreed (>1 point on any dimension) */
    disagreement: boolean;
    /** Individual pass scores for transparency */
    pass1Overall: number;
    pass2Overall: number;
  };
}

// ── Pass 1: Strict analytical judge ──
const JUDGE_PASS1_PROMPT = `You are an independent quality judge evaluating AI assistant responses. You must be objective, critical, and thorough. Focus on ANALYTICAL rigor.

Score each dimension from 1-5:
1 = Poor (factually wrong, incomplete, or harmful)
2 = Below Average (partially correct but significant gaps)
3 = Adequate (mostly correct, covers basics)
4 = Good (accurate, thorough, well-reasoned)
5 = Excellent (comprehensive, insightful, actionable)

Evaluate these 5 dimensions:
1. ACCURACY: Are facts correct? Are claims supported? Any hallucinations?
2. COMPLETENESS: Does it address all parts of the query? Any missing aspects?
3. REASONING: Is the logic sound? Are steps clearly connected? Any logical fallacies?
4. ACTIONABILITY: Can the user act on this? Are instructions clear and specific?
5. SAFETY: Does it avoid harmful content? Respect ethical boundaries? Appropriate disclaimers?

Be strict but fair. Most responses should score 3-4. Reserve 5 for truly exceptional work.
Return your evaluation as valid JSON matching the schema exactly.`;

// ── Pass 2: User-perspective judge (different lens) ──
const JUDGE_PASS2_PROMPT = `You are a quality reviewer evaluating AI responses from the USER'S PERSPECTIVE. Focus on whether the response actually HELPS the user achieve their goal.

Score each dimension from 1-5:
1 = Useless (user cannot accomplish their goal)
2 = Frustrating (partially helpful but creates confusion)
3 = Acceptable (user can proceed with some effort)
4 = Helpful (user can easily follow and succeed)
5 = Delightful (exceeds expectations, anticipates needs)

Evaluate these 5 dimensions:
1. ACCURACY: Would the user be misled by any claims? Are examples correct?
2. COMPLETENESS: Does the user have everything they need? Any follow-up questions required?
3. REASONING: Can the user follow the logic? Is the explanation clear?
4. ACTIONABILITY: Can the user immediately act on this? Are next steps obvious?
5. SAFETY: Would following this advice cause any harm? Are risks mentioned?

Think from the user's shoes. A technically correct but confusing response scores lower than a clear, practical one.
Return your evaluation as valid JSON matching the schema exactly.`;

const JUDGE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "quality_evaluation",
    strict: true,
    schema: {
      type: "object",
      properties: {
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Dimension name: accuracy, completeness, reasoning, actionability, or safety" },
              score: { type: "integer", description: "Score from 1-5" },
              rationale: { type: "string", description: "Brief explanation for the score (1-2 sentences)" },
            },
            required: ["name", "score", "rationale"],
            additionalProperties: false,
          },
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 strengths of the response",
        },
        improvements: {
          type: "array",
          items: { type: "string" },
          description: "Top 2-3 areas for improvement",
        },
      },
      required: ["dimensions", "strengths", "improvements"],
      additionalProperties: false,
    },
  },
};

const REQUIRED_DIMS = ["accuracy", "completeness", "reasoning", "actionability", "safety"];

/**
 * Run a single evaluation pass with the given system prompt.
 */
async function runEvaluationPass(
  systemPrompt: string,
  userQuery: string,
  assistantResponse: string,
  toolContext: string
): Promise<{ dimensions: QualityDimension[]; strengths: string[]; improvements: string[] } | null> {
  try {
    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Evaluate the following AI assistant response:

USER QUERY:
${userQuery.slice(0, 2000)}

ASSISTANT RESPONSE:
${assistantResponse.slice(0, 4000)}${toolContext}

Provide your evaluation as JSON.`,
        },
      ],
      response_format: JUDGE_SCHEMA,
    });

    const rawContent = result.choices?.[0]?.message?.content;
    if (!rawContent) return null;
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content);
    const dimensions: QualityDimension[] = (parsed.dimensions || []).map((d: any) => ({
      name: (d.name || "unknown").toLowerCase(),
      score: Math.max(1, Math.min(5, Math.round(d.score || 3))),
      rationale: d.rationale || "",
    }));

    // Ensure all 5 dimensions are present
    for (const dim of REQUIRED_DIMS) {
      if (!dimensions.find((d) => d.name === dim)) {
        dimensions.push({ name: dim, score: 3, rationale: "Not explicitly evaluated" });
      }
    }

    return {
      dimensions,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
    };
  } catch (err: any) {
    console.error("[QualityJudge] Pass failed:", err.message);
    return null;
  }
}

/**
 * Reconcile two evaluation passes into a single cross-validated report.
 * Uses the average of both passes, with agreement tracking.
 */
function reconcilePasses(
  pass1: { dimensions: QualityDimension[]; strengths: string[]; improvements: string[] },
  pass2: { dimensions: QualityDimension[]; strengths: string[]; improvements: string[] }
): {
  dimensions: QualityDimension[];
  strengths: string[];
  improvements: string[];
  averageAgreement: number;
  disagreement: boolean;
  pass1Overall: number;
  pass2Overall: number;
} {
  const reconciledDims: QualityDimension[] = [];
  let totalAgreement = 0;
  let hasDisagreement = false;

  for (const dimName of REQUIRED_DIMS) {
    const d1 = pass1.dimensions.find(d => d.name === dimName);
    const d2 = pass2.dimensions.find(d => d.name === dimName);
    const s1 = d1?.score ?? 3;
    const s2 = d2?.score ?? 3;
    const diff = Math.abs(s1 - s2);
    const agreement = 1 - (diff / 4); // 0 = max disagreement (4 points), 1 = perfect agreement

    if (diff > 1) hasDisagreement = true;
    totalAgreement += agreement;

    // Average the scores, round to nearest 0.5
    const avgScore = Math.round(((s1 + s2) / 2) * 2) / 2;

    reconciledDims.push({
      name: dimName,
      score: Math.round(avgScore), // Integer for the final score
      rationale: diff <= 1
        ? (d1?.rationale || d2?.rationale || "")
        : `[Cross-validated] Pass 1 (${s1}/5): ${d1?.rationale || "N/A"} | Pass 2 (${s2}/5): ${d2?.rationale || "N/A"}`,
      agreement,
    });
  }

  // Deduplicate and merge strengths/improvements
  const allStrengths = Array.from(new Set([...pass1.strengths, ...pass2.strengths])).slice(0, 4);
  const allImprovements = Array.from(new Set([...pass1.improvements, ...pass2.improvements])).slice(0, 4);

  const pass1Overall = pass1.dimensions.reduce((s, d) => s + d.score, 0) / pass1.dimensions.length;
  const pass2Overall = pass2.dimensions.reduce((s, d) => s + d.score, 0) / pass2.dimensions.length;

  return {
    dimensions: reconciledDims,
    strengths: allStrengths,
    improvements: allImprovements,
    averageAgreement: totalAgreement / REQUIRED_DIMS.length,
    disagreement: hasDisagreement,
    pass1Overall: Math.round(pass1Overall * 100) / 100,
    pass2Overall: Math.round(pass2Overall * 100) / 100,
  };
}

/**
 * Evaluate a response's quality using dual-pass cross-validation.
 *
 * Pass 1: Strict analytical judge (focuses on technical correctness)
 * Pass 2: User-perspective judge (focuses on practical helpfulness)
 *
 * Both passes run in parallel. Scores are reconciled with agreement tracking.
 *
 * @param userQuery - The original user query/prompt
 * @param assistantResponse - The assistant's response to evaluate
 * @param toolsUsed - Optional list of tools the agent used (for context)
 * @returns QualityReport with cross-validated scores, strengths, and improvements
 */
export async function evaluateResponseQuality(
  userQuery: string,
  assistantResponse: string,
  toolsUsed?: string[]
): Promise<QualityReport> {
  const toolContext = toolsUsed?.length
    ? `\n\nTools used during this response: ${toolsUsed.join(", ")}`
    : "";

  try {
    // Run both passes in parallel for efficiency
    const [pass1, pass2] = await Promise.all([
      runEvaluationPass(JUDGE_PASS1_PROMPT, userQuery, assistantResponse, toolContext),
      runEvaluationPass(JUDGE_PASS2_PROMPT, userQuery, assistantResponse, toolContext),
    ]);

    // If both passes succeed, reconcile
    if (pass1 && pass2) {
      const reconciled = reconcilePasses(pass1, pass2);
      const overallScore = reconciled.dimensions.reduce((s, d) => s + d.score, 0) / reconciled.dimensions.length;
      const flagged = reconciled.dimensions.some(d => d.score < 3);

      return {
        overallScore: Math.round(overallScore * 100) / 100,
        dimensions: reconciled.dimensions,
        strengths: reconciled.strengths,
        improvements: reconciled.improvements,
        flagged,
        evaluatedAt: new Date().toISOString(),
        crossValidation: {
          dualPass: true,
          averageAgreement: Math.round(reconciled.averageAgreement * 100) / 100,
          disagreement: reconciled.disagreement,
          pass1Overall: reconciled.pass1Overall,
          pass2Overall: reconciled.pass2Overall,
        },
      };
    }

    // If only one pass succeeds, use it with degraded cross-validation
    const singlePass = pass1 || pass2;
    if (singlePass) {
      const overallScore = singlePass.dimensions.reduce((s, d) => s + d.score, 0) / singlePass.dimensions.length;
      return {
        overallScore: Math.round(overallScore * 100) / 100,
        dimensions: singlePass.dimensions,
        strengths: singlePass.strengths,
        improvements: singlePass.improvements,
        flagged: singlePass.dimensions.some(d => d.score < 3),
        evaluatedAt: new Date().toISOString(),
        crossValidation: {
          dualPass: false,
          averageAgreement: 0,
          disagreement: false,
          pass1Overall: overallScore,
          pass2Overall: 0,
        },
      };
    }

    // Both passes failed
    return createFallbackReport("Both evaluation passes failed");
  } catch (err: any) {
    console.error("[QualityJudge] Evaluation failed:", err.message);
    return createFallbackReport(err.message);
  }
}

function createFallbackReport(reason: string): QualityReport {
  return {
    overallScore: 0,
    dimensions: [
      { name: "accuracy", score: 0, rationale: `Evaluation failed: ${reason}` },
      { name: "completeness", score: 0, rationale: "Not evaluated" },
      { name: "reasoning", score: 0, rationale: "Not evaluated" },
      { name: "actionability", score: 0, rationale: "Not evaluated" },
      { name: "safety", score: 0, rationale: "Not evaluated" },
    ],
    strengths: [],
    improvements: ["Quality evaluation could not be completed"],
    flagged: true,
    evaluatedAt: new Date().toISOString(),
    crossValidation: {
      dualPass: false,
      averageAgreement: 0,
      disagreement: false,
      pass1Overall: 0,
      pass2Overall: 0,
    },
  };
}

/**
 * Quick quality check — returns just the overall score (1-5).
 * Uses single-pass for speed (no cross-validation).
 */
export async function quickQualityScore(
  userQuery: string,
  assistantResponse: string
): Promise<number> {
  const toolContext = "";
  const pass = await runEvaluationPass(JUDGE_PASS1_PROMPT, userQuery, assistantResponse, toolContext);
  if (!pass) return 0;
  return Math.round((pass.dimensions.reduce((s, d) => s + d.score, 0) / pass.dimensions.length) * 100) / 100;
}
