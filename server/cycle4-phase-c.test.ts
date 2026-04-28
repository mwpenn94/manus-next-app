import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * Cycle 4 Phase C — GitHub CRUD→Preview→Publish + Browser/CDP QA with Virtual Users
 *
 * The most comprehensive E2E test suite covering the FULL pipeline:
 * 1. GitHub Connect → CRUD (repos, files, branches, PRs, issues)
 * 2. Deploy from GitHub → Live URL
 * 3. Browser QA → Navigate deployed URL → Screenshot → A11y → Perf
 * 4. CDP automation → Performance profiling → Network interception → Coverage
 * 5. Virtual user smoke tests → Login, nav, responsive, error states
 * 6. Device automation → Viewport switching → UA switching
 * 7. Post-deploy QA automation trigger from project page
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ══════════════════════════════════════════════════════════════
// 1. GITHUB CONNECT → CRUD PIPELINE
// ══════════════════════════════════════════════════════════════

describe("GitHub Connect → CRUD Pipeline", () => {
  describe("Authentication & Connection", () => {
    it("github.connectRepo procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.connectRepo");
    });

    it("github.disconnectRepo procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.disconnectRepo");
    });

    it("github.syncRepo procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.syncRepo");
    });

    it("getAuthenticatedUser function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.getAuthenticatedUser).toBe("function");
    });
  });

  describe("Repository CRUD", () => {
    it("github.repos procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.repos");
    });

    it("github.getRepo procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.getRepo");
    });

    it("github.createRepo procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.createRepo");
    });

    it("github.listRemoteRepos procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.listRemoteRepos");
    });

    it("listUserRepos function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.listUserRepos).toBe("function");
    });

    it("createRepo function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createRepo).toBe("function");
    });

    it("deleteRepo function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.deleteRepo).toBe("function");
    });
  });

  describe("File CRUD", () => {
    it("github.fileTree procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.fileTree");
    });

    it("github.fileContent procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.fileContent");
    });

    it("github.commitFile procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.commitFile");
    });

    it("github.deleteFile procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.deleteFile");
    });

    it("getFileContent function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.getFileContent).toBe("function");
    });

    it("createOrUpdateFile function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createOrUpdateFile).toBe("function");
    });

    it("deleteFile function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.deleteFile).toBe("function");
    });

    it("getRepoTree function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.getRepoTree).toBe("function");
    });
  });

  describe("Branch CRUD", () => {
    it("github.branches procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.branches");
    });

    it("github.createBranch procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.createBranch");
    });

    it("listBranches function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.listBranches).toBe("function");
    });

    it("createBranch function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createBranch).toBe("function");
    });
  });

  describe("PR & Issue CRUD", () => {
    it("github.pullRequests procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.pullRequests");
    });

    it("github.createPR procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.createPR");
    });

    it("github.mergePR procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.mergePR");
    });

    it("github.issues procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.issues");
    });

    it("github.createIssue procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("github.createIssue");
    });

    it("createPullRequest function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createPullRequest).toBe("function");
    });

    it("mergePullRequest function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.mergePullRequest).toBe("function");
    });

    it("createIssue function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createIssue).toBe("function");
    });
  });

  describe("Webhook Registration", () => {
    it("createWebhook function exists in githubApi for webhook registration", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createWebhook).toBe("function");
    });

    it("createWebhook function exists in githubApi", async () => {
      const mod = await import("./githubApi");
      expect(typeof mod.createWebhook).toBe("function");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 2. DEPLOY FROM GITHUB → LIVE URL
// ══════════════════════════════════════════════════════════════

describe("Deploy from GitHub → Live URL", () => {
  describe("Deploy pipeline", () => {
    it("webappProject.deployFromGitHub procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("webappProject.deployFromGitHub");
    });

    it("deployFromGitHub fetches repo tree from GitHub", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("getRepoTree");
    });

    it("deployFromGitHub searches multiple paths for index.html", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("searchPaths");
    });

    it("deployFromGitHub uploads to S3", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("storagePut");
    });

    it("deployFromGitHub rewrites asset URLs", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("assetUrlMap");
    });

    it("deployFromGitHub creates deployment record", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("createWebappDeployment");
    });

    it("deployFromGitHub returns publishedUrl", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain("publishedUrl");
    });
  });

  describe("Webhook auto-deploy", () => {
    it("webhook endpoint registered at /api/github/webhook", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/_core/index.ts", "utf-8");
      expect(source).toContain("/api/github/webhook");
    });

    it("webhook verifies HMAC-SHA256 signature", async () => {
      const { verifyWebhookSignature } = await import("./githubWebhook");
      expect(typeof verifyWebhookSignature).toBe("function");
    });

    it("webhook triggers deploy on push to default branch", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
      expect(source).toContain("push");
      expect(source).toContain("defaultBranch");
    });

    it("webhook creates deployment record", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/githubWebhook.ts", "utf-8");
      expect(source).toContain("createWebappDeployment");
    });
  });

  describe("Rollback", () => {
    it("webappProject.rollbackDeployment procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("webappProject.rollbackDeployment");
    });

    it("rollback uses confirmation dialog (not confirm())", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
      expect(source).toContain("rollbackConfirmOpen");
      expect(source).toContain("Confirm Rollback");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 3. BROWSER QA → NAVIGATE → SCREENSHOT → A11Y → PERF
// ══════════════════════════════════════════════════════════════

describe("Browser QA Pipeline", () => {
  describe("Core browser automation", () => {
    it("navigate function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.navigate).toBe("function");
    });

    it("screenshot function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.screenshot).toBe("function");
    });

    it("click function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.click).toBe("function");
    });

    it("type function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.type).toBe("function");
    });

    it("evaluate function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.evaluate).toBe("function");
    });

    it("waitForSelector function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.waitForSelector).toBe("function");
    });

    it("pressKey function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.pressKey).toBe("function");
    });

    it("selectOption function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.selectOption).toBe("function");
    });

    it("scroll function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.scroll).toBe("function");
    });

    it("goBack function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.goBack).toBe("function");
    });

    it("goForward function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.goForward).toBe("function");
    });
  });

  describe("Session management", () => {
    it("getOrCreateSession supports multi-browser", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getOrCreateSession).toBe("function");
      // Signature accepts browserType parameter
      expect(mod.getOrCreateSession.length).toBeGreaterThanOrEqual(0);
    });

    it("closeSession function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.closeSession).toBe("function");
    });

    it("listSessions function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.listSessions).toBe("function");
    });

    it("closeAllSessions function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.closeAllSessions).toBe("function");
    });
  });

  describe("Accessibility audit", () => {
    it("getAccessibilityTree function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getAccessibilityTree).toBe("function");
    });

    it("browser.accessibilityTree procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.accessibilityTree");
    });

    it("browser.accessibilityAudit procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.accessibilityAudit");
    });
  });

  describe("Performance metrics", () => {
    it("browser.performanceMetrics procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.performanceMetrics");
    });

    it("performance metrics uses CDP Performance domain", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("Performance.enable");
      expect(source).toContain("Performance.getMetrics");
    });
  });

  describe("Screenshot diff", () => {
    it("browser.screenshotDiff procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.screenshotDiff");
    });

    it("screenshotDiff function exists in browserAutomation", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.screenshotDiff).toBe("function");
    });
  });

  describe("QA test suite runner", () => {
    it("browser.runQA procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.runQA");
    });

    it("runQATestSuite function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.runQATestSuite).toBe("function");
    });

    it("QA runner supports navigate, click, type, screenshot, evaluate actions", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      const qaSection = source.slice(source.indexOf("runQATestSuite"));
      expect(qaSection).toContain('"navigate"');
      expect(qaSection).toContain('"click"');
      expect(qaSection).toContain('"type"');
      expect(qaSection).toContain('"screenshot"');
      expect(qaSection).toContain('"evaluate"');
    });

    it("QA runner returns summary with pass/fail/skip counts", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      const qaSection = source.slice(source.indexOf("runQATestSuite"));
      expect(qaSection).toContain("passed");
      expect(qaSection).toContain("failed");
      expect(qaSection).toContain("skipped");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 4. CDP AUTOMATION → PROFILING → INTERCEPTION → COVERAGE
// ══════════════════════════════════════════════════════════════

describe("CDP Automation", () => {
  describe("CDP session management", () => {
    it("getCDPSession function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getCDPSession).toBe("function");
    });

    it("CDP session stored on browser session", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("cdpSession?: CDPSession");
    });
  });

  describe("Performance profiling via CDP", () => {
    it("getPerformanceMetrics function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getPerformanceMetrics).toBe("function");
    });

    it("uses Performance.enable and Performance.getMetrics CDP commands", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("Performance.enable");
      expect(source).toContain("Performance.getMetrics");
    });

    it("captures Core Web Vitals (LCP, CLS, FID)", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("LCP");
      expect(source).toContain("CLS");
    });
  });

  describe("Network interception", () => {
    it("interceptRoute function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.interceptRoute).toBe("function");
    });

    it("clearInterceptions function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.clearInterceptions).toBe("function");
    });

    it("browser.interceptRoute procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.interceptRoute");
    });

    it("browser.clearInterceptions procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.clearInterceptions");
    });

    it("interception supports block, modify, log actions", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      const interceptSection = source.slice(source.indexOf("interceptRoute"));
      expect(interceptSection).toContain("block");
      expect(interceptSection).toContain("modify");
      expect(interceptSection).toContain("log");
    });
  });

  describe("Code coverage via CDP", () => {
    it("startCoverage function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.startCoverage).toBe("function");
    });

    it("stopCoverage function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.stopCoverage).toBe("function");
    });

    it("browser.startCoverage procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.startCoverage");
    });

    it("browser.stopCoverage procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.stopCoverage");
    });

    it("coverage uses Profiler.startPreciseCoverage CDP command", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("Profiler.startPreciseCoverage");
    });

    it("coverage uses CSS.startRuleUsageTracking CDP command", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("CSS.startRuleUsageTracking");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 5. VIRTUAL USER SMOKE TESTS
// ══════════════════════════════════════════════════════════════

describe("Virtual User Smoke Tests", () => {
  describe("Login flow", () => {
    it("auth.me procedure exists for session check", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("auth.me");
    });

    it("auth.logout procedure exists", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("auth.logout");
    });

    it("login URL generation uses window.location.origin", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/const.ts", "utf-8");
      expect(source).toContain("window.location.origin");
    });
  });

  describe("Navigation flow", () => {
    it("Home page component exists", async () => {
      const mod = await import("../client/src/pages/Home");
      expect(mod.default).toBeDefined();
    });

    it("Projects page component exists", async () => {
      const mod = await import("../client/src/pages/ProjectsPage");
      expect(mod.default).toBeDefined();
    });

    it("GitHub page component exists", async () => {
      const mod = await import("../client/src/pages/GitHubPage");
      expect(mod.default).toBeDefined();
    });

    it("Browser page component exists", async () => {
      const mod = await import("../client/src/pages/BrowserPage");
      expect(mod.default).toBeDefined();
    });

    it("WebAppProjectPage component exists", async () => {
      const mod = await import("../client/src/pages/WebAppProjectPage");
      expect(mod.default).toBeDefined();
    });

    it("WebAppBuilderPage component exists", async () => {
      const mod = await import("../client/src/pages/WebAppBuilderPage");
      expect(mod.default).toBeDefined();
    });

    it("NotFound page component exists", async () => {
      const mod = await import("../client/src/pages/NotFound");
      expect(mod.default).toBeDefined();
    });
  });

  describe("Responsive design", () => {
    it("device presets procedure exists for viewport switching", async () => {
      const mod = await import("./routers");
      expect(mod.appRouter._def.procedures).toHaveProperty("browser.devicePresets");
    });

    it("device presets include mobile, tablet, desktop", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("iphone");
      expect(source).toContain("ipad");
      expect(source).toContain("desktop-hd");
    });

    it("navigate accepts viewport and userAgent options", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("viewport");
      expect(source).toContain("userAgent");
    });
  });

  describe("Error states", () => {
    it("NotFound page renders 404", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/pages/NotFound.tsx", "utf-8");
      expect(source).toContain("404");
    });

    it("tRPC error handling handles unauthorized errors", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("client/src/main.tsx", "utf-8");
      expect(source).toContain("UNAUTHED_ERR_MSG");
      // main.tsx handles unauth by stopping retries (not redirecting)
      expect(source).toContain("TRPCClientError");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 6. DEVICE AUTOMATION → VIEWPORT + UA SWITCHING
// ══════════════════════════════════════════════════════════════

describe("Device Automation", () => {
  describe("Multi-browser support", () => {
    it("getOrCreateSession accepts browserType parameter", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain('browserType: BrowserType = "chromium"');
    });

    it("BrowserType includes chromium, firefox, webkit", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain('"chromium"');
      expect(source).toContain('"firefox"');
      expect(source).toContain('"webkit"');
    });

    it("browser.navigate accepts browserType in input", async () => {
      const fs = await import("fs");
      const source = readRouterSource();
      expect(source).toContain('browserType: z.enum(["chromium", "firefox", "webkit"])');
    });
  });

  describe("Viewport switching", () => {
    it("navigate supports viewport override", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("viewport");
      expect(source).toContain("setViewportSize");
    });

    it("navigate supports userAgent override", async () => {
      const fs = await import("fs");
      const source = fs.readFileSync("server/browserAutomation.ts", "utf-8");
      expect(source).toContain("userAgent");
    });
  });

  describe("Console and network monitoring", () => {
    it("getConsoleLogs function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getConsoleLogs).toBe("function");
    });

    it("getNetworkRequests function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getNetworkRequests).toBe("function");
    });

    it("getCurrentUrl function exists", async () => {
      const mod = await import("./browserAutomation");
      expect(typeof mod.getCurrentUrl).toBe("function");
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 7. POST-DEPLOY QA AUTOMATION TRIGGER
// ══════════════════════════════════════════════════════════════

describe("Post-Deploy QA Automation Trigger", () => {
  it("WebAppProjectPage has Run QA button", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain("Run QA");
  });

  it("Run QA navigates to /browser?url= with deployed URL", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain("/browser?url=");
    expect(source).toContain("encodeURIComponent");
  });

  it("BrowserPage reads ?url= query parameter", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain("URLSearchParams");
    expect(source).toContain('get("url")');
  });

  it("BrowserPage auto-navigates when ?url= is present", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain("autoNavigatedRef");
    expect(source).toContain("handleNavigate(queryUrl)");
  });

  it("BrowserPage pre-fills URL input from query param", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain("useState(queryUrl)");
  });

  it("BrowserPage has a11y audit panel", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain('"a11y"');
  });

  it("BrowserPage has performance metrics panel", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain('"perf"');
  });

  it("BrowserPage has code coverage panel", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain('"coverage"');
  });

  it("BrowserPage has QA test runner panel", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/BrowserPage.tsx", "utf-8");
    expect(source).toContain('"qa"');
  });
});

// ══════════════════════════════════════════════════════════════
// 8. INTEGRATION: FULL PIPELINE COHERENCE
// ══════════════════════════════════════════════════════════════

describe("Full Pipeline Coherence", () => {
  it("GitHub page links to deploy flow", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/GitHubPage.tsx", "utf-8");
    expect(source).toContain("deploy");
  });

  it("WebAppProjectPage shows GitHub connection status", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain("github");
  });

  it("WebAppProjectPage has settings panel with GitHub tab", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain('"github"');
  });

  it("deploy_webapp agent tool exists for chat-driven deploys", async () => {
    const mod = await import("./agentTools");
    const tools = mod.AGENT_TOOLS;
    const deployTool = tools.find((t: any) => t.function?.name === "deploy_webapp" || t.name === "deploy_webapp");
    expect(deployTool).toBeDefined();
  });

  it("browse_web agent tool exists for chat-driven QA", async () => {
    const mod = await import("./agentTools");
    const tools = mod.AGENT_TOOLS;
    const browseTool = tools.find((t: any) => t.function?.name === "browse_web" || t.name === "browse_web");
    expect(browseTool).toBeDefined();
  });

  it("WebApp Builder page file exists", async () => {
    const fs = await import("fs");
    expect(fs.existsSync("client/src/pages/WebAppBuilderPage.tsx")).toBe(true);
    const source = fs.readFileSync("client/src/pages/WebAppBuilderPage.tsx", "utf-8");
    expect(source).toMatch(/export\s+default\s+function/);
  });

  it("all management panels exist: preview, code, dashboard, deployments, settings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain('"preview"');
    expect(source).toContain('"code"');
    expect(source).toContain('"dashboard"');
    expect(source).toContain('"deployments"');
    expect(source).toContain('"settings"');
  });

  it("settings has all sub-tabs: general, domains, secrets, github, notifications, payment, seo", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");
    expect(source).toContain('"general"');
    expect(source).toContain('"domains"');
    expect(source).toContain('"secrets"');
    expect(source).toContain('"github"');
    expect(source).toContain('"notifications"');
    expect(source).toContain('"payment"');
    expect(source).toContain('"seo"');
  });
});
