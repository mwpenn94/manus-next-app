import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-pi",
    email: "pi@example.com",
    name: "PI Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("processImprovement router", () => {
  const caller = appRouter.createCaller(createAuthContext());

  it("getMetrics returns an array", async () => {
    const metrics = await caller.processImprovement.getMetrics();
    expect(Array.isArray(metrics)).toBe(true);
  });

  it("upsertMetric creates and returns a metric", async () => {
    const result = await caller.processImprovement.upsertMetric({
      name: "Test Metric",
      category: "quality",
      currentValue: 75,
      targetValue: 90,
      unit: "%",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("getInitiatives returns an array", async () => {
    const initiatives = await caller.processImprovement.getInitiatives();
    expect(Array.isArray(initiatives)).toBe(true);
  });

  it("createInitiative creates and returns an initiative", async () => {
    const result = await caller.processImprovement.createInitiative({
      title: "Test Initiative",
      description: "A test improvement initiative",
      status: "proposed",
      impactScore: 75,
      owner: "Test Owner",
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("getCycles returns an array", async () => {
    const cycles = await caller.processImprovement.getCycles();
    expect(Array.isArray(cycles)).toBe(true);
  });

  it("createCycle creates and returns a cycle", async () => {
    const result = await caller.processImprovement.createCycle({
      cycleNumber: 1,
      phase: "assess",
      findings: ["Test finding"],
    });
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  it("deleteMetric removes a metric", async () => {
    const created = await caller.processImprovement.upsertMetric({
      name: "To Delete",
      category: "speed",
      currentValue: 50,
      targetValue: 100,
      unit: "ms",
    });
    const result = await caller.processImprovement.deleteMetric({ id: created.id });
    expect(result.success).toBe(true);
  });
});
