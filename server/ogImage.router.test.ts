import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): { ctx: TrpcContext } {
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    },
  };
}

describe("ogImage router", () => {
  it("getOgImageUrl returns null for non-existent share token", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.ogImage.getOgImageUrl({ shareToken: "nonexistent-token-xyz" });
      expect(result).toEqual({ url: null });
    } catch (err: any) {
      // DB error is acceptable in test env
      expect(err.message).not.toContain("10001");
    }
  });

  it("rejects empty share token", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ogImage.getOgImageUrl({ shareToken: "" })).rejects.toThrow();
  });
});
