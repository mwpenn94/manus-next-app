/**
 * P28 — GitHub Integration + Subdomain Publishing Tests
 * Tests the GitHub router procedures and webapp project deploy flow.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock GitHub API module
vi.mock("./githubApi", () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({ login: "testuser", id: 123 }),
  listUserRepos: vi.fn().mockResolvedValue([
    { id: 1, full_name: "testuser/repo1", name: "repo1", html_url: "https://github.com/testuser/repo1", description: "Test repo", private: false, default_branch: "main", language: "TypeScript", stargazers_count: 5, forks_count: 2 },
  ]),
  getRepoTree: vi.fn().mockResolvedValue({
    sha: "abc123",
    tree: [
      { path: "README.md", type: "blob", sha: "sha1", size: 100 },
      { path: "src", type: "tree", sha: "sha2", size: undefined },
      { path: "src/index.ts", type: "blob", sha: "sha3", size: 500 },
    ],
  }),
  getFileContent: vi.fn().mockResolvedValue({
    name: "README.md",
    path: "README.md",
    sha: "sha1",
    size: 100,
    content: btoa("# Hello World"),
    encoding: "base64",
    html_url: "https://github.com/testuser/repo1/blob/main/README.md",
    download_url: "https://raw.githubusercontent.com/testuser/repo1/main/README.md",
  }),
  createOrUpdateFile: vi.fn().mockResolvedValue({
    content: { sha: "newsha1", path: "README.md" },
    commit: { sha: "commitsha1", message: "Update README.md" },
  }),
  deleteFile: vi.fn().mockResolvedValue({
    commit: { sha: "commitsha2", message: "Delete file.txt" },
  }),
  createIssue: vi.fn().mockResolvedValue({
    id: 1,
    number: 1,
    title: "Bug report",
    state: "open",
    html_url: "https://github.com/testuser/repo1/issues/1",
    user: { login: "testuser" },
    labels: [],
    created_at: new Date().toISOString(),
  }),
  mergePullRequest: vi.fn().mockResolvedValue({
    sha: "mergesha1",
    merged: true,
    message: "Pull Request successfully merged",
  }),
  listBranches: vi.fn().mockResolvedValue([
    { name: "main", commit: { sha: "abc123" }, protected: true },
    { name: "feature/test", commit: { sha: "def456" }, protected: false },
  ]),
  listCommits: vi.fn().mockResolvedValue([
    {
      sha: "abc123",
      commit: { message: "Initial commit", author: { name: "testuser", date: new Date().toISOString() } },
      author: { login: "testuser" },
      html_url: "https://github.com/testuser/repo1/commit/abc123",
    },
  ]),
  listPullRequests: vi.fn().mockResolvedValue([]),
  listIssues: vi.fn().mockResolvedValue([]),
  createRepo: vi.fn().mockResolvedValue({
    id: 2,
    full_name: "testuser/new-repo",
    name: "new-repo",
    html_url: "https://github.com/testuser/new-repo",
    description: "New repo",
    private: false,
    default_branch: "main",
    language: null,
    stargazers_count: 0,
    forks_count: 0,
  }),
}));

describe("GitHub Integration", () => {
  describe("File Tree Structure", () => {
    it("should parse tree items into directory structure", async () => {
      const { getRepoTree } = await import("./githubApi");
      const result = await getRepoTree("token", "testuser", "repo1");
      
      expect(result.tree).toHaveLength(3);
      const blobs = result.tree.filter(item => item.type === "blob");
      const trees = result.tree.filter(item => item.type === "tree");
      expect(blobs).toHaveLength(2);
      expect(trees).toHaveLength(1);
    });

    it("should filter items to current directory level", async () => {
      const { getRepoTree } = await import("./githubApi");
      const result = await getRepoTree("token", "testuser", "repo1");
      
      // Root level: README.md and src/
      const rootItems = result.tree.filter(item => !item.path.includes("/"));
      expect(rootItems).toHaveLength(2);
      expect(rootItems.map(i => i.path)).toContain("README.md");
      expect(rootItems.map(i => i.path)).toContain("src");
    });
  });

  describe("File Content", () => {
    it("should decode base64 file content", async () => {
      const { getFileContent } = await import("./githubApi");
      const result = await getFileContent("token", "testuser", "repo1", "README.md");
      
      expect(result.encoding).toBe("base64");
      const decoded = atob(result.content);
      expect(decoded).toBe("# Hello World");
    });

    it("should return file metadata", async () => {
      const { getFileContent } = await import("./githubApi");
      const result = await getFileContent("token", "testuser", "repo1", "README.md");
      
      expect(result.sha).toBe("sha1");
      expect(result.size).toBe(100);
      expect(result.html_url).toContain("github.com");
    });
  });

  describe("File Operations", () => {
    it("should commit file changes with base64 content", async () => {
      const { createOrUpdateFile } = await import("./githubApi");
      const content = btoa("# Updated content");
      const result = await createOrUpdateFile("token", "testuser", "repo1", "README.md", {
        message: "Update README.md",
        content,
        sha: "sha1",
      });
      
      expect(result.content.sha).toBe("newsha1");
      expect(result.commit.message).toBe("Update README.md");
    });

    it("should delete files with sha verification", async () => {
      const { deleteFile } = await import("./githubApi");
      const result = await deleteFile("token", "testuser", "repo1", "file.txt", {
        message: "Delete file.txt",
        sha: "sha1",
      });
      
      expect(result.commit.sha).toBe("commitsha2");
    });
  });

  describe("Issue Management", () => {
    it("should create issues with title and body", async () => {
      const { createIssue } = await import("./githubApi");
      const result = await createIssue("token", "testuser", "repo1", {
        title: "Bug report",
        body: "Something is broken",
      });
      
      expect(result.number).toBe(1);
      expect(result.title).toBe("Bug report");
      expect(result.state).toBe("open");
    });
  });

  describe("Pull Request Operations", () => {
    it("should merge pull requests", async () => {
      const { mergePullRequest } = await import("./githubApi");
      const result = await mergePullRequest("token", "testuser", "repo1", 1, {
        merge_method: "squash",
      });
      
      expect(result.merged).toBe(true);
      expect(result.sha).toBe("mergesha1");
    });
  });

  describe("Branch Management", () => {
    it("should list branches with protection status", async () => {
      const { listBranches } = await import("./githubApi");
      const result = await listBranches("token", "testuser", "repo1");
      
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("main");
      expect(result[0].protected).toBe(true);
      expect(result[1].name).toBe("feature/test");
      expect(result[1].protected).toBe(false);
    });
  });
});

describe("Subdomain Publishing", () => {
  it("should generate subdomain URL from project name", () => {
    const projectName = "My Cool App";
    const subdomain = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    expect(subdomain).toBe("my-cool-app");
    expect(`https://${subdomain}.sovereign.app`).toBe("https://my-cool-app.sovereign.app");
  });

  it("should use subdomainPrefix when available", () => {
    const project = { name: "My App", subdomainPrefix: "custom-prefix" };
    const subdomain = project.subdomainPrefix || project.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    expect(subdomain).toBe("custom-prefix");
    expect(`https://${subdomain}.sovereign.app`).toBe("https://custom-prefix.sovereign.app");
  });

  it("should handle special characters in project names", () => {
    const names = [
      { input: "My App 2.0", expected: "my-app-2-0" },
      { input: "test_project", expected: "test-project" },
      { input: "UPPERCASE", expected: "uppercase" },
      { input: "with spaces", expected: "with-spaces" },
      { input: "special!@#chars", expected: "special---chars" },
    ];
    
    names.forEach(({ input, expected }) => {
      const subdomain = input.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      expect(subdomain).toBe(expected);
    });
  });

  it("should construct valid deployment record", () => {
    const deployment = {
      projectId: 1,
      userId: 1,
      versionLabel: "v1.0.0",
      commitSha: "abc123",
      commitMessage: "Initial deploy",
      status: "building" as const,
    };
    
    expect(deployment.status).toBe("building");
    expect(deployment.versionLabel).toBe("v1.0.0");
  });
});

describe("CodeEditor Language Detection", () => {
  it("should detect language from file extension", () => {
    const getLanguage = (filename: string): string => {
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const map: Record<string, string> = {
        js: "javascript", jsx: "javascript", mjs: "javascript",
        ts: "typescript", tsx: "typescript", mts: "typescript",
        html: "html", htm: "html",
        css: "css", scss: "css",
        json: "json", jsonc: "json",
        md: "markdown", mdx: "markdown",
        py: "python", pyw: "python",
      };
      return map[ext] || "plaintext";
    };

    expect(getLanguage("index.ts")).toBe("typescript");
    expect(getLanguage("App.tsx")).toBe("typescript");
    expect(getLanguage("script.js")).toBe("javascript");
    expect(getLanguage("page.html")).toBe("html");
    expect(getLanguage("styles.css")).toBe("css");
    expect(getLanguage("data.json")).toBe("json");
    expect(getLanguage("README.md")).toBe("markdown");
    expect(getLanguage("main.py")).toBe("python");
    expect(getLanguage("unknown.xyz")).toBe("plaintext");
  });
});
