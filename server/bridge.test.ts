import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => {
  const bridgeConfigs: any[] = [];
  const tasks: any[] = [];
  const messages: any[] = [];
  let taskIdCounter = 1;

  return {
    verifyTaskOwnership: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyTaskOwnershipById: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyKnowledgeOwnership: vi.fn(async () => ({ id: 1, projectId: 1 })),
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
    getUserTasks: vi.fn(async () => tasks),
    getTaskByExternalId: vi.fn(async () => null),
    createTask: vi.fn(async (data: any) => ({
      id: taskIdCounter++,
      ...data,
      status: "idle",
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    updateTaskStatus: vi.fn(),
    addTaskMessage: vi.fn(),
    getTaskMessages: vi.fn(async () => messages),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(userId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
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

describe("bridge config lifecycle", () => {
  it("saves and retrieves a full bridge config", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    await caller.bridge.saveConfig({
      bridgeUrl: "wss://sovereign-bridge.example.com",
      apiKey: "sk-test-key-abc123",
      enabled: true,
    });

    const config = await caller.bridge.getConfig();
    expect(config).toBeDefined();
    expect(config!.bridgeUrl).toBe("wss://sovereign-bridge.example.com");
    expect(config!.apiKey).toBe("sk-test-key-abc123");
    expect(config!.enabled).toBe(1);
  });

  it("allows disabling bridge while preserving URL", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    // First set a full config
    await caller.bridge.saveConfig({
      bridgeUrl: "wss://sovereign-bridge.example.com",
      apiKey: "sk-key",
      enabled: true,
    });

    // Then disable with explicit URL preservation
    await caller.bridge.saveConfig({
      bridgeUrl: "wss://sovereign-bridge.example.com",
      enabled: false,
    });

    const config = await caller.bridge.getConfig();
    expect(config!.enabled).toBe(0);
    expect(config!.bridgeUrl).toBe("wss://sovereign-bridge.example.com");
  });

  it("allows nullable fields", async () => {
    const ctx = makeCtx(200);
    const caller = appRouter.createCaller(ctx);

    await caller.bridge.saveConfig({
      bridgeUrl: null,
      apiKey: null,
      enabled: false,
    });

    const config = await caller.bridge.getConfig();
    expect(config!.bridgeUrl).toBeNull();
    expect(config!.apiKey).toBeNull();
  });

  it("rejects empty bridge URL", async () => {
    const ctx = makeCtx(300);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bridge.saveConfig({ bridgeUrl: "" })
    ).rejects.toThrow();
  });

  it("accepts arbitrary protocol URLs like ws://", async () => {
    const ctx = makeCtx(300);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.bridge.saveConfig({ bridgeUrl: "ws://localhost:3001/bridge" });
    expect(result).toBeDefined();
  });

  it("accepts wss:// protocol URLs", async () => {
    const ctx = makeCtx(400);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bridge.saveConfig({
      bridgeUrl: "wss://bridge.sovereign.local:8080/ws",
      enabled: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts https:// protocol URLs", async () => {
    const ctx = makeCtx(500);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bridge.saveConfig({
      bridgeUrl: "https://bridge.sovereign.local/api",
      enabled: true,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("task creation and message persistence", () => {
  it("creates a task and adds a message", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Bridge integration test" });
    expect(task.title).toBe("Bridge integration test");
    expect(task.id).toBeDefined();

    const msgResult = await caller.task.addMessage({
      taskId: task.id,
      role: "user",
      content: "Hello from bridge test",
    });
    expect(msgResult.success).toBe(true);
    expect(msgResult.externalId).toHaveLength(12);
  });

  it("rejects task title longer than 500 chars", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.task.create({ title: "x".repeat(501) })
    ).rejects.toThrow();
  });

  it("validates task status enum", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Status enum test" });

    // Valid statuses
    for (const status of ["idle", "running", "completed", "error"] as const) {
      const result = await caller.task.updateStatus({
        externalId: task.externalId,
        status,
      });
      expect(result.success).toBe(true);
    }

    // Invalid status
    await expect(
      caller.task.updateStatus({
        externalId: task.externalId,
        status: "invalid" as any,
      })
    ).rejects.toThrow();
  });

  it("validates message role enum", async () => {
    const ctx = makeCtx(100);
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Role enum test" });

    // Valid roles
    for (const role of ["user", "assistant", "system"] as const) {
      const result = await caller.task.addMessage({
        taskId: task.id,
        role,
        content: `Message with role ${role}`,
      });
      expect(result.success).toBe(true);
    }

    // Invalid role
    await expect(
      caller.task.addMessage({
        taskId: task.id,
        role: "invalid" as any,
        content: "Should fail",
      })
    ).rejects.toThrow();
  });
});
