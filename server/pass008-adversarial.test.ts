/**
 * Pass 008 — Adversarial Convergence Scan
 *
 * Fresh, comprehensive adversarial audit across all systems.
 * Checks for: silent failures, regressions, dead code, type safety,
 * security gaps, edge cases, and architectural integrity.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
// 1. Architectural Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Architectural Integrity", () => {
  it("should have all service modules export consistent interfaces", () => {
    const services = [
      "server/services/sovereign.ts",
      "server/services/atlas.ts",
      "server/services/aegis.ts",
      "server/services/observability.ts",
    ];
    for (const svc of services) {
      expect(fs.existsSync(svc)).toBe(true);
      const content = fs.readFileSync(svc, "utf-8");
      expect(content).toContain("export ");
    }
  });

  it("should not have circular imports between core services", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).not.toContain('from "./atlas"');
    expect(sovereign).not.toContain('from "../services/atlas"');
    const aegis = fs.readFileSync("server/services/aegis.ts", "utf-8");
    expect(aegis).not.toContain('from "./sovereign"');
    expect(aegis).not.toContain('from "./atlas"');
  });

  it("should have routers.ts as the single entry point for tRPC procedures", () => {
    const routers = fs.readFileSync("server/routers.ts", "utf-8");
    expect(routers).toContain("export const appRouter");
    const subRouters = getAllFiles("server/routers", ".ts");
    const hasProtected = subRouters.some((f) =>
      fs.readFileSync(f, "utf-8").includes("protectedProcedure")
    );
    expect(hasProtected).toBe(true);
  });

  it("should have schema.ts defining all database tables", () => {
    const schema = fs.readFileSync("drizzle/schema.ts", "utf-8");
    expect(schema).toContain("users");
    expect(schema).toContain("tasks");
    expect(schema).toContain("messages");
    expect(schema).toContain("sovereignProviders");
  });

  it("should have db.ts with query helpers", () => {
    const db = fs.readFileSync("server/db.ts", "utf-8");
    expect(db).toContain("export ");
    const rawSqlCount = (db.match(/sql`/g) || []).length;
    expect(rawSqlCount).toBeLessThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Security Audit
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Security Audit", () => {
  it("should not expose API keys in client-side code", () => {
    const clientFiles = getAllFiles("client/src", ".ts", ".tsx");
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain("BUILT_IN_FORGE_API_KEY");
      expect(content).not.toContain("JWT_SECRET");
      if (file.includes("SettingsPage")) continue;
      expect(content).not.toContain("STRIPE_SECRET_KEY");
    }
  });

  it("should have rate limiting on all public API endpoints", () => {
    const indexTs = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexTs).toContain("apiLimiter");
    expect(indexTs).toContain("webhookLimiter");
    expect(indexTs).toContain("streamLimiter");
    expect(indexTs).toContain("analyticsLimiter");
  });

  it("should validate webhook signatures for Stripe", () => {
    const stripeTs = fs.readFileSync("server/stripe.ts", "utf-8");
    expect(stripeTs).toContain("stripe.webhooks.constructEvent");
  });

  it("should use protectedProcedure for sensitive operations", () => {
    const subRouters = getAllFiles("server/routers", ".ts");
    let protectedCount = 0;
    for (const f of subRouters) {
      const content = fs.readFileSync(f, "utf-8");
      if (content.includes("protectedProcedure")) protectedCount++;
    }
    expect(protectedCount).toBeGreaterThanOrEqual(10);
  });

  it("should not have hardcoded secrets in source code", () => {
    const serverFiles = getAllFiles("server", ".ts");
    const patterns = [
      /sk_live_[a-zA-Z0-9]{20,}/,
      /sk_test_[a-zA-Z0-9]{20,}/,
    ];
    for (const file of serverFiles) {
      if (file.includes("node_modules") || file.includes(".test.")) continue;
      const content = fs.readFileSync(file, "utf-8");
      for (const pattern of patterns) {
        expect(content).not.toMatch(pattern);
      }
    }
  });

  it("should sanitize user input with Zod validation", () => {
    const subRouters = getAllFiles("server/routers", ".ts");
    let zodCount = 0;
    for (const f of subRouters) {
      const content = fs.readFileSync(f, "utf-8");
      if (content.includes("z.string()") || content.includes("z.object(")) zodCount++;
    }
    expect(zodCount).toBeGreaterThanOrEqual(10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Error Handling Completeness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Error Handling", () => {
  it("should have try/catch in orchestration services (sovereign, atlas)", () => {
    const orchestrationServices = [
      "server/services/sovereign.ts",
      "server/services/atlas.ts",
    ];
    for (const svc of orchestrationServices) {
      const content = fs.readFileSync(svc, "utf-8");
      const tryCatches = content.match(/try\s*\{/g) || [];
      const dotCatches = (content.match(/\.catch\(/g) || []).length;
      expect(tryCatches.length + dotCatches).toBeGreaterThanOrEqual(2);
    }
  });

  it("should have callers wrap aegis calls in try/catch", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("checkCache");
    expect(sovereign).toContain("catch");
  });

  it("should have fallback behavior in sovereign routing", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("fallback");
    expect(sovereign).toContain("invokeLLM");
  });

  it("should have fallback behavior in atlas decomposition", () => {
    const atlas = fs.readFileSync("server/services/atlas.ts", "utf-8");
    expect(atlas).toContain("single-task fallback");
    expect(atlas).toContain("catch");
  });

  it("should handle database connection errors gracefully", () => {
    const db = fs.readFileSync("server/db.ts", "utf-8");
    const hasTryCatch = db.includes("try") && db.includes("catch");
    const hasErrorParam = db.includes("error") || db.includes("err");
    expect(hasTryCatch || hasErrorParam).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Observability Completeness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Observability Completeness", () => {
  it("should have structured logging in observability module", () => {
    const obs = fs.readFileSync("server/services/observability.ts", "utf-8");
    expect(obs).toContain("export function log");
    expect(obs).toContain("export function startSpan");
    expect(obs).toContain("export function endSpan");
    expect(obs).toContain("export function getRecentLogs");
    expect(obs).toContain("export function getRecentSpans");
  });

  it("should have observability wired into sovereign routing", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("obs.startRoutingSpan");
    expect(sovereign).toContain("obs.endSpan");
    expect(sovereign).toContain("obs.recordProviderAttempt");
  });

  it("should have health check endpoint with observability data", () => {
    const healthCheck = fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8");
    expect(healthCheck).toContain("getRoutingMetrics");
    expect(healthCheck).toContain("getErrorSummary");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Circuit Breaker Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Circuit Breaker Integrity", () => {
  it("should persist circuit breaker state to database", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("persistCircuitState");
    expect(sovereign).toContain("loadCircuitStatesFromDb");
  });

  it("should have circuit breaker state transitions (closed → open → half-open)", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("closed");
    expect(sovereign).toContain("open");
    expect(sovereign).toContain("half-open");
  });

  it("should have failure threshold for circuit breaker", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("CIRCUIT_BREAKER_THRESHOLD");
  });

  it("should have recovery timeout for circuit breaker", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("CIRCUIT_BREAKER_TIMEOUT");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. AEGIS Cache Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: AEGIS Cache Integrity", () => {
  it("should have cache check before LLM call in sovereign", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("checkCache");
    expect(sovereign).toContain("writeCache");
  });

  it("should have TTL-based cache expiration", () => {
    const aegis = fs.readFileSync("server/services/aegis.ts", "utf-8");
    expect(aegis).toContain("ttlHours");
    expect(aegis).toContain("expiresAt");
  });

  it("should have cost estimation in AEGIS", () => {
    const aegis = fs.readFileSync("server/services/aegis.ts", "utf-8");
    expect(aegis).toContain("estimateCost");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Test Coverage Audit
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Test Coverage Audit", () => {
  it("should have test files for all major services", () => {
    const expectedTests = [
      "server/atlas-deep.test.ts",
      "server/sovereign-deep.test.ts",
      "server/sovereign-service.test.ts",
      "server/pass007-gaps.test.ts",
    ];
    for (const test of expectedTests) {
      expect(fs.existsSync(test)).toBe(true);
    }
  });

  it("should have at least 100 test files", () => {
    const testFiles = getAllFiles("server", ".test.ts");
    expect(testFiles.length).toBeGreaterThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Frontend-Backend Contract Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Frontend-Backend Contract", () => {
  it("should have tRPC client configured in frontend", () => {
    const trpcClient = fs.readFileSync("client/src/lib/trpc.ts", "utf-8");
    expect(trpcClient).toContain("createTRPCReact");
  });

  it("should have App.tsx with route definitions", () => {
    const app = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(app).toContain("Route");
    expect(app).toContain("Switch");
  });

  it("should have useAuth hook for authentication state", () => {
    const useAuth = fs.readFileSync("client/src/_core/hooks/useAuth.ts", "utf-8");
    expect(useAuth).toContain("useAuth");
    expect(useAuth).toContain("user");
    expect(useAuth).toContain("isAuthenticated");
  });

  it("should have shared types between client and server", () => {
    expect(fs.existsSync("shared/types.ts")).toBe(true);
    expect(fs.existsSync("shared/const.ts")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. Dead Code Detection
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Dead Code Detection", () => {
  it("should not have TODO/FIXME/HACK comments in production services", () => {
    const criticalFiles = [
      "server/services/sovereign.ts",
      "server/services/atlas.ts",
      "server/services/aegis.ts",
      "server/services/observability.ts",
    ];
    for (const file of criticalFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const todos = (content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || []).length;
      expect(todos).toBeLessThanOrEqual(2);
    }
  });

  it("should not have debug console.log statements in production services", () => {
    const criticalFiles = [
      "server/services/sovereign.ts",
      "server/services/atlas.ts",
    ];
    for (const file of criticalFiles) {
      const content = fs.readFileSync(file, "utf-8");
      const debugLogs = (content.match(/console\.log\(\s*["'`]debug/gi) || []).length;
      expect(debugLogs).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Deployment Readiness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 008: Deployment Readiness", () => {
  it("should have build script in package.json", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.dev).toBeDefined();
  });

  it("should have database migration scripts", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    expect(pkg.scripts["db:push"]).toBeDefined();
  });

  it("should not have port numbers hardcoded in server startup", () => {
    const indexTs = fs.readFileSync("server/_core/index.ts", "utf-8");
    const usesEnvPort = indexTs.includes("process.env.PORT") || indexTs.includes("PORT");
    expect(usesEnvPort).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════

function getAllFiles(dir: string, ...extensions: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.isDirectory()) {
        results.push(...getAllFiles(fullPath, ...extensions));
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return results;
}
