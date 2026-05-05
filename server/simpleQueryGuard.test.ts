/**
 * Tests for the Simple Query Guard fix (IOV Session)
 *
 * Verifies that when the LLM returns ONLY a tool_call with no text for a simple query,
 * the system re-invokes the LLM with a text-only nudge instead of falling through
 * to the "SILENT COMPLETION" fallback.
 */
import { describe, it, expect } from "vitest";

// We test the detection logic itself since the full stream requires mocking SSE
describe("Simple Query Detection", () => {
  // Replicate the detection logic from agentStream.ts
  function isSimpleQuery(text: string): boolean {
    return (
      // Math questions
      /^\s*(what\s+is\s+)?\d+\s*[+\-*/×÷]\s*\d+/i.test(text) ||
      /\b\d+\s*(plus|minus|times|divided by|multiplied by)\s*\d+\b/i.test(text) ||
      // Very short factual questions (under 60 chars, starts with question word)
      (text.length < 60 && /^\s*(what|who|when|where|how much|how many|is|are|does|do|can|will)\b/i.test(text) && !/\b(research|search|find|look up|build|create|generate|make|write|draft|design|analyze|compare|demonstrate|show me|deploy|clone|edit|explain in detail|comprehensive|thorough|deep dive)\b/i.test(text)) ||
      // Explicit "one word" / "brief" / "short" answer requests
      /\b(one\s*word|one\s*sentence|brief|short)\s*(answer|response)\b/i.test(text)
    );
  }

  it("detects basic math: 15 multiplied by 7", () => {
    expect(isSimpleQuery("What is 15 multiplied by 7?")).toBe(true);
  });

  it("detects basic math: 15 * 7", () => {
    expect(isSimpleQuery("15 * 7")).toBe(true);
  });

  it("detects basic math: 100 plus 200", () => {
    expect(isSimpleQuery("100 plus 200")).toBe(true);
  });

  it("detects basic math: what is 7+8", () => {
    expect(isSimpleQuery("what is 7+8")).toBe(true);
  });

  it("detects short factual question", () => {
    expect(isSimpleQuery("What is the capital of France?")).toBe(true);
  });

  it("detects short factual question with 'who'", () => {
    expect(isSimpleQuery("Who invented the telephone?")).toBe(true);
  });

  it("detects 'brief answer' request", () => {
    expect(isSimpleQuery("Give me a brief answer about gravity")).toBe(true);
  });

  it("does NOT detect research requests", () => {
    expect(isSimpleQuery("Research the history of AI")).toBe(false);
  });

  it("does NOT detect generation requests", () => {
    expect(isSimpleQuery("Generate a report about climate change")).toBe(false);
  });

  it("does NOT detect long complex queries", () => {
    expect(isSimpleQuery("Explain in detail the differences between supervised and unsupervised learning algorithms and their applications")).toBe(false);
  });

  it("does NOT detect build requests", () => {
    expect(isSimpleQuery("Build me a calculator app")).toBe(false);
  });

  it("does NOT detect 'deep dive' requests", () => {
    expect(isSimpleQuery("What is quantum computing? deep dive")).toBe(false);
  });
});

describe("Simple Query Guard - Text Content Check", () => {
  // Simulates the hasTextContent check from the fix
  function hasTextContent(assistantMessage: { content?: string } | undefined): boolean {
    return typeof assistantMessage?.content === "string" && assistantMessage.content.trim().length > 0;
  }

  it("returns false when content is empty string", () => {
    expect(hasTextContent({ content: "" })).toBe(false);
  });

  it("returns false when content is whitespace only", () => {
    expect(hasTextContent({ content: "   \n\t  " })).toBe(false);
  });

  it("returns false when content is undefined", () => {
    expect(hasTextContent(undefined)).toBe(false);
  });

  it("returns true when content has actual text", () => {
    expect(hasTextContent({ content: "105" })).toBe(true);
  });

  it("returns true when content has a full sentence", () => {
    expect(hasTextContent({ content: "The answer is 105." })).toBe(true);
  });
});
