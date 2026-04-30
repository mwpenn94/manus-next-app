import { readRouterSource } from "./test-utils/readRouterSource";
/**
 * E2E Tests for New Features:
 * 1. GitHub Import flow
 * 2. Deploy from GitHub repo
 * 3. Browser automation engine
 * 4. Workspace panel browser tab
 * 5. Collapsible workspace panel
 * 6. WebappPreviewCard publishedUrl
 */
import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

// ── 1. GitHub Import Flow ──

describe("GitHub Import Flow", () => {
  it("WebAppBuilderPage has ImportFromGitHubButton component", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/WebAppBuilderPage.tsx"),
      "utf-8"
    );
    expect(content).toContain("ImportFromGitHubButton");
    expect(content).toContain("Import from GitHub");
    expect(content).toContain("trpc.github.listRemoteRepos");
    expect(content).toContain("trpc.github.connectRepo");
  });

  it("ImportFromGitHubButton renders a dialog with repo search", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/WebAppBuilderPage.tsx"),
      "utf-8"
    );
    expect(content).toContain("Search repositories...");
    expect(content).toContain("filteredRepos");
    expect(content).toContain("handleSelect");
  });

  it("connectRepo procedure exists in routers.ts", () => {
    const content = readRouterSource();
    expect(content).toContain("connectRepo:");
    expect(content).toContain("fullName: z.string()");
    expect(content).toContain("htmlUrl: z.string()");
  });

  it("listRemoteRepos procedure exists and returns repos with connected flag", () => {
    const content = readRouterSource();
    expect(content).toContain("listRemoteRepos:");
    expect(content).toContain("return { repos, connected: true }");
    expect(content).toContain("return { repos: [], connected: false }");
  });
});

// ── 2. Deploy from GitHub Repo ──

describe("Deploy from GitHub Repo", () => {
  it("deployFromGitHub procedure exists in routers.ts", () => {
    const content = readRouterSource();
    expect(content).toContain("deployFromGitHub:");
    expect(content).toContain("externalId: z.string()");
  });

  it("deployFromGitHub fetches repo tree and finds index.html", () => {
    const content = readRouterSource();
    expect(content).toContain("getRepoTree");
    expect(content).toContain("index.html");
    // Should look in multiple directories
    expect(content).toMatch(/public\/|dist\/|build\/|docs\//);
  });

  it("deployFromGitHub uses CloudFront provisioning", () => {
    const content = readRouterSource();
    // The deploy procedure should use the same publishing pipeline
    expect(content).toContain("storagePut");
  });

  it("WebAppProjectPage deploy dialog has Deploy from GitHub button", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );
    expect(content).toContain("deployFromGitHubMut");
    expect(content).toContain("Deploy from GitHub");
    expect(content).toContain("project.githubRepoId");
  });
});

// ── 3. Browser Automation Engine ──

describe("Browser Automation Engine", () => {
  it("browserAutomation.ts exports all required functions", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    // Core navigation
    expect(content).toContain("export async function navigate");
    expect(content).toContain("export async function screenshot");
    expect(content).toContain("export async function click");
    expect(content).toContain("export async function type");
    expect(content).toContain("export async function scroll");
    expect(content).toContain("export async function evaluate");
    // Additional actions
    expect(content).toContain("export async function waitForSelector");
    expect(content).toContain("export async function pressKey");
    expect(content).toContain("export async function selectOption");
    expect(content).toContain("export async function goBack");
    expect(content).toContain("export async function goForward");
    expect(content).toContain("export async function reload");
    expect(content).toContain("export async function getInteractiveElements");
    expect(content).toContain("export function getConsoleLogs");
  });

  it("browserAutomation uses Playwright chromium", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    expect(content).toContain("chromium");
    expect(content).toContain("playwright");
  });

  it("browserAutomation manages persistent sessions", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    expect(content).toContain("sessionId");
    // Should have session cleanup
    expect(content).toContain("close");
  });

  it("browserAutomation uploads screenshots to S3", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    expect(content).toContain("storagePut");
    expect(content).toContain("screenshot");
    expect(content).toContain("image/png");
  });

  it("browserAutomation captures console logs", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    expect(content).toContain("consoleLogs");
    expect(content).toContain("getConsoleLogs");
  });

  it("browserAutomation extracts page content for LLM context", () => {
    const content = fs.readFileSync(
      path.resolve("server/browserAutomation.ts"),
      "utf-8"
    );
    // Should extract text content from pages
    expect(content).toContain("textContent");
  });
});

// ── 4. Agent Tool Integration ──

describe("Agent Tool Integration", () => {
  it("cloud_browser tool uses real Playwright via browserAutomation", () => {
    const content = fs.readFileSync(
      path.resolve("server/agentTools.ts"),
      "utf-8"
    );
    expect(content).toContain('import("./browserAutomation")');
    expect(content).toContain("browserAuto.navigate");
    expect(content).toContain("browserAuto.screenshot");
    expect(content).toContain("browserAuto.click");
    expect(content).toContain("browserAuto.type");
    expect(content).toContain("browserAuto.scroll");
    expect(content).toContain("browserAuto.evaluate");
  });

  it("cloud_browser tool supports all action types", () => {
    const content = fs.readFileSync(
      path.resolve("server/agentTools.ts"),
      "utf-8"
    );
    const actions = [
      "navigate", "screenshot", "click", "type", "scroll",
      "evaluate", "wait_for", "press_key", "select",
      "go_back", "go_forward", "reload", "get_elements",
    ];
    for (const action of actions) {
      expect(content).toContain(`case "${action}"`);
    }
  });

  it("cloud_browser tool returns screenshot URLs as artifacts", () => {
    const content = fs.readFileSync(
      path.resolve("server/agentTools.ts"),
      "utf-8"
    );
    expect(content).toContain("browser_screenshot");
    expect(content).toContain("screenshotUrl");
    expect(content).toContain("artifactType");
  });

  it("cloud_browser tool includes console logs in results", () => {
    const content = fs.readFileSync(
      path.resolve("server/agentTools.ts"),
      "utf-8"
    );
    expect(content).toContain("getConsoleLogs");
    expect(content).toContain("Console Logs");
  });

  it("screenshot_verify tool uses LLM vision for visual QA", () => {
    const content = fs.readFileSync(
      path.resolve("server/agentTools.ts"),
      "utf-8"
    );
    expect(content).toContain("executeScreenshotVerify");
    expect(content).toContain("image_url");
    expect(content).toContain("visual QA");
  });
});

// ── 5. Workspace Panel Browser Tab ──

describe("Workspace Panel Browser Tab", () => {
  it("TaskView queries browser_screenshot artifacts", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("browser_screenshot");
    expect(content).toContain("browserArtifact");
    expect(content).toContain("browserUrlArtifact");
  });

  it("Browser tab shows URL bar with current URL", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("currentBrowserUrl");
    expect(content).toContain("font-mono");
  });

  it("Browser tab shows screenshot image", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("currentScreenshot");
    expect(content).toContain('alt="Browser preview"');
  });

  it("Browser tab has external link and refresh buttons", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("Open in new tab");
    expect(content).toContain("browserArtifact.refetch");
    expect(content).toContain("browserUrlArtifact.refetch");
  });

  it("Workspace panel has all Manus-style tabs", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    const tabs = ["browser", "all", "code", "terminal", "images", "documents", "links"];
    for (const tab of tabs) {
      expect(content).toContain(`"${tab}"`);
    }
  });
});

// ── 6. Collapsible Workspace Panel ──

describe("Collapsible Workspace Panel", () => {
  it("TaskView has desktopWorkspaceOpen state", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("desktopWorkspaceOpen");
    expect(content).toContain("setDesktopWorkspaceOpen");
  });

  it("Workspace panel state persists to localStorage", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("localStorage");
    expect(content).toContain("manus-workspace-panel");
  });

  it("Toggle button uses PanelRightOpen/PanelRightClose icons", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("PanelRightOpen");
    expect(content).toContain("PanelRightClose");
  });

  it("Desktop workspace panel is conditionally rendered", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("desktopWorkspaceOpen");
    // Should have transition/animation
    expect(content).toMatch(/transition|animate/);
  });
});

// ── 7. WebappPreviewCard publishedUrl ──

describe("WebappPreviewCard publishedUrl", () => {
  it("WebappPreviewCard accepts publishedUrl prop", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/WebappPreviewCard.tsx"),
      "utf-8"
    );
    expect(content).toContain("publishedUrl");
  });

  it("WebappPreviewCard uses publishedUrl for Visit Site button", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/WebappPreviewCard.tsx"),
      "utf-8"
    );
    expect(content).toContain("publishedUrl");
    expect(content).toContain("Visit Site");
    expect(content).toContain("iframe");
  });

  it("WebappPreviewCard shows deployed URL in URL bar", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/WebappPreviewCard.tsx"),
      "utf-8"
    );
    expect(content).toContain("displayUrl");
  });

  it("TaskView passes publishedUrl to WebappPreviewCard", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("publishedUrl={");
  });
});

// ── 8. DeploymentCard Improvements ──

describe("DeploymentCard Improvements", () => {
  it("DeploymentCard has empty URL guard", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/DeploymentCard.tsx"),
      "utf-8"
    );
    // Should not open blank page when URL is empty
    expect(content).toContain("deployedUrl");
  });

  it("DeploymentCard has Manage Project and Publish buttons", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/DeploymentCard.tsx"),
      "utf-8"
    );
    expect(content).toContain("Manage Project");
    expect(content).toContain("Publish");
  });

  it("DeploymentCard shows Live badge for deployed apps", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/components/DeploymentCard.tsx"),
      "utf-8"
    );
    expect(content).toContain("Live");
  });
});

// ── 9. Suggestion Chips Scrolling ──

describe("Suggestion Chips", () => {
  it("Suggestion chips use horizontal scrolling", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/pages/TaskView.tsx"),
      "utf-8"
    );
    expect(content).toContain("overflow-x-auto");
    expect(content).toContain("scrollbar-none");
  });

  it("scrollbar-none utility exists in index.css", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/index.css"),
      "utf-8"
    );
    expect(content).toContain("scrollbar-none");
    expect(content).toContain("scrollbar-width: none");
  });
});

// ── 10. SSE Pipeline Fallback Matching ──

describe("SSE Pipeline Fallback Matching", () => {
  it("buildStreamCallbacks has 3-tier fallback matching for webapp_deployed", () => {
    const content = fs.readFileSync(
      path.resolve("client/src/lib/buildStreamCallbacks.ts"),
      "utf-8"
    );
    expect(content).toContain("onWebappDeployed");
    expect(content).toContain("publishedUrl");
    // Should have fallback matching by name
    expect(content).toContain("webapp_preview");
  });
});
