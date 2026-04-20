import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  const ratings = new Map<string, { taskExternalId: string; userId: number; rating: number; feedback: string | null; id: number; createdAt: Date; updatedAt: Date }>();

  return {
    ...actual,
    upsertTaskRating: vi.fn(async (taskExternalId: string, userId: number, rating: number, feedback?: string | null) => {
      const key = `${taskExternalId}:${userId}`;
      const existing = ratings.get(key);
      const row = {
        id: existing?.id ?? ratings.size + 1,
        taskExternalId,
        userId,
        rating,
        feedback: feedback ?? null,
        createdAt: existing?.createdAt ?? new Date(),
        updatedAt: new Date(),
      };
      ratings.set(key, row);
      return row;
    }),
    getTaskRating: vi.fn(async (taskExternalId: string) => {
      for (const [, row] of ratings) {
        if (row.taskExternalId === taskExternalId) return row;
      }
      return null;
    }),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("task.rateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new rating and returns success", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.task.rateTask({
      taskExternalId: "task-abc123",
      rating: 4,
    });

    expect(result.success).toBe(true);
    expect(result.rating).toBeDefined();
    expect(result.rating?.rating).toBe(4);
    expect(result.rating?.taskExternalId).toBe("task-abc123");
    expect(result.rating?.userId).toBe(1);
  });

  it("accepts a rating with feedback", async () => {
    const ctx = createAuthContext(2);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.task.rateTask({
      taskExternalId: "task-feedback",
      rating: 5,
      feedback: "Excellent response!",
    });

    expect(result.success).toBe(true);
    expect(result.rating?.rating).toBe(5);
    expect(result.rating?.feedback).toBe("Excellent response!");
  });

  it("validates rating must be between 1 and 5", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.task.rateTask({ taskExternalId: "task-x", rating: 0 })
    ).rejects.toThrow();

    await expect(
      caller.task.rateTask({ taskExternalId: "task-x", rating: 6 })
    ).rejects.toThrow();
  });

  it("validates rating must be an integer", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.task.rateTask({ taskExternalId: "task-x", rating: 3.5 })
    ).rejects.toThrow();
  });

  it("validates taskExternalId is required and not empty", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.task.rateTask({ taskExternalId: "", rating: 3 })
    ).rejects.toThrow();
  });

  it("upserts rating (updates existing)", async () => {
    const ctx = createAuthContext(3);
    const caller = appRouter.createCaller(ctx);

    // First rating
    const first = await caller.task.rateTask({
      taskExternalId: "task-upsert",
      rating: 3,
    });
    expect(first.rating?.rating).toBe(3);

    // Update rating
    const second = await caller.task.rateTask({
      taskExternalId: "task-upsert",
      rating: 5,
      feedback: "Changed my mind, it was great!",
    });
    expect(second.rating?.rating).toBe(5);
    expect(second.rating?.feedback).toBe("Changed my mind, it was great!");
  });
});

describe("task.getTaskRating", () => {
  it("returns null for unrated task", async () => {
    const ctx = createAuthContext(1);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.task.getTaskRating({
      taskExternalId: "task-never-rated",
    });

    expect(result).toBeNull();
  });

  it("returns existing rating after rating a task", async () => {
    const ctx = createAuthContext(4);
    const caller = appRouter.createCaller(ctx);

    await caller.task.rateTask({
      taskExternalId: "task-get-test",
      rating: 4,
      feedback: "Good work",
    });

    const result = await caller.task.getTaskRating({
      taskExternalId: "task-get-test",
    });

    expect(result).toBeDefined();
    expect(result?.rating).toBe(4);
    expect(result?.feedback).toBe("Good work");
  });
});
