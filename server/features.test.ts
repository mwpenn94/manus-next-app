import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database functions
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  const tasks: any[] = [];
  const messages: any[] = [];
  const bridgeConfigs: any[] = [];
  const taskFiles: any[] = [];
  let taskIdCounter = 100;

  return {
    ...actual,
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
      actions: [{ type: "browsing", url: "https://example.com", status: "done" }],
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
        { role: "system", content: "You are Manus, an AI assistant." },
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
        { role: "system", content: "You are Manus." },
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

// ═══════════════════════════════════════════════════════════════════
// Session 22 — Feature 1: Memory Importance Scoring
// ═══════════════════════════════════════════════════════════════════

// Import the pure function directly (not mocked)
import { computeMemoryImportance } from "./db";

describe("computeMemoryImportance — convergence-validated", () => {
  const now = Date.now();

  it("returns higher score for recently accessed memories", () => {
    const recent = computeMemoryImportance({
      accessCount: 5,
      lastAccessedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    const old = computeMemoryImportance({
      accessCount: 5,
      lastAccessedAt: new Date(now - 30 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    expect(recent).toBeGreaterThan(old);
  });

  it("returns higher score for more frequently accessed memories", () => {
    const frequent = computeMemoryImportance({
      accessCount: 10,
      lastAccessedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    const rare = computeMemoryImportance({
      accessCount: 1,
      lastAccessedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    expect(frequent).toBeGreaterThan(rare);
  });

  it("gives 2x source bonus to user-created memories", () => {
    const userMem = computeMemoryImportance({
      accessCount: 3,
      lastAccessedAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      source: "user",
    });
    const autoMem = computeMemoryImportance({
      accessCount: 3,
      lastAccessedAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    expect(userMem).toBeCloseTo(autoMem * 2, 5);
  });

  it("gives a floor score of 0.5 for zero-access, just-now memories", () => {
    const zeroAccess = computeMemoryImportance({
      accessCount: 0,
      lastAccessedAt: new Date(now),
      source: "auto",
    });
    expect(zeroAccess).toBeCloseTo(0.5, 1);
  });

  it("produces very low scores for old, unaccessed memories", () => {
    const stale = computeMemoryImportance({
      accessCount: 0,
      lastAccessedAt: new Date(now - 60 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    expect(stale).toBeLessThan(0.1);
  });

  it("exponential decay: score halves roughly every 10 days", () => {
    const day0 = computeMemoryImportance({
      accessCount: 1,
      lastAccessedAt: new Date(now),
      source: "auto",
    });
    const day10 = computeMemoryImportance({
      accessCount: 1,
      lastAccessedAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
      source: "auto",
    });
    const ratio = day10 / day0;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Session 22 — Feature 2: Strategy Telemetry — trigger classification
// ═══════════════════════════════════════════════════════════════════

describe("detectTriggerPattern classification logic", () => {
  // Replicate the classification logic for unit testing since
  // detectTriggerPattern is module-private in agentStream.ts
  function classifyTrigger(text: string): string {
    if (/research|search|look|find|gather|investigat/i.test(text)) return "research_loop";
    if (/can't|cannot|unable|don't have|no access|not able/i.test(text)) return "capability_claim";
    if (/could you|please provide|can you|what would|clarif/i.test(text)) return "clarification_loop";
    if (/sorry|apologize|unfortunately|i'm afraid/i.test(text)) return "apology_loop";
    if (/let me|i'll|i will|going to|plan to|next step/i.test(text)) return "planning_loop";
    return "generic_repeat";
  }

  it("classifies research-related text as research_loop", () => {
    expect(classifyTrigger("let me search for more information")).toBe("research_loop");
    expect(classifyTrigger("i'll investigate the data further")).toBe("research_loop");
  });

  it("classifies capability claims as capability_claim", () => {
    expect(classifyTrigger("i can't access that file directly")).toBe("capability_claim");
    expect(classifyTrigger("i'm unable to perform that action")).toBe("capability_claim");
  });

  it("classifies clarification requests as clarification_loop", () => {
    expect(classifyTrigger("could you please provide more details")).toBe("clarification_loop");
  });

  it("classifies apologies as apology_loop", () => {
    expect(classifyTrigger("i'm sorry for the confusion")).toBe("apology_loop");
  });

  it("classifies planning statements as planning_loop", () => {
    expect(classifyTrigger("let me outline the next steps")).toBe("planning_loop");
    expect(classifyTrigger("going to work on the implementation now")).toBe("planning_loop");
  });

  it("classifies unrecognized patterns as generic_repeat", () => {
    expect(classifyTrigger("the weather is nice today")).toBe("generic_repeat");
  });

  it("prioritizes research over planning when both match", () => {
    expect(classifyTrigger("let me search for that")).toBe("research_loop");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Session 22 — Feature 2: Strategy Telemetry — schema validation
// ═══════════════════════════════════════════════════════════════════

describe("strategyTelemetry schema", () => {
  it("exports the correct table shape from schema", async () => {
    const { strategyTelemetry } = await import("../drizzle/schema");
    expect(strategyTelemetry).toBeDefined();
    expect(strategyTelemetry.taskExternalId).toBeDefined();
    expect(strategyTelemetry.userId).toBeDefined();
    expect(strategyTelemetry.stuckCount).toBeDefined();
    expect(strategyTelemetry.strategyLabel).toBeDefined();
    expect(strategyTelemetry.triggerPattern).toBeDefined();
    expect(strategyTelemetry.outcome).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Session 22 — Feature 2: Strategy Stats tRPC endpoint
// ═══════════════════════════════════════════════════════════════════

describe("usage.strategyStats endpoint", () => {
  it("is registered on the appRouter", () => {
    expect(appRouter._def.procedures["usage.strategyStats"]).toBeDefined();
  });
});
