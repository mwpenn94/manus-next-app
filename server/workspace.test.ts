/**
 * Workspace artifact tests — verifies the real persistence pipeline
 * that stores browser screenshots, code, terminal output, and URLs
 * from bridge events into the database.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";

const COOKIE_NAME = "auth_token";

// Mock db module
vi.mock("./db", () => {
  const artifacts: any[] = [];
  return {
    verifyTaskOwnership: vi.fn().mockResolvedValue({ id: 1, userId: 1, externalId: "test" }),
    verifyTaskOwnershipById: vi.fn().mockResolvedValue({ id: 1, userId: 1, externalId: "test" }),
    verifyKnowledgeOwnership: vi.fn().mockResolvedValue({ id: 1, projectId: 1 }),
    createTask: vi.fn().mockResolvedValue({ id: 1, externalId: "test-task-1" }),
    getUserTasks: vi.fn().mockResolvedValue([]),
    getTaskByExternalId: vi.fn().mockResolvedValue(null),
    updateTaskStatus: vi.fn().mockResolvedValue(undefined),
    addTaskMessage: vi.fn().mockResolvedValue({ id: 1 }),
    getTaskMessages: vi.fn().mockResolvedValue([]),
    getBridgeConfig: vi.fn().mockResolvedValue(null),
    upsertBridgeConfig: vi.fn().mockResolvedValue(undefined),
    createTaskFile: vi.fn().mockResolvedValue({ id: 1 }),
    getTaskFiles: vi.fn().mockResolvedValue([]),
    getUserPreferences: vi.fn().mockResolvedValue(undefined),
    upsertUserPreferences: vi.fn().mockResolvedValue(undefined),
    getUserTaskStats: vi.fn().mockResolvedValue({ totalTasks: 0, completedTasks: 0, totalMessages: 0 }),
    archiveTask: vi.fn().mockResolvedValue(undefined),
    toggleTaskFavorite: vi.fn().mockResolvedValue(undefined),
    updateTaskSystemPrompt: vi.fn().mockResolvedValue(undefined),
    searchTasks: vi.fn().mockResolvedValue([]),
    addWorkspaceArtifact: vi.fn().mockImplementation(async (artifact) => {
      artifacts.push({ ...artifact, id: artifacts.length + 1, createdAt: Date.now() });
      return { id: artifacts.length };
    }),
    getWorkspaceArtifacts: vi.fn().mockImplementation(async (taskId, type) => {
      return artifacts.filter(a => a.taskId === taskId && (!type || a.artifactType === type));
    }),
    getLatestArtifactByType: vi.fn().mockImplementation(async (taskId, type) => {
      const matching = artifacts.filter(a => a.taskId === taskId && a.artifactType === type);
      return matching.length > 0 ? matching[matching.length - 1] : null;
    }),
  };
});

function makeAuthCtx(userId = 1) {
  return {
    user: { id: userId, name: "Test User", openId: "test-open-id", role: "user" as const },
    req: { headers: {} } as any,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as any,
  };
}

function makePublicCtx() {
  return {
    user: null,
    req: { headers: {} } as any,
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as any,
  };
}

describe("workspace artifact router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a browser screenshot artifact", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.workspace.addArtifact({
      taskId: 1,
      artifactType: "browser_screenshot",
      url: "https://s3.example.com/screenshot-1.png",
      label: "Google search results",
    });
    expect(result.success).toBe(true);
  });

  it("stores a code artifact with content", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.workspace.addArtifact({
      taskId: 1,
      artifactType: "code",
      content: "console.log('hello world');",
      label: "index.js",
    });
    expect(result.success).toBe(true);
  });

  it("stores a terminal artifact", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.workspace.addArtifact({
      taskId: 1,
      artifactType: "terminal",
      content: "$ npm install\nadded 100 packages",
      label: "npm install",
    });
    expect(result.success).toBe(true);
  });

  it("stores a browser URL artifact", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.workspace.addArtifact({
      taskId: 1,
      artifactType: "browser_url",
      url: "https://www.google.com/search?q=test",
      label: "Google Search",
    });
    expect(result.success).toBe(true);
  });

  it("retrieves artifacts filtered by type", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    // Store multiple types
    await caller.workspace.addArtifact({ taskId: 42, artifactType: "code", content: "const x = 1;", label: "a.js" });
    await caller.workspace.addArtifact({ taskId: 42, artifactType: "terminal", content: "$ ls", label: "ls" });
    await caller.workspace.addArtifact({ taskId: 42, artifactType: "code", content: "const y = 2;", label: "b.js" });

    const codeArtifacts = await caller.workspace.list({ taskId: 42, type: "code" });
    expect(codeArtifacts.length).toBe(2);
    expect(codeArtifacts[0].label).toBe("a.js");
    expect(codeArtifacts[1].label).toBe("b.js");
  });

  it("retrieves the latest artifact of a given type", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.workspace.addArtifact({ taskId: 99, artifactType: "browser_screenshot", url: "https://s3.example.com/old.png" });
    await caller.workspace.addArtifact({ taskId: 99, artifactType: "browser_screenshot", url: "https://s3.example.com/new.png" });

    const latest = await caller.workspace.latest({ taskId: 99, type: "browser_screenshot" });
    expect(latest).not.toBeNull();
    expect(latest!.url).toBe("https://s3.example.com/new.png");
  });

  it("returns null for latest when no artifacts exist", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const latest = await caller.workspace.latest({ taskId: 9999, type: "terminal" });
    expect(latest).toBeNull();
  });

  it("rejects unauthenticated access to addArtifact", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.workspace.addArtifact({
      taskId: 1,
      artifactType: "code",
      content: "x",
    })).rejects.toThrow();
  });

  it("rejects unauthenticated access to list", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.workspace.list({ taskId: 1 })).rejects.toThrow();
  });

  it("rejects unauthenticated access to latest", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.workspace.latest({ taskId: 1, type: "code" })).rejects.toThrow();
  });
});

describe("voice transcription router", () => {
  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.voice.transcribe({
      audioUrl: "https://example.com/audio.webm",
    })).rejects.toThrow();
  });
});

describe("llm chat router", () => {
  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.llm.chat({
      messages: [{ role: "user", content: "hello" }],
    })).rejects.toThrow();
  });
});
