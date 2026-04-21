/**
 * streamWithRetry — Resilient SSE streaming with heartbeat filtering and auto-retry.
 *
 * Solves the "Connection lost" problem on mobile by:
 * 1. Filtering out server heartbeat pings (data: {"heartbeat":true,...})
 * 2. Auto-retrying on network errors with exponential backoff (up to MAX_RETRIES)
 * 3. Providing a reconnecting callback for UI feedback
 *
 * Used by all streaming paths in TaskView (auto-stream, handleSend, hands-free, regenerate).
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s

export interface StreamCallbacks {
  onDelta: (delta: string) => void;
  onToolStart: (toolStart: any) => void;
  onToolResult: (toolResult: any) => void;
  onImage: (imageUrl: string) => void;
  onDocument: (doc: { title: string; url: string; format?: string }) => void;
  onDone: (content: string) => void;
  onStatus: (status: string) => void;
  onStepProgress: (progress: any) => void;
  onWebappPreview: (preview: { name: string; url: string; description?: string }) => void;
  onConfirmationGate?: (gate: { action: string; description?: string; category?: string }) => void;
  onConvergence?: (data: { passNumber: number; passType: string; status: string; description?: string; rating?: number; convergenceCount?: number }) => void;
  onInteractiveOutput?: (output: { type: string; title: string; description?: string; previewUrl?: string; openUrl?: string; downloadUrl?: string; isLive?: boolean; statusLabel?: string }) => void;
  onError: (error: string) => void;
  onReconnecting?: (attempt: number, maxRetries: number) => void;
  onReconnected?: () => void;
}

export interface StreamOptions {
  messages: Array<{ role: string; content: any }>;
  taskExternalId: string;
  mode: string;
  signal?: AbortSignal;
  callbacks: StreamCallbacks;
}

/**
 * Returns true if the error is a network/connection error that can be retried.
 */
function isRetryableError(err: any): boolean {
  if (!err) return false;
  const msg = err.message || "";
  return (
    msg === "Load failed" ||
    msg === "Failed to fetch" ||
    msg === "NetworkError when attempting to fetch resource." ||
    msg.includes("network") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ERR_NETWORK") ||
    msg.includes("ERR_CONNECTION") ||
    msg.includes("fetch failed")
  );
}

/**
 * Parse a single SSE line and dispatch to the appropriate callback.
 * Returns false for heartbeat lines (no-op), true for real data.
 */
function parseSSELine(line: string, callbacks: StreamCallbacks): boolean {
  if (!line.startsWith("data: ")) return false;
  try {
    const data = JSON.parse(line.slice(6));

    // Filter out heartbeat pings — they keep the connection alive but carry no content
    if (data.heartbeat) return false;

    if (data.delta) callbacks.onDelta(data.delta);
    if (data.tool_start) callbacks.onToolStart(data.tool_start);
    if (data.tool_result) callbacks.onToolResult(data.tool_result);
    if (data.image) callbacks.onImage(data.image);
    if (data.document) callbacks.onDocument(data.document);
    if (data.done) callbacks.onDone(data.content || "");
    if (data.status) callbacks.onStatus(data.status);
    if (data.step_progress) callbacks.onStepProgress(data.step_progress);
    if (data.webapp_preview) callbacks.onWebappPreview(data.webapp_preview);
    if (data.confirmation_gate && callbacks.onConfirmationGate) callbacks.onConfirmationGate(data.confirmation_gate);
    if (data.convergence && callbacks.onConvergence) callbacks.onConvergence(data.convergence);
    if (data.interactive_output && callbacks.onInteractiveOutput) callbacks.onInteractiveOutput(data.interactive_output);
    if (data.error) callbacks.onError(data.error);

    return true;
  } catch {
    // Skip malformed lines
    return false;
  }
}

/**
 * Execute a streaming fetch to /api/stream with automatic retry on network errors.
 *
 * @throws Only throws AbortError (user-initiated cancel) or non-retryable errors
 *         after all retries are exhausted.
 */
export async function streamWithRetry(options: StreamOptions): Promise<void> {
  const { messages, taskExternalId, mode, signal, callbacks } = options;
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // If this is a retry, notify the UI and wait with exponential backoff
    if (attempt > 0) {
      callbacks.onReconnecting?.(attempt, MAX_RETRIES);
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Check if aborted during the delay
      if (signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
    }

    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages, taskExternalId, mode }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream failed with status ${response.status}`);
      }

      // If this was a retry, notify that we reconnected
      if (attempt > 0) {
        callbacks.onReconnected?.();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          parseSSELine(line, callbacks);
        }
      }

      // Stream completed successfully — no retry needed
      return;
    } catch (err: any) {
      // User-initiated abort — never retry
      if (err.name === "AbortError") {
        throw err;
      }

      lastError = err;

      // Only retry on network/connection errors
      if (!isRetryableError(err) || attempt >= MAX_RETRIES) {
        throw err;
      }

      console.warn(
        `[streamWithRetry] Network error on attempt ${attempt + 1}/${MAX_RETRIES + 1}: ${err.message}. Retrying...`
      );
    }
  }

  // Should not reach here, but just in case
  throw lastError || new Error("Stream failed after retries");
}

/**
 * Map a network error to a user-friendly message.
 * Used by catch blocks in TaskView streaming paths.
 */
export function getStreamErrorMessage(err: any): string {
  if (isRetryableError(err)) {
    return "Connection lost after multiple retry attempts. Please check your network and try again.";
  }
  if (err.message?.includes("timeout")) {
    return "The request timed out. Please try again with a shorter message.";
  }
  if (err.message) {
    return `I encountered an error: ${err.message}. Please try again.`;
  }
  return "Something went wrong. Please try again.";
}
