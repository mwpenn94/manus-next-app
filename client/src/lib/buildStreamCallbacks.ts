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
    onStatus: (status: string) => {
      if (status === "running") setters.updateTaskStatus(setters.taskId, "running");
      if (status === "completed") setters.updateTaskStatus(setters.taskId, "completed");
    },
    onStepProgress: (progress: any) => {
      setters.setStepProgress(progress);
    },
    onError: (error: string) => {
      state.accumulated += `\n\n⚠️ ${error}`;
      setters.accumulatedRef.current = state.accumulated;
      setters.setStreamContent(state.accumulated);
    },
    onReconnecting: (attempt: number, maxRetries: number) => {
      // Signal reconnecting state to the presence indicator
      setters.setIsReconnecting?.(true);
      // Show a subtle reconnecting indicator in the stream content
      setters.setStreamContent(
        state.accumulated + `\n\n*Reconnecting... (attempt ${attempt}/${maxRetries})*`
      );
    },
    onWebappPreview: (preview: { name: string; url: string; description?: string }) => {
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
    },
    onGateResolved: (data: { taskExternalId: string; approved: boolean }) => {
      // Update the pending confirmation gate card to show approved/rejected status
      // This is handled by the gate resolution UI in TaskView, not here.
      // The server sends this event after the user approves/rejects via /api/gate-response.
      console.log(`[Stream] Gate resolved: ${data.approved ? 'approved' : 'rejected'}`);
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
  };
}
