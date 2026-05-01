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
  onStatus: (status: string, metadata?: Record<string, any>) => void;
  onStepProgress: (progress: any) => void;
  onWebappPreview: (preview: { name: string; url: string; description?: string }) => void;
  onWebappDeployed?: (deployment: { name: string; url: string; projectExternalId?: string; versionLabel?: string }) => void;
  onPreviewRefresh?: (data: { timestamp: number }) => void;
  onConfirmationGate?: (gate: { action: string; description?: string; category?: string }) => void;
  onGateResolved?: (data: { taskExternalId: string; approved: boolean }) => void;
  onConvergence?: (data: { passNumber: number; passType: string; status: string; description?: string; rating?: number; convergenceCount?: number }) => void;
  onInteractiveOutput?: (output: { type: string; title: string; description?: string; previewUrl?: string; openUrl?: string; downloadUrl?: string; isLive?: boolean; statusLabel?: string }) => void;
  /**
   * Manus-parity: Called when the agent auto-continues due to output token limits.
   * maxRounds is -1 for unlimited (Max tier / Manus 1.6 Max), or a positive number
   * for bounded tiers (Speed: 5, Quality: 50).
   */
  onContinuation?: (data: { round: number; maxRounds: number; reason: string }) => void;
  onContextCompressed?: (detail: string) => void;
  /** Session 23: Called with cumulative token usage after each LLM turn */
  onTokenUsage?: (data: { prompt_tokens: number; completion_tokens: number; total_tokens: number; turn: number }) => void;
  onError: (error: string, retryable?: boolean) => void;
  onReconnecting?: (attempt: number, maxRetries: number) => void;
  onReconnected?: () => void;
  /** Pass 5 Step 3: Agent thinking/reasoning content emitted between tool calls */
  onAgentThinking?: (data: { content: string; turn: number }) => void;
  /** Knowledge recalled badge — emitted when cross-session memory is injected */
  onKnowledgeRecalled?: (data: { count: number; keys: string[] }) => void;
  /** AEGIS metadata — classification, quality, plan steps */
  onAegisMeta?: (data: { classification?: { taskType: string; complexity: string; novelty: string; confidence: number }; quality?: { completeness: number; accuracy: number; relevance: number; clarity: number; efficiency: number; overall: number }; planSteps?: string[]; cached?: boolean; improvements?: string[] }) => void;
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
    if (data.status) callbacks.onStatus(data.status, data.metadata);
    if (data.step_progress) callbacks.onStepProgress(data.step_progress);
    if (data.webapp_preview) callbacks.onWebappPreview(data.webapp_preview);
    if (data.webapp_deployed && callbacks.onWebappDeployed) callbacks.onWebappDeployed(data.webapp_deployed);
    if (data.preview_refresh && callbacks.onPreviewRefresh) callbacks.onPreviewRefresh(data.preview_refresh);
    if (data.confirmation_gate && callbacks.onConfirmationGate) callbacks.onConfirmationGate(data.confirmation_gate);
    if (data.gate_resolved && callbacks.onGateResolved) callbacks.onGateResolved(data.gate_resolved);
    if (data.convergence && callbacks.onConvergence) callbacks.onConvergence(data.convergence);
    if (data.interactive_output && callbacks.onInteractiveOutput) callbacks.onInteractiveOutput(data.interactive_output);
    if (data.continuation && callbacks.onContinuation) callbacks.onContinuation(data.continuation);
    if (data.token_usage && callbacks.onTokenUsage) callbacks.onTokenUsage(data.token_usage);
    if (data.type === "context_compressed" && callbacks.onContextCompressed) callbacks.onContextCompressed(data.detail);
    if (data.agent_thinking && callbacks.onAgentThinking) callbacks.onAgentThinking(data.agent_thinking);
    if (data.knowledge_recalled && callbacks.onKnowledgeRecalled) callbacks.onKnowledgeRecalled(data.knowledge_recalled);
    if (data.aegis_meta && callbacks.onAegisMeta) callbacks.onAegisMeta(data.aegis_meta);
    if (data.error) {
      // Detect credit exhaustion errors and dispatch global event for the banner
      const errMsg = (data.error || "").toLowerCase();
      if (errMsg.includes("credits") && (errMsg.includes("exhausted") || errMsg.includes("used up"))) {
        try {
          window.dispatchEvent(new CustomEvent("manus:credit-exhausted"));
        } catch { /* SSR safety */ }
      }
      callbacks.onError(data.error, data.retryable === true);
    }

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
        // 401 = session expired or invalid cookie — redirect to login
        if (response.status === 401) {
          const { getLoginUrl } = await import("@/const");
          window.location.href = getLoginUrl();
          // Throw a specific error so the caller knows auth failed
          throw new Error("Session expired. Redirecting to login...");
        }
        throw new Error(`Stream failed with status ${response.status}`);
      }

      // If this was a retry, notify that we reconnected
      if (attempt > 0) {
        callbacks.onReconnected?.();
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let receivedDone = false;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.includes('"done"')) receivedDone = true;
          parseSSELine(line, callbacks);
        }
      }

      // Process any remaining data in the buffer
      if (buffer.trim()) {
        if (buffer.includes('"done"')) receivedDone = true;
        parseSSELine(buffer, callbacks);
      }

      // If the stream ended without a done event, the server may have closed prematurely.
      // Log it but don't retry — the server-side finish_reason=length handler should
      // have auto-continued. The stream just ended normally after all turns.
      if (!receivedDone) {
        console.warn("[streamWithRetry] Stream closed without receiving done event");
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
    return "Connection was interrupted after several attempts. This usually resolves on its own \u2014 try sending your message again in a moment.";
  }
  if (err.message?.includes("Cannot read properties of") || err.message?.includes("undefined is not an object") || err.message?.includes("null is not an object")) {
    return "A temporary processing error occurred. This usually resolves on its own \u2014 try sending your message again.";
  }
  if (err.message?.includes("timeout")) {
    return "The response took longer than expected. Try breaking your request into smaller parts, or simply try again.";
  }
  if (err.message?.includes("rate limit") || err.message?.includes("429")) {
    return "The system is handling a lot of requests right now. Please wait a moment and try again.";
  }
  if (err.message?.includes("context length") || err.message?.includes("token")) {
    return "This conversation has grown quite long. Try starting a new task, or summarize the key points and continue.";
  }
  if (err.message?.includes("network") || err.message?.includes("fetch")) {
    return "There seems to be a network issue. Check your connection and try again.";
  }
  if (err.message?.includes("500") || err.message?.includes("internal server")) {
    return "Something went wrong on our end. This is temporary \u2014 please try again in a few seconds.";
  }
  if (err.message) {
    const cleanMsg = err.message.replace(/\[.*?\]/g, "").replace(/Error:\s*/i, "").trim();
    return `Something unexpected happened: ${cleanMsg.slice(0, 100)}. Please try again.`;
  }
  return "Something went wrong. Please try again \u2014 if the issue persists, try starting a new task.";
}

/**
 * Check if a message content string is an error/system message that should be
 * excluded from conversation context sent to the LLM.
 */
const ERROR_MSG_PATTERNS = [
  "Connection was interrupted",
  "A temporary processing error occurred",
  "Something went wrong on our end",
  "Something unexpected happened",
  "Something went wrong. Please try again",
  "The response took longer than expected",
  "The system is handling a lot of requests",
  "There seems to be a network issue",
  "This conversation has grown quite long",
  "[Response interrupted",
  "[Generation stopped by user]",
  "Cannot read properties of undefined",
  "Cannot read properties of null",
  "is not a function",
  "Unexpected token",
  "TypeError:",
  "ReferenceError:",
  "SyntaxError:",
  "Internal Server Error",
];

export function isStreamErrorMessage(content: string): boolean {
  // Strip common emoji prefixes (like ⚠️) and whitespace before matching
  const cleaned = content.replace(/^[^a-zA-Z0-9[(\/]+/, "");
  return ERROR_MSG_PATTERNS.some(p => content.includes(p) || cleaned.includes(p));
}
