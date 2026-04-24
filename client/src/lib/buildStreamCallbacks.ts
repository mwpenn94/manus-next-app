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
  setPendingGate?: (gate: { action: string; description?: string; category?: string; taskId: string } | null) => void;
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
    },
    onImage: (imageUrl: string) => {
      state.images.push(imageUrl);
      setters.setStreamImages([...state.images]);
      state.accumulated += `\n\n![Generated Image](${imageUrl})\n\n`;
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
    },
    onDocument: (doc: { title: string; url: string }) => {
      const docTitle = doc.title || "Document";
      state.accumulated += `\n\n📄 **${docTitle}** — [Download Document](${doc.url})\n\n`;
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
    },
    onDone: (content: string) => {
      state.accumulated = content || state.accumulated;
      setters.accumulatedRef.current = state.accumulated;
      // Append images to content if they were generated
      if (state.images.length > 0 && !state.accumulated.includes(state.images[0])) {
        for (const img of state.images) {
          state.accumulated += `\n\n![Generated Image](${img})`;
        }
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
      // Signal reconnecting state to the presence indicator
      setters.setIsReconnecting?.(true);
      // Show a subtle reconnecting indicator in the stream content
      setters.setStreamContent(
        state.accumulated + `\n\n*Reconnecting... (attempt ${attempt}/${maxRetries})*`
      );
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
          content: `🌐 **${preview.name}** is ready! [Open Preview](${preview.url})${preview.description ? `\n\n${preview.description}` : ""}`,
          cardType: "webapp_preview" as const,
          cardData: {
            appName: preview.name,
            previewUrl: preview.url,
            status: "running",
            hasUnpublishedChanges: true,
            projectExternalId: preview.projectExternalId,
          },
        });
      } else {
        // Fallback: append as markdown link
        state.accumulated += `\n\n🌐 **${preview.name}** — [Open Preview](${preview.url})\n\n`;
        setters.accumulatedRef.current = state.accumulated;
        setters.setStreamContent(state.accumulated);
      }
    },
    onConfirmationGate: (gate: { action: string; description?: string; category?: string }) => {
      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: gate.action,
          cardType: "confirmation_gate" as const,
          cardData: {
            action: gate.action,
            description: gate.description,
            category: gate.category || "general",
            status: "pending",
          },
        });
      }
      // Wire pendingGate so ActiveToolIndicator shows inline approval at bottom
      setters.setPendingGate?.({
        action: gate.action,
        description: gate.description,
        category: gate.category,
        taskId: setters.taskId,
      });
    },
    onGateResolved: (data: { taskExternalId: string; approved: boolean }) => {
      console.log(`[Stream] Gate resolved: ${data.approved ? 'approved' : 'rejected'}`);
      // Clear pendingGate so the inline approval card disappears from ActiveToolIndicator
      setters.setPendingGate?.(null);
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
        }
      }

      if (setters.addMessage) {
        setters.addMessage(setters.taskId, {
          role: "assistant",
          content: `\u{1F680} **${deployment.name}** has been deployed! [Visit Live Site](${deployment.url})${deployment.versionLabel ? ` (${deployment.versionLabel})` : ""}`,
          cardType: "webapp_deployed" as const,
          cardData: {
            appName: deployment.name,
            deployedUrl: deployment.url,
            projectExternalId: deployment.projectExternalId,
            versionLabel: deployment.versionLabel,
            status: "live",
          },
        });
      } else {
        state.accumulated += `\n\n\u{1F680} **${deployment.name}** deployed! [Visit Live Site](${deployment.url})\n\n`;
        setters.accumulatedRef.current = state.accumulated;
        setters.setStreamContent(state.accumulated);
      }
    },
    onPreviewRefresh: () => {
      // GAP A: Debounce preview refresh — only trigger every 2 seconds max
      const now = Date.now();
      const lastRefresh = state._previewRefreshCounter || 0;
      if (now - lastRefresh > 2000) {
        state._previewRefreshCounter = now;
        setters.onPreviewRefreshSignal?.();
      }
    },
  };
}
