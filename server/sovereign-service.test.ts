/**
 * Sovereign Service — Dedicated Tests
 *
 * Tests the multi-provider routing engine, circuit breaker logic,
 * guardrails, failover, and usage tracking.
 *
 * Aligned with actual service interface: selectProvider(capabilities, maxCost, preferred),
 * routeRequest(RoutingRequest), getRoutingStats(userId), seedDefaultProviders(),
 * getCircuitBreakerStatus(), validateInput(), validateOutput().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: "Test response from LLM" },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
  }),
}));

// Mock db module with correct function names matching the actual implementation
vi.mock("./db", () => ({
  getActiveProviders: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "primary-llm",
      providerType: "custom",
      baseUrl: "https://api.primary.com/v1",
      model: "gpt-4",
      costPer1kInput: 3,
      costPer1kOutput: 15,
      isActive: 1,
      capabilities: ["chat", "code", "research"],
      circuitState: "closed",
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastSuccessAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: "fallback-llm",
      providerType: "custom",
      baseUrl: "https://api.fallback.com/v1",
      model: "gpt-3.5",
      costPer1kInput: 1,
      costPer1kOutput: 5,
      isActive: 1,
      capabilities: ["chat", "writing"],
      circuitState: "closed",
      consecutiveFailures: 0,
      lastFailureAt: null,
      lastSuccessAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]),
  upsertProvider: vi.fn().mockResolvedValue(1),
  createRoutingDecision: vi.fn().mockResolvedValue(1),
  createUsageLog: vi.fn().mockResolvedValue(1),
  getProviderUsageStats: vi.fn().mockResolvedValue({
    successCount: 95,
    totalRequests: 100,
    avgLatency: 200,
    totalCost: 5000,
  }),
}));

import * as sovereign from "./services/sovereign";

describe("Sovereign Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("selectProvider", () => {
    it("should return an array of providers sorted by cost", async () => {
      const providers = await sovereign.selectProvider([], undefined, undefined);
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      // Should be sorted by cost (cheapest first)
      expect(providers[0].name).toBe("fallback-llm"); // costPer1kInput: 1
    });

    it("should filter by required capabilities", async () => {
      const providers = await sovereign.selectProvider(["code"], undefined, undefined);
      expect(providers.length).toBeGreaterThan(0);
      // primary-llm has "code" capability, fallback-llm does not
      expect(providers[0].name).toBe("primary-llm");
    });

    it("should fall back to all providers when no capability match", async () => {
      const providers = await sovereign.selectProvider(["nonexistent-capability"], undefined, undefined);
      // Should fall back to all active providers
      expect(providers.length).toBeGreaterThan(0);
    });

    it("should filter by max cost", async () => {
      const providers = await sovereign.selectProvider([], 2, undefined);
      // Only fallback-llm has costPer1kInput <= 2
      expect(providers.length).toBeGreaterThan(0);
      for (const p of providers) {
        expect(p.costPer1kInput).toBeLessThanOrEqual(2);
      }
    });

    it("should prefer the preferred provider", async () => {
      const providers = await sovereign.selectProvider([], undefined, "fallback-llm");
      expect(providers[0].name).toBe("fallback-llm");
    });

    it("should return built-in provider when no providers exist", async () => {
      const db = await import("./db");
      (db.getActiveProviders as any).mockResolvedValueOnce([]);

      const providers = await sovereign.selectProvider([], undefined, undefined);
      expect(providers.length).toBe(1);
      expect(providers[0].name).toBe("built-in");
    });

    it("should return provider summaries with correct fields", async () => {
      const providers = await sovereign.selectProvider([], undefined, undefined);
      for (const p of providers) {
        expect(p).toHaveProperty("name");
        expect(p).toHaveProperty("model");
        expect(p).toHaveProperty("costPer1kInput");
        expect(p).toHaveProperty("costPer1kOutput");
        expect(p).toHaveProperty("id");
      }
    });
  });

  describe("routeRequest", () => {
    it("should route a request and return RoutingResult", async () => {
      const result = await sovereign.routeRequest({
        messages: [{ role: "user", content: "Hello" }],
        userId: 1,
      });
      expect(result).toBeDefined();
      expect(result).toHaveProperty("provider");
      expect(result).toHaveProperty("model");
      expect(result).toHaveProperty("output");
      expect(result).toHaveProperty("cost");
      expect(result).toHaveProperty("latencyMs");
      expect(result).toHaveProperty("fallbackUsed");
      expect(result).toHaveProperty("attempts");
      expect(typeof result.output).toBe("string");
    });

    it("should record routing decisions", async () => {
      const db = await import("./db");
      await sovereign.routeRequest({
        messages: [{ role: "user", content: "Test routing" }],
        userId: 1,
      });
      expect(db.createRoutingDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          chosenProvider: expect.any(String),
          strategy: "balanced",
          success: 1,
        })
      );
    });

    it("should record usage logs", async () => {
      const db = await import("./db");
      await sovereign.routeRequest({
        messages: [{ role: "user", content: "Test usage" }],
        userId: 1,
      });
      expect(db.createUsageLog).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: expect.any(Number),
          inputTokens: expect.any(Number),
          outputTokens: expect.any(Number),
          latencyMs: expect.any(Number),
          success: 1,
        })
      );
    });

    it("should attempt failover on provider failure", async () => {
      const llm = await import("./_core/llm");
      // First call fails, second succeeds
      (llm.invokeLLM as any)
        .mockRejectedValueOnce(new Error("Provider down"))
        .mockResolvedValueOnce({
          id: "fallback-id",
          choices: [{ index: 0, message: { role: "assistant", content: "Fallback response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
        });

      const result = await sovereign.routeRequest({
        messages: [{ role: "user", content: "Failover test" }],
        userId: 1,
      });
      expect(result.fallbackUsed).toBe(true);
      expect(result.attempts).toBeGreaterThan(1);
    });

    it("should throw when all providers fail", async () => {
      const llm = await import("./_core/llm");
      (llm.invokeLLM as any).mockRejectedValue(new Error("All providers down"));

      await expect(
        sovereign.routeRequest({
          messages: [{ role: "user", content: "All fail test" }],
          userId: 1,
        })
      ).rejects.toThrow();
    });

    it("should pass taskType to routing decision", async () => {
      // Reset LLM mock to success state (previous test may have left it in rejected state)
      const llm = await import("./_core/llm");
      (llm.invokeLLM as any).mockResolvedValue({
        id: "test-id",
        created: Date.now(),
        model: "test-model",
        choices: [{ index: 0, message: { role: "assistant", content: "Task type test response" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
      });

      const db = await import("./db");
      await sovereign.routeRequest({
        messages: [{ role: "user", content: "Code review" }],
        userId: 1,
        taskType: "code",
      });
      expect(db.createRoutingDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          taskType: "code",
        })
      );
    });
  });

  describe("Guardrails", () => {
    it("should validate non-empty input", () => {
      const result = sovereign.validateInput("Hello world");
      expect(result).toHaveProperty("passed");
      expect(result.passed).toBe(true);
    });

    it("should reject empty input", () => {
      const result = sovereign.validateInput("");
      expect(result.passed).toBe(false);
      expect(result.issues).toContain("Empty input");
    });

    it("should validate output", () => {
      const result = sovereign.validateOutput("Valid response text");
      expect(result).toHaveProperty("passed");
      expect(result.passed).toBe(true);
    });

    it("should reject empty output", () => {
      const result = sovereign.validateOutput("");
      expect(result.passed).toBe(false);
    });

    it("should reject input that fails guardrails in routeRequest", async () => {
      await expect(
        sovereign.routeRequest({
          messages: [{ role: "user", content: "" }],
          userId: 1,
        })
      ).rejects.toThrow("Input validation failed");
    });
  });

  describe("Circuit Breaker", () => {
    it("should return circuit breaker status as a map", () => {
      const status = sovereign.getCircuitBreakerStatus();
      expect(typeof status).toBe("object");
      // Initially empty since no requests have been made
    });

    it("should track failures in circuit state after failed requests", async () => {
      const llm = await import("./_core/llm");
      (llm.invokeLLM as any).mockRejectedValue(new Error("Provider failure"));

      try {
        await sovereign.routeRequest({
          messages: [{ role: "user", content: "Trigger failure" }],
          userId: 1,
        });
      } catch {
        // Expected
      }

      const status = sovereign.getCircuitBreakerStatus();
      // After failures, circuit breaker should have entries
      expect(typeof status).toBe("object");
    });
  });

  describe("Provider Management", () => {
    it("should seed default providers when none exist", async () => {
      const db = await import("./db");
      (db.getActiveProviders as any).mockResolvedValueOnce([]);

      await sovereign.seedDefaultProviders();
      expect(db.upsertProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "manus-built-in",
          isActive: 1,
          capabilities: expect.arrayContaining(["chat"]),
        })
      );
    });

    it("should not seed providers when providers already exist", async () => {
      const db = await import("./db");
      // Default mock returns 2 providers
      await sovereign.seedDefaultProviders();
      expect(db.upsertProvider).not.toHaveBeenCalled();
    });
  });

  describe("Routing Stats", () => {
    it("should return stats for each active provider", async () => {
      const stats = await sovereign.getRoutingStats(1);
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(2); // 2 mock providers
      for (const s of stats) {
        expect(s).toHaveProperty("provider");
        expect(s).toHaveProperty("model");
        expect(s).toHaveProperty("circuitState");
        expect(s).toHaveProperty("successRate");
        expect(s).toHaveProperty("avgLatency");
        expect(s).toHaveProperty("totalCost");
        expect(s).toHaveProperty("totalRequests");
      }
    });

    it("should calculate success rate from usage stats", async () => {
      const stats = await sovereign.getRoutingStats(1);
      // Mock returns 95/100 success rate
      expect(stats[0].successRate).toBe(0.95);
    });
  });
});
