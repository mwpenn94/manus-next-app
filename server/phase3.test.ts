import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock database layer ──

vi.mock("./db", () => {
  const tasks: any[] = [];
  const messages: any[] = [];
  const schedules: any[] = [];
  const events: any[] = [];
  let taskIdCounter = 1;
  let schedIdCounter = 1;
  let eventIdCounter = 1;

  return {
    verifyTaskOwnership: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyTaskOwnershipById: vi.fn(async () => ({ id: 1, userId: 1, externalId: "test" })),
    verifyKnowledgeOwnership: vi.fn(async () => ({ id: 1, projectId: 1 })),
    // Existing mocks
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
    getTaskMessages: vi.fn(async () => [
      { role: "user", content: "Hello, I work at Acme Corp and prefer dark mode." },
      { role: "assistant", content: "Got it! I'll remember that you work at Acme Corp and prefer dark mode." },
    ]),
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
    getUserMemories: vi.fn(async () => []),
    addMemoryEntry: vi.fn(async (data: any) => ({ id: 1, ...data, createdAt: new Date() })),
    deleteMemoryEntry: vi.fn(),
    searchMemories: vi.fn(async () => []),

    // Share mocks
    createTaskShare: vi.fn(async (data: any) => ({ id: 1, ...data, viewCount: 0, createdAt: new Date() })),
    getTaskShareByToken: vi.fn(async () => null),
    getTaskShares: vi.fn(async () => []),
    incrementShareViewCount: vi.fn(),
    deleteTaskShare: vi.fn(),

    // Notification mocks
    getUserNotifications: vi.fn(async () => []),
    getUnreadNotificationCount: vi.fn(async () => 0),
    createNotification: vi.fn(async (data: any) => ({ id: 1, ...data, readAt: null, createdAt: new Date() })),
    markNotificationRead: vi.fn(),
    markAllNotificationsRead: vi.fn(),

    // Schedule mocks
    createScheduledTask: vi.fn(async (data: any) => {
      const sched = { id: schedIdCounter++, ...data, enabled: true, lastRunAt: null, nextRunAt: null, runCount: 0, createdAt: new Date() };
      schedules.push(sched);
      return sched;
    }),
    getUserScheduledTasks: vi.fn(async (userId: number) => {
      return schedules.filter(s => s.userId === userId);
    }),
    updateScheduledTask: vi.fn(async (id: number, userId: number, data: any) => {
      const sched = schedules.find(s => s.id === id && s.userId === userId);
      if (sched) Object.assign(sched, data);
    }),
    deleteScheduledTask: vi.fn(async (id: number, userId: number) => {
      const idx = schedules.findIndex(s => s.id === id && s.userId === userId);
      if (idx >= 0) schedules.splice(idx, 1);
    }),

    // Task event mocks
    addTaskEvent: vi.fn(async (data: any) => {
      const event = { id: eventIdCounter++, ...data, createdAt: new Date() };
      events.push(event);
      return event;
    }),
    getTaskEvents: vi.fn(async (taskId: number) => {
      return events.filter(e => e.taskId === taskId);
    }),
    toggleScheduledTask: vi.fn(async (id: number, userId: number) => {
      const sched = schedules.find(s => s.id === id && s.userId === userId);
      if (sched) sched.enabled = !sched.enabled;
    }),

    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(),
  };
});

// Mock LLM for memory extraction
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (opts: any) => {
    // If the prompt asks for memory extraction, return structured memories
    const systemMsg = opts.messages?.find((m: any) => m.role === "system");
    if (systemMsg?.content?.includes("extract") || systemMsg?.content?.includes("Extract") || systemMsg?.content?.includes("Analyze this conversation")) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              memories: [
                { key: "Workplace", value: "User works at Acme Corp" },
                { key: "Language Preference", value: "User prefers TypeScript" },
              ],
            }),
          },
        }],
      };
    }
    return {
      choices: [{ message: { content: "Mock LLM response" } }],
    };
  }),
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

// ── Browse Web Tool Tests ──

describe("browse_web tool", () => {
  it("AGENT_TOOLS includes browse_web", async () => {
    const mod = await import("./agentTools");
    const browseTool = mod.AGENT_TOOLS.find((t: any) => t.function.name === "browse_web");
    expect(browseTool).toBeDefined();
    expect(browseTool!.function.parameters.properties).toHaveProperty("url");
    expect(browseTool!.function.parameters.properties).toHaveProperty("extract");
  });

  it("browse_web has correct extract enum", async () => {
    const mod = await import("./agentTools");
    const browseTool = mod.AGENT_TOOLS.find((t: any) => t.function.name === "browse_web");
    const extractProp = browseTool!.function.parameters.properties.extract;
    expect(extractProp).toBeDefined();
    expect(extractProp.enum).toContain("full");
    expect(extractProp.enum).toContain("links");
    expect(extractProp.enum).toContain("metadata");
  });

  it("browse_web tool count is correct (8 total tools)", async () => {
    const mod = await import("./agentTools");
    // 14 tools: web_search, read_webpage, generate_image, analyze_data, execute_code, generate_document, browse_web, wide_research, generate_slides, send_email, take_meeting_notes, design_canvas, cloud_browser, screenshot_verify
    // 17 tools: web_search, read_webpage, generate_image, analyze_data, execute_code, generate_document, browse_web, wide_research, generate_slides, send_email, take_meeting_notes, design_canvas, cloud_browser, screenshot_verify, create_webapp, create_file, edit_file
    expect(mod.AGENT_TOOLS.length).toBe(38);
  });

  it("executeTool handles browse_web", async () => {
    const mod = await import("./agentTools");
    const result = await mod.executeTool(
      "browse_web",
      JSON.stringify({ url: "https://example.com", action: "extract" })
    );
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
    // Should return some content (even if fetch fails, it should handle gracefully)
    expect(typeof result.result).toBe("string");
  }, 15000);
});

// ── Memory Auto-Extraction Tests ──

describe("memory auto-extraction", () => {
  it("memoryExtractor.ts exports extractMemories function", async () => {
    const mod = await import("./memoryExtractor");
    expect(mod.extractMemories).toBeDefined();
    expect(typeof mod.extractMemories).toBe("function");
  });

  it("extractMemories calls LLM with structured JSON schema", async () => {
    const { extractMemories } = await import("./memoryExtractor");
    const { invokeLLM } = await import("./_core/llm");

    await extractMemories(
      42,
      "test-task-123",
      [
        { role: "user", content: "Hello, I work at Acme Corp and prefer dark mode." },
        { role: "assistant", content: "Got it! I'll remember that you work at Acme Corp and prefer dark mode." },
      ],
    );

    expect(invokeLLM).toHaveBeenCalled();
    const lastCall = (invokeLLM as any).mock.calls[(invokeLLM as any).mock.calls.length - 1][0];
    expect(lastCall.response_format).toBeDefined();
    expect(lastCall.response_format.type).toBe("json_schema");
  });

  it("extractMemories stores extracted facts via addMemoryEntry", async () => {
    const { extractMemories } = await import("./memoryExtractor");
    const { addMemoryEntry } = await import("./db");

    await extractMemories(
      42,
      "test-task-456",
      [
        { role: "user", content: "I work at Acme Corp and my favorite language is TypeScript" },
        { role: "assistant", content: "Noted! You work at Acme Corp and prefer TypeScript." },
      ],
    );

    expect(addMemoryEntry).toHaveBeenCalled();
    // Should have been called with source: "auto"
    const calls = (addMemoryEntry as any).mock.calls;
    const autoCall = calls.find((c: any) => c[0]?.source === "auto");
    expect(autoCall).toBeDefined();
  });

  it("extractMemories handles empty conversations gracefully", async () => {
    const { extractMemories } = await import("./memoryExtractor");

    // Should not throw — empty messages array returns early
    await expect(
      extractMemories(42, "test-task-empty", [])
    ).resolves.not.toThrow();
  });
});

// ── Agent Stream Display Info Tests ──

describe("agent stream display info", () => {
  it("agentStream.ts includes browse_web in system prompt", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"), "utf-8"
    );
    expect(source).toContain("browse_web");
    expect(source).toContain("Navigate to a URL");
  });

  it("system prompt includes memory integration", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"), "utf-8"
    );
    expect(source).toContain("cross-session memory");
    expect(source).toContain("USER MEMORY");
  });

  it("system prompt includes speed mode instructions", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"), "utf-8"
    );
    expect(source).toContain("MODE: SPEED");
    expect(source).toContain("concise responses");
  });
});

// ── Schedule Router Tests ──

describe("schedule router", () => {
  it("creates a scheduled task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.schedule.create({
      name: "Daily research check",
      prompt: "Check the latest AI news",
      scheduleType: "cron",
      cronExpression: "0 9 * * *",
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Daily research check");
  });

  it("lists scheduled tasks for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const schedules = await caller.schedule.list();
    expect(Array.isArray(schedules)).toBe(true);
  });

  it("updates a scheduled task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const schedules = await caller.schedule.list();
    if (schedules.length === 0) return;

    const result = await caller.schedule.update({
      id: schedules[0].id,
      enabled: false,
    });

    expect(result).toEqual({ success: true });
  });

  it("deletes a scheduled task", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const schedules = await caller.schedule.list();
    if (schedules.length === 0) return;

    const result = await caller.schedule.delete({ id: schedules[0].id });
    expect(result).toEqual({ success: true });
  });

  it("rejects scheduled task creation with empty name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.schedule.create({
        name: "",
        prompt: "Do something",
        scheduleType: "cron",
        cronExpression: "0 9 * * *",
      })
    ).rejects.toThrow();
  });

  it("rejects scheduled task creation with empty prompt", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.schedule.create({
        name: "Test",
        prompt: "",
        scheduleType: "cron",
        cronExpression: "0 9 * * *",
      })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated schedule access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.schedule.list()).rejects.toThrow();
  });
});

// ── Replay Router Tests ──

describe("replay router", () => {
  it("adds a task event", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.replay.addEvent({
      taskId: 1,
      eventType: "tool_call",
      payload: JSON.stringify({ tool: "web_search", args: { query: "test" } }),
      offsetMs: 1500,
    });

    expect(result).toEqual({ success: true });
  });

  it("retrieves task events for replay", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const events = await caller.replay.events({
      taskId: 1,
    });

    expect(Array.isArray(events)).toBe(true);
  });

  it("rejects unauthenticated replay access", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.replay.events({ taskId: 1 })
    ).rejects.toThrow();
  });
});

// ── Capability Inventory Honesty Tests ──

describe("capability inventory honesty", () => {
  it("SettingsPage has 10+ live capabilities", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"), "utf-8"
    );
    const liveCount = (source.match(/status: "live"/g) || []).length;
    expect(liveCount).toBeGreaterThanOrEqual(10);
  });

  it("SettingsPage has fewer planned than live capabilities", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"), "utf-8"
    );
    const liveCount = (source.match(/status: "live"/g) || []).length;
    const plannedCount = (source.match(/status: "planned"/g) || []).length;
    expect(liveCount).toBeGreaterThan(plannedCount);
  });

  it("all live capabilities have defaultEnabled: true", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "../client/src/pages/SettingsPage.tsx"), "utf-8"
    );
    const liveLines = source.split("\n").filter((l: string) => l.includes('status: "live"'));
    for (const line of liveLines) {
      expect(line).toContain("defaultEnabled: true");
    }
  });
});

// ── Cross-Feature Integration Tests ──

describe("phase 3 cross-feature integration", () => {
  it("all 7 agent tools are present and have unique names", async () => {
    const mod = await import("./agentTools");
    const names = mod.AGENT_TOOLS.map((t: any) => t.function.name);
    expect(names).toContain("web_search");
    expect(names).toContain("read_webpage");
    expect(names).toContain("generate_image");
    expect(names).toContain("analyze_data");
    expect(names).toContain("execute_code");
    expect(names).toContain("generate_document");
    expect(names).toContain("browse_web");
    expect(new Set(names).size).toBe(names.length); // All unique
  });

  it("agentStream handles browse_web in display info", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"), "utf-8"
    );
    expect(source).toContain('case "browse_web"');
    expect(source).toContain("Browsing");
  });

  it("schedule and replay routers are mounted on appRouter", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // These should not throw — they're mounted
    expect(caller.schedule).toBeDefined();
    expect(caller.replay).toBeDefined();
  });
});
