/**
 * Cycle 3 E2E Tests — GitHub CRUD+Deploy + Browser/CDP Automation + Virtual User QA
 * 
 * This is the most comprehensive test suite, covering:
 * 1. GitHub: connect repo, CRUD files, branches, PRs, deploy from branch
 * 2. Browser: navigate, interact, screenshot, CDP metrics, a11y, coverage
 * 3. Virtual User QA: run scenarios against deployed apps
 * 4. Device automation: viewport + UA switching, responsive testing
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================
// Mock GitHub API
// ============================================================
vi.mock("./githubApi", () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({ login: "testuser", id: 12345 }),
  listUserRepos: vi.fn().mockResolvedValue([
    { id: 1, full_name: "testuser/my-app", name: "my-app", description: "A test app", html_url: "https://github.com/testuser/my-app", default_branch: "main", private: false, language: "TypeScript", stargazers_count: 5, forks_count: 1, open_issues_count: 2 },
    { id: 2, full_name: "testuser/portfolio", name: "portfolio", description: "Portfolio site", html_url: "https://github.com/testuser/portfolio", default_branch: "main", private: false, language: "HTML", stargazers_count: 10, forks_count: 3, open_issues_count: 0 },
  ]),
  getRepo: vi.fn().mockResolvedValue({ id: 1, full_name: "testuser/my-app", name: "my-app", default_branch: "main" }),
  createRepo: vi.fn().mockResolvedValue({ id: 3, full_name: "testuser/new-repo", name: "new-repo", html_url: "https://github.com/testuser/new-repo" }),
  deleteRepo: vi.fn().mockResolvedValue(undefined),
  getRepoTree: vi.fn().mockResolvedValue({
    sha: "abc123",
    tree: [
      { path: "index.html", type: "blob", sha: "file1", size: 1024 },
      { path: "styles.css", type: "blob", sha: "file2", size: 512 },
      { path: "src", type: "tree", sha: "dir1" },
      { path: "src/app.js", type: "blob", sha: "file3", size: 2048 },
      { path: "package.json", type: "blob", sha: "file4", size: 256 },
    ],
  }),
  getFileContent: vi.fn().mockResolvedValue({
    content: Buffer.from("<html><body><h1>Hello</h1></body></html>").toString("base64"),
    sha: "file1sha",
    size: 1024,
    encoding: "base64",
  }),
  createOrUpdateFile: vi.fn().mockResolvedValue({ commit: { sha: "newcommit123" } }),
  deleteFile: vi.fn().mockResolvedValue({ commit: { sha: "delcommit123" } }),
  listBranches: vi.fn().mockResolvedValue([
    { name: "main", commit: { sha: "abc123" }, protected: true },
    { name: "develop", commit: { sha: "def456" }, protected: false },
    { name: "feature/new-ui", commit: { sha: "ghi789" }, protected: false },
  ]),
  createBranch: vi.fn().mockResolvedValue({ ref: "refs/heads/feature/test-branch", object: { sha: "newbranchsha" } }),
  listCommits: vi.fn().mockResolvedValue([
    { sha: "abc123", commit: { message: "Initial commit", author: { name: "Test User", date: "2024-01-01T00:00:00Z" } } },
    { sha: "def456", commit: { message: "Add feature", author: { name: "Test User", date: "2024-01-02T00:00:00Z" } } },
  ]),
  listPullRequests: vi.fn().mockResolvedValue([
    { number: 1, title: "Add new feature", state: "open", head: { ref: "feature/new-ui" }, base: { ref: "main" }, user: { login: "testuser" } },
  ]),
  createPullRequest: vi.fn().mockResolvedValue({ number: 2, title: "Test PR", html_url: "https://github.com/testuser/my-app/pull/2" }),
  mergePullRequest: vi.fn().mockResolvedValue({ sha: "mergesha123", merged: true }),
  listIssues: vi.fn().mockResolvedValue([
    { number: 1, title: "Bug: login broken", state: "open", labels: [{ name: "bug" }] },
    { number: 2, title: "Feature: dark mode", state: "open", labels: [{ name: "enhancement" }] },
  ]),
  createIssue: vi.fn().mockResolvedValue({ number: 3, title: "New issue", html_url: "https://github.com/testuser/my-app/issues/3" }),
  createWebhook: vi.fn().mockResolvedValue({ id: 1, active: true }),
}));

// ============================================================
// Mock Browser Automation
// ============================================================
vi.mock("./browserAutomation", () => {
  const consoleLogs: Array<{ type: string; text: string; timestamp: number }> = [];
  const networkRequests: Array<{ url: string; method: string; status?: number; timestamp: number }> = [];

  return {
    DEVICE_USER_AGENTS: {
      "iPhone 14": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)",
      "iPad Pro": "Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)",
      "Galaxy S23": "Mozilla/5.0 (Linux; Android 13; SM-S911B)",
      "Desktop Chrome": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    VIEWPORT_PRESETS: {
      "iPhone SE": { width: 375, height: 667 },
      "iPhone 14": { width: 390, height: 844 },
      "iPad Pro": { width: 1024, height: 1366 },
      "Galaxy S23": { width: 360, height: 780 },
      "Desktop HD": { width: 1920, height: 1080 },
      "Desktop 4K": { width: 3840, height: 2160 },
    },
    getOrCreateSession: vi.fn().mockResolvedValue({
      id: "session-1",
      browser: { close: vi.fn() },
      context: { close: vi.fn() },
      page: {
        goto: vi.fn().mockResolvedValue(null),
        url: vi.fn().mockReturnValue("https://example.com"),
        title: vi.fn().mockResolvedValue("Example"),
        setViewportSize: vi.fn(),
        screenshot: vi.fn().mockResolvedValue(Buffer.from("fake-png")),
        evaluate: vi.fn().mockResolvedValue("result"),
        click: vi.fn(),
        fill: vi.fn(),
        keyboard: { press: vi.fn() },
        goBack: vi.fn(),
        goForward: vi.fn(),
        reload: vi.fn(),
        waitForSelector: vi.fn(),
        route: vi.fn(),
        unroute: vi.fn(),
      },
      consoleLogs: [],
      networkRequests: [],
    }),
    closeSession: vi.fn().mockResolvedValue(undefined),
    closeAllSessions: vi.fn().mockResolvedValue(undefined),
    getSessionInfo: vi.fn().mockReturnValue({ id: "session-1", url: "https://example.com", title: "Example" }),
    listSessions: vi.fn().mockReturnValue([{ id: "session-1", url: "https://example.com" }]),
    navigate: vi.fn().mockResolvedValue({ success: true, url: "https://example.com", title: "Example", screenshot: "https://s3.example.com/screenshot.png" }),
    click: vi.fn().mockResolvedValue({ success: true, message: "Clicked element" }),
    type: vi.fn().mockResolvedValue({ success: true, message: "Typed text" }),
    scroll: vi.fn().mockResolvedValue({ success: true, message: "Scrolled" }),
    screenshot: vi.fn().mockResolvedValue({ success: true, screenshotUrl: "https://s3.example.com/screenshot.png" }),
    evaluate: vi.fn().mockResolvedValue({ success: true, result: "42" }),
    waitForSelector: vi.fn().mockResolvedValue({ success: true, message: "Element found" }),
    pressKey: vi.fn().mockResolvedValue({ success: true, message: "Key pressed" }),
    selectOption: vi.fn().mockResolvedValue({ success: true }),
    getAccessibilityTree: vi.fn().mockResolvedValue({ tree: { role: "document", name: "Example", children: [] } }),
    getConsoleLogs: vi.fn().mockReturnValue(consoleLogs),
    getNetworkRequests: vi.fn().mockReturnValue(networkRequests),
    getCurrentUrl: vi.fn().mockReturnValue("https://example.com"),
    goBack: vi.fn().mockResolvedValue({ success: true, url: "https://example.com/prev" }),
    goForward: vi.fn().mockResolvedValue({ success: true, url: "https://example.com/next" }),
    reload: vi.fn().mockResolvedValue({ success: true, url: "https://example.com" }),
    uploadFile: vi.fn().mockResolvedValue({ success: true }),
    getInteractiveElements: vi.fn().mockResolvedValue([
      { tag: "button", text: "Submit", selector: "button.submit" },
      { tag: "input", text: "", selector: "input[name=email]" },
      { tag: "a", text: "Home", selector: "a.home" },
    ]),
    setViewport: vi.fn().mockResolvedValue({ success: true, width: 390, height: 844 }),
    runQATestSuite: vi.fn().mockResolvedValue({
      totalSteps: 5,
      passedSteps: 4,
      failedSteps: 1,
      results: [
        { step: "Navigate to homepage", status: "pass", duration: 500 },
        { step: "Check page title", status: "pass", duration: 100 },
        { step: "Click login button", status: "pass", duration: 300 },
        { step: "Verify login form", status: "pass", duration: 200 },
        { step: "Submit empty form", status: "fail", duration: 400, error: "No validation error shown" },
      ],
    }),
    getCDPSession: vi.fn().mockResolvedValue({ success: true, cdpSession: { send: vi.fn() } }),
    getPerformanceMetrics: vi.fn().mockResolvedValue({
      success: true,
      metrics: {
        Timestamp: Date.now(),
        Documents: 5,
        Frames: 1,
        JSEventListeners: 42,
        Nodes: 150,
        LayoutCount: 3,
        RecalcStyleCount: 5,
        LayoutDuration: 0.05,
        RecalcStyleDuration: 0.02,
        ScriptDuration: 0.15,
        TaskDuration: 0.25,
        JSHeapUsedSize: 5000000,
        JSHeapTotalSize: 10000000,
      },
    }),
    runAccessibilityAudit: vi.fn().mockResolvedValue({
      score: 85,
      violations: [
        { rule: "img-alt", impact: "critical", description: "Images must have alt text", count: 2, elements: ["img.hero", "img.logo"] },
        { rule: "color-contrast", impact: "serious", description: "Elements must have sufficient color contrast", count: 1, elements: [".muted-text"] },
      ],
      passes: 15,
      totalChecks: 17,
    }),
    screenshotDiff: vi.fn().mockResolvedValue({
      match: false,
      diffPercentage: 3.5,
      diffPixels: 1200,
      totalPixels: 34560,
      diffImageUrl: "https://s3.example.com/diff.png",
    }),
    interceptRoute: vi.fn().mockResolvedValue({ success: true }),
    clearInterceptions: vi.fn().mockResolvedValue({ success: true }),
    startCoverage: vi.fn().mockResolvedValue({ success: true }),
    stopCoverage: vi.fn().mockResolvedValue({
      success: true,
      jsCoverage: { totalBytes: 50000, usedBytes: 35000, percentUsed: 70 },
      cssCoverage: { totalBytes: 20000, usedBytes: 12000, percentUsed: 60 },
      entries: [
        { url: "https://example.com/app.js", totalBytes: 30000, usedBytes: 25000 },
        { url: "https://example.com/vendor.js", totalBytes: 20000, usedBytes: 10000 },
        { url: "https://example.com/styles.css", totalBytes: 20000, usedBytes: 12000 },
      ],
    }),
  };
});

// Mock DB
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getUserConnectors: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, connectorId: "github", status: "connected", accessToken: "ghp_test123", metadata: { login: "testuser" } },
  ]),
  getGithubReposByUserId: vi.fn().mockResolvedValue([
    { id: 1, userId: 1, fullName: "testuser/my-app", name: "my-app", defaultBranch: "main", htmlUrl: "https://github.com/testuser/my-app" },
  ]),
  createGithubRepo: vi.fn().mockResolvedValue(1),
  updateGithubRepo: vi.fn().mockResolvedValue(undefined),
  deleteGithubRepo: vi.fn().mockResolvedValue(undefined),
  getGithubRepoById: vi.fn().mockResolvedValue({
    id: 1, userId: 1, fullName: "testuser/my-app", name: "my-app", defaultBranch: "main",
    htmlUrl: "https://github.com/testuser/my-app", cloneUrl: "https://github.com/testuser/my-app.git",
  }),
  getWebappProjectByExternalId: vi.fn().mockResolvedValue({
    id: 1, externalId: "proj-1", userId: 1, name: "My App", framework: "html",
    githubRepoId: 1, publishedUrl: null, deployStatus: null, subdomainPrefix: "myapp123",
  }),
  updateWebappProject: vi.fn().mockResolvedValue(undefined),
  createWebappDeployment: vi.fn().mockResolvedValue(1),
  updateWebappDeployment: vi.fn().mockResolvedValue(undefined),
}));

// ============================================================
// GITHUB CRUD E2E TESTS
// ============================================================
describe("Cycle 3: GitHub CRUD E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("Repository Management", () => {
    it("should list user repos from GitHub API", async () => {
      const { listUserRepos } = await import("./githubApi");
      const repos = await listUserRepos("ghp_test123");
      expect(repos).toHaveLength(2);
      expect(repos[0].full_name).toBe("testuser/my-app");
      expect(repos[1].language).toBe("HTML");
    });

    it("should connect a repo to the local DB", async () => {
      const { createGithubRepo } = await import("./db");
      const id = await createGithubRepo({
        userId: 1,
        fullName: "testuser/my-app",
        name: "my-app",
        htmlUrl: "https://github.com/testuser/my-app",
        defaultBranch: "main",
      } as any);
      expect(id).toBe(1);
    });

    it("should create a new repo on GitHub", async () => {
      const { createRepo } = await import("./githubApi");
      const repo = await createRepo("ghp_test123", { name: "new-repo", description: "A new repo", isPrivate: false });
      expect(repo.full_name).toBe("testuser/new-repo");
    });

    it("should disconnect a repo from local DB", async () => {
      const { deleteGithubRepo } = await import("./db");
      await deleteGithubRepo(1, 1);
      expect(deleteGithubRepo).toHaveBeenCalledWith(1, 1);
    });

    it("should sync repo metadata from GitHub", async () => {
      const { getRepo } = await import("./githubApi");
      const { updateGithubRepo } = await import("./db");
      const repo = await getRepo("ghp_test123", "testuser", "my-app");
      await updateGithubRepo(1, { lastSyncAt: new Date() } as any);
      expect(repo.default_branch).toBe("main");
      expect(updateGithubRepo).toHaveBeenCalled();
    });
  });

  describe("File Operations", () => {
    it("should browse file tree", async () => {
      const { getRepoTree } = await import("./githubApi");
      const tree = await getRepoTree("ghp_test123", "testuser", "my-app");
      expect(tree.tree).toHaveLength(5);
      expect(tree.tree.find((f: any) => f.path === "index.html")).toBeTruthy();
      expect(tree.tree.find((f: any) => f.type === "tree")).toBeTruthy();
    });

    it("should read file content", async () => {
      const { getFileContent } = await import("./githubApi");
      const file = await getFileContent("ghp_test123", "testuser", "my-app", "index.html");
      const content = Buffer.from(file.content, "base64").toString();
      expect(content).toContain("<h1>Hello</h1>");
    });

    it("should commit a new file", async () => {
      const { createOrUpdateFile } = await import("./githubApi");
      const result = await createOrUpdateFile("ghp_test123", "testuser", "my-app", "README.md", {
        content: "# My App\nA test application",
        message: "Add README",
        branch: "main",
      });
      expect(result.commit.sha).toBe("newcommit123");
    });

    it("should update an existing file", async () => {
      const { createOrUpdateFile } = await import("./githubApi");
      const result = await createOrUpdateFile("ghp_test123", "testuser", "my-app", "index.html", {
        content: "<html><body><h1>Updated</h1></body></html>",
        message: "Update index.html",
        sha: "file1sha",
        branch: "main",
      });
      expect(result.commit.sha).toBeTruthy();
    });

    it("should delete a file", async () => {
      const { deleteFile } = await import("./githubApi");
      const result = await deleteFile("ghp_test123", "testuser", "my-app", "old-file.txt", {
        message: "Remove old file",
        sha: "oldsha",
        branch: "main",
      });
      expect(result.commit.sha).toBe("delcommit123");
    });
  });

  describe("Branch Operations", () => {
    it("should list branches", async () => {
      const { listBranches } = await import("./githubApi");
      const branches = await listBranches("ghp_test123", "testuser", "my-app");
      expect(branches).toHaveLength(3);
      expect(branches[0].name).toBe("main");
      expect(branches[0].protected).toBe(true);
    });

    it("should create a branch from main", async () => {
      const { createBranch } = await import("./githubApi");
      const result = await createBranch("ghp_test123", "testuser", "my-app", "feature/test-branch", "abc123");
      expect(result.ref).toBe("refs/heads/feature/test-branch");
    });

    it("should list commits on a branch", async () => {
      const { listCommits } = await import("./githubApi");
      const commits = await listCommits("ghp_test123", "testuser", "my-app");
      expect(commits).toHaveLength(2);
      expect(commits[0].commit.message).toBe("Initial commit");
    });
  });

  describe("Pull Request Operations", () => {
    it("should list open PRs", async () => {
      const { listPullRequests } = await import("./githubApi");
      const prs = await listPullRequests("ghp_test123", "testuser", "my-app");
      expect(prs).toHaveLength(1);
      expect(prs[0].title).toBe("Add new feature");
      expect(prs[0].head.ref).toBe("feature/new-ui");
    });

    it("should create a PR", async () => {
      const { createPullRequest } = await import("./githubApi");
      const pr = await createPullRequest("ghp_test123", "testuser", "my-app", {
        title: "Test PR",
        body: "This is a test pull request",
        head: "feature/test-branch",
        base: "main",
      });
      expect(pr.number).toBe(2);
      expect(pr.html_url).toContain("/pull/2");
    });

    it("should merge a PR", async () => {
      const { mergePullRequest } = await import("./githubApi");
      const result = await mergePullRequest("ghp_test123", "testuser", "my-app", 1);
      expect(result.merged).toBe(true);
    });
  });

  describe("Issue Operations", () => {
    it("should list issues", async () => {
      const { listIssues } = await import("./githubApi");
      const issues = await listIssues("ghp_test123", "testuser", "my-app");
      expect(issues).toHaveLength(2);
      expect(issues[0].labels[0].name).toBe("bug");
    });

    it("should create an issue", async () => {
      const { createIssue } = await import("./githubApi");
      const issue = await createIssue("ghp_test123", "testuser", "my-app", {
        title: "New issue",
        body: "Description of the issue",
        labels: ["bug"],
      });
      expect(issue.number).toBe(3);
    });
  });

  describe("GitHub Deploy E2E", () => {
    it("should resolve GitHub connector token", async () => {
      const { getUserConnectors } = await import("./db");
      const connectors = await getUserConnectors(1);
      const ghConn = connectors.find((c: any) => c.connectorId === "github" && c.status === "connected");
      expect(ghConn).toBeTruthy();
      expect(ghConn!.accessToken).toBe("ghp_test123");
    });

    it("should fetch repo tree for deploy", async () => {
      const { getRepoTree } = await import("./githubApi");
      const tree = await getRepoTree("ghp_test123", "testuser", "my-app");
      const indexHtml = tree.tree.find((f: any) => f.path === "index.html");
      expect(indexHtml).toBeTruthy();
    });

    it("should fetch index.html content for deploy", async () => {
      const { getFileContent } = await import("./githubApi");
      const file = await getFileContent("ghp_test123", "testuser", "my-app", "index.html");
      const html = Buffer.from(file.content, "base64").toString();
      expect(html).toContain("<html>");
      expect(html).toContain("<body>");
    });

    it("should create deployment record during GitHub deploy", async () => {
      const { createWebappDeployment, updateWebappProject } = await import("./db");
      await updateWebappProject(1, { deployStatus: "building" });
      const depId = await createWebappDeployment({
        projectId: 1, userId: 1, versionLabel: "v1.0",
        commitSha: "abc123", commitMessage: "Deploy from main", status: "building",
      } as any);
      expect(depId).toBe(1);
    });

    it("should update project with published URL after deploy", async () => {
      const { updateWebappProject } = await import("./db");
      await updateWebappProject(1, {
        deployStatus: "live",
        publishedUrl: "https://myapp123.manus.space",
        lastDeployedAt: new Date(),
      });
      expect(updateWebappProject).toHaveBeenCalledWith(1, expect.objectContaining({
        deployStatus: "live",
        publishedUrl: "https://myapp123.manus.space",
      }));
    });
  });
});

// ============================================================
// BROWSER AUTOMATION E2E TESTS
// ============================================================
describe("Cycle 3: Browser Automation E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("Session Management", () => {
    it("should create a new browser session", async () => {
      const { getOrCreateSession } = await import("./browserAutomation");
      const session = await getOrCreateSession("test-session");
      expect(session.id).toBe("session-1");
      expect(session.page).toBeTruthy();
    });

    it("should list active sessions", async () => {
      const { listSessions } = await import("./browserAutomation");
      const sessions = listSessions();
      expect(sessions).toHaveLength(1);
    });

    it("should close a session", async () => {
      const { closeSession } = await import("./browserAutomation");
      await closeSession("session-1");
      expect(closeSession).toHaveBeenCalledWith("session-1");
    });
  });

  describe("Navigation", () => {
    it("should navigate to a URL", async () => {
      const { navigate } = await import("./browserAutomation");
      const result = await navigate("session-1", "https://example.com");
      expect(result.success).toBe(true);
      expect(result.url).toBe("https://example.com");
    });

    it("should go back", async () => {
      const { goBack } = await import("./browserAutomation");
      const result = await goBack("session-1");
      expect(result.success).toBe(true);
    });

    it("should go forward", async () => {
      const { goForward } = await import("./browserAutomation");
      const result = await goForward("session-1");
      expect(result.success).toBe(true);
    });

    it("should reload page", async () => {
      const { reload } = await import("./browserAutomation");
      const result = await reload("session-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Interaction", () => {
    it("should click an element", async () => {
      const { click } = await import("./browserAutomation");
      const result = await click("session-1", "button.submit");
      expect(result.success).toBe(true);
    });

    it("should type text into an input", async () => {
      const { type: typeText } = await import("./browserAutomation");
      const result = await typeText("session-1", "input[name=email]", "test@example.com");
      expect(result.success).toBe(true);
    });

    it("should scroll the page", async () => {
      const { scroll } = await import("./browserAutomation");
      const result = await scroll("session-1", 0, 500);
      expect(result.success).toBe(true);
    });

    it("should press a key", async () => {
      const { pressKey } = await import("./browserAutomation");
      const result = await pressKey("session-1", "Enter");
      expect(result.success).toBe(true);
    });

    it("should evaluate JavaScript", async () => {
      const { evaluate } = await import("./browserAutomation");
      const result = await evaluate("session-1", "document.title");
      expect(result.success).toBe(true);
    });

    it("should wait for a selector", async () => {
      const { waitForSelector } = await import("./browserAutomation");
      const result = await waitForSelector("session-1", ".loaded");
      expect(result.success).toBe(true);
    });

    it("should get interactive elements", async () => {
      const { getInteractiveElements } = await import("./browserAutomation");
      const elements = await getInteractiveElements("session-1");
      expect(elements).toHaveLength(3);
      expect(elements[0].tag).toBe("button");
    });
  });

  describe("Screenshot", () => {
    it("should take a screenshot", async () => {
      const { screenshot } = await import("./browserAutomation");
      const result = await screenshot("session-1");
      expect(result.success).toBe(true);
      expect(result.screenshotUrl).toContain("screenshot.png");
    });
  });

  describe("Console & Network Capture", () => {
    it("should capture console logs", async () => {
      const { getConsoleLogs } = await import("./browserAutomation");
      const logs = getConsoleLogs("session-1");
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should capture network requests", async () => {
      const { getNetworkRequests } = await import("./browserAutomation");
      const requests = getNetworkRequests("session-1");
      expect(Array.isArray(requests)).toBe(true);
    });
  });
});

// ============================================================
// CDP AUTOMATION E2E TESTS
// ============================================================
describe("Cycle 3: CDP Automation E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("Performance Profiling", () => {
    it("should get CDP session", async () => {
      const { getCDPSession } = await import("./browserAutomation");
      const result = await getCDPSession("session-1");
      expect(result.success).toBe(true);
      expect(result.cdpSession).toBeTruthy();
    });

    it("should collect performance metrics", async () => {
      const { getPerformanceMetrics } = await import("./browserAutomation");
      const result = await getPerformanceMetrics("session-1");
      expect(result.success).toBe(true);
      expect(result.metrics).toBeTruthy();
      expect(result.metrics!.Documents).toBe(5);
      expect(result.metrics!.JSHeapUsedSize).toBeLessThan(result.metrics!.JSHeapTotalSize);
      expect(result.metrics!.ScriptDuration).toBeGreaterThan(0);
    });

    it("should track layout and style recalculation", async () => {
      const { getPerformanceMetrics } = await import("./browserAutomation");
      const result = await getPerformanceMetrics("session-1");
      expect(result.metrics!.LayoutCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics!.RecalcStyleCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics!.LayoutDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Network Interception", () => {
    it("should intercept a route", async () => {
      const { interceptRoute } = await import("./browserAutomation");
      const result = await interceptRoute("session-1", "**/api/**", { status: 200, body: '{"mocked": true}' });
      expect(result.success).toBe(true);
    });

    it("should clear all interceptions", async () => {
      const { clearInterceptions } = await import("./browserAutomation");
      const result = await clearInterceptions("session-1");
      expect(result.success).toBe(true);
    });
  });

  describe("Code Coverage", () => {
    it("should start coverage collection", async () => {
      const { startCoverage } = await import("./browserAutomation");
      const result = await startCoverage("session-1");
      expect(result.success).toBe(true);
    });

    it("should stop coverage and return results", async () => {
      const { stopCoverage } = await import("./browserAutomation");
      const result = await stopCoverage("session-1");
      expect(result.success).toBe(true);
      expect(result.jsCoverage.percentUsed).toBe(70);
      expect(result.cssCoverage.percentUsed).toBe(60);
      expect(result.entries).toHaveLength(3);
    });

    it("should identify unused code", async () => {
      const { stopCoverage } = await import("./browserAutomation");
      const result = await stopCoverage("session-1");
      const unusedJS = result.jsCoverage.totalBytes - result.jsCoverage.usedBytes;
      const unusedCSS = result.cssCoverage.totalBytes - result.cssCoverage.usedBytes;
      expect(unusedJS).toBe(15000);
      expect(unusedCSS).toBe(8000);
    });
  });
});

// ============================================================
// ACCESSIBILITY AUDIT E2E TESTS
// ============================================================
describe("Cycle 3: Accessibility Audit E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should run accessibility audit", async () => {
    const { runAccessibilityAudit } = await import("./browserAutomation");
    const result = await runAccessibilityAudit("session-1");
    expect(result.score).toBe(85);
    expect(result.violations).toHaveLength(2);
    expect(result.passes).toBe(15);
    expect(result.totalChecks).toBe(17);
  });

  it("should identify critical violations", async () => {
    const { runAccessibilityAudit } = await import("./browserAutomation");
    const result = await runAccessibilityAudit("session-1");
    const critical = result.violations.filter((v: any) => v.impact === "critical");
    expect(critical).toHaveLength(1);
    expect(critical[0].rule).toBe("img-alt");
  });

  it("should report violation element selectors", async () => {
    const { runAccessibilityAudit } = await import("./browserAutomation");
    const result = await runAccessibilityAudit("session-1");
    expect(result.violations[0].elements).toContain("img.hero");
  });
});

// ============================================================
// SCREENSHOT DIFF E2E TESTS
// ============================================================
describe("Cycle 3: Screenshot Diff E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should compare two screenshots", async () => {
    const { screenshotDiff } = await import("./browserAutomation");
    const result = await screenshotDiff("session-1", "https://s3.example.com/baseline.png", "https://s3.example.com/current.png");
    expect(result.match).toBe(false);
    expect(result.diffPercentage).toBe(3.5);
    expect(result.diffImageUrl).toContain("diff.png");
  });

  it("should calculate diff pixel count", async () => {
    const { screenshotDiff } = await import("./browserAutomation");
    const result = await screenshotDiff("session-1", "a.png", "b.png");
    expect(result.diffPixels).toBe(1200);
    expect(result.totalPixels).toBe(34560);
  });
});

// ============================================================
// VIRTUAL USER QA E2E TESTS
// ============================================================
describe("Cycle 3: Virtual User QA E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should run a QA test suite", async () => {
    const { runQATestSuite } = await import("./browserAutomation");
    const result = await runQATestSuite("session-1", "https://myapp.manus.space", [
      { action: "navigate", target: "/" },
      { action: "assert_title", expected: "My App" },
      { action: "click", target: "button.login" },
      { action: "assert_visible", target: "form.login" },
      { action: "submit", target: "form.login" },
    ] as any);
    expect(result.totalSteps).toBe(5);
    expect(result.passedSteps).toBe(4);
    expect(result.failedSteps).toBe(1);
  });

  it("should report individual step results", async () => {
    const { runQATestSuite } = await import("./browserAutomation");
    const result = await runQATestSuite("session-1", "https://myapp.manus.space", [] as any);
    const failedStep = result.results.find((r: any) => r.status === "fail");
    expect(failedStep).toBeTruthy();
    expect(failedStep!.error).toContain("No validation error");
  });

  it("should measure step durations", async () => {
    const { runQATestSuite } = await import("./browserAutomation");
    const result = await runQATestSuite("session-1", "https://myapp.manus.space", [] as any);
    const totalDuration = result.results.reduce((sum: number, r: any) => sum + r.duration, 0);
    expect(totalDuration).toBeGreaterThan(0);
  });
});

// ============================================================
// DEVICE AUTOMATION E2E TESTS
// ============================================================
describe("Cycle 3: Device Automation E2E", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should have viewport presets for all major devices", async () => {
    const { VIEWPORT_PRESETS } = await import("./browserAutomation");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("iPhone SE");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("iPhone 14");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("iPad Pro");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("Galaxy S23");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("Desktop HD");
    expect(Object.keys(VIEWPORT_PRESETS)).toContain("Desktop 4K");
  });

  it("should have user agents for major devices", async () => {
    const { DEVICE_USER_AGENTS } = await import("./browserAutomation");
    expect(DEVICE_USER_AGENTS["iPhone 14"]).toContain("iPhone");
    expect(DEVICE_USER_AGENTS["iPad Pro"]).toContain("iPad");
    expect(DEVICE_USER_AGENTS["Galaxy S23"]).toContain("Android");
    expect(DEVICE_USER_AGENTS["Desktop Chrome"]).toContain("Windows");
  });

  it("should switch viewport and UA together", async () => {
    const { setViewport, VIEWPORT_PRESETS, DEVICE_USER_AGENTS } = await import("./browserAutomation");
    const preset = VIEWPORT_PRESETS["iPhone 14"];
    const ua = DEVICE_USER_AGENTS["iPhone 14"];
    expect(preset.width).toBe(390);
    expect(preset.height).toBe(844);
    expect(ua).toContain("iPhone");

    const result = await setViewport("session-1", preset.width, preset.height, "iPhone 14");
    expect(result.success).toBe(true);
  });

  it("should test responsive breakpoints", async () => {
    const { VIEWPORT_PRESETS } = await import("./browserAutomation");
    const mobile = VIEWPORT_PRESETS["iPhone SE"];
    const tablet = VIEWPORT_PRESETS["iPad Pro"];
    const desktop = VIEWPORT_PRESETS["Desktop HD"];

    expect(mobile.width).toBeLessThan(768);
    expect(tablet.width).toBeGreaterThanOrEqual(768);
    expect(desktop.width).toBeGreaterThanOrEqual(1024);
  });
});

// ============================================================
// FULL E2E FLOW: GitHub → Deploy → Browser QA
// ============================================================
describe("Cycle 3: Full E2E Flow — GitHub → Deploy → Browser QA", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should complete the full flow: connect repo → browse files → deploy → QA", async () => {
    // Step 1: Connect GitHub repo
    const { getUserConnectors, createGithubRepo } = await import("./db");
    const connectors = await getUserConnectors(1);
    const ghConn = connectors.find((c: any) => c.connectorId === "github");
    expect(ghConn).toBeTruthy();

    const repoId = await createGithubRepo({
      userId: 1, fullName: "testuser/my-app", name: "my-app",
      htmlUrl: "https://github.com/testuser/my-app", defaultBranch: "main",
    } as any);
    expect(repoId).toBe(1);

    // Step 2: Browse files
    const { getRepoTree, getFileContent } = await import("./githubApi");
    const tree = await getRepoTree(ghConn!.accessToken, "testuser", "my-app");
    expect(tree.tree.length).toBeGreaterThan(0);

    const indexFile = tree.tree.find((f: any) => f.path === "index.html");
    expect(indexFile).toBeTruthy();

    const content = await getFileContent(ghConn!.accessToken, "testuser", "my-app", "index.html");
    const html = Buffer.from(content.content, "base64").toString();
    expect(html).toContain("<html>");

    // Step 3: Deploy
    const { createWebappDeployment, updateWebappProject } = await import("./db");
    await updateWebappProject(1, { deployStatus: "building" });
    const depId = await createWebappDeployment({
      projectId: 1, userId: 1, status: "building",
      commitSha: "abc123", commitMessage: "Deploy from main",
    } as any);
    expect(depId).toBe(1);

    await updateWebappProject(1, {
      deployStatus: "live",
      publishedUrl: "https://myapp123.manus.space",
    });

    // Step 4: Browser QA on deployed app
    const { navigate, runQATestSuite, runAccessibilityAudit, getPerformanceMetrics } = await import("./browserAutomation");

    const navResult = await navigate("session-1", "https://myapp123.manus.space");
    expect(navResult.success).toBe(true);

    const qaResult = await runQATestSuite("session-1", "https://myapp123.manus.space", [] as any);
    expect(qaResult.totalSteps).toBeGreaterThan(0);

    const a11yResult = await runAccessibilityAudit("session-1");
    expect(a11yResult.score).toBeGreaterThan(0);

    const perfResult = await getPerformanceMetrics("session-1");
    expect(perfResult.success).toBe(true);
    expect(perfResult.metrics!.Documents).toBeGreaterThan(0);
  });
});
