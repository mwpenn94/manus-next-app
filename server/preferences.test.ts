import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

// Mock database layer
vi.mock("./db", () => {
  const store: Record<string, any> = {};
  const tasks: any[] = [];
  return {
    getUserPreferences: vi.fn(async (userId: number) => store[`prefs-${userId}`]),
    upsertUserPreferences: vi.fn(async (prefs: any) => {
      store[`prefs-${prefs.userId}`] = {
        id: 1,
        userId: prefs.userId,
        generalSettings: prefs.generalSettings,
        capabilities: prefs.capabilities,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return store[`prefs-${prefs.userId}`];
    }),
    getUserTaskStats: vi.fn(async (userId: number) => {
      const userTasks = tasks.filter((t) => t.userId === userId);
      return {
        totalTasks: userTasks.length,
        completedTasks: userTasks.filter((t: any) => t.status === "completed").length,
        runningTasks: userTasks.filter((t: any) => t.status === "running").length,
        errorTasks: userTasks.filter((t: any) => t.status === "error").length,
      };
    }),
    // Stubs for other db functions used by the router
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    createTask: vi.fn(),
    getUserTasks: vi.fn(async () => []),
    getTaskByExternalId: vi.fn(),
    updateTaskStatus: vi.fn(),
    addTaskMessage: vi.fn(),
    getTaskMessages: vi.fn(async () => []),
    getBridgeConfig: vi.fn(),
    upsertBridgeConfig: vi.fn(),
    createTaskFile: vi.fn(),
    getTaskFiles: vi.fn(async () => []),
  };
});

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "test response" } }],
  })),
}));

function makeAuthCtx(userId = 1) {
  return {
    user: { id: userId, openId: "test-open-id", name: "Test User", role: "user" as const },
  };
}

function makeUnauthCtx() {
  return { user: null };
}

describe("preferences router", () => {
  it("returns defaults when no preferences exist", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(999));
    const result = await caller.preferences.get();
    // getUserPreferences returns undefined for unknown user, ?? provides defaults
    expect(result).toEqual({
      generalSettings: { notifications: true, soundEffects: false, autoExpandActions: true, compactMode: false },
      capabilities: {},
    });
  });

  it("saves and retrieves general settings", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(10));
    const settings = {
      notifications: false,
      soundEffects: true,
      autoExpandActions: false,
      compactMode: true,
    };
    const saved = await caller.preferences.save({ generalSettings: settings });
    expect(saved).toBeDefined();
    expect(saved?.generalSettings).toEqual(settings);
  });

  it("saves and retrieves capability toggles", async () => {
    const caller = appRouter.createCaller(makeAuthCtx(20));
    const capabilities = {
      "@manus-next/browser": true,
      "@manus-next/replay": false,
      "@manus-next/desktop": true,
    };
    const saved = await caller.preferences.save({ capabilities });
    expect(saved).toBeDefined();
    expect(saved?.capabilities).toEqual(capabilities);
  });

  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.preferences.get()).rejects.toThrow();
  });
});

describe("usage router", () => {
  it("returns task stats for authenticated user", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const stats = await caller.usage.stats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalTasks).toBe("number");
    expect(typeof stats.completedTasks).toBe("number");
    expect(typeof stats.runningTasks).toBe("number");
    expect(typeof stats.errorTasks).toBe("number");
  });

  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makeUnauthCtx());
    await expect(caller.usage.stats()).rejects.toThrow();
  });
});
