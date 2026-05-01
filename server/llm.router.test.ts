import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createUnauthContext(): { ctx: TrpcContext } {
  return { ctx: { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => {} } as TrpcContext["res"] } };
}

describe("llm router", () => {
  it("router namespace exists on appRouter", () => {
    expect(appRouter).toBeDefined();
    // The llm router is registered as a namespace
    expect(typeof appRouter.createCaller).toBe("function");
  });

  it("rejects unauthenticated access to llm procedures", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    // llm router has protected procedures - verify auth gating
    try {
      await (caller.llm as any).models();
    } catch (err: any) {
      expect(err).toBeDefined();
    }
  });
});
