import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import fs from "fs";
import path from "path";

const mockUser = { id: 1, openId: "test-user", role: "admin" as const, name: "Test" };

function authedCaller() {
  return appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any, setCookie: vi.fn() });
}

// ── P32: Data Controls (preferences-based) ──
describe("P32: Data Controls via Preferences", () => {
  it("preferences.save accepts data control settings in generalSettings", async () => {
    const caller = authedCaller();
    const result = await caller.preferences.save({
      generalSettings: {
        shareTasksPublicly: false,
        persistBrowserLogin: true,
        allowCookieStorage: true,
        autoDeleteHistory: false,
        historyRetentionDays: 90,
      },
    });
    // upsertUserPreferences returns the full preferences object or null
    expect(result).toBeDefined();
  });

  it("preferences.save accepts mail settings nested in generalSettings", async () => {
    const caller = authedCaller();
    const result = await caller.preferences.save({
      generalSettings: {
        mailSettings: {
          emailEnabled: true,
          workflowEmail: "test+agent@manus.space",
          approvedSenders: ["friend@example.com"],
          autoReply: true,
          autoReplyMessage: "Got it!",
          forwardToEmail: "me@example.com",
        },
      },
    });
    expect(result).toBeDefined();
  });

  it("preferences.get returns previously saved data control settings", async () => {
    const caller = authedCaller();
    // Save first
    await caller.preferences.save({
      generalSettings: {
        shareTasksPublicly: true,
        persistBrowserLogin: false,
      },
    });
    // Read back
    const prefs = await caller.preferences.get();
    expect(prefs).toBeDefined();
    if (prefs?.generalSettings) {
      const gs = prefs.generalSettings as Record<string, unknown>;
      expect(gs.shareTasksPublicly).toBe(true);
      expect(gs.persistBrowserLogin).toBe(false);
    }
  });
});

// ── P32: Connectors Rewrite ──
describe("P32: Connectors Page Rewrite", () => {
  it("ConnectorsPage file exists with three-tab layout", () => {
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    expect(content).toContain("Integrations");
    expect(content).toContain("Custom API");
    expect(content).toContain("Custom MCP");
  });

  it("ConnectorsPage has 30+ connector definitions", () => {
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    // Count unique connector IDs
    const matches = content.match(/id:\s*"/g);
    expect(matches).toBeDefined();
    expect(matches!.length).toBeGreaterThanOrEqual(30);
  });

  it("ConnectorsPage includes OAuth-capable connectors", () => {
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    expect(content).toContain("github");
    expect(content).toContain("google-drive");
    expect(content).toContain("slack");
    expect(content).toContain("notion");
  });

  it("ConnectorsPage has Custom API form with key/value inputs", () => {
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    expect(content).toContain("customApiName");
    expect(content).toContain("customApiKey");
    expect(content).toContain("customApiBaseUrl");
  });

  it("ConnectorsPage has Custom MCP form with server URL", () => {
    const content = fs.readFileSync("client/src/pages/ConnectorsPage.tsx", "utf-8");
    expect(content).toContain("customMcpName");
    expect(content).toContain("customMcpUrl");
  });

  it("connector.list procedure exists and returns array", async () => {
    const caller = authedCaller();
    const result = await caller.connector.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ── P32: Data Controls Page ──
describe("P32: DataControlsPage", () => {
  it("DataControlsPage file exists", () => {
    expect(fs.existsSync("client/src/pages/DataControlsPage.tsx")).toBe(true);
  });

  it("DataControlsPage has shared tasks section", () => {
    const content = fs.readFileSync("client/src/pages/DataControlsPage.tsx", "utf-8");
    expect(content).toContain("Shared Tasks");
    expect(content).toContain("shareTasksPublicly");
  });

  it("DataControlsPage has deployed websites section", () => {
    const content = fs.readFileSync("client/src/pages/DataControlsPage.tsx", "utf-8");
    expect(content).toContain("Deployed Websites");
    expect(content).toContain("webappProject.list");
  });

  it("DataControlsPage has cloud browser section", () => {
    const content = fs.readFileSync("client/src/pages/DataControlsPage.tsx", "utf-8");
    expect(content).toContain("Cloud Browser");
    expect(content).toContain("persistBrowserLogin");
    expect(content).toContain("allowCookieStorage");
  });

  it("DataControlsPage has history retention controls", () => {
    const content = fs.readFileSync("client/src/pages/DataControlsPage.tsx", "utf-8");
    expect(content).toContain("History & Retention");
    expect(content).toContain("autoDeleteHistory");
    expect(content).toContain("historyRetentionDays");
  });

  it("DataControlsPage has data export and deletion", () => {
    const content = fs.readFileSync("client/src/pages/DataControlsPage.tsx", "utf-8");
    expect(content).toContain("Export All Data");
    expect(content).toContain("Delete All Data");
  });
});

// ── P32: Mail Manus Page ──
describe("P32: MailManusPage", () => {
  it("MailManusPage file exists", () => {
    expect(fs.existsSync("client/src/pages/MailManusPage.tsx")).toBe(true);
  });

  it("MailManusPage has email enable toggle", () => {
    const content = fs.readFileSync("client/src/pages/MailManusPage.tsx", "utf-8");
    expect(content).toContain("Enable Mail Manus");
    expect(content).toContain("emailEnabled");
  });

  it("MailManusPage has workflow email display", () => {
    const content = fs.readFileSync("client/src/pages/MailManusPage.tsx", "utf-8");
    expect(content).toContain("Your Agent Email");
    expect(content).toContain("workflowEmail");
  });

  it("MailManusPage has approved senders management", () => {
    const content = fs.readFileSync("client/src/pages/MailManusPage.tsx", "utf-8");
    expect(content).toContain("Approved Senders");
    expect(content).toContain("approvedSenders");
    expect(content).toContain("handleAddSender");
    expect(content).toContain("handleRemoveSender");
  });

  it("MailManusPage has auto-reply settings", () => {
    const content = fs.readFileSync("client/src/pages/MailManusPage.tsx", "utf-8");
    expect(content).toContain("Auto-Reply");
    expect(content).toContain("autoReply");
    expect(content).toContain("autoReplyMessage");
  });

  it("MailManusPage has forward results settings", () => {
    const content = fs.readFileSync("client/src/pages/MailManusPage.tsx", "utf-8");
    expect(content).toContain("Forward Results");
    expect(content).toContain("forwardToEmail");
  });
});

// ── P32: Deployed Websites Page ──
describe("P32: DeployedWebsitesPage", () => {
  it("DeployedWebsitesPage file exists", () => {
    expect(fs.existsSync("client/src/pages/DeployedWebsitesPage.tsx")).toBe(true);
  });

  it("DeployedWebsitesPage has summary statistics cards", () => {
    const content = fs.readFileSync("client/src/pages/DeployedWebsitesPage.tsx", "utf-8");
    expect(content).toContain("Total Sites");
    expect(content).toContain("Page Views");
    expect(content).toContain("Unique Visitors");
  });

  it("DeployedWebsitesPage has five tabs", () => {
    const content = fs.readFileSync("client/src/pages/DeployedWebsitesPage.tsx", "utf-8");
    expect(content).toContain("overview");
    expect(content).toContain("analytics");
    expect(content).toContain("database");
    expect(content).toContain("storage");
    expect(content).toContain("seo");
  });

  it("DeployedWebsitesPage uses webappProject.list", () => {
    const content = fs.readFileSync("client/src/pages/DeployedWebsitesPage.tsx", "utf-8");
    expect(content).toContain("webappProject.list");
  });

  it("DeployedWebsitesPage links to individual project pages", () => {
    const content = fs.readFileSync("client/src/pages/DeployedWebsitesPage.tsx", "utf-8");
    expect(content).toContain("/projects/webapp/");
  });

  it("DeployedWebsitesPage has SEO tab with project metadata", () => {
    const content = fs.readFileSync("client/src/pages/DeployedWebsitesPage.tsx", "utf-8");
    expect(content).toContain("SEO Settings");
    expect(content).toContain("Framework");
    expect(content).toContain("Visibility");
  });
});

// ── P32: Routes & Navigation ──
describe("P32: Routes & Navigation", () => {
  // Session 29b/29c: data-controls and mail routes removed for Manus alignment
  it("App.tsx has core Manus-aligned routes", () => {
    const content = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(content).toContain('path="/analytics"');
    expect(content).toContain('path="/memory"');
    expect(content).toContain('path="/projects"');
    expect(content).toContain('path="/library"');
    expect(content).toContain('path="/schedule"');
    expect(content).toContain('path="/billing"');
    expect(content).toContain('path="/settings"');
  });

  it("AppLayout sidebar has Manus-aligned nav items", () => {
    const layoutSrc = fs.readFileSync(path.join(__dirname, "../client/src/components/AppLayout.tsx"), "utf8");
    // New sidebar has top nav items + AppsGridMenu
    expect(layoutSrc).toContain("New task");
    expect(layoutSrc).toContain("Agent");
    expect(layoutSrc).toContain("Search");
    expect(layoutSrc).toContain("Library");
    expect(layoutSrc).toContain("AppsGridMenu");
  });
});

// ── P32: webappProject procedures ──
describe("P32: WebApp Project Procedures", () => {
  it("webappProject.list returns array", async () => {
    const caller = authedCaller();
    const result = await caller.webappProject.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
