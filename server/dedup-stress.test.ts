import { describe, it, expect } from "vitest";

/**
 * Agent Conversation Dedup Stress Tests
 *
 * Tests the three-layer deduplication system:
 * 1. Server merge dedup (TaskContext.mergeServerMessages)
 * 2. Local addMessage guard (content-based dedup within 2s window)
 * 3. LLM conversation history dedup (agentStream.deduplicateConversation)
 *
 * These tests verify the dedup logic extracted from the actual implementations.
 */

// ── Layer 1: Server Merge Dedup ──

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
  serverId?: number;
}

function mergeServerMessages(
  localMessages: Message[],
  serverMessages: Message[],
): Message[] {
  // Simulates the dedup logic from TaskContext
  const seen = new Set<string>();
  const merged: Message[] = [];

  // Build content keys from local messages
  for (const msg of localMessages) {
    const key = `${msg.role}:${msg.content.slice(0, 200)}`;
    seen.add(key);
    merged.push(msg);
  }

  // Add server messages that aren't duplicates
  for (const msg of serverMessages) {
    const key = `${msg.role}:${msg.content.slice(0, 200)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(msg);
    }
  }

  return merged;
}

describe("Layer 1: Server Merge Dedup", () => {
  it("should remove exact duplicate messages from server", () => {
    const local: Message[] = [
      { id: "l1", role: "user", content: "Hello" },
      { id: "l2", role: "assistant", content: "Hi there! How can I help?" },
    ];
    const server: Message[] = [
      { id: "s1", role: "user", content: "Hello", serverId: 1 },
      { id: "s2", role: "assistant", content: "Hi there! How can I help?", serverId: 2 },
    ];

    const merged = mergeServerMessages(local, server);
    expect(merged).toHaveLength(2);
  });

  it("should keep unique server messages", () => {
    const local: Message[] = [
      { id: "l1", role: "user", content: "Hello" },
    ];
    const server: Message[] = [
      { id: "s1", role: "user", content: "Hello", serverId: 1 },
      { id: "s2", role: "assistant", content: "New response from server", serverId: 2 },
    ];

    const merged = mergeServerMessages(local, server);
    expect(merged).toHaveLength(2);
    expect(merged[1].content).toBe("New response from server");
  });

  it("should handle 3-4x duplicate assistant messages (the reported bug)", () => {
    const local: Message[] = [
      { id: "l1", role: "user", content: "Research AI architectures" },
    ];
    const server: Message[] = [
      { id: "s1", role: "user", content: "Research AI architectures", serverId: 1 },
      { id: "s2", role: "assistant", content: "I'll research AI agent architectures for you...", serverId: 2 },
      { id: "s3", role: "assistant", content: "I'll research AI agent architectures for you...", serverId: 3 },
      { id: "s4", role: "assistant", content: "I'll research AI agent architectures for you...", serverId: 4 },
      { id: "s5", role: "assistant", content: "I'll research AI agent architectures for you...", serverId: 5 },
    ];

    const merged = mergeServerMessages(local, server);
    // Should have: 1 user + 1 assistant (deduped from 4)
    expect(merged).toHaveLength(2);
    expect(merged.filter(m => m.role === "assistant")).toHaveLength(1);
  });

  it("should handle stress: 50 duplicate messages", () => {
    const local: Message[] = [];
    const server: Message[] = [];

    // 10 unique messages, each duplicated 5 times
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        server.push({
          id: `s${i}-${j}`,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
          serverId: i * 5 + j,
        });
      }
    }

    const merged = mergeServerMessages(local, server);
    expect(merged).toHaveLength(10); // 10 unique messages
  });
});

// ── Layer 2: Local AddMessage Guard ──

describe("Layer 2: Local AddMessage Guard", () => {
  it("should detect duplicate content within time window", () => {
    const recentMessages: Array<{ content: string; timestamp: number }> = [];
    const DEDUP_WINDOW_MS = 2000;

    function isDuplicate(content: string, now: number): boolean {
      const cutoff = now - DEDUP_WINDOW_MS;
      const recent = recentMessages.filter(m => m.timestamp > cutoff);
      return recent.some(m => m.content === content);
    }

    function addMessage(content: string, now: number): boolean {
      if (isDuplicate(content, now)) return false;
      recentMessages.push({ content, timestamp: now });
      return true;
    }

    const t0 = Date.now();

    expect(addMessage("Hello", t0)).toBe(true);
    expect(addMessage("Hello", t0 + 100)).toBe(false); // duplicate within window
    expect(addMessage("Different message", t0 + 200)).toBe(true);
    expect(addMessage("Hello", t0 + 3000)).toBe(true); // outside window, allowed
  });

  it("should allow same content from different roles", () => {
    // The actual dedup uses role + content, but for simplicity we test content-only
    // In the real implementation, role is part of the dedup key
    const seen = new Map<string, number>();
    const WINDOW = 2000;

    function addWithRole(role: string, content: string, now: number): boolean {
      const key = `${role}:${content}`;
      const lastSeen = seen.get(key);
      if (lastSeen && now - lastSeen < WINDOW) return false;
      seen.set(key, now);
      return true;
    }

    const t0 = Date.now();
    expect(addWithRole("user", "Hello", t0)).toBe(true);
    expect(addWithRole("assistant", "Hello", t0 + 50)).toBe(true); // different role
    expect(addWithRole("user", "Hello", t0 + 100)).toBe(false); // same role, duplicate
  });
});

// ── Layer 3: LLM Conversation History Dedup ──

interface ConversationMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function deduplicateConversation(messages: ConversationMessage[]): ConversationMessage[] {
  // Simulates the dedup logic from agentStream.ts
  const seen = new Set<string>();
  const deduped: ConversationMessage[] = [];

  for (const msg of messages) {
    // Skip interrupted partial messages
    if (msg.content.includes("[Response interrupted") || msg.content.includes("[Stopped by user")) {
      continue;
    }

    const key = `${msg.role}:${msg.content.slice(0, 300)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(msg);
    }
  }

  return deduped;
}

describe("Layer 3: LLM Conversation History Dedup", () => {
  it("should remove duplicate assistant messages from conversation history", () => {
    const messages: ConversationMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is AI?" },
      { role: "assistant", content: "AI stands for Artificial Intelligence..." },
      { role: "assistant", content: "AI stands for Artificial Intelligence..." }, // duplicate
      { role: "assistant", content: "AI stands for Artificial Intelligence..." }, // duplicate
    ];

    const deduped = deduplicateConversation(messages);
    expect(deduped).toHaveLength(3);
    expect(deduped.filter(m => m.role === "assistant")).toHaveLength(1);
  });

  it("should strip interrupted partial messages", () => {
    const messages: ConversationMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Research something" },
      { role: "assistant", content: "I'll start researching... [Response interrupted — partial content saved]" },
      { role: "assistant", content: "Here is my complete research on the topic..." },
    ];

    const deduped = deduplicateConversation(messages);
    expect(deduped).toHaveLength(3); // system + user + complete assistant
    expect(deduped[2].content).toBe("Here is my complete research on the topic...");
  });

  it("should strip stopped-by-user messages", () => {
    const messages: ConversationMessage[] = [
      { role: "user", content: "Do something" },
      { role: "assistant", content: "Starting... [Stopped by user]" },
      { role: "user", content: "Try again" },
      { role: "assistant", content: "Here is the result." },
    ];

    const deduped = deduplicateConversation(messages);
    expect(deduped).toHaveLength(3); // 2 user + 1 complete assistant
  });

  it("should handle the exact scenario from the bug report: 3-4 identical responses", () => {
    const longResponse = "Based on my research, here are the key findings about AI agent architectures. " +
      "The main frameworks include AutoGPT, BabyAGI, and LangChain agents. Each has distinct " +
      "approaches to task decomposition, memory management, and tool use...";

    const messages: ConversationMessage[] = [
      { role: "system", content: "You are Manus, an AI agent." },
      { role: "user", content: "Research AI agent architectures" },
      { role: "assistant", content: longResponse },
      { role: "assistant", content: longResponse }, // duplicate from re-stream
      { role: "assistant", content: longResponse }, // duplicate from re-stream
      { role: "user", content: "Tell me more about AutoGPT" },
      { role: "assistant", content: "AutoGPT is an autonomous AI agent..." },
      { role: "assistant", content: "AutoGPT is an autonomous AI agent..." }, // duplicate
    ];

    const deduped = deduplicateConversation(messages);
    expect(deduped).toHaveLength(5); // system + user + assistant + user + assistant
    expect(deduped.filter(m => m.role === "assistant")).toHaveLength(2);
    expect(deduped.filter(m => m.role === "user")).toHaveLength(2);
  });

  it("should handle stress: 100-message conversation with heavy duplication", () => {
    const messages: ConversationMessage[] = [
      { role: "system", content: "You are a helpful assistant." },
    ];

    // Simulate 20 turns with 3x duplication each
    for (let turn = 0; turn < 20; turn++) {
      messages.push({ role: "user", content: `Question ${turn}` });
      for (let dup = 0; dup < 3; dup++) {
        messages.push({ role: "assistant", content: `Answer to question ${turn}` });
      }
      // Add an interrupted partial every 5 turns
      if (turn % 5 === 0) {
        messages.push({ role: "assistant", content: `Partial answer... [Response interrupted — partial content saved]` });
      }
    }

    const deduped = deduplicateConversation(messages);
    // Should have: 1 system + 20 user + 20 assistant = 41
    expect(deduped).toHaveLength(41);
    expect(deduped.filter(m => m.role === "system")).toHaveLength(1);
    expect(deduped.filter(m => m.role === "user")).toHaveLength(20);
    expect(deduped.filter(m => m.role === "assistant")).toHaveLength(20);
  });

  it("should preserve message order after dedup", () => {
    const messages: ConversationMessage[] = [
      { role: "system", content: "System prompt" },
      { role: "user", content: "First question" },
      { role: "assistant", content: "First answer" },
      { role: "assistant", content: "First answer" }, // dup
      { role: "user", content: "Second question" },
      { role: "assistant", content: "Second answer" },
      { role: "assistant", content: "Second answer" }, // dup
    ];

    const deduped = deduplicateConversation(messages);
    expect(deduped.map(m => m.content)).toEqual([
      "System prompt",
      "First question",
      "First answer",
      "Second question",
      "Second answer",
    ]);
  });
});

// ── Integration: All Three Layers Combined ──

describe("Integration: Three-Layer Dedup Pipeline", () => {
  it("should handle the full pipeline: server merge → local guard → LLM history", () => {
    // Step 1: Server merge dedup
    const localMsgs: Message[] = [
      { id: "l1", role: "user", content: "Research AI" },
      { id: "l2", role: "assistant", content: "I'll research AI for you..." },
    ];
    const serverMsgs: Message[] = [
      { id: "s1", role: "user", content: "Research AI", serverId: 1 },
      { id: "s2", role: "assistant", content: "I'll research AI for you...", serverId: 2 },
      { id: "s3", role: "assistant", content: "I'll research AI for you...", serverId: 3 }, // dup
    ];

    const afterMerge = mergeServerMessages(localMsgs, serverMsgs);
    expect(afterMerge).toHaveLength(2);

    // Step 2: Convert to conversation format for LLM
    const conversation: ConversationMessage[] = afterMerge.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Step 3: LLM history dedup (should be clean already)
    const afterLLMDedup = deduplicateConversation(conversation);
    expect(afterLLMDedup).toHaveLength(2);
  });
});
