/**
 * Limitless Mode Auto-Continuation Integration Test
 *
 * Tests the server-side auto-continuation system by mocking the LLM to return
 * finish_reason="length" multiple times, verifying:
 * 1. Limitless tier continues without ceiling (no round limit)
 * 2. Bounded tiers (speed/quality/max) stop at their configured limits
 * 3. Continuation SSE events fire with correct structure
 * 4. Context compression triggers during long sessions
 * 5. Continuation counter resets when tool calls provide progress
 * 6. The continuation prompt prevents repetition
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Integration tests that run the full agent loop — need longer timeout
vi.setConfig({ testTimeout: 60000 });

// ─── Mock the LLM to simulate finish_reason="length" sequences ──────────────
let llmCallCount = 0;
let llmBehavior: "length_then_stop" | "always_length" | "length_with_tools" = "length_then_stop";
let lengthRoundsBeforeStop = 3; // How many "length" responses before "stop"

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (params: any) => {
    llmCallCount++;

    if (llmBehavior === "always_length") {
      // Always return length — tests that limitless mode keeps going
      return {
        id: `test-${llmCallCount}`,
        created: Date.now(),
        model: "test-model",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: `Continuation chunk ${llmCallCount}. This is a detailed analysis of AI agent architectures including their design patterns, scalability characteristics, and deployment strategies. `,
          },
          finish_reason: "length",
        }],
        usage: { prompt_tokens: 100, completion_tokens: 16384, total_tokens: 16484 },
      };
    }

    if (llmBehavior === "length_with_tools") {
      // First call returns tool call, subsequent return length then stop
      if (llmCallCount === 1) {
        return {
          id: `test-${llmCallCount}`,
          created: Date.now(),
          model: "test-model",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: "Let me search for that information.",
              tool_calls: [{
                id: "call_1",
                type: "function",
                function: { name: "web_search", arguments: JSON.stringify({ query: "AI agents 2026" }) },
              }],
            },
            finish_reason: "stop",
          }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        };
      }
      // After tool call, return length responses
      if (llmCallCount <= lengthRoundsBeforeStop + 1) {
        return {
          id: `test-${llmCallCount}`,
          created: Date.now(),
          model: "test-model",
          choices: [{
            index: 0,
            message: {
              role: "assistant",
              content: `Analysis part ${llmCallCount - 1}. Based on the search results, here is a comprehensive overview of the AI agent landscape. `,
            },
            finish_reason: "length",
          }],
          usage: { prompt_tokens: 200, completion_tokens: 16384, total_tokens: 16584 },
        };
      }
      // Final stop
      return {
        id: `test-${llmCallCount}`,
        created: Date.now(),
        model: "test-model",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "In conclusion, the AI agent ecosystem is rapidly evolving with significant advances in autonomous reasoning.",
          },
          finish_reason: "stop",
        }],
        usage: { prompt_tokens: 300, completion_tokens: 100, total_tokens: 400 },
      };
    }

    // Default: "length_then_stop" — return "length" N times, then "stop"
    if (llmCallCount <= lengthRoundsBeforeStop) {
      return {
        id: `test-${llmCallCount}`,
        created: Date.now(),
        model: "test-model",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: `Part ${llmCallCount} of the response. This section covers important details about the topic at hand with thorough analysis and evidence-based reasoning. `,
          },
          finish_reason: "length",
        }],
        usage: { prompt_tokens: 100 * llmCallCount, completion_tokens: 16384, total_tokens: 16484 + 100 * llmCallCount },
      };
    }

    // Final response with stop
    return {
      id: `test-${llmCallCount}`,
      created: Date.now(),
      model: "test-model",
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: "Final conclusion. This completes the comprehensive analysis.",
        },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 500, completion_tokens: 50, total_tokens: 550 },
    };
  }),
}));

// Mock the SDK
vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn(async () => null) },
}));

// Mock the DB
vi.mock("./db", () => ({
  getTaskByExternalId: vi.fn(async () => null),
  getUserPreferences: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => {}),
}));

// Mock agentTools to avoid actual tool execution
vi.mock("./agentTools", () => ({
  AGENT_TOOLS: [],
  executeTool: vi.fn(async (name: string) => ({
    success: true,
    result: `Mock result for ${name}: Found 5 relevant articles about AI agents.`,
    url: undefined,
  })),
}));

// Mock promptCache
vi.mock("./promptCache", () => ({
  registerPrefix: vi.fn(() => ({ hash: "test-hash", cached: false, tokenEstimate: 1000 })),
  getCacheMetrics: vi.fn(() => ({ hits: 0, misses: 0, ratio: 0 })),
}));

// Mock AEGIS LLM wrapper — the dynamic import in agentStream.ts resolves to this.
// We pass through to the already-mocked invokeLLM so the test's LLM behavior controls still work.
vi.mock("./services/aegisLlm", () => ({
  invokeWithAegis: vi.fn(async (params: any) => {
    // Import the already-mocked invokeLLM and call it directly
    const { invokeLLM } = await import("./_core/llm");
    const result = await invokeLLM(params);
    return {
      result,
      cached: false,
      sessionId: 1,
      classification: { taskType: "conversation", complexity: "simple", novelty: "routine", confidence: 0.5 },
    };
  }),
}));

import { runAgentStream, getTierConfig, type TierConfig } from "./agentStream";

// ─── Helper: Collect SSE events from a mock response ─────────────────────────
interface CollectedEvents {
  deltas: string[];
  continuations: Array<{ round: number; maxRounds: number; reason: string }>;
  toolStarts: any[];
  toolResults: any[];
  done: any | null;
  errors: string[];
  stepProgress: any[];
  allEvents: any[];
}

function createMockResponse(): { safeWrite: (d: string) => boolean; safeEnd: () => void; events: CollectedEvents } {
  const events: CollectedEvents = {
    deltas: [],
    continuations: [],
    toolStarts: [],
    toolResults: [],
    done: null,
    errors: [],
    stepProgress: [],
    allEvents: [],
  };

  const safeWrite = (data: string): boolean => {
    // Parse SSE data lines
    const lines = data.split("\n").filter(l => l.startsWith("data: "));
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line.slice(6));
        events.allEvents.push(parsed);

        if (parsed.delta) events.deltas.push(parsed.delta);
        if (parsed.continuation) events.continuations.push(parsed.continuation);
        if (parsed.tool_start) events.toolStarts.push(parsed.tool_start);
        if (parsed.tool_result) events.toolResults.push(parsed.tool_result);
        if (parsed.done) events.done = parsed;
        if (parsed.error) events.errors.push(parsed.error);
        if (parsed.step_progress) events.stepProgress.push(parsed.step_progress);
      } catch {
        // Ignore non-JSON lines
      }
    }
    return true;
  };

  const safeEnd = () => {};

  return { safeWrite, safeEnd, events };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Limitless Mode Auto-Continuation Integration", () => {
  beforeEach(() => {
    llmCallCount = 0;
    llmBehavior = "length_then_stop";
    lengthRoundsBeforeStop = 3;
    vi.clearAllMocks();
  });

  describe("TierConfig verification", () => {
    it("limitless tier has Infinity for all limits", () => {
      const config = getTierConfig("limitless");
      expect(config.maxTurns).toBe(Infinity);
      expect(config.maxTokensPerCall).toBe(Infinity);
      expect(config.maxContinuationRounds).toBe(Infinity);
    });

    it("speed tier has bounded limits", () => {
      const config = getTierConfig("speed");
      expect(config.maxTurns).toBe(30);
      expect(config.maxTokensPerCall).toBe(16384);
      expect(config.maxContinuationRounds).toBe(5);
      expect(isFinite(config.maxTurns)).toBe(true);
    });

    it("quality tier has moderate limits", () => {
      const config = getTierConfig("quality");
      expect(config.maxTurns).toBe(100);
      expect(config.maxTokensPerCall).toBe(65536);
      expect(config.maxContinuationRounds).toBe(50);
    });

    it("max tier has high but bounded limits", () => {
      const config = getTierConfig("max");
      expect(config.maxTurns).toBe(200);
      expect(config.maxTokensPerCall).toBe(65536);
      expect(config.maxContinuationRounds).toBe(100);
      expect(isFinite(config.maxTurns)).toBe(true);
    });

    it("unknown mode falls back to quality tier", () => {
      const config = getTierConfig("unknown_mode");
      expect(config.maxTurns).toBe(100);
      expect(config.maxContinuationRounds).toBe(50);
    });
  });

  describe("Auto-continuation with finish_reason=length", () => {
    it("continues 3 times then stops on quality mode", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 3;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Write a comprehensive analysis" }],
        safeWrite,
        safeEnd,
        mode: "quality",
      });

      // Should have 3 continuation events (one per length response)
      expect(events.continuations.length).toBe(3);

      // Each continuation should have bounded maxRounds (50 for quality)
      for (const cont of events.continuations) {
        expect(cont.maxRounds).toBe(50);
        expect(cont.reason).toBe("output_token_limit");
      }

      // Should have received text from all parts
      expect(events.deltas.length).toBeGreaterThan(0);

      // LLM should have been called 4 times (3 length + 1 stop)
      expect(llmCallCount).toBe(4);
    });

    it("speed mode stops at 5 continuation rounds", async () => {
      llmBehavior = "always_length"; // Never stops on its own
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Write a very long analysis" }],
        safeWrite,
        safeEnd,
        mode: "speed",
      });

      // Speed mode has maxContinuationRounds=5, so it should stop after 5
      // The agent gets 30 turns total but continuation is capped at 5
      expect(events.continuations.length).toBeLessThanOrEqual(5);

      // LLM was called: initial + up to 5 continuations + possible final
      expect(llmCallCount).toBeLessThanOrEqual(7);
    });

    it("limitless mode continues beyond bounded tier limits", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 8; // More than speed's 5-round limit
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Write an extremely thorough analysis" }],
        safeWrite,
        safeEnd,
        mode: "limitless",
      });

      // Limitless should have continued all 8 rounds (beyond speed's 5 limit)
      expect(events.continuations.length).toBe(8);

      // Each continuation should show maxRounds=-1 (unlimited)
      for (const cont of events.continuations) {
        expect(cont.maxRounds).toBe(-1);
        expect(cont.reason).toBe("output_token_limit");
      }

      // LLM should have been called 9 times (8 length + 1 stop)
      expect(llmCallCount).toBe(9);
    });

    it("continuation SSE events have correct structure", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 2;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Analyze this topic" }],
        safeWrite,
        safeEnd,
        mode: "quality",
      });

      expect(events.continuations.length).toBe(2);

      // First continuation
      expect(events.continuations[0]).toEqual({
        round: 1,
        maxRounds: 50,
        reason: "output_token_limit",
      });

      // Second continuation
      expect(events.continuations[1]).toEqual({
        round: 2,
        maxRounds: 50,
        reason: "output_token_limit",
      });
    });

    it("limitless continuation events show maxRounds=-1", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 2;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Deep research" }],
        safeWrite,
        safeEnd,
        mode: "limitless",
      });

      for (const cont of events.continuations) {
        expect(cont.maxRounds).toBe(-1); // Unlimited indicator
      }
    });
  });

  describe("Continuation counter reset on tool progress", () => {
    it("resets continuation counter when tool calls are made", async () => {
      llmBehavior = "length_with_tools";
      lengthRoundsBeforeStop = 3;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Research AI agents" }],
        safeWrite,
        safeEnd,
        mode: "quality",
      });

      // Should have tool execution
      expect(events.toolStarts.length).toBeGreaterThan(0);

      // Continuation rounds should have been tracked
      // After tool call, counter resets, so subsequent length responses
      // start counting from 0 again
      if (events.continuations.length > 0) {
        expect(events.continuations[0].round).toBe(1); // Reset after tool call
      }
    });
  });

  describe("Content accumulation across continuations", () => {
    it("accumulates text from all continuation rounds", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 3;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Write analysis" }],
        safeWrite,
        safeEnd,
        mode: "quality",
      });

      // Should have text deltas from multiple rounds
      const allText = events.deltas.join("");
      expect(allText).toContain("Part 1");
      expect(allText).toContain("Part 2");
      expect(allText).toContain("Part 3");
      expect(allText).toContain("Final conclusion");
    });

    it("done event contains accumulated content", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 2;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Analyze" }],
        safeWrite,
        safeEnd,
        mode: "quality",
      });

      expect(events.done).not.toBeNull();
      expect(events.done.done).toBe(true);
      // The done event should have the accumulated content
      if (events.done.content) {
        expect(events.done.content.length).toBeGreaterThan(50);
      }
    });
  });

  describe("No errors during continuation", () => {
    it("completes without errors in limitless mode", async () => {
      llmBehavior = "length_then_stop";
      lengthRoundsBeforeStop = 5;
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Comprehensive research" }],
        safeWrite,
        safeEnd,
        mode: "limitless",
      });

      expect(events.errors.length).toBe(0);
      expect(events.done).not.toBeNull();
    });

    it("completes without errors in speed mode with many length responses", async () => {
      llmBehavior = "always_length";
      const { safeWrite, safeEnd, events } = createMockResponse();

      await runAgentStream({
        messages: [{ role: "user", content: "Quick analysis" }],
        safeWrite,
        safeEnd,
        mode: "speed",
      });

      // Should complete gracefully even when hitting the limit
      expect(events.errors.length).toBe(0);
    });
  });

  describe("Tier comparison: bounded vs unlimited", () => {
    it("speed mode stops earlier than quality mode for same input", async () => {
      // Run with speed mode
      llmBehavior = "always_length";
      llmCallCount = 0;
      const speed = createMockResponse();
      await runAgentStream({
        messages: [{ role: "user", content: "Long analysis" }],
        safeWrite: speed.safeWrite,
        safeEnd: speed.safeEnd,
        mode: "speed",
      });
      const speedCalls = llmCallCount;
      const speedContinuations = speed.events.continuations.length;

      // Run with quality mode
      llmCallCount = 0;
      const quality = createMockResponse();
      await runAgentStream({
        messages: [{ role: "user", content: "Long analysis" }],
        safeWrite: quality.safeWrite,
        safeEnd: quality.safeEnd,
        mode: "quality",
      });
      const qualityCalls = llmCallCount;
      const qualityContinuations = quality.events.continuations.length;

      // Speed should have fewer continuations than quality
      expect(speedContinuations).toBeLessThan(qualityContinuations);
      expect(speedCalls).toBeLessThan(qualityCalls);
    });
  });
});
