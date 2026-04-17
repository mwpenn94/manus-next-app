/**
 * TaskContext — Hybrid Persistence
 *
 * When unauthenticated: demo tasks with simulated agent sequences (local state).
 * When authenticated: creates tasks via tRPC, persists to database, and
 * merges server-side tasks with local state for seamless UX.
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

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

// ── Demo data (shown when not authenticated) ──
const DEMO_ACTIONS_1: AgentAction[] = [
  { type: "searching", query: "autonomous AI systems research 2025", status: "done" },
  { type: "browsing", url: "https://arxiv.org/abs/2401.13138", status: "done" },
  { type: "scrolling", status: "done" },
  { type: "clicking", element: "Related Articles section", status: "done" },
];

const DEMO_ACTIONS_2: AgentAction[] = [
  { type: "browsing", url: "https://research.google/pubs/multi-agent-systems/", status: "done" },
  { type: "executing", command: "wget -O paper.pdf https://arxiv.org/pdf/2401.xxxxx", status: "done" },
  { type: "creating", file: "research_summary.md", status: "done" },
];

const DEMO_ACTIONS_3: AgentAction[] = [
  { type: "generating", description: "Comparative analysis chart", status: "done" },
  { type: "thinking", status: "active" },
];

const DEMO_TASKS: Task[] = [
  {
    id: "demo-1",
    title: "Research Autonomous AI Systems",
    status: "running",
    createdAt: new Date(Date.now() - 3600000),
    updatedAt: new Date(),
    workspaceUrl: "https://arxiv.org/abs/2401.13138",
    currentStep: "Analyzing research papers",
    totalSteps: 8,
    completedSteps: 7,
    messages: [
      { id: "m1", role: "user", content: "Research the latest advances in autonomous AI systems and create a comprehensive summary with comparisons.", timestamp: new Date(Date.now() - 3600000) },
      { id: "m2", role: "assistant", content: "I'll research the latest advances in autonomous AI systems. Let me start by searching for recent publications and industry reports.", timestamp: new Date(Date.now() - 3500000), actions: DEMO_ACTIONS_1 },
      { id: "m3", role: "assistant", content: "I've found several key papers and reports. The research covers breakthroughs in **reinforcement learning**, **multi-agent coordination**, and **real-world deployment challenges**. Let me compile the findings into a structured summary.", timestamp: new Date(Date.now() - 2400000), actions: DEMO_ACTIONS_2 },
      { id: "m4", role: "assistant", content: "I'm now generating a comparative analysis chart and finalizing the research summary document. The key findings so far:\n\n1. **CrewAI** and **AutoGen** lead in multi-agent orchestration\n2. **Playwright + CDP** hybrid approach dominates browser automation\n3. **Vision models** have significantly improved computer use accuracy\n4. **CRDT-based sync** enables reliable cross-device state management", timestamp: new Date(Date.now() - 1200000), actions: DEMO_ACTIONS_3 },
    ],
  },
  {
    id: "demo-2",
    title: "Build Landing Page for Product Launch",
    status: "completed",
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 82800000),
    workspaceUrl: "https://localhost:5173",
    totalSteps: 12,
    completedSteps: 12,
    messages: [
      { id: "m5", role: "user", content: "Create a modern landing page for our new AI product launch.", timestamp: new Date(Date.now() - 86400000) },
      { id: "m6", role: "assistant", content: "I've created a modern, responsive landing page with:\n\n- **Hero section** with animated gradient background\n- **Features grid** showcasing 6 key capabilities\n- **Pricing table** with 3 tiers\n- **Contact form** with validation\n\nThe design uses a dark theme with accent colors matching your brand. You can preview it in the workspace panel.", timestamp: new Date(Date.now() - 82800000), actions: [
        { type: "searching", query: "modern landing page design trends 2026", status: "done" },
        { type: "creating", file: "index.html", status: "done" },
        { type: "creating", file: "styles.css", status: "done" },
        { type: "creating", file: "app.js", status: "done" },
        { type: "generating", description: "Hero background image", status: "done" },
        { type: "executing", command: "npm run build", status: "done" },
      ] },
    ],
  },
  {
    id: "demo-3",
    title: "Analyze Q4 Sales Data",
    status: "completed",
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 169200000),
    totalSteps: 6,
    completedSteps: 6,
    messages: [
      { id: "m7", role: "user", content: "Analyze the Q4 sales data and create visualizations.", timestamp: new Date(Date.now() - 172800000) },
      { id: "m8", role: "assistant", content: "Analysis complete. Key findings:\n\n- **Revenue** increased 23% QoQ to $4.2M\n- **Top segment**: Enterprise (58% of revenue)\n- **Growth driver**: Self-serve signups up 41%\n\nI've created an interactive dashboard with charts for revenue trends, segment breakdown, and cohort analysis.", timestamp: new Date(Date.now() - 169200000), actions: [
        { type: "executing", command: "python3 analyze.py --input q4_sales.csv", status: "done" },
        { type: "creating", file: "dashboard.html", status: "done" },
        { type: "generating", description: "Revenue trend chart", status: "done" },
      ] },
    ],
  },
];

let nextId = 100;

// Simulated agent response sequences for new tasks
const AGENT_SEQUENCES = [
  {
    delay: 1500,
    content: "I'll work on this for you. Let me start by analyzing the requirements and planning my approach.",
    actions: [{ type: "thinking" as const, status: "active" as const }],
  },
  {
    delay: 4000,
    content: "I've outlined the approach. Now searching for relevant information and resources to get started.",
    actions: [
      { type: "thinking" as const, status: "done" as const },
      { type: "searching" as const, query: "relevant resources", status: "active" as const },
    ],
  },
  {
    delay: 7000,
    content: "Found several useful resources. I'm now browsing through them to extract the key information needed for your task.",
    actions: [
      { type: "searching" as const, query: "relevant resources", status: "done" as const },
      { type: "browsing" as const, url: "https://example.com/resource", status: "active" as const },
    ],
  },
];

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
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

  // Merge server tasks into local state on first load
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
      // Prepend server tasks, keep demo tasks for reference
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
      status: "running",
      createdAt: now,
      updatedAt: now,
      totalSteps: 8,
      completedSteps: 0,
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
            // Update the local task with server ID for future message persistence
            setTasks((prev) =>
              prev.map((t) =>
                t.id === id ? { ...t, serverId: result.id } : t
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

    // Simulate agent response sequence
    AGENT_SEQUENCES.forEach((seq, i) => {
      setTimeout(() => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  updatedAt: new Date(),
                  completedSteps: (i + 1) * 2,
                  messages: [
                    ...t.messages,
                    {
                      id: `msg-${nextId++}`,
                      role: "assistant" as const,
                      content: seq.content,
                      timestamp: new Date(),
                      actions: seq.actions,
                    },
                  ],
                }
              : t
          )
        );
      }, seq.delay);
    });

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
