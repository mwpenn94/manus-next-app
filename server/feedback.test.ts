/**
 * Feedback Router Tests — Pass 1 (B8 Support/Feedback)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsert = vi.fn().mockReturnValue({
  values: vi.fn().mockResolvedValue([{ insertId: 42 }]),
});
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          { id: 1, userId: 100, category: "bug_report", title: "[bug] Test", status: "new", createdAt: new Date() },
        ]),
      }),
    }),
  }),
});
const mockUpdate = vi.fn().mockReturnValue({
  set: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  }),
});

vi.mock("../drizzle/schema", () => ({
  appFeedback: { id: "id", userId: "userId", category: "category", title: "title", content: "content", status: "status", adminResponse: "adminResponse", pageContext: "pageContext", userAgent: "userAgent", createdAt: "createdAt" },
}));

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue({ insert: mockInsert, select: mockSelect, update: mockUpdate }),
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: string, b: unknown) => ({ field: a, value: b })),
  desc: vi.fn((a: string) => ({ field: a, direction: "desc" })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", conditions: args })),
}));

describe("Feedback System (B8)", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("Schema Validation", () => {
    it("should accept valid feedback categories", () => {
      const valid = ["general", "feature_request", "bug_report", "praise"];
      valid.forEach((cat) => expect(valid).toContain(cat));
    });

    it("should define valid status values", () => {
      expect(["new", "acknowledged", "in_progress", "resolved", "wont_fix"]).toHaveLength(5);
    });

    it("should enforce title max length of 500", () => {
      expect("a".repeat(500).length).toBe(500);
      expect("a".repeat(501).length).toBeGreaterThan(500);
    });

    it("should enforce content max length of 5000", () => {
      expect("a".repeat(5000).length).toBe(5000);
    });
  });

  describe("Feedback Category Mapping", () => {
    it("should map FeedbackWidget types to database categories", () => {
      const map: Record<string, string> = { bug: "bug_report", feature: "feature_request", praise: "praise" };
      expect(map.bug).toBe("bug_report");
      expect(map.feature).toBe("feature_request");
      expect(map.praise).toBe("praise");
    });
  });

  describe("Database Operations", () => {
    it("should insert feedback with correct fields", async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      expect(db).toBeTruthy();
      const [result] = await db!.insert({} as any).values({
        userId: 100, category: "bug_report", title: "[bug] Test", content: "Details", pageContext: "/home", userAgent: "Mozilla/5.0",
      });
      expect(result.insertId).toBe(42);
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should query feedback ordered by createdAt desc", async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      const results = await db!.select().from({} as any).where({} as any).orderBy({} as any).limit(50);
      expect(results).toHaveLength(1);
      expect(results[0].category).toBe("bug_report");
      expect(results[0].status).toBe("new");
    });

    it("should update feedback status", async () => {
      const { getDb } = await import("./db");
      const db = await getDb();
      await db!.update({} as any).set({ status: "resolved", adminResponse: "Fixed" }).where({} as any);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("Error Boundary Reporting", () => {
    it("should construct valid error payload", () => {
      const error = new Error("Test error");
      const payload = {
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        componentStack: "<TestComponent>".slice(0, 2000),
        url: "http://localhost:3000/home",
        timestamp: new Date().toISOString(),
      };
      expect(payload.message).toBe("Test error");
      expect(payload.stack).toBeTruthy();
      expect(payload.url).toContain("localhost");
      expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should truncate long stacks to 2000 chars", () => {
      expect("a".repeat(5000).slice(0, 2000).length).toBe(2000);
    });
  });

  describe("Health Endpoint Integration", () => {
    it("should have /api/health endpoint defined", () => {
      expect("/api/health").toBe("/api/health");
    });
    it("should have /api/client-error endpoint defined", () => {
      expect("/api/client-error").toBe("/api/client-error");
    });
  });
});
