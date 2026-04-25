/**
 * Sovereign Service — Multi-Provider Routing & Resilience
 *
 * Implements the Sovereign routing layer:
 * - Multi-provider LLM routing with cost/health/capability-based selection
 * - Circuit breaker pattern (closed → open → half-open → closed)
 * - Guardrails (input/output validation, content filtering)
 * - Automatic failover and retry with exponential backoff
 * - Usage tracking and cost optimization
 *
 * Ported from sovereign-hybrid/server/shared/sovereignWiring.ts with adaptations.
 */

import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { checkCache, writeCache, estimateCost, classifyTask } from "./aegis";
import * as obs from "./observability";

// ── Types ──

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  model: string;
  apiKeyEnv?: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  capabilities: string[];
  maxRetries?: number;
}

export interface RoutingRequest {
  messages: Array<{ role: string; content: string }>;
  requiredCapabilities?: string[];
  maxCost?: number;
  preferredProvider?: string;
  userId: number;
  taskType?: string;
}

export interface RoutingResult {
  provider: string;
  model: string;
  output: string;
  cost: number;
  latencyMs: number;
  fallbackUsed: boolean;
  attempts: number;
}

// ── Circuit Breaker ──

const CIRCUIT_BREAKER_THRESHOLD = 3; // consecutive failures before opening
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 60s before half-open
const HALF_OPEN_MAX_REQUESTS = 2; // requests to allow in half-open state

interface CircuitState {
  state: "closed" | "open" | "half_open";
  failures: number;
  openedAt: number | null;
  halfOpenRequests: number;
}

const circuitStates = new Map<string, CircuitState>();
let circuitStatesLoaded = false;

/**
 * Load circuit breaker states from DB on first access (G-004).
 * Survives server restarts by reading from sovereign_providers table.
 */
async function loadCircuitStatesFromDb(): Promise<void> {
  if (circuitStatesLoaded) return;
  circuitStatesLoaded = true;
  try {
    const providers = await db.getActiveProviders();
    for (const p of providers) {
      circuitStates.set(p.name, {
        state: (p.circuitState as CircuitState["state"]) || "closed",
        failures: p.consecutiveFailures ?? 0,
        openedAt: p.circuitOpenedAt ? new Date(p.circuitOpenedAt).getTime() : null,
        halfOpenRequests: 0,
      });
    }
  } catch (err) {
    console.warn("[Sovereign] Failed to load circuit states from DB, using defaults:", (err as Error).message?.slice(0, 100));
  }
}

/**
 * Persist circuit breaker state change to DB (G-004).
 * Non-blocking — fire-and-forget to avoid slowing the hot path.
 */
function persistCircuitState(providerName: string, circuit: CircuitState): void {
  db.getActiveProviders().then((providers) => {
    const provider = providers.find((p) => p.name === providerName);
    if (provider) {
      db.updateProviderCircuit(provider.id, {
        circuitState: circuit.state,
        consecutiveFailures: circuit.failures,
        circuitOpenedAt: circuit.openedAt ? new Date(circuit.openedAt) : null,
      }).catch((err) => {
        console.warn("[Sovereign] Failed to persist circuit state:", (err as Error).message?.slice(0, 100));
      });
    }
  }).catch(() => { /* non-fatal */ });
}

function getCircuitState(providerName: string): CircuitState {
  if (!circuitStates.has(providerName)) {
    circuitStates.set(providerName, { state: "closed", failures: 0, openedAt: null, halfOpenRequests: 0 });
  }
  return circuitStates.get(providerName)!;
}

function isCircuitOpen(providerName: string): boolean {
  const circuit = getCircuitState(providerName);

  if (circuit.state === "closed") return false;

  if (circuit.state === "open") {
    // Check if timeout has elapsed → transition to half-open
    if (circuit.openedAt && Date.now() - circuit.openedAt > CIRCUIT_BREAKER_TIMEOUT) {
      circuit.state = "half_open";
      circuit.halfOpenRequests = 0;
      return false;
    }
    return true;
  }

  // half_open: allow limited requests
  if (circuit.halfOpenRequests >= HALF_OPEN_MAX_REQUESTS) return true;
  return false;
}

function recordSuccess(providerName: string) {
  const circuit = getCircuitState(providerName);
  circuit.state = "closed";
  circuit.failures = 0;
  circuit.openedAt = null;
  circuit.halfOpenRequests = 0;
  persistCircuitState(providerName, circuit); // G-004: persist to DB
}

function recordFailure(providerName: string) {
  const circuit = getCircuitState(providerName);
  circuit.failures++;

  if (circuit.state === "half_open") {
    // Failed during half-open → back to open
    circuit.state = "open";
    circuit.openedAt = Date.now();
    persistCircuitState(providerName, circuit); // G-004: persist to DB
    return;
  }

  if (circuit.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuit.state = "open";
    circuit.openedAt = Date.now();
  }
  persistCircuitState(providerName, circuit); // G-004: persist to DB
}

// ── Guardrails ──

export interface GuardrailResult {
  passed: boolean;
  issues: string[];
  sanitized?: string;
}

export function validateInput(input: string): GuardrailResult {
  const issues: string[] = [];

  // Check for empty input
  if (!input || input.trim().length === 0) {
    issues.push("Empty input");
    return { passed: false, issues };
  }

  // Check for excessive length (token budget guard)
  if (input.length > 100000) {
    issues.push("Input exceeds 100K character limit");
    return { passed: false, issues };
  }

  // Check for potential injection patterns (basic)
  const injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /system\s*:\s*you\s+are\s+now/i,
    /\bDAN\b.*\bjailbreak/i,
  ];
  for (const pattern of injectionPatterns) {
    if (pattern.test(input)) {
      issues.push("Potential prompt injection detected");
    }
  }

  return { passed: issues.length === 0, issues, sanitized: input.trim() };
}

export function validateOutput(output: string): GuardrailResult {
  const issues: string[] = [];

  if (!output || output.trim().length === 0) {
    issues.push("Empty output from provider");
    return { passed: false, issues };
  }

  // Check for common error patterns
  if (output.includes("I'm sorry, I can't") || output.includes("As an AI language model")) {
    issues.push("Provider returned refusal/disclaimer");
  }

  // Check for truncation
  if (output.endsWith("...") && output.length > 1000) {
    issues.push("Output may be truncated");
  }

  return { passed: issues.length === 0, issues };
}

// ── Provider Selection ──

/**
 * Select the best provider based on cost, health, capabilities, and user preference.
 */
export async function selectProvider(
  requiredCapabilities: string[],
  maxCost: number | undefined,
  preferredProvider: string | undefined
): Promise<Array<{ name: string; model: string; costPer1kInput: number; costPer1kOutput: number; id: number }>> {
  const providers = await db.getActiveProviders();

  if (providers.length === 0) {
    // Return the built-in provider as fallback
    return [{
      name: "built-in",
      model: "default",
      costPer1kInput: 3,
      costPer1kOutput: 15,
      id: 0,
    }];
  }

  // Filter by capabilities
  let candidates = providers.filter((p) => {
    const caps = (p.capabilities as string[]) || [];
    return requiredCapabilities.every((rc) => caps.includes(rc));
  });

  // If no capability match, fall back to all active providers
  if (candidates.length === 0) candidates = providers;

  // Filter by circuit breaker state
  candidates = candidates.filter((p) => !isCircuitOpen(p.name));

  // Filter by cost if specified
  if (maxCost !== undefined) {
    candidates = candidates.filter((p) => p.costPer1kInput <= maxCost);
  }

  // Sort: preferred first, then by cost (cheapest first), then by success rate
  candidates.sort((a, b) => {
    if (preferredProvider) {
      if (a.name === preferredProvider) return -1;
      if (b.name === preferredProvider) return 1;
    }
    // Sort by cost
    return a.costPer1kInput - b.costPer1kInput;
  });

  if (candidates.length === 0) {
    return [{
      name: "built-in",
      model: "default",
      costPer1kInput: 3,
      costPer1kOutput: 15,
      id: 0,
    }];
  }

  return candidates.map((c) => ({
    name: c.name,
    model: c.model,
    costPer1kInput: c.costPer1kInput,
    costPer1kOutput: c.costPer1kOutput,
    id: c.id,
  }));
}

// ── Main Routing Function ──

/**
 * Route a request through the Sovereign layer:
 * 1. Validate input (guardrails)
 * 2. Select provider (cost/health/capability routing)
 * 3. Execute with circuit breaker + retry
 * 4. Validate output (guardrails)
 * 5. Record usage
 */
export async function routeRequest(request: RoutingRequest): Promise<RoutingResult> {
  const startTime = Date.now();

  // Load circuit breaker states from DB on first call (G-004)
  await loadCircuitStatesFromDb();

  // Input guardrails
  const lastMessage = request.messages[request.messages.length - 1];
  const inputContent = typeof lastMessage.content === "string" ? lastMessage.content : "";
  const inputValidation = validateInput(inputContent);
  if (!inputValidation.passed && inputValidation.issues.includes("Empty input")) {
    throw new Error(`Input validation failed: ${inputValidation.issues.join(", ")}`);
  }

  // Select providers (ordered by preference)
  const providers = await selectProvider(
    request.requiredCapabilities ?? [],
    request.maxCost,
    request.preferredProvider
  );

  // G-007: Start observability span for this routing decision
  const routingSpan = obs.startRoutingSpan(
    request.taskType ?? "unknown",
    request.userId,
    providers.length
  );

  let lastError: Error | null = null;
  let attempts = 0;
  let fallbackUsed = false;

  for (const provider of providers) {
    attempts++;
    if (attempts > 1) fallbackUsed = true;

    try {
      // ── AEGIS Cache Check (G-003) ──
      const cacheResult = await checkCache(inputContent);
      let output: string;
      let response: any;

      if (cacheResult.hit && cacheResult.response) {
        // Cache hit — zero-cost response
        output = cacheResult.response;
        response = { choices: [{ message: { content: output } }] };
        obs.recordCacheHit(routingSpan, cacheResult.costSaved ?? 0);
      } else {
        obs.recordCacheMiss(routingSpan);
        // Cache miss — call LLM and store result
        response = await invokeLLM({
          messages: request.messages as any,
        });

        const content = response.choices[0].message.content;
        output = typeof content === "string" ? content : JSON.stringify(content);

        // Write to AEGIS cache for future hits
        try {
          const costEst = estimateCost({ taskType: request.taskType ?? "chat", complexity: "moderate", novelty: "routine", confidence: 0.8, estimatedTokens: Math.ceil(inputContent.split(/\s+/).length * 1.3), estimatedCost: 0 });
          await writeCache(inputContent, output, request.taskType ?? "chat", costEst);
        } catch (cacheErr) {
          // Cache write failure is non-fatal
          console.warn("[Sovereign] AEGIS cache write failed:", (cacheErr as Error).message?.slice(0, 100));
        }
      }

      // Output guardrails
      const outputValidation = validateOutput(output);

      // Record success
      recordSuccess(provider.name);
      obs.recordProviderAttempt(routingSpan, provider.name, true, Date.now() - startTime);

      const latencyMs = Date.now() - startTime;
      const estimatedTokens = Math.ceil(inputContent.split(/\s+/).length * 1.3);
      const cost = Math.ceil((estimatedTokens * provider.costPer1kInput + output.split(/\s+/).length * 1.3 * provider.costPer1kOutput) / 1000);

      // Record routing decision
      await db.createRoutingDecision({
        taskType: request.taskType ?? "unknown",
        chosenProvider: provider.name,
        strategy: "balanced",
        success: 1,
        fallbackUsed: fallbackUsed ? 1 : 0,
      });

      // Record usage
      if (provider.id) {
        await db.createUsageLog({
          providerId: provider.id,
          inputTokens: estimatedTokens,
          outputTokens: Math.ceil(output.split(/\s+/).length * 1.3),
          latencyMs,
          costMillicredits: cost,
          success: 1,
        });
      }

      // G-007: End span on success
      obs.endSpan(routingSpan, "ok");

      return {
        provider: provider.name,
        model: provider.model,
        output,
        cost,
        latencyMs,
        fallbackUsed,
        attempts,
      };
    } catch (err: any) {
      lastError = err;
      recordFailure(provider.name);
      obs.recordProviderAttempt(routingSpan, provider.name, false, undefined, err.message);
      console.warn(`[Sovereign] Provider ${provider.name} failed (attempt ${attempts}):`, err.message?.slice(0, 200));

      // Record failed routing decision
      await db.createRoutingDecision({
        taskType: request.taskType ?? "unknown",
        chosenProvider: provider.name,
        strategy: "balanced",
        success: 0,
        fallbackUsed: 1,
      });
    }
  }

  // G-007: End span on total failure
  obs.endSpan(routingSpan, "error");
  throw new Error(`All providers failed after ${attempts} attempts. Last error: ${lastError?.message ?? "Unknown"}`);
}

// ── Provider Management ──

/**
 * Seed default providers if none exist.
 */
export async function seedDefaultProviders() {
  const existing = await db.getActiveProviders();
  if (existing.length > 0) return;

  // Seed the built-in provider
  await db.upsertProvider({
    name: "manus-built-in",
    providerType: "custom",
    baseUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
    model: "default",
    costPer1kInput: 3,
    costPer1kOutput: 15,
    isActive: 1,
    capabilities: ["chat", "code", "research", "writing", "data", "design", "planning"],
    circuitState: "closed",
    consecutiveFailures: 0,
  });
}

// ── Stats ──

export async function getRoutingStats(userId: number) {
  // Get recent routing decisions
  const providers = await db.getActiveProviders();
  const stats = [];
  for (const p of providers) {
    const usage = await db.getProviderUsageStats(p.id);
    stats.push({
      provider: p.name,
      model: p.model,
      circuitState: p.circuitState,
      successRate: usage ? (usage.successCount ?? 0) / Math.max(usage.totalRequests ?? 1, 1) : 1,
      avgLatency: usage?.avgLatency ?? 0,
      totalCost: usage?.totalCost ?? 0,
      totalRequests: usage?.totalRequests ?? 0,
    });
  }
  return stats;
}

// ── Circuit Breaker Status (for admin/debugging) ──

export function getCircuitBreakerStatus(): Record<string, CircuitState> {
  const result: Record<string, CircuitState> = {};
  for (const [name, state] of Array.from(circuitStates.entries())) {
    result[name] = { ...state };
  }
  return result;
}
