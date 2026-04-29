/**
 * buildStreamCallbacks — Builds the standard SSE callback set used by all
 * streaming paths in TaskView (auto-stream, handleSend, hands-free, regenerate).
 *
 * This eliminates the duplicated SSE parsing logic across 4 streaming blocks.
 */

import type { StreamCallbacks } from "./streamWithRetry";

export interface StreamState {
  accumulated: string;
  actions: any[];
  images: string[];
  /** Source URLs collected from tool results (web_search, read_webpage) for citation linking */
  sourceUrls: Array<{ name: string; url: string }>;
  _webappPreviewsSeen?: Set<string>;
  _previewRefreshCounter?: number;
}

export interface StreamStateSetters {
  setStreamContent: (content: string) => void;
  setAgentActions: (actions: any[]) => void;
  setStreamImages: (images: string[]) => void;
  setStepProgress: (progress: any) => void;
  updateTaskStatus: (taskId: string, status: "running" | "completed" | "error" | "idle" | "paused" | "stopped") => void;
  accumulatedRef: React.MutableRefObject<string>;
  actionsRef: React.MutableRefObject<any[]>;
  mapToolToAction: (type: string, label: string, args: any, status: "active" | "done") => any;
  taskId: string;
  addMessage?: (taskId: string, msg: any) => void;
  setIsReconnecting?: (reconnecting: boolean) => void;
  setLastErrorRetryable?: (retryable: boolean) => void;
  /** Session 25 Pass 3: Signal that a generation request completed without producing an artifact */
  setGenerationIncomplete?: (incomplete: boolean) => void;
  /** Session 23: Token usage state setter */
  setTokenUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number; turn: number } | null) => void;
  /** Knowledge recalled badge state setter */
  setKnowledgeRecalled?: (data: { count: number; keys: string[] } | null) => void;
  /** Update an existing message's cardData (e.g., to mark preview as published after deploy) */
  updateMessageCard?: (taskId: string, messageId: string, cardData: Record<string, unknown>) => void;
  /** Get current task messages for cross-card updates */
  getTaskMessages?: () => Array<{ id: string; cardType?: string; cardData?: Record<string, unknown> }>;
  /** GAP A: Callback to trigger iframe refresh in WebappPreviewCard */
  onPreviewRefreshSignal?: () => void;
  /** Update the webapp preview URL when S3 re-upload provides a new URL */
  onPreviewUrlUpdate?: (url: string) => void;
}

/**
 * Post-process plain-text citations into clickable markdown links.
 * Converts patterns like:
 *   (Source: MIT News)  →  ([MIT News](https://news.mit.edu/...))
 *   (Source: ScienceDaily)  →  ([ScienceDaily](https://sciencedaily.com/...))
 *   (Sources: Name1, Name2)  →  ([Name1](url1), [Name2](url2))
 */
export function linkifyCitations(
  content: string,
  sourceUrls: Array<{ name: string; url: string }>,
): string {
  if (!sourceUrls.length || !content) return content;

  // Build a lookup map: lowercase source name fragments → url
  const urlMap = new Map<string, string>();
  for (const src of sourceUrls) {
    // Extract domain name as a key (e.g., "news.mit.edu" → "mit")
    try {
      const hostname = new URL(src.url).hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      // Use the main domain part (e.g., "sciencedaily" from "sciencedaily.com")
      for (const part of parts) {
        if (part.length > 2 && part !== "com" && part !== "org" && part !== "net" && part !== "edu" && part !== "gov" && part !== "io") {
          urlMap.set(part.toLowerCase(), src.url);
        }
      }
      // Also map the full hostname
      urlMap.set(hostname.toLowerCase(), src.url);
    } catch {
      // Skip invalid URLs
    }
    // Map the tool name if it looks like a source name
    if (src.name && src.name !== "Source" && src.name !== "web_search" && src.name !== "read_webpage") {
      urlMap.set(src.name.toLowerCase(), src.url);
    }
  }

  // Match patterns: (Source: Name) or (Sources: Name1, Name2) or [Source: Name]
  return content.replace(
    /[([](Sources?|Via|From|Ref|Reference):\s*([^)\]]+)[)\]]/gi,
    (match, _prefix, namesPart) => {
      // Split multiple sources: "MIT News, ScienceDaily"
      const names = namesPart.split(/,\s*/).map((n: string) => n.trim()).filter(Boolean);
      const linked = names.map((name: string) => {
        const nameLower = name.toLowerCase();
        // Try exact match first
        if (urlMap.has(nameLower)) {
          return `[${name}](${urlMap.get(nameLower)})`;
        }
        // Try partial match: check if any key is contained in the name or vice versa
        for (const [key, url] of Array.from(urlMap.entries())) {
          if (nameLower.includes(key) || key.includes(nameLower)) {
            return `[${name}](${url})`;
          }
        }
        // No match found — return as-is
        return name;
      });
      // If at least one was linked, wrap in parens
      const anyLinked = linked.some((l: string) => l.includes("](http"));
      if (anyLinked) {
        return `(${linked.join(", ")})`;
      }
      return match; // No matches found, return original
    }
  );
}

export function buildStreamCallbacks(
  state: StreamState,
  setters: StreamStateSetters,
): StreamCallbacks {
  return {
    onDelta: (delta: string) => {
      state.accumulated += delta;
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
    },
    onToolStart: (toolStart: any) => {
      const display = toolStart.display || {};
      const actionType = display.type || "thinking";
      const newAction = setters.mapToolToAction(
        actionType,
        display.label || toolStart.name,
        toolStart.args,
        "active"
      );
      state.actions.push(newAction);
      setters.actionsRef.current = [...state.actions];
      setters.setAgentActions([...state.actions]);
    },
    onToolResult: (toolResult: any) => {
      const idx = state.actions.findIndex((a: any) => a.status === "active");
      if (idx >= 0) {
        const preview = toolResult.preview
          ? String(toolResult.preview).slice(0, 500)
          : undefined;
        state.actions[idx] = {
          ...state.actions[idx],
          status: "done",
          preview,
        };
        setters.actionsRef.current = [...state.actions];
        setters.setAgentActions([...state.actions]);
      }
      // Track source URLs from search/browse results for citation post-processing
      if (toolResult.url && typeof toolResult.url === "string") {
        const name = toolResult.name || "Source";
        state.sourceUrls.push({ name, url: toolResult.url });
      }
    },
    onImage: (imageUrl: string) => {
      state.images.push(imageUrl);
      setters.setStreamImages([...state.images]);
      state.accumulated += `\n\n![Generated Image](${imageUrl})\n\n`;
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
    },
    onDocument: (doc: { title: string; url: string; format?: string }) => {
      const docTitle = doc.title || "Document";
      const fmt = doc.format?.toLowerCase() || "";
      const urlLower = doc.url?.toLowerCase() || "";
      const isPdf = fmt === "pdf" || urlLower.endsWith(".pdf");
      const isDocx = fmt === "docx" || urlLower.endsWith(".docx");
      const isXlsx = fmt === "xlsx" || urlLower.endsWith(".xlsx") || fmt === "csv" || urlLower.endsWith(".csv");
      const isRichDoc = isPdf || isDocx || isXlsx;
      if (isRichDoc && setters.addMessage) {
        const outputType = isXlsx ? "spreadsheet" : "document";
        const formatLabel = isPdf ? "PDF" : isDocx ? "Word" : isXlsx ? "Spreadsheet" : "Document";
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: `\uD83D\uDCC4 **${docTitle}** is ready`,
          cardType: "interactive_output" as const,
          cardData: {
            outputType,
            title: docTitle,
            description: `${formatLabel} document generated`,
            previewUrl: isPdf ? doc.url : undefined,
            openUrl: doc.url,
            downloadUrl: doc.url,
          },
        });
      } else {
        // Plain or no addMessage: inline markdown link
        state.accumulated += `\n\n\uD83D\uDCC4 **${docTitle}** — [Download Document](${doc.url})\n\n`;
        setters.accumulatedRef.current = state.accumulated;
        setters.setStreamContent(state.accumulated);
      }
    },
    onDone: (content: string) => {
      state.accumulated = content || state.accumulated;
      setters.accumulatedRef.current = state.accumulated;
      // Append images to content if they were generated (check each individually to avoid duplicates)
      if (state.images.length > 0) {
        let appended = false;
        for (const img of state.images) {
          if (!state.accumulated.includes(img)) {
            state.accumulated += `\n\n![Generated Image](${img})`;
            appended = true;
          }
        }
        if (appended) setters.accumulatedRef.current = state.accumulated;
      }
      // Post-process: Convert plain-text citations to clickable markdown links
      // Matches patterns like (Source: Name), (Source: Name, Name2), [Source: Name]
      if (state.sourceUrls.length > 0) {
        state.accumulated = linkifyCitations(state.accumulated, state.sourceUrls);
        setters.accumulatedRef.current = state.accumulated;
      }
    },
    onStatus: (status: string, metadata?: Record<string, any>) => {
      if (status === "running") setters.updateTaskStatus(setters.taskId, "running");
      if (status === "completed") {
        setters.updateTaskStatus(setters.taskId, "completed");
        // Surface generationIncomplete flag so the UI can show appropriate follow-ups
        if (metadata?.generationIncomplete && setters.setGenerationIncomplete) {
          setters.setGenerationIncomplete(true);
        }
      }
    },
    onStepProgress: (progress: any) => {
      setters.setStepProgress(progress);
    },
    onError: (error: string, retryable?: boolean) => {
      if (retryable) {
        state.accumulated += `\n\n\u26a0\ufe0f ${error}\n\nYou can try sending your message again.`;
      } else {
        state.accumulated += `\n\n\u26a0\ufe0f ${error}`;
      }
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
      // Signal the retryable state to TaskView so it can show a Retry button
      if (retryable && setters.setLastErrorRetryable) {
        setters.setLastErrorRetryable(true);
      }
    },
    onReconnecting: (attempt: number, maxRetries: number) => {
      // Pass 67: Signal reconnecting state to presence indicator only.
      // Do NOT inject visible text into the stream — the ActiveToolIndicator
      // already shows a reconnecting state. This prevents ugly mid-chat error text.
      setters.setIsReconnecting?.(true);
    },
    onWebappPreview: (preview: { name: string; url: string; description?: string; projectExternalId?: string }) => {
      // Create a webapp preview card message in the chat — but only once per app name.
      // The server may fire multiple webapp_preview events for the same project; dedup here.
      if (setters.addMessage) {
        // Track which webapp names have already been shown in this stream session
        if (!state._webappPreviewsSeen) state._webappPreviewsSeen = new Set<string>();
        const seen = state._webappPreviewsSeen;
        if (seen.has(preview.name)) return; // Already shown this app preview
        seen.add(preview.name);

        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: "", // Card renders visually; no text content needed
          cardType: "webapp_preview" as const,
          cardData: {
            appName: preview.name,
            previewUrl: preview.url,
            status: "running",
            hasUnpublishedChanges: true,
            projectExternalId: preview.projectExternalId,
          },
        });
      }
      // No fallback text injection — the card IS the message
    },
    onConfirmationGate: () => {
      // Gate system removed — tools execute autonomously
    },
    onGateResolved: () => {
      // Gate system removed — no-op
    },
    onConvergence: (data: { passNumber: number; passType: string; status: string; description?: string; rating?: number; convergenceCount?: number }) => {
      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: `Pass ${data.passNumber} — ${data.passType}`,
          cardType: "convergence" as const,
          cardData: data,
        });
      }
    },
    onInteractiveOutput: (output: { type: string; title: string; description?: string; previewUrl?: string; openUrl?: string; downloadUrl?: string; isLive?: boolean; statusLabel?: string }) => {
      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: `${output.title}`,
          cardType: "interactive_output" as const,
          cardData: {
            outputType: output.type,
            ...output,
          },
        });
      }
    },
    onContinuation: (data: { round: number; maxRounds: number; reason: string }) => {
      // Manus-parity: The agent is auto-continuing due to output token limits.
      // Show a subtle continuation indicator in the stream content, then remove it
      // when the next delta arrives (the delta handler overwrites streamContent).
      // This prevents the "Regenerate" button from appearing during continuation.
      // For Max tier (unlimited), maxRounds is -1 — show just the round number.
      const limitDisplay = data.maxRounds < 0 ? '\u221e' : data.maxRounds;
      console.log(`[Stream] Auto-continuation round ${data.round}/${limitDisplay} (${data.reason})`);
      setters.setStreamContent(
        state.accumulated + `\n\n*Continuing... (round ${data.round})*`
      );
    },
    onReconnected: () => {
      // Clear reconnecting state
      setters.setIsReconnecting?.(false);
      // Restore the clean accumulated content (remove reconnecting message)
      setters.setStreamContent(state.accumulated);
    },
    onTokenUsage: (data: { prompt_tokens: number; completion_tokens: number; total_tokens: number; turn: number }) => {
      setters.setTokenUsage?.(data);
    },
    onContextCompressed: (detail: string) => {
      // F1.1: Show context compression visibility indicator
      // Add a subtle system note in the stream so the user knows context was optimized
      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: detail,
          cardType: "system_notice" as const,
          cardData: { type: "context_compressed", detail },
        });
      } else {
        // Fallback: append as italic system note
        state.accumulated += `\n\n*\u{1F4CB} ${detail}*\n\n`;
        setters.accumulatedRef.current = state.accumulated;
        setters.setStreamContent(state.accumulated);
      }
    },
    onAgentThinking: (data: { content: string; turn: number }) => {
      // Pass 5 Step 3: Surface agent reasoning as a collapsible thinking action
      // This creates a "thinking" action with the reasoning content as preview
      const thinkingAction = setters.mapToolToAction("thinking", "Reasoning", {}, "done");
      thinkingAction.preview = data.content.slice(0, 500);
      state.actions.push(thinkingAction);
      setters.actionsRef.current = [...state.actions];
      setters.setAgentActions([...state.actions]);
    },
    onKnowledgeRecalled: (data: { count: number; keys: string[] }) => {
      setters.setKnowledgeRecalled?.(data);
    },
    onWebappDeployed: (deployment: { name: string; url: string; projectExternalId?: string; versionLabel?: string }) => {
      // GAP B: Update the existing webapp_preview card to show "published" status
      if (setters.updateMessageCard && setters.getTaskMessages) {
        const messages = setters.getTaskMessages();
        // Try matching by projectExternalId first, then fall back to matching by app name
        let previewMsg = deployment.projectExternalId
          ? messages.find(
              (m) => m.cardType === "webapp_preview" && m.cardData?.projectExternalId === deployment.projectExternalId
            )
          : undefined;
        // Fallback: match by app name if projectExternalId didn't match
        if (!previewMsg) {
          previewMsg = messages.find(
            (m) => m.cardType === "webapp_preview" && m.cardData?.appName === deployment.name
          );
        }
        // Last resort: match any webapp_preview card (there's usually only one per task)
        if (!previewMsg) {
          previewMsg = messages.find((m) => m.cardType === "webapp_preview");
        }
        if (previewMsg) {
          setters.updateMessageCard(setters.taskId, previewMsg.id, {
            status: "published",
            domain: deployment.url.replace(/^https?:\/\//, ""),
            publishedUrl: deployment.url,
            hasUnpublishedChanges: false,
            projectExternalId: deployment.projectExternalId || previewMsg.cardData?.projectExternalId,
          });
          return; // Done — card updated in-place, no new message needed
        }
      }

      // Fallback: If no existing preview card found, create one (shouldn't normally happen)
      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: "", // Card renders visually
          cardType: "webapp_preview" as const,
          cardData: {
            appName: deployment.name,
            previewUrl: deployment.url,
            publishedUrl: deployment.url,
            status: "published",
            domain: deployment.url.replace(/^https?:\/\//, ""),
            hasUnpublishedChanges: false,
            projectExternalId: deployment.projectExternalId,
          },
        });
      }
      // No raw URL injection into accumulated text
    },
    onPreviewRefresh: (data: { timestamp: number; url?: string }) => {
      // GAP A: Debounce preview refresh — only trigger every 2 seconds max
      const now = Date.now();
      const lastRefresh = state._previewRefreshCounter || 0;
      if (now - lastRefresh > 2000) {
        state._previewRefreshCounter = now;
        // If a new S3 URL is provided, update the webapp preview URL
        if (data.url && setters.onPreviewUrlUpdate) {
          setters.onPreviewUrlUpdate(data.url);
        }
        setters.onPreviewRefreshSignal?.();
      }
    },
  };
}
