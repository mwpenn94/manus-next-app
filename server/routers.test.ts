import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => {
  const tasks: any[] = [];
  const messages: any[] = [];
  const bridgeConfigs: any[] = [];
  let taskIdCounter = 1;

  return {
    getUserTasks: vi.fn(async (userId: number) => {
      return tasks.filter((t) => t.userId === userId);
    }),
    getTaskByExternalId: vi.fn(async (externalId: string) => {
      return tasks.find((t) => t.externalId === externalId) ?? null;
    }),
    createTask: vi.fn(async (data: any) => {
      const task = {
        id: taskIdCounter++,
        ...data,
        status: "idle",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tasks.push(task);
      return task;
    }),
    updateTaskStatus: vi.fn(async (externalId: string, status: string) => {
      const task = tasks.find((t) => t.externalId === externalId);
      if (task) task.status = status;
    }),
    addTaskMessage: vi.fn(async (data: any) => {
      messages.push({ id: messages.length + 1, ...data, createdAt: new Date() });
    }),
    getTaskMessages: vi.fn(async (taskId: number) => {
      return messages.filter((m) => m.taskId === taskId);
    }),
    getBridgeConfig: vi.fn(async (userId: number) => {
      return bridgeConfigs.find((c) => c.userId === userId) ?? null;
    }),
    upsertBridgeConfig: vi.fn(async (data: any) => {
      const existing = bridgeConfigs.findIndex((c) => c.userId === data.userId);
      if (existing >= 0) {
        bridgeConfigs[existing] = { ...bridgeConfigs[existing], ...data };
      } else {
        bridgeConfigs.push(data);
      }
      return { success: true };
    }),
    // Keep the original user functions
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "test-user-42",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("task router", () => {
  it("creates a task with title and returns it", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.task.create({ title: "Research AI Agents" });

    expect(result).toBeDefined();
    expect(result.title).toBe("Research AI Agents");
    expect(result.externalId).toBeDefined();
    expect(result.externalId.length).toBe(12);
    expect(result.userId).toBe(42);
    expect(result.status).toBe("idle");
  });

  it("lists tasks for the authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tasks = await caller.task.list();

    expect(Array.isArray(tasks)).toBe(true);
    // Should contain the task created in the previous test
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(tasks.every((t: any) => t.userId === 42)).toBe(true);
  });

  it("gets a task by externalId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.task.create({ title: "Get by ID test" });
    const fetched = await caller.task.get({ externalId: created.externalId });

    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("Get by ID test");
  });

  it("updates task status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.task.create({ title: "Status update test" });
    const result = await caller.task.updateStatus({
      externalId: created.externalId,
      status: "running",
    });

    expect(result).toEqual({ success: true });
  });

  it("adds a message to a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.task.addMessage({
      taskId: 1,
      role: "user",
      content: "Hello, agent!",
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBeDefined();
    expect(result.externalId.length).toBe(12);
  });

  it("retrieves messages for a task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const messages = await caller.task.messages({ taskId: 1 });

    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].content).toBe("Hello, agent!");
  });

  it("rejects task creation with empty title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.task.create({ title: "" })).rejects.toThrow();
  });

  it("rejects unauthenticated task creation", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.task.create({ title: "Should fail" })).rejects.toThrow();
  });
});

describe("bridge router", () => {
  it("returns null when no bridge config exists", async () => {
    const ctx = createAuthContext();
    // Use a different user ID to ensure clean state
    ctx.user = { ...ctx.user!, id: 999 };
    const caller = appRouter.createCaller(ctx);

    const config = await caller.bridge.getConfig();

    expect(config).toBeNull();
  });

  it("saves bridge config", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bridge.saveConfig({
      bridgeUrl: "wss://bridge.sovereign.local",
      apiKey: "test-key-123",
      enabled: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("retrieves saved bridge config", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const config = await caller.bridge.getConfig();

    expect(config).toBeDefined();
    expect(config!.bridgeUrl).toBe("wss://bridge.sovereign.local");
    expect(config!.apiKey).toBe("test-key-123");
    expect(config!.enabled).toBe(1);
  });

  it("updates existing bridge config", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.bridge.saveConfig({
      bridgeUrl: "wss://bridge2.sovereign.local",
      enabled: false,
    });

    const config = await caller.bridge.getConfig();
    expect(config!.bridgeUrl).toBe("wss://bridge2.sovereign.local");
    expect(config!.enabled).toBe(0);
  });

  it("rejects invalid bridge URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bridge.saveConfig({
        bridgeUrl: "not-a-valid-url",
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated bridge config access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.bridge.getConfig()).rejects.toThrow();
  });
});

describe("auth router", () => {
  it("returns user info for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user!.name).toBe("Test User");
    expect(user!.email).toBe("test@example.com");
    expect(user!.openId).toBe("test-user-42");
  });

  it("returns null for unauthenticated user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeNull();
  });
});
