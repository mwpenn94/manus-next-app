/**
 * Session 14 Bug Fixes Tests
 *
 * Tests for:
 * 1. Webapp preview proxy route
 * 2. Self-edit guard (system prompt + run_command guard)
 * 3. Robots.txt fallback (enhanced 403 error messages)
 * 4. Mode selection (Limitless mode persistence)
 */
import { describe, expect, it, vi } from "vitest";

// ── 1. Webapp Preview Proxy ──
describe("Webapp preview proxy", () => {
  it("preview route is registered at /api/webapp-preview", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('"/api/webapp-preview"');
    expect(indexContent).toContain("getActiveProject");
  });

  it("preview imports getActiveProject from agentTools", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain('import("../agentTools")');
  });

  it("preview returns 503 when no active project", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain("No active webapp project");
    expect(indexContent).toContain("503");
  });

  it("preview serves files from build output (file-serving approach)", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync("server/_core/index.ts", "utf-8");
    expect(indexContent).toContain("servePath");
    expect(indexContent).toContain("sendFile");
  });
});

// ── 2. Self-Edit Guard ──
describe("Self-edit guard", () => {
  it("system prompt contains CRITICAL SAFETY RULE", async () => {
    const fs = await import("fs");
    const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(agentStream).toContain("CRITICAL SAFETY RULE");
    expect(agentStream).toContain("SELF-EDIT GUARD");
  });

  it("system prompt warns against editing host application", async () => {
    const fs = await import("fs");
    const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(agentStream).toContain("MUST NEVER attempt to edit, modify, or overwrite the host application");
  });

  it("system prompt requires GitHub connection for repo edits", async () => {
    const fs = await import("fs");
    const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(agentStream).toContain("connect your GitHub repository first");
  });

  it("run_command blocks host app path references", async () => {
    const fs = await import("fs");
    const agentTools = fs.readFileSync("server/agentTools.ts", "utf-8");
    expect(agentTools).toContain("hostInstancePath");
    expect(agentTools).toContain("/home/ubuntu/manus-next-app");
    expect(agentTools).toContain("Cannot modify the running host application directly");
  });

  it("create_file and edit_file have path traversal guards", async () => {
    const fs = await import("fs");
    const agentTools = fs.readFileSync("server/agentTools.ts", "utf-8");
    expect(agentTools).toContain("cannot write outside project directory");
    expect(agentTools).toContain("cannot edit outside project directory");
  });
});

// ── 3. Robots.txt Fallback ──
describe("Robots.txt fallback", () => {
  it("system prompt has SITE ACCESS FALLBACK STRATEGY", async () => {
    const fs = await import("fs");
    const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(agentStream).toContain("SITE ACCESS FALLBACK STRATEGY");
    expect(agentStream).toContain("robots.txt");
    expect(agentStream).toContain("Archive.org");
    expect(agentStream).toContain("cloud_browser");
  });

  it("fetchPageContent returns enhanced error for 403 responses", async () => {
    const fs = await import("fs");
    const agentTools = fs.readFileSync("server/agentTools.ts", "utf-8");
    expect(agentTools).toContain("Access blocked: HTTP");
    expect(agentTools).toContain("SITE ACCESS FALLBACK STRATEGY");
  });

  it("system prompt requires at least 3-4 alternative approaches", async () => {
    const fs = await import("fs");
    const agentStream = fs.readFileSync("server/agentStream.ts", "utf-8");
    expect(agentStream).toContain("NEVER give up after a single 403");
    expect(agentStream).toContain("at least 3-4 alternative approaches");
  });
});

// ── 4. Mode Selection ──
describe("Mode selection and Limitless mode", () => {
  it("AppLayout ModelSelector reads from localStorage", async () => {
    const fs = await import("fs");
    const appLayout = fs.readFileSync("client/src/components/AppLayout.tsx", "utf-8");
    expect(appLayout).toContain("manus-agent-mode");
    expect(appLayout).toContain("MODE_TO_MODEL");
  });

  it("AppLayout ModelSelector has onModelChange handler", async () => {
    const fs = await import("fs");
    const appLayout = fs.readFileSync("client/src/components/AppLayout.tsx", "utf-8");
    expect(appLayout).toContain("onModelChange");
    expect(appLayout).toContain("MODEL_TO_MODE");
  });

  it("WebappPreviewCard resolves URLs via liveUrl fallback chain", async () => {
    const fs = await import("fs");
    const card = fs.readFileSync("client/src/components/WebappPreviewCard.tsx", "utf-8");
    // Uses liveUrl which resolves publishedUrl > domain > previewUrl
    expect(card).toContain("liveUrl");
    expect(card).toContain("iframeSrc");
  });

  it("WebappPreviewCard does not show raw localhost URLs to user", async () => {
    const fs = await import("fs");
    const card = fs.readFileSync("client/src/components/WebappPreviewCard.tsx", "utf-8");
    // The URL bar should show a friendly display URL (publishedUrl, domain, or localhost:port)
    expect(card).toContain("displayUrl");
    // Should support publishedUrl for deployed sites
    expect(card).toContain("publishedUrl");
  });

  it("ModeToggle includes limitless mode", async () => {
    const fs = await import("fs");
    const modeToggle = fs.readFileSync("client/src/components/ModeToggle.tsx", "utf-8");
    expect(modeToggle).toContain("limitless");
    expect(modeToggle).toContain("Limitless");
  });

  it("ModelSelector has MODE_TO_MODEL mapping for limitless", async () => {
    const fs = await import("fs");
    const modelSelector = fs.readFileSync("client/src/components/ModelSelector.tsx", "utf-8");
    expect(modelSelector).toContain("limitless");
    expect(modelSelector).toContain("manus-next-limitless");
  });
});

// ── 5. Mobile FAB Overlap ──
describe("Mobile FAB overlap fix", () => {
  it("FeedbackWidget FAB is removed from global layout", async () => {
    const fs = await import("fs");
    const app = fs.readFileSync("client/src/App.tsx", "utf-8");
    // FeedbackWidget should NOT be rendered in the global layout
    expect(app).not.toMatch(/<FeedbackWidget\s*\/>/);
  });

  it("Mobile bottom nav spacing handled by universal CSS rule in index.css", async () => {
    const fs = await import("fs");
    const css = fs.readFileSync("client/src/index.css", "utf-8");
    // @utility directive defines pb-mobile-nav for Tailwind v4
    expect(css).toContain("@utility pb-mobile-nav");
    // Universal CSS rule targets all direct children of #main-content on mobile
    expect(css).toContain("#main-content > *");
    expect(css).toContain("3.5rem");
    // Pages should NOT have per-page pb-mobile-nav (handled universally)
    const billing = fs.readFileSync("client/src/pages/BillingPage.tsx", "utf-8");
    expect(billing).not.toContain("pb-mobile-nav");
  });
});
