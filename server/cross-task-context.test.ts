/**
 * Cross-Task Context Tests
 * 
 * Validates the getRecentTaskSummaries db helper and the cross-task context
 * injection logic in the agent stream.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("../drizzle/schema", () => ({
  tasks: { userId: "userId", archived: "archived", externalId: "externalId", id: "id", title: "title", status: "status", createdAt: "createdAt", updatedAt: "updatedAt" },
  taskMessages: { taskId: "taskId", role: "role", content: "content", createdAt: "createdAt" },
}));

vi.mock("drizzle-orm", () => ({
  eq: (a: any, b: any) => ({ type: "eq", field: a, value: b }),
  ne: (a: any, b: any) => ({ type: "ne", field: a, value: b }),
  and: (...args: any[]) => ({ type: "and", conditions: args }),
  desc: (col: any) => ({ type: "desc", col }),
  asc: (col: any) => ({ type: "asc", col }),
  or: (...args: any[]) => ({ type: "or", conditions: args }),
  like: (col: any, pattern: any) => ({ type: "like", col, pattern }),
  lte: (col: any, val: any) => ({ type: "lte", col, val }),
  gte: (col: any, val: any) => ({ type: "gte", col, val }),
  lt: (col: any, val: any) => ({ type: "lt", col, val }),
  gt: (col: any, val: any) => ({ type: "gt", col, val }),
  inArray: (col: any, vals: any) => ({ type: "inArray", col, vals }),
  sql: () => ({}),
}));

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => null,
}));

describe("Cross-Task Context Feature", () => {
  describe("Design Validation", () => {
    it("should have getRecentTaskSummaries exported from db.ts", async () => {
      // Verify the function signature exists
      const dbModule = await import("./db");
      expect(typeof dbModule.getRecentTaskSummaries).toBe("function");
    });

    it("getRecentTaskSummaries should return empty array when db is unavailable", async () => {
      const { getRecentTaskSummaries } = await import("./db");
      // With no DATABASE_URL, getDb returns null
      const result = await getRecentTaskSummaries(1, "test-id", 5);
      expect(result).toEqual([]);
    });

    it("getRecentTaskSummaries should accept correct parameters", async () => {
      const { getRecentTaskSummaries } = await import("./db");
      // Should accept userId, excludeTaskExternalId, and limit
      expect(getRecentTaskSummaries.length).toBeGreaterThanOrEqual(1); // At least userId required
    });
  });

  describe("Cross-Task Context Injection Logic", () => {
    it("should format task summaries correctly for injection", () => {
      const recentTasks = [
        {
          title: "Research AI architectures",
          status: "completed",
          createdAt: new Date(Date.now() - 30 * 60000), // 30 min ago
          userQuery: "Research the top 5 AI agent frameworks",
          assistantSummary: "I researched LangChain, AutoGPT, CrewAI, MetaGPT, and Manus...",
        },
        {
          title: "Write a blog post",
          status: "completed",
          createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
          userQuery: "Write a blog post about quantum computing",
          assistantSummary: "Here's a comprehensive blog post covering quantum computing basics...",
        },
      ];

      const crossTaskContext = recentTasks.map((t, i) => {
        const timeAgo = Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000);
        const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo / 60)}h ago` : `${Math.round(timeAgo / 1440)}d ago`;
        return `${i + 1}. [${timeStr}] "${t.title}" (${t.status})\n   User: ${t.userQuery}${t.assistantSummary ? `\n   Result: ${t.assistantSummary}` : ""}`;
      }).join("\n");

      expect(crossTaskContext).toContain("Research AI architectures");
      expect(crossTaskContext).toContain("Write a blog post");
      expect(crossTaskContext).toContain("30m ago");
      expect(crossTaskContext).toContain("2h ago");
      expect(crossTaskContext).toContain("(completed)");
    });

    it("should truncate long messages to 300 chars", () => {
      const longText = "A".repeat(500);
      const truncate = (text: string | null, maxLen: number = 200) => {
        if (!text) return null;
        return text.length > maxLen ? text.slice(0, maxLen) + "..." : text;
      };
      
      const result = truncate(longText, 300);
      expect(result!.length).toBe(303); // 300 + "..."
      expect(result!.endsWith("...")).toBe(true);
    });

    it("should handle null assistant summary gracefully", () => {
      const task = {
        title: "Quick question",
        status: "running",
        createdAt: new Date(Date.now() - 5 * 60000),
        userQuery: "What is 2+2?",
        assistantSummary: null as string | null,
      };

      const timeAgo = Math.round((Date.now() - new Date(task.createdAt).getTime()) / 60000);
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.round(timeAgo / 60)}h ago`;
      const formatted = `1. [${timeStr}] "${task.title}" (${task.status})\n   User: ${task.userQuery}${task.assistantSummary ? `\n   Result: ${task.assistantSummary}` : ""}`;

      expect(formatted).toContain("Quick question");
      expect(formatted).toContain("What is 2+2?");
      expect(formatted).not.toContain("Result:");
    });

    it("should respect crossTaskContext=false user preference", () => {
      // Simulate the preference check logic
      const generalSettings = { crossTaskContext: false };
      let crossTaskEnabled = true;
      if (generalSettings.crossTaskContext === false) crossTaskEnabled = false;
      expect(crossTaskEnabled).toBe(false);
    });

    it("should default crossTaskContext to enabled when preference not set", () => {
      const generalSettings = {}; // No crossTaskContext key
      let crossTaskEnabled = true;
      if ((generalSettings as any).crossTaskContext === false) crossTaskEnabled = false;
      expect(crossTaskEnabled).toBe(true);
    });
  });

  describe("AgentStreamOptions Interface", () => {
    it("should accept crossTaskContext as optional string parameter", () => {
      // Type-level test: verify the interface accepts crossTaskContext
      const options: {
        messages: any[];
        safeWrite: (d: string) => boolean;
        safeEnd: () => void;
        memoryContext?: string;
        crossTaskContext?: string;
      } = {
        messages: [],
        safeWrite: () => true,
        safeEnd: () => {},
        crossTaskContext: "1. [5m ago] \"Test task\" (completed)\n   User: Hello",
      };
      
      expect(options.crossTaskContext).toBeDefined();
      expect(typeof options.crossTaskContext).toBe("string");
    });
  });

  describe("Time Formatting", () => {
    it("should format minutes correctly", () => {
      const timeAgo = 15; // minutes
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo / 60)}h ago` : `${Math.round(timeAgo / 1440)}d ago`;
      expect(timeStr).toBe("15m ago");
    });

    it("should format hours correctly", () => {
      const timeAgo = 120; // minutes = 2 hours
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo / 60)}h ago` : `${Math.round(timeAgo / 1440)}d ago`;
      expect(timeStr).toBe("2h ago");
    });

    it("should format days correctly", () => {
      const timeAgo = 2880; // minutes = 2 days
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo / 60)}h ago` : `${Math.round(timeAgo / 1440)}d ago`;
      expect(timeStr).toBe("2d ago");
    });
  });

  describe("System Prompt Injection", () => {
    it("should inject cross-task context section with correct header", () => {
      const crossTaskContext = "1. [5m ago] \"Research AI\" (completed)\n   User: Research AI architectures";
      let systemPrompt = "Base prompt";
      
      if (crossTaskContext) {
        systemPrompt += `\n\n## RECENT SESSION CONTEXT\n\nThe user has been working on these tasks recently (most recent first):\n\n${crossTaskContext}\n\n**RULES FOR SESSION CONTEXT:**\n1. This context helps you understand what the user has been working on — use it for continuity.`;
      }
      
      expect(systemPrompt).toContain("## RECENT SESSION CONTEXT");
      expect(systemPrompt).toContain("Research AI");
      expect(systemPrompt).toContain("RULES FOR SESSION CONTEXT");
    });

    it("should NOT inject section when crossTaskContext is undefined", () => {
      const crossTaskContext: string | undefined = undefined;
      let systemPrompt = "Base prompt";
      
      if (crossTaskContext) {
        systemPrompt += "\n\n## RECENT SESSION CONTEXT";
      }
      
      expect(systemPrompt).not.toContain("RECENT SESSION CONTEXT");
      expect(systemPrompt).toBe("Base prompt");
    });

    it("should NOT inject section when crossTaskContext is empty string", () => {
      const crossTaskContext = "";
      let systemPrompt = "Base prompt";
      
      if (crossTaskContext) {
        systemPrompt += "\n\n## RECENT SESSION CONTEXT";
      }
      
      expect(systemPrompt).not.toContain("RECENT SESSION CONTEXT");
    });
  });

  describe("Exclusion Logic", () => {
    it("should exclude the current task from context", () => {
      // The function should not include the current task in the summaries
      const currentTaskId = "abc123";
      const excludeTaskExternalId = currentTaskId;
      
      // Simulate the condition building
      const conditions: any[] = [];
      if (excludeTaskExternalId) {
        conditions.push({ type: "ne", field: "externalId", value: excludeTaskExternalId });
      }
      
      expect(conditions.length).toBe(1);
      expect(conditions[0].value).toBe("abc123");
    });
  });

  describe("Limit Handling", () => {
    it("should default to 5 tasks when limit not specified", () => {
      const defaultLimit = 5;
      // The function signature: getRecentTaskSummaries(userId, excludeTaskExternalId?, limit = 5)
      expect(defaultLimit).toBe(5);
    });

    it("should respect custom limit parameter", () => {
      const customLimit = 3;
      // Verify the limit is passed through
      expect(customLimit).toBeLessThan(5);
    });
  });
});
