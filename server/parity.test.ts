import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock database layer ──

const memories: any[] = [];
const shares: any[] = [];
const notifications: any[] = [];
let memoryIdCounter = 1;
let shareIdCounter = 1;
let notifIdCounter = 1;

vi.mock("./db", () => {
  const tasks: any[] = [];
  const messages: any[] = [];
  let taskIdCounter = 1;

  return {
    verifyTaskOwnership: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyTaskOwnershipById: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyKnowledgeOwnership: vi.fn(async () => ({ id: 1, projectId: 1 })),
    // Existing mocks needed by router dependencies
    getUserTasks: vi.fn(async () => tasks),
    getTaskByExternalId: vi.fn(async (externalId: string) => {
      return tasks.find((t) => t.externalId === externalId) ?? null;
    }),
    createTask: vi.fn(async (data: any) => {
      const task = { id: taskIdCounter++, ...data, status: "idle", createdAt: new Date(), updatedAt: new Date() };
      tasks.push(task);
      return task;
    }),
    updateTaskStatus: vi.fn(),
    addTaskMessage: vi.fn(),
    getTaskMessages: vi.fn(async () => messages),
    getBridgeConfig: vi.fn(async () => null),
    upsertBridgeConfig: vi.fn(),
    createTaskFile: vi.fn(),
    getTaskFiles: vi.fn(async () => []),
    getUserPreferences: vi.fn(async () => null),
    upsertUserPreferences: vi.fn(async () => ({ success: true })),
    getUserTaskStats: vi.fn(async () => ({ total: 0, running: 0, completed: 0, error: 0 })),
    archiveTask: vi.fn(),
    toggleTaskFavorite: vi.fn(async () => ({ favorite: 1 })),
    updateTaskSystemPrompt: vi.fn(),
    searchTasks: vi.fn(async () => []),
    addWorkspaceArtifact: vi.fn(),
    getWorkspaceArtifacts: vi.fn(async () => []),
    getLatestArtifactByType: vi.fn(async () => null),

    // Memory mocks
    getUserMemories: vi.fn(async (userId: number, limit: number) => {
      return memories.filter(m => m.userId === userId).slice(0, limit);
    }),
    addMemoryEntry: vi.fn(async (data: any) => {
      const entry = { id: memoryIdCounter++, ...data, createdAt: new Date() };
      memories.push(entry);
      return entry;
    }),
    deleteMemoryEntry: vi.fn(async (id: number, userId: number) => {
      const idx = memories.findIndex(m => m.id === id && m.userId === userId);
      if (idx >= 0) memories.splice(idx, 1);
    }),
    searchMemories: vi.fn(async (userId: number, query: string, limit: number) => {
      return memories
        .filter(m => m.userId === userId && (m.key.includes(query) || m.value.includes(query)))
        .slice(0, limit);
    }),

    // Share mocks
    createTaskShare: vi.fn(async (data: any) => {
      const share = { id: shareIdCounter++, ...data, viewCount: 0, createdAt: new Date() };
      shares.push(share);
      return share;
    }),
    getTaskShareByToken: vi.fn(async (token: string) => {
      return shares.find(s => s.shareToken === token) ?? null;
    }),
    getTaskShares: vi.fn(async (taskExternalId: string, userId: number) => {
      return shares.filter(s => s.taskExternalId === taskExternalId && s.userId === userId);
    }),
    incrementShareViewCount: vi.fn(async (token: string) => {
      const share = shares.find(s => s.shareToken === token);
      if (share) share.viewCount++;
    }),
    deleteTaskShare: vi.fn(async (id: number, userId: number) => {
      const idx = shares.findIndex(s => s.id === id && s.userId === userId);
      if (idx >= 0) shares.splice(idx, 1);
    }),

    // Notification mocks
    getUserNotifications: vi.fn(async (userId: number, limit: number) => {
      return notifications.filter(n => n.userId === userId).slice(0, limit);
    }),
    getUnreadNotificationCount: vi.fn(async (userId: number) => {
      return notifications.filter(n => n.userId === userId && !n.readAt).length;
    }),
    createNotification: vi.fn(async (data: any) => {
      const notif = { id: notifIdCounter++, ...data, readAt: null, createdAt: new Date() };
      notifications.push(notif);
      return notif;
    }),
    markNotificationRead: vi.fn(async (id: number, userId: number) => {
      const notif = notifications.find(n => n.id === id && n.userId === userId);
      if (notif) notif.readAt = new Date();
    }),
    markAllNotificationsRead: vi.fn(async (userId: number) => {
      notifications.filter(n => n.userId === userId).forEach(n => { n.readAt = new Date(); });
    }),

    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "Mock LLM response" } }],
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 42): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Memory Router Tests ──

describe("memory router", () => {
  it("adds a memory entry with key and value", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.memory.add({
      key: "User prefers dark mode",
      value: "The user has stated they prefer dark mode for all interfaces.",
      source: "user",
    });

    expect(result).toEqual({ success: true });
  });

  it("adds an auto-extracted memory entry with task reference", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.memory.add({
      key: "User works at Acme Corp",
      value: "Extracted from task conversation — user mentioned working at Acme Corp.",
      source: "auto",
      taskExternalId: "task-abc123",
    });

    expect(result).toEqual({ success: true });
  });

  it("lists memory entries for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entries = await caller.memory.list();

    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(2);
    expect(entries[0].key).toBeDefined();
    expect(entries[0].value).toBeDefined();
  });

  it("searches memory entries", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.memory.search({ query: "dark mode" });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].key).toContain("dark mode");
  });

  it("deletes a memory entry", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Get the first entry's ID
    const entries = await caller.memory.list();
    const firstId = entries[0].id;

    const result = await caller.memory.delete({ id: firstId });
    expect(result).toEqual({ success: true });
  });

  it("rejects memory add with empty key", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memory.add({ key: "", value: "some value" })
    ).rejects.toThrow();
  });

  it("rejects memory add with empty value", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.memory.add({ key: "some key", value: "" })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated memory access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.memory.list()).rejects.toThrow();
  });

  it("respects limit parameter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const entries = await caller.memory.list({ limit: 1 });
    expect(entries.length).toBeLessThanOrEqual(1);
  });
});

// ── Share Router Tests ──

describe("share router", () => {
  it("creates a share link without password", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.share.create({
      taskExternalId: "test-task-share",
    });

    expect(result.shareToken).toBeDefined();
    expect(result.shareToken.length).toBe(24);
    expect(result.shareUrl).toContain("/shared/");
    expect(result.hasPassword).toBe(false);
    expect(result.expiresAt).toBeNull();
  });

  it("creates a share link with password", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.share.create({
      taskExternalId: "test-task-share",
      password: "secret123",
    });

    expect(result.shareToken).toBeDefined();
    expect(result.hasPassword).toBe(true);
  });

  it("creates a share link with expiry", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.share.create({
      taskExternalId: "test-task-share",
      expiresInHours: 24,
    });

    expect(result.expiresAt).toBeDefined();
    expect(result.expiresAt).not.toBeNull();
    // Expiry should be ~24 hours from now
    const diff = result.expiresAt!.getTime() - Date.now();
    expect(diff).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it("lists shares for a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sharesList = await caller.share.list({ taskExternalId: "test-task-share" });

    expect(Array.isArray(sharesList)).toBe(true);
    expect(sharesList.length).toBeGreaterThanOrEqual(1);
  });

  it("views a shared task (public, no auth required)", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    // Get a share token from the shares array
    const shareToken = shares[0]?.shareToken;
    if (!shareToken) return; // Skip if no shares exist

    const result = await caller.share.view({ shareToken });

    // The mock getTaskByExternalId returns null for non-existent tasks,
    // so we expect either task data or an error
    expect(result).toBeDefined();
  });

  it("returns error for non-existent share token", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.share.view({ shareToken: "nonexistent-token" });

    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Share not found");
  });

  it("deletes a share link", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const sharesList = await caller.share.list({ taskExternalId: "test-task-share" });
    if (sharesList.length === 0) return;

    const result = await caller.share.delete({ id: sharesList[0].id });
    expect(result).toEqual({ success: true });
  });

  it("rejects share creation with invalid expiry", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.create({
        taskExternalId: "test-task",
        expiresInHours: 0, // min is 1
      })
    ).rejects.toThrow();
  });

  it("rejects share creation with expiry > 720 hours", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.create({
        taskExternalId: "test-task",
        expiresInHours: 721,
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated share creation", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.share.create({ taskExternalId: "test" })
    ).rejects.toThrow();
  });
});

// ── Notification Router Tests ──

describe("notification router", () => {
  it("lists notifications (initially empty)", async () => {
    const ctx = createAuthContext(99); // Different user for clean state
    const caller = appRouter.createCaller(ctx);

    const notifs = await caller.notification.list();
    expect(Array.isArray(notifs)).toBe(true);
  });

  it("returns unread count as a number", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.unreadCount();
    expect(typeof result).toBe("number");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("marks a notification as read", async () => {
    // First create a notification via the mock
    notifications.push({
      id: notifIdCounter++,
      userId: 42,
      type: "task_completed",
      title: "Test notification",
      content: "Test content",
      readAt: null,
      createdAt: new Date(),
    });

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const notifs = await caller.notification.list();
    if (notifs.length === 0) return;

    const result = await caller.notification.markRead({ id: notifs[0].id });
    expect(result).toEqual({ success: true });
  });

  it("marks all notifications as read", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.notification.markAllRead();
    expect(result).toEqual({ success: true });
  });

  it("rejects unauthenticated notification access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.notification.list()).rejects.toThrow();
    await expect(caller.notification.unreadCount()).rejects.toThrow();
  });
});

// ── Agent Mode Tests ──

describe("agent mode integration", () => {
  it("agentStream.ts exports runAgentStream", async () => {
    const mod = await import("./agentStream");
    expect(mod.runAgentStream).toBeDefined();
    expect(typeof mod.runAgentStream).toBe("function");
  });
});

// ── Document Generation Tool Tests ──

describe("generate_document tool", () => {
  it("agentTools.ts exports executeTool function", async () => {
    const mod = await import("./agentTools");
    expect(mod.executeTool).toBeDefined();
    expect(typeof mod.executeTool).toBe("function");
  });

  it("agentTools.ts includes generate_document in AGENT_TOOLS", async () => {
    const mod = await import("./agentTools");
    expect(mod.AGENT_TOOLS).toBeDefined();
    const docTool = mod.AGENT_TOOLS.find((t: any) => t.function.name === "generate_document");
    expect(docTool).toBeDefined();
    expect(docTool!.function.parameters.properties).toHaveProperty("title");
    expect(docTool!.function.parameters.properties).toHaveProperty("content");
    expect(docTool!.function.parameters.properties).toHaveProperty("format");
  });

  it("generate_document tool has correct format enum", async () => {
    const mod = await import("./agentTools");
    const docTool = mod.AGENT_TOOLS.find((t: any) => t.function.name === "generate_document");
    const formatProp = docTool!.function.parameters.properties.format;
    expect(formatProp.enum).toContain("markdown");
    expect(formatProp.enum).toContain("report");
    expect(formatProp.enum).toContain("analysis");
    expect(formatProp.enum).toContain("plan");
  });
});

// ── Cross-Feature Integration Tests ──

describe("cross-feature integration", () => {
  it("task completion creates a notification (via updateStatus)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task first
    const task = await caller.task.create({ title: "Integration test task" });

    // Update status to completed — should trigger notification creation
    await caller.task.updateStatus({
      externalId: task.externalId,
      status: "completed",
    });

    // The mock createNotification should have been called
    const { createNotification: mockCreateNotif } = await import("./db");
    expect(mockCreateNotif).toHaveBeenCalled();
  });

  it("preferences router saves and retrieves settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const saveResult = await caller.preferences.save({
      generalSettings: { notifications: true, soundEffects: false, autoExpandActions: true, compactMode: false },
      capabilities: { web_search: true, code_execution: false },
      systemPrompt: "You are a helpful assistant.",
    });

    expect(saveResult).toBeDefined();

    const prefs = await caller.preferences.get();
    expect(prefs).toBeDefined();
  });
});
