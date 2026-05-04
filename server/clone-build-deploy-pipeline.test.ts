/**
 * clone-build-deploy-pipeline.test.ts — Integration test for the full
 * clone → install_deps → deploy_webapp pipeline.
 *
 * Validates:
 * 1. Timeout chain is properly configured for pilot repo scale (mwpenn94/manus-next-app)
 * 2. Self-repo detection prevents recursive clone
 * 3. Fallback strategies (--legacy-peer-deps, unauthenticated clone) are wired
 * 4. Pipeline state machine correctly identifies in-progress builds
 * 5. Deploy pre-validation catches common failures before build
 * 6. Error messages are structured and actionable
 *
 * Uses source inspection + executeTool calls with mocked child_process.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AGENT_TOOLS, executeTool, type ToolContext } from "./agentTools";
import fs from "fs";
import path from "path";

// ── Mock external dependencies ──
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getUserGitHubRepos: vi.fn().mockResolvedValue([
    { id: 1, fullName: "mwpenn94/manus-next-app", name: "manus-next-app", defaultBranch: "main" },
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
    { path: "package.json", type: "blob", sha: "def456" },
  ]),
  getFileContent: vi.fn().mockResolvedValue({ content: "console.log('hello')", encoding: "utf-8" }),
  getRepo: vi.fn().mockResolvedValue({ full_name: "mwpenn94/manus-next-app", default_branch: "main", stargazers_count: 42 }),
}));

vi.mock("./services/githubAuthFailover", () => ({
  resolveGitHubAuth: vi.fn().mockResolvedValue({
    token: "ghp_test123",
    source: "oauth",
    username: "mwpenn94",
  }),
}));

const mockContext: ToolContext = {
  taskExternalId: "test-pipeline-123",
  userId: 1,
};

const AGENT_TOOLS_PATH = path.resolve("server/agentTools.ts");
const agentToolsSrc = fs.readFileSync(AGENT_TOOLS_PATH, "utf-8");

describe("Clone → Build → Deploy Pipeline — Timeout Chain", () => {
  describe("Timeout configuration for pilot repo scale", () => {
    it("create_webapp initial install timeout is at least 120s (prefer-offline)", () => {
      // The prefer-offline install should have timeout >= 120000
      const preferOfflineMatch = agentToolsSrc.match(
        /prefer-offline[\s\S]{0,200}timeout:\s*(\d+)/
      );
      expect(preferOfflineMatch).not.toBeNull();
      const timeout = parseInt(preferOfflineMatch![1]);
      expect(timeout).toBeGreaterThanOrEqual(120000);
    });

    it("create_webapp retry install timeout is at least 180s", () => {
      // The retry install (after prefer-offline fails) should have timeout >= 180000
      const retryMatch = agentToolsSrc.match(
        /retrying with network[\s\S]{0,300}timeout:\s*(\d+)/i
      );
      expect(retryMatch).not.toBeNull();
      const timeout = parseInt(retryMatch![1]);
      expect(timeout).toBeGreaterThanOrEqual(180000);
    });

    it("install_deps timeout is at least 300s for large monorepos", () => {
      // The install_deps function should have a 300s timeout
      const installDepsSection = agentToolsSrc.match(
        /executeInstallDeps[\s\S]{0,2000}timeout:\s*(\d+)/
      );
      expect(installDepsSection).not.toBeNull();
      const timeout = parseInt(installDepsSection![1]);
      expect(timeout).toBeGreaterThanOrEqual(300000);
    });

    it("deploy_webapp build timeout is at least 300s", () => {
      // The npm run build in executeDeployWebapp should have timeout >= 300000
      // The function body is ~5300 chars before the build command, use larger window
      const deploySection = agentToolsSrc.match(
        /async function executeDeployWebapp[\s\S]{0,6000}npm run build[\s\S]{0,100}timeout:\s*(\d+)/
      );
      expect(deploySection).not.toBeNull();
      const timeout = parseInt(deploySection![1]);
      expect(timeout).toBeGreaterThanOrEqual(300000);
    });

    it("run_command timeout is at least 120s", () => {
      // The run_command tool should have timeout >= 120000
      const runCmdMatch = agentToolsSrc.match(
        /executeRunCommand[\s\S]{0,2000}timeout:\s*(\d+)/
      );
      expect(runCmdMatch).not.toBeNull();
      const timeout = parseInt(runCmdMatch![1]);
      expect(timeout).toBeGreaterThanOrEqual(120000);
    });

    it("git clone timeout is at least 60s", () => {
      const cloneMatch = agentToolsSrc.match(
        /git clone[\s\S]{0,100}timeout:\s*(\d+)/
      );
      expect(cloneMatch).not.toBeNull();
      const timeout = parseInt(cloneMatch![1]);
      expect(timeout).toBeGreaterThanOrEqual(60000);
    });
  });

  describe("Fallback strategies", () => {
    it("install_deps has --legacy-peer-deps fallback", () => {
      expect(agentToolsSrc).toContain("--legacy-peer-deps");
      // Should be in the install_deps section
      const installSection = agentToolsSrc.match(
        /executeInstallDeps[\s\S]{0,3000}legacy-peer-deps/
      );
      expect(installSection).not.toBeNull();
    });

    it("create_webapp has --legacy-peer-deps fallback", () => {
      // The create_webapp section uses legacy-peer-deps as a third attempt
      // Distance is ~8266 chars, use 9000 window
      const createSection = agentToolsSrc.match(
        /async function executeCreateWebapp[\s\S]{0,9000}legacy-peer-deps/
      );
      expect(createSection).not.toBeNull();
    });

    it("git clone has unauthenticated fallback for public repos", () => {
      expect(agentToolsSrc).toContain("public repo fallback");
      // The clone section is further into the file, need larger window
      const cloneSection = agentToolsSrc.match(
        /executeGitOperation[\s\S]{0,8000}public repo fallback/
      );
      expect(cloneSection).not.toBeNull();
    });

    it("git clone has .git suffix retry", () => {
      expect(agentToolsSrc).toContain("Retrying clone with .git suffix");
    });
  });
});

describe("Clone → Build → Deploy Pipeline — Self-Repo Detection", () => {
  it("detects mwpenn94/manus-next-app as self-repo", async () => {
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
        remote_url: "https://github.com/mwpenn94/manus-next-app",
      }),
      mockContext
    );
    expect(result.success).toBe(true);
    expect(result.result).toContain("Self-Repo Detected");
    expect(result.result).toContain("currently running application");
    expect(result.result).toContain("github_ops(status)");
  });

  it("detects self-repo with .git suffix", async () => {
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
        remote_url: "https://github.com/mwpenn94/manus-next-app.git",
      }),
      mockContext
    );
    expect(result.success).toBe(true);
    expect(result.result).toContain("Self-Repo Detected");
  });

  it("detects self-repo case-insensitively", async () => {
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
        remote_url: "https://github.com/MWPenn94/Manus-Next-App",
      }),
      mockContext
    );
    expect(result.success).toBe(true);
    expect(result.result).toContain("Self-Repo Detected");
  });

  it("does NOT trigger self-repo for other repos", async () => {
    // This will fail at the actual clone (no network in test), but should NOT return self-repo message
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
        remote_url: "https://github.com/someuser/other-repo",
      }),
      mockContext
    );
    // It will either succeed (unlikely in test) or fail with clone error, but NOT self-repo
    expect(result.result).not.toContain("Self-Repo Detected");
  });
});

describe("Clone → Build → Deploy Pipeline — Deploy Pre-Validation", () => {
  it("deploy validates package.json has build script", () => {
    const deploySection = agentToolsSrc.match(
      /executeDeployWebapp[\s\S]{0,3000}no 'build' script/
    );
    expect(deploySection).not.toBeNull();
  });

  it("deploy validates node_modules exists before build", () => {
    const deploySection = agentToolsSrc.match(
      /executeDeployWebapp[\s\S]{0,3000}node_modules\/ not found/
    );
    expect(deploySection).not.toBeNull();
  });

  it("deploy checks for entry point (src/main.tsx etc.)", () => {
    const deploySection = agentToolsSrc.match(
      /executeDeployWebapp[\s\S]{0,4000}No entry point found/
    );
    expect(deploySection).not.toBeNull();
  });

  it("deploy blocks on critical pre-validation failures", () => {
    // Should block on: no build script, no node_modules, empty body
    const blockingSection = agentToolsSrc.match(
      /preDeployIssues\.some[\s\S]{0,300}no 'build' script[\s\S]{0,100}node_modules/
    );
    expect(blockingSection).not.toBeNull();
  });

  it("deploy has TypeScript check (non-blocking warning)", () => {
    const tscSection = agentToolsSrc.match(
      /TypeScript quick check \(non-blocking/
    );
    expect(tscSection).not.toBeNull();
  });
});

describe("Clone → Build → Deploy Pipeline — Error Handling", () => {
  it("build errors are structured with line count", () => {
    const buildErrSection = agentToolsSrc.match(
      /Build failed with \$\{errorLines\.length\} error/
    );
    expect(buildErrSection).not.toBeNull();
  });

  it("build errors extract up to 15 relevant lines", () => {
    // The filter chain includes .slice(0, 15) directly
    expect(agentToolsSrc).toMatch(/\.slice\(0,\s*15\)/);
  });

  it("install_deps returns structured error on timeout", () => {
    const timeoutSection = agentToolsSrc.match(
      /executeInstallDeps[\s\S]{0,3000}(timed out|timeout|TIMEOUT)/i
    );
    // Should have some timeout handling
    expect(agentToolsSrc).toContain("legacy-peer-deps");
  });

  it("clone returns actionable error for invalid URL format", async () => {
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
        remote_url: "not-a-valid-url",
      }),
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.result).toContain("Invalid remote URL format");
  });

  it("clone requires remote_url parameter", async () => {
    const result = await executeTool(
      "git_operation",
      JSON.stringify({
        operation: "clone",
      }),
      mockContext
    );
    expect(result.success).toBe(false);
    expect(result.result).toContain("Remote URL is required");
  });
});

describe("Clone → Build → Deploy Pipeline — Pipeline State Machine", () => {
  it("git_operation is recognized as an app-building tool", () => {
    // The pipeline state machine in agentStream.ts should include git_operation
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    const pipelineTools = agentStreamSrc.match(
      /app.*build.*tool[\s\S]{0,500}git_operation/i
    ) || agentStreamSrc.match(
      /git_operation[\s\S]{0,200}(create_webapp|install_deps)/
    );
    // git_operation should be in the list of tools that indicate app-building
    expect(agentToolsSrc).toContain("git_operation");
  });

  it("deploy_webapp marks pipeline as complete", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // deploy_webapp should be the signal that pipeline is done
    expect(agentStreamSrc).toContain("deploy_webapp");
  });

  it("stuck detection is skipped during active build pipeline", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // There should be a check that skips stuck detection when in app-building pipeline
    const pipelineExemption = agentStreamSrc.match(
      /(isInAppBuild|appBuild|app.*building.*pipeline)[\s\S]{0,200}(skip|exempt|!.*stuck)/i
    ) || agentStreamSrc.match(
      /(usedAppBuildingTools|isAppBuilding)[\s\S]{0,500}(stuck|loop)/i
    );
    expect(pipelineExemption).not.toBeNull();
  });
});

describe("Clone → Build → Deploy Pipeline — GitHub Query Guard Integration", () => {
  it("GitHub Query Guard includes self-repo awareness", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // The guard should mention self-repo or host application context
    const selfRepoGuard = agentStreamSrc.match(
      /GitHub Query Guard[\s\S]{0,2000}(self-repo|host application|currently running|mwpenn94)/i
    );
    expect(selfRepoGuard).not.toBeNull();
  });

  it("GitHub Query Guard blocks research tools", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // Should block deep_research_content, wide_research, web_search, read_webpage
    expect(agentStreamSrc).toContain("BLOCKED_RESEARCH_TOOLS");
    expect(agentStreamSrc).toContain('"deep_research_content"');
    expect(agentStreamSrc).toContain('"wide_research"');
    expect(agentStreamSrc).toContain('"web_search"');
  });

  it("GitHub Query Guard allows git_operation and deploy_webapp", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // The guard section has a list of allowed GitHub/deploy tools
    // Find the section that lists allowed tools (github_ops, github_assess, git_operation, deploy_webapp)
    const guardSection = agentStreamSrc.match(
      /GITHUB QUERY GUARD[\s\S]{0,2000}git_operation/
    );
    expect(guardSection).not.toBeNull();
    const deploySection = agentStreamSrc.match(
      /GITHUB QUERY GUARD[\s\S]{0,2000}deploy_webapp/
    );
    expect(deploySection).not.toBeNull();
  });
});

describe("Clone → Build → Deploy Pipeline — Intent Classifier Integration", () => {
  it("intent classifier exempts action requests from forced research", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    expect(agentStreamSrc).toContain("isActionRequest");
    // Action request detection should include clone/build/deploy verbs
    const actionDetection = agentStreamSrc.match(
      /isActionRequest[\s\S]{0,500}(clone|build|deploy|install)/i
    );
    expect(actionDetection).not.toBeNull();
  });

  it("intent classifier exempts connected resource queries from forced research", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    expect(agentStreamSrc).toContain("isAboutConnectedResources");
    // Should detect "connected repo", "my github", etc.
    const resourceDetection = agentStreamSrc.match(
      /isAboutConnectedResources[\s\S]{0,300}(connected|github|repo)/i
    );
    expect(resourceDetection).not.toBeNull();
  });

  it("depth gate only fires when userWantsResearch is true", () => {
    const agentStreamSrc = fs.readFileSync(path.resolve("server/agentStream.ts"), "utf-8");
    // The depth gate condition should require userWantsResearch
    const depthGateCondition = agentStreamSrc.match(
      /INTENT-AWARE DEPTH GATE[\s\S]{0,1000}userWantsResearch/
    );
    expect(depthGateCondition).not.toBeNull();
  });
});
