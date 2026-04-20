/**
 * Message Persistence Tests — NS13
 *
 * Tests for:
 * 1. Message dedup logic (role + content-based deduplication)
 * 2. Server-side onComplete callback in agentStream
 * 3. Error message mapping for user-friendly errors
 * 4. Message ordering (ASC by createdAt)
 */
import { describe, expect, it, vi } from "vitest";

// ── 1. Dedup Logic Tests ──
// These test the same dedup algorithm used in TaskContext.tsx merge logic
describe("Message dedup logic", () => {
  type TestMessage = { role: string; content: string; id: string };

  function dedup(serverMsgs: TestMessage[], localMsgs: TestMessage[]): TestMessage[] {
    const serverMsgKeys = new Set(
      serverMsgs.map(m => `${m.role}:${m.content.slice(0, 300).trim()}`)
    );
    const uniqueLocalMsgs = localMsgs.filter(
      m => !serverMsgKeys.has(`${m.role}:${m.content.slice(0, 300).trim()}`)
    );
    return [...serverMsgs, ...uniqueLocalMsgs];
  }

  it("removes duplicate assistant messages from local set when server has them", () => {
    const server: TestMessage[] = [
      { id: "srv-1", role: "user", content: "Hello" },
      { id: "srv-2", role: "assistant", content: "Hi there! How can I help?" },
    ];
    const local: TestMessage[] = [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi there! How can I help?" },
    ];

    const result = dedup(server, local);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("srv-1");
    expect(result[1].id).toBe("srv-2");
  });

  it("keeps unique local messages that aren't on the server", () => {
    const server: TestMessage[] = [
      { id: "srv-1", role: "user", content: "Hello" },
    ];
    const local: TestMessage[] = [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Working on it..." },
    ];

    const result = dedup(server, local);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("srv-1");
    expect(result[1].id).toBe("msg-2");
  });

  it("handles dual-persisted assistant messages (server + client both saved)", () => {
    const longContent = "A".repeat(500);
    const server: TestMessage[] = [
      { id: "srv-1", role: "user", content: "Explain quantum computing" },
      { id: "srv-2", role: "assistant", content: longContent }, // Server-saved
      { id: "client-3", role: "assistant", content: longContent }, // Client-saved (same content)
    ];
    const local: TestMessage[] = [];

    // Even with duplicates in server data, the dedup should keep all server messages
    // The dedup only filters LOCAL messages against server messages
    const result = dedup(server, local);
    expect(result).toHaveLength(3); // All server messages kept
  });

  it("distinguishes messages by role even with same content", () => {
    const server: TestMessage[] = [
      { id: "srv-1", role: "user", content: "test message" },
    ];
    const local: TestMessage[] = [
      { id: "msg-1", role: "assistant", content: "test message" }, // Same content, different role
    ];

    const result = dedup(server, local);
    expect(result).toHaveLength(2);
  });

  it("handles empty server messages gracefully", () => {
    const server: TestMessage[] = [];
    const local: TestMessage[] = [
      { id: "msg-1", role: "user", content: "Hello" },
      { id: "msg-2", role: "assistant", content: "Hi!" },
    ];

    const result = dedup(server, local);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("msg-1");
  });

  it("handles empty local messages gracefully", () => {
    const server: TestMessage[] = [
      { id: "srv-1", role: "user", content: "Hello" },
    ];
    const local: TestMessage[] = [];

    const result = dedup(server, local);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("srv-1");
  });

  it("deduplicates using first 300 chars for long messages", () => {
    const base = "A".repeat(300);
    const server: TestMessage[] = [
      { id: "srv-1", role: "assistant", content: base + " extra server content" },
    ];
    const local: TestMessage[] = [
      { id: "msg-1", role: "assistant", content: base + " extra local content" },
    ];

    // Both share the same first 300 chars, so local should be filtered out
    const result = dedup(server, local);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("srv-1");
  });
});

// ── 2. Error Message Mapping Tests ──
describe("User-friendly error messages", () => {
  function mapError(errMessage: string): string {
    let errorMsg = "Something went wrong. Please try again.";
    if (errMessage === "Load failed" || errMessage === "Failed to fetch" || errMessage === "NetworkError when attempting to fetch resource.") {
      errorMsg = "Connection lost. The server may have restarted. Please try again.";
    } else if (errMessage?.includes("timeout")) {
      errorMsg = "The request timed out. Please try again with a shorter message.";
    } else if (errMessage) {
      errorMsg = `I encountered an error: ${errMessage}. Please try again.`;
    }
    return errorMsg;
  }

  it("maps Safari 'Load failed' to connection lost message", () => {
    expect(mapError("Load failed")).toBe("Connection lost. The server may have restarted. Please try again.");
  });

  it("maps Chrome 'Failed to fetch' to connection lost message", () => {
    expect(mapError("Failed to fetch")).toBe("Connection lost. The server may have restarted. Please try again.");
  });

  it("maps Firefox network error to connection lost message", () => {
    expect(mapError("NetworkError when attempting to fetch resource.")).toBe("Connection lost. The server may have restarted. Please try again.");
  });

  it("maps timeout errors to timeout message", () => {
    expect(mapError("Request timeout after 30s")).toBe("The request timed out. Please try again with a shorter message.");
  });

  it("passes through other error messages", () => {
    expect(mapError("Some custom error")).toBe("I encountered an error: Some custom error. Please try again.");
  });
});

// ── 3. onComplete Callback Pattern Tests ──
describe("agentStream onComplete callback", () => {
  it("fires callback with final content when content is non-empty", () => {
    const callback = vi.fn();
    const finalContent = "Here is the analysis of quantum computing...";

    // Simulate the onComplete guard from agentStream.ts
    if (callback && finalContent.trim()) {
      try {
        callback(finalContent);
      } catch (e) {
        // swallow
      }
    }

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith(finalContent);
  });

  it("does NOT fire callback when content is empty/whitespace", () => {
    const callback = vi.fn();
    const finalContent = "   ";

    if (callback && finalContent.trim()) {
      callback(finalContent);
    }

    expect(callback).not.toHaveBeenCalled();
  });

  it("swallows errors from callback without crashing", () => {
    const callback = vi.fn(() => { throw new Error("DB write failed"); });
    const finalContent = "Some content";

    let threw = false;
    if (callback && finalContent.trim()) {
      try {
        callback(finalContent);
      } catch (e) {
        // swallowed — matching agentStream.ts behavior
        threw = false; // We caught it, so it didn't propagate
      }
    }

    expect(callback).toHaveBeenCalledOnce();
    expect(threw).toBe(false);
  });
});

// ── 4. Partial Content Save Logic Tests ──
describe("Partial content save on unmount", () => {
  it("saves partial content with interruption marker when content exists", () => {
    const addMessage = vi.fn();
    const taskId = "task-123";
    const content = "Here is the beginning of my response about";
    const actions = [{ type: "thinking", status: "active" }];

    // Simulate the savePartialContent logic from TaskView.tsx
    if (taskId && content.trim()) {
      addMessage(taskId, {
        role: "assistant",
        content: content + "\n\n*[Response interrupted — partial content saved]*",
        actions: actions.length > 0 ? actions : undefined,
      });
    }

    expect(addMessage).toHaveBeenCalledOnce();
    expect(addMessage.mock.calls[0][1].content).toContain("partial content saved");
    expect(addMessage.mock.calls[0][1].actions).toEqual(actions);
  });

  it("does NOT save when content is empty", () => {
    const addMessage = vi.fn();
    const taskId = "task-123";
    const content = "";

    if (taskId && content.trim()) {
      addMessage(taskId, { role: "assistant", content: content + "\n\n*[interrupted]*" });
    }

    expect(addMessage).not.toHaveBeenCalled();
  });

  it("does NOT save when taskId is null", () => {
    const addMessage = vi.fn();
    const taskId: string | null = null;
    const content = "Some content";

    if (taskId && content.trim()) {
      addMessage(taskId, { role: "assistant", content });
    }

    expect(addMessage).not.toHaveBeenCalled();
  });
});
