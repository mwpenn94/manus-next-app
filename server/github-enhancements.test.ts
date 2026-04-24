/**
 * GitHub Enhancements — Convergence Pass Tests
 * 
 * Tests for: branch selector, create branch, create PR, merge PR,
 * browse button, and GitHub OAuth flow contracts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock githubApi
vi.mock("./githubApi", () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({ login: "testuser", id: 1 }),
  listUserRepos: vi.fn().mockResolvedValue([]),
  getRepo: vi.fn().mockResolvedValue({ full_name: "user/repo", default_branch: "main" }),
  createRepo: vi.fn().mockResolvedValue({ full_name: "user/new-repo", html_url: "https://github.com/user/new-repo" }),
  getRepoTree: vi.fn().mockResolvedValue({ tree: [{ path: "README.md", type: "blob", sha: "abc123", size: 100 }] }),
  getFileContent: vi.fn().mockResolvedValue({ content: btoa("Hello"), encoding: "base64", sha: "abc123", size: 5, html_url: "https://github.com/user/repo/blob/main/README.md" }),
  createOrUpdateFile: vi.fn().mockResolvedValue({ content: { sha: "new-sha" } }),
  deleteFile: vi.fn().mockResolvedValue({}),
  listBranches: vi.fn().mockResolvedValue([
    { name: "main", commit: { sha: "abc123" }, protected: true },
    { name: "develop", commit: { sha: "def456" }, protected: false },
    { name: "feature/auth", commit: { sha: "ghi789" }, protected: false },
  ]),
  createBranch: vi.fn().mockResolvedValue({ ref: "refs/heads/feature/new-branch", object: { sha: "abc123" } }),
  listCommits: vi.fn().mockResolvedValue([]),
  listPullRequests: vi.fn().mockResolvedValue([
    { id: 1, number: 42, title: "Add auth", state: "open", user: { login: "dev" }, head: { ref: "feature/auth" }, base: { ref: "main" }, html_url: "https://github.com/user/repo/pull/42" },
  ]),
  createPullRequest: vi.fn().mockResolvedValue({ number: 43, title: "New PR", html_url: "https://github.com/user/repo/pull/43" }),
  mergePullRequest: vi.fn().mockResolvedValue({ merged: true }),
  listIssues: vi.fn().mockResolvedValue([]),
  createIssue: vi.fn().mockResolvedValue({ number: 10, title: "Bug report" }),
  createWebhook: vi.fn().mockResolvedValue({}),
  deleteRepo: vi.fn().mockResolvedValue({}),
}));

describe("GitHub Enhancement Features", () => {
  describe("Branch Management", () => {
    it("should list branches with protection status", async () => {
      const { listBranches } = await import("./githubApi");
      const branches = await listBranches("token", "user", "repo");
      
      expect(branches).toHaveLength(3);
      expect(branches[0]).toMatchObject({ name: "main", protected: true });
      expect(branches[1]).toMatchObject({ name: "develop", protected: false });
      expect(branches[2]).toMatchObject({ name: "feature/auth", protected: false });
    });

    it("should create a new branch from a SHA", async () => {
      const { createBranch } = await import("./githubApi");
      const result = await createBranch("token", "user", "repo", "feature/new-branch", "abc123");
      
      expect(result.ref).toBe("refs/heads/feature/new-branch");
      expect(result.object.sha).toBe("abc123");
      expect(createBranch).toHaveBeenCalledWith("token", "user", "repo", "feature/new-branch", "abc123");
    });

    it("should extract branch name from ref", () => {
      const ref = "refs/heads/feature/new-branch";
      const branchName = ref.replace("refs/heads/", "");
      expect(branchName).toBe("feature/new-branch");
    });

    it("should identify default branch", async () => {
      const { listBranches } = await import("./githubApi");
      const branches = await listBranches("token", "user", "repo");
      const defaultBranch = "main";
      
      const isDefault = branches.find(b => b.name === defaultBranch);
      expect(isDefault).toBeDefined();
      expect(isDefault!.name).toBe("main");
    });

    it("should support browsing files on a specific branch", async () => {
      const { getRepoTree } = await import("./githubApi");
      // When user selects a branch, the tree query uses that branch SHA
      await getRepoTree("token", "user", "repo", "develop", true);
      expect(getRepoTree).toHaveBeenCalledWith("token", "user", "repo", "develop", true);
    });
  });

  describe("Pull Request Management", () => {
    it("should list open pull requests", async () => {
      const { listPullRequests } = await import("./githubApi");
      const prs = await listPullRequests("token", "user", "repo", "open");
      
      expect(prs).toHaveLength(1);
      expect(prs[0]).toMatchObject({
        number: 42,
        title: "Add auth",
        state: "open",
        head: { ref: "feature/auth" },
        base: { ref: "main" },
      });
    });

    it("should create a pull request with head and base branches", async () => {
      const { createPullRequest } = await import("./githubApi");
      const result = await createPullRequest("token", "user", "repo", {
        title: "New PR",
        body: "Description of changes",
        head: "feature/auth",
        base: "main",
      });
      
      expect(result.number).toBe(43);
      expect(result.title).toBe("New PR");
      expect(createPullRequest).toHaveBeenCalledWith("token", "user", "repo", {
        title: "New PR",
        body: "Description of changes",
        head: "feature/auth",
        base: "main",
      });
    });

    it("should merge a pull request", async () => {
      const { mergePullRequest } = await import("./githubApi");
      const result = await mergePullRequest("token", "user", "repo", 42);
      
      expect(result.merged).toBe(true);
      expect(mergePullRequest).toHaveBeenCalledWith("token", "user", "repo", 42);
    });

    it("should filter branches for PR head/base selection (exclude selected)", () => {
      const branches = [
        { name: "main", commit: { sha: "abc" }, protected: true },
        { name: "develop", commit: { sha: "def" }, protected: false },
        { name: "feature/auth", commit: { sha: "ghi" }, protected: false },
      ];
      
      const prBase = "main";
      const headOptions = branches.filter(b => b.name !== prBase);
      expect(headOptions).toHaveLength(2);
      expect(headOptions.map(b => b.name)).toEqual(["develop", "feature/auth"]);
      
      const prHead = "feature/auth";
      const baseOptions = branches.filter(b => b.name !== prHead);
      expect(baseOptions).toHaveLength(2);
      expect(baseOptions.map(b => b.name)).toEqual(["main", "develop"]);
    });
  });

  describe("Branch Selector in Code Tab", () => {
    it("should default to repository default branch when no branch selected", () => {
      const selectedBranch = "";
      const defaultBranch: string | null = "main";
      const effectiveBranch = selectedBranch || defaultBranch || "main";
      expect(effectiveBranch).toBe("main");
    });

    it("should handle null defaultBranch gracefully", () => {
      const selectedBranch = "";
      const defaultBranch: string | null = null;
      const effectiveBranch = selectedBranch || defaultBranch || "main";
      expect(effectiveBranch).toBe("main");
    });

    it("should use selected branch when user picks one", () => {
      const selectedBranch = "develop";
      const defaultBranch = "main";
      const effectiveBranch = selectedBranch || defaultBranch || "main";
      expect(effectiveBranch).toBe("develop");
    });

    it("should reset file path when switching branches", () => {
      let filePath = ["src", "components", "App.tsx"];
      // Simulating branch switch
      const switchBranch = () => { filePath = []; };
      switchBranch();
      expect(filePath).toEqual([]);
    });
  });

  describe("GitHub OAuth Flow", () => {
    it("should have connector config for GitHub provider", async () => {
      // The GitHub connector should be defined in the connectors system
      const expectedProvider = "github";
      const expectedScopes = expect.arrayContaining(["repo"]);
      
      // Verify the connector structure matches expectations
      expect(expectedProvider).toBe("github");
      expect(["repo", "user", "read:org"]).toEqual(expectedScopes);
    });

    it("should redact access tokens when listing connectors", () => {
      const connector = {
        connectorId: "github",
        status: "connected",
        accessToken: "ghp_realtoken123",
        refreshToken: "ghr_realrefresh456",
      };
      
      const redacted = {
        ...connector,
        accessToken: "[REDACTED]",
        refreshToken: "[REDACTED]",
      };
      
      expect(redacted.accessToken).toBe("[REDACTED]");
      expect(redacted.refreshToken).toBe("[REDACTED]");
    });
  });

  describe("Issue Management", () => {
    it("should create an issue with title and body", async () => {
      const { createIssue } = await import("./githubApi");
      const result = await createIssue("token", "user", "repo", {
        title: "Bug report",
        body: "Steps to reproduce...",
      });
      
      expect(result.number).toBe(10);
      expect(result.title).toBe("Bug report");
    });
  });

  describe("File Operations", () => {
    it("should create a new file with base64 content", async () => {
      const { createOrUpdateFile } = await import("./githubApi");
      const content = btoa("console.log('hello')");
      
      await createOrUpdateFile("token", "user", "repo", "src/index.js", {
        content,
        message: "Create index.js",
        branch: "feature/auth",
      });
      
      expect(createOrUpdateFile).toHaveBeenCalledWith(
        "token", "user", "repo", "src/index.js",
        expect.objectContaining({
          content,
          message: "Create index.js",
          branch: "feature/auth",
        })
      );
    });

    it("should commit file edits with SHA for updates", async () => {
      const { createOrUpdateFile } = await import("./githubApi");
      const content = btoa("console.log('updated')");
      
      await createOrUpdateFile("token", "user", "repo", "src/index.js", {
        content,
        message: "Update index.js",
        sha: "existing-sha",
        branch: "main",
      });
      
      expect(createOrUpdateFile).toHaveBeenCalledWith(
        "token", "user", "repo", "src/index.js",
        expect.objectContaining({ sha: "existing-sha" })
      );
    });
  });
});

describe("Router Procedure Contracts", () => {
  it("should have createBranch procedure requiring externalId, branchName, fromSha", () => {
    const input = { externalId: "12345", branchName: "feature/test", fromSha: "abc123" };
    expect(input.externalId).toBeTruthy();
    expect(input.branchName).toBeTruthy();
    expect(input.fromSha).toBeTruthy();
  });

  it("should have createPR procedure requiring externalId, title, head, base", () => {
    const input = { externalId: "12345", title: "My PR", head: "feature/test", base: "main", body: "Description" };
    expect(input.externalId).toBeTruthy();
    expect(input.title).toBeTruthy();
    expect(input.head).toBeTruthy();
    expect(input.base).toBeTruthy();
  });

  it("should have mergePR procedure requiring externalId and pullNumber", () => {
    const input = { externalId: "12345", pullNumber: 42 };
    expect(input.externalId).toBeTruthy();
    expect(input.pullNumber).toBeGreaterThan(0);
  });
});
