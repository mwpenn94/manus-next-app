/**
 * Quality Judge Tests — §L.22 Cross-Model Self-Assessment
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { evaluateResponseQuality, quickQualityScore, type QualityReport } from "./qualityJudge";
import { invokeLLM } from "./_core/llm";

const mockInvokeLLM = vi.mocked(invokeLLM);

const GOOD_EVALUATION = {
  choices: [{
    message: {
      content: JSON.stringify({
        dimensions: [
          { name: "accuracy", score: 4, rationale: "Facts are correct and well-sourced" },
          { name: "completeness", score: 5, rationale: "Covers all aspects thoroughly" },
          { name: "reasoning", score: 4, rationale: "Clear logical chain" },
          { name: "actionability", score: 4, rationale: "Practical and specific advice" },
          { name: "safety", score: 5, rationale: "No harmful content" },
        ],
        strengths: ["Thorough research", "Clear structure"],
        improvements: ["Could add more examples"],
      }),
    },
  }],
};

const POOR_EVALUATION = {
  choices: [{
    message: {
      content: JSON.stringify({
        dimensions: [
          { name: "accuracy", score: 2, rationale: "Several factual errors" },
          { name: "completeness", score: 2, rationale: "Missing key aspects" },
          { name: "reasoning", score: 3, rationale: "Some logical gaps" },
          { name: "actionability", score: 2, rationale: "Vague instructions" },
          { name: "safety", score: 4, rationale: "Generally safe" },
        ],
        strengths: ["Attempted to address the query"],
        improvements: ["Fix factual errors", "Add missing sections", "Be more specific"],
      }),
    },
  }],
};

describe("Quality Judge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("evaluateResponseQuality", () => {
    it("returns a complete quality report for a good response", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      const report = await evaluateResponseQuality(
        "What is machine learning?",
        "Machine learning is a subset of artificial intelligence..."
      );

      expect(report.overallScore).toBeGreaterThanOrEqual(4);
      expect(report.overallScore).toBeLessThanOrEqual(5);
      expect(report.dimensions).toHaveLength(5);
      expect(report.flagged).toBe(false);
      expect(report.strengths.length).toBeGreaterThan(0);
      expect(report.evaluatedAt).toBeTruthy();
    });

    it("flags responses with low dimension scores", async () => {
      mockInvokeLLM.mockResolvedValueOnce(POOR_EVALUATION as any);

      const report = await evaluateResponseQuality(
        "Explain quantum computing",
        "Quantum computing is about computers..."
      );

      expect(report.flagged).toBe(true);
      expect(report.overallScore).toBeLessThan(3);
      expect(report.improvements.length).toBeGreaterThan(0);
    });

    it("handles LLM returning empty response", async () => {
      mockInvokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: "" } }] } as any);

      const report = await evaluateResponseQuality("test", "test response");

      expect(report.overallScore).toBe(0);
      expect(report.flagged).toBe(true);
    });

    it("handles LLM error gracefully", async () => {
      // Both dual-pass evaluations must fail to trigger the fallback report
      mockInvokeLLM.mockRejectedValueOnce(new Error("API timeout"));
      mockInvokeLLM.mockRejectedValueOnce(new Error("API timeout"));

      const report = await evaluateResponseQuality("test", "test response");

      expect(report.overallScore).toBe(0);
      expect(report.flagged).toBe(true);
      expect(report.dimensions[0].rationale).toContain("Evaluation failed");
    });

    it("includes tool context when provided", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      await evaluateResponseQuality(
        "Search for AI news",
        "Here are the latest AI developments...",
        ["web_search", "read_webpage"]
      );

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === "user");
      expect(userMessage?.content).toContain("web_search, read_webpage");
    });

    it("clamps scores to 1-5 range", async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              dimensions: [
                { name: "accuracy", score: 10, rationale: "Over-scored" },
                { name: "completeness", score: -1, rationale: "Under-scored" },
                { name: "reasoning", score: 3, rationale: "Normal" },
                { name: "actionability", score: 4, rationale: "Good" },
                { name: "safety", score: 5, rationale: "Safe" },
              ],
              strengths: [],
              improvements: [],
            }),
          },
        }],
      } as any);

      const report = await evaluateResponseQuality("test", "test");

      const accuracyDim = report.dimensions.find(d => d.name === "accuracy");
      const completenessDim = report.dimensions.find(d => d.name === "completeness");
      expect(accuracyDim?.score).toBe(5); // clamped from 10
      expect(completenessDim?.score).toBe(1); // clamped from -1
    });

    it("fills in missing dimensions with default score of 3", async () => {
      mockInvokeLLM.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              dimensions: [
                { name: "accuracy", score: 4, rationale: "Good" },
                // Missing: completeness, reasoning, actionability, safety
              ],
              strengths: [],
              improvements: [],
            }),
          },
        }],
      } as any);

      const report = await evaluateResponseQuality("test", "test");

      expect(report.dimensions.length).toBe(5);
      const safetyDim = report.dimensions.find(d => d.name === "safety");
      expect(safetyDim?.score).toBe(3);
      expect(safetyDim?.rationale).toBe("Not explicitly evaluated");
    });

    it("truncates long inputs to prevent token overflow", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      const longQuery = "x".repeat(5000);
      const longResponse = "y".repeat(10000);

      await evaluateResponseQuality(longQuery, longResponse);

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: any) => m.role === "user");
      // Should be truncated
      expect((userMessage?.content as string).length).toBeLessThan(longQuery.length + longResponse.length);
    });

    it("uses structured JSON response format", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      await evaluateResponseQuality("test", "test");

      const callArgs = mockInvokeLLM.mock.calls[0][0];
      expect(callArgs.response_format).toBeDefined();
      expect(callArgs.response_format.type).toBe("json_schema");
    });
  });

  describe("quickQualityScore", () => {
    it("returns just the overall score", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      const score = await quickQualityScore("test query", "test response");

      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(5);
    });

    it("returns 0 on error", async () => {
      mockInvokeLLM.mockRejectedValueOnce(new Error("Network error"));

      const score = await quickQualityScore("test", "test");

      expect(score).toBe(0);
    });
  });

  describe("QualityReport structure", () => {
    it("has all required fields", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      const report = await evaluateResponseQuality("test", "test");

      expect(report).toHaveProperty("overallScore");
      expect(report).toHaveProperty("dimensions");
      expect(report).toHaveProperty("strengths");
      expect(report).toHaveProperty("improvements");
      expect(report).toHaveProperty("flagged");
      expect(report).toHaveProperty("evaluatedAt");
    });

    it("evaluatedAt is a valid ISO timestamp", async () => {
      mockInvokeLLM.mockResolvedValueOnce(GOOD_EVALUATION as any);

      const report = await evaluateResponseQuality("test", "test");

      const date = new Date(report.evaluatedAt);
      expect(date.toISOString()).toBe(report.evaluatedAt);
    });
  });
});
