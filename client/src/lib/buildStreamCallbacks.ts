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
      // Show a subtle reconnecting indicator in the stream content
      setters.setStreamContent(
        state.accumulated + `\n\n*Reconnecting... (attempt ${attempt}/${maxRetries})*`
      );
    },
    onWebappPreview: (preview: { name: string; url: string; description?: string }) => {
      // Create a webapp preview card message in the chat
      if (setters.addMessage) {
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
    onReconnected: () => {
      // Restore the clean accumulated content (remove reconnecting message)
      setters.setStreamContent(state.accumulated);
    },
  };
}
