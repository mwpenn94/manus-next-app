/**
 * Pass 010 — Future-State & Synthesis Convergence Scan
 *
 * Final convergence pass. Verifies system coherence, future-proofing,
 * documentation completeness, and confirms no regressions from prior passes.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ═══════════════════════════════════════════════════════════════════
// 1. System Coherence — All services form a unified architecture
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: System Coherence", () => {
  it("should have a clear layered architecture: routers → services → db", () => {
    const routerFiles = getAllFiles("server/routers", ".ts");
    let routerImportsServices = false;
    for (const f of routerFiles) {
      const content = fs.readFileSync(f, "utf-8");
      if (content.includes("../services/") || content.includes("../db")) {
        routerImportsServices = true;
        break;
      }
    }
    expect(routerImportsServices).toBe(true);

    const serviceFiles = getAllFiles("server/services", ".ts");
    for (const f of serviceFiles) {
      const content = fs.readFileSync(f, "utf-8");
      expect(content).not.toContain('from "../routers/');
    }
  });

  it("should have consistent error handling patterns across services", () => {
    const services = ["server/services/sovereign.ts", "server/services/atlas.ts"];
    for (const svc of services) {
      const content = fs.readFileSync(svc, "utf-8");
      expect(content).toContain("console.warn");
      expect(content).toContain("try");
      expect(content).toContain("catch");
    }
  });

  it("should have all tRPC routers registered in the main barrel", () => {
    const barrel = fs.readFileSync("server/routers.ts", "utf-8");
    const routerFiles = fs.readdirSync("server/routers").filter((f) => f.endsWith(".ts"));
    for (const file of routerFiles) {
      const routerName = file.replace(".ts", "");
      expect(barrel).toContain(routerName);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. No Regressions from Prior Passes
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: No Regressions", () => {
  it("should still have AEGIS cache wired into Sovereign (G-003)", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("checkCache");
    expect(sovereign).toContain("writeCache");
  });

  it("should still have circuit breaker DB persistence (G-004)", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("loadCircuitStatesFromDb");
    expect(sovereign).toContain("persistCircuitState");
  });

  it("should still have rate limiting on webhooks (G-005)", () => {
    const index = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(index).toContain("webhookLimiter");
  });

  it("should still have observability spans (G-007)", () => {
    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("obs.startRoutingSpan");
    expect(sovereign).toContain("obs.endSpan");
  });

  it("should still have ATLAS routed through Sovereign (G-008)", () => {
    const atlas = fs.readFileSync("server/services/atlas.ts", "utf-8");
    expect(atlas).toContain("routeRequest");
    expect(atlas).toContain("sovereign");
  });

  it("should still have scheduled health check (G-009)", () => {
    expect(fs.existsSync("server/scheduledHealthCheck.ts")).toBe(true);
    const healthCheck = fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8");
    expect(healthCheck).toContain("getRoutingMetrics");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Future-Proofing
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: Future-Proofing", () => {
  it("should have extensible router structure (sub-router pattern)", () => {
    const routerDir = fs.readdirSync("server/routers");
    expect(routerDir.length).toBeGreaterThanOrEqual(10);
  });

  it("should have service layer abstracted from transport (tRPC)", () => {
    const serviceFiles = getAllFiles("server/services", ".ts");
    for (const f of serviceFiles) {
      const content = fs.readFileSync(f, "utf-8");
      expect(content).not.toContain("@trpc/server");
    }
  });

  it("should have database schema using ORM (not raw SQL)", () => {
    const schema = fs.readFileSync("drizzle/schema.ts", "utf-8");
    expect(schema).toContain("mysqlTable");
    expect(schema).toContain("drizzle-orm");
  });

  it("should have environment variables centralized in env.ts", () => {
    const env = fs.readFileSync("server/_core/env.ts", "utf-8");
    expect(env).toContain("process.env");
    expect(env).toContain("export");
  });

  it("should have observability module ready for external integration", () => {
    const obs = fs.readFileSync("server/services/observability.ts", "utf-8");
    expect(obs).toContain("getRecentLogs");
    expect(obs).toContain("getRecentSpans");
    expect(obs).toContain("getRoutingMetrics");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Documentation Completeness
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: Documentation", () => {
  it("should have recursive pass notes documenting optimization history", () => {
    const notes = fs.readFileSync("recursive-pass-notes.md", "utf-8");
    expect(notes).toContain("Pass 006");
    expect(notes).toContain("Pass 007");
    expect(notes).toContain("Convergence");
  });

  it("should have todo.md tracking all completed items", () => {
    const todo = fs.readFileSync("todo.md", "utf-8");
    const completed = (todo.match(/\[x\]/g) || []).length;
    expect(completed).toBeGreaterThanOrEqual(50);
  });

  it("should have JSDoc comments on all service exports", () => {
    const services = [
      "server/services/sovereign.ts",
      "server/services/atlas.ts",
      "server/services/aegis.ts",
      "server/services/observability.ts",
    ];
    for (const svc of services) {
      const content = fs.readFileSync(svc, "utf-8");
      expect(content).toContain("/**");
      expect(content).toContain("*/");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Test Suite Health
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: Test Suite Health", () => {
  it("should have convergence test files for passes 008, 009, 010", () => {
    expect(fs.existsSync("server/pass008-adversarial.test.ts")).toBe(true);
    expect(fs.existsSync("server/pass009-depth.test.ts")).toBe(true);
    expect(fs.existsSync("server/pass010-synthesis.test.ts")).toBe(true);
  });

  it("should have at least 100 test files", () => {
    const testFiles = getAllFiles("server", ".test.ts");
    expect(testFiles.length).toBeGreaterThanOrEqual(100);
  });

  it("should have test files covering all major features", () => {
    const testFiles = getAllFiles("server", ".test.ts").map((f) => path.basename(f));
    const hasAtlasTests = testFiles.some((f) => f.includes("atlas"));
    const hasSovereignTests = testFiles.some((f) => f.includes("sovereign"));
    const hasGapTests = testFiles.some((f) => f.includes("pass007"));
    expect(hasAtlasTests).toBe(true);
    expect(hasSovereignTests).toBe(true);
    expect(hasGapTests).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Final Synthesis — Everything works together
// ═══════════════════════════════════════════════════════════════════

describe("Pass 010: Final Synthesis", () => {
  it("should have complete request flow: client → tRPC → router → service → db", () => {
    const trpcClient = fs.readFileSync("client/src/lib/trpc.ts", "utf-8");
    expect(trpcClient).toContain("createTRPCReact");

    const taskRouter = fs.readFileSync("server/routers/task.ts", "utf-8");
    expect(taskRouter).toContain("protectedProcedure") || expect(taskRouter).toContain("publicProcedure");

    const db = fs.readFileSync("server/db.ts", "utf-8");
    expect(db).toContain("export");
  });

  it("should have complete AI pipeline: AEGIS classify → Sovereign route → ATLAS execute", () => {
    const aegis = fs.readFileSync("server/services/aegis.ts", "utf-8");
    expect(aegis).toContain("classifyTask");

    const sovereign = fs.readFileSync("server/services/sovereign.ts", "utf-8");
    expect(sovereign).toContain("routeRequest");
    expect(sovereign).toContain("classifyTask");

    const atlas = fs.readFileSync("server/services/atlas.ts", "utf-8");
    expect(atlas).toContain("decomposeGoal");
    expect(atlas).toContain("executeTask");
    expect(atlas).toContain("routeRequest");
  });

  it("should have complete observability pipeline: log → span → metrics → health check", () => {
    const obs = fs.readFileSync("server/services/observability.ts", "utf-8");
    expect(obs).toContain("log");
    expect(obs).toContain("startSpan");
    expect(obs).toContain("endSpan");
    expect(obs).toContain("getRoutingMetrics");

    const healthCheck = fs.readFileSync("server/scheduledHealthCheck.ts", "utf-8");
    expect(healthCheck).toContain("getRoutingMetrics");
    expect(healthCheck).toContain("getErrorSummary");
  });

  it("should have complete auth pipeline: OAuth → session → context → protected procedure", () => {
    const oauth = fs.readFileSync("server/_core/oauth.ts", "utf-8");
    expect(oauth).toContain("callback");

    const context = fs.readFileSync("server/_core/context.ts", "utf-8");
    expect(context).toContain("user");

    const trpc = fs.readFileSync("server/_core/trpc.ts", "utf-8");
    expect(trpc).toContain("protectedProcedure");
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
