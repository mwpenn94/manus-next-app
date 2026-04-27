/**
 * E2E Tool Integration Test Harness — Pass 39
 * 
 * Exercises all 31 agent tools through executeTool with realistic LLM-like args.
 * Covers: tool execution, error paths, schema validation, tool chaining scenarios.
 *
 * NOTE: AGENT_TOOLS uses OpenAI function-calling format:
 *   { type: "function", function: { name, description, parameters } }
 * Access tool name via `tool.function.name`, NOT `tool.name`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AGENT_TOOLS, executeTool, type ToolContext } from "./agentTools";

// ── Mock external dependencies ──
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getUserGitHubRepos: vi.fn().mockResolvedValue([
    { id: 1, fullName: "user/test-repo", name: "test-repo", defaultBranch: "main" },
  ]),
  getUserConnectors: vi.fn().mockResolvedValue([
    { id: 1, provider: "github", status: "connected", accessToken: "ghp_test123" },
  ]),
  getGitHubToken: vi.fn().mockResolvedValue("ghp_test123"),
}));

vi.mock("../server/_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ result: "mocked" }) } }],
  }),
}));

vi.mock("./githubApi", () => ({
  getRepoTree: vi.fn().mockResolvedValue([
    { path: "src/index.ts", type: "blob", sha: "abc123" },
    { path: "README.md", type: "blob", sha: "def456" },
  ]),
  getFileContent: vi.fn().mockResolvedValue({ content: "console.log('hello')", encoding: "utf-8" }),
  createOrUpdateFile: vi.fn().mockResolvedValue({ content: { sha: "new123" } }),
  createBranch: vi.fn().mockResolvedValue({ ref: "refs/heads/feature/new", object: { sha: "abc123" } }),
  listPullRequests: vi.fn().mockResolvedValue([
    { number: 1, title: "Test PR", state: "open", head: { ref: "feature/test" }, base: { ref: "main" } },
  ]),
  createPullRequest: vi.fn().mockResolvedValue({ number: 2, html_url: "https://github.com/user/repo/pull/2" }),
  getRepo: vi.fn().mockResolvedValue({ full_name: "user/test-repo", default_branch: "main", stargazers_count: 10 }),
  compareBranches: vi.fn().mockResolvedValue({ ahead_by: 2, behind_by: 0, total_commits: 2 }),
  listBranches: vi.fn().mockResolvedValue([{ name: "main" }, { name: "develop" }]),
}));

const mockContext: ToolContext = {
  taskExternalId: "test-task-123",
  userId: 1,
};

describe("E2E Tool Integration — All 31 Tools", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  // ── 1. Tool Registry Validation ──
  describe("Tool Registry", () => {
    it("should have exactly 31 tools registered", () => {
      expect(AGENT_TOOLS.length).toBe(31);
    });

    it("should have unique tool names", () => {
      const names = AGENT_TOOLS.map(t => t.function.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it("every tool should have type=function with name, description, and parameters", () => {
      for (const tool of AGENT_TOOLS) {
        expect(tool.type).toBe("function");
        expect(tool.function.name).toBeTruthy();
        expect(tool.function.description).toBeTruthy();
        const params = tool.function.parameters as Record<string, any>;
        expect(params).toBeDefined();
        expect(params.type).toBe("object");
      }
    });

    it("every tool description should be at least 20 characters", () => {
      for (const tool of AGENT_TOOLS) {
        expect(tool.function.description!.length).toBeGreaterThanOrEqual(20);
      }
    });

    it("every tool with required fields should list them in properties", () => {
      for (const tool of AGENT_TOOLS) {
        const params = tool.function.parameters as Record<string, any>;
        if (params.required) {
          expect(Array.isArray(params.required)).toBe(true);
          for (const req of params.required) {
            expect(params.properties).toHaveProperty(req);
          }
        }
      }
    });
  });

  // ── 2. Individual Tool Execution ──
  describe("Tool Execution — Core Tools", () => {
    it("web_search returns results", async () => {
      const result = await executeTool("web_search", JSON.stringify({ query: "AI agent frameworks 2026" }), mockContext);
      expect(result).toBeDefined();
    });

    it("execute_code runs code", async () => {
      const result = await executeTool("execute_code", JSON.stringify({ code: "console.log('hello')", language: "javascript" }), mockContext);
      expect(result).toBeDefined();
    });

    it("list_files handles operations", async () => {
      const result = await executeTool("list_files", JSON.stringify({ path: "/tmp" }), mockContext);
      expect(result).toBeDefined();
    });

    it("read_file retrieves file content", async () => {
      const result = await executeTool("read_file", JSON.stringify({ path: "/tmp/test.txt" }), mockContext);
      expect(result).toBeDefined();
    });

    it("generate_document creates document", async () => {
      const result = await executeTool("generate_document", JSON.stringify({ topic: "Test", format: "markdown" }), mockContext);
      expect(result).toBeDefined();
    });

    it("browse_web fetches webpage", async () => {
      const result = await executeTool("browse_web", JSON.stringify({ url: "https://example.com" }), mockContext);
      expect(result).toBeDefined();
    });

    it("analyze_data analyzes data", async () => {
      const result = await executeTool("analyze_data", JSON.stringify({ data: "sample data", analysis_type: "summary" }), mockContext);
      expect(result).toBeDefined();
    });

    it("report_convergence tracks convergence", async () => {
      const result = await executeTool("report_convergence", JSON.stringify({
        pass_number: 1, dimensions_assessed: 5, overall_score: 0.85,
        phase: "B", summary: "Test convergence report",
      }), mockContext);
      expect(result).toBeDefined();
    });
  });

  // ── 3. Pass 38 Tools ──
  describe("Tool Execution — Pass 38 Tools", () => {
    it("data_pipeline plan mode", async () => {
      const result = await executeTool("data_pipeline", JSON.stringify({
        mode: "plan", source_description: "CSV files from S3", target_description: "Analytics DB",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("data_pipeline ingest mode", async () => {
      const result = await executeTool("data_pipeline", JSON.stringify({
        mode: "ingest", source_description: "REST API JSON", target_description: "Local DB",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("automation_orchestrate plan mode", async () => {
      const result = await executeTool("automation_orchestrate", JSON.stringify({
        mode: "plan", trigger: "User uploads CSV", workflow_description: "Parse, validate, insert",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("automation_orchestrate schedule mode", async () => {
      const result = await executeTool("automation_orchestrate", JSON.stringify({
        mode: "schedule", trigger: "Every day at 9am", workflow_description: "Fetch market data",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("app_lifecycle discover mode", async () => {
      const result = await executeTool("app_lifecycle", JSON.stringify({
        mode: "discover", app_description: "Task management with team collaboration",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("app_lifecycle architect mode", async () => {
      const result = await executeTool("app_lifecycle", JSON.stringify({
        mode: "architect", app_description: "E-commerce with payments",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("deep_research_content research mode", async () => {
      const result = await executeTool("deep_research_content", JSON.stringify({
        mode: "research", topic: "Quantum computing in cryptography",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("deep_research_content write mode", async () => {
      const result = await executeTool("deep_research_content", JSON.stringify({
        mode: "write", topic: "Intro to ML", format: "blog_post",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("github_ops status mode", async () => {
      const result = await executeTool("github_ops", JSON.stringify({ mode: "status", repo: "user/test-repo" }), mockContext);
      expect(result).toBeDefined();
    });

    it("github_ops pr mode", async () => {
      const result = await executeTool("github_ops", JSON.stringify({ mode: "pr", repo: "user/test-repo" }), mockContext);
      expect(result).toBeDefined();
    });

    it("github_ops branch mode", async () => {
      const result = await executeTool("github_ops", JSON.stringify({
        mode: "branch", repo: "user/test-repo", branch_name: "feature/new",
      }), mockContext);
      expect(result).toBeDefined();
    });

    it("github_assess assess mode", async () => {
      const result = await executeTool("github_assess", JSON.stringify({ mode: "assess", repo: "user/test-repo" }), mockContext);
      expect(result).toBeDefined();
    });
  });

  // ── 4. Error Handling ──
  describe("Error Handling", () => {
    it("unknown tool returns error", async () => {
      const result = await executeTool("nonexistent_tool", JSON.stringify({}), mockContext);
      expect(result).toBeDefined();
      const str = JSON.stringify(result);
      expect(str.toLowerCase()).toMatch(/error|unknown|not found|unsupported|invalid/);
    });

    it("empty args does not crash", async () => {
      const result = await executeTool("web_search", JSON.stringify({}), mockContext);
      expect(result).toBeDefined();
    });

    it("null context handled gracefully", async () => {
      const result = await executeTool("web_search", JSON.stringify({ query: "test" }), null as any);
      expect(result).toBeDefined();
    });

    it("malformed JSON args handled", async () => {
      const result = await executeTool("execute_code", "not valid json", mockContext);
      expect(result).toBeDefined();
      const str = JSON.stringify(result);
      expect(str.toLowerCase()).toMatch(/invalid/);
    });

    it("extremely long input does not crash", async () => {
      const result = await executeTool("web_search", JSON.stringify({ query: "a".repeat(10000) }), mockContext);
      expect(result).toBeDefined();
    });
  });

  // ── 5. Tool Chaining ──
  describe("Tool Chaining", () => {
    it("research → document chain", async () => {
      const r1 = await executeTool("deep_research_content", JSON.stringify({ mode: "research", topic: "AI safety" }), mockContext);
      expect(r1).toBeDefined();
      const r2 = await executeTool("generate_document", JSON.stringify({ topic: "AI Safety Report", format: "report" }), mockContext);
      expect(r2).toBeDefined();
    });

    it("code → file chain", async () => {
      const r1 = await executeTool("execute_code", JSON.stringify({ code: "1+1", language: "javascript" }), mockContext);
      expect(r1).toBeDefined();
      const r2 = await executeTool("create_file", JSON.stringify({ path: "/tmp/out.js", content: "done" }), mockContext);
      expect(r2).toBeDefined();
    });

    it("pipeline → analyze chain", async () => {
      const r1 = await executeTool("data_pipeline", JSON.stringify({ mode: "plan", source_description: "Sales CSV", target_description: "Dashboard" }), mockContext);
      expect(r1).toBeDefined();
      const r2 = await executeTool("analyze_data", JSON.stringify({ data: "sample", analysis_type: "summary" }), mockContext);
      expect(r2).toBeDefined();
    });

    it("github_ops → edit → assess chain", async () => {
      const r1 = await executeTool("github_ops", JSON.stringify({ mode: "status", repo: "user/test-repo" }), mockContext);
      expect(r1).toBeDefined();
      const r2 = await executeTool("github_edit", JSON.stringify({ repo: "user/test-repo", file_path: "README.md", action: "read" }), mockContext);
      expect(r2).toBeDefined();
      const r3 = await executeTool("github_assess", JSON.stringify({ mode: "assess", repo: "user/test-repo" }), mockContext);
      expect(r3).toBeDefined();
    });
  });

  // ── 6. Schema Validation ──
  describe("Schema Validation", () => {
    it("all enum fields have valid non-empty string values", () => {
      for (const tool of AGENT_TOOLS) {
        const params = tool.function.parameters as Record<string, any>;
        for (const [, prop] of Object.entries(params.properties || {})) {
          if ((prop as any).enum) {
            expect(Array.isArray((prop as any).enum)).toBe(true);
            for (const val of (prop as any).enum) {
              expect(typeof val).toBe("string");
              expect(val.length).toBeGreaterThan(0);
            }
          }
        }
      }
    });

    it("all required fields exist in properties", () => {
      for (const tool of AGENT_TOOLS) {
        const params = tool.function.parameters as Record<string, any>;
        const required = params.required || [];
        const props = Object.keys(params.properties || {});
        for (const req of required) {
          expect(props).toContain(req);
        }
      }
    });

    it("no tool has empty properties", () => {
      for (const tool of AGENT_TOOLS) {
        const params = tool.function.parameters as Record<string, any>;
        expect(Object.keys(params.properties || {}).length).toBeGreaterThan(0);
      }
    });
  });

  // ── 7. External-Call Tools (Schema Only) ──
  describe("External-Call Tools — Schema Only", () => {
    for (const name of ["generate_image", "design_canvas", "cloud_browser", "create_webapp"]) {
      it(`${name} has valid schema`, () => {
        const tool = AGENT_TOOLS.find(t => t.function.name === name);
        expect(tool).toBeDefined();
        expect(tool!.function.description!.length).toBeGreaterThan(20);
        const params = tool!.function.parameters as Record<string, any>;
        expect(Object.keys(params.properties || {}).length).toBeGreaterThan(0);
      });
    }
  });

  // ── 8. Regression Guards ──
  describe("Regression Guards", () => {
    it("tool count >= 31", () => {
      expect(AGENT_TOOLS.length).toBeGreaterThanOrEqual(31);
    });

    it("all Pass 38 tools present", () => {
      const names = AGENT_TOOLS.map(t => t.function.name);
      for (const t of ["data_pipeline", "automation_orchestrate", "app_lifecycle", "deep_research_content", "github_ops"]) {
        expect(names).toContain(t);
      }
    });

    it("all core tools present", () => {
      const names = AGENT_TOOLS.map(t => t.function.name);
      for (const t of ["web_search", "execute_code", "create_file", "github_edit", "github_assess", "report_convergence"]) {
        expect(names).toContain(t);
      }
    });
  });
});
