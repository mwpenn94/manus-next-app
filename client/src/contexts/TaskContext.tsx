/**
 * TaskContext — Real Persistence with Workspace Artifact Wiring
 *
 * Critical fixes applied:
 * 1. Client-side nanoid for stable task IDs — no more ID race condition
 * 2. messagesLoaded flag per task — server messages load correctly on refresh
 * 3. Workspace queries naturally enable once serverId is set
 *
 * Bridge artifact pipeline:
 * - task:step metadata.type → workspace.addArtifact (browser_screenshot, browser_url, code, terminal)
 * - task:complete artifacts[] → workspace.addArtifact for each artifact
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { nanoid } from "nanoid";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBridge, type BridgeMessage, type BridgeTaskStep, type BridgeTaskComplete } from "./BridgeContext";

// ── Types ──
export type AgentAction =
  | { type: "browsing"; url: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "scrolling"; status: "active" | "done" | "error"; preview?: string }
  | { type: "clicking"; element: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "executing"; command: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "creating"; file: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "searching"; query: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "generating"; description: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "thinking"; status: "active" | "done" | "error"; preview?: string }
  | { type: "writing"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "researching"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "building"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "editing"; label?: string; file?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "reading"; label?: string; file?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "installing"; label?: string; packages?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "versioning"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "analyzing"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "designing"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "sending"; label?: string; status: "active" | "done" | "error"; preview?: string }
  | { type: "deploying"; label?: string; status: "active" | "done" | "error"; preview?: string };

export type CardType =
  | "browser_auth"
  | "task_pause"
  | "take_control"
  | "webapp_preview"
  | "checkpoint"
  | "task_completed"
  | "confirmation_gate"
  | "convergence"
  | "interactive_output"
  | "webapp_deployed"
  | "system_notice";

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
  /** Special inline card type — renders a rich card instead of plain text */
  cardType?: CardType;
  /** Data payload for the card */
  cardData?: Record<string, unknown>;
}

export interface Task {
  id: string; // Always the server externalId (nanoid) — stable from creation
  title: string;
  status: "idle" | "running" | "completed" | "error" | "paused" | "stopped";
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  workspaceUrl?: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  serverId?: number; // DB auto-increment id, set after server mutation completes
  messagesLoaded?: boolean; // Whether server messages have been hydrated
  autoStreamed?: boolean; // Whether the initial auto-stream has been triggered for this task
  favorite?: number; // 0 = not favorited, 1 = favorited (synced from server)
  projectId?: number | null; // Associated project ID
  staleCompleted?: number; // 1 = task was auto-completed due to stale running state
}

interface TaskContextValue {
  tasks: Task[];
  activeTaskId: string | null;
  activeTask: Task | null;
  createTask: (title: string, initialMessage: string) => string;
  setActiveTask: (id: string | null) => void;
  addMessage: (taskId: string, message: Omit<Message, "id" | "timestamp">) => void;
  removeLastMessage: (taskId: string) => Message | null;
  replaceLastMessage: (taskId: string, newMessage: Omit<Message, "id" | "timestamp">) => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  renameTask: (taskId: string, title: string) => void;
  markAutoStreamed: (taskId: string) => void;
  updateMessageCard: (taskId: string, messageId: string, cardData: Record<string, unknown>) => void;
  updateTaskFavorite: (taskId: string, favorite: number) => void;
  editMessageAndTruncate: (taskId: string, messageId: string, newContent: string) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

let nextMsgId = 100;

// Valid artifact types that the workspace panel can display
const ARTIFACT_TYPES = new Set(["browser_screenshot", "browser_url", "code", "terminal", "generated_image", "document", "document_pdf", "document_docx", "slides", "webapp_preview"]);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const serverSyncedRef = useRef(false);
  // Queue messages that arrive before serverId is set — flush when serverId becomes available
  const pendingMessagesRef = useRef<Map<string, Array<{ role: string; content: string; actions?: any; cardType?: any; cardData?: any }>>>(new Map());

  // tRPC mutations for server persistence
  const createTaskMutation = trpc.task.create.useMutation();
  const addMessageMutation = trpc.task.addMessage.useMutation();
  const updateStatusMutation = trpc.task.updateStatus.useMutation();
  const renameMutation = trpc.task.rename.useMutation();
  const addArtifactMutation = trpc.workspace.addArtifact.useMutation();

  // Fetch server tasks when authenticated
  const serverTasksQuery = trpc.task.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Load server tasks into local state on first load
  useEffect(() => {
    if (!isAuthenticated || serverSyncedRef.current) return;
    if (!serverTasksQuery.data) return;

    const serverTasks = serverTasksQuery.data?.items ?? serverTasksQuery.data;
    if (!serverTasks || !Array.isArray(serverTasks) || serverTasks.length === 0) { serverSyncedRef.current = true; return; }
    if (serverTasks.length > 0) {
      const mapped: Task[] = serverTasks.map((st: any) => ({
        id: st.externalId,
        title: st.title,
        status: st.status,
        messages: [],
        createdAt: new Date(st.createdAt),
        updatedAt: new Date(st.updatedAt),
        totalSteps: st.totalSteps ?? undefined,
        completedSteps: st.completedSteps ?? undefined,
        workspaceUrl: st.workspaceUrl ?? undefined,
        serverId: st.id,
        messagesLoaded: false,
        favorite: st.favorite ?? 0,
        projectId: st.projectId ?? null,
        staleCompleted: st.staleCompleted ?? 0,
      }));
      setTasks((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newTasks = mapped.filter((t) => !existingIds.has(t.id));
        return [...newTasks, ...prev];
      });
    }
    serverSyncedRef.current = true;
  }, [isAuthenticated, serverTasksQuery.data]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  // Fetch messages for server-persisted tasks when they become active
  // Use messagesLoaded flag instead of messages.length to avoid blocking on local messages
  const activeServerId = activeTask?.serverId;
  const needsMessageLoad = activeTask && activeServerId && !activeTask.messagesLoaded;
  const serverMessagesQuery = trpc.task.messages.useQuery(
    { taskId: activeServerId! },
    {
      enabled: isAuthenticated && !!needsMessageLoad,
      retry: false,
      staleTime: 0, // Always refetch when re-enabled (task switch)
    }
  );

  // Merge server messages into the active task
  useEffect(() => {
    if (!activeServerId || !serverMessagesQuery.data) return;
    if (!needsMessageLoad) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.serverId !== activeServerId) return t;
        if (t.messagesLoaded) return t; // Already loaded
        
        const rawServerMsgs: Message[] = serverMessagesQuery.data.map((sm: any) => ({
          id: sm.externalId || `srv-${sm.id}`,
          role: sm.role as Message["role"],
          content: sm.content,
          timestamp: new Date(sm.createdAt),
          actions: sm.actions ? (typeof sm.actions === "string" ? JSON.parse(sm.actions) : sm.actions) : undefined,
          cardType: sm.cardType ?? undefined,
          cardData: sm.cardData ? (typeof sm.cardData === "string" ? JSON.parse(sm.cardData) : sm.cardData) : undefined,
        }));

        // SERVER-SIDE DEDUP: Remove duplicate rows that exist in the server DB.
        // This handles the case where the same assistant message was persisted multiple times
        // (e.g., from dual-persist in addMessage, interrupted+resumed streams, or bridge events).
        // Also remove "[Response interrupted — partial content saved]" messages when the full
        // version exists, since the full response supersedes the partial.
        const serverMsgs: Message[] = [];
        const seenServerKeys = new Set<string>();
        for (const msg of rawServerMsgs) {
          const key = `${msg.role}:${msg.content.slice(0, 300).trim()}`;
          if (seenServerKeys.has(key)) continue; // Skip duplicate server rows
          seenServerKeys.add(key);
          serverMsgs.push(msg);
        }
        // Remove partial interrupted messages if a full version exists
        const interruptMarker = "*[Response interrupted \u2014 partial content saved]*";
        const partialIndices = new Set<number>();
        for (let i = 0; i < serverMsgs.length; i++) {
          const msg = serverMsgs[i];
          if (msg.role === "assistant" && msg.content.endsWith(interruptMarker)) {
            // Check if a later message contains the same content prefix (without the marker)
            const baseContent = msg.content.slice(0, -interruptMarker.length).trim();
            if (baseContent.length < 20) { partialIndices.add(i); continue; } // Very short partial = remove
            for (let j = i + 1; j < serverMsgs.length; j++) {
              if (serverMsgs[j].role === "assistant" && serverMsgs[j].content.startsWith(baseContent.slice(0, 100))) {
                partialIndices.add(i); // Mark partial for removal
                break;
              }
            }
          }
        }
        const dedupedServerMsgs = serverMsgs.filter((_, i) => !partialIndices.has(i));

        // Merge: deduped server messages first, then any local messages not already in server set.
        const serverMsgKeys = new Set(
          dedupedServerMsgs.map(m => `${m.role}:${m.content.slice(0, 300).trim()}`)
        );
        const uniqueLocalMsgs = t.messages.filter(
          m => !serverMsgKeys.has(`${m.role}:${m.content.slice(0, 300).trim()}`)
        );
        
        // Sort merged messages by timestamp to ensure correct ordering
        const merged = [...dedupedServerMsgs, ...uniqueLocalMsgs].sort((a, b) => {
          const ta = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
          const tb = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
          return ta - tb;
        });
        return { ...t, messages: merged, messagesLoaded: true };
      })
    );
  }, [activeServerId, serverMessagesQuery.data, needsMessageLoad]);

  const createTask = useCallback((title: string, initialMessage: string) => {
    // Generate stable ID on the client — this ID is used everywhere from the start
    const id = nanoid(12);
    const now = new Date();
    const newTask: Task = {
      id,
      title,
      status: "idle",
      createdAt: now,
      updatedAt: now,
      messagesLoaded: true, // We have the messages locally, no need to fetch
      messages: [
        {
          id: `msg-${nextMsgId++}`,
          role: "user",
          content: initialMessage,
          timestamp: now,
        },
      ],
    };
    setTasks((prev) => [newTask, ...prev]);
    setActiveTaskId(id);

    // Persist to server if authenticated — pass the same externalId
    if (isAuthenticated) {
      createTaskMutation.mutate(
        { title, externalId: id },
        {
          onSuccess: (result) => {
            // Only set serverId — the task.id is already correct (same nanoid)
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id ? { ...t, serverId: result.id } : t
              )
            );
            // Persist the initial message
            if (result.id) {
              addMessageMutation.mutate({
                taskId: result.id,
                role: "user",
                content: initialMessage,
              });
              // Flush any messages that were queued while waiting for serverId
              const queued = pendingMessagesRef.current.get(id);
              if (queued && queued.length > 0) {
                for (const qm of queued) {
                  addMessageMutation.mutate({
                    taskId: result.id,
                    role: qm.role as any,
                    content: qm.content,
                    actions: qm.actions,
                    cardType: qm.cardType,
                    cardData: qm.cardData,
                  });
                }
                pendingMessagesRef.current.delete(id);
              }
            }
          },
        }
      );
    }

    return id;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
  }, [isAuthenticated, createTaskMutation.mutate, addMessageMutation.mutate]);

  const setActiveTask = useCallback((id: string | null) => {
    // When switching away from a task, persist any unsaved messages to the server
    // before resetting messagesLoaded. This ensures streaming progress isn't lost.
    setTasks((prev) => {
      const currentTask = prev.find((t) => t.id === activeTaskId);
      if (currentTask?.serverId && isAuthenticated && currentTask.messages.length > 0) {
        // The messages are already persisted individually via addMessage.
        // Just reset messagesLoaded so they'll be re-fetched from DB on return.
      }
      return prev.map((t) =>
        t.id === activeTaskId && t.serverId
          ? { ...t, messagesLoaded: false }
          : t
      );
    });
    setActiveTaskId(id);
  }, [activeTaskId, isAuthenticated]);

  const addMessage = useCallback(
    (taskId: string, message: Omit<Message, "id" | "timestamp">) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (!task) return prev;

        // LOCAL DEDUP GUARD: Prevent adding the same message content twice.
        // This catches the case where addMessage is called multiple times for the
        // same assistant response (e.g., from stream completion + bridge event).
        const contentKey = `${message.role}:${message.content.slice(0, 300).trim()}`;
        const lastFew = task.messages.slice(-5);
        const isDuplicate = lastFew.some(
          (m) => `${m.role}:${m.content.slice(0, 300).trim()}` === contentKey
        );
        if (isDuplicate) return prev; // Skip — already in the local message list

        // Persist to server if task has a serverId
        if (task.serverId && isAuthenticated) {
          addMessageMutation.mutate({
            taskId: task.serverId,
            role: message.role,
            content: message.content,
            actions: message.actions ?? undefined,
            cardType: message.cardType ?? undefined,
            cardData: message.cardData ?? undefined,
          });
        } else if (isAuthenticated && !task.serverId) {
          // Queue the message — serverId hasn't arrived yet (createTask still in flight)
          const queue = pendingMessagesRef.current.get(taskId) ?? [];
          queue.push({
            role: message.role,
            content: message.content,
            actions: message.actions ?? undefined,
            cardType: message.cardType ?? undefined,
            cardData: message.cardData ?? undefined,
          });
          pendingMessagesRef.current.set(taskId, queue);
        }
        return prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updatedAt: new Date(),
                messages: [
                  ...t.messages,
                  { ...message, id: `msg-${nextMsgId++}`, timestamp: new Date() },
                ],
              }
            : t
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addMessageMutation.mutate is stable (tRPC)
    [isAuthenticated, addMessageMutation.mutate]
  );

  /**
   * Remove the last message from a task and return it.
   * Used for regenerate — removes the last assistant response so we can re-generate.
   * Note: This only removes from local state, not from the server DB.
   */
  const removeLastMessage = useCallback(
    (taskId: string): Message | null => {
      let removed: Message | null = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId || t.messages.length === 0) return t;
          removed = t.messages[t.messages.length - 1];
          return {
            ...t,
            updatedAt: new Date(),
            messages: t.messages.slice(0, -1),
          };
        })
      );
      return removed;
    },
    []
  );

  const replaceLastMessage = useCallback(
    (taskId: string, newMessage: Omit<Message, "id" | "timestamp">) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId || t.messages.length === 0) return t;
          const replaced: Message = {
            ...newMessage,
            id: String(nextMsgId++),
            timestamp: new Date(),
          };
          return {
            ...t,
            updatedAt: new Date(),
            messages: [...t.messages.slice(0, -1), replaced],
          };
        })
      );
    },
    []
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: Task["status"]) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (task?.id && isAuthenticated) {
          updateStatusMutation.mutate({ externalId: task.id, status });
        }
        return prev.map((t) =>
          t.id === taskId ? { ...t, status, updatedAt: new Date() } : t
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
    [isAuthenticated, updateStatusMutation.mutate]
  );

  const renameTask = useCallback(
    (taskId: string, title: string) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        if (task?.id && isAuthenticated) {
          renameMutation.mutate({ externalId: task.id, title });
        }
        return prev.map((t) =>
          t.id === taskId ? { ...t, title, updatedAt: new Date() } : t
        );
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
    [isAuthenticated, renameMutation.mutate]
  );

  // ── Wire bridge events into task state ──
  const { onTaskEvent, status: bridgeStatus } = useBridge();

  // Helper: resolve serverId from taskId for artifact persistence
  const resolveServerId = useCallback((taskId: string): number | null => {
    const task = tasks.find((t) => t.id === taskId);
    return task?.serverId ?? null;
  }, [tasks]);

  // Helper: persist a workspace artifact from bridge event metadata
  const persistArtifact = useCallback(
    (taskId: string, artifactType: string, data: { label?: string; content?: string; url?: string }) => {
      if (!isAuthenticated) return;
      if (!ARTIFACT_TYPES.has(artifactType)) return;
      const serverId = resolveServerId(taskId);
      if (!serverId) return;
      addArtifactMutation.mutate({
        taskId: serverId,
        artifactType: artifactType as any,
        label: data.label,
        content: data.content,
        url: data.url,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
    [isAuthenticated, resolveServerId, addArtifactMutation.mutate]
  );

  // Helper to persist bridge-driven status updates to server
  const persistBridgeStatus = useCallback(
    (taskId: string, status: Task["status"]) => {
      if (!isAuthenticated) return;
      const task = tasks.find((t) => t.id === taskId);
      if (task?.id) {
        updateStatusMutation.mutate({ externalId: task.id, status });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
    [isAuthenticated, tasks, updateStatusMutation.mutate]
  );

  const persistBridgeMessage = useCallback(
    (taskId: string, role: "user" | "assistant" | "system", content: string, actions?: Array<Record<string, unknown>>) => {
      if (!isAuthenticated) return;
      const task = tasks.find((t) => t.id === taskId);
      if (task?.serverId) {
        addMessageMutation.mutate({
          taskId: task.serverId,
          role,
          content,
          actions,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- .mutate is stable (tRPC)
    [isAuthenticated, tasks, addMessageMutation.mutate]
  );

  useEffect(() => {
    if (bridgeStatus !== "connected") return;

    const unsubscribe = onTaskEvent((event: BridgeMessage) => {
      switch (event.type) {
        case "task:start": {
          const e = event as { type: "task:start"; taskId: string; prompt: string };
          setTasks((prev) =>
            prev.map((t) =>
              t.id === e.taskId
                ? { ...t, status: "running" as const, updatedAt: new Date() }
                : t
            )
          );
          persistBridgeStatus(e.taskId, "running");
          break;
        }
        case "task:step": {
          const e = event as BridgeTaskStep;
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== e.taskId) return t;
              const updated: Task = {
                ...t,
                updatedAt: new Date(),
                totalSteps: e.totalSteps,
                completedSteps: e.stepIndex,
                currentStep: e.action,
              };

              // ── Persist workspace artifacts from step metadata ──
              if (e.metadata) {
                const meta = e.metadata;
                const artifactType = meta.type as string | undefined;

                if (artifactType === "browser_screenshot" && meta.url) {
                  persistArtifact(e.taskId, "browser_screenshot", {
                    url: meta.url as string,
                    label: (meta.label as string) || e.action,
                  });
                  if (meta.pageUrl) {
                    updated.workspaceUrl = meta.pageUrl as string;
                    persistArtifact(e.taskId, "browser_url", {
                      url: meta.pageUrl as string,
                      label: (meta.pageTitle as string) || "Browser",
                    });
                  }
                } else if (artifactType === "browser_url" && meta.url) {
                  updated.workspaceUrl = meta.url as string;
                  persistArtifact(e.taskId, "browser_url", {
                    url: meta.url as string,
                    label: (meta.title as string) || "Browser",
                  });
                } else if (artifactType === "code" && (meta.content || meta.url)) {
                  persistArtifact(e.taskId, "code", {
                    content: meta.content as string | undefined,
                    url: meta.url as string | undefined,
                    label: (meta.filename as string) || (meta.label as string) || e.action,
                  });
                } else if (artifactType === "terminal" && (meta.content || meta.output)) {
                  persistArtifact(e.taskId, "terminal", {
                    content: (meta.output as string) || (meta.content as string),
                    label: (meta.command as string) || e.action,
                  });
                } else if (artifactType === "generated_image" && meta.url) {
                  persistArtifact(e.taskId, "generated_image", {
                    url: meta.url as string,
                    label: (meta.label as string) || e.action,
                  });
                } else if ((artifactType === "document" || artifactType === "document_pdf" || artifactType === "document_docx") && meta.url) {
                  persistArtifact(e.taskId, artifactType, {
                    url: meta.url as string,
                    label: (meta.label as string) || e.action,
                  });
                } else if (artifactType === "slides" && meta.url) {
                  persistArtifact(e.taskId, "slides", {
                    url: meta.url as string,
                    label: (meta.label as string) || e.action,
                  });
                } else if (artifactType === "webapp_preview" && meta.url) {
                  updated.workspaceUrl = meta.url as string;
                  persistArtifact(e.taskId, "webapp_preview", {
                    url: meta.url as string,
                    label: (meta.label as string) || "Web App Preview",
                  });
                }
              }

              if (e.content) {
                const stepStatus: "active" | "done" = e.status === "error" ? "done" : e.status;
                const stepContent = e.status === "error" ? `⚠️ ${e.content}` : e.content;
                updated.messages = [
                  ...t.messages,
                  {
                    id: `bridge-step-${e.stepIndex}-${Date.now()}`,
                    role: "assistant",
                    content: stepContent,
                    timestamp: new Date(),
                    actions: [
                      {
                        type: "executing" as const,
                        command: e.action,
                        status: stepStatus,
                      },
                    ],
                  },
                ];
                persistBridgeMessage(e.taskId, "assistant", stepContent,
                  [{ type: "executing", command: e.action, status: stepStatus }]);
              }
              return updated;
            })
          );
          break;
        }
        case "task:complete": {
          const e = event as BridgeTaskComplete;
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== e.taskId) return t;

              // ── Persist workspace artifacts from completion ──
              if (e.artifacts && e.artifacts.length > 0) {
                for (const artifact of e.artifacts) {
                  if (ARTIFACT_TYPES.has(artifact.type)) {
                    persistArtifact(e.taskId, artifact.type, {
                      url: artifact.url,
                      label: artifact.name,
                    });
                  }
                }
              }

              return {
                ...t,
                status: "completed" as const,
                updatedAt: new Date(),
                completedSteps: t.totalSteps,
                messages: [
                  ...t.messages,
                  {
                    id: `bridge-complete-${Date.now()}`,
                    role: "assistant",
                    content: e.result,
                    timestamp: new Date(),
                  },
                ],
              };
            })
          );
          persistBridgeStatus(e.taskId, "completed");
          persistBridgeMessage(e.taskId, "assistant", e.result);
          break;
        }
        case "task:error": {
          const e = event as {
            type: "task:error";
            taskId: string;
            error: string;
          };
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== e.taskId) return t;
              return {
                ...t,
                status: "error" as const,
                updatedAt: new Date(),
                messages: [
                  ...t.messages,
                  {
                    id: `bridge-error-${Date.now()}`,
                    role: "system",
                    content: `Error: ${e.error}`,
                    timestamp: new Date(),
                  },
                ],
              };
            })
          );
          persistBridgeStatus(e.taskId, "error");
          persistBridgeMessage(e.taskId, "system", `Error: ${e.error}`);
          break;
        }
      }
    });

    return unsubscribe;
  }, [bridgeStatus, onTaskEvent, persistBridgeStatus, persistBridgeMessage, persistArtifact]);

  const markAutoStreamed = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, autoStreamed: true } : t))
    );
  }, []);

  const updateMessageCard = useCallback(
    (taskId: string, messageId: string, newCardData: Record<string, unknown>) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === messageId
                ? { ...m, cardData: { ...(m.cardData || {}), ...newCardData } }
                : m
            ),
          };
        })
      );
    },
    []
  );

  const updateTaskFavorite = useCallback((taskId: string, favorite: number) => {
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, favorite } : t));
  }, []);

  /**
   * Edit a user message and truncate all messages after it.
   * Used for "edit & re-send" — modifies the message content and removes
   * everything that came after it so the agent can re-process.
   */
  const editMessageAndTruncate = useCallback(
    (taskId: string, messageId: string, newContent: string) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const msgIndex = t.messages.findIndex((m) => m.id === messageId);
          if (msgIndex === -1) return t;
          const updatedMessages = t.messages.slice(0, msgIndex + 1).map((m, i) =>
            i === msgIndex ? { ...m, content: newContent } : m
          );
          return { ...t, messages: updatedMessages, updatedAt: new Date() };
        })
      );
    },
    []
  );

  return (
    <TaskContext.Provider
      value={{
        tasks,
        activeTaskId,
        activeTask,
        createTask,
        setActiveTask,
        addMessage,
        removeLastMessage,
        replaceLastMessage,
        updateTaskStatus,
        renameTask,
        markAutoStreamed,
        updateMessageCard,
        updateTaskFavorite,
        editMessageAndTruncate,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTask() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTask must be used within TaskProvider");
  return ctx;
}
