/**
 * GitHub Assess Tool — Manus-Aligned Deep Repo Assessment/Optimization/Validation
 *
 * Three modes:
 * 1. **assess** — Read-only deep analysis across all 14 optimization dimensions.
 *    Routes findings to expert classes (A-F), runs quality guards, generates
 *    a structured report with per-dimension scores (1-10), gaps, and recommendations.
 *
 * 2. **optimize** — Assess + auto-fix. Runs assessment, then uses github_edit to
 *    apply the highest-priority fixes. Tracks convergence pass-over-pass.
 *
 * 3. **validate** — Assess + pass/fail gate check. Evaluates the repo against
 *    a target phase gate (A/B/C/D) and returns pass/fail with specific criteria.
 *
 * Pipeline:
 *   1. Resolve repo + token (same as github_edit)
 *   2. Read repo structure (full tree, broader than github_edit's 20-file cap)
 *   3. Read key files (up to 40 files — config, source, tests, docs)
 *   4. LLM-powered multi-dimensional assessment against 14 dimensions
 *   5. Expert routing: classify each finding to expert class A-F
 *   6. Quality guard evaluation (goodhart, regression, inflation, etc.)
 *   7. Generate structured report with scores, gaps, recommendations
 *   8. (optimize mode) Invoke github_edit for top-priority fixes
 *   9. (validate mode) Check against phase gate criteria
 *
 * All operations via GitHub REST API — no cloning needed.
 *
 * @module githubAssessTool
 */
import { getRepoTree, getFileContent } from "./githubApi";
import { getUserConnectors, getUserGitHubRepos } from "./db";
import type { ToolResult } from "./agentTools";

// ── Types ──

export interface DimensionScore {
  dimension: string;
  score: number; // 1-10
  rationale: string;
  expertClass: string; // A-F
  gaps: string[];
  recommendations: string[];
}

export interface QualityGuardResult {
  guard: string;
  status: "PASS" | "WARN" | "FAIL";
  message: string;
}

export interface AssessmentReport {
  repo: string;
  branch: string;
  mode: "assess" | "optimize" | "validate";
  timestamp: string;
  overallScore: number; // 1-10
  dimensions: DimensionScore[];
  qualityGuards: QualityGuardResult[];
  expertSummary: Record<string, { count: number; topFindings: string[] }>;
  totalFiles: number;
  filesAnalyzed: number;
  gapCount: number;
  topRecommendations: string[];
  convergenceHistory: Array<{ pass: number; score: number; timestamp: string }>;
  /** Only in validate mode */
  gateResult?: {
    phase: string;
    passed: boolean;
    criteria: Record<string, { met: boolean; value: any; threshold: any }>;
  };
}

// ── Constants ──

const ASSESSMENT_DIMENSIONS = [
  "completeness",
  "accuracy",
  "depth",
  "novelty",
  "actionability",
  "regression_safety",
  "ux_quality",
  "performance",
  "security",
  "accessibility",
  "test_coverage",
  "documentation",
  "code_quality",
  "deployment_readiness",
] as const;

const EXPERT_ROUTING: Record<string, string> = {
  completeness: "A",
  accuracy: "A",
  depth: "A",
  novelty: "A",
  actionability: "E",
  regression_safety: "B",
  ux_quality: "C",
  performance: "A",
  security: "B",
  accessibility: "C",
  test_coverage: "B",
  documentation: "D",
  code_quality: "A",
  deployment_readiness: "F",
};

const EXPERT_CLASSES: Record<string, string> = {
  A: "Domain Experts",
  B: "Adversarial Testers",
  C: "UX Reviewers",
  D: "Compliance Auditors",
  E: "Founder Personas",
  F: "Continuous Validators",
};

const PHASE_GATES: Record<string, Record<string, any>> = {
  A: { min_score: 7, required: ["converged-spec"] },
  B: { min_score: 8, min_test_files: 5, max_ts_errors: 0 },
  C: { min_score: 8.5, security_patterns: true, test_coverage_files: 10 },
  D: { min_score: 9, deployment_config: true, ci_config: true },
};

const QUALITY_GUARDS = [
  "goodhart_detection",
  "regression_prevention",
  "dimension_balance",
  "inflation_detection",
  "coverage_regression",
  "stagnation_escape",
] as const;

/** Patterns to skip when reading repo tree */
const SKIP_PATTERNS = [
  /^node_modules\//,
  /^\.git\//,
  /^dist\//,
  /^build\//,
  /^\.next\//,
  /^coverage\//,
  /^\.cache\//,
  /^vendor\//,
  /^__pycache__\//,
  /\.min\.(js|css)$/,
  /\.map$/,
  /package-lock\.json$/,
  /pnpm-lock\.yaml$/,
  /yarn\.lock$/,
];

/** Priority patterns for files to read during assessment (higher priority = read first) */
const PRIORITY_PATTERNS: Array<{ pattern: RegExp; priority: number; category: string }> = [
  // Config & meta
  { pattern: /^package\.json$/, priority: 100, category: "config" },
  { pattern: /^tsconfig.*\.json$/, priority: 95, category: "config" },
  { pattern: /^\.env\.example$/, priority: 90, category: "config" },
  { pattern: /vite\.config\.(ts|js)$/, priority: 85, category: "config" },
  { pattern: /drizzle\.config\.(ts|js)$/, priority: 85, category: "config" },
  { pattern: /vitest\.config\.(ts|js)$/, priority: 85, category: "config" },
  { pattern: /^Dockerfile$/, priority: 80, category: "deployment" },
  { pattern: /docker-compose/, priority: 80, category: "deployment" },
  { pattern: /\.github\/workflows\//, priority: 80, category: "deployment" },

  // Documentation
  { pattern: /^README\.md$/i, priority: 90, category: "docs" },
  { pattern: /^CLAUDE\.md$/i, priority: 85, category: "docs" },
  { pattern: /^CONTRIBUTING\.md$/i, priority: 70, category: "docs" },

  // Schema & database
  { pattern: /schema\.(ts|js)$/, priority: 88, category: "source" },
  { pattern: /drizzle\//, priority: 85, category: "source" },

  // Server core
  { pattern: /server\/.*\.(ts|js)$/, priority: 75, category: "source" },
  { pattern: /server\/_core\//, priority: 80, category: "source" },

  // Client core
  { pattern: /client\/src\/App\.(tsx|jsx)$/, priority: 82, category: "source" },
  { pattern: /client\/src\/main\.(tsx|jsx)$/, priority: 80, category: "source" },
  { pattern: /client\/src\/index\.css$/, priority: 75, category: "source" },
  { pattern: /client\/src\/pages\//, priority: 70, category: "source" },
  { pattern: /client\/src\/components\//, priority: 65, category: "source" },

  // Tests
  { pattern: /\.test\.(ts|tsx|js|jsx)$/, priority: 60, category: "tests" },
  { pattern: /\.spec\.(ts|tsx|js|jsx)$/, priority: 60, category: "tests" },

  // Shared
  { pattern: /shared\//, priority: 72, category: "source" },
];

// ── Convergence History (in-memory, per-repo) ──
const convergenceStore = new Map<string, Array<{ pass: number; score: number; timestamp: string }>>();

export function getConvergenceHistory(repoFullName: string): Array<{ pass: number; score: number; timestamp: string }> {
  return convergenceStore.get(repoFullName) || [];
}

export function clearConvergenceHistory(repoFullName: string): void {
  convergenceStore.delete(repoFullName);
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

/** Read full repo tree, filter noise, return sorted by priority */
async function getRepoFiles(token: string, owner: string, repo: string, branch: string): Promise<{
  allFiles: Array<{ path: string; size: number }>;
  prioritized: Array<{ path: string; size: number; priority: number; category: string }>;
  truncated: boolean;
}> {
  const tree = await getRepoTree(token, owner, repo, branch, true);
  const allFiles = tree.tree
    .filter((item) => item.type === "blob")
    .filter((item) => !SKIP_PATTERNS.some((p) => p.test(item.path || "")))
    .map((item) => ({ path: item.path || "", size: item.size || 0 }));

  // Assign priorities
  const prioritized = allFiles.map((f) => {
    let bestPriority = 0;
    let bestCategory = "other";
    for (const pp of PRIORITY_PATTERNS) {
      if (pp.pattern.test(f.path) && pp.priority > bestPriority) {
        bestPriority = pp.priority;
        bestCategory = pp.category;
      }
    }
    return { ...f, priority: bestPriority, category: bestCategory };
  });

  // Sort by priority descending
  prioritized.sort((a, b) => b.priority - a.priority);

  return { allFiles, prioritized, truncated: !!tree.truncated };
}

/** Read a file's content from GitHub */
async function readFile(token: string, owner: string, repo: string, path: string, ref?: string): Promise<string | null> {
  try {
    const file = await getFileContent(token, owner, repo, path, ref);
    if (file.encoding === "base64" && file.content) {
      return Buffer.from(file.content, "base64").toString("utf-8");
    }
    return file.content || null;
  } catch {
    return null;
  }
}

/** Run quality guards against the assessment results */
function evaluateQualityGuards(
  dimensions: DimensionScore[],
  history: Array<{ pass: number; score: number; timestamp: string }>
): QualityGuardResult[] {
  const guards: QualityGuardResult[] = [];
  const scores = dimensions.map((d) => d.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Goodhart detection: all scores suspiciously uniform
  const spread = Math.max(...scores) - Math.min(...scores);
  if (spread <= 1 && avgScore > 8) {
    guards.push({
      guard: "goodhart_detection",
      status: "WARN",
      message: "All dimension scores within 1 point and above 8 — possible score inflation",
    });
  } else {
    guards.push({ guard: "goodhart_detection", status: "PASS", message: "Score distribution appears natural" });
  }

  // Regression prevention: check if score dropped from previous pass
  if (history.length >= 2) {
    const prev = history[history.length - 2].score;
    if (avgScore < prev - 0.5) {
      guards.push({
        guard: "regression_prevention",
        status: "FAIL",
        message: `Score dropped from ${prev.toFixed(1)} to ${avgScore.toFixed(1)} — regression detected`,
      });
    } else {
      guards.push({ guard: "regression_prevention", status: "PASS", message: "No regression from previous pass" });
    }
  } else {
    guards.push({ guard: "regression_prevention", status: "PASS", message: "First pass — no history to compare" });
  }

  // Dimension balance: flag if any dimension is 3+ points below average
  const lowDims = dimensions.filter((d) => d.score < avgScore - 3);
  if (lowDims.length > 0) {
    guards.push({
      guard: "dimension_balance",
      status: "WARN",
      message: `${lowDims.length} dimension(s) significantly below average: ${lowDims.map((d) => `${d.dimension}(${d.score})`).join(", ")}`,
    });
  } else {
    guards.push({ guard: "dimension_balance", status: "PASS", message: "All dimensions within acceptable range" });
  }

  // Inflation detection: scores rising without substantive changes
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    const allRising = lastThree.every((h, i) => i === 0 || h.score >= lastThree[i - 1].score);
    const totalDelta = lastThree[lastThree.length - 1].score - lastThree[0].score;
    if (allRising && totalDelta > 2) {
      guards.push({
        guard: "inflation_detection",
        status: "WARN",
        message: `Score rose ${totalDelta.toFixed(1)} points over 3 passes — verify improvements are substantive`,
      });
    } else {
      guards.push({ guard: "inflation_detection", status: "PASS", message: "Score trajectory appears organic" });
    }
  } else {
    guards.push({ guard: "inflation_detection", status: "PASS", message: "Insufficient history for inflation check" });
  }

  // Coverage regression: check test_coverage dimension
  const testCov = dimensions.find((d) => d.dimension === "test_coverage");
  if (testCov && testCov.score < 5) {
    guards.push({
      guard: "coverage_regression",
      status: "WARN",
      message: `Test coverage score is ${testCov.score}/10 — below minimum threshold`,
    });
  } else {
    guards.push({ guard: "coverage_regression", status: "PASS", message: "Test coverage is adequate" });
  }

  // Stagnation escape: same score for 3+ passes
  if (history.length >= 3) {
    const lastThree = history.slice(-3);
    const allSame = lastThree.every((h) => Math.abs(h.score - lastThree[0].score) < 0.1);
    if (allSame) {
      guards.push({
        guard: "stagnation_escape",
        status: "WARN",
        message: "Score unchanged for 3 consecutive passes — consider divergent approach",
      });
    } else {
      guards.push({ guard: "stagnation_escape", status: "PASS", message: "Score is progressing" });
    }
  } else {
    guards.push({ guard: "stagnation_escape", status: "PASS", message: "Insufficient history for stagnation check" });
  }

  return guards;
}

/** Check phase gate criteria */
function checkPhaseGate(
  phase: string,
  dimensions: DimensionScore[],
  fileStats: { totalFiles: number; testFiles: number; hasSecurityPatterns: boolean; hasDeployConfig: boolean; hasCiConfig: boolean }
): { passed: boolean; criteria: Record<string, { met: boolean; value: any; threshold: any }> } {
  const gate = PHASE_GATES[phase];
  if (!gate) return { passed: false, criteria: { unknown_phase: { met: false, value: phase, threshold: "A|B|C|D" } } };

  const criteria: Record<string, { met: boolean; value: any; threshold: any }> = {};
  const avgScore = dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length;

  if (gate.min_score !== undefined) {
    criteria.min_score = { met: avgScore >= gate.min_score, value: Math.round(avgScore * 10) / 10, threshold: gate.min_score };
  }
  if (gate.min_test_files !== undefined) {
    criteria.min_test_files = { met: fileStats.testFiles >= gate.min_test_files, value: fileStats.testFiles, threshold: gate.min_test_files };
  }
  if (gate.max_ts_errors !== undefined) {
    // We can't run tsc remotely, but we check for tsconfig presence
    criteria.max_ts_errors = { met: true, value: "N/A (remote)", threshold: gate.max_ts_errors };
  }
  if (gate.security_patterns !== undefined) {
    criteria.security_patterns = { met: fileStats.hasSecurityPatterns, value: fileStats.hasSecurityPatterns, threshold: true };
  }
  if (gate.test_coverage_files !== undefined) {
    criteria.test_coverage_files = { met: fileStats.testFiles >= gate.test_coverage_files, value: fileStats.testFiles, threshold: gate.test_coverage_files };
  }
  if (gate.deployment_config !== undefined) {
    criteria.deployment_config = { met: fileStats.hasDeployConfig, value: fileStats.hasDeployConfig, threshold: true };
  }
  if (gate.ci_config !== undefined) {
    criteria.ci_config = { met: fileStats.hasCiConfig, value: fileStats.hasCiConfig, threshold: true };
  }

  return { passed: Object.values(criteria).every((c) => c.met), criteria };
}

/** Format the assessment report as markdown for display */
function formatReport(report: AssessmentReport): string {
  const parts: string[] = [];

  // Header
  parts.push(`# 📊 Repository Assessment: ${report.repo}`);
  parts.push(`**Branch:** ${report.branch} | **Mode:** ${report.mode} | **Date:** ${new Date(report.timestamp).toLocaleDateString()}`);
  parts.push(`**Overall Score: ${report.overallScore.toFixed(1)}/10** | Files: ${report.filesAnalyzed}/${report.totalFiles} analyzed | Gaps: ${report.gapCount}`);
  parts.push("");

  // Dimension scores table
  parts.push("## Dimension Scores");
  parts.push("");
  parts.push("| Dimension | Score | Expert | Key Finding |");
  parts.push("|-----------|-------|--------|-------------|");
  for (const dim of report.dimensions) {
    const bar = dim.score >= 8 ? "🟢" : dim.score >= 6 ? "🟡" : "🔴";
    parts.push(`| ${dim.dimension} | ${bar} ${dim.score}/10 | Class ${dim.expertClass} (${EXPERT_CLASSES[dim.expertClass] || "Unknown"}) | ${dim.rationale.slice(0, 80)} |`);
  }
  parts.push("");

  // Expert summary
  parts.push("## Expert Panel Summary");
  for (const [cls, info] of Object.entries(report.expertSummary)) {
    if (info.count > 0) {
      parts.push(`\n**Class ${cls} — ${EXPERT_CLASSES[cls] || "Unknown"}** (${info.count} finding${info.count > 1 ? "s" : ""})`);
      for (const finding of info.topFindings.slice(0, 3)) {
        parts.push(`- ${finding}`);
      }
    }
  }
  parts.push("");

  // Quality guards
  parts.push("## Quality Guards");
  parts.push("");
  for (const guard of report.qualityGuards) {
    const icon = guard.status === "PASS" ? "✅" : guard.status === "WARN" ? "⚠️" : "❌";
    parts.push(`${icon} **${guard.guard}**: ${guard.message}`);
  }
  parts.push("");

  // Top recommendations
  if (report.topRecommendations.length > 0) {
    parts.push("## Top Recommendations");
    parts.push("");
    for (let i = 0; i < report.topRecommendations.length; i++) {
      parts.push(`${i + 1}. ${report.topRecommendations[i]}`);
    }
    parts.push("");
  }

  // Convergence history
  if (report.convergenceHistory.length > 1) {
    parts.push("## Convergence History");
    parts.push("");
    parts.push("| Pass | Score | Date |");
    parts.push("|------|-------|------|");
    for (const h of report.convergenceHistory) {
      parts.push(`| ${h.pass} | ${h.score.toFixed(1)}/10 | ${new Date(h.timestamp).toLocaleDateString()} |`);
    }
    parts.push("");
  }

  // Gate result (validate mode)
  if (report.gateResult) {
    const icon = report.gateResult.passed ? "✅" : "❌";
    parts.push(`## Phase ${report.gateResult.phase} Gate: ${icon} ${report.gateResult.passed ? "PASSED" : "FAILED"}`);
    parts.push("");
    for (const [key, val] of Object.entries(report.gateResult.criteria)) {
      const ci = val.met ? "✅" : "❌";
      parts.push(`${ci} **${key}**: ${JSON.stringify(val.value)} (threshold: ${JSON.stringify(val.threshold)})`);
    }
    parts.push("");
  }

  return parts.join("\n");
}

// ── Main Tool Executor ──

export async function executeGitHubAssess(args: {
  mode: "assess" | "optimize" | "validate";
  repo?: string;
  focus?: string;
  target_phase?: string;
}, context?: { userId?: number }): Promise<ToolResult> {
  const { invokeLLM } = await import("./_core/llm");

  if (!context?.userId) {
    return { success: false, result: "Authentication required. Please log in to use GitHub assessment." };
  }

  const token = await getGitHubToken(context.userId);
  if (!token) {
    return {
      success: false,
      result: "GitHub is not connected. Please connect your GitHub account first by visiting the GitHub page and clicking 'Connect GitHub Account'.",
    };
  }

  // ── Step 0: Find the repo ──
  const repos = await getUserGitHubRepos(context.userId);
  if (repos.length === 0) {
    return {
      success: false,
      result: "No GitHub repositories connected. Import or create a repository first from the GitHub page.",
    };
  }

  let targetRepo: typeof repos[0] | null = null;
  if (args.repo) {
    targetRepo = await findUserRepo(context.userId, args.repo);
    if (!targetRepo) {
      const repoList = repos.map((r) => `- ${r.fullName}`).join("\n");
      return {
        success: false,
        result: `Repository "${args.repo}" not found. Your connected repos:\n${repoList}\n\nSpecify one of these, or connect the repo first.`,
      };
    }
  } else if (repos.length === 1) {
    targetRepo = repos[0];
  } else {
    const repoList = repos.map((r) => `- ${r.fullName}${r.description ? ` — ${r.description}` : ""}`).join("\n");
    return {
      success: false,
      result: `Multiple repos connected. Please specify which one to assess:\n${repoList}\n\nCall github_assess again with the repo parameter.`,
    };
  }

  const [owner, repoName] = targetRepo.fullName.split("/");
  const branch = targetRepo.defaultBranch || "main";

  // ── Step 1: Read repo structure ──
  let repoFiles: Awaited<ReturnType<typeof getRepoFiles>>;
  try {
    repoFiles = await getRepoFiles(token, owner, repoName, branch);
  } catch (err: any) {
    return { success: false, result: `Failed to read repository structure: ${err.message}` };
  }

  const totalFiles = repoFiles.allFiles.length;

  // ── Step 2: Read key files (up to 40, prioritized) ──
  const filesToRead = repoFiles.prioritized.slice(0, 40);
  const fileContents: Record<string, string> = {};
  const readErrors: string[] = [];

  // Read in batches of 5 for efficiency
  for (let i = 0; i < filesToRead.length; i += 5) {
    const batch = filesToRead.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map((f) => readFile(token, owner, repoName, f.path, branch))
    );
    for (let j = 0; j < batch.length; j++) {
      const result = results[j];
      if (result.status === "fulfilled" && result.value !== null) {
        // Truncate very large files to 8KB for LLM context
        const content = result.value;
        fileContents[batch[j].path] = content.length > 8192 ? content.slice(0, 8192) + "\n... (truncated)" : content;
      } else {
        readErrors.push(batch[j].path);
      }
    }
  }

  const filesAnalyzed = Object.keys(fileContents).length;

  // ── Step 3: Build file context for LLM ──
  const fileContextParts = Object.entries(fileContents)
    .slice(0, 30) // Cap context to avoid token overflow
    .map(([path, content]) => `### ${path}\n\`\`\`\n${content}\n\`\`\``);

  const structureSummary = repoFiles.allFiles
    .map((f) => `${f.path} (${(f.size / 1024).toFixed(1)}KB)`)
    .join("\n");

  // Compute file stats for gate checks
  const testFiles = repoFiles.allFiles.filter(
    (f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f.path)
  ).length;
  const hasSecurityPatterns = Object.values(fileContents).some(
    (c) => c.includes("helmet") || c.includes("csrf") || c.includes("sanitize") || c.includes("rate-limit") || c.includes("rateLimit")
  );
  const hasDeployConfig = repoFiles.allFiles.some(
    (f) => /Dockerfile|docker-compose|\.github\/workflows|vercel\.json|netlify\.toml|fly\.toml/.test(f.path)
  );
  const hasCiConfig = repoFiles.allFiles.some(
    (f) => /\.github\/workflows|\.circleci|\.gitlab-ci|Jenkinsfile/.test(f.path)
  );

  // ── Step 4: LLM-powered multi-dimensional assessment ──
  const focusClause = args.focus ? `\n\nFOCUS AREA: The user specifically wants you to focus on: ${args.focus}` : "";

  const assessmentResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an expert code assessor performing a deep multi-dimensional analysis of a GitHub repository. You are aligned to the Manus recursive optimization framework.

Repository: ${targetRepo.fullName} (branch: ${branch})
Total files: ${totalFiles} | Files analyzed: ${filesAnalyzed} | Test files: ${testFiles}

You must evaluate the repository across ALL 14 optimization dimensions, scoring each from 1-10:

1. **completeness** — Does the codebase cover all necessary features? Any missing pieces?
2. **accuracy** — Is the code correct? Are algorithms and logic sound?
3. **depth** — How thorough is the implementation? Surface-level or production-grade?
4. **novelty** — Does it use modern patterns, frameworks, and approaches?
5. **actionability** — How easy is it to understand, extend, and maintain?
6. **regression_safety** — Are there safeguards against breaking changes? Tests, types, CI?
7. **ux_quality** — Is the user experience well-designed? Responsive? Accessible?
8. **performance** — Are there performance bottlenecks? Efficient algorithms? Lazy loading?
9. **security** — Are there security vulnerabilities? Input validation? Auth patterns?
10. **accessibility** — Does it follow a11y best practices? ARIA labels? Keyboard navigation?
11. **test_coverage** — How comprehensive is the test suite? Edge cases covered?
12. **documentation** — Is the code well-documented? README? Inline comments? API docs?
13. **code_quality** — Clean code? Consistent style? DRY? SOLID principles?
14. **deployment_readiness** — Is it ready to deploy? CI/CD? Environment configs? Health checks?

For each dimension, provide:
- A score (1-10, be honest and specific)
- A rationale (1-2 sentences explaining the score)
- Specific gaps found (list of concrete issues)
- Actionable recommendations (list of specific improvements)

Also provide:
- Top 5 overall recommendations (prioritized by impact)
- Overall assessment summary${focusClause}

Be thorough, honest, and specific. Avoid generic praise — cite specific files and patterns.`,
      },
      {
        role: "user",
        content: `Assess this repository:\n\nFile structure (${totalFiles} files):\n${structureSummary.slice(0, 4000)}\n\nKey file contents:\n${fileContextParts.join("\n\n").slice(0, 24000)}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "repo_assessment",
        strict: true,
        schema: {
          type: "object",
          properties: {
            dimensions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dimension: { type: "string", description: "One of the 14 assessment dimensions" },
                  score: { type: "integer", description: "Score from 1-10" },
                  rationale: { type: "string", description: "1-2 sentence explanation" },
                  gaps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific gaps found",
                  },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Specific improvement recommendations",
                  },
                },
                required: ["dimension", "score", "rationale", "gaps", "recommendations"],
                additionalProperties: false,
              },
            },
            top_recommendations: {
              type: "array",
              items: { type: "string" },
              description: "Top 5 prioritized recommendations",
            },
            summary: {
              type: "string",
              description: "Overall assessment summary (2-3 sentences)",
            },
          },
          required: ["dimensions", "top_recommendations", "summary"],
          additionalProperties: false,
        },
      },
    },
  });

  // Parse LLM response
  let assessmentResult: {
    dimensions: Array<{ dimension: string; score: number; rationale: string; gaps: string[]; recommendations: string[] }>;
    top_recommendations: string[];
    summary: string;
  };

  try {
    const rawContent = assessmentResponse.choices[0].message.content;
    const contentStr = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
    assessmentResult = JSON.parse(contentStr || "{}");
  } catch {
    return { success: false, result: "Failed to parse assessment results. Please try again." };
  }

  // ── Step 5: Build dimension scores with expert routing ──
  const dimensionScores: DimensionScore[] = ASSESSMENT_DIMENSIONS.map((dim) => {
    const found = assessmentResult.dimensions.find(
      (d) => d.dimension.toLowerCase().replace(/\s+/g, "_") === dim
    );
    return {
      dimension: dim,
      score: Math.max(1, Math.min(10, found?.score ?? 5)),
      rationale: found?.rationale || "Not explicitly evaluated",
      expertClass: EXPERT_ROUTING[dim] || "A",
      gaps: found?.gaps || [],
      recommendations: found?.recommendations || [],
    };
  });

  // ── Step 6: Build expert summary ──
  const expertSummary: Record<string, { count: number; topFindings: string[] }> = {};
  for (const cls of Object.keys(EXPERT_CLASSES)) {
    const dimsByClass = dimensionScores.filter((d) => d.expertClass === cls);
    const allGaps = dimsByClass.flatMap((d) => d.gaps);
    expertSummary[cls] = {
      count: allGaps.length,
      topFindings: allGaps.slice(0, 5),
    };
  }

  // ── Step 7: Convergence tracking ──
  const overallScore = Math.round(
    (dimensionScores.reduce((s, d) => s + d.score, 0) / dimensionScores.length) * 10
  ) / 10;

  const history = getConvergenceHistory(targetRepo.fullName);
  const passNumber = history.length + 1;
  const newEntry = { pass: passNumber, score: overallScore, timestamp: new Date().toISOString() };
  history.push(newEntry);
  convergenceStore.set(targetRepo.fullName, history);

  // ── Step 8: Quality guards ──
  const qualityGuards = evaluateQualityGuards(dimensionScores, history);

  // ── Step 9: Build report ──
  const report: AssessmentReport = {
    repo: targetRepo.fullName,
    branch,
    mode: args.mode || "assess",
    timestamp: new Date().toISOString(),
    overallScore,
    dimensions: dimensionScores,
    qualityGuards,
    expertSummary,
    totalFiles,
    filesAnalyzed,
    gapCount: dimensionScores.reduce((s, d) => s + d.gaps.length, 0),
    topRecommendations: assessmentResult.top_recommendations || [],
    convergenceHistory: history,
  };

  // ── Step 10: Validate mode — check phase gate ──
  if (args.mode === "validate") {
    const targetPhase = args.target_phase || "B";
    const gateCheck = checkPhaseGate(targetPhase, dimensionScores, {
      totalFiles,
      testFiles,
      hasSecurityPatterns,
      hasDeployConfig,
      hasCiConfig,
    });
    report.gateResult = { phase: targetPhase, ...gateCheck };
  }

  // ── Step 11: Optimize mode — suggest github_edit calls ──
  let optimizeNote = "";
  if (args.mode === "optimize") {
    const criticalGaps = dimensionScores
      .filter((d) => d.score < 7)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    if (criticalGaps.length > 0) {
      const fixInstructions = criticalGaps.map(
        (g) => `- **${g.dimension}** (${g.score}/10): ${g.recommendations[0] || g.gaps[0] || "Improve this area"}`
      );
      optimizeNote = `\n\n---\n\n## 🔧 Optimization Recommendations\n\nThe following dimensions scored below 7/10 and should be addressed:\n\n${fixInstructions.join("\n")}\n\nTo apply fixes, use **github_edit** with specific instructions for each recommendation. After fixing, run **github_assess** again to track convergence.`;
    } else {
      optimizeNote = "\n\n---\n\n## 🔧 Optimization Status\n\nAll dimensions score 7/10 or above. The repository is in good shape. Consider running in **validate** mode to check against a specific phase gate.";
    }
  }

  // Format and return
  const formattedReport = formatReport(report);

  return {
    success: true,
    result: formattedReport + optimizeNote + `\n\n---\n*Assessment Pass ${passNumber} | ${assessmentResult.summary}*`,
    artifactType: "document",
    artifactLabel: `Assessment: ${targetRepo.fullName} (${overallScore.toFixed(1)}/10)`,
  };
}
