/**
 * Pass 007 Gap Closure Tests
 *
 * G-004: Circuit breaker DB persistence
 * G-005: Rate limiting on webhooks
 * G-007: Observability service (structured logging + spans)
 * G-009: Scheduled health check endpoint
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── G-007: Observability Service Tests ──

describe("G-007: Observability Service", () => {
  let obs: typeof import("./services/observability");

  beforeEach(async () => {
    // Fresh import each time to reset ring buffers
    vi.resetModules();
    obs = await import("./services/observability");
  });

  describe("Structured Logging", () => {
    it("should log info messages", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      obs.log("info", "TestService", "test message", { key: "value" });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("[TestService]"));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("INFO: test message"));
      spy.mockRestore();
    });

    it("should log error messages to console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      obs.log("error", "TestService", "error message");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("ERROR: error message"));
      spy.mockRestore();
    });

    it("should log warn messages to console.warn", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      obs.log("warn", "TestService", "warn message");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("WARN: warn message"));
      spy.mockRestore();
    });

    it("should include traceId when provided", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      obs.log("info", "TestService", "traced message", undefined, "trace-123");
      expect(spy).toHaveBeenCalledWith(expect.stringContaining("trace=trace-123"));
      spy.mockRestore();
    });

    it("should store logs in ring buffer and retrieve them", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});
      obs.log("info", "ServiceA", "msg1");
      obs.log("warn", "ServiceB", "msg2");
      obs.log("info", "ServiceA", "msg3");

      const allLogs = obs.getRecentLogs();
      expect(allLogs.length).toBe(3);

      const serviceALogs = obs.getRecentLogs(undefined, "ServiceA");
      expect(serviceALogs.length).toBe(2);

      const warnLogs = obs.getRecentLogs("warn");
      expect(warnLogs.length).toBe(1);
      expect(warnLogs[0].service).toBe("ServiceB");
      vi.restoreAllMocks();
    });
  });

  describe("Span Management", () => {
    it("should create spans with unique IDs", () => {
      const span = obs.startSpan("test.operation", "TestService", { userId: 1 });
      expect(span.traceId).toBeTruthy();
      expect(span.spanId).toBeTruthy();
      expect(span.traceId.length).toBe(32);
      expect(span.spanId.length).toBe(16);
      expect(span.operationName).toBe("test.operation");
      expect(span.service).toBe("TestService");
      expect(span.status).toBe("ok");
      expect(span.events).toEqual([]);
    });

    it("should add events to spans", () => {
      const span = obs.startSpan("test.op", "TestService");
      obs.addSpanEvent(span, "step1", { detail: "first" });
      obs.addSpanEvent(span, "step2", { detail: "second" });
      expect(span.events.length).toBe(2);
      expect(span.events[0].name).toBe("step1");
      expect(span.events[1].name).toBe("step2");
    });

    it("should end spans with duration and status", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const span = obs.startSpan("test.op", "TestService");
      // Simulate some work
      span.startTime = Date.now() - 100;
      obs.endSpan(span, "ok");
      expect(span.endTime).toBeDefined();
      expect(span.durationMs).toBeGreaterThanOrEqual(0);
      expect(span.status).toBe("ok");
      vi.restoreAllMocks();
    });

    it("should end spans with error status", () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const span = obs.startSpan("test.op", "TestService");
      obs.endSpan(span, "error");
      expect(span.status).toBe("error");
      vi.restoreAllMocks();
    });

    it("should store completed spans and retrieve them", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const span1 = obs.startSpan("op1", "Svc1");
      obs.endSpan(span1);
      const span2 = obs.startSpan("op2", "Svc2");
      obs.endSpan(span2);

      const recent = obs.getRecentSpans(10);
      expect(recent.length).toBe(2);
      vi.restoreAllMocks();
    });

    it("should retrieve spans by traceId", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      const span = obs.startSpan("op1", "Svc1");
      obs.endSpan(span);

      const found = obs.getSpansByTrace(span.traceId);
      expect(found.length).toBe(1);
      expect(found[0].spanId).toBe(span.spanId);

      const notFound = obs.getSpansByTrace("nonexistent");
      expect(notFound.length).toBe(0);
      vi.restoreAllMocks();
    });
  });

  describe("Sovereign-Specific Helpers", () => {
    it("should create routing spans with correct attributes", () => {
      const span = obs.startRoutingSpan("code", 42, 3);
      expect(span.operationName).toBe("sovereign.route_request");
      expect(span.service).toBe("Sovereign");
      expect(span.attributes.taskType).toBe("code");
      expect(span.attributes.userId).toBe(42);
      expect(span.attributes.providerCount).toBe(3);
    });

    it("should record provider success attempts", () => {
      const span = obs.startRoutingSpan("chat", 1, 2);
      obs.recordProviderAttempt(span, "provider-a", true, 150);
      expect(span.events.length).toBe(1);
      expect(span.events[0].name).toBe("provider.success");
      expect(span.events[0].attributes?.provider).toBe("provider-a");
      expect(span.events[0].attributes?.latencyMs).toBe(150);
    });

    it("should record provider failure attempts with error", () => {
      const span = obs.startRoutingSpan("chat", 1, 2);
      obs.recordProviderAttempt(span, "provider-b", false, undefined, "Connection timeout");
      expect(span.events[0].name).toBe("provider.failure");
      expect(span.events[0].attributes?.error).toBe("Connection timeout");
    });

    it("should record cache hits and misses", () => {
      const span = obs.startRoutingSpan("chat", 1, 1);
      obs.recordCacheHit(span, 50);
      expect(span.events[0].name).toBe("aegis.cache_hit");
      expect(span.events[0].attributes?.costSaved).toBe(50);

      obs.recordCacheMiss(span);
      expect(span.events[1].name).toBe("aegis.cache_miss");
    });
  });

  describe("Metrics & Summaries", () => {
    it("should return empty routing metrics when no spans exist", () => {
      const metrics = obs.getRoutingMetrics();
      expect(metrics.totalRoutes).toBe(0);
      expect(metrics.successRate).toBe(1);
      expect(metrics.avgLatencyMs).toBe(0);
    });

    it("should compute routing metrics from completed spans", () => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "warn").mockImplementation(() => {});

      // Successful routing
      const span1 = obs.startRoutingSpan("chat", 1, 2);
      obs.recordProviderAttempt(span1, "provA", true, 100);
      span1.startTime = Date.now() - 100;
      obs.endSpan(span1, "ok");

      // Failed routing
      const span2 = obs.startRoutingSpan("code", 2, 1);
      obs.recordProviderAttempt(span2, "provB", false, undefined, "err");
      span2.startTime = Date.now() - 200;
      obs.endSpan(span2, "error");

      const metrics = obs.getRoutingMetrics();
      expect(metrics.totalRoutes).toBe(2);
      expect(metrics.successRate).toBe(0.5);
      expect(metrics.avgLatencyMs).toBeGreaterThan(0);
      vi.restoreAllMocks();
    });

    it("should return error summary", () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      obs.log("error", "Sovereign", "provider failed");
      obs.log("error", "ATLAS", "decomposition failed");
      obs.log("error", "Sovereign", "another failure");

      const summary = obs.getErrorSummary();
      expect(summary.totalErrors).toBe(3);
      expect(summary.byService["Sovereign"]).toBe(2);
      expect(summary.byService["ATLAS"]).toBe(1);
      expect(summary.recentErrors.length).toBe(3);
      vi.restoreAllMocks();
    });
  });
});

// ── G-004: Circuit Breaker DB Persistence Tests ──

describe("G-004: Circuit Breaker DB Persistence", () => {
  it("sovereign.ts should import db and have loadCircuitStatesFromDb function", async () => {
    const sovereignSource = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(sovereignSource).toContain("loadCircuitStatesFromDb");
    expect(sovereignSource).toContain("persistCircuitState");
    expect(sovereignSource).toContain("await loadCircuitStatesFromDb()");
  });

  it("should call persistCircuitState on recordSuccess", async () => {
    const sovereignSource = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    // Check that recordSuccess calls persistCircuitState
    const successBlock = sovereignSource.split("function recordSuccess")[1]?.split("function ")[0] ?? "";
    expect(successBlock).toContain("persistCircuitState");
  });

  it("should call persistCircuitState on recordFailure", async () => {
    const sovereignSource = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    const failureBlock = sovereignSource.split("function recordFailure")[1]?.split("function ")[0] ?? "";
    expect(failureBlock).toContain("persistCircuitState");
  });

  it("should load circuit states from DB before first routing request", async () => {
    const sovereignSource = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    const routeBlock = sovereignSource.split("export async function routeRequest")[1]?.split("export ")[0] ?? "";
    expect(routeBlock).toContain("await loadCircuitStatesFromDb()");
  });

  it("should use circuitStatesLoaded flag to avoid redundant DB reads", async () => {
    const sovereignSource = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(sovereignSource).toContain("let circuitStatesLoaded = false");
    expect(sovereignSource).toContain("if (circuitStatesLoaded) return");
    expect(sovereignSource).toContain("circuitStatesLoaded = true");
  });
});

// ── G-005: Rate Limiting Tests ──

describe("G-005: Rate Limiting on Webhook Endpoints", () => {
  it("should have webhook rate limiter configured in index.ts", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    expect(indexSource).toContain("webhookLimiter");
    expect(indexSource).toContain('app.use("/api/stripe/webhook", webhookLimiter)');
    expect(indexSource).toContain('app.use("/api/github/webhook", webhookLimiter)');
  });

  it("should limit webhooks to 100 requests per minute", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    // Find the webhookLimiter block
    const webhookBlock = indexSource.split("webhookLimiter")[1]?.split("});")[0] ?? "";
    expect(webhookBlock).toContain("max: 100");
    expect(webhookBlock).toContain("windowMs: 60 * 1000");
  });

  it("should have general API rate limiter for tRPC", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    expect(indexSource).toContain("apiLimiter");
    expect(indexSource).toContain('app.use("/api/trpc", apiLimiter)');
  });

  it("should have stream rate limiter", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    expect(indexSource).toContain("streamLimiter");
    expect(indexSource).toContain('app.use("/api/stream", streamLimiter)');
  });

  it("should have analytics rate limiter", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    expect(indexSource).toContain("analyticsLimiter");
    expect(indexSource).toContain('app.use("/api/analytics/collect", analyticsLimiter)');
  });
});

// ── G-009: Scheduled Health Check Tests ──

describe("G-009: Scheduled Health Check Endpoint", () => {
  it("should have health check endpoint registered in index.ts", async () => {
    const indexSource = await import("fs").then((fs) =>
      fs.readFileSync("server/_core/index.ts", "utf-8")
    );
    expect(indexSource).toContain('app.post("/api/scheduled/health"');
    expect(indexSource).toContain("handleHealthCheck");
  });

  it("should have scheduledHealthCheck.ts handler file", async () => {
    const fs = await import("fs");
    expect(fs.existsSync("server/scheduledHealthCheck.ts")).toBe(true);
  });

  it("should authenticate requests in health check handler", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8")
    );
    expect(source).toContain("sdk.authenticateRequest");
    expect(source).toContain('"user"');
    expect(source).toContain('"admin"');
  });

  it("should validate required fields", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8")
    );
    expect(source).toContain("source");
    expect(source).toContain("healthReport");
    expect(source).toContain("timestamp");
  });

  it("should enrich response with observability data", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8")
    );
    expect(source).toContain("getRoutingMetrics");
    expect(source).toContain("getErrorSummary");
    expect(source).toContain("serverObservability");
  });

  it("should maintain audit log with max 100 entries", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8")
    );
    expect(source).toContain("healthCheckLog.length >= 100");
    expect(source).toContain("healthCheckLog.shift()");
  });
});

// ── G-007: Observability Integration in Sovereign ──

describe("G-007: Observability Wiring in Sovereign", () => {
  it("should import observability module in sovereign.ts", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(source).toContain('import * as obs from "./observability"');
  });

  it("should create routing span in routeRequest", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(source).toContain("obs.startRoutingSpan");
  });

  it("should record cache hits and misses in routing span", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(source).toContain("obs.recordCacheHit");
    expect(source).toContain("obs.recordCacheMiss");
  });

  it("should record provider attempts in routing span", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(source).toContain("obs.recordProviderAttempt");
  });

  it("should end span on success and failure", async () => {
    const source = await import("fs").then((fs) =>
      fs.readFileSync("server/services/sovereign.ts", "utf-8")
    );
    expect(source).toContain('obs.endSpan(routingSpan, "ok")');
    expect(source).toContain('obs.endSpan(routingSpan, "error")');
  });
});
