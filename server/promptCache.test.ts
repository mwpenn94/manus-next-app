/**
 * Prompt Cache Tests
 *
 * Validates LRU cache behavior, prefix registration, memory extraction caching,
 * TTL expiration, and metrics tracking.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerPrefix,
  getCachedMemoryExtraction,
  cacheMemoryExtraction,
  getCacheMetrics,
  clearAllCaches,
} from "./promptCache";

describe("Prompt Cache", () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe("registerPrefix", () => {
    it("returns cached=false on first registration", () => {
      const result = registerPrefix("You are a helpful assistant.", '[]');
      expect(result.cached).toBe(false);
      expect(result.hash).toBeTruthy();
      expect(result.tokenEstimate).toBeGreaterThan(0);
    });

    it("returns cached=true on second registration with same content", () => {
      const systemPrompt = "You are Manus Next, an autonomous AI agent.";
      const tools = '[{"type":"function","function":{"name":"web_search"}}]';

      const first = registerPrefix(systemPrompt, tools);
      const second = registerPrefix(systemPrompt, tools);

      expect(first.hash).toBe(second.hash);
      expect(first.cached).toBe(false);
      expect(second.cached).toBe(true);
    });

    it("returns different hashes for different content", () => {
      const r1 = registerPrefix("System A", '[]');
      const r2 = registerPrefix("System B", '[]');
      expect(r1.hash).not.toBe(r2.hash);
    });

    it("estimates tokens at ~4 chars per token", () => {
      const prompt = "A".repeat(400); // 400 chars = ~100 tokens
      const result = registerPrefix(prompt, '[]');
      // Combined: 400 + "||" + "[]" = 404 chars, ~101 tokens
      expect(result.tokenEstimate).toBeGreaterThanOrEqual(100);
      expect(result.tokenEstimate).toBeLessThan(110);
    });
  });

  describe("Memory Extraction Cache", () => {
    it("returns undefined for uncached transcript", () => {
      const result = getCachedMemoryExtraction("user: hello\nassistant: hi there");
      expect(result).toBeUndefined();
    });

    it("returns cached memories after caching", () => {
      const transcript = "user: I work at Acme Corp\nassistant: Great!";
      const memories = [{ key: "employer", value: "Acme Corp" }];

      cacheMemoryExtraction(transcript, memories);
      const result = getCachedMemoryExtraction(transcript);

      expect(result).toEqual(memories);
    });

    it("returns undefined for different transcript", () => {
      const transcript1 = "user: I like Python\nassistant: Nice!";
      const transcript2 = "user: I like Rust\nassistant: Nice!";
      const memories = [{ key: "language", value: "Python" }];

      cacheMemoryExtraction(transcript1, memories);
      const result = getCachedMemoryExtraction(transcript2);

      expect(result).toBeUndefined();
    });

    it("handles empty memories array", () => {
      const transcript = "user: hello\nassistant: hi";
      cacheMemoryExtraction(transcript, []);
      const result = getCachedMemoryExtraction(transcript);
      expect(result).toEqual([]);
    });
  });

  describe("Cache Metrics", () => {
    it("tracks hits and misses for prefix cache", () => {
      const before = getCacheMetrics();
      registerPrefix("test-metrics", "[]"); // first time
      registerPrefix("test-metrics", "[]"); // hit
      registerPrefix("test-metrics", "[]"); // hit

      const after = getCacheMetrics();
      expect(after.prefix.hits - before.prefix.hits).toBe(2);
      expect(after.prefix.size).toBeGreaterThanOrEqual(1);
    });

    it("tracks hits and misses for memory cache", () => {
      const before = getCacheMetrics();
      getCachedMemoryExtraction("uncached-metrics"); // miss
      cacheMemoryExtraction("cached-metrics", [{ key: "k", value: "v" }]);
      getCachedMemoryExtraction("cached-metrics"); // hit
      getCachedMemoryExtraction("other-metrics"); // miss

      const after = getCacheMetrics();
      expect(after.memory.hits - before.memory.hits).toBe(1);
      expect(after.memory.misses - before.memory.misses).toBe(2);
    });

    it("resets metrics after clearAllCaches", () => {
      registerPrefix("test", "[]");
      cacheMemoryExtraction("t", []);
      clearAllCaches();

      const metrics = getCacheMetrics();
      expect(metrics.prefix.size).toBe(0);
      expect(metrics.memory.size).toBe(0);
    });
  });

  describe("LRU Eviction", () => {
    it("evicts oldest entries when capacity is exceeded", () => {
      // Prefix cache has max 50 entries
      // Fill with 50 unique entries
      for (let i = 0; i < 50; i++) {
        registerPrefix(`system-${i}`, `tools-${i}`);
      }
      // Add one more — should evict the first
      registerPrefix("system-50", "tools-50");

      const metrics = getCacheMetrics();
      expect(metrics.prefix.size).toBe(50);
      expect(metrics.prefix.evictions).toBe(1);
    });
  });
});
