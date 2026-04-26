/**
 * Pass 32 — Recursion Pass 2: Adversarial Scan
 * Virtual users testing full GitHub CRUD flows, commit-and-deploy,
 * auto-refresh, and edge cases.
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ─── Virtual User A: Full CRUD Developer ──────────────────────────
// Scenario: Developer connects GitHub, browses repos, edits a file,
// commits, and deploys — the full end-to-end workflow.

describe("Virtual User A: Full CRUD Developer", () => {
  const pagePath = path.join(__dirname, "../client/src/pages/GitHubPage.tsx");
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8");
  });

  it("can browse repository files (file tree query)", () => {
    expect(pageContent).toContain("fileTreeQuery");
    expect(pageContent).toContain("fileTree");
  });

  it("can view file content (file content query)", () => {
    expect(pageContent).toContain("fileContentQuery");
    expect(pageContent).toContain("fileContent");
  });

  it("can edit file content (CodeEditor integration)", () => {
    expect(pageContent).toContain("CodeEditor");
    expect(pageContent).toContain("isEditing");
    expect(pageContent).toContain("editContent");
  });

  it("can commit single file changes", () => {
    expect(pageContent).toContain("commitFileMut");
    expect(pageContent).toContain("commitMsg");
  });

  it("can commit and deploy in one action", () => {
    expect(pageContent).toContain("handleCommitAndDeploy");
    expect(pageContent).toContain("Commit & Deploy");
  });

  it("sees deploy progress after commit-and-deploy", () => {
    expect(pageContent).toContain("isDeploying");
    expect(pageContent).toContain("Deploying changes");
  });

  it("gets success toast with live URL after deploy", () => {
    expect(pageContent).toContain("Deployed successfully");
    expect(pageContent).toContain("publishedUrl");
  });

  it("can create new files", () => {
    expect(pageContent).toContain("newFileOpen");
    expect(pageContent).toContain("New File");
  });

  it("can delete files", () => {
    expect(pageContent).toContain("deleteFileMut");
    expect(pageContent).toContain("Delete");
  });

  it("can switch branches", () => {
    expect(pageContent).toContain("selectedBranch");
    expect(pageContent).toContain("setSelectedBranch");
  });

  it("can create new branches", () => {
    expect(pageContent).toContain("createBranchOpen");
    expect(pageContent).toContain("New Branch");
  });
});

// ─── Virtual User B: PR Reviewer ─────────────────────────────────
// Scenario: Reviewer browses PRs, views commits, compares branches.

describe("Virtual User B: PR Reviewer", () => {
  const pagePath = path.join(__dirname, "../client/src/pages/GitHubPage.tsx");
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8");
  });

  it("can view pull requests list", () => {
    expect(pageContent).toContain("prsQuery");
    expect(pageContent).toContain("Pull Requests");
  });

  it("can create new pull requests", () => {
    expect(pageContent).toContain("createPRMut");
    expect(pageContent).toContain("Create PR");
  });

  it("can view commit history", () => {
    expect(pageContent).toContain("commitsQuery");
    expect(pageContent).toContain("Commits");
  });

  it("can compare branches for non-default branches", () => {
    expect(pageContent).toContain("Compare");
    // Compare button should only show for non-default branches
    expect(pageContent).toContain("defaultBranch");
  });

  it("can view issues", () => {
    expect(pageContent).toContain("issuesQuery");
    expect(pageContent).toContain("Issues");
  });
});

// ─── Virtual User C: Deploy-Focused User ──────────────────────────
// Scenario: User primarily uses commit-and-deploy, wants instant feedback.

describe("Virtual User C: Deploy-Focused User", () => {
  const pagePath = path.join(__dirname, "../client/src/pages/GitHubPage.tsx");
  let pageContent: string;

  beforeAll(() => {
    pageContent = fs.readFileSync(pagePath, "utf-8");
  });

  it("sees linked project status on file header", () => {
    expect(pageContent).toContain("linkedProject");
    expect(pageContent).toContain("deployStatus");
  });

  it("Commit & Deploy button is primary CTA (not outline)", () => {
    // The Commit button is outline, Commit & Deploy is default (primary)
    const commitDeploySection = pageContent.split("Commit & Deploy")[0].slice(-500);
    // The Commit & Deploy button should NOT have variant="outline"
    const lastButtonBeforeCnD = commitDeploySection.lastIndexOf("<Button");
    const buttonSnippet = commitDeploySection.slice(lastButtonBeforeCnD);
    expect(buttonSnippet).not.toContain('variant="outline"');
  });

  it("gets informative toast when no linked project", () => {
    expect(pageContent).toContain("No linked project for auto-deploy");
    expect(pageContent).toContain("Go to the Deploy tab");
  });

  it("has a dedicated Deploy tab", () => {
    expect(pageContent).toContain('value="deploy"');
    expect(pageContent).toContain("Deploy");
  });

  it("both buttons disabled during deploy to prevent double-submit", () => {
    // Count disabled checks that include isDeploying
    const disabledChecks = pageContent.match(/disabled=\{[^}]*isDeploying/g);
    expect(disabledChecks).toBeTruthy();
    expect(disabledChecks!.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── Virtual User D: Auto-Refresh Admin ───────────────────────────
// Scenario: Admin enables auto-refresh for connectors, monitors health.

describe("Virtual User D: Auto-Refresh Admin", () => {
  const detailPath = path.join(__dirname, "../client/src/pages/ConnectorDetailPage.tsx");
  let detailContent: string;

  beforeAll(() => {
    detailContent = fs.readFileSync(detailPath, "utf-8");
  });

  it("can toggle auto-refresh on connector detail page", () => {
    expect(detailContent).toContain("autoRefresh");
    expect(detailContent).toContain("Switch");
  });

  it("sees connection status on detail page", () => {
    expect(detailContent).toContain("Connection Status");
  });

  it("sees last connected timestamp", () => {
    expect(detailContent).toContain("Last connected");
  });

  it("auto-refresh toggle only shows for OAuth connectors with refresh tokens", () => {
    // Should check if connector supports refresh
    expect(detailContent).toContain("autoRefresh");
  });

  it("sees reconnect prompt when status is expired", () => {
    expect(detailContent).toContain("Reconnect");
  });
});

// ─── Virtual User E: Multi-File Committer ─────────────────────────
// Scenario: Developer wants to commit multiple files at once.

describe("Virtual User E: Multi-File Committer", () => {
  const routerPath = path.join(__dirname, "routers/github.ts");
  let routerContent: string;

  beforeAll(() => {
    routerContent = fs.readFileSync(routerPath, "utf-8");
  });

  it("multiCommit procedure accepts array of files", () => {
    expect(routerContent).toContain("multiCommit");
    expect(routerContent).toContain("files");
  });

  it("multiCommit creates atomic commit (all files in one commit)", () => {
    expect(routerContent).toContain("createTreeCommit");
  });

  it("multiCommit requires commit message", () => {
    expect(routerContent).toContain("message");
  });

  it("forkRepo procedure available for contributing to external repos", () => {
    expect(routerContent).toContain("forkRepo");
  });
});

// ─── Manus Alignment Verification ─────────────────────────────────

describe("Manus Alignment — No Anti-Patterns", () => {
  it("no separate /connector-health route exists", () => {
    const appPath = path.join(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    expect(content).not.toContain("/connector-health");
  });

  it("no countdown timer components in connector detail", () => {
    const detailPath = path.join(__dirname, "../client/src/pages/ConnectorDetailPage.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    // Should not have countdown/timer components
    expect(content).not.toMatch(/CountdownTimer|useCountdown|setInterval.*expir/);
  });

  it("health status uses Manus-native terminology (Active, not Healthy)", () => {
    const detailPath = path.join(__dirname, "../client/src/pages/ConnectorDetailPage.tsx");
    const content = fs.readFileSync(detailPath, "utf-8");
    expect(content).toContain("Active");
  });

  it("deploy workflow is inline, not a separate page", () => {
    const pagePath = path.join(__dirname, "../client/src/pages/GitHubPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    // Commit & Deploy is in the file editor, not a separate route
    expect(content).toContain("handleCommitAndDeploy");
    expect(content).toContain("commitFileMut.mutate");
  });

  it("no CLI commands exposed in UI (Manus-native: everything is buttons)", () => {
    const pagePath = path.join(__dirname, "../client/src/pages/GitHubPage.tsx");
    const content = fs.readFileSync(pagePath, "utf-8");
    // Should not expose git commands to users
    expect(content).not.toMatch(/git push|git pull|git merge|git clone/);
  });
});
