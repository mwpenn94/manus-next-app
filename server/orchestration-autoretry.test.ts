/**
 * Tests for orchestration auto-retry and backoff logic (Pass 5 — D8)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateBackoffMs,
  autoRetryFailedTasks,
} from "./services/orchestration";

describe("calculateBackoffMs", () => {
  it("returns base delay (~5s) for retry 0", () => {
    const delay = calculateBackoffMs(0);
    // 5000 * 2^0 = 5000 + up to 10% jitter
    expect(delay).toBeGreaterThanOrEqual(5000);
    expect(delay).toBeLessThanOrEqual(5500);
  });

  it("returns ~10s for retry 1", () => {
    const delay = calculateBackoffMs(1);
    // 5000 * 2^1 = 10000 + up to 10% jitter
    expect(delay).toBeGreaterThanOrEqual(10000);
    expect(delay).toBeLessThanOrEqual(11000);
  });

  it("returns ~20s for retry 2", () => {
    const delay = calculateBackoffMs(2);
    expect(delay).toBeGreaterThanOrEqual(20000);
    expect(delay).toBeLessThanOrEqual(22000);
  });

  it("caps at 300s (5 min) for high retry counts", () => {
    const delay = calculateBackoffMs(10);
    // 5000 * 2^10 = 5,120,000 → capped at 300,000 + jitter
    expect(delay).toBeLessThanOrEqual(330000);
    expect(delay).toBeGreaterThanOrEqual(300000);
  });

  it("includes jitter (non-deterministic)", () => {
    const delays = Array.from({ length: 20 }, () => calculateBackoffMs(3));
    const unique = new Set(delays);
    // With jitter, we should get at least some variation
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe("autoRetryFailedTasks", () => {
  it("is a function", () => {
    expect(typeof autoRetryFailedTasks).toBe("function");
  });

  it("returns 0 when DB is unavailable", async () => {
    // autoRetryFailedTasks calls getDb() which returns null in test env
    const result = await autoRetryFailedTasks();
    expect(result).toBe(0);
  });
});
