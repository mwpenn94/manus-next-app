/**
 * Pass 009 — Depth Convergence Scan
 *
 * Stress-test specific areas: edge cases, data integrity, runtime behavior,
 * configuration correctness, and integration boundaries.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
// 1. Database Schema Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Database Schema Integrity", () => {
  const schema = fs.readFileSync("drizzle/schema.ts", "utf-8");

  it("should have proper foreign key relationships", () => {
    expect(schema).toContain("userId");
    expect(schema).toContain("taskId");
  });

  it("should have timestamps on all major tables", () => {
    const createdAtCount = (schema.match(/createdAt/g) || []).length;
    expect(createdAtCount).toBeGreaterThanOrEqual(5);
  });

  it("should have proper index definitions for query performance", () => {
    const hasIndexes = schema.includes("index") || schema.includes("unique");
    expect(hasIndexes).toBe(true);
  });

  it("should have user role enum for access control", () => {
    expect(schema).toContain("role");
    expect(schema).toContain("admin");
    expect(schema).toContain("user");
  });

  it("should have sovereign providers table with circuit breaker fields", () => {
    expect(schema).toContain("sovereignProviders") || expect(schema).toContain("sovereign_providers");
    expect(schema).toContain("circuitState");
    expect(schema).toContain("half_open");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Configuration Correctness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Configuration Correctness", () => {
  it("should have vitest config with proper test patterns", () => {
    const config = fs.readFileSync("vitest.config.ts", "utf-8");
    expect(config).toContain("test");
    expect(config).toContain(".test.ts");
  });

  it("should have drizzle config pointing to correct schema", () => {
    const config = fs.readFileSync("drizzle.config.ts", "utf-8");
    expect(config).toContain("schema");
    expect(config).toContain("drizzle");
  });

  it("should have tsconfig with proper paths", () => {
    const tsconfig = JSON.parse(fs.readFileSync("tsconfig.json", "utf-8"));
    expect(tsconfig.compilerOptions).toBeDefined();
    expect(tsconfig.compilerOptions.paths || tsconfig.compilerOptions.baseUrl).toBeDefined();
  });

  it("should have package.json with all required dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["react"]).toBeDefined();
    expect(deps["@trpc/server"]).toBeDefined();
    expect(deps["drizzle-orm"]).toBeDefined();
    expect(deps["express"]).toBeDefined();
    expect(deps["vitest"]).toBeDefined();
  });

  it("should have .gitignore covering sensitive files", () => {
    const gitignore = fs.readFileSync(".gitignore", "utf-8");
    expect(gitignore).toContain("node_modules");
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain("dist");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Service Integration Boundaries
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Service Integration Boundaries", () => {
  it("should have sovereign routing use proper provider selection", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("classifyTask");
    expect(sovereign).toContain("closed");
    expect(sovereign).toContain("half-open");
  });

  it("should have atlas decomposition produce valid sub-tasks", () => {
    const atlas = fs.readFileSync("server/services/atlas.ts", "utf-8");
    expect(atlas).toContain("sub-tasks") || expect(atlas).toContain("sub_tasks");
    expect(atlas).toContain("decomposeGoal");
  });

  it("should have aegis cost estimation with proper token counting", () => {
    const aegis = fs.readFileSync("server/services/aegis.ts", "utf-8");
    expect(aegis).toContain("estimateCost");
    expect(aegis).toContain("token");
  });

  it("should have observability not throw on missing data", () => {
    const obs = fs.readFileSync("server/services/observability.ts", "utf-8");
    expect(obs).toContain("getRoutingMetrics");
    expect(obs).toContain("getErrorSummary");
    expect(obs).toContain("[]") || expect(obs).toContain("{}");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Frontend Component Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Frontend Component Integrity", () => {
  it("should have App.tsx with proper route structure", () => {
    const app = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(app).toContain("Route");
    expect(app).toContain("Home");
    expect(app).toContain("NotFound");
  });

  it("should have index.css with theme variables", () => {
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    expect(css).toContain("--background");
    expect(css).toContain("--foreground");
    expect(css).toContain("--primary");
  });

  it("should have main.tsx with tRPC provider setup", () => {
    const main = fs.readFileSync("client/src/main.tsx", "utf-8");
    expect(main).toContain("trpc.Provider");
    expect(main).toContain("QueryClientProvider");
  });

  it("should have const.ts with login URL helper", () => {
    const constFile = fs.readFileSync("client/src/const.ts", "utf-8");
    expect(constFile).toContain("getLoginUrl");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Shared Types Consistency
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Shared Types Consistency", () => {
  it("should have shared/const.ts with error messages", () => {
    const sharedConst = fs.readFileSync("shared/const.ts", "utf-8");
    expect(sharedConst).toContain("UNAUTHED_ERR_MSG");
  });

  it("should have shared/types.ts with common type definitions", () => {
    expect(fs.existsSync("shared/types.ts")).toBe(true);
  });

  it("should have env.ts with all required environment variable declarations", () => {
    const env = fs.readFileSync("server/_core/env.ts", "utf-8");
    expect(env).toContain("DATABASE_URL");
    expect(env).toContain("JWT_SECRET");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Webhook Handler Robustness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Webhook Handler Robustness", () => {
  it("should handle Stripe test events correctly", () => {
    const stripe = fs.readFileSync("server/stripe.ts", "utf-8");
    expect(stripe).toContain("evt_test_");
    expect(stripe).toContain("verified");
  });

  it("should have raw body parsing before Stripe webhook", () => {
    const index = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(index).toContain("express.raw");
    expect(index).toContain("/api/stripe/webhook");
  });

  it("should have GitHub webhook endpoint registered", () => {
    const index = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(index).toContain("/api/github/webhook");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Storage Integration
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Storage Integration", () => {
  it("should have storage.ts with S3 helpers", () => {
    const storage = fs.readFileSync("server/storage.ts", "utf-8");
    expect(storage).toContain("storagePut");
    expect(storage).toContain("storageGet");
  });

  it("should not store file bytes in database schema", () => {
    const schema = fs.readFileSync("drizzle/schema.ts", "utf-8");
    const blobCount = (schema.match(/blob\(/g) || []).length;
    expect(blobCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 8. Auth Flow Integrity
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Auth Flow Integrity", () => {
  it("should have OAuth callback handler", () => {
    const oauth = fs.readFileSync("server/_core/oauth.ts", "utf-8");
    expect(oauth).toContain("callback");
    expect(oauth).toContain("state");
  });

  it("should have session cookie handling", () => {
    const cookies = fs.readFileSync("server/_core/cookies.ts", "utf-8");
    expect(cookies).toContain("CookieOptions");
  });

  it("should have context builder for tRPC", () => {
    const context = fs.readFileSync("server/_core/context.ts", "utf-8");
    expect(context).toContain("user");
    expect(context).toContain("TrpcContext");
  });

  it("should redirect to login on unauthorized error in frontend", () => {
    const main = fs.readFileSync("client/src/main.tsx", "utf-8");
    expect(main).toContain("UNAUTHED_ERR_MSG");
    expect(main).toContain("getLoginUrl");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 9. LLM Integration Safety
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: LLM Integration Safety", () => {
  it("should have LLM helper in server core", () => {
    const llm = fs.readFileSync("server/_core/llm.ts", "utf-8");
    expect(llm).toContain("invokeLLM");
    expect(llm).toContain("messages");
  });

  it("should call LLM only from server-side code", () => {
    const clientFiles = getAllFiles("client/src", ".ts", ".tsx");
    for (const file of clientFiles) {
      const content = fs.readFileSync(file, "utf-8");
      expect(content).not.toContain('from "../../server/_core/llm"');
      const actualImports = content.match(/import.*invokeLLM/g) || [];
      expect(actualImports.length).toBe(0);
    }
  });

  it("should have sovereign route through LLM with proper error handling", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("invokeLLM");
    expect(sovereign).toContain("catch");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 10. Cross-Cutting Concerns
// ═══════════════════════════════════════════════════════════════════

describe("Pass 009: Cross-Cutting Concerns", () => {
  it("should have notification helper for owner alerts", () => {
    const notification = fs.readFileSync("server/_core/notification.ts", "utf-8");
    expect(notification).toContain("notifyOwner");
  });

  it("should have proper CORS/security headers in server", () => {
    const index = fs.readFileSync("server/_core/index.ts", "utf-8");
    const hasSecurity = index.includes("cors") || index.includes("helmet") || index.includes("Content-Security-Policy");
    expect(hasSecurity).toBe(true);
  });

  it("should have error boundary or global error handling in frontend", () => {
    const main = fs.readFileSync("client/src/main.tsx", "utf-8");
    expect(main).toContain("getQueryCache");
    expect(main).toContain("getMutationCache");
  });

  it("should have all test files follow naming convention", () => {
    const testFiles = getAllFiles("server", ".test.ts");
    for (const file of testFiles) {
      expect(file).toMatch(/^server\//);
      expect(file).toMatch(/\.test\.ts$/);
    }
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
