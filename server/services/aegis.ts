/**
 * AEGIS Service — Pre/Post-Flight Pipeline
 *
 * Implements the full AEGIS middleware layer:
 * - Task classification (heuristic + LLM-enhanced)
 * - Semantic cache (SHA-256 prompt hashing)
 * - Pre-flight: classify → cache check → pattern/fragment retrieval → prompt optimization → cost estimation
 * - Post-flight: output validation → quality scoring → fragment extraction → lesson extraction
 *
 * Ported from atlas-hybrid/server/services/aegis.ts with adaptations for manus-next-app.
 */

import { createHash } from "crypto";
import * as db from "../db";

// ── Types ──

export interface TaskClassification {
  taskType: string;
  complexity: "trivial" | "simple" | "moderate" | "complex" | "expert";
  novelty: "routine" | "familiar" | "novel" | "unprecedented";
  confidence: number;
  estimatedTokens: number;
  estimatedCost: number;
}

export interface PreFlightResult {
  cached: boolean;
  response?: string;
  costSaved?: number;
  classification: TaskClassification;
  optimizedPrompt?: string;
  improvements?: string[];
  costEstimate?: number;
  tokensUsed?: number;
  sourcesIncluded?: number;
  sessionId?: number;
}

export interface PostFlightResult {
  validation: { isValid: boolean; issues: string[] };
  quality: QualityScores;
  fragments: number;
  lessons: number;
}

export interface QualityScores {
  completeness: number;
  accuracy: number;
  relevance: number;
  clarity: number;
  efficiency: number;
  overall: number;
}

// ── Task Classification ──

const TASK_TYPE_KEYWORDS: Record<string, string[]> = {
  code: ["code", "function", "implement", "debug", "refactor", "typescript", "javascript", "python", "api", "endpoint", "class", "method"],
  research: ["research", "analyze", "compare", "investigate", "study", "review", "survey", "literature", "paper"],
  writing: ["write", "draft", "compose", "essay", "article", "blog", "report", "document", "summary"],
  data: ["data", "csv", "json", "parse", "transform", "aggregate", "statistics", "chart", "visualization"],
  design: ["design", "ui", "ux", "layout", "wireframe", "mockup", "prototype", "css", "style"],
  planning: ["plan", "roadmap", "strategy", "timeline", "milestone", "schedule", "project"],
  conversation: ["chat", "help", "explain", "what", "how", "why", "tell me"],
};

const COMPLEXITY_THRESHOLDS = {
  trivial: 50,
  simple: 150,
  moderate: 500,
  complex: 1500,
  expert: Infinity,
};

export function classifyTask(prompt: string): TaskClassification {
  const lower = prompt.toLowerCase();
  const words = lower.split(/\s+/);
  const wordCount = words.length;

  // Determine task type by keyword matching
  let bestType = "conversation";
  let bestScore = 0;
  for (const [type, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  // Determine complexity by word count and keyword density
  let complexity: TaskClassification["complexity"] = "trivial";
  for (const [level, threshold] of Object.entries(COMPLEXITY_THRESHOLDS)) {
    if (wordCount <= threshold) {
      complexity = level as TaskClassification["complexity"];
      break;
    }
  }

  // Novelty heuristic: more specific/unique words = more novel
  const uniqueRatio = new Set(words).size / Math.max(words.length, 1);
  let novelty: TaskClassification["novelty"] = "routine";
  if (uniqueRatio > 0.9) novelty = "novel";
  else if (uniqueRatio > 0.75) novelty = "familiar";

  // Confidence based on keyword match strength
  const confidence = Math.min(bestScore / 3, 1);

  // Token estimation: ~1.3 tokens per word for input, 2-5x for output
  const estimatedTokens = Math.ceil(wordCount * 1.3);
  const outputMultiplier = complexity === "trivial" ? 2 : complexity === "simple" ? 3 : complexity === "moderate" ? 4 : 5;
  const estimatedCost = Math.ceil((estimatedTokens + estimatedTokens * outputMultiplier) * 0.003);

  return { taskType: bestType, complexity, novelty, confidence, estimatedTokens, estimatedCost };
}

// ── Prompt Optimization ──

export function optimizePrompt(prompt: string, taskType: string): { optimizedPrompt: string; improvements: string[] } {
  const improvements: string[] = [];
  let optimized = prompt;

  // Add task-type-specific framing if not already present
  if (taskType === "code" && !prompt.toLowerCase().includes("return")) {
    optimized = `${optimized}\n\nPlease provide complete, working code with proper error handling.`;
    improvements.push("Added code completeness instruction");
  }
  if (taskType === "research" && !prompt.toLowerCase().includes("source")) {
    optimized = `${optimized}\n\nCite sources and provide evidence for claims.`;
    improvements.push("Added source citation instruction");
  }
  if (taskType === "writing" && !prompt.toLowerCase().includes("tone")) {
    optimized = `${optimized}\n\nUse a professional, clear tone.`;
    improvements.push("Added tone guidance");
  }

  // Remove excessive whitespace
  const before = optimized.length;
  optimized = optimized.replace(/\s{3,}/g, "  ").trim();
  if (optimized.length < before) {
    improvements.push("Cleaned excessive whitespace");
  }

  return { optimizedPrompt: optimized, improvements };
}

// ── Semantic Cache ──

export function hashPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase().replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalized).digest("hex");
}

export async function checkCache(prompt: string): Promise<{ hit: boolean; response?: string; costSaved?: number }> {
  const hash = hashPrompt(prompt);
  const cached = await db.checkAegisCache(hash);
  if (cached) {
    return { hit: true, response: cached.response, costSaved: cached.costSavedPerHit };
  }
  return { hit: false };
}

export async function writeCache(prompt: string, response: string, taskType: string, costEstimate: number) {
  const hash = hashPrompt(prompt);
  const ttlHours = taskType === "conversation" ? 1 : taskType === "code" ? 24 : 12;
  await db.writeAegisCache({
    promptHash: hash,
    prompt,
    response,
    taskType,
    costSavedPerHit: costEstimate,
    expiresAt: new Date(Date.now() + ttlHours * 3600000),
  });
}

// ── Cost Estimation ──

export function estimateCost(classification: TaskClassification): number {
  const baseCost = classification.estimatedTokens * 0.003;
  const complexityMultiplier = {
    trivial: 1,
    simple: 1.5,
    moderate: 2.5,
    complex: 4,
    expert: 6,
  }[classification.complexity];
  return Math.ceil(baseCost * complexityMultiplier);
}

// ── Context Assembly ──

export async function assembleContext(
  optimizedPrompt: string,
  patterns: Awaited<ReturnType<typeof db.getPatterns>>,
  fragments: Awaited<ReturnType<typeof db.getFragments>>
): Promise<{ assembledPrompt: string; tokensUsed: number; sourcesIncluded: number }> {
  let assembled = optimizedPrompt;
  let sourcesIncluded = 0;

  // Inject relevant patterns as system guidance
  if (patterns.length > 0) {
    const patternContext = patterns.map((p) => `[Pattern: ${p.name}] ${p.description}`).join("\n");
    assembled = `${patternContext}\n\n${assembled}`;
    sourcesIncluded += patterns.length;
  }

  // Inject relevant fragments as reference material
  if (fragments.length > 0) {
    const fragmentContext = fragments.slice(0, 3).map((f) => `[Reference: ${f.fragmentType}] ${f.content.slice(0, 500)}`).join("\n");
    assembled = `${assembled}\n\n---\nRelevant context:\n${fragmentContext}`;
    sourcesIncluded += fragments.length;
  }

  const tokensUsed = Math.ceil(assembled.split(/\s+/).length * 1.3);
  return { assembledPrompt: assembled, tokensUsed, sourcesIncluded };
}

// ── Quality Scoring ──

export function scoreQuality(output: string, taskType: string): QualityScores {
  const length = output.length;
  const words = output.split(/\s+/).length;

  // Completeness: longer outputs tend to be more complete (with diminishing returns)
  const completeness = Math.min(Math.round((words / 200) * 100), 100);

  // Accuracy: presence of specific markers (code blocks, citations, numbers)
  let accuracy = 50;
  if (taskType === "code" && (output.includes("```") || output.includes("function") || output.includes("const "))) accuracy += 30;
  if (taskType === "research" && (output.includes("http") || output.includes("[") || /\d{4}/.test(output))) accuracy += 30;
  if (output.includes("error") || output.includes("Error")) accuracy -= 10;
  accuracy = Math.max(0, Math.min(accuracy, 100));

  // Relevance: hard to measure without the prompt, default to moderate
  const relevance = Math.min(70 + Math.round(words / 100), 100);

  // Clarity: sentence structure, paragraph breaks, formatting
  const hasParagraphs = (output.match(/\n\n/g) || []).length > 0;
  const hasFormatting = output.includes("**") || output.includes("##") || output.includes("- ");
  let clarity = 50;
  if (hasParagraphs) clarity += 20;
  if (hasFormatting) clarity += 15;
  if (words > 50 && words < 2000) clarity += 15;
  clarity = Math.min(clarity, 100);

  // Efficiency: conciseness relative to content
  const efficiency = words < 50 ? 90 : words < 500 ? 80 : words < 1500 ? 70 : 60;

  const overall = Math.round((completeness + accuracy + relevance + clarity + efficiency) / 5);

  return { completeness, accuracy, relevance, clarity, efficiency, overall };
}

// ── Output Validation ──

export function validateOutput(output: string, taskType: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!output || output.trim().length === 0) {
    issues.push("Empty output");
    return { isValid: false, issues };
  }

  if (output.length < 10) {
    issues.push("Output too short (< 10 chars)");
  }

  if (taskType === "code") {
    // Check for common code issues
    if (output.includes("TODO") || output.includes("FIXME")) {
      issues.push("Contains TODO/FIXME markers");
    }
    // Check for unclosed brackets (simple heuristic)
    const opens = (output.match(/\{/g) || []).length;
    const closes = (output.match(/\}/g) || []).length;
    if (Math.abs(opens - closes) > 2) {
      issues.push("Potentially unclosed brackets");
    }
  }

  if (taskType === "research" && output.length < 200) {
    issues.push("Research output seems too brief");
  }

  if (taskType === "research" && !output.includes("http") && !output.includes("[") && output.length > 500) {
    issues.push("Research output lacks citations or source references");
  }

  if (taskType === "writing" && output.length < 100) {
    issues.push("Writing output seems too brief for the task type");
  }

  // Check for self-referential non-answers
  const nonAnswerPatterns = [
    "I cannot", "I'm unable", "I don't have access",
    "I apologize", "My apologies", "I fell short",
  ];
  const hasNonAnswer = nonAnswerPatterns.some(p => output.toLowerCase().includes(p.toLowerCase()));
  if (hasNonAnswer && output.length < 300) {
    issues.push("Response appears to be a refusal rather than a deliverable");
  }

  // Check for incomplete code implementations
  if (taskType === "code" && output.includes("...") && !output.includes("```")) {
    issues.push("Contains ellipsis suggesting incomplete implementation");
  }

  return { isValid: issues.length === 0, issues };
}

// ── Fragment Extraction ──

export function fragmentOutput(output: string, taskType: string): { fragments: Array<{ type: string; content: string; hash: string }> } {
  const fragments: Array<{ type: string; content: string; hash: string }> = [];

  // Extract code blocks
  const codeBlocks = output.match(/```[\s\S]*?```/g) || [];
  for (const block of codeBlocks.slice(0, 5)) {
    const content = block.replace(/```\w*\n?/g, "").trim();
    if (content.length > 20) {
      fragments.push({
        type: "code",
        content,
        hash: createHash("sha256").update(content).digest("hex").slice(0, 16),
      });
    }
  }

  // Extract key sentences (first sentence of each paragraph)
  const paragraphs = output.split(/\n\n+/).filter((p) => p.trim().length > 50);
  for (const para of paragraphs.slice(0, 3)) {
    const firstSentence = para.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length > 20) {
      fragments.push({
        type: taskType,
        content: firstSentence,
        hash: createHash("sha256").update(firstSentence).digest("hex").slice(0, 16),
      });
    }
  }

  return { fragments };
}

// ── Lesson Extraction ──

export function extractLessons(sessionMeta: {
  taskType: string;
  qualityScore: number;
  costCredits: number;
  latencyMs: number;
  cacheHit: boolean;
  status: string;
}): Array<{ lessonType: string; description: string; impact: string }> {
  const lessons: Array<{ lessonType: string; description: string; impact: string }> = [];

  if (sessionMeta.qualityScore < 40) {
    lessons.push({
      lessonType: "quality_issue",
      description: `Low quality score (${sessionMeta.qualityScore}) for ${sessionMeta.taskType} task. Consider adding more specific instructions or examples.`,
      impact: "high",
    });
  }

  if (sessionMeta.costCredits > 100) {
    lessons.push({
      lessonType: "cost_optimization",
      description: `High cost (${sessionMeta.costCredits} credits) for ${sessionMeta.taskType} task. Consider caching or decomposition.`,
      impact: "medium",
    });
  }

  if (sessionMeta.latencyMs > 30000) {
    lessons.push({
      lessonType: "latency_issue",
      description: `High latency (${sessionMeta.latencyMs}ms) for ${sessionMeta.taskType} task. Consider simpler models or caching.`,
      impact: "medium",
    });
  }

  if (sessionMeta.cacheHit) {
    lessons.push({
      lessonType: "cache_effective",
      description: `Cache hit for ${sessionMeta.taskType} — caching strategy is working.`,
      impact: "low",
    });
  }

  if (sessionMeta.status === "failed") {
    lessons.push({
      lessonType: "failure_analysis",
      description: `Task failed for ${sessionMeta.taskType}. Review error handling and retry logic.`,
      impact: "high",
    });
  }

  return lessons;
}

// ── Normalization ──

function normalizeQualityScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Execution Plan Generation ──

/**
 * Generate a lightweight execution plan for complex tasks.
 * Only triggers for moderate+ complexity — trivial/simple tasks don't need planning overhead.
 * Returns a structured plan string to inject into the prompt, or null if no plan needed.
 */
export function generateExecutionPlan(prompt: string, classification: TaskClassification): string | null {
  // Only plan for moderate+ complexity
  if (classification.complexity === "trivial" || classification.complexity === "simple") {
    return null;
  }

  const lower = prompt.toLowerCase();
  const steps: string[] = [];

  // Task-type-specific planning templates
  switch (classification.taskType) {
    case "code":
      steps.push("1. Understand requirements and constraints");
      if (lower.includes("test") || lower.includes("bug") || lower.includes("fix")) {
        steps.push("2. Reproduce the issue or identify the failing test");
        steps.push("3. Implement the fix with proper error handling");
        steps.push("4. Verify the fix doesn't introduce regressions");
      } else {
        steps.push("2. Design the solution architecture (interfaces, data flow)");
        steps.push("3. Implement core logic with proper types and error handling");
        steps.push("4. Add edge case handling and input validation");
      }
      steps.push("5. Self-test: review output for correctness, completeness, and style");
      break;

    case "research":
      steps.push("1. Identify key research questions and sub-topics");
      steps.push("2. Search multiple sources (web_search + read_webpage on 3+ URLs)");
      steps.push("3. Cross-reference findings and identify consensus vs disagreement");
      steps.push("4. Synthesize into structured deliverable with citations");
      steps.push("5. Verify claims against sources; flag any unverified assertions");
      break;

    case "writing":
      steps.push("1. Determine audience, tone, and format requirements");
      steps.push("2. Create outline with key sections and arguments");
      steps.push("3. Draft each section with supporting evidence");
      steps.push("4. Review for coherence, flow, and completeness");
      steps.push("5. Polish: tighten prose, fix transitions, ensure consistent voice");
      break;

    case "data":
      steps.push("1. Understand data structure and identify quality issues");
      steps.push("2. Clean and normalize data (handle nulls, duplicates, types)");
      steps.push("3. Perform requested analysis or transformation");
      steps.push("4. Validate results against expected patterns");
      steps.push("5. Present findings with appropriate visualizations");
      break;

    case "design":
      steps.push("1. Clarify design requirements and constraints");
      steps.push("2. Establish design system (colors, typography, spacing)");
      steps.push("3. Create layout structure with responsive breakpoints");
      steps.push("4. Implement component details and interactions");
      steps.push("5. Review for accessibility, consistency, and visual polish");
      break;

    case "planning":
      steps.push("1. Define scope, objectives, and success criteria");
      steps.push("2. Break down into phases with dependencies");
      steps.push("3. Identify risks, constraints, and resource requirements");
      steps.push("4. Create timeline with milestones and checkpoints");
      steps.push("5. Document assumptions and decision rationale");
      break;

    default:
      // Generic plan for conversation/other
      if (classification.complexity === "complex" || classification.complexity === "expert") {
        steps.push("1. Parse the request into distinct sub-questions");
        steps.push("2. Address each sub-question with appropriate tools");
        steps.push("3. Synthesize sub-answers into a coherent response");
        steps.push("4. Verify completeness against original request");
      } else {
        return null; // Moderate conversation doesn't need a plan
      }
  }

  if (steps.length === 0) return null;

  // Add self-verification step for expert-level tasks
  if (classification.complexity === "expert") {
    steps.push(`${steps.length + 1}. SELF-VERIFY: Re-read the original request and confirm every aspect is addressed`);
  }

  return `## EXECUTION PLAN (Auto-generated for ${classification.complexity} ${classification.taskType} task)\n${steps.join("\n")}\n\nFollow this plan sequentially. If a step reveals new information that changes the approach, adapt but document why.`;
}

// ═══════════════════════════════════════════════════════════════════════
// Main Pipeline Functions
// ═══════════════════════════════════════════════════════════════════════

/**
 * Pre-flight pipeline: classify → cache check → pattern/fragment retrieval → prompt optimization → cost estimation → context assembly
 */
export async function runPreFlight(prompt: string, userId: number, taskExternalId?: string): Promise<PreFlightResult> {
  const classification = classifyTask(prompt);

  // Check semantic cache
  const cacheResult = await checkCache(prompt);
  if (cacheResult.hit) {
    // Record the cached session
    const sessionId = await db.createAegisSession({
      userId,
      taskExternalId,
      taskType: classification.taskType,
      complexity: classification.complexity,
      cacheHit: 1,
      costCredits: 0,
      status: "cached",
    });
    return {
      cached: true,
      response: cacheResult.response,
      costSaved: cacheResult.costSaved,
      classification,
      sessionId,
    };
  }

  // Retrieve relevant patterns and fragments
  const relevantPatterns = await db.getPatterns({
    patternType: classification.taskType as any,
    isActive: true,
    limit: 3,
  });
  const relevantFragments = await db.getFragments({
    fragmentType: classification.taskType,
    limit: 3,
  });

  // Optimize prompt
  const { optimizedPrompt, improvements } = optimizePrompt(prompt, classification.taskType);

  // Inject execution plan for complex tasks
  const planInjection = generateExecutionPlan(prompt, classification);
  const promptWithPlan = planInjection
    ? `${optimizedPrompt}\n\n${planInjection}`
    : optimizedPrompt;
  if (planInjection) improvements.push("Injected execution plan for complex task");

  // Estimate cost
  const costEstimate = estimateCost(classification);

  // Assemble context
  const context = await assembleContext(promptWithPlan, relevantPatterns, relevantFragments);

  // Create session record
  const sessionId = await db.createAegisSession({
    userId,
    taskExternalId,
    taskType: classification.taskType,
    complexity: classification.complexity,
    cacheHit: 0,
    costCredits: costEstimate,
    status: "pending",
  });

  return {
    cached: false,
    classification,
    optimizedPrompt: context.assembledPrompt,
    improvements,
    costEstimate,
    tokensUsed: context.tokensUsed,
    sourcesIncluded: context.sourcesIncluded,
    sessionId,
  };
}

/**
 * Post-flight pipeline: output validation → quality scoring → fragment extraction → lesson extraction → DB persistence
 */
export async function runPostFlight(
  sessionId: number,
  output: string,
  taskType: string,
  costCredits: number
): Promise<PostFlightResult> {
  const validation = validateOutput(output, taskType);
  const quality = scoreQuality(output, taskType);
  const fragResult = fragmentOutput(output, taskType);
  const lessonsList = extractLessons({
    taskType,
    qualityScore: quality.overall,
    costCredits,
    latencyMs: 0,
    cacheHit: false,
    status: validation.isValid ? "completed" : "failed",
  });

  // Persist quality score
  await db.createQualityScore({
    sessionId,
    completeness: normalizeQualityScore(quality.completeness),
    accuracy: normalizeQualityScore(quality.accuracy),
    relevance: normalizeQualityScore(quality.relevance),
    clarity: normalizeQualityScore(quality.clarity),
    efficiency: normalizeQualityScore(quality.efficiency),
    overallScore: normalizeQualityScore(quality.overall),
    validationPassed: validation.isValid ? 1 : 0,
    validationErrors: validation.issues,
  });

  // Persist fragments
  for (const frag of fragResult.fragments) {
    await db.createFragment({
      sessionId,
      fragmentType: frag.type,
      content: frag.content,
      contentHash: frag.hash,
      taskTypes: [taskType],
    });
  }

  // Persist lessons
  for (const lesson of lessonsList) {
    await db.createLesson({
      sessionId,
      lessonType: lesson.lessonType,
      taskType,
      description: lesson.description,
      impact: lesson.impact,
    });
  }

  // Update session status
  await db.updateAegisSession(sessionId, {
    status: validation.isValid ? "completed" : "failed",
    costCredits,
  });

  return { validation, quality, fragments: fragResult.fragments.length, lessons: lessonsList.length };
}
