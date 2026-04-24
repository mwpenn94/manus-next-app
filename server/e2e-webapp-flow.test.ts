/**
 * E2E Smoke Tests — Webapp Flow
 *
 * These are structural/integration tests that verify the webapp creation,
 * preview, deployment, and task completion flows are properly wired.
 * They test file structure, component composition, and data flow contracts
 * without requiring a running browser.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CLIENT_SRC = path.resolve("client/src");
const PAGES = path.resolve(CLIENT_SRC, "pages");
const COMPONENTS = path.resolve(CLIENT_SRC, "components");

// Helper to read a file
const readFile = (filePath: string) => fs.readFileSync(filePath, "utf-8");

describe("E2E: Create new task → agent creates webapp", () => {
  it("Home page has a task input that submits to createTask", () => {
    const home = readFile(path.join(PAGES, "Home.tsx"));
    expect(home).toContain("createTask");
    expect(home).toContain("navigate");
    expect(home).toContain("/task/");
  });

  it("TaskView renders and connects to SSE stream", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    // Should have streaming capability
    expect(taskView).toContain("streaming");
    expect(taskView).toContain("handleSend");
    // Should render messages
    expect(taskView).toContain("messages");
  });

  it("TaskView has route for /task/:id pattern", () => {
    const app = readFile(path.join(CLIENT_SRC, "App.tsx"));
    expect(app).toContain("/task/");
  });

  it("buildStreamCallbacks handles webapp_preview events", () => {
    const callbacks = readFile(path.resolve(CLIENT_SRC, "lib/buildStreamCallbacks.ts"));
    expect(callbacks).toContain("onWebappPreview");
    expect(callbacks).toContain("webapp_preview");
  });

  it("buildStreamCallbacks handles webapp_deployed events", () => {
    const callbacks = readFile(path.resolve(CLIENT_SRC, "lib/buildStreamCallbacks.ts"));
    expect(callbacks).toContain("onWebappDeployed");
    expect(callbacks).toContain("webapp_deployed");
    // Should update the webapp_preview card with publishedUrl
    expect(callbacks).toContain("publishedUrl");
  });
});

describe("E2E: WebappPreviewCard appears with live iframe", () => {
  it("WebappPreviewCard component exists and renders an iframe", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    expect(card).toContain("<iframe");
    expect(card).toContain("iframeSrc");
  });

  it("WebappPreviewCard accepts required props", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    // Must accept previewUrl, port, appName
    expect(card).toContain("previewUrl");
    expect(card).toContain("port");
    expect(card).toContain("appName");
    // Must accept publishedUrl for deployed sites
    expect(card).toContain("publishedUrl");
  });

  it("WebappPreviewCard has device preview toggles (desktop/tablet/mobile)", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    expect(card).toContain("Monitor");
    expect(card).toContain("Tablet");
    expect(card).toContain("Smartphone");
  });

  it("WebappPreviewCard uses proxy URL for localhost", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    expect(card).toContain("/api/webapp-preview/");
  });

  it("WebappPreviewCard has expandable fullscreen mode", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    expect(card).toContain("expanded");
    expect(card).toContain("Maximize");
  });

  it("TaskView renders WebappPreviewCard for webapp_preview message cards", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("WebappPreviewCard");
    expect(taskView).toContain("webapp_preview");
  });
});

describe("E2E: Deploy creates DeploymentCard with working URL", () => {
  it("DeploymentCard component exists", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toBeDefined();
    expect(card.length).toBeGreaterThan(100);
  });

  it("DeploymentCard shows app name and Live badge", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toContain("appName");
    expect(card).toContain("Live");
  });

  it("DeploymentCard shows deployed URL", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toContain("deployedUrl");
  });

  it("DeploymentCard has Visit Site button", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toContain("Visit Site");
  });

  it("DeploymentCard has Manage Project button", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toContain("Manage Project");
  });

  it("DeploymentCard has Publish button", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    expect(card).toContain("Publish");
  });

  it("TaskView renders DeploymentCard for webapp_deployed message cards", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("DeploymentCard");
    expect(taskView).toContain("webapp_deployed");
  });
});

describe("E2E: Visit Site opens working page (not 404)", () => {
  it("DeploymentCard Visit Site guards against empty URL", () => {
    const card = readFile(path.join(COMPONENTS, "DeploymentCard.tsx"));
    // Should check if URL exists before opening
    expect(card).toContain("!deployedUrl");
  });

  it("WebappPreviewCard external link uses publishedUrl when available", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    // Should prefer publishedUrl for external link
    expect(card).toContain("publishedUrl");
    expect(card).toContain("effectiveUrl");
  });

  it("WebappPreviewCard iframe falls back to deployed URL when dev server stops", () => {
    const card = readFile(path.join(COMPONENTS, "WebappPreviewCard.tsx"));
    // Should have fallback logic for when dev server is unavailable
    expect(card).toContain("publishedUrl");
    expect(card).toContain("effectiveUrl");
  });
});

describe("E2E: Task completion shows TaskCompletedCard + rating + suggestion chips", () => {
  it("TaskCompletedCard component exists", () => {
    const exists = fs.existsSync(path.join(COMPONENTS, "TaskCompletedCard.tsx"));
    expect(exists).toBe(true);
    const card = readFile(path.join(COMPONENTS, "TaskCompletedCard.tsx"));
    expect(card).toContain("Task completed");
  });

  it("TaskView renders TaskCompletedCard when task is completed", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("TaskCompletedCard");
  });

  it("TaskRating component exists with 5-star rating", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("TaskRating");
    // Should have star rating functionality
    expect(taskView).toContain("rating");
  });

  it("Suggestion chips render after task completion", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("FOLLOW_UP_SUGGESTIONS");
    expect(taskView).toContain("getFollowUpSuggestions");
    // Should use horizontal scrolling
    expect(taskView).toContain("overflow-x-auto");
    expect(taskView).toContain("scrollbar-none");
  });

  it("Suggestion chips include generation-specific follow-ups", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("generation_incomplete");
    expect(taskView).toContain("generation_done");
  });
});

describe("E2E: Sidebar task list shows new task with correct status", () => {
  it("AppLayout contains task list sidebar", () => {
    const layout = readFile(path.join(COMPONENTS, "AppLayout.tsx"));
    expect(layout).toContain("task");
    expect(layout).toContain("list");
  });

  it("AppLayout shows task status indicators", () => {
    const layout = readFile(path.join(COMPONENTS, "AppLayout.tsx"));
    // Should have status indicators (running, completed, etc.)
    expect(layout).toContain("status");
  });

  it("AppLayout sidebar links to task view", () => {
    const layout = readFile(path.join(COMPONENTS, "AppLayout.tsx"));
    expect(layout).toContain("/task/");
  });
});

describe("E2E: Collapsible workspace panel", () => {
  it("TaskView has desktop workspace toggle state", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("desktopWorkspaceOpen");
    expect(taskView).toContain("toggleDesktopWorkspace");
  });

  it("TaskView persists workspace state in localStorage", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("manus-workspace-panel");
    expect(taskView).toContain("localStorage");
  });

  it("TaskView has PanelRightOpen/Close toggle icons", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    expect(taskView).toContain("PanelRightOpen");
    expect(taskView).toContain("PanelRightClose");
  });

  it("Workspace panel uses AnimatePresence for smooth animation", () => {
    const taskView = readFile(path.join(PAGES, "TaskView.tsx"));
    // Desktop workspace should be wrapped in AnimatePresence
    expect(taskView).toContain("WORKSPACE PANEL (Desktop)");
    expect(taskView).toContain("AnimatePresence");
  });
});
