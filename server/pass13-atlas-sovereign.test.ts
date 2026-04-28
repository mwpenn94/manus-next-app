/**
 * Pass 13 — ATLAS & Sovereign Layer Tests
 *
 * Tests the tRPC router definitions, input validation, and auth guards
 * for the atlas and sovereign routers. Does NOT call LLM or DB —
 * validates procedure shapes, input schemas, and auth requirements.
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ──

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 42,
      openId: "test-user-42",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ── ATLAS Router Tests ──

describe("ATLAS Router", () => {
  describe("Router structure", () => {
    it("should have atlas namespace on appRouter", () => {
      expect(appRouter._def.procedures).toHaveProperty("atlas.decompose");
      expect(appRouter._def.procedures).toHaveProperty("atlas.execute");
      expect(appRouter._def.procedures).toHaveProperty("atlas.getGoal");
      expect(appRouter._def.procedures).toHaveProperty("atlas.listGoals");
    });

    it("should expose exactly 4 atlas procedures", () => {
      const atlasKeys = Object.keys(appRouter._def.procedures).filter(k => k.startsWith("atlas."));
      expect(atlasKeys).toHaveLength(4);
      expect(atlasKeys.sort()).toEqual([
        "atlas.decompose",
        "atlas.execute",
        "atlas.getGoal",
        "atlas.listGoals",
      ]);
    });
  });

  describe("Auth guards", () => {
    it("decompose should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.atlas.decompose({ description: "Test goal" })
      ).rejects.toThrow();
    });

    it("execute should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.atlas.execute({ goalId: 1 })
      ).rejects.toThrow();
    });

    it("getGoal should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.atlas.getGoal({ externalId: "test-id" })
      ).rejects.toThrow();
    });

    it("listGoals should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.atlas.listGoals()
      ).rejects.toThrow();
    });
  });

  describe("Input validation", () => {
    it("decompose should reject empty description", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.atlas.decompose({ description: "" })
      ).rejects.toThrow();
    });

    it("decompose should reject description over 10000 chars", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.atlas.decompose({ description: "x".repeat(10001) })
      ).rejects.toThrow();
    });

    it("decompose should reject invalid priority", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.atlas.decompose({ description: "Test", priority: "invalid" as any })
      ).rejects.toThrow();
    });

    it("decompose should accept valid priority values", async () => {
      const validPriorities = ["low", "medium", "high", "critical"];
      for (const p of validPriorities) {
        const caller = appRouter.createCaller(createAuthContext());
        try {
          await caller.atlas.decompose({ description: "Test", priority: p as any });
        } catch (e: any) {
          // Should NOT be a ZodError (input validation error)
          expect(e.code).not.toBe("BAD_REQUEST");
        }
      }
    });

    it("getGoal should reject missing externalId", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        // @ts-expect-error — testing missing required field
        caller.atlas.getGoal({})
      ).rejects.toThrow();
    });
  });
});

// ── Sovereign Router Tests ──

describe("Sovereign Router", () => {
  describe("Router structure", () => {
    it("should have sovereign namespace on appRouter", () => {
      expect(appRouter._def.procedures).toHaveProperty("sovereign.route");
      expect(appRouter._def.procedures).toHaveProperty("sovereign.stats");
      expect(appRouter._def.procedures).toHaveProperty("sovereign.circuitStatus");
      expect(appRouter._def.procedures).toHaveProperty("sovereign.providers");
      expect(appRouter._def.procedures).toHaveProperty("sovereign.seedProviders");
      expect(appRouter._def.procedures).toHaveProperty("sovereign.providerUsage");
    });

    it("should expose exactly 7 sovereign procedures", () => {
      const sovereignKeys = Object.keys(appRouter._def.procedures).filter(k => k.startsWith("sovereign."));
      expect(sovereignKeys).toHaveLength(7);
      expect(sovereignKeys.sort()).toEqual([
        "sovereign.circuitStatus",
        "sovereign.providerUsage",
        "sovereign.providers",
        "sovereign.recentDecisions",
        "sovereign.route",
        "sovereign.seedProviders",
        "sovereign.stats",
      ]);
    });
  });

  describe("Auth guards", () => {
    it("route should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.sovereign.route({
          messages: [{ role: "user", content: "Hello" }],
        })
      ).rejects.toThrow();
    });

    it("stats should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.sovereign.stats()).rejects.toThrow();
    });

    it("circuitStatus should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.sovereign.circuitStatus()).rejects.toThrow();
    });

    it("providers should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.sovereign.providers()).rejects.toThrow();
    });

    it("seedProviders should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(caller.sovereign.seedProviders()).rejects.toThrow();
    });

    it("providerUsage should reject unauthenticated calls", async () => {
      const caller = appRouter.createCaller(createUnauthContext());
      await expect(
        caller.sovereign.providerUsage({ providerId: 1, days: 7 })
      ).rejects.toThrow();
    });
  });

  describe("Input validation", () => {
    it("route should reject messages with invalid role type", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.sovereign.route({
          // @ts-expect-error — testing invalid input
          messages: [{ role: 123, content: "Hello" }],
        })
      ).rejects.toThrow();
    });

    it("route should reject messages with missing content", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.sovereign.route({
          // @ts-expect-error — testing missing required field
          messages: [{ role: "user" }],
        })
      ).rejects.toThrow();
    });

    it("providerUsage should reject days < 1", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.sovereign.providerUsage({ providerId: 1, days: 0 })
      ).rejects.toThrow();
    });

    it("providerUsage should reject days > 365", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      await expect(
        caller.sovereign.providerUsage({ providerId: 1, days: 366 })
      ).rejects.toThrow();
    });

    it("providerUsage should accept valid days range", async () => {
      const caller = appRouter.createCaller(createAuthContext());
      try {
        await caller.sovereign.providerUsage({ providerId: 1, days: 30 });
      } catch (e: any) {
        // Should fail in execution (no DB), not input validation
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });
  });
});

// ── Cross-Layer Integration Shape Tests ──

describe("Layer Integration", () => {
  it("all 4 layer routers should be present on appRouter", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    const hasAegis = procedures.some(p => p.startsWith("aegis."));
    const hasAtlas = procedures.some(p => p.startsWith("atlas."));
    const hasSovereign = procedures.some(p => p.startsWith("sovereign."));
    const hasAuth = procedures.some(p => p.startsWith("auth."));
    expect(hasAegis).toBe(true);
    expect(hasAtlas).toBe(true);
    expect(hasSovereign).toBe(true);
    expect(hasAuth).toBe(true);
  });

  it("aegis router should have classify and checkCache procedures", () => {
    expect(appRouter._def.procedures).toHaveProperty("aegis.classify");
    expect(appRouter._def.procedures).toHaveProperty("aegis.checkCache");
  });

  it("all protected procedures should reject null user context", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    const protectedCalls = [
      () => caller.atlas.decompose({ description: "test" }),
      () => caller.atlas.listGoals(),
      () => caller.sovereign.stats(),
      () => caller.sovereign.providers(),
      () => caller.aegis.classify({ prompt: "test" }),
    ];
    for (const call of protectedCalls) {
      await expect(call()).rejects.toThrow();
    }
  });
});
