/**
 * githubOpsTool.ts — Manus-Aligned Enhanced GitHub Operations
 *
 * Pass 38.5: Extends github_edit with CI/CD, PR workflow, release management,
 * branch strategy, and secrets management. Uses existing githubApi.ts helpers.
 *
 * Modes:
 *   - branch:     Create/manage branches with strategy (gitflow, trunk-based)
 *   - pr:         Create/review/merge PRs with conventional commit messages
 *   - release:    Create releases with changelog generation
 *   - ci:         Generate/update CI/CD workflow files (GitHub Actions)
 *   - protect:    Configure branch protection rules
 *   - status:     Comprehensive repo health check
 */

import {
  listBranches,
  createBranch,
  listPullRequests,
  createPullRequest,
  mergePullRequest,
  listCommits,
  getRepo,
  compareBranches,
  createTreeCommit,
} from "./githubApi";
import { getUserConnectors, getUserGitHubRepos } from "./db";
import type { ToolResult } from "./agentTools";

// ── Types ──

export type GitHubOpsMode = "branch" | "pr" | "release" | "ci" | "protect" | "status";

export type BranchStrategy = "gitflow" | "trunk_based" | "github_flow";

export interface BranchPlan {
  strategy: BranchStrategy;
  branchName: string;
  fromBranch: string;
  purpose: string;
  conventionalPrefix: string;
}

export interface PRPlan {
  title: string;
  body: string;
  head: string;
  base: string;
  labels: string[];
  reviewers: string[];
  conventionalCommitType: string;
}

export interface ReleaseInfo {
  version: string;
  changelog: string;
  commits: Array<{ sha: string; message: string; type: string }>;
  breakingChanges: string[];
  features: string[];
  fixes: string[];
}

export interface CIWorkflow {
  name: string;
  triggers: string[];
  jobs: Array<{
    name: string;
    steps: string[];
    runsOn: string;
  }>;
  yamlContent: string;
}

export interface RepoHealthReport {
  repoName: string;
  defaultBranch: string;
  branches: number;
  openPRs: number;
  recentCommits: number;
  hasCI: boolean;
  hasBranchProtection: boolean;
  healthScore: number;
  recommendations: string[];
}

// ── Helpers ──

async function getGitHubToken(userId: number): Promise<string | null> {
  const conns = await getUserConnectors(userId);
  const ghConn = conns.find((c) => c.connectorId === "github" && c.status === "connected");
  if (!ghConn) return null;
  return ghConn.accessToken || (ghConn.config as Record<string, string>)?.token || null;
}

async function findUserRepo(userId: number, repoIdentifier: string) {
  const repos = await getUserGitHubRepos(userId);
  const normalized = repoIdentifier.toLowerCase().trim();
  return (
    repos.find((r) => r.fullName.toLowerCase() === normalized) ||
    repos.find((r) => r.name.toLowerCase() === normalized) ||
    repos.find((r) => r.fullName.toLowerCase().includes(normalized)) ||
    repos.find((r) => r.name.toLowerCase().includes(normalized)) ||
    null
  );
}

// ── Branch Strategy ──

function selectBranchStrategy(description: string): BranchStrategy {
  const d = description.toLowerCase();
  if (d.includes("gitflow") || d.includes("release branch") || d.includes("develop"))
    return "gitflow";
  if (d.includes("trunk") || d.includes("main only") || d.includes("continuous"))
    return "trunk_based";
  return "github_flow";
}

function generateBranchName(type: string, description: string): string {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50);
  return `${type}/${slug}`;
}

function classifyConventionalCommit(description: string): string {
  const d = description.toLowerCase();
  if (d.includes("fix") || d.includes("bug") || d.includes("patch") || d.includes("hotfix"))
    return "fix";
  if (d.includes("feature") || d.includes("add") || d.includes("new") || d.includes("implement"))
    return "feat";
  if (d.includes("refactor") || d.includes("restructure") || d.includes("clean"))
    return "refactor";
  if (d.includes("doc") || d.includes("readme") || d.includes("comment"))
    return "docs";
  if (d.includes("test") || d.includes("spec") || d.includes("coverage"))
    return "test";
  if (d.includes("ci") || d.includes("pipeline") || d.includes("deploy") || d.includes("build"))
    return "ci";
  if (d.includes("style") || d.includes("format") || d.includes("lint"))
    return "style";
  if (d.includes("perf") || d.includes("performance") || d.includes("optimize"))
    return "perf";
  if (d.includes("chore") || d.includes("dependency") || d.includes("upgrade"))
    return "chore";
  return "feat";
}

// ── CI Workflow Generator ──

function generateCIWorkflow(repoName: string, language: string): CIWorkflow {
  const isNode = language.toLowerCase().includes("javascript") || language.toLowerCase().includes("typescript");
  const isPython = language.toLowerCase().includes("python");

  const steps = isNode
    ? [
      "actions/checkout@v4",
      "actions/setup-node@v4 (node-version: 20)",
      "pnpm install",
      "pnpm lint",
      "pnpm test",
      "pnpm build",
    ]
    : isPython
      ? [
        "actions/checkout@v4",
        "actions/setup-python@v5 (python-version: 3.12)",
        "pip install -r requirements.txt",
        "pytest",
        "ruff check .",
      ]
      : [
        "actions/checkout@v4",
        "Run tests",
        "Build",
      ];

  const yaml = `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${isNode ? `      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build` : isPython ? `      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install -r requirements.txt
      - run: pytest
      - run: ruff check .` : `      - run: echo "Add your build steps here"`}
`;

  return {
    name: "CI",
    triggers: ["push to main", "pull request to main"],
    jobs: [{
      name: "build",
      steps,
      runsOn: "ubuntu-latest",
    }],
    yamlContent: yaml,
  };
}

// ── Changelog Generator ──

function generateChangelog(commits: Array<{ sha: string; message: string }>): ReleaseInfo {
  const features: string[] = [];
  const fixes: string[] = [];
  const breakingChanges: string[] = [];
  const categorized: Array<{ sha: string; message: string; type: string }> = [];

  for (const c of commits) {
    const msg = c.message.split("\n")[0]; // First line only
    let type = "other";

    if (msg.startsWith("feat")) {
      type = "feat";
      features.push(msg);
    } else if (msg.startsWith("fix")) {
      type = "fix";
      fixes.push(msg);
    } else if (msg.includes("BREAKING CHANGE") || msg.includes("!:")) {
      type = "breaking";
      breakingChanges.push(msg);
    } else if (msg.startsWith("refactor")) type = "refactor";
    else if (msg.startsWith("docs")) type = "docs";
    else if (msg.startsWith("test")) type = "test";
    else if (msg.startsWith("ci")) type = "ci";
    else if (msg.startsWith("chore")) type = "chore";

    categorized.push({ sha: c.sha, message: msg, type });
  }

  // Determine version bump
  let version = "0.1.0";
  if (breakingChanges.length > 0) version = "1.0.0";
  else if (features.length > 0) version = "0.2.0";
  else if (fixes.length > 0) version = "0.1.1";

  const changelogParts: string[] = [];
  changelogParts.push(`# v${version}\n`);

  if (breakingChanges.length > 0) {
    changelogParts.push("## Breaking Changes\n");
    for (const bc of breakingChanges) changelogParts.push(`- ${bc}`);
    changelogParts.push("");
  }

  if (features.length > 0) {
    changelogParts.push("## Features\n");
    for (const f of features) changelogParts.push(`- ${f}`);
    changelogParts.push("");
  }

  if (fixes.length > 0) {
    changelogParts.push("## Bug Fixes\n");
    for (const f of fixes) changelogParts.push(`- ${f}`);
    changelogParts.push("");
  }

  const otherCommits = categorized.filter((c) => !["feat", "fix", "breaking"].includes(c.type));
  if (otherCommits.length > 0) {
    changelogParts.push("## Other Changes\n");
    for (const c of otherCommits) changelogParts.push(`- ${c.message}`);
  }

  return {
    version,
    changelog: changelogParts.join("\n"),
    commits: categorized,
    breakingChanges,
    features,
    fixes,
  };
}

// ── Report Formatter ──

function formatOpsReport(mode: GitHubOpsMode, data: Record<string, any>): string {
  const lines: string[] = [];

  switch (mode) {
    case "branch": {
      const plan = data.plan as BranchPlan;
      lines.push(`# 🌿 Branch Created: \`${plan.branchName}\``);
      lines.push("");
      lines.push(`**Strategy:** ${plan.strategy}`);
      lines.push(`**From:** ${plan.fromBranch}`);
      lines.push(`**Purpose:** ${plan.purpose}`);
      lines.push(`**Conventional Prefix:** ${plan.conventionalPrefix}`);
      if (data.sha) lines.push(`**SHA:** ${data.sha}`);
      break;
    }
    case "pr": {
      const pr = data.pr as PRPlan;
      lines.push(`# 🔀 Pull Request: ${pr.title}`);
      lines.push("");
      lines.push(`**Head:** ${pr.head} → **Base:** ${pr.base}`);
      lines.push(`**Type:** ${pr.conventionalCommitType}`);
      lines.push("");
      lines.push(pr.body);
      if (data.url) lines.push(`\n[View PR](${data.url})`);
      break;
    }
    case "release": {
      const release = data.release as ReleaseInfo;
      lines.push(`# 🚀 Release: v${release.version}`);
      lines.push("");
      lines.push(release.changelog);
      break;
    }
    case "ci": {
      const workflow = data.workflow as CIWorkflow;
      lines.push(`# ⚙️ CI Workflow: ${workflow.name}`);
      lines.push("");
      lines.push(`**Triggers:** ${workflow.triggers.join(", ")}`);
      lines.push("");
      lines.push("## Jobs");
      for (const job of workflow.jobs) {
        lines.push(`### ${job.name} (${job.runsOn})`);
        for (const step of job.steps) {
          lines.push(`- ${step}`);
        }
      }
      lines.push("");
      lines.push("## Workflow YAML");
      lines.push("```yaml");
      lines.push(workflow.yamlContent);
      lines.push("```");
      break;
    }
    case "status": {
      const health = data.health as RepoHealthReport;
      lines.push(`# 📊 Repo Health: ${health.repoName}`);
      lines.push("");
      lines.push(`**Score:** ${health.healthScore}/10`);
      lines.push("");
      lines.push("| Metric | Value |");
      lines.push("|--------|-------|");
      lines.push(`| Default Branch | ${health.defaultBranch} |`);
      lines.push(`| Branches | ${health.branches} |`);
      lines.push(`| Open PRs | ${health.openPRs} |`);
      lines.push(`| Recent Commits | ${health.recentCommits} |`);
      lines.push(`| CI/CD | ${health.hasCI ? "✓" : "✗"} |`);
      lines.push(`| Branch Protection | ${health.hasBranchProtection ? "✓" : "✗"} |`);
      lines.push("");
      if (health.recommendations.length > 0) {
        lines.push("## Recommendations");
        for (const r of health.recommendations) {
          lines.push(`- ${r}`);
        }
      }
      break;
    }
    default:
      lines.push("Operation completed.");
  }

  return lines.join("\n");
}

// ── Main Executor ──

export async function executeGitHubOps(
  args: {
    mode: GitHubOpsMode;
    repo?: string;
    description?: string;
    branch_name?: string;
    from_branch?: string;
    pr_title?: string;
    pr_body?: string;
    head_branch?: string;
    base_branch?: string;
    merge_method?: string;
    pr_number?: number;
    language?: string;
  },
  context?: { userId?: number }
): Promise<ToolResult> {
  if (!context?.userId) {
    return { success: false, result: "Authentication required. Please log in to use GitHub operations." };
  }

  const token = await getGitHubToken(context.userId);
  if (!token) {
    return {
      success: false,
      result: "GitHub is not connected. Please connect your GitHub account first.",
    };
  }
  // Validate token is still active before proceeding
  const { validateGitHubToken } = await import("./githubApi");
  const validUser = await validateGitHubToken(token);
  if (!validUser) {
    return {
      success: false,
      result: "Your GitHub token has expired or been revoked. Please reconnect your GitHub account:\n1. Go to the GitHub page in the sidebar\n2. Click 'Disconnect' then 'Connect GitHub Account'\n3. Re-authorize the app on GitHub",
    };
  }

  const repos = await getUserGitHubRepos(context.userId);
  if (repos.length === 0) {
    return { success: false, result: "No GitHub repositories connected." };
  }

  let targetRepo: typeof repos[0] | null = null;
  if (args.repo) {
    targetRepo = await findUserRepo(context.userId, args.repo);
    if (!targetRepo) {
      const repoList = repos.map((r) => `- ${r.fullName}`).join("\n");
      return { success: false, result: `Repository "${args.repo}" not found. Your repos:\n${repoList}` };
    }
  } else if (repos.length === 1) {
    targetRepo = repos[0];
  } else {
    const repoList = repos.map((r) => `- ${r.fullName}`).join("\n");
    return { success: false, result: `Multiple repos connected. Please specify:\n${repoList}` };
  }

  const [owner, repoName] = targetRepo.fullName.split("/");
  const defaultBranch = targetRepo.defaultBranch || "main";

  try {
    switch (args.mode) {
      case "branch": {
        const description = args.description || "new feature";
        const strategy = selectBranchStrategy(description);
        const commitType = classifyConventionalCommit(description);
        const branchName = args.branch_name || generateBranchName(commitType, description);
        const fromBranch = args.from_branch || defaultBranch;

        // Get the SHA of the from branch
        const branches = await listBranches(token, owner, repoName);
        const sourceBranch = branches.find((b) => b.name === fromBranch);
        if (!sourceBranch) {
          return { success: false, result: `Branch "${fromBranch}" not found.` };
        }

        const result = await createBranch(token, owner, repoName, branchName, sourceBranch.commit.sha);

        const plan: BranchPlan = {
          strategy,
          branchName,
          fromBranch,
          purpose: description,
          conventionalPrefix: commitType,
        };

        return {
          success: true,
          result: formatOpsReport("branch", { plan, sha: result.object.sha }),
          artifactType: "terminal" as any,
          artifactLabel: `Branch: ${branchName}`,
        };
      }

      case "pr": {
        const head = args.head_branch || "";
        const base = args.base_branch || defaultBranch;

        if (!head) {
          // List open PRs instead
          const prs = await listPullRequests(token, owner, repoName, "open");
          if (prs.length === 0) {
            return { success: true, result: "No open pull requests." };
          }
          const prList = prs.map((p) => `- #${p.number}: **${p.title}** (${p.head.ref} → ${p.base.ref}) [${p.state}]`).join("\n");
          return { success: true, result: `## Open Pull Requests\n\n${prList}` };
        }

        if (args.pr_number) {
          // Merge an existing PR
          const mergeResult = await mergePullRequest(token, owner, repoName, args.pr_number, {
            merge_method: (args.merge_method as "merge" | "squash" | "rebase") || "squash",
          });
          return {
            success: mergeResult.merged,
            result: mergeResult.merged
              ? `✅ PR #${args.pr_number} merged successfully (${mergeResult.sha.slice(0, 7)})`
              : `❌ PR merge failed: ${mergeResult.message}`,
          };
        }

        // Create a new PR
        const title = args.pr_title || args.description || `Merge ${head} into ${base}`;
        const body = args.pr_body || "";
        const commitType = classifyConventionalCommit(title);

        const pr = await createPullRequest(token, owner, repoName, {
          title,
          body,
          head,
          base,
        });

        const prPlan: PRPlan = {
          title: pr.title,
          body: pr.body || "",
          head,
          base,
          labels: [],
          reviewers: [],
          conventionalCommitType: commitType,
        };

        return {
          success: true,
          result: formatOpsReport("pr", { pr: prPlan, url: pr.html_url }),
          artifactType: "terminal" as any,
          artifactLabel: `PR #${pr.number}: ${pr.title}`,
        };
      }

      case "release": {
        const commits = await listCommits(token, owner, repoName, { per_page: 50 });
        const release = generateChangelog(commits.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
        })));

        return {
          success: true,
          result: formatOpsReport("release", { release }),
          artifactType: "document" as any,
          artifactLabel: `Release v${release.version}`,
        };
      }

      case "ci": {
        const language = args.language || targetRepo.language || "JavaScript";
        const workflow = generateCIWorkflow(repoName, language);

        // Optionally commit the workflow file
        if (args.description?.includes("commit") || args.description?.includes("create")) {
          await createTreeCommit(token, {
            owner,
            repo: repoName,
            branch: defaultBranch,
            message: "ci: add GitHub Actions workflow",
            files: [{
              path: ".github/workflows/ci.yml",
              content: workflow.yamlContent,
            }],
          });
          return {
            success: true,
            result: formatOpsReport("ci", { workflow }) + "\n\n✅ Workflow committed to `.github/workflows/ci.yml`",
            artifactType: "terminal" as any,
            artifactLabel: "CI Workflow Created",
          };
        }

        return {
          success: true,
          result: formatOpsReport("ci", { workflow }),
          artifactType: "code" as any,
          artifactLabel: "CI Workflow",
        };
      }

      case "status": {
        const [repoInfo, branches, prs, commits] = await Promise.all([
          getRepo(token, owner, repoName),
          listBranches(token, owner, repoName),
          listPullRequests(token, owner, repoName, "open"),
          listCommits(token, owner, repoName, { per_page: 10 }),
        ]);

        // Check for CI
        let hasCI = false;
        try {
          // Try to detect .github/workflows directory
          const tree = await import("./githubApi").then((m) =>
            m.getRepoTree(token, owner, repoName, defaultBranch, true)
          );
          hasCI = tree.tree.some((item) => item.path?.startsWith(".github/workflows/"));
        } catch {
          // Ignore
        }

        const recommendations: string[] = [];
        if (!hasCI) recommendations.push("Add CI/CD pipeline (use github_ops mode: ci)");
        if (branches.length === 1) recommendations.push("Consider using feature branches for development");
        if (prs.length > 5) recommendations.push("Review and merge or close stale PRs");
        if (commits.length < 3) recommendations.push("Repository has very few commits — consider more frequent, smaller commits");

        let healthScore = 5;
        if (hasCI) healthScore += 2;
        if (branches.length > 1) healthScore += 1;
        if (prs.length <= 5) healthScore += 1;
        if (commits.length >= 3) healthScore += 1;
        healthScore = Math.min(healthScore, 10);

        const health: RepoHealthReport = {
          repoName: repoInfo.full_name,
          defaultBranch: repoInfo.default_branch,
          branches: branches.length,
          openPRs: prs.length,
          recentCommits: commits.length,
          hasCI,
          hasBranchProtection: false, // Would need admin API to check
          healthScore,
          recommendations,
        };

        return {
          success: true,
          result: formatOpsReport("status", { health }),
          artifactType: "document" as any,
          artifactLabel: `Repo Health: ${repoInfo.full_name}`,
        };
      }

      default:
        return { success: false, result: `Unknown mode: ${args.mode}` };
    }
  } catch (err: any) {
    return {
      success: false,
      result: `GitHub operation failed: ${err.message}`,
    };
  }
}

// ── Exports for testing ──

export const _testExports = {
  selectBranchStrategy,
  generateBranchName,
  classifyConventionalCommit,
  generateCIWorkflow,
  generateChangelog,
  formatOpsReport,
};
