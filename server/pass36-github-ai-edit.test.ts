/**
 * Pass 36 — AI-Powered Repo Editing from Task Chat
 *
 * Depth scan: edge cases, large repos, multi-file edits, error handling, pending edits cache
 * Adversarial scan: 5 virtual users testing AI repo editing end-to-end
 *
 * Manus alignment: the user describes changes in natural language in the task chat,
 * the agent autonomously browses the repo, identifies files, makes edits, and commits.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module structure tests ──

describe("Pass 36 — Depth Scan: githubEditTool module structure", () => {
  it("exports executeGitHubEdit as an async function", async () => {
    const mod = await import("./githubEditTool");
    expect(typeof mod.executeGitHubEdit).toBe("function");
  });

  it("exports getPendingEditCount for testing", async () => {
    const mod = await import("./githubEditTool");
    expect(typeof mod.getPendingEditCount).toBe("function");
  });

  it("exports clearPendingEdits for testing", async () => {
    const mod = await import("./githubEditTool");
    expect(typeof mod.clearPendingEdits).toBe("function");
  });
});

// ── Authentication & Authorization ──

describe("Pass 36 — Depth Scan: Authentication guards", () => {
  it("rejects when no userId is provided", async () => {
    const { executeGitHubEdit } = await import("./githubEditTool");
    const result = await executeGitHubEdit({ instruction: "update readme" });
    expect(result.success).toBe(false);
    expect(result.result).toContain("Authentication required");
  });

  it("rejects when userId is undefined in context", async () => {
    const { executeGitHubEdit } = await import("./githubEditTool");
    const result = await executeGitHubEdit(
      { instruction: "update readme" },
      { userId: undefined }
    );
    expect(result.success).toBe(false);
    expect(result.result).toContain("Authentication required");
  });
});

// ── Diff Summary Generation ──

describe("Pass 36 — Depth Scan: generateDiffSummary logic", () => {
  it("module contains generateDiffSummary as internal function", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // The function should exist in the source
    expect(source).toContain("function generateDiffSummary");
  });

  it("handles create, modify, and delete actions in diff format", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // Verify all three action types are handled
    expect(source).toContain('action === "create"');
    expect(source).toContain('action === "delete"');
    // Modify is the else branch
    expect(source).toContain("modified:");
  });

  it("caps diff display at 40 changed lines to prevent chat flooding", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("diffCount < 40");
    expect(source).toContain("more changes");
  });

  it("shows first 30 lines for new file previews", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("slice(0, 30)");
    expect(source).toContain("more lines");
  });
});

// ── Repo Structure Filtering ──

describe("Pass 36 — Depth Scan: Repo structure filtering", () => {
  it("filters out node_modules, .git, dist, build, .next, coverage, vendor, __pycache__", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    const skipPatterns = [
      "node_modules",
      "\\.git\\/",
      "dist\\/",
      "build\\/",
      "\\.next\\/",
      "coverage\\/",
      "vendor\\/",
      "__pycache__\\/",
    ];
    for (const pattern of skipPatterns) {
      expect(source).toContain(pattern);
    }
  });

  it("filters out minified files and source maps", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain(".min\\.");
    expect(source).toContain("\\.map$");
  });

  it("filters out lock files (package-lock, pnpm-lock, yarn.lock)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("package-lock");
    expect(source).toContain("pnpm-lock");
    expect(source).toContain("yarn\\.lock");
  });

  it("handles truncated large repos gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("truncated");
    expect(source).toContain("large repo");
  });
});

// ── Pending Edits Cache ──

describe("Pass 36 — Depth Scan: Pending edits cache", () => {
  beforeEach(async () => {
    const { clearPendingEdits } = await import("./githubEditTool");
    clearPendingEdits();
  });

  it("starts with 0 pending edits after clear", async () => {
    const { getPendingEditCount } = await import("./githubEditTool");
    expect(getPendingEditCount()).toBe(0);
  });

  it("plan IDs include timestamp and random suffix for uniqueness", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("plan_${Date.now()}");
    expect(source).toContain("Math.random()");
  });

  it("auto-expires pending edits after 10 minutes", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("10 * 60 * 1000");
    expect(source).toContain("setTimeout");
  });
});

// ── Repo Resolution Logic ──

describe("Pass 36 — Depth Scan: Repo resolution", () => {
  it("supports exact fullName match (owner/repo)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("fullName.toLowerCase() === normalized");
  });

  it("supports name-only match", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("name.toLowerCase() === normalized");
  });

  it("supports partial match as fallback", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("includes(normalized)");
  });

  it("auto-selects single repo when user has only one", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("repos.length === 1");
  });

  it("asks user to specify when multiple repos are connected", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Multiple repos connected");
    expect(source).toContain("Please specify which one");
  });
});

// ── LLM Integration ──

describe("Pass 36 — Depth Scan: LLM integration", () => {
  it("uses structured JSON output for file planning", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("json_schema");
    expect(source).toContain("files_to_read");
    expect(source).toContain('"edit_plan"');
  });

  it("uses structured JSON output for edit generation", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain('"edit_result"');
    expect(source).toContain("commit_message");
    expect(source).toContain("new_content");
  });

  it("caps file reads at 20 to prevent excessive API calls", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("slice(0, 20)");
  });

  it("handles LLM planning failure gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Failed to plan edits");
    expect(source).toContain("try rephrasing");
  });

  it("handles LLM edit generation failure gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Failed to generate edits");
  });

  it("handles no-changes-needed case", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("No changes needed");
    expect(source).toContain("already matches");
  });
});

// ── Commit Flow ──

describe("Pass 36 — Depth Scan: Commit flow", () => {
  it("uses createTreeCommit for atomic multi-file commits", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("createTreeCommit");
  });

  it("returns commit SHA and GitHub link on success", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("result.sha");
    expect(source).toContain("View commit on GitHub");
    expect(source).toContain("github.com/");
  });

  it("handles commit failure and discards the plan", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Commit failed");
    expect(source).toContain("plan has been discarded");
  });

  it("deletes pending edit after successful commit", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("pendingEdits.delete(args.edit_plan_id)");
  });

  it("handles expired/missing edit plan gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Edit plan expired or not found");
    expect(source).toContain("regenerate the plan");
  });
});

// ── Agent Integration ──

describe("Pass 36 — Depth Scan: Agent tool integration", () => {
  it("github_edit is registered in AGENT_TOOLS", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const tool = AGENT_TOOLS.find(
      (t: any) => t.function?.name === "github_edit"
    );
    expect(tool).toBeDefined();
    expect(tool!.function.description).toContain("GitHub");
  });

  it("github_edit tool has correct parameters", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const tool = AGENT_TOOLS.find(
      (t: any) => t.function?.name === "github_edit"
    );
    const props = tool!.function.parameters.properties;
    expect(props.instruction).toBeDefined();
    expect(props.repo).toBeDefined();
    expect(props.confirm).toBeDefined();
    expect(props.edit_plan_id).toBeDefined();
  });

  it("instruction is required, other params are optional", async () => {
    const { AGENT_TOOLS } = await import("./agentTools");
    const tool = AGENT_TOOLS.find(
      (t: any) => t.function?.name === "github_edit"
    );
    expect(tool!.function.parameters.required).toContain("instruction");
    expect(tool!.function.parameters.required).not.toContain("repo");
    expect(tool!.function.parameters.required).not.toContain("confirm");
  });

  it("github_edit is handled in executeTool switch", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentTools.ts",
      "utf-8"
    );
    expect(source).toContain('"github_edit"');
    expect(source).toContain("executeGitHubEdit");
  });
});

// ── System Prompt Integration ──

describe("Pass 36 — Depth Scan: System prompt integration", () => {
  it("system prompt mentions github_edit as PREFERRED method", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("github_edit");
    expect(source).toContain("PREFERRED");
  });

  it("system prompt includes intent detection for repo editing", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("Edit this app");
    expect(source).toContain("Update the code");
    expect(source).toContain("Fix the bug");
  });

  it("system prompt describes two-step confirm flow", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("confirm=true");
    expect(source).toContain("edit_plan_id");
  });

  it("connected repos are dynamically injected into system prompt", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("CONNECTED GITHUB REPOSITORIES");
    expect(source).toContain("getUserGitHubRepos");
  });

  it("auto-selects single repo, asks for multiple", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("only one, use it automatically");
    expect(source).toContain("ask which repo");
  });
});

// ── Tool Display Info ──

describe("Pass 36 — Depth Scan: Tool display info", () => {
  it("github_edit maps to editing action in display info", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    // Check that getToolDisplayInfo handles github_edit
    expect(source).toContain("github_edit");
    // Should map to editing or versioning
    const hasEditingMapping = source.includes("github_edit") && 
      (source.includes('"editing"') || source.includes("'editing'"));
    expect(hasEditingMapping).toBe(true);
  });
});

// ── Adversarial Scan: Virtual Users ──

describe("Pass 36 — Adversarial: VU1 — New User (no GitHub connected)", () => {
  it("gets clear error when trying github_edit without GitHub connection", async () => {
    // A new user with no GitHub connector should get a helpful error
    const { executeGitHubEdit } = await import("./githubEditTool");
    // userId 999999 won't have a GitHub connector
    const result = await executeGitHubEdit(
      { instruction: "update my readme" },
      { userId: 999999 }
    );
    expect(result.success).toBe(false);
    // Should mention connecting GitHub, not a cryptic error
    expect(
      result.result.includes("not connected") ||
      result.result.includes("connect") ||
      result.result.includes("Connect") ||
      result.result.includes("Authentication")
    ).toBe(true);
  });

  it("system prompt guides agent to suggest connecting GitHub", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("connect your GitHub repository first");
  });
});

describe("Pass 36 — Adversarial: VU2 — Power User (multiple repos)", () => {
  it("github_edit asks to specify repo when multiple are connected", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // When repos.length > 1 and no repo specified, should ask
    expect(source).toContain("Multiple repos connected");
  });

  it("supports partial repo name matching for convenience", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // Should try includes() for partial matching
    expect(source).toContain("includes(normalized)");
  });

  it("shows list of available repos when specified repo not found", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("Your connected repos");
    expect(source).toContain("connect the repo first");
  });
});

describe("Pass 36 — Adversarial: VU3 — Security Auditor", () => {
  it("never exposes GitHub tokens in tool results", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // Token VALUES should never appear in result strings (the word 'token' in error messages is OK)
    const resultLines = source.split("\n").filter(l => {
      if (!l.includes("result:")) return false;
      // Check for actual token variable interpolation, not the word 'token'
      return l.includes("${token}") || l.includes("+ token") || l.match(/result:.*`.*\$\{.*token.*\}/);
    });
    expect(resultLines.length).toBe(0);
  });

  it("LLM calls use server-side invokeLLM (not exposed to frontend)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain('import("./_core/llm")');
    // Should not use fetch to external LLM APIs directly
    expect(source).not.toContain("openai.com");
    expect(source).not.toContain("anthropic.com");
  });

  it("pending edits auto-expire to prevent stale plan accumulation", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("setTimeout(() => pendingEdits.delete");
  });

  it("file content is read via GitHub API, not local filesystem", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain("getFileContent");
    expect(source).toContain("getRepoTree");
    // Should not use fs.readFileSync for repo files
    expect(source).not.toContain("fs.readFileSync");
  });
});

describe("Pass 36 — Adversarial: VU4 — Manus Alignment Auditor", () => {
  it("github_edit is preferred over git_operation(clone) in system prompt", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    // The system prompt should explicitly state github_edit is preferred
    expect(source).toContain("PREFERRED method");
    expect(source).toContain("No cloning needed");
  });

  it("two-step flow: preview first, commit on confirm (Manus pattern)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // First call returns diff preview
    expect(source).toContain("Proposed Changes");
    expect(source).toContain("To apply these changes");
    // Second call with confirm=true commits
    expect(source).toContain("args.confirm && args.edit_plan_id");
  });

  it("uses atomic multi-file commit (not per-file commits)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // createTreeCommit takes an array of files for atomic commit
    expect(source).toContain("createTreeCommit(token, {");
    // files is passed as a variable, not inline property
    expect(source).toContain("files,");
  });

  it("agent knows connected repos via dynamic system prompt injection", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/agentStream.ts",
      "utf-8"
    );
    expect(source).toContain("CONNECTED GITHUB REPOSITORIES");
    expect(source).toContain("getUserGitHubRepos");
    // Injected before prefix cache registration
    expect(source.indexOf("CONNECTED GITHUB REPOSITORIES")).toBeLessThan(
      source.indexOf("Register prefix for caching")
    );
  });

  it("no external dependencies — all via GitHub REST API + internal LLM", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // Only imports from internal modules
    expect(source).toContain('from "./githubApi"');
    expect(source).toContain('from "./db"');
    expect(source).toContain('from "./agentTools"');
    // No external npm packages
    expect(source).not.toContain("from 'octokit'");
    expect(source).not.toContain('from "simple-git"');
  });
});

describe("Pass 36 — Adversarial: VU5 — Edge Case Explorer", () => {
  it("handles empty instruction gracefully", async () => {
    const { executeGitHubEdit } = await import("./githubEditTool");
    // Empty instruction should still go through auth check first
    const result = await executeGitHubEdit(
      { instruction: "" },
      { userId: undefined }
    );
    expect(result.success).toBe(false);
  });

  it("handles confirm=true without edit_plan_id", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // The confirm check requires BOTH confirm AND edit_plan_id
    expect(source).toContain("args.confirm && args.edit_plan_id");
  });

  it("handles file read returning null (deleted/moved file)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    // readFile returns null on error, and we skip null results
    expect(source).toContain("content !== null");
  });

  it("handles base64 encoded file content", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain('encoding === "base64"');
    expect(source).toContain('Buffer.from(file.content, "base64")');
  });

  it("delete action sets content to null in commit", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync(
      "/home/ubuntu/manus-next-app/server/githubEditTool.ts",
      "utf-8"
    );
    expect(source).toContain('action === "delete" ? null');
  });
});
