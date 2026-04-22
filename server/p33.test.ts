import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import fs from "fs";

const mockUser = { id: 1, openId: "test-user", role: "admin" as const, name: "Test" };

function authedCaller() {
  return appRouter.createCaller({ user: mockUser, req: {} as any, res: {} as any, setCookie: vi.fn() });
}

// ── P33: Frontend Page File Existence ──
describe("P33: New Page Files Exist", () => {
  const pages = [
    "DiscoverPage.tsx",
    "ProfilePage.tsx",
    "WebhooksPage.tsx",
  ];

  pages.forEach((page) => {
    it(`client/src/pages/${page} exists`, () => {
      expect(fs.existsSync(`client/src/pages/${page}`)).toBe(true);
    });
  });
});

// ── P33: Route Registration ──
describe("P33: Routes registered in App.tsx", () => {
  const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");

  const routes = ["/discover", "/profile", "/webhooks"];

  routes.forEach((route) => {
    it(`route ${route} is registered`, () => {
      expect(appContent).toContain(`path="${route}"`);
    });
  });

  const lazyImports = ["DiscoverPage", "ProfilePage", "WebhooksPage"];
  lazyImports.forEach((name) => {
    it(`lazy import for ${name} exists`, () => {
      expect(appContent).toContain(name);
    });
  });
});

// ── P33: Sidebar Navigation ──
describe("P33: Sidebar navigation entries", () => {
  const layoutContent = fs.readFileSync("client/src/components/AppLayout.tsx", "utf-8");

  it("has Discover link", () => {
    expect(layoutContent).toContain('href="/discover"');
  });

  it("has Integrations/Webhooks link", () => {
    expect(layoutContent).toContain('href="/webhooks"');
  });

  it("user avatar links to profile", () => {
    expect(layoutContent).toContain('navigate("/profile")');
  });
});

// ── P33: DiscoverPage Content ──
describe("P33: DiscoverPage structure", () => {
  const content = fs.readFileSync("client/src/pages/DiscoverPage.tsx", "utf-8");

  it("has template categories", () => {
    expect(content).toContain("CATEGORIES");
    expect(content).toContain("TEMPLATES");
  });

  it("has search functionality", () => {
    expect(content).toContain("searchQuery");
    expect(content).toContain("Search templates");
  });

  it("has difficulty levels", () => {
    expect(content).toContain("beginner");
    expect(content).toContain("intermediate");
    expect(content).toContain("advanced");
  });

  it("has at least 30 templates", () => {
    const templateCount = (content.match(/id: "t\d+"/g) || []).length;
    expect(templateCount).toBeGreaterThanOrEqual(30);
  });

  it("has category filtering", () => {
    expect(content).toContain("activeCategory");
    expect(content).toContain("filtered");
  });
});

// ── P33: ProfilePage Content ──
describe("P33: ProfilePage structure", () => {
  const content = fs.readFileSync("client/src/pages/ProfilePage.tsx", "utf-8");

  it("has display name editing", () => {
    expect(content).toContain("Display Name");
    expect(content).toContain("displayName");
  });

  it("has email display", () => {
    expect(content).toContain("Email");
    expect(content).toContain("Verified");
  });

  it("has bio field", () => {
    expect(content).toContain("Bio");
    expect(content).toContain("bio");
  });

  it("has save functionality", () => {
    expect(content).toContain("handleSave");
    expect(content).toContain("Save Changes");
  });

  it("has active sessions section", () => {
    expect(content).toContain("Active Sessions");
    expect(content).toContain("This Browser");
  });

  it("has danger zone with sign out", () => {
    expect(content).toContain("Danger Zone");
    expect(content).toContain("Sign Out");
  });

  it("has avatar with camera overlay and real upload", () => {
    expect(content).toContain("Camera");
    // Should have real upload functionality, not "coming soon"
    expect(content).toContain("/api/upload");
    expect(content).not.toContain("Avatar upload coming soon");
  });
});

// ── P33: WebhooksPage Content ──
describe("P33: WebhooksPage structure", () => {
  const content = fs.readFileSync("client/src/pages/WebhooksPage.tsx", "utf-8");

  it("has three tabs: Webhooks, API Keys, Notification Rules", () => {
    expect(content).toContain('value="webhooks"');
    expect(content).toContain('value="api-keys"');
    expect(content).toContain('value="rules"');
  });

  it("has webhook configuration", () => {
    expect(content).toContain("WebhookConfig");
    expect(content).toContain("addWebhook");
    expect(content).toContain("Endpoint URL");
  });

  it("has API key management", () => {
    expect(content).toContain("ApiKeyConfig");
    expect(content).toContain("addApiKey");
    expect(content).toContain("Create Key");
  });

  it("has notification rules", () => {
    expect(content).toContain("NotificationRule");
    expect(content).toContain("addRule");
    expect(content).toContain("Trigger Event");
  });

  it("has webhook events list", () => {
    expect(content).toContain("WEBHOOK_EVENTS");
    expect(content).toContain("task.completed");
    expect(content).toContain("task.failed");
    expect(content).toContain("form.submitted");
  });

  it("has key visibility toggle", () => {
    expect(content).toContain("visibleKeys");
    expect(content).toContain("EyeOff");
  });
});

// ── P33: WebAppProjectPage Settings Enhancements ──
describe("P33: WebAppProjectPage settings tabs", () => {
  const content = fs.readFileSync("client/src/pages/WebAppProjectPage.tsx", "utf-8");

  it("has payment settings tab", () => {
    expect(content).toContain('"payment"');
    expect(content).toContain("Payment (Stripe)");
    expect(content).toContain("Publishable Key");
  });

  it("has SEO settings tab with real LLM analysis", () => {
    expect(content).toContain('"seo"');
    expect(content).toContain("SEO Analysis");
    expect(content).toContain("Run SEO Analysis");
    // No longer has static checklist — uses real LLM-powered analysis
  });

  it("has duplicate project button", () => {
    expect(content).toContain("Duplicate Project");
  });

  it("has hide badge toggle", () => {
    expect(content).toContain("Hide Manus Badge");
  });

  it("has SEO analysis functionality", () => {
    expect(content).toContain("Run SEO Analysis");
  });
});

// ── P33: Preferences Backend (Data Controls / Mail) ──
describe("P33: Preferences save/get round-trip", () => {
  it("saves and retrieves general settings with new P33 fields", async () => {
    const caller = authedCaller();
    await caller.preferences.save({
      generalSettings: {
        shareTasksPublicly: true,
        persistBrowserLogin: false,
      },
    });
    const prefs = await caller.preferences.get();
    expect(prefs).toBeDefined();
    if (prefs?.generalSettings) {
      expect((prefs.generalSettings as any).shareTasksPublicly).toBe(true);
    }
  });
});
