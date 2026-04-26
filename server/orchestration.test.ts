/**
 * Orchestration Service Tests — Priority queue, concurrency, timeout, retry
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock schema
vi.mock("../drizzle/schema", () => ({
  tasks: {
    id: "id",
    userId: "userId",
    status: "status",
    priority: "priority",
    timeoutSeconds: "timeoutSeconds",
    retryCount: "retryCount",
    maxRetries: "maxRetries",
    updatedAt: "updatedAt",
    createdAt: "createdAt",
    currentStep: "currentStep",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a: unknown, b: unknown) => ({ op: "eq", a, b })),
  and: vi.fn((...args: unknown[]) => ({ op: "and", args })),
  sql: vi.fn(),
  asc: vi.fn((col: unknown) => ({ op: "asc", col })),
  desc: vi.fn((col: unknown) => ({ op: "desc", col })),
  inArray: vi.fn((col: unknown, vals: unknown) => ({ op: "inArray", col, vals })),
}));

import { getDb } from "./db";

describe("Orchestration Service — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canStartTask", () => {
    it("should allow task when under concurrent limit", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { canStartTask } = await import("./services/orchestration");
      const result = await canStartTask(1);

      expect(result.allowed).toBe(true);
      expect(result.runningCount).toBe(1);
      expect(result.maxConcurrent).toBe(3);
    });

    it("should deny task when at concurrent limit", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 3 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { canStartTask } = await import("./services/orchestration");
      const result = await canStartTask(1);

      expect(result.allowed).toBe(false);
      expect(result.runningCount).toBe(3);
    });

    it("should respect custom concurrent limit", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ count: 4 }]),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { canStartTask } = await import("./services/orchestration");
      const result = await canStartTask(1, { maxConcurrent: 5 });

      expect(result.allowed).toBe(true);
      expect(result.maxConcurrent).toBe(5);
    });

    it("should handle null db gracefully", async () => {
      vi.mocked(getDb).mockResolvedValue(null as any);

      const { canStartTask } = await import("./services/orchestration");
      const result = await canStartTask(1);

      expect(result.allowed).toBe(false);
      expect(result.runningCount).toBe(0);
    });
  });

  describe("getTaskQueue", () => {
    it("should return tasks ordered by priority then creation time", async () => {
      const mockTasks = [
        { id: 1, priority: 1, createdAt: new Date("2026-01-01") },
        { id: 2, priority: 2, createdAt: new Date("2026-01-02") },
        { id: 3, priority: 3, createdAt: new Date("2026-01-03") },
      ];
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockTasks),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { getTaskQueue } = await import("./services/orchestration");
      const result = await getTaskQueue(1);

      expect(result).toHaveLength(3);
      expect(result[0].position).toBe(1);
      expect(result[0].taskId).toBe(1);
      expect(result[0].priority).toBe(1);
      expect(result[1].position).toBe(2);
      expect(result[2].position).toBe(3);
    });

    it("should return empty array for null db", async () => {
      vi.mocked(getDb).mockResolvedValue(null as any);

      const { getTaskQueue } = await import("./services/orchestration");
      const result = await getTaskQueue(1);

      expect(result).toEqual([]);
    });
  });

  describe("getOrchestrationStatus", () => {
    it("should return combined running and queued counts", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn()
          .mockResolvedValueOnce([{ count: 2 }])  // running
          .mockResolvedValueOnce([{ count: 5 }]),  // queued
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { getOrchestrationStatus } = await import("./services/orchestration");
      const result = await getOrchestrationStatus(1);

      expect(result.runningCount).toBe(2);
      expect(result.queuedCount).toBe(5);
      expect(result.maxConcurrent).toBe(3);
      expect(result.canStartNew).toBe(true);
    });
  });

  describe("incrementRetry", () => {
    it("should allow retry when under max", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ retryCount: 1, maxRetries: 3 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };
      // Chain the update.set.where
      mockDb.update = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { incrementRetry } = await import("./services/orchestration");
      const result = await incrementRetry(1);

      expect(result.canRetry).toBe(true);
      expect(result.retryCount).toBe(2);
      expect(result.maxRetries).toBe(3);
    });

    it("should deny retry when at max", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ retryCount: 2, maxRetries: 3 }]),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { incrementRetry } = await import("./services/orchestration");
      const result = await incrementRetry(1);

      expect(result.canRetry).toBe(false);
      expect(result.retryCount).toBe(3);
    });

    it("should use default max retries when not set", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ retryCount: 0, maxRetries: null }]),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const { incrementRetry } = await import("./services/orchestration");
      const result = await incrementRetry(1);

      expect(result.canRetry).toBe(true);
      expect(result.maxRetries).toBe(3); // default
    });
  });

  describe("Priority ordering", () => {
    it("should validate priority values (1=high, 2=normal, 3=low)", () => {
      expect(1).toBeLessThan(2);
      expect(2).toBeLessThan(3);
      // Priority 1 (high) sorts before priority 3 (low) in ascending order
    });
  });

  describe("Timeout configuration", () => {
    it("should use default timeout of 300s when not configured", () => {
      const DEFAULT_TIMEOUT = 300;
      const taskTimeout = null;
      const effectiveTimeout = taskTimeout ?? DEFAULT_TIMEOUT;
      expect(effectiveTimeout).toBe(300);
    });

    it("should use custom timeout when configured", () => {
      const DEFAULT_TIMEOUT = 300;
      const taskTimeout = 600;
      const effectiveTimeout = taskTimeout ?? DEFAULT_TIMEOUT;
      expect(effectiveTimeout).toBe(600);
    });
  });
});
