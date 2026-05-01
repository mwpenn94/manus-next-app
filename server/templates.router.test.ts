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

describe("templates router", () => {
  it("rejects unauthenticated access to list", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.templates.list()).rejects.toThrow();
  });

  it("rejects unauthenticated access to create", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.templates.create({ title: "Test", prompt: "Test prompt" })).rejects.toThrow();
  });

  it("authenticated list returns data or DB error", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.templates.list();
      expect(Array.isArray(result)).toBe(true);
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });

  it("authenticated create attempts DB insert", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    try {
      await caller.templates.create({ title: "Test Template", prompt: "Test prompt content" });
    } catch (err: any) {
      expect(err.message).not.toContain("10001");
    }
  });

  it("rejects unauthenticated access to delete", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.templates.delete({ id: 1 })).rejects.toThrow();
  });
});
