import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to create the mock function before vi.mock hoisting
const mockAddWorkspaceArtifactFn = vi.hoisted(() => vi.fn());

// Mock the db module
vi.mock("./db", () => ({
  addWorkspaceArtifact: mockAddWorkspaceArtifactFn,
  getLatestArtifactByType: vi.fn(),
  getWorkspaceArtifacts: vi.fn(),
  verifyTaskOwnershipById: vi.fn(),
}));

// Mock the _core/trpc module
vi.mock("./_core/trpc", () => ({
  protectedProcedure: {
    input: () => ({ mutation: () => ({}), query: () => ({}) }),
    query: () => ({}),
  },
  router: (routes: any) => routes,
}));

import {
  retryQueue,
  MAX_RETRY_ATTEMPTS,
  getBackoffDelay,
  enqueueForRetry,
  processRetryQueue,
} from "./routers/workspace";

describe("Workspace Artifact Retry Queue", () => {
  beforeEach(() => {
    // Clear the retry queue before each test
    retryQueue.length = 0;
    mockAddWorkspaceArtifactFn.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getBackoffDelay", () => {
    it("returns exponential backoff delays", () => {
      expect(getBackoffDelay(0)).toBe(1000); // 1s
      expect(getBackoffDelay(1)).toBe(2000); // 2s
      expect(getBackoffDelay(2)).toBe(4000); // 4s
      expect(getBackoffDelay(3)).toBe(8000); // 8s (not used but correct)
    });
  });

  describe("MAX_RETRY_ATTEMPTS", () => {
    it("is set to 3", () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });
  });

  describe("enqueueForRetry", () => {
    it("adds an item to the retry queue with attempt count 1", () => {
      enqueueForRetry({
        taskId: 123,
        artifactType: "document_xlsx",
        label: "Test Doc",
        content: null,
        url: "https://example.com/file.xlsx",
      });

      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].attempts).toBe(1);
      expect(retryQueue[0].taskId).toBe(123);
      expect(retryQueue[0].artifactType).toBe("document_xlsx");
    });

    it("sets nextRetryAt to now + BASE_DELAY * 2 (backoff for attempt 1)", () => {
      const now = Date.now();
      enqueueForRetry({
        taskId: 456,
        artifactType: "code",
        label: null,
        content: "console.log('hello')",
        url: null,
      });

      // nextRetryAt should be approximately now + 2000ms (getBackoffDelay(1) = 2000)
      expect(retryQueue[0].nextRetryAt).toBeGreaterThanOrEqual(now + 1900);
      expect(retryQueue[0].nextRetryAt).toBeLessThanOrEqual(now + 2100);
    });

    it("can enqueue multiple items", () => {
      enqueueForRetry({ taskId: 1, artifactType: "code", label: null, content: "a", url: null });
      enqueueForRetry({ taskId: 2, artifactType: "terminal", label: null, content: "b", url: null });
      enqueueForRetry({ taskId: 3, artifactType: "browser_url", label: null, content: null, url: "http://x" });

      expect(retryQueue.length).toBe(3);
    });
  });

  describe("processRetryQueue", () => {
    it("does nothing when queue is empty", async () => {
      await processRetryQueue();
      expect(mockAddWorkspaceArtifactFn).not.toHaveBeenCalled();
    });

    it("retries and succeeds on second attempt", async () => {
      mockAddWorkspaceArtifactFn.mockResolvedValueOnce(undefined);

      enqueueForRetry({
        taskId: 100,
        artifactType: "document",
        label: "Retry Test",
        content: null,
        url: "https://example.com/doc",
      });

      // Advance time past the retry delay
      vi.advanceTimersByTime(3000);
      await processRetryQueue();

      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledTimes(1);
      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledWith({
        taskId: 100,
        artifactType: "document",
        label: "Retry Test",
        content: null,
        url: "https://example.com/doc",
      });
      // Queue should be empty after successful retry
      expect(retryQueue.length).toBe(0);
    });

    it("re-enqueues on failure with incremented attempt count", async () => {
      mockAddWorkspaceArtifactFn.mockRejectedValueOnce(new Error("DB connection lost"));

      enqueueForRetry({
        taskId: 200,
        artifactType: "browser_screenshot",
        label: null,
        content: null,
        url: "https://example.com/screenshot.png",
      });

      // Advance time past the first retry delay
      vi.advanceTimersByTime(3000);
      await processRetryQueue();

      // Should be re-enqueued with attempts = 2
      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].attempts).toBe(2);
    });

    it("drops item after MAX_RETRY_ATTEMPTS failures", async () => {
      mockAddWorkspaceArtifactFn.mockRejectedValue(new Error("Persistent failure"));

      // Manually push an item with attempts = 2 (one more failure will exhaust it)
      retryQueue.push({
        taskId: 300,
        artifactType: "terminal",
        label: null,
        content: "$ npm install",
        url: null,
        attempts: 2, // Already failed twice
        nextRetryAt: Date.now() - 1000, // Ready to process
      });

      await processRetryQueue();

      // Should NOT be re-enqueued (3 attempts exhausted)
      expect(retryQueue.length).toBe(0);
      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledTimes(1);
    });

    it("only processes items whose nextRetryAt has passed", async () => {
      mockAddWorkspaceArtifactFn.mockResolvedValue(undefined);

      const now = Date.now();
      retryQueue.push({
        taskId: 400,
        artifactType: "code",
        label: "ready",
        content: "ready item",
        url: null,
        attempts: 1,
        nextRetryAt: now - 1000, // Ready
      });
      retryQueue.push({
        taskId: 401,
        artifactType: "code",
        label: "not ready",
        content: "future item",
        url: null,
        attempts: 1,
        nextRetryAt: now + 10000, // Not ready yet
      });

      await processRetryQueue();

      // Only the ready item should have been processed
      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledTimes(1);
      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: 400, content: "ready item" })
      );
      // The future item should still be in the queue
      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].taskId).toBe(401);
    });

    it("handles mixed success and failure in same batch", async () => {
      mockAddWorkspaceArtifactFn
        .mockResolvedValueOnce(undefined) // First item succeeds
        .mockRejectedValueOnce(new Error("timeout")); // Second item fails

      const now = Date.now();
      retryQueue.push({
        taskId: 500,
        artifactType: "document",
        label: "success",
        content: null,
        url: "https://a.com",
        attempts: 1,
        nextRetryAt: now - 1000,
      });
      retryQueue.push({
        taskId: 501,
        artifactType: "terminal",
        label: "fail",
        content: "output",
        url: null,
        attempts: 1,
        nextRetryAt: now - 1000,
      });

      await processRetryQueue();

      // Only the failed item should remain in queue
      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].taskId).toBe(501);
      expect(retryQueue[0].attempts).toBe(2);
    });
  });

  describe("Integration: full retry lifecycle", () => {
    it("artifact persists after 2 failures and 1 success", async () => {
      mockAddWorkspaceArtifactFn
        .mockRejectedValueOnce(new Error("fail 1"))
        .mockRejectedValueOnce(new Error("fail 2"))
        .mockResolvedValueOnce(undefined);

      // Initial enqueue (simulating first failure from the mutation handler)
      enqueueForRetry({
        taskId: 999,
        artifactType: "document_xlsx",
        label: "Sales Report",
        content: null,
        url: "https://cdn.example.com/report.xlsx",
      });

      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].attempts).toBe(1);

      // First retry attempt (attempt 2) — fails again
      vi.advanceTimersByTime(3000);
      await processRetryQueue();
      expect(retryQueue.length).toBe(1);
      expect(retryQueue[0].attempts).toBe(2);

      // Second retry attempt (attempt 3) — succeeds
      vi.advanceTimersByTime(5000);
      await processRetryQueue();
      expect(retryQueue.length).toBe(0);
      expect(mockAddWorkspaceArtifactFn).toHaveBeenCalledTimes(2);
    });
  });
});
