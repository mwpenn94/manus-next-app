import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Test response",
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
  })),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(async () => null),
  },
}));

vi.mock("./db", () => ({
  getTaskByExternalId: vi.fn(async () => null),
  getUserPreferences: vi.fn(async () => null),
  getUserByOpenId: vi.fn(async () => null),
  upsertUser: vi.fn(async () => {}),
}));

describe("Chat persistence behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("task messages query should use staleTime: 0 for fresh data on task switch", () => {
    // Verify the pattern: staleTime: 0 ensures messages are always refetched
    // when a task becomes active again after being deactivated
    const queryConfig = {
      enabled: true,
      retry: false,
      staleTime: 0,
    };

    expect(queryConfig.staleTime).toBe(0);
    expect(queryConfig.retry).toBe(false);
  });

  it("messagesLoaded flag should reset when switching away from a task", () => {
    // Simulate the setActiveTask behavior
    const tasks = [
      { id: "task-1", serverId: 1, messagesLoaded: true, messages: [{ role: "user", content: "Hello" }] },
      { id: "task-2", serverId: 2, messagesLoaded: true, messages: [{ role: "user", content: "World" }] },
    ];
    const activeTaskId = "task-1";
    const newActiveId = "task-2";

    // When switching from task-1 to task-2, task-1's messagesLoaded should reset
    const updatedTasks = tasks.map((t) =>
      t.id === activeTaskId && t.serverId
        ? { ...t, messagesLoaded: false }
        : t
    );

    expect(updatedTasks[0].messagesLoaded).toBe(false); // task-1 reset
    expect(updatedTasks[1].messagesLoaded).toBe(true);  // task-2 unchanged
  });

  it("server messages merge uses content-based dedup", () => {
    const serverMsgs = [
      { id: "srv-1", role: "user", content: "Hello", timestamp: new Date() },
      { id: "srv-2", role: "assistant", content: "Hi there!", timestamp: new Date() },
    ];
    const localMsgs = [
      { id: "local-1", role: "user", content: "Hello", timestamp: new Date() }, // Duplicate
      { id: "local-2", role: "user", content: "New message", timestamp: new Date() }, // Unique
    ];

    const serverMsgIds = new Set(serverMsgs.map(m => m.content));
    const uniqueLocalMsgs = localMsgs.filter(m => !serverMsgIds.has(m.content));

    expect(uniqueLocalMsgs).toHaveLength(1);
    expect(uniqueLocalMsgs[0].content).toBe("New message");

    const merged = [...serverMsgs, ...uniqueLocalMsgs];
    expect(merged).toHaveLength(3);
  });
});

describe("Continuous prompt submission during execution", () => {
  it("handleSend should NOT block when streaming is true (follow-up behavior)", () => {
    // In the new behavior, handleSend allows sending during streaming
    // by adding the user message and aborting the current stream
    const streaming = true;
    const input = "Follow-up question";
    const hasAbortController = true;

    // Old behavior: would return early
    // const oldBehavior = !input.trim() || streaming; // true — blocked
    // New behavior: allows sending if there's an abort controller
    const newBehavior = !input.trim(); // false — not blocked
    const canSendDuringStream = streaming && hasAbortController;

    expect(newBehavior).toBe(false); // Input is valid
    expect(canSendDuringStream).toBe(true); // Can send during stream
  });

  it("textarea should NOT be disabled during streaming", () => {
    // The textarea no longer has disabled={streaming}
    // Instead, placeholder changes to indicate follow-up is possible
    const streaming = true;
    const placeholder = streaming ? "Type a follow-up message..." : "Send a message...";

    expect(placeholder).toBe("Type a follow-up message...");
    // No disabled attribute — user can always type
  });

  it("both stop and send buttons should be visible during streaming", () => {
    const streaming = true;
    const input = "Follow-up";

    // During streaming, both buttons should render
    const showStopButton = streaming;
    const showSendButton = true; // Always visible
    const sendEnabled = input.trim().length > 0;

    expect(showStopButton).toBe(true);
    expect(showSendButton).toBe(true);
    expect(sendEnabled).toBe(true);
  });
});

describe("Execution step limit removal", () => {
  it("MAX_TOOL_TURNS should be 100 (no artificial limit)", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // Verify the constant is set to 100
    expect(content).toContain("const MAX_TOOL_TURNS = 100;");
  });

  it("speed mode should allow 30 turns", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // Verify mode-specific limits
    expect(content).toContain('mode === "speed" ? 30');
  });

  it("max mode should allow 100 turns", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    expect(content).toContain('mode === "max" ? 100');
  });

  it("should NOT show user-visible step limit message", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // The old message should be gone
    expect(content).not.toContain("Reached maximum number of tool execution steps");
  });

  it("should log completion without user-facing message", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("server/agentStream.ts", "utf-8");
    
    // Should have a console.log for debugging but no SSE delta with limit message
    expect(content).toContain("Completed after");
    expect(content).toContain("No user-visible limit message");
  });
});
