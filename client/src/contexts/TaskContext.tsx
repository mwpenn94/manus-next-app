/**
 * TaskContext — Real Persistence
 *
 * When unauthenticated: empty task list with CTA to sign in.
 * When authenticated: creates tasks via tRPC, persists to database,
 * receives real LLM responses via SSE, and bridge events via WebSocket.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBridge, type BridgeMessage } from "./BridgeContext";

// ── Types ──
export type AgentAction =
  | { type: "browsing"; url: string; status: "active" | "done" }
  | { type: "scrolling"; status: "active" | "done" }
  | { type: "clicking"; element: string; status: "active" | "done" }
  | { type: "executing"; command: string; status: "active" | "done" }
  | { type: "creating"; file: string; status: "active" | "done" }
  | { type: "searching"; query: string; status: "active" | "done" }
  | { type: "generating"; description: string; status: "active" | "done" }
  | { type: "thinking"; status: "active" | "done" };

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
}

export interface Task {
  id: string;
  title: string;
  status: "idle" | "running" | "completed" | "error";
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  workspaceUrl?: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  serverId?: number; // DB id when persisted
}

interface TaskContextValue {
  tasks: Task[];
  activeTaskId: string | null;
  activeTask: Task | null;
  createTask: (title: string, initialMessage: string) => string;
  setActiveTask: (id: string | null) => void;
  addMessage: (taskId: string, message: Omit<Message, "id" | "timestamp">) => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
}

const TaskContext = createContext<TaskContextValue | null>(null);

let nextId = 100;

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const serverSyncedRef = useRef(false);

  // tRPC mutations for server persistence
  const createTaskMutation = trpc.task.create.useMutation();
  const addMessageMutation = trpc.task.addMessage.useMutation();
  const updateStatusMutation = trpc.task.updateStatus.useMutation();

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

    const serverTasks = serverTasksQuery.data;
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
  const activeServerId = activeTask?.serverId;
  const serverMessagesQuery = trpc.task.messages.useQuery(
    { taskId: activeServerId! },
    {
      enabled: isAuthenticated && !!activeServerId && activeTask?.messages.length === 0,
      retry: false,
    }
  );

  // Merge server messages into the active task
  useEffect(() => {
    if (!activeServerId || !serverMessagesQuery.data) return;
    if (serverMessagesQuery.data.length === 0) return;

    setTasks((prev) =>
      prev.map((t) => {
        if (t.serverId !== activeServerId || t.messages.length > 0) return t;
        const msgs: Message[] = serverMessagesQuery.data.map((sm: any) => ({
          id: sm.externalId || `srv-${sm.id}`,
          role: sm.role as Message["role"],
          content: sm.content,
          timestamp: new Date(sm.createdAt),
          actions: sm.actions ? (typeof sm.actions === "string" ? JSON.parse(sm.actions) : sm.actions) : undefined,
        }));
        return { ...t, messages: msgs };
      })
    );
  }, [activeServerId, serverMessagesQuery.data]);

  const createTask = useCallback((title: string, initialMessage: string) => {
    const id = `task-${nextId++}`;
    const now = new Date();
    const newTask: Task = {
      id,
      title,
      status: "idle",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${nextId++}`,
          role: "user",
          content: initialMessage,
          timestamp: now,
        },
      ],
    };
    setTasks((prev) => [newTask, ...prev]);
    setActiveTaskId(id);

    // Persist to server if authenticated
    if (isAuthenticated) {
      createTaskMutation.mutate(
        { title },
        {
          onSuccess: (result) => {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id ? { ...t, serverId: result.id, id: result.externalId } : t
              )
            );
            // Also persist the initial message
            if (result.id) {
              addMessageMutation.mutate({
                taskId: result.id,
                role: "user",
                content: initialMessage,
              });
            }
          },
        }
      );
    }

    return id;
  }, [isAuthenticated, createTaskMutation, addMessageMutation]);

  const setActiveTask = useCallback((id: string | null) => {
    setActiveTaskId(id);
  }, []);

  const addMessage = useCallback(
    (taskId: string, message: Omit<Message, "id" | "timestamp">) => {
      setTasks((prev) => {
        const task = prev.find((t) => t.id === taskId);
        // Persist to server if task has a serverId
        if (task?.serverId && isAuthenticated) {
          addMessageMutation.mutate({
            taskId: task.serverId,
            role: message.role,
            content: message.content,
            actions: message.actions ? JSON.stringify(message.actions) : undefined,
          });
        }
        return prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updatedAt: new Date(),
                messages: [
                  ...t.messages,
                  { ...message, id: `msg-${nextId++}`, timestamp: new Date() },
                ],
              }
            : t
        );
      });
    },
    [isAuthenticated, addMessageMutation]
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
    [isAuthenticated, updateStatusMutation]
  );

  // ── Wire bridge events into task state ──
  const { onTaskEvent, status: bridgeStatus } = useBridge();

  // Helper to persist bridge-driven updates to server
  const persistBridgeStatus = useCallback(
    (taskId: string, status: Task["status"]) => {
      if (!isAuthenticated) return;
      const task = tasks.find((t) => t.id === taskId);
      if (task?.id) {
        updateStatusMutation.mutate({ externalId: task.id, status });
      }
    },
    [isAuthenticated, tasks, updateStatusMutation]
  );

  const persistBridgeMessage = useCallback(
    (taskId: string, role: "user" | "assistant" | "system", content: string, actions?: string) => {
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
    [isAuthenticated, tasks, addMessageMutation]
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
          const e = event as {
            type: "task:step";
            taskId: string;
            stepIndex: number;
            totalSteps: number;
            action: string;
            status: "active" | "done" | "error";
            content?: string;
          };
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
                  JSON.stringify([{ type: "executing", command: e.action, status: stepStatus }]));
              }
              return updated;
            })
          );
          break;
        }
        case "task:complete": {
          const e = event as {
            type: "task:complete";
            taskId: string;
            result: string;
          };
          setTasks((prev) =>
            prev.map((t) => {
              if (t.id !== e.taskId) return t;
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
  }, [bridgeStatus, onTaskEvent, persistBridgeStatus, persistBridgeMessage]);

  return (
    <TaskContext.Provider
      value={{
        tasks,
        activeTaskId,
        activeTask,
        createTask,
        setActiveTask,
        addMessage,
        updateTaskStatus,
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
