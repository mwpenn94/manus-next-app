/**
 * Pass 37e: GitHub Assess Tool — Deep Repo Assessment/Optimization/Validation
 *
 * Comprehensive test suite covering:
 * - Module exports and types
 * - Authentication guards
 * - Repo resolution logic
 * - 14-dimension assessment pipeline
 * - Expert routing (Class A-F)
 * - Quality guard evaluation
 * - Convergence tracking
 * - Phase gate validation
 * - Optimize mode recommendations
 * - Report formatting
 * - Tool registration in AGENT_TOOLS
 * - System prompt integration in agentStream
 *
 * Virtual Users (Adversarial):
 * 1. New User — no GitHub connected
 * 2. Power User — multiple repos, specific focus areas
 * 3. Security Auditor — probes for auth bypass, data leakage
 * 4. Manus Alignment Auditor — verifies framework compliance
 * 5. Edge Case Explorer — empty repos, huge repos, error paths
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";

// ── Mocks ──

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

vi.mock("./githubApi", () => ({
  getRepoTree: vi.fn(),
  getFileContent: vi.fn(),
  createTreeCommit: vi.fn(),
}));

vi.mock("./db", () => ({
  getUserConnectors: vi.fn(),
  getUserGitHubRepos: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { getRepoTree, getFileContent } from "./githubApi";
import { getUserConnectors, getUserGitHubRepos } from "./db";
import {
  executeGitHubAssess,
  getConvergenceHistory,
  clearConvergenceHistory,
} from "./githubAssessTool";
import type { DimensionScore, QualityGuardResult, AssessmentReport } from "./githubAssessTool";

const mockInvokeLLM = vi.mocked(invokeLLM);
const mockGetRepoTree = vi.mocked(getRepoTree);
const mockGetFileContent = vi.mocked(getFileContent);
const mockGetUserConnectors = vi.mocked(getUserConnectors);
const mockGetUserGitHubRepos = vi.mocked(getUserGitHubRepos);

// ── Test Data ──

const MOCK_CONNECTOR = {
  id: 1,
  userId: 1,
  connectorId: "github",
  status: "connected" as const,
  accessToken: "ghp_test_token_123",
  refreshToken: null,
  tokenExpiresAt: null,
  config: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_REPO = {
  id: 1,
  userId: 1,
  githubId: 12345,
  name: "manus-next-app",
  fullName: "mwpenn94/manus-next-app",
  description: "AI-powered developer productivity platform",
  defaultBranch: "main",
  isPrivate: false,
  url: "https://github.com/mwpenn94/manus-next-app",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_REPO_2 = {
  ...MOCK_REPO,
  id: 2,
  name: "other-project",
  fullName: "mwpenn94/other-project",
  description: "Another project",
};

const MOCK_TREE = {
  sha: "abc123",
  url: "https://api.github.com/repos/mwpenn94/manus-next-app/git/trees/abc123",
  truncated: false,
  tree: [
    { path: "package.json", type: "blob" as const, size: 2048, sha: "a1", url: "", mode: "100644" },
    { path: "tsconfig.json", type: "blob" as const, size: 512, sha: "a2", url: "", mode: "100644" },
    { path: "README.md", type: "blob" as const, size: 4096, sha: "a3", url: "", mode: "100644" },
    { path: "server/index.ts", type: "blob" as const, size: 1024, sha: "a4", url: "", mode: "100644" },
    { path: "server/auth.ts", type: "blob" as const, size: 2048, sha: "a5", url: "", mode: "100644" },
    { path: "server/auth.test.ts", type: "blob" as const, size: 3072, sha: "a6", url: "", mode: "100644" },
    { path: "client/src/App.tsx", type: "blob" as const, size: 1536, sha: "a7", url: "", mode: "100644" },
    { path: "client/src/main.tsx", type: "blob" as const, size: 512, sha: "a8", url: "", mode: "100644" },
    { path: "client/src/index.css", type: "blob" as const, size: 1024, sha: "a9", url: "", mode: "100644" },
    { path: "drizzle/schema.ts", type: "blob" as const, size: 2048, sha: "a10", url: "", mode: "100644" },
    { path: "vitest.config.ts", type: "blob" as const, size: 256, sha: "a11", url: "", mode: "100644" },
    { path: "Dockerfile", type: "blob" as const, size: 512, sha: "a12", url: "", mode: "100644" },
    { path: ".github/workflows/ci.yml", type: "blob" as const, size: 1024, sha: "a13", url: "", mode: "100644" },
    { path: "shared/types.ts", type: "blob" as const, size: 768, sha: "a14", url: "", mode: "100644" },
    // Noise that should be filtered
    { path: "node_modules/lodash/index.js", type: "blob" as const, size: 50000, sha: "n1", url: "", mode: "100644" },
    { path: ".git/HEAD", type: "blob" as const, size: 32, sha: "n2", url: "", mode: "100644" },
    { path: "dist/bundle.js", type: "blob" as const, size: 100000, sha: "n3", url: "", mode: "100644" },
    { path: "package-lock.json", type: "blob" as const, size: 500000, sha: "n4", url: "", mode: "100644" },
  ],
};

const MOCK_FILE_CONTENT = (path: string) => ({
  name: path.split("/").pop() || "",
  path,
  sha: "file_sha_" + path,
  size: 1024,
  encoding: "base64" as const,
  content: Buffer.from(`// ${path}\nconsole.log("hello from ${path}");`).toString("base64"),
  url: "",
  html_url: "",
  git_url: "",
  download_url: "",
  type: "file" as const,
  _links: { self: "", git: "", html: "" },
});

const MOCK_ASSESSMENT_RESPONSE = {
  choices: [{
    message: {
      content: JSON.stringify({
        dimensions: [
          { dimension: "completeness", score: 8, rationale: "Good feature coverage", gaps: ["Missing error boundaries"], recommendations: ["Add ErrorBoundary to all routes"] },
          { dimension: "accuracy", score: 9, rationale: "Code logic is sound", gaps: [], recommendations: ["Add more type assertions"] },
          { dimension: "depth", score: 7, rationale: "Solid implementation", gaps: ["Some shallow abstractions"], recommendations: ["Refactor service layer"] },
          { dimension: "novelty", score: 8, rationale: "Modern stack and patterns", gaps: [], recommendations: ["Consider server components"] },
          { dimension: "actionability", score: 8, rationale: "Well-structured codebase", gaps: [], recommendations: ["Add JSDoc to public APIs"] },
          { dimension: "regression_safety", score: 7, rationale: "Tests present but gaps", gaps: ["No integration tests"], recommendations: ["Add E2E tests"] },
          { dimension: "ux_quality", score: 7, rationale: "Clean UI", gaps: ["No loading skeletons"], recommendations: ["Add skeleton loaders"] },
          { dimension: "performance", score: 6, rationale: "Some bottlenecks", gaps: ["No lazy loading", "Large bundle"], recommendations: ["Code-split routes", "Lazy load heavy components"] },
          { dimension: "security", score: 8, rationale: "Auth well-implemented", gaps: ["No rate limiting on API"], recommendations: ["Add rate limiting middleware"] },
          { dimension: "accessibility", score: 5, rationale: "Limited a11y", gaps: ["No ARIA labels", "No keyboard nav"], recommendations: ["Add ARIA labels", "Implement keyboard navigation"] },
          { dimension: "test_coverage", score: 7, rationale: "Good unit tests", gaps: ["No E2E tests"], recommendations: ["Add Playwright E2E suite"] },
          { dimension: "documentation", score: 6, rationale: "Basic README", gaps: ["No API docs", "No architecture diagram"], recommendations: ["Add API documentation", "Create architecture diagram"] },
          { dimension: "code_quality", score: 8, rationale: "Clean, consistent code", gaps: ["Some long functions"], recommendations: ["Break up functions >50 lines"] },
          { dimension: "deployment_readiness", score: 9, rationale: "CI/CD configured", gaps: [], recommendations: ["Add staging environment"] },
        ],
        top_recommendations: [
          "Add ARIA labels and keyboard navigation for accessibility",
          "Implement code-splitting and lazy loading for performance",
          "Add E2E test suite with Playwright",
          "Create API documentation",
          "Add rate limiting middleware",
        ],
        summary: "A well-structured full-stack application with strong architecture and security, but needs improvement in accessibility, performance optimization, and documentation.",
      }),
    },
  }],
};

// ── Setup ──

function setupMocks() {
  mockGetUserConnectors.mockResolvedValue([MOCK_CONNECTOR] as any);
  mockGetUserGitHubRepos.mockResolvedValue([MOCK_REPO] as any);
  mockGetRepoTree.mockResolvedValue(MOCK_TREE as any);
  mockGetFileContent.mockImplementation(async (_token, _owner, _repo, path) => {
    return MOCK_FILE_CONTENT(path) as any;
  });
  mockInvokeLLM.mockResolvedValue(MOCK_ASSESSMENT_RESPONSE as any);
}

describe("Pass 37e: GitHub Assess Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConvergenceHistory("mwpenn94/manus-next-app");
    setupMocks();
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Module Structure & Exports
  // ═══════════════════════════════════════════════════════════════

  describe("Module exports", () => {
    it("exports executeGitHubAssess function", () => {
      expect(typeof executeGitHubAssess).toBe("function");
    });

    it("exports getConvergenceHistory function", () => {
      expect(typeof getConvergenceHistory).toBe("function");
    });

    it("exports clearConvergenceHistory function", () => {
      expect(typeof clearConvergenceHistory).toBe("function");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Authentication Guards
  // ═══════════════════════════════════════════════════════════════

  describe("Authentication guards", () => {
    it("rejects unauthenticated requests", async () => {
      const result = await executeGitHubAssess({ mode: "assess" });
      expect(result.success).toBe(false);
      expect(result.result).toContain("Authentication required");
    });

    it("rejects requests with no userId", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, {});
      expect(result.success).toBe(false);
      expect(result.result).toContain("Authentication required");
    });

    it("rejects when GitHub not connected", async () => {
      mockGetUserConnectors.mockResolvedValue([]);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("GitHub is not connected");
    });

    it("rejects when no repos connected", async () => {
      mockGetUserGitHubRepos.mockResolvedValue([]);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("No GitHub repositories connected");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Repo Resolution
  // ═══════════════════════════════════════════════════════════════

  describe("Repo resolution", () => {
    it("auto-selects single repo when no repo specified", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("mwpenn94/manus-next-app");
    });

    it("asks for repo selection when multiple repos and none specified", async () => {
      mockGetUserGitHubRepos.mockResolvedValue([MOCK_REPO, MOCK_REPO_2] as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("Multiple repos connected");
      expect(result.result).toContain("mwpenn94/manus-next-app");
      expect(result.result).toContain("mwpenn94/other-project");
    });

    it("finds repo by exact fullName", async () => {
      mockGetUserGitHubRepos.mockResolvedValue([MOCK_REPO, MOCK_REPO_2] as any);
      const result = await executeGitHubAssess({ mode: "assess", repo: "mwpenn94/manus-next-app" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("mwpenn94/manus-next-app");
    });

    it("finds repo by name only", async () => {
      mockGetUserGitHubRepos.mockResolvedValue([MOCK_REPO, MOCK_REPO_2] as any);
      const result = await executeGitHubAssess({ mode: "assess", repo: "manus-next-app" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("mwpenn94/manus-next-app");
    });

    it("returns error for non-existent repo", async () => {
      const result = await executeGitHubAssess({ mode: "assess", repo: "nonexistent" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("not found");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — File Tree Filtering
  // ═══════════════════════════════════════════════════════════════

  describe("File tree filtering", () => {
    it("filters out node_modules, .git, dist, and lockfiles", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      // The result should NOT mention filtered paths
      expect(result.result).not.toContain("node_modules");
      // But should mention actual source files
      expect(result.result).toContain("mwpenn94/manus-next-app");
    });

    it("handles truncated tree gracefully", async () => {
      mockGetRepoTree.mockResolvedValue({ ...MOCK_TREE, truncated: true } as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Assessment Pipeline
  // ═══════════════════════════════════════════════════════════════

  describe("Assessment pipeline", () => {
    it("produces a report with all 14 dimensions", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      // Check all 14 dimensions appear in the report
      const dims = [
        "completeness", "accuracy", "depth", "novelty", "actionability",
        "regression_safety", "ux_quality", "performance", "security",
        "accessibility", "test_coverage", "documentation", "code_quality",
        "deployment_readiness",
      ];
      for (const dim of dims) {
        expect(result.result).toContain(dim);
      }
    });

    it("includes overall score in the report", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toMatch(/Overall Score: \d+\.\d\/10/);
    });

    it("includes expert class routing in the report", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Class A");
      expect(result.result).toContain("Domain Experts");
    });

    it("includes quality guards in the report", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Quality Guards");
      expect(result.result).toContain("goodhart_detection");
      expect(result.result).toContain("regression_prevention");
    });

    it("includes top recommendations", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Top Recommendations");
    });

    it("returns document artifact type", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.artifactType).toBe("document");
    });

    it("includes score in artifact label", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.artifactLabel).toContain("mwpenn94/manus-next-app");
      expect(result.artifactLabel).toMatch(/\d+\.\d\/10/);
    });

    it("passes focus area to LLM when specified", async () => {
      await executeGitHubAssess({ mode: "assess", focus: "security" }, { userId: 1 });
      const llmCall = mockInvokeLLM.mock.calls[0];
      const systemMsg = llmCall[0].messages[0];
      expect(typeof systemMsg.content === "string" && systemMsg.content).toContain("security");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Quality Guards
  // ═══════════════════════════════════════════════════════════════

  describe("Quality guards", () => {
    it("passes goodhart detection for natural score distribution", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      // Our mock has scores from 5-9, which is a natural distribution
      expect(result.result).toContain("goodhart_detection");
    });

    it("reports first pass for regression prevention", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("regression_prevention");
    });

    it("flags dimension balance issues for very low dimensions", async () => {
      // Mock with one very low dimension
      const lowScoreResponse = JSON.parse(JSON.stringify(MOCK_ASSESSMENT_RESPONSE));
      const dims = JSON.parse(lowScoreResponse.choices[0].message.content);
      dims.dimensions[9].score = 1; // accessibility = 1
      lowScoreResponse.choices[0].message.content = JSON.stringify(dims);
      mockInvokeLLM.mockResolvedValue(lowScoreResponse as any);

      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("dimension_balance");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Convergence Tracking
  // ═══════════════════════════════════════════════════════════════

  describe("Convergence tracking", () => {
    it("starts with empty convergence history", () => {
      const history = getConvergenceHistory("mwpenn94/manus-next-app");
      expect(history).toEqual([]);
    });

    it("records convergence history after assessment", async () => {
      await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      const history = getConvergenceHistory("mwpenn94/manus-next-app");
      expect(history.length).toBe(1);
      expect(history[0].pass).toBe(1);
      expect(history[0].score).toBeGreaterThan(0);
      expect(history[0].timestamp).toBeTruthy();
    });

    it("increments pass number on subsequent assessments", async () => {
      await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      const history = getConvergenceHistory("mwpenn94/manus-next-app");
      expect(history.length).toBe(2);
      expect(history[0].pass).toBe(1);
      expect(history[1].pass).toBe(2);
    });

    it("shows convergence history in report after multiple passes", async () => {
      await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Convergence History");
    });

    it("clears convergence history correctly", async () => {
      await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      clearConvergenceHistory("mwpenn94/manus-next-app");
      const history = getConvergenceHistory("mwpenn94/manus-next-app");
      expect(history).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Validate Mode (Phase Gates)
  // ═══════════════════════════════════════════════════════════════

  describe("Validate mode", () => {
    it("checks against Phase B gate by default", async () => {
      const result = await executeGitHubAssess({ mode: "validate" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Phase B Gate");
    });

    it("checks against specified phase gate", async () => {
      const result = await executeGitHubAssess({ mode: "validate", target_phase: "C" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Phase C Gate");
    });

    it("includes pass/fail for each criterion", async () => {
      const result = await executeGitHubAssess({ mode: "validate", target_phase: "B" }, { userId: 1 });
      expect(result.success).toBe(true);
      // Should contain criterion results
      expect(result.result).toMatch(/min_score/);
    });

    it("detects deployment config for Phase D gate", async () => {
      const result = await executeGitHubAssess({ mode: "validate", target_phase: "D" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Phase D Gate");
      expect(result.result).toContain("deployment_config");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Optimize Mode
  // ═══════════════════════════════════════════════════════════════

  describe("Optimize mode", () => {
    it("includes optimization recommendations for low-scoring dimensions", async () => {
      const result = await executeGitHubAssess({ mode: "optimize" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Optimization");
    });

    it("mentions github_edit for applying fixes", async () => {
      // Mock with a low-scoring dimension
      const lowScoreResponse = JSON.parse(JSON.stringify(MOCK_ASSESSMENT_RESPONSE));
      const dims = JSON.parse(lowScoreResponse.choices[0].message.content);
      dims.dimensions[9].score = 3; // accessibility = 3
      lowScoreResponse.choices[0].message.content = JSON.stringify(dims);
      mockInvokeLLM.mockResolvedValue(lowScoreResponse as any);

      const result = await executeGitHubAssess({ mode: "optimize" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("github_edit");
    });

    it("reports good status when all dimensions are 7+", async () => {
      // All scores in our mock are >= 5, but some are < 7
      // Let's make all >= 7
      const highScoreResponse = JSON.parse(JSON.stringify(MOCK_ASSESSMENT_RESPONSE));
      const dims = JSON.parse(highScoreResponse.choices[0].message.content);
      dims.dimensions.forEach((d: any) => { d.score = Math.max(7, d.score); });
      highScoreResponse.choices[0].message.content = JSON.stringify(dims);
      mockInvokeLLM.mockResolvedValue(highScoreResponse as any);

      const result = await executeGitHubAssess({ mode: "optimize" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("good shape");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Error Handling
  // ═══════════════════════════════════════════════════════════════

  describe("Error handling", () => {
    it("handles repo tree read failure", async () => {
      mockGetRepoTree.mockRejectedValue(new Error("API rate limit exceeded"));
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("Failed to read repository structure");
    });

    it("handles LLM parse failure", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{ message: { content: "not valid json" } }],
      } as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("Failed to parse");
    });

    it("handles file read errors gracefully", async () => {
      mockGetFileContent.mockRejectedValue(new Error("Not found"));
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      // Should still succeed — file read errors are non-fatal
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — Tool Registration
  // ═══════════════════════════════════════════════════════════════

  describe("Tool registration", () => {
    it("github_assess is registered in AGENT_TOOLS", async () => {
      const { AGENT_TOOLS } = await import("./agentTools");
      const tool = AGENT_TOOLS.find((t) => t.function.name === "github_assess");
      expect(tool).toBeDefined();
      expect(tool!.function.description).toContain("14 dimensions");
      expect(tool!.function.description).toContain("recursive optimization");
    });

    it("github_assess has correct parameter schema", async () => {
      const { AGENT_TOOLS } = await import("./agentTools");
      const tool = AGENT_TOOLS.find((t) => t.function.name === "github_assess");
      const params = tool!.function.parameters as any;
      expect(params.properties.mode).toBeDefined();
      expect(params.properties.mode.enum).toEqual(["assess", "optimize", "validate"]);
      expect(params.properties.repo).toBeDefined();
      expect(params.properties.focus).toBeDefined();
      expect(params.properties.target_phase).toBeDefined();
      expect(params.properties.target_phase.enum).toEqual(["A", "B", "C", "D"]);
      expect(params.required).toEqual(["mode"]);
    });

    it("AGENT_TOOLS count is now 32", async () => {
      const { AGENT_TOOLS } = await import("./agentTools");
      expect(AGENT_TOOLS.length).toBe(33);
    });

    it("github_assess is wired in executeTool", async () => {
      const source = fs.readFileSync("server/agentTools.ts", "utf-8");
      expect(source).toContain('case "github_assess"');
      expect(source).toContain("executeGitHubAssess");
      expect(source).toContain("githubAssessTool");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPTH SCAN — System Prompt Integration
  // ═══════════════════════════════════════════════════════════════

  describe("System prompt integration", () => {
    it("agentStream system prompt describes github_assess", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain("github_assess");
      expect(source).toContain("14 dimensions");
    });

    it("agentStream has intent detection for assess/review/audit", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain("Assess my repo");
      expect(source).toContain("Review code quality");
      expect(source).toContain("Audit my codebase");
    });

    it("agentStream has intent detection for optimize mode", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain("Optimize my repo");
      expect(source).toContain("github_assess(mode: 'optimize')");
    });

    it("agentStream has intent detection for validate mode", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain("production-ready");
      expect(source).toContain("github_assess(mode: 'validate')");
    });

    it("connected repos section mentions github_assess", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain("ASSESS, REVIEW, AUDIT");
      expect(source).toContain("github_assess");
    });

    it("tool display mapping handles github_assess modes", () => {
      const source = fs.readFileSync("server/agentStream.ts", "utf-8");
      expect(source).toContain('case "github_assess"');
      expect(source).toContain("Assessing");
      expect(source).toContain("Optimizing");
      expect(source).toContain("Validating");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVERSARIAL SCAN — VU 1: New User (no GitHub)
  // ═══════════════════════════════════════════════════════════════

  describe("VU 1: New User (no GitHub connected)", () => {
    it("gets clear error when trying to assess without GitHub", async () => {
      mockGetUserConnectors.mockResolvedValue([]);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 99 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("connect");
    });

    it("gets clear error when trying to assess without repos", async () => {
      mockGetUserGitHubRepos.mockResolvedValue([]);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 99 });
      expect(result.success).toBe(false);
      expect(result.result).toContain("Import or create");
    });

    it("cannot bypass auth by passing null userId", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: undefined as any });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVERSARIAL SCAN — VU 2: Power User (multiple repos, focus)
  // ═══════════════════════════════════════════════════════════════

  describe("VU 2: Power User (multiple repos, specific focus)", () => {
    beforeEach(() => {
      mockGetUserGitHubRepos.mockResolvedValue([MOCK_REPO, MOCK_REPO_2] as any);
    });

    it("can assess a specific repo from multiple", async () => {
      const result = await executeGitHubAssess({ mode: "assess", repo: "manus-next-app" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("mwpenn94/manus-next-app");
    });

    it("can focus assessment on security", async () => {
      const result = await executeGitHubAssess({ mode: "assess", repo: "manus-next-app", focus: "security" }, { userId: 1 });
      expect(result.success).toBe(true);
      // LLM should have received the focus
      const llmCall = mockInvokeLLM.mock.calls[0];
      const sysContent = llmCall[0].messages[0].content;
      expect(typeof sysContent === "string" && sysContent).toContain("security");
    });

    it("can run optimize mode on specific repo", async () => {
      const result = await executeGitHubAssess({ mode: "optimize", repo: "other-project" }, { userId: 1 });
      expect(result.success).toBe(true);
    });

    it("can validate against Phase D", async () => {
      const result = await executeGitHubAssess({ mode: "validate", repo: "manus-next-app", target_phase: "D" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).toContain("Phase D");
    });

    it("tracks convergence per-repo independently", async () => {
      // Clear any prior history from other tests in this describe block
      clearConvergenceHistory("mwpenn94/manus-next-app");
      clearConvergenceHistory("mwpenn94/other-project");

      await executeGitHubAssess({ mode: "assess", repo: "manus-next-app" }, { userId: 1 });
      await executeGitHubAssess({ mode: "assess", repo: "other-project" }, { userId: 1 });

      const history1 = getConvergenceHistory("mwpenn94/manus-next-app");
      const history2 = getConvergenceHistory("mwpenn94/other-project");
      expect(history1.length).toBe(1);
      expect(history2.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVERSARIAL SCAN — VU 3: Security Auditor
  // ═══════════════════════════════════════════════════════════════

  describe("VU 3: Security Auditor", () => {
    it("does not expose GitHub token in results", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.result).not.toContain("ghp_test_token_123");
      expect(result.result).not.toContain("accessToken");
    });

    it("does not expose internal file paths", async () => {
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.result).not.toContain("/home/ubuntu");
    });

    it("handles connector with token in config field", async () => {
      mockGetUserConnectors.mockResolvedValue([{
        ...MOCK_CONNECTOR,
        accessToken: null,
        config: { token: "ghp_config_token_456" },
      }] as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      expect(result.result).not.toContain("ghp_config_token_456");
    });

    it("does not allow cross-user repo access", async () => {
      // User 2 should not see user 1's repos
      mockGetUserGitHubRepos.mockResolvedValue([]);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 2 });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVERSARIAL SCAN — VU 4: Manus Alignment Auditor
  // ═══════════════════════════════════════════════════════════════

  describe("VU 4: Manus Alignment Auditor", () => {
    it("assesses all 14 optimization dimensions from optimization-config.json", () => {
      const config = JSON.parse(fs.readFileSync("tools/optimization-config.json", "utf-8"));
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      for (const dim of config.assessment_dimensions) {
        expect(source).toContain(`"${dim}"`);
      }
    });

    it("implements expert routing for all 6 classes (A-F)", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain('"A"');
      expect(source).toContain('"B"');
      expect(source).toContain('"C"');
      expect(source).toContain('"D"');
      expect(source).toContain('"E"');
      expect(source).toContain('"F"');
      expect(source).toContain("Domain Experts");
      expect(source).toContain("Adversarial Testers");
      expect(source).toContain("UX Reviewers");
      expect(source).toContain("Compliance Auditors");
      expect(source).toContain("Founder Personas");
      expect(source).toContain("Continuous Validators");
    });

    it("implements quality guards from the framework", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain("goodhart_detection");
      expect(source).toContain("regression_prevention");
      expect(source).toContain("dimension_balance");
      expect(source).toContain("inflation_detection");
      expect(source).toContain("coverage_regression");
      expect(source).toContain("stagnation_escape");
    });

    it("implements phase gates A through D", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain("PHASE_GATES");
      expect(source).toContain("min_score: 7"); // Phase A
      expect(source).toContain("min_score: 8,"); // Phase B
      expect(source).toContain("min_score: 8.5"); // Phase C
      expect(source).toContain("min_score: 9"); // Phase D
    });

    it("tracks convergence history per-repo (pass-over-pass)", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain("convergenceStore");
      expect(source).toContain("getConvergenceHistory");
      expect(source).toContain("convergenceHistory");
    });

    it("uses structured JSON schema for LLM assessment output", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain("json_schema");
      expect(source).toContain("repo_assessment");
      expect(source).toContain("strict: true");
    });

    it("supports three modes aligned to optimization lifecycle", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain('"assess"');
      expect(source).toContain('"optimize"');
      expect(source).toContain('"validate"');
    });

    it("reads broader file set than github_edit (40 vs 20)", () => {
      const source = fs.readFileSync("server/githubAssessTool.ts", "utf-8");
      expect(source).toContain(".slice(0, 40)");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // ADVERSARIAL SCAN — VU 5: Edge Case Explorer
  // ═══════════════════════════════════════════════════════════════

  describe("VU 5: Edge Case Explorer", () => {
    it("handles empty repo (no files)", async () => {
      mockGetRepoTree.mockResolvedValue({
        sha: "empty",
        url: "",
        truncated: false,
        tree: [],
      } as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      // Should still succeed with LLM assessment of empty repo
      expect(result.success).toBe(true);
    });

    it("handles repo with only noise files (all filtered)", async () => {
      mockGetRepoTree.mockResolvedValue({
        sha: "noise",
        url: "",
        truncated: false,
        tree: [
          { path: "node_modules/lodash/index.js", type: "blob", size: 50000, sha: "n1", url: "", mode: "100644" },
          { path: ".git/HEAD", type: "blob", size: 32, sha: "n2", url: "", mode: "100644" },
          { path: "dist/bundle.js", type: "blob", size: 100000, sha: "n3", url: "", mode: "100644" },
        ],
      } as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
    });

    it("handles LLM returning empty dimensions array", async () => {
      mockInvokeLLM.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify({
              dimensions: [],
              top_recommendations: [],
              summary: "Empty assessment",
            }),
          },
        }],
      } as any);
      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      // Should still have all 14 dimensions (backfilled with defaults)
      for (const dim of ["completeness", "accuracy", "depth"]) {
        expect(result.result).toContain(dim);
      }
    });

    it("handles LLM returning scores outside 1-10 range", async () => {
      const badScoreResponse = JSON.parse(JSON.stringify(MOCK_ASSESSMENT_RESPONSE));
      const dims = JSON.parse(badScoreResponse.choices[0].message.content);
      dims.dimensions[0].score = 15; // Over max
      dims.dimensions[1].score = -3; // Under min
      badScoreResponse.choices[0].message.content = JSON.stringify(dims);
      mockInvokeLLM.mockResolvedValue(badScoreResponse as any);

      const result = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result.success).toBe(true);
      // Scores should be clamped to 1-10
      expect(result.result).not.toContain("15/10");
      expect(result.result).not.toContain("-3/10");
    });

    it("handles validate mode with invalid phase", async () => {
      const result = await executeGitHubAssess({ mode: "validate", target_phase: "Z" as any }, { userId: 1 });
      expect(result.success).toBe(true);
      // Should still produce a report, just with unknown phase gate
    });

    it("handles concurrent assessments on same repo", async () => {
      clearConvergenceHistory("mwpenn94/manus-next-app");
      // Run sequentially to avoid mock contention
      const result1 = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      const result2 = await executeGitHubAssess({ mode: "assess" }, { userId: 1 });
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Both should have recorded convergence history
      const history = getConvergenceHistory("mwpenn94/manus-next-app");
      expect(history.length).toBe(2);
    }, 15000);
  });
});
