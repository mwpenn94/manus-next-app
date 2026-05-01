import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
  return { ctx };
}

describe("slidesRouter", () => {
  it("should exist and have the expected shape", () => {
    expect(appRouter.slides).toBeDefined();
  });

  describe("getSlides procedure", () => {
    it("should throw an error for unauthenticated calls", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.slides.getSlides()).rejects.toThrow();
    });

    it("should not throw an auth error for authenticated calls", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.slides.getSlides();
      } catch (error) {
        expect(error).not.toHaveProperty("code", "UNAUTHORIZED");
      }
    });
  });

  describe("createSlide procedure", () => {
    it("should throw an error for unauthenticated calls", async () => {
      const { ctx } = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.slides.createSlide({ title: "New Slide" })).rejects.toThrow();
    });

    it("should not throw an auth error for authenticated calls", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.slides.createSlide({ title: "New Slide" });
      } catch (error) {
        expect(error).not.toHaveProperty("code", "UNAUTHORIZED");
      }
    });
  });
});
