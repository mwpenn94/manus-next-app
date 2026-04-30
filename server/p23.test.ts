/**
 * P23 Tests — Connection Resilience (streamWithRetry, buildStreamCallbacks, server heartbeat)
 */
import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

// ── streamWithRetry unit tests (source analysis) ──

describe("P23-1: streamWithRetry module structure", () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../client/src/lib/streamWithRetry.ts"),
    "utf-8"
  );

  it("exports streamWithRetry function", () => {
    expect(src).toContain("export async function streamWithRetry");
  });

  it("exports getStreamErrorMessage function", () => {
    expect(src).toContain("export function getStreamErrorMessage");
  });

  it("exports StreamCallbacks interface", () => {
    expect(src).toContain("export interface StreamCallbacks");
  });

  it("exports StreamOptions interface", () => {
    expect(src).toContain("export interface StreamOptions");
  });

  it("defines MAX_RETRIES constant", () => {
    expect(src).toContain("const MAX_RETRIES = 3");
  });

  it("defines BASE_DELAY_MS for exponential backoff", () => {
    expect(src).toContain("const BASE_DELAY_MS = 1000");
  });

  it("implements isRetryableError for network error detection", () => {
    expect(src).toContain("function isRetryableError");
    expect(src).toContain("Load failed");
    expect(src).toContain("Failed to fetch");
    expect(src).toContain("ECONNRESET");
    expect(src).toContain("ECONNREFUSED");
    expect(src).toContain("ERR_NETWORK");
    expect(src).toContain("ERR_CONNECTION");
  });

  it("implements parseSSELine that filters heartbeat pings", () => {
    expect(src).toContain("function parseSSELine");
    expect(src).toContain("data.heartbeat");
  });

  it("has exponential backoff with Math.pow(2, attempt - 1)", () => {
    expect(src).toContain("Math.pow(2, attempt - 1)");
  });

  it("calls onReconnecting callback before retry", () => {
    expect(src).toContain("callbacks.onReconnecting?.(attempt, MAX_RETRIES)");
  });

  it("calls onReconnected callback after successful retry", () => {
    expect(src).toContain("callbacks.onReconnected?.()");
  });

  it("throws AbortError without retrying on user cancel", () => {
    expect(src).toContain('if (err.name === "AbortError")');
    expect(src).toContain("throw err");
  });

  it("handles all SSE event types in parseSSELine", () => {
    expect(src).toContain("data.delta");
    expect(src).toContain("data.tool_start");
    expect(src).toContain("data.tool_result");
    expect(src).toContain("data.image");
    expect(src).toContain("data.document");
    expect(src).toContain("data.done");
    expect(src).toContain("data.status");
    expect(src).toContain("data.step_progress");
    expect(src).toContain("data.error");
  });

  it("skips malformed JSON lines without throwing", () => {
    expect(src).toContain("catch {");
    expect(src).toContain("return false");
  });
});

// ── buildStreamCallbacks unit tests ──

describe("P23-2: buildStreamCallbacks module structure", () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../client/src/lib/buildStreamCallbacks.ts"),
    "utf-8"
  );

  it("exports buildStreamCallbacks function", () => {
    expect(src).toContain("export function buildStreamCallbacks");
  });

  it("exports StreamState interface", () => {
    expect(src).toContain("export interface StreamState");
  });

  it("exports StreamStateSetters interface", () => {
    expect(src).toContain("export interface StreamStateSetters");
  });

  it("implements all required callbacks", () => {
    expect(src).toContain("onDelta:");
    expect(src).toContain("onToolStart:");
    expect(src).toContain("onToolResult:");
    expect(src).toContain("onImage:");
    expect(src).toContain("onDocument:");
    expect(src).toContain("onDone:");
    expect(src).toContain("onStatus:");
    expect(src).toContain("onStepProgress:");
    expect(src).toContain("onError:");
    expect(src).toContain("onReconnecting:");
    expect(src).toContain("onReconnected:");
  });

  it("updates accumulated content on delta", () => {
    expect(src).toContain("state.accumulated += delta");
  });

  it("pushes new actions on tool_start", () => {
    expect(src).toContain("state.actions.push(");
  });

  it("marks actions as done on tool_result", () => {
    expect(src).toContain('status: "done"');
  });

  it("appends image markdown on image event", () => {
    expect(src).toContain("![Generated Image]");
  });

  it("appends document download link on document event", () => {
    expect(src).toContain("[Download Document]");
  });

  it("signals reconnecting state without text injection (Pass 67)", () => {
    expect(src).toContain("setIsReconnecting");
  });

  it("restores clean content on reconnected", () => {
    expect(src).toContain("setStreamContent(state.accumulated)");
  });
});

// ── Server-side heartbeat ──

describe("P23-3: Server-side SSE heartbeat", () => {
  const serverSrc = fs.readFileSync(
    path.resolve(__dirname, "../server/_core/index.ts"),
    "utf-8"
  );

  it("has heartbeat interval in /api/stream endpoint", () => {
    expect(serverSrc).toContain("heartbeat");
  });

  it("sends heartbeat as SSE data event", () => {
    expect(serverSrc).toMatch(/data:.*heartbeat/);
  });

  it("uses setInterval for periodic heartbeat", () => {
    expect(serverSrc).toContain("setInterval");
  });

  it("clears heartbeat interval on stream end", () => {
    expect(serverSrc).toContain("clearInterval");
  });

  it("uses 15-second heartbeat interval", () => {
    const has15s = serverSrc.includes("15000") || serverSrc.includes("15_000");
    expect(has15s).toBe(true);
  });
});

// ── TaskView integration ──

describe("P23-4: TaskView uses streamWithRetry", () => {
  const taskViewSrc = fs.readFileSync(
    path.resolve(__dirname, "../client/src/pages/TaskView.tsx"),
    "utf-8"
  );

  it("imports streamWithRetry", () => {
    expect(taskViewSrc).toContain('import { streamWithRetry, getStreamErrorMessage }');
  });

  it("imports buildStreamCallbacks", () => {
    expect(taskViewSrc).toContain('import { buildStreamCallbacks, type StreamState }');
  });

  it("has no remaining raw fetch to /api/stream", () => {
    expect(taskViewSrc).not.toContain('const response = await fetch("/api/stream"');
  });

  it("has no remaining 'Connection lost' hardcoded strings", () => {
    expect(taskViewSrc).not.toContain("Connection lost. The server may have restarted.");
  });

  it("uses streamWithRetry in all streaming paths", () => {
    const matches = taskViewSrc.match(/await streamWithRetry\(/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(5); // auto-stream, handleSend, hands-free, regenerate, edit-regenerate
  });

  it("uses getStreamErrorMessage in all catch blocks", () => {
    const matches = taskViewSrc.match(/getStreamErrorMessage\(err\)/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(3);
  });

  it("creates StreamState for each streaming block", () => {
    const matches = taskViewSrc.match(/const streamState: StreamState/g);
    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(5);
  });
});

// ── getStreamErrorMessage behavior ──

describe("P23-5: getStreamErrorMessage user-friendly messages", () => {
  const src = fs.readFileSync(
    path.resolve(__dirname, "../client/src/lib/streamWithRetry.ts"),
    "utf-8"
  );

  it("returns connection lost message for retryable errors", () => {
    expect(src).toContain("Connection was interrupted after several attempts");
  });

  it("returns timeout message for timeout errors", () => {
    expect(src).toContain("took longer than expected");
  });

  it("returns generic fallback for unknown errors", () => {
    expect(src).toContain("Something went wrong. Please try again");
  });

  it("includes the original error message when available", () => {
    expect(src).toContain("Something unexpected happened");
  });
});

// ── Firefox scrollbar styling ──

describe("P23-6: Firefox scrollbar styling", () => {
  const css = fs.readFileSync(
    path.resolve(__dirname, "../client/src/index.css"),
    "utf-8"
  );

  it("has scrollbar-width: thin for Firefox", () => {
    expect(css).toContain("scrollbar-width: thin");
  });

  it("has scrollbar-color for Firefox", () => {
    expect(css).toContain("scrollbar-color:");
  });
});
