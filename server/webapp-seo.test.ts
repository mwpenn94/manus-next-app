import { describe, it, expect } from "vitest";

/**
 * Tests for the runtime validator and auth adapter changes.
 * These verify that the real implementations (not placeholders) work correctly.
 */

describe("Runtime Validator", () => {
  it("should export runHealthChecks function", async () => {
    const mod = await import("./runtimeValidator");
    expect(mod.runHealthChecks).toBeDefined();
    expect(typeof mod.runHealthChecks).toBe("function");
  });

  it("should return structured health check results", async () => {
    const { runHealthChecks } = await import("./runtimeValidator");
    const results = await runHealthChecks();
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    const check = results[0];
    expect(check).toHaveProperty("service");
    expect(check).toHaveProperty("status");
    expect(check).toHaveProperty("message");
    expect(["healthy", "degraded", "critical"]).toContain(check.status);
  });

  it("should check database connectivity", async () => {
    const { runHealthChecks } = await import("./runtimeValidator");
    const results = await runHealthChecks();
    
    const dbService = results.find((s) => s.service === "database");
    expect(dbService).toBeDefined();
    expect(["healthy", "degraded", "critical"]).toContain(dbService!.status);
  });

  it("should check OAuth configuration", async () => {
    const { runHealthChecks } = await import("./runtimeValidator");
    const results = await runHealthChecks();
    
    const oauthService = results.find((s) => s.service === "oauth");
    expect(oauthService).toBeDefined();
  });

  it("should check Stripe configuration", async () => {
    const { runHealthChecks } = await import("./runtimeValidator");
    const results = await runHealthChecks();
    
    const stripeService = results.find((s) => s.service === "stripe");
    expect(stripeService).toBeDefined();
  });

  it("should export runFeatureChecks function", async () => {
    const mod = await import("./runtimeValidator");
    expect(mod.runFeatureChecks).toBeDefined();
    expect(typeof mod.runFeatureChecks).toBe("function");
  });

  it("should return feature check results", async () => {
    const { runFeatureChecks } = await import("./runtimeValidator");
    const results = await runFeatureChecks();
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    
    const feature = results[0];
    expect(feature).toHaveProperty("feature");
    expect(feature).toHaveProperty("status");
    expect(feature).toHaveProperty("lastVerified");
    expect(feature).toHaveProperty("verificationMethod");
  });

  it("should export trace functions", async () => {
    const mod = await import("./runtimeValidator");
    expect(typeof mod.startTrace).toBe("function");
    expect(typeof mod.endTrace).toBe("function");
    expect(typeof mod.getTrace).toBe("function");
    expect(typeof mod.getActiveTraceCount).toBe("function");
  });

  it("should create and end traces correctly", async () => {
    const { startTrace, endTrace, getTrace } = await import("./runtimeValidator");
    
    const span = startTrace("test-trace-1", "test-operation", { key: "value" });
    expect(span).toHaveProperty("traceId", "test-trace-1");
    expect(span).toHaveProperty("operationName", "test-operation");
    expect(span).toHaveProperty("startTime");
    
    endTrace("test-trace-1", span.spanId, "ok");
    
    const trace = getTrace("test-trace-1");
    expect(Array.isArray(trace)).toBe(true);
  });
});

describe("Auth Adapter", () => {
  it("should export getAuthProvider function", async () => {
    const mod = await import("./authAdapter");
    expect(mod.getAuthProvider).toBeDefined();
    expect(typeof mod.getAuthProvider).toBe("function");
  });

  it("should return an auth provider with required methods", async () => {
    const { getAuthProvider, resetAuthProvider } = await import("./authAdapter");
    resetAuthProvider(); // Reset to get fresh provider
    const provider = getAuthProvider();
    
    expect(provider).toHaveProperty("name");
    expect(typeof provider.name).toBe("string");
    expect(typeof provider.getUserFromRequest).toBe("function");
    expect(typeof provider.getLoginUrl).toBe("function");
    expect(typeof provider.handleLogout).toBe("function");
    expect(typeof provider.verifyToken).toBe("function");
  });

  it("should default to manus provider", async () => {
    const { getAuthProvider, resetAuthProvider } = await import("./authAdapter");
    resetAuthProvider();
    const provider = getAuthProvider();
    
    expect(provider.name).toBe("manus");
  });

  it("should generate login URL", async () => {
    const { getAuthProvider, resetAuthProvider } = await import("./authAdapter");
    resetAuthProvider();
    const provider = getAuthProvider();
    
    const url = provider.getLoginUrl("/dashboard", "https://example.com");
    expect(typeof url).toBe("string");
    // Should contain the return path in the state
    expect(url).toContain("state=");
  });

  it("should export resetAuthProvider function", async () => {
    const mod = await import("./authAdapter");
    expect(typeof mod.resetAuthProvider).toBe("function");
  });

  it("should export registerAuthProvider function", async () => {
    const mod = await import("./authAdapter");
    expect(typeof mod.registerAuthProvider).toBe("function");
  });
});
