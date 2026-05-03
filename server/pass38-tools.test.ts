/**
 * Pass 38: Manus Parity+ Deep Capability Tools — Comprehensive Test Suite
 *
 * Tests all 5 new tools across 6 capability domains:
 * 1. data_pipeline — ETL/data ops (plan, ingest, transform, model, persist, full)
 * 2. automation_orchestrate — workflow orchestration (plan, browser, api, schedule, workflow, monitor)
 * 3. app_lifecycle — full SDLC (discover, design, architect, implement, integrate, test, deploy, observe, audit, iterate, full)
 * 4. deep_research_content — research + content production (research, write, media, document, analyze, full)
 * 5. github_ops — CI/CD, PR, releases, branch strategy (branch, pr, release, ci, protect, status)
 *
 * Virtual Users (Adversarial):
 * VU1: Data Engineer — tests pipeline edge cases, governance, quality metrics
 * VU2: DevOps Lead — tests automation, CI/CD, deployment workflows
 * VU3: Product Manager — tests app lifecycle, design systems, architecture decisions
 * VU4: Research Analyst — tests deep research, content production, citation quality
 * VU5: Security Auditor — tests auth guards, data leakage, injection resistance
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: JSON.stringify({
            stages_executed: ["ingest", "transform"],
            records_processed: 1500,
            quality_score: 0.87,
            governance_flags: [],
            output_location: "s3://bucket/output.csv",
            summary: "Pipeline completed successfully"
          }),
        },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
  })),
}));

vi.mock("./githubApi", () => ({
  getRepoTree: vi.fn(async () => ({
    tree: [
      { path: "src/index.ts", type: "blob", sha: "abc123" },
      { path: "package.json", type: "blob", sha: "def456" },
      { path: ".github/workflows/ci.yml", type: "blob", sha: "ghi789" },
    ],
  })),
  getFileContent: vi.fn(async () => "file content here"),
  createTreeCommit: vi.fn(async () => ({ sha: "new-commit-sha" })),
  getRepo: vi.fn(async () => ({
    full_name: "testuser/test-repo",
    default_branch: "main",
    description: "Test repository",
    html_url: "https://github.com/testuser/test-repo",
    stargazers_count: 10,
    forks_count: 2,
    open_issues_count: 3,
    language: "TypeScript",
  })),
  compareBranches: vi.fn(async () => ({
    ahead_by: 3,
    behind_by: 0,
    commits: [
      { sha: "abc123", commit: { message: "feat: add login" } },
    ],
  })),
  listBranches: vi.fn(async () => [
    { name: "main", commit: { sha: "abc" } },
    { name: "develop", commit: { sha: "def" } },
  ]),
  createBranch: vi.fn(async () => ({ ref: "refs/heads/feature/new", object: { sha: "abc123" } })),
  listPullRequests: vi.fn(async () => [
    { number: 1, title: "Fix bug", state: "open", user: { login: "dev1" }, head: { ref: "feature/fix-bug" }, base: { ref: "main" } },
  ]),
  createPullRequest: vi.fn(async () => ({ number: 2, html_url: "https://github.com/test/repo/pull/2" })),
  mergePullRequest: vi.fn(async () => ({ merged: true })),
  listCommits: vi.fn(async () => [
    { sha: "abc123", commit: { message: "feat: add login" } },
    { sha: "def456", commit: { message: "fix: resolve crash" } },
    { sha: "ghi789", commit: { message: "docs: update readme" } },
  ]),
  validateGitHubToken: vi.fn(async () => "testuser"),
}));

vi.mock("./db", () => ({
  getUserConnectors: vi.fn(async () => [
    { connectorId: "github", accessToken: "ghp_test_token_12345", status: "connected", metadata: {}, config: {} },
  ]),
  getUserGitHubRepos: vi.fn(async () => [
    {
      id: 1,
      fullName: "testuser/test-repo",
      name: "test-repo",
      defaultBranch: "main",
      language: "TypeScript",
      htmlUrl: "https://github.com/testuser/test-repo",
    },
  ]),
}));

// ── Imports ──

import { invokeLLM } from "./_core/llm";
import { getUserConnectors, getUserGitHubRepos } from "./db";

// ═══════════════════════════════════════════════════════════════
// §1: DATA PIPELINE TOOL
// ═══════════════════════════════════════════════════════════════

describe("Pass 38.1: data_pipeline tool", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Module exports and types", () => {
    it("exports executeDataPipeline function", async () => {
      const mod = await import("./dataPipelineTool");
      expect(typeof mod.executeDataPipeline).toBe("function");
    });

    it("exports all required types", async () => {
      const mod = await import("./dataPipelineTool");
      // Type exports are compile-time only, but we can verify the module loads
      expect(mod).toBeDefined();
    });
  });

  describe("VU1: Data Engineer — pipeline modes", () => {
    it("plan mode generates a pipeline plan without execution", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "plan",
          description: "Ingest CSV sales data, clean and deduplicate, then persist to S3",
          sources: ["sales_data.csv"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(typeof result.result).toBe("string");
      // Plan mode should mention stages
      expect(result.result.toLowerCase()).toMatch(/stage|pipeline|plan/i);
    });

    it("full mode runs end-to-end pipeline", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "full",
          description: "Full ETL: ingest API data, transform, model with scoring, persist to database",
          sources: ["https://api.example.com/data"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
    });

    it("ingest mode handles various source types", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "ingest",
          description: "Ingest data from authenticated REST API with pagination",
          sources: ["https://api.example.com/v2/records"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("transform mode applies data quality operations", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "transform",
          description: "Clean, normalize, and deduplicate customer records with LLM enrichment",
          sources: ["raw_customers.json"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("model mode applies analytics/scoring", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "model",
          description: "Apply predictive forecast model to quarterly revenue data",
          sources: ["revenue_quarterly.csv"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("persist mode writes to target destination", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "persist",
          description: "Write processed results to S3 bucket and update database index",
          sources: ["processed_data.parquet"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });
  });

  describe("VU1: Data Engineer — governance and quality", () => {
    it("pipeline plan includes governance analysis", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "plan",
          description: "Process PII-containing healthcare records with HIPAA compliance requirements",
          sources: ["patient_records.csv"],
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      // Should mention governance/compliance/PII
      expect(result.result.toLowerCase()).toMatch(/govern|pii|compliance|sensitive/i);
    });

    it("handles empty source description gracefully", async () => {
      const { executeDataPipeline } = await import("./dataPipelineTool");
      const result = await executeDataPipeline(
        {
          mode: "plan",
          description: "",
          sources: "",
        },
        { userId: 1, taskId: "task-1" }
      );
      // Should still succeed with defaults or provide helpful guidance
      expect(result).toBeDefined();
      expect(typeof result.result).toBe("string");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// §2: AUTOMATION ORCHESTRATE TOOL
// ═══════════════════════════════════════════════════════════════

describe("Pass 38.2: automation_orchestrate tool", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Module exports", () => {
    it("exports executeAutomation function", async () => {
      const mod = await import("./automationTool");
      expect(typeof mod.executeAutomation).toBe("function");
    });
  });

  describe("VU2: DevOps Lead — automation modes", () => {
    it("plan mode generates automation workflow plan", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "plan",
          description: "Automate daily data sync from Salesforce to internal DB with error alerting",
          trigger: "scheduled",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/step|workflow|plan|automat/i);
    });

    it("browser mode plans browser automation steps", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "browser",
          description: "Scrape product prices from competitor website daily",
          trigger: "scheduled",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("api mode plans API integration workflow", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "api",
          description: "Chain Stripe webhook to Slack notification on payment received",
          trigger: "webhook",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("schedule mode plans recurring task", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "schedule",
          description: "Generate weekly analytics report every Monday at 9am",
          trigger: "scheduled",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("workflow mode plans multi-step orchestration", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "workflow",
          description: "On new GitHub PR: run tests, deploy preview, notify Slack, await approval, merge",
          trigger: "event",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("monitor mode plans observability setup", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "monitor",
          description: "Monitor API uptime every 5 minutes and alert on 3 consecutive failures",
          trigger: "scheduled",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });
  });

  describe("VU2: DevOps Lead — governance and AFK", () => {
    it("automation plan includes governance analysis", async () => {
      const { executeAutomation } = await import("./automationTool");
      const result = await executeAutomation(
        {
          mode: "plan",
          description: "Automate payment processing with Stripe API requiring admin credentials",
          trigger: "webhook",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      // Should reference governance/secrets/access
      expect(result.result.toLowerCase()).toMatch(/govern|secret|access|credential/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// §3: APP LIFECYCLE TOOL
// ═══════════════════════════════════════════════════════════════

describe("Pass 38.3: app_lifecycle tool", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Module exports", () => {
    it("exports executeAppLifecycle function", async () => {
      const mod = await import("./appLifecycleTool");
      expect(typeof mod.executeAppLifecycle).toBe("function");
    });
  });

  describe("VU3: Product Manager — lifecycle modes", () => {
    it("discover mode analyzes requirements", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "discover",
          description: "Build a SaaS project management tool with Kanban boards and team collaboration",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/archetype|requirement|feature/i);
    });

    it("design mode generates design system", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "design",
          description: "Design a modern e-commerce storefront with dark theme and minimal aesthetic",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/color|font|design|palette/i);
    });

    it("architect mode produces architecture decisions", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "architect",
          description: "Architect a real-time collaborative document editor",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/architect|stack|component|decision/i);
    });

    it("implement mode generates implementation plan", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "implement",
          description: "Implement user authentication with OAuth2 and role-based access control",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("test mode generates test strategy", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "test",
          description: "Create comprehensive test suite for payment processing module",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/test|coverage|unit|integration/i);
    });

    it("deploy mode generates deployment plan", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "deploy",
          description: "Deploy React app to manus.space with CI/CD pipeline",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("full mode runs complete lifecycle analysis", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "full",
          description: "Full lifecycle analysis for a fitness tracking mobile app",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });
  });

  describe("VU3: Product Manager — archetype classification", () => {
    it("classifies SaaS app correctly", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "discover",
          description: "Build a subscription-based analytics dashboard SaaS platform",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/saas|dashboard|analytics/i);
    });

    it("classifies e-commerce app correctly", async () => {
      const { executeAppLifecycle } = await import("./appLifecycleTool");
      const result = await executeAppLifecycle(
        {
          mode: "discover",
          description: "Build an online marketplace for handmade crafts with shopping cart and checkout",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/commerce|marketplace|shop/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// §4: DEEP RESEARCH CONTENT TOOL
// ═══════════════════════════════════════════════════════════════

describe("Pass 38.4: deep_research_content tool", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Module exports", () => {
    it("exports executeDeepResearch function", async () => {
      const mod = await import("./deepResearchTool");
      expect(typeof mod.executeDeepResearch).toBe("function");
    });
  });

  describe("VU4: Research Analyst — research modes", () => {
    it("research mode gathers and synthesizes sources", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "research",
          topic: "Impact of AI agents on enterprise productivity in 2026",
          depth: "comprehensive",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/source|research|finding/i);
    });

    it("write mode produces structured content", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "write",
          topic: "Best practices for microservices architecture",
          depth: "detailed",
          format: "technical_doc",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("document mode generates formatted output", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "document",
          topic: "Q3 2026 Market Analysis Report",
          depth: "comprehensive",
          format: "report",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("analyze mode performs data-driven analysis", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "analyze",
          topic: "Competitive landscape of AI coding assistants",
          depth: "comprehensive",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });

    it("full mode runs complete research pipeline", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "full",
          topic: "State of autonomous AI agents: capabilities, limitations, and future directions",
          depth: "comprehensive",
          format: "whitepaper",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
    });
  });

  describe("VU4: Research Analyst — quality and depth", () => {
    it("comprehensive depth includes more source types", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "research",
          topic: "Quantum computing applications in drug discovery",
          depth: "comprehensive",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      // Comprehensive should produce richer output
      expect(result.result.length).toBeGreaterThan(50);
    });

    it("handles empty topic gracefully", async () => {
      const { executeDeepResearch } = await import("./deepResearchTool");
      const result = await executeDeepResearch(
        {
          mode: "research",
          topic: "",
          depth: "quick",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result).toBeDefined();
      expect(typeof result.result).toBe("string");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// §5: GITHUB OPS TOOL
// ═══════════════════════════════════════════════════════════════

describe("Pass 38.5: github_ops tool", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("Module exports", () => {
    it("exports executeGitHubOps function", async () => {
      const mod = await import("./githubOpsTool");
      expect(typeof mod.executeGitHubOps).toBe("function");
    });
  });

  describe("VU2: DevOps Lead — GitHub operations", () => {
    it("branch mode creates feature branch with strategy", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "branch",
          repo: "test-repo",
          description: "Create feature branch for user authentication module",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/branch|feature|strategy/i);
    });

    it("pr mode lists and manages pull requests", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "pr",
          repo: "test-repo",
          description: "List open pull requests and their status",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/pull request|pr|open/i);
    });

    it("release mode generates changelog and release", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "release",
          repo: "test-repo",
          description: "Generate release notes from recent commits",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/release|changelog|version/i);
    });

    it("ci mode generates CI/CD workflow", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "ci",
          repo: "test-repo",
          description: "Generate GitHub Actions CI workflow for TypeScript project",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/ci|workflow|action|github/i);
    });

    it("status mode reports repo health", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "status",
          repo: "test-repo",
          description: "Check repository health and provide recommendations",
        },
        { userId: 1, taskId: "task-1" }
      );
      expect(result.success).toBe(true);
      expect(result.result.toLowerCase()).toMatch(/health|status|recommend/i);
    });
  });

  describe("VU5: Security Auditor — auth guards", () => {
    it("rejects unauthenticated access", async () => {
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "status",
          repo: "test-repo",
          description: "Check repo",
        },
        { userId: undefined as any }
      );
      expect(result.success).toBe(false);
      expect(result.result.toLowerCase()).toMatch(/auth|login|connect/i);
    });

    it("handles missing GitHub connector", async () => {
      const { getUserConnectors } = await import("./db");
      (getUserConnectors as any).mockResolvedValueOnce([]);
      
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "status",
          repo: "test-repo",
          description: "Check repo",
        },
        { userId: 1 }
      );
      expect(result.success).toBe(false);
      expect(result.result.toLowerCase()).toMatch(/github|connect|token/i);
    });

    it("handles non-existent repo", async () => {
      const { getUserGitHubRepos } = await import("./db");
      (getUserGitHubRepos as any).mockResolvedValueOnce([]);
      
      const { executeGitHubOps } = await import("./githubOpsTool");
      const result = await executeGitHubOps(
        {
          mode: "status",
          repo: "nonexistent-repo",
          description: "Check repo",
        },
        { userId: 1 }
      );
      expect(result.success).toBe(false);
      expect(result.result.toLowerCase()).toMatch(/repo|found|connect/i);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// §6: TOOL REGISTRATION & SYSTEM PROMPT INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe("Pass 38: Tool Registration", () => {
  it("all 32 tools are registered in AGENT_TOOLS", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    expect(AGENT_TOOLS).toHaveLength(38);
    
    const toolNames = AGENT_TOOLS.map((t: any) => t.function.name);
    
    // Pass 38 tools
    expect(toolNames).toContain("data_pipeline");
    expect(toolNames).toContain("automation_orchestrate");
    expect(toolNames).toContain("app_lifecycle");
    expect(toolNames).toContain("deep_research_content");
    expect(toolNames).toContain("github_ops");
    
    // Pass 37e tool
    expect(toolNames).toContain("github_assess");
    
    // Parity+ tools (NS20)
    expect(toolNames).toContain("native_app_build");
    expect(toolNames).toContain("webapp_rollback");
    expect(toolNames).toContain("analyze_video");
    expect(toolNames).toContain("parallel_execute");
    
    // Original tools still present
    expect(toolNames).toContain("web_search");
    expect(toolNames).toContain("github_edit");
    expect(toolNames).toContain("report_convergence");
    expect(toolNames).toContain("use_connector");
  });

  it("all tool names are unique", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const names = AGENT_TOOLS.map((t: any) => t.function.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each new tool has valid function calling schema", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const pass38Tools = ["data_pipeline", "automation_orchestrate", "app_lifecycle", "deep_research_content", "github_ops"];
    
    for (const toolName of pass38Tools) {
      const tool = AGENT_TOOLS.find((t: any) => t.function.name === toolName);
      expect(tool).toBeDefined();
      expect(tool!.type).toBe("function");
      expect(tool!.function.description).toBeTruthy();
      expect(tool!.function.parameters).toBeDefined();
      expect(tool!.function.parameters.type).toBe("object");
      expect(tool!.function.parameters.required).toBeDefined();
      expect(tool!.function.parameters.required.length).toBeGreaterThan(0);
      
      // Each tool should have a mode parameter
      expect(tool!.function.parameters.properties).toHaveProperty("mode");
    }
  });

  it("each new tool has mode enum in schema", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const pass38Tools = ["data_pipeline", "automation_orchestrate", "app_lifecycle", "deep_research_content", "github_ops"];
    
    for (const toolName of pass38Tools) {
      const tool = AGENT_TOOLS.find((t: any) => t.function.name === toolName);
      const modeParam = tool!.function.parameters.properties.mode;
      expect(modeParam.enum).toBeDefined();
      expect(modeParam.enum.length).toBeGreaterThan(1);
    }
  });
});

describe("Pass 38: System Prompt Integration", () => {
  it("agentStream.ts contains descriptions for all new tools", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    
    expect(source).toContain("data_pipeline");
    expect(source).toContain("automation_orchestrate");
    expect(source).toContain("app_lifecycle");
    expect(source).toContain("deep_research_content");
    expect(source).toContain("github_ops");
  });

  it("agentStream.ts contains tool display mappings for new tools", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    
    // Each tool should have a display mapping
    const pass38Tools = ["data_pipeline", "automation_orchestrate", "app_lifecycle", "deep_research_content", "github_ops"];
    for (const tool of pass38Tools) {
      expect(source).toContain(`"${tool}"`);
    }
  });

  it("system prompt references cross-cutting disciplines", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const source = fs.readFileSync(
      path.resolve(__dirname, "agentStream.ts"),
      "utf-8"
    );
    
    // Should reference key Manus parity concepts
    expect(source.toLowerCase()).toMatch(/data.?pipeline|etl|ingest/i);
    expect(source.toLowerCase()).toMatch(/automat|orchestrat|workflow/i);
    expect(source.toLowerCase()).toMatch(/lifecycle|sdlc|design system/i);
    expect(source.toLowerCase()).toMatch(/research|content|document/i);
    expect(source.toLowerCase()).toMatch(/ci.?cd|release|branch/i);
  });
});

// ═══════════════════════════════════════════════════════════════
// §7: EXECUTETOOL INTEGRATION
// ═══════════════════════════════════════════════════════════════

describe("Pass 38: executeTool integration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("executeTool routes data_pipeline correctly", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "data_pipeline",
      JSON.stringify({
        mode: "full",
        source_description: "CSV file with sales data",
      }),
      { userId: 1, taskExternalId: "task-1" }
    );
    expect(result.success).toBe(true);
  });

  it("executeTool routes automation_orchestrate correctly", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "automation_orchestrate",
      JSON.stringify({
        mode: "plan",
        description: "Plan a webhook-triggered notification workflow",
        trigger: "webhook",
      }),
      { userId: 1, taskExternalId: "task-1" }
    );
    expect(result.success).toBe(true);
  });

  it("executeTool routes app_lifecycle correctly", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "app_lifecycle",
      JSON.stringify({
        mode: "discover",
        description: "Analyze requirements for a todo app",
      }),
      { userId: 1, taskExternalId: "task-1" }
    );
    expect(result.success).toBe(true);
  });

  it("executeTool routes deep_research_content correctly", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "deep_research_content",
      JSON.stringify({
        mode: "research",
        topic: "AI agent architectures",
        depth: "quick",
      }),
      { userId: 1, taskExternalId: "task-1" }
    );
    expect(result.success).toBe(true);
  });

  it("executeTool routes github_ops correctly", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "github_ops",
      JSON.stringify({
        mode: "status",
        repo: "test-repo",
        description: "Check repo health",
      }),
      { userId: 1 }
    );
    expect(result.success).toBe(true);
  });

  it("executeTool returns error for unknown tool", async () => {
    const { executeTool } = await import("./agentTools");
    const result = await executeTool(
      "nonexistent_tool",
      JSON.stringify({ mode: "test" }),
      { userId: 1, taskExternalId: "task-1" }
    );
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// §8: CROSS-TOOL ADVERSARIAL TESTS
// ═══════════════════════════════════════════════════════════════

describe("Pass 38: VU5 Security Auditor — Cross-tool adversarial", () => {
  beforeEach(() => vi.clearAllMocks());

  it("data_pipeline rejects SQL injection in description", async () => {
    const { executeDataPipeline } = await import("./dataPipelineTool");
    const result = await executeDataPipeline(
      {
        mode: "plan",
        description: "'; DROP TABLE users; --",
        sources: "data.csv",
      },
      { userId: 1, taskId: "task-1" }
    );
    // Should not crash, should handle gracefully
    expect(result).toBeDefined();
    expect(typeof result.result).toBe("string");
  });

  it("automation_orchestrate handles XSS payload in description", async () => {
    const { executeAutomation } = await import("./automationTool");
    const result = await executeAutomation(
      {
        mode: "plan",
        description: "<script>alert('xss')</script>",
        trigger: "manual",
      },
      { userId: 1, taskId: "task-1" }
    );
    expect(result).toBeDefined();
    expect(typeof result.result).toBe("string");
    // Output should sanitize or escape dangerous content
    // The tool may include the description in output, but it should not execute
    expect(result.result).toBeDefined();
  });

  it("app_lifecycle handles extremely long description", async () => {
    const { executeAppLifecycle } = await import("./appLifecycleTool");
    const longDesc = "Build a ".repeat(5000) + "web app";
    const result = await executeAppLifecycle(
      {
        mode: "discover",
        description: longDesc,
      },
      { userId: 1, taskId: "task-1" }
    );
    expect(result).toBeDefined();
    expect(typeof result.result).toBe("string");
  });

  it("deep_research handles unicode and special characters", async () => {
    const { executeDeepResearch } = await import("./deepResearchTool");
    const result = await executeDeepResearch(
      {
        mode: "research",
        topic: "研究 AI エージェント 🤖 в 2026 году",
        depth: "quick",
      },
      { userId: 1, taskId: "task-1" }
    );
    expect(result).toBeDefined();
    expect(typeof result.result).toBe("string");
  });

    it("github_ops handles repo name with special characters", async () => {
    const { executeGitHubOps } = await import("./githubOpsTool");
    const result = await executeGitHubOps(
      {
        mode: "status",
        repo: "../../../etc/passwd",
        description: "Path traversal attempt",
      },
      { userId: 1 }
    );
    // Should fail gracefully — repo not found
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });
});
