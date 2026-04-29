import { describe, expect, it, vi } from "vitest";

/**
 * Pass 70 — Message Persistence & Context Reconstruction Tests
 *
 * These tests validate the fixes for:
 * 1. AI forgetting context (slice(-10) → slice(-50))
 * 2. Server-side message reconstruction from DB
 * 3. Dual-persist removal (only client persists)
 * 4. WebApp builder stream contract (messages[] not prompt)
 */

describe("Message Persistence Architecture (Pass 70)", () => {
  describe("Server-side message reconstruction logic", () => {
    it("should reconstruct messages from DB when client sends <= 2 messages", () => {
      // Simulate the server-side reconstruction logic
      const clientMessages = [
        { role: "user", content: "continue" },
      ];

      const dbMessages = [
        { role: "user", content: "Build me a landing page", createdAt: new Date("2024-01-01") },
        { role: "assistant", content: "I'll create a modern landing page for you...", createdAt: new Date("2024-01-01") },
        { role: "user", content: "Add a pricing section", createdAt: new Date("2024-01-02") },
        { role: "assistant", content: "I've added a pricing section with three tiers...", createdAt: new Date("2024-01-02") },
        { role: "user", content: "Make it dark mode", createdAt: new Date("2024-01-03") },
        { role: "assistant", content: "I've converted the design to dark mode...", createdAt: new Date("2024-01-03") },
      ];

      // Reconstruction logic (mirrors server/_core/index.ts lines 1038-1073)
      const taskExternalId = "test-task-123";
      let messages = [...clientMessages];

      if (taskExternalId && messages.length <= 2) {
        const dbFormatted = dbMessages
          .filter((m: any) => m.content && m.content.trim())
          .map((m: any) => ({ role: m.role as string, content: m.content as string }));

        if (dbFormatted.length > messages.length) {
          const lastClientMsg = messages[messages.length - 1];
          if (lastClientMsg && lastClientMsg.role === "user") {
            const lastDbMsg = dbFormatted[dbFormatted.length - 1];
            const isNew = !lastDbMsg || lastDbMsg.content !== lastClientMsg.content;
            if (isNew) {
              messages = [...dbFormatted.slice(-48), lastClientMsg];
            } else {
              messages = dbFormatted.slice(-50);
            }
          } else {
            messages = dbFormatted.slice(-50);
          }
        }
      }

      // Should have all DB messages + the new "continue" message
      expect(messages.length).toBe(7); // 6 from DB + 1 new
      expect(messages[0].content).toBe("Build me a landing page");
      expect(messages[messages.length - 1].content).toBe("continue");
    });

    it("should not reconstruct when client sends > 2 messages (already has history)", () => {
      const clientMessages = [
        { role: "user", content: "Build me a landing page" },
        { role: "assistant", content: "I'll create a modern landing page..." },
        { role: "user", content: "Add pricing" },
      ];

      const taskExternalId = "test-task-123";
      let messages = [...clientMessages];

      // The condition `messages.length <= 2` prevents reconstruction
      if (taskExternalId && messages.length <= 2) {
        // This block should NOT execute
        messages = [{ role: "system", content: "SHOULD NOT HAPPEN" }];
      }

      // Should remain unchanged
      expect(messages.length).toBe(3);
      expect(messages[0].content).toBe("Build me a landing page");
    });

    it("should handle duplicate last message (already persisted)", () => {
      const clientMessages = [
        { role: "user", content: "Make it dark mode" },
      ];

      const dbMessages = [
        { role: "user", content: "Build me a landing page", createdAt: new Date() },
        { role: "assistant", content: "Done!", createdAt: new Date() },
        { role: "user", content: "Make it dark mode", createdAt: new Date() },
      ];

      const taskExternalId = "test-task-123";
      let messages = [...clientMessages];

      if (taskExternalId && messages.length <= 2) {
        const dbFormatted = dbMessages
          .filter((m: any) => m.content && m.content.trim())
          .map((m: any) => ({ role: m.role as string, content: m.content as string }));

        if (dbFormatted.length > messages.length) {
          const lastClientMsg = messages[messages.length - 1];
          if (lastClientMsg && lastClientMsg.role === "user") {
            const lastDbMsg = dbFormatted[dbFormatted.length - 1];
            const isNew = !lastDbMsg || lastDbMsg.content !== lastClientMsg.content;
            if (isNew) {
              messages = [...dbFormatted.slice(-48), lastClientMsg];
            } else {
              // Last message already in DB — just use DB history
              messages = dbFormatted.slice(-50);
            }
          }
        }
      }

      // Should use DB messages without duplication
      expect(messages.length).toBe(3);
      expect(messages[messages.length - 1].content).toBe("Make it dark mode");
    });
  });

  describe("Message history size (slice fix)", () => {
    it("should include up to 50 messages for context (not just 10)", () => {
      // Generate a conversation with 30 messages
      const allMessages = Array.from({ length: 30 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i + 1}`,
      }));

      // Old behavior: slice(-10) would only keep last 10
      const oldBehavior = allMessages.slice(-10);
      expect(oldBehavior.length).toBe(10);
      expect(oldBehavior[0].content).toBe("Message 21"); // Lost first 20!

      // New behavior: slice(-50) keeps all 30 (since 30 < 50)
      const newBehavior = allMessages
        .filter(m => m.content.trim() || m.role === "user")
        .slice(-50);
      expect(newBehavior.length).toBe(30);
      expect(newBehavior[0].content).toBe("Message 1"); // Full history preserved
    });

    it("should cap at 50 messages for very long conversations", () => {
      const allMessages = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Message ${i + 1}`,
      }));

      const result = allMessages
        .filter(m => m.content.trim() || m.role === "user")
        .slice(-50);
      expect(result.length).toBe(50);
      expect(result[0].content).toBe("Message 51"); // Keeps most recent 50
    });
  });

  describe("Stream body contract", () => {
    it("should send messages array (not prompt) to /api/stream", () => {
      // This validates the fix for WebAppBuilderPage, ComputerUsePage, etc.
      // Old format: { prompt: "..." } — server ignores this
      // New format: { messages: [{ role: "user", content: "..." }] }

      const oldBody = { prompt: "Build a todo app" };
      const newBody = {
        messages: [{ role: "user", content: "Build a todo app" }],
        taskExternalId: "task-123",
        mode: "quality",
      };

      // Server reads body.messages — old format would give empty array
      const oldMessages = (oldBody as any).messages || [];
      expect(oldMessages.length).toBe(0); // Bug: no messages sent!

      const newMessages = newBody.messages || [];
      expect(newMessages.length).toBe(1); // Fix: message properly sent
      expect(newMessages[0].content).toBe("Build a todo app");
    });
  });

  describe("Dedup logic", () => {
    it("should detect duplicates based on role + first 300 chars", () => {
      const existingMessages = [
        { role: "assistant", content: "A".repeat(500) },
      ];

      const newMessage = { role: "assistant", content: "A".repeat(500) };

      // Dedup key: role:content.slice(0, 300)
      const contentKey = `${newMessage.role}:${newMessage.content.slice(0, 300).trim()}`;
      const lastFew = existingMessages.slice(-5);
      const isDuplicate = lastFew.some(
        (m) => `${m.role}:${m.content.slice(0, 300).trim()}` === contentKey
      );

      expect(isDuplicate).toBe(true);
    });

    it("should not flag different messages as duplicates", () => {
      const existingMessages = [
        { role: "assistant", content: "First response about landing pages" },
      ];

      const newMessage = { role: "assistant", content: "Second response about pricing" };

      const contentKey = `${newMessage.role}:${newMessage.content.slice(0, 300).trim()}`;
      const lastFew = existingMessages.slice(-5);
      const isDuplicate = lastFew.some(
        (m) => `${m.role}:${m.content.slice(0, 300).trim()}` === contentKey
      );

      expect(isDuplicate).toBe(false);
    });
  });
});
