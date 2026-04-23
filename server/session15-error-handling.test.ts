/**
 * Session 15: LLM Error Handling Tests
 *
 * Verifies that all common LLM API failure modes are mapped to
 * user-friendly error messages instead of raw technical errors.
 */
import { describe, expect, it } from "vitest";
import * as fs from "fs";

const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
const indexTs = fs.readFileSync("server/_core/index.ts", "utf-8");

// ── Agent-level error handling (agentStream.ts) ──
describe("Agent error handling (agentStream.ts)", () => {
  it("handles 412 usage exhausted errors", () => {
    expect(agentStream).toContain("status === 412");
    expect(agentStream).toContain("usage exhausted");
    expect(agentStream).toContain("credits have been exhausted");
  });

  it("handles 402 payment required errors", () => {
    expect(agentStream).toContain("status === 402");
    expect(agentStream).toContain("payment required");
    expect(agentStream).toContain("billing settings");
  });

  it("handles timeout errors", () => {
    expect(agentStream).toContain("ETIMEDOUT");
    expect(agentStream).toContain("ECONNABORTED");
    expect(agentStream).toContain("timed out");
  });

  it("handles 5xx server errors", () => {
    expect(agentStream).toContain("status >= 500");
    expect(agentStream).toContain("temporary error");
  });

  it("handles 429 rate limit errors", () => {
    expect(agentStream).toContain("status === 429");
    expect(agentStream).toContain("Rate limit reached");
  });

  it("handles context length exceeded errors", () => {
    expect(agentStream).toContain("context_length_exceeded");
    expect(agentStream).toContain("too long for the AI to process");
  });

  it("handles content filter errors", () => {
    expect(agentStream).toContain("content_filter");
    expect(agentStream).toContain("content safety filter");
  });

  it("has catch-all for generic LLM invoke failures", () => {
    expect(agentStream).toContain("LLM invoke failed");
    expect(agentStream).toContain("extractedStatus");
  });

  it("marks usage exhausted as non-retryable", () => {
    // The 412 handler should set retryable = false
    const usageBlock = agentStream.slice(
      agentStream.indexOf("status === 412"),
      agentStream.indexOf("status === 402")
    );
    expect(usageBlock).toContain("retryable = false");
  });

  it("marks 5xx errors as retryable", () => {
    const serverBlock = agentStream.slice(
      agentStream.indexOf("status >= 500"),
      agentStream.indexOf("status === 429")
    );
    expect(serverBlock).toContain("retryable = true");
  });
});

// ── Stream endpoint error handling (index.ts) ──
describe("Stream endpoint error handling (index.ts)", () => {
  it("maps 412 usage exhausted to friendly message", () => {
    expect(indexTs).toContain("status === 412");
    expect(indexTs).toContain("usage exhausted");
    expect(indexTs).toContain("credits have been exhausted");
  });

  it("maps 402 payment required to friendly message", () => {
    expect(indexTs).toContain("status === 402");
    expect(indexTs).toContain("payment required");
  });

  it("maps 5xx errors to friendly message with retryable flag", () => {
    expect(indexTs).toContain("status >= 500");
    expect(indexTs).toContain("temporary error");
  });

  it("catches generic LLM invoke failures", () => {
    expect(indexTs).toContain("LLM invoke failed");
  });

  it("includes retryable flag in error SSE events", () => {
    expect(indexTs).toContain("retryable");
  });
});

// ── Frontend error display (buildStreamCallbacks.ts) ──
describe("Frontend error display (buildStreamCallbacks.ts)", () => {
  const callbacks = fs.readFileSync("client/src/lib/buildStreamCallbacks.ts", "utf-8");

  it("displays error with warning emoji", () => {
    expect(callbacks).toContain("\\u26a0");
  });

  it("shows retry hint for retryable errors", () => {
    expect(callbacks).toContain("try sending your message again");
  });

  it("signals retryable state to TaskView", () => {
    expect(callbacks).toContain("setLastErrorRetryable");
  });
});
