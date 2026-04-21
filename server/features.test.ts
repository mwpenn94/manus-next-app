import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", () => {
  const tasks: any[] = [];
  const messages: any[] = [];
  const bridgeConfigs: any[] = [];
  const taskFiles: any[] = [];
  let taskIdCounter = 100;

  return {
    verifyTaskOwnership: vi.fn(async () => ({ id: 1, userId: 50, externalId: "test" })),
    verifyTaskOwnershipById: vi.fn(async () => ({ id: 1, userId: 50, externalId: "test" })),
    verifyKnowledgeOwnership: vi.fn(async () => ({ id: 1, projectId: 1 })),
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
    createTaskFile: vi.fn(async (data: any) => {
      taskFiles.push({ id: taskFiles.length + 1, ...data, createdAt: new Date() });
    }),
    getTaskFiles: vi.fn(async (taskExternalId: string) => {
      return taskFiles.filter((f) => f.taskExternalId === taskExternalId);
    }),
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "Bridge-wired LLM response." } }],
  })),
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 50,
    openId: "feature-test-user",
    email: "features@example.com",
    name: "Feature Test User",
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

describe("bridge event wiring — task lifecycle", () => {
  it("creates a task and transitions through running → completed statuses", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task (simulates what TaskContext does)
    const task = await caller.task.create({ title: "Bridge event test" });
    expect(task.status).toBe("idle");

    // Simulate task:start — update status to running
    await caller.task.updateStatus({
      externalId: task.externalId,
      status: "running",
    });

    // Simulate task:step — add a step message
    await caller.task.addMessage({
      taskId: task.id,
      role: "assistant",
      content: "Browsing https://example.com",
      actions: JSON.stringify([{ type: "browsing", url: "https://example.com", status: "done" }]),
    });

    // Verify messages were added
    const messages = await caller.task.messages({ taskId: task.id });
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect(messages[0].content).toBe("Browsing https://example.com");

    // Simulate task:complete — update status to completed
    await caller.task.updateStatus({
      externalId: task.externalId,
      status: "completed",
    });
  });

  it("handles task:error by updating status to error", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Error test" });

    // Simulate task:error
    await caller.task.updateStatus({
      externalId: task.externalId,
      status: "error",
    });

    await caller.task.addMessage({
      taskId: task.id,
      role: "system",
      content: "Error: Connection timeout",
    });

    const messages = await caller.task.messages({ taskId: task.id });
    const errorMsg = messages.find((m: any) => m.content.includes("Error:"));
    expect(errorMsg).toBeDefined();
    expect(errorMsg!.role).toBe("system");
  });
});

describe("bridge config — protocol validation", () => {
  it("accepts ws:// protocol for bridge URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bridge.saveConfig({
      bridgeUrl: "ws://localhost:8080",
      enabled: true,
    });

    expect(result).toEqual({ success: true });
  });

  it("accepts wss:// protocol for bridge URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bridge.saveConfig({
      bridgeUrl: "wss://bridge.manus-next.app/ws",
      apiKey: "secure-key",
      enabled: true,
    });

    expect(result).toEqual({ success: true });
  });
});

describe("file upload — multiple files and metadata", () => {
  it("records multiple files for the same task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.file.record({
      taskExternalId: "multi-file-task",
      fileName: "screenshot.png",
      fileKey: "50-files/screenshot-001.png",
      url: "https://cdn.example.com/50-files/screenshot-001.png",
      mimeType: "image/png",
      size: 512000,
    });

    await caller.file.record({
      taskExternalId: "multi-file-task",
      fileName: "data.csv",
      fileKey: "50-files/data-002.csv",
      url: "https://cdn.example.com/50-files/data-002.csv",
      mimeType: "text/csv",
      size: 2048,
    });

    const files = await caller.file.list({ taskExternalId: "multi-file-task" });
    expect(files.length).toBe(2);
    expect(files.map((f: any) => f.fileName).sort()).toEqual(["data.csv", "screenshot.png"]);
  });

  it("records file with all metadata fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.file.record({
      taskExternalId: "metadata-task",
      fileName: "document.pdf",
      fileKey: "50-files/document-003.pdf",
      url: "https://cdn.example.com/50-files/document-003.pdf",
      mimeType: "application/pdf",
      size: 5242880,
    });

    const files = await caller.file.list({ taskExternalId: "metadata-task" });
    expect(files.length).toBe(1);
    expect(files[0].mimeType).toBe("application/pdf");
    expect(files[0].size).toBe(5242880);
  });
});

describe("LLM chat — streaming support", () => {
  it("returns content from LLM for bridge-wired context", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.llm.chat({
      messages: [
        { role: "system", content: "You are Manus Next, an AI assistant." },
        { role: "user", content: "Summarize the bridge architecture." },
      ],
    });

    expect(result.content).toBe("Bridge-wired LLM response.");
  });

  it("handles conversation with bridge step context", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.llm.chat({
      messages: [
        { role: "system", content: "You are Manus Next." },
        { role: "user", content: "Start a research task" },
        { role: "assistant", content: "I'll begin researching..." },
        { role: "user", content: "What did you find?" },
      ],
    });

    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
  });
});

describe("task status transitions", () => {
  it("supports full lifecycle: idle → running → completed", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Lifecycle test" });
    expect(task.status).toBe("idle");

    await caller.task.updateStatus({ externalId: task.externalId, status: "running" });
    await caller.task.updateStatus({ externalId: task.externalId, status: "completed" });
    // No throw means transitions are valid
  });

  it("supports error status from any state", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Error lifecycle" });
    await caller.task.updateStatus({ externalId: task.externalId, status: "running" });
    await caller.task.updateStatus({ externalId: task.externalId, status: "error" });
    // No throw means transitions are valid
  });

  it("rejects invalid status values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const task = await caller.task.create({ title: "Invalid status" });

    await expect(
      caller.task.updateStatus({
        externalId: task.externalId,
        status: "invalid_status" as any,
      })
    ).rejects.toThrow();
  });
});
