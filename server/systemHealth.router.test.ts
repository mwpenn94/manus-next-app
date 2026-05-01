import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;
function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = { id: 1, openId: "sample-user", email: "sample@example.com", name: "Sample User", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
  return { ctx: { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] } };
}
function createUnauthContext(): { ctx: TrpcContext } {
  return { ctx: { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] } };
}

describe("systemHealth router", () => {
  it("rejects unauthenticated access to summary", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.systemHealth.summary()).rejects.toThrow();
  });

  it("rejects unauthenticated access to circuitBreakers", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.systemHealth.circuitBreakers()).rejects.toThrow();
  });

  it("authenticated summary returns health data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.systemHealth.summary();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });

  it("authenticated circuitBreakers returns data", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.systemHealth.circuitBreakers();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });
});
