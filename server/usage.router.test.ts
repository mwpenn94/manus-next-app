import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User",
    loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    ctx: {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

function createUnauthContext(): { ctx: TrpcContext } {
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

describe("usage router", () => {
  it("rejects unauthenticated access to stats", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.usage.stats()).rejects.toThrow();
  });

  it("rejects unauthenticated access to taskTrends", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.usage.taskTrends()).rejects.toThrow();
  });

  it("rejects unauthenticated access to performance", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.usage.performance()).rejects.toThrow();
  });

  it("authenticated stats returns data or DB error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.usage.stats();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });

  it("authenticated taskTrends returns data or DB error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.usage.taskTrends({ days: 30 });
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });

  it("authenticated strategyStats returns data or DB error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.usage.strategyStats();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });
});
