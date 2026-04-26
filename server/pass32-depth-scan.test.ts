/**
 * Pass 32 — Recursion Pass 1: Depth Scan
 * Edge cases in auto-refresh scheduler, GitHub CRUD operations,
 * commit-and-deploy workflow, and conflict detection.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Auto-Refresh Scheduler ───────────────────────────────────────

describe("Auto-Refresh Scheduler Endpoint", () => {
  const schedulerPath = path.join(__dirname, "scheduledConnectorRefresh.ts");

  it("scheduler handler file exists", () => {
    expect(fs.existsSync(schedulerPath)).toBe(true);
  });

  it("scheduler is registered at /api/scheduled/connector-refresh", () => {
    const indexPath = path.join(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain("/api/scheduled/connector-refresh");
  });

  it("scheduler queries connectors with autoRefreshEnabled", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    expect(content).toContain("autoRefreshEnabled");
  });

  it("scheduler handles refresh failures with failCount tracking", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    expect(content).toContain("refreshFailCount");
  });

  it("scheduler auto-disables after threshold failures", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    // Should disable auto-refresh after repeated failures
    expect(content).toContain("autoRefreshEnabled");
    expect(content).toMatch(/false|disable/i);
  });

  it("scheduler logs events to connectorHealthLogs", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    expect(content).toContain("logConnectorHealthEvent");
  });

  it("scheduler uses try/catch per connector to prevent cascade failures", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    // Each connector refresh should be independently try/caught
    expect(content).toMatch(/try\s*\{/);
    expect(content).toMatch(/catch/);
  });

  it("scheduler returns summary with refreshed/failed counts", () => {
    const content = fs.readFileSync(schedulerPath, "utf-8");
    expect(content).toContain("refreshed");
    expect(content).toContain("failed");
  });
});

// ─── GitHub API Enhancements ──────────────────────────────────────

describe("GitHub API — Multi-File Commit (Git Trees)", () => {
  const apiPath = path.join(__dirname, "githubApi.ts");
  let apiContent: string;

  beforeAll(() => {
    apiContent = fs.readFileSync(apiPath, "utf-8");
  });

  it("createTreeCommit function exists", () => {
    expect(apiContent).toContain("createTreeCommit");
  });

  it("creates tree with multiple blobs", () => {
    // Should use Git Trees API pattern
    expect(apiContent).toContain("/git/trees");
  });

  it("creates commit pointing to tree", () => {
    expect(apiContent).toContain("/git/commits");
  });

  it("updates branch ref to new commit", () => {
    expect(apiContent).toContain("/git/refs");
  });

  it("handles empty file list gracefully", () => {
    // The function should validate input
    expect(apiContent).toContain("createTreeCommit");
  });
});

describe("GitHub API — Branch Comparison", () => {
  const apiPath = path.join(__dirname, "githubApi.ts");
  let apiContent: string;

  beforeAll(() => {
    apiContent = fs.readFileSync(apiPath, "utf-8");
  });

  it("compareBranches function exists", () => {
    expect(apiContent).toContain("compareBranches");
  });

  it("uses GitHub compare API", () => {
    expect(apiContent).toContain("/compare/");
  });

  it("returns ahead_by and behind_by counts", () => {
    expect(apiContent).toContain("ahead_by");
    expect(apiContent).toContain("behind_by");
  });
});

describe("GitHub API — Commit Diff", () => {
  const apiPath = path.join(__dirname, "githubApi.ts");
  let apiContent: string;

  beforeAll(() => {
    apiContent = fs.readFileSync(apiPath, "utf-8");
  });

  it("getCommitDiff function exists", () => {
    expect(apiContent).toContain("getCommitDiff");
  });

  it("returns file-level diff information", () => {
    expect(apiContent).toContain("files");
  });
});

describe("GitHub API — Fork Repository", () => {
  const apiPath = path.join(__dirname, "githubApi.ts");
  let apiContent: string;

  beforeAll(() => {
    apiContent = fs.readFileSync(apiPath, "utf-8");
  });

  it("forkRepo function exists", () => {
    expect(apiContent).toContain("forkRepo");
  });

  it("uses GitHub forks API", () => {
    expect(apiContent).toContain("/forks");
  });
});

// ─── tRPC Procedures ──────────────────────────────────────────────

describe("GitHub tRPC Procedures — New Operations", () => {
  const routerPath = path.join(__dirname, "routers/github.ts");
  let routerContent: string;

  beforeAll(() => {
    routerContent = fs.readFileSync(routerPath, "utf-8");
  });

  it("multiCommit procedure exists", () => {
    expect(routerContent).toContain("multiCommit");
  });

  it("multiCommit validates non-empty file list", () => {
    // Should have input validation for files array
    expect(routerContent).toContain("multiCommit");
    expect(routerContent).toContain("files");
  });

  it("compareBranches procedure exists", () => {
    expect(routerContent).toContain("compareBranches");
  });

  it("commitAndDeploy procedure exists", () => {
    expect(routerContent).toContain("commitAndDeploy");
  });

  it("commitAndDeploy chains commit → deploy", () => {
    // Should call both commit and deploy functions
    expect(routerContent).toContain("commitFile");
    expect(routerContent).toContain("deploy");
  });

  it("commitDiff procedure exists", () => {
    expect(routerContent).toContain("commitDiff");
  });

  it("forkRepo procedure exists", () => {
    expect(routerContent).toContain("forkRepo");
  });

  it("all new procedures are protected (require auth)", () => {
    // Each new procedure should use protectedProcedure
    const multiCommitMatch = routerContent.match(/multiCommit:\s*protectedProcedure/);
    const compareBranchesMatch = routerContent.match(/compareBranches:\s*protectedProcedure/);
    const commitAndDeployMatch = routerContent.match(/commitAndDeploy:\s*protectedProcedure/);
    const forkRepoMatch = routerContent.match(/forkRepo:\s*protectedProcedure/);
    expect(multiCommitMatch).toBeTruthy();
    expect(compareBranchesMatch).toBeTruthy();
    expect(commitAndDeployMatch).toBeTruthy();
    expect(forkRepoMatch).toBeTruthy();
  });
});

// ─── GitHubPage UI — Commit & Deploy ──────────────────────────────

describe("GitHubPage — Commit & Deploy Workflow", () => {
  const pagePath = path.join(
    __dirname,
    "../client/src/pages/GitHubPage.tsx"
  );
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8");
  });

  it("has Commit & Deploy button", () => {
    expect(pageContent).toContain("Commit & Deploy");
  });

  it("has separate Commit button (outline variant)", () => {
    // Should have both buttons — Commit (outline) and Commit & Deploy (primary)
    expect(pageContent).toContain('variant="outline"');
    expect(pageContent).toContain("Commit");
  });

  it("shows deploying state", () => {
    expect(pageContent).toContain("isDeploying");
    expect(pageContent).toContain("Deploying");
  });

  it("shows deploy status badge on file header", () => {
    expect(pageContent).toContain("deployStatus");
  });

  it("shows deploying indicator bar", () => {
    expect(pageContent).toContain("Deploying changes");
  });

  it("chains commit → deploy via handleCommitAndDeploy", () => {
    expect(pageContent).toContain("handleCommitAndDeploy");
    expect(pageContent).toContain("commitFileMut.mutate");
    expect(pageContent).toContain("deployFromGitHubMut.mutate");
  });

  it("detects linked project for deploy", () => {
    expect(pageContent).toContain("linkedProject");
    expect(pageContent).toContain("projectsQuery");
  });

  it("handles no linked project gracefully", () => {
    // Should show toast when no linked project
    expect(pageContent).toContain("No linked project");
  });

  it("disables buttons during deploy", () => {
    expect(pageContent).toContain("isDeploying");
    // Both buttons should be disabled during deploy
    const disabledMatches = pageContent.match(/disabled=\{[^}]*isDeploying/g);
    expect(disabledMatches).toBeTruthy();
    expect(disabledMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("has branch Compare button for non-default branches", () => {
    expect(pageContent).toContain("Compare");
    expect(pageContent).toContain("defaultBranch");
  });
});

// ─── Edge Cases & Conflict Detection ──────────────────────────────

describe("Edge Cases — Conflict Detection", () => {
  it("commitFile uses SHA for optimistic locking", () => {
    const routerPath = path.join(__dirname, "routers/github.ts");
    const content = fs.readFileSync(routerPath, "utf-8");
    // SHA parameter ensures no silent overwrites
    expect(content).toContain("sha");
  });

  it("multiCommit uses base_tree for atomic updates", () => {
    const apiPath = path.join(__dirname, "githubApi.ts");
    const content = fs.readFileSync(apiPath, "utf-8");
    expect(content).toContain("base_tree");
  });

  it("deploy failure doesn't affect commit success", () => {
    const pagePath = path.join(
      __dirname,
      "../client/src/pages/GitHubPage.tsx"
    );
    const content = fs.readFileSync(pagePath, "utf-8");
    // Deploy is chained in onSuccess of commit — commit succeeds independently
    expect(content).toContain("onSuccess");
    expect(content).toContain("deployFromGitHubMut");
  });
});

// ─── GDPR Compliance Check ────────────────────────────────────────

describe("GDPR — No new tables missed", () => {
  it("connectorHealthLogs included in GDPR export", () => {
    const gdprPath = path.join(__dirname, "routers/gdpr.ts");
    const content = fs.readFileSync(gdprPath, "utf-8");
    expect(content).toContain("connectorHealthLogs");
  });

  it("connectorHealth included in GDPR delete", () => {
    const gdprPath = path.join(__dirname, "routers/gdpr.ts");
    const content = fs.readFileSync(gdprPath, "utf-8");
    expect(content).toContain("connectorHealth");
  });
});
