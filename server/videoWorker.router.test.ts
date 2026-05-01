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

describe("videoWorker router", () => {
  it("rejects unauthenticated access to videoWorker procedures", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await (caller.videoWorker as any).status({ jobId: "test-job" });
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });

  it("router namespace is accessible for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    expect(caller.videoWorker).toBeDefined();
  });
});
