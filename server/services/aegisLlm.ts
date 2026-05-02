/**
 * AEGIS-Wrapped LLM — Cache-aware, quality-tracked LLM invocation
 *
 * Wraps the core invokeLLM with AEGIS pre/post-flight pipeline:
 * 1. Pre-flight: classify → cache check → prompt optimization → context assembly
 * 2. If cache hit: return cached response (zero cost)
 * 3. If cache miss: call invokeLLM → post-flight: validate → score → extract → cache
 *
 * Usage:
 *   import { invokeWithAegis } from "../services/aegisLlm";
 *   const result = await invokeWithAegis({ messages, userId });
 */

import { invokeLLM, type InvokeParams, type InvokeResult, type Message } from "../_core/llm";
import * as aegis from "./aegis";
import { routeRequest, type RoutingRequest } from "./sovereign";
import * as db from "../db";

export interface AegisInvokeParams extends InvokeParams {
  /** User ID for session tracking. Required for AEGIS pipeline. */
  userId: number;
  /** Optional external task ID for correlation. */
  taskExternalId?: string;
  /** Skip cache check (force fresh LLM call). Default: false. */
  skipCache?: boolean;
  /** Skip post-flight quality scoring. Default: false. */
  skipPostFlight?: boolean;
  /** Use Sovereign routing for provider selection. Default: false (uses direct invokeLLM). */
  useSovereignRouting?: boolean;
  /** Task type hint for Sovereign routing (e.g., 'research', 'code', 'chat'). */
  taskType?: string;
}

export interface AegisInvokeResult {
  /** The LLM result (or synthesized result from cache). */
  result: InvokeResult;
  /** Whether the response came from cache. */
  cached: boolean;
  /** AEGIS session ID for tracking. */
  sessionId?: number;
  /** Cost saved if cache hit (in credits). */
  costSaved?: number;
  /** Quality scores from post-flight (if not skipped). */
  quality?: aegis.QualityScores;
  /** Task classification from pre-flight. */
  classification?: aegis.TaskClassification;
  /** Prompt improvements applied. */
  improvements?: string[];
}

/**
 * Extract the user prompt text from messages array.
 * Takes the last user message's text content.
 */
function extractUserPrompt(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "user") {
      if (typeof msg.content === "string") return msg.content;
      if (Array.isArray(msg.content)) {
        const textPart = msg.content.find((p) => typeof p === "string" || (typeof p === "object" && p.type === "text"));
        if (typeof textPart === "string") return textPart;
        if (textPart && "text" in textPart) return textPart.text;
      }
    }
  }
  return "";
}

/**
 * Synthesize an InvokeResult from a cached response string.
 */
function synthesizeCachedResult(cachedResponse: string): InvokeResult {
  return {
    id: `aegis-cache-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: "aegis-cache",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: cachedResponse,
        },
        finish_reason: "cached",
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

/**
 * Invoke LLM with AEGIS pre/post-flight pipeline.
 *
 * This is the primary entry point for LLM calls that should benefit from
 * caching, quality tracking, and continuous improvement.
 */
export async function invokeWithAegis(params: AegisInvokeParams): Promise<AegisInvokeResult> {
  const { userId, taskExternalId, skipCache, skipPostFlight, ...llmParams } = params;
  const userPrompt = extractUserPrompt(llmParams.messages);

  // ── Pre-flight ──
  const preFlight = await aegis.runPreFlight(userPrompt, userId, taskExternalId);

  // Cache hit → return immediately
  if (preFlight.cached && preFlight.response && !skipCache) {
    return {
      result: synthesizeCachedResult(preFlight.response),
      cached: true,
      sessionId: preFlight.sessionId,
      costSaved: preFlight.costSaved,
      classification: preFlight.classification,
    };
  }

  // ── LLM Call ──
  // Use the optimized prompt from pre-flight if available
  const messagesForLLM = preFlight.optimizedPrompt
    ? llmParams.messages.map((msg, idx) => {
        // Replace the last user message with the optimized prompt
        if (msg.role === "user" && idx === llmParams.messages.length - 1) {
          return { ...msg, content: preFlight.optimizedPrompt! };
        }
        return msg;
      })
    : llmParams.messages;

  // ── Provider Selection: Sovereign routing or direct invokeLLM ──
  let llmResult: InvokeResult;
  if (params.useSovereignRouting) {
    try {
      // Check if Sovereign has configured providers
      const providers = await db.getActiveProviders();
      if (providers && providers.length > 0) {
        const routingRequest: RoutingRequest = {
          messages: messagesForLLM.map(m => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          })),
          userId,
          taskType: params.taskType ?? preFlight.classification?.taskType ?? "chat",
        };
        const routingResult = await routeRequest(routingRequest);
        // Synthesize InvokeResult from Sovereign output
        llmResult = {
          id: `sovereign-${Date.now()}`,
          created: Math.floor(Date.now() / 1000),
          model: routingResult.model,
          choices: [{
            index: 0,
            message: { role: "assistant", content: routingResult.output },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
      } else {
        // No providers configured — fall back to direct invokeLLM
        llmResult = await invokeLLM({ ...llmParams, messages: messagesForLLM });
      }
    } catch (sovereignErr: any) {
      // Sovereign routing failed — graceful fallback to direct invokeLLM
      console.warn(`[AEGIS] Sovereign routing failed, falling back to direct LLM: ${sovereignErr.message?.slice(0, 100)}`);
      llmResult = await invokeLLM({ ...llmParams, messages: messagesForLLM });
    }
  } else {
    llmResult = await invokeLLM({ ...llmParams, messages: messagesForLLM });
  }

  // ── Post-flight ──
  let quality: aegis.QualityScores | undefined;
  if (!skipPostFlight && preFlight.sessionId) {
    const rawContent = llmResult.choices[0]?.message?.content;
    const outputText: string =
      typeof rawContent === "string"
        ? rawContent
        : rawContent != null
          ? JSON.stringify(rawContent)
          : "";

    const postFlight = await aegis.runPostFlight(
      preFlight.sessionId,
      outputText,
      preFlight.classification.taskType,
      preFlight.costEstimate ?? 0
    );
    quality = postFlight.quality;

    // Write to cache for future hits (only if quality is acceptable)
    if (postFlight.quality.overall >= 40 && outputText.length > 0) {
      await aegis.writeCache(
        userPrompt,
        outputText,
        preFlight.classification.taskType,
        preFlight.costEstimate ?? 0
      );
    }
  }

  return {
    result: llmResult,
    cached: false,
    sessionId: preFlight.sessionId,
    classification: preFlight.classification,
    improvements: preFlight.improvements,
    quality,
  };
}
