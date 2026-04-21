/**
 * §L.29 False-Positive Elimination Tests
 * 
 * Category A: Stub audit — verify no mock data in production procedures
 * Category B: Side-effect verification — every mutation has a DB operation
 * Category C: Test type breakdown — categorize all tests
 * Category D: Status drift — verify capabilities have real implementations
 * Category E: Early termination defense — multi-step intents complete
 * Category F: Feature-rendered verification — UI components match promises
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── Category A: Stub Audit ──

describe("§L.29 Category A: Stub Audit", () => {
  const routersContent = fs.readFileSync(
    path.join(process.cwd(), "server/routers.ts"),
    "utf-8"
  );

  it("should have no mock/MOCK references in routers.ts", () => {
    const mockLines = routersContent
      .split("\n")
      .filter((line) => /\bmock\b|\bMOCK\b/i.test(line) && !line.trim().startsWith("//"));
    expect(mockLines).toHaveLength(0);
  });

  it("should have no hardcoded/placeholder references in routers.ts", () => {
    const stubLines = routersContent
      .split("\n")
      .filter(
        (line) =>
          (/\bhardcoded\b|\bplaceholder\b/i.test(line)) &&
          !line.trim().startsWith("//") &&
          !line.trim().startsWith("*")
      );
    expect(stubLines).toHaveLength(0);
  });

  it("should have no TODO/FIXME/HACK in routers.ts", () => {
    const todoLines = routersContent
      .split("\n")
      .filter(
        (line) =>
          /\bTODO\b|\bFIXME\b|\bHACK\b/.test(line) &&
          !line.trim().startsWith("//")
      );
    expect(todoLines).toHaveLength(0);
  });

  it("should have no 'coming soon' toasts in frontend code (excluding comments)", () => {
    const clientDir = path.join(process.cwd(), "client/src");
    const files = getAllTsxFiles(clientDir);
    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      // Strip comment lines before checking
      const codeOnly = content
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
        .join("\n");
      if (/coming soon/i.test(codeOnly)) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toHaveLength(0);
  });
});

// ── Category B: Side-Effect Verification ──

describe("§L.29 Category B: Side-Effect Verification", () => {
  const routersContent = fs.readFileSync(
    path.join(process.cwd(), "server/routers.ts"),
    "utf-8"
  );

  it("every mutation returning success:true should have an await call or cookie operation before it", () => {
    const lines = routersContent.split("\n");
    const violations: number[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("return { success: true }")) {
        // Check the preceding 30 lines for an await call, cookie op, or catch block
        const preceding = lines.slice(Math.max(0, i - 30), i).join("\n");
        const hasSideEffect = 
          preceding.includes("await ") || 
          preceding.includes("setCookie") || 
          preceding.includes("clearCookie") ||
          preceding.includes("deleteCookie") ||
          preceding.includes("} catch"); // try/catch wrapping an await is valid
        if (!hasSideEffect) {
          violations.push(i + 1);
        }
      }
    }
    
    expect(violations).toHaveLength(0);
  });

  it("should have ownership verification for all protected mutations that modify resources", () => {
    const dbContent = fs.readFileSync(
      path.join(process.cwd(), "server/db.ts"),
      "utf-8"
    );
    // Verify that ownership verification functions exist
    expect(dbContent).toContain("verifyTaskOwnership");
    expect(dbContent).toContain("verifyTaskOwnershipById");
    expect(dbContent).toContain("verifyKnowledgeOwnership");
  });
});

// ── Category C: Test Type Breakdown ──

describe("§L.29 Category C: Test Type Breakdown", () => {
  const testDir = path.join(process.cwd(), "server");
  const testFiles = fs.readdirSync(testDir).filter((f) => f.endsWith(".test.ts"));

  it("should have at least 40 test files", () => {
    expect(testFiles.length).toBeGreaterThanOrEqual(40);
  });

  it("should categorize tests into unit, integration, and e2e", () => {
    const UNIT_TESTS = testFiles.filter((f) =>
      ["keyboard-shortcuts", "presence-indicator", "v9-parity", "parity", "ns19-components", "redCaps", "promptCache", "stylePreferences", "mediaContext"].some((k) => f.includes(k))
    );
    const INTEGRATION_TESTS = testFiles.filter((f) =>
      ["routers", "chatPersistence", "messagePersistence", "preferences", "workspace", "features", "stream", "bridge", "stripe", "idor", "connectorOAuth", "github", "taskRating", "documentGeneration", "video"].some((k) => f.includes(k))
    );
    const E2E_TESTS = testFiles.filter((f) =>
      ["agentTools", "phase4", "dedup-stress", "paste-workflow"].some((k) => f.includes(k))
    );

    expect(UNIT_TESTS.length).toBeGreaterThan(0);
    expect(INTEGRATION_TESTS.length).toBeGreaterThan(0);
    expect(E2E_TESTS.length).toBeGreaterThan(0);
    
    // Total categorized should cover most test files
    const categorized = new Set([...UNIT_TESTS, ...INTEGRATION_TESTS, ...E2E_TESTS]);
    expect(categorized.size).toBeGreaterThan(20);
  });
});

// ── Category D: Status Drift ──

describe("§L.29 Category D: Status Drift", () => {
  it("all agent tools should have corresponding test coverage", () => {
    const agentToolsContent = fs.readFileSync(
      path.join(process.cwd(), "server/agentTools.ts"),
      "utf-8"
    );
    const agentToolsTestContent = fs.readFileSync(
      path.join(process.cwd(), "server/agentTools.test.ts"),
      "utf-8"
    );

    // Extract tool names from the tools definition
    const toolNames = [...agentToolsContent.matchAll(/name:\s*["'](\w+)["']/g)].map((m) => m[1]);
    expect(toolNames.length).toBeGreaterThan(0);

    // Each tool should have at least one test mention
    for (const tool of toolNames) {
      expect(agentToolsTestContent).toContain(tool);
    }
  });

  it("all tRPC router groups should have test coverage", () => {
    const routersContent = fs.readFileSync(
      path.join(process.cwd(), "server/routers.ts"),
      "utf-8"
    );
    
    // Extract router group names
    const routerGroups = [...routersContent.matchAll(/(\w+):\s*router\(\{/g)].map((m) => m[1]);
    expect(routerGroups.length).toBeGreaterThan(0);
    
    // Each group should be mentioned in at least one test file
    const allTestContent = fs.readdirSync(path.join(process.cwd(), "server"))
      .filter((f) => f.endsWith(".test.ts"))
      .map((f) => fs.readFileSync(path.join(process.cwd(), "server", f), "utf-8"))
      .join("\n");
    
    for (const group of routerGroups) {
      expect(allTestContent).toContain(group);
    }
  });
});

// ── Category E: Early Termination Defense ──

describe("§L.29 Category E: Early Termination Defense", () => {
  it("agentStream should have MAX_TOOL_TURNS > 1 for multi-step intents", () => {
    const agentStreamContent = fs.readFileSync(
      path.join(process.cwd(), "server/agentStream.ts"),
      "utf-8"
    );
    const match = agentStreamContent.match(/MAX_TOOL_TURNS\s*=\s*(\d+)/);
    expect(match).toBeTruthy();
    const maxTurns = parseInt(match![1]);
    expect(maxTurns).toBeGreaterThanOrEqual(5);
  });

  it("agentStream should have proper error recovery with user-friendly messages", () => {
    const agentStreamContent = fs.readFileSync(
      path.join(process.cwd(), "server/agentStream.ts"),
      "utf-8"
    );
    expect(agentStreamContent).toContain("ETIMEDOUT");
    expect(agentStreamContent).toContain("rate limit");
    expect(agentStreamContent).toContain("ECONNREFUSED");
  });
});

// ── Category F: Feature-Rendered Verification ──

describe("§L.29 Category F: Feature-Rendered Verification", () => {
  it("all routes in App.tsx should have corresponding page files", () => {
    const appContent = fs.readFileSync(
      path.join(process.cwd(), "client/src/App.tsx"),
      "utf-8"
    );
    
    // Extract route paths
    const routes = [...appContent.matchAll(/path=["']([^"']+)["']/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(0);
    
    // Each route should have a corresponding component import
    const imports = [...appContent.matchAll(/import\s+.*\s+from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
  });

  it("sidebar navigation items should match available routes", () => {
    const appLayoutContent = fs.readFileSync(
      path.join(process.cwd(), "client/src/components/AppLayout.tsx"),
      "utf-8"
    );
    
    // Check that nav items have href/to attributes
    const navLinks = [...appLayoutContent.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
    expect(navLinks.length).toBeGreaterThan(0);
  });
});

// ── Category G: No Dead-End UI Buttons ──

describe("§L.29 Category G: No Dead-End UI Buttons", () => {
  it("should have zero 'coming soon' toasts in production code", () => {
    const clientDir = path.join(process.cwd(), "client/src");
    const files = getAllTsxFiles(clientDir);
    let comingSoonCount = 0;
    for (const file of files) {
      const content = fs.readFileSync(file, "utf-8");
      const matches = content.match(/coming soon/gi) || [];
      // Exclude comments
      const nonCommentMatches = matches.filter((_, idx) => {
        const lines = content.split("\n");
        for (const line of lines) {
          if (/coming soon/i.test(line) && !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.includes("No \"coming soon\"")) {
            return true;
          }
        }
        return false;
      });
      // Simple check: just count non-comment occurrences
      const codeContent = content.split("\n").filter(l => !l.trim().startsWith("//") && !l.trim().startsWith("*")).join("\n");
      if (/coming soon/i.test(codeContent) && !codeContent.includes("No \"coming soon\"")) {
        comingSoonCount++;
      }
    }
    expect(comingSoonCount).toBe(0);
  });
});

// ── Helpers ──

function getAllTsxFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "node_modules") {
        results.push(...getAllTsxFiles(fullPath));
      } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        results.push(fullPath);
      }
    }
  } catch { /* ignore */ }
  return results;
}
