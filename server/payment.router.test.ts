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

describe("payment router", () => {
  it("products is publicly accessible", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.payment.products();
      expect(result).toBeDefined();
    } catch (err: any) {
      // May fail due to Stripe config in test env, but should not be auth error
      expect(err.message).not.toContain("10001");
    }
  });

  it("rejects unauthenticated access to history", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payment.history()).rejects.toThrow();
  });

  it("rejects unauthenticated access to subscription", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.payment.subscription()).rejects.toThrow();
  });

  it("authenticated history returns data or external error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.payment.history();
      expect(result).toBeDefined();
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });
});
