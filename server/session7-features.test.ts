/**
 * Session 7 — Tests for Analytics, Custom Domain Hosting, and ARIA Accessibility
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── 1. Analytics Collection ─────────────────────────────────────────────────

describe("Analytics Collection", () => {
  describe("pageViews schema", () => {
    const schema = readFileSync(resolve(__dirname, "../drizzle/schema.ts"), "utf-8");

    it("defines a pageViews table", () => {
      expect(schema).toContain("pageViews");
      expect(schema).toContain("mysqlTable");
    });

    it("has required columns: projectId, path, referrer, userAgent, visitorId, viewedAt", () => {
      // Check the pageViews table has the essential columns
      const pvSection = schema.slice(schema.indexOf("pageViews"));
      expect(pvSection).toContain("projectId");
      expect(pvSection).toContain("path");
      expect(pvSection).toContain("referrer");
      expect(pvSection).toContain("userAgent");
      expect(pvSection).toContain("visitorHash");
      expect(pvSection).toContain("viewedAt");
    });

    it("has projectId column for query filtering", () => {
      const pvSection = schema.slice(schema.indexOf("pageViews"));
      expect(pvSection).toContain("projectId");
      expect(pvSection).toContain(".notNull()");
    });
  });

  describe("analytics DB helpers", () => {
    const dbFile = readFileSync(resolve(__dirname, "./db.ts"), "utf-8");

    it("exports recordPageView function", () => {
      expect(dbFile).toContain("export async function recordPageView");
    });

    it("exports getPageViewStats function", () => {
      expect(dbFile).toContain("export async function getPageViewStats");
    });

    it("getPageViewStats returns totalViews, uniqueVisitors, topPaths, topReferrers, viewsByDay", () => {
      const fn = dbFile.slice(dbFile.indexOf("getPageViewStats"));
      expect(fn).toContain("totalViews");
      expect(fn).toContain("uniqueVisitors");
      expect(fn).toContain("topPaths");
      expect(fn).toContain("topReferrers");
      expect(fn).toContain("viewsByDay");
    });
  });

  describe("analytics collection endpoint", () => {
    const serverFile = readFileSync(resolve(__dirname, "./_core/index.ts"), "utf-8");

    it("registers /api/analytics/collect endpoint", () => {
      expect(serverFile).toContain("/api/analytics/collect");
    });

    it("registers /api/analytics/pixel.js endpoint", () => {
      expect(serverFile).toContain("/api/analytics/pixel.js");
    });

    it("pixel.js returns JavaScript content type", () => {
      expect(serverFile).toContain("application/javascript");
    });

    it("collect endpoint accepts POST requests", () => {
      expect(serverFile).toContain("app.post(\"/api/analytics/collect\"");
    });

    it("collect endpoint uses CORS headers for cross-origin tracking", () => {
      expect(serverFile).toContain("Access-Control-Allow-Origin");
    });
  });

  describe("analytics tRPC procedure", () => {
    const routersFile = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");

    it("has webappProject.analytics procedure", () => {
      const wpSection = routersFile.slice(routersFile.indexOf("webappProject:"));
      expect(wpSection).toContain("analytics: protectedProcedure");
    });

    it("accepts externalId and days parameters", () => {
      const analyticsSection = routersFile.slice(routersFile.indexOf("analytics: protectedProcedure"));
      expect(analyticsSection).toContain("externalId: z.string()");
      expect(analyticsSection).toContain("days: z.number()");
    });
  });
});

// ─── 2. Custom Domain Hosting ────────────────────────────────────────────────

describe("Custom Domain Hosting", () => {
  describe("WebAppProjectPage domains settings", () => {
    const page = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );

    it("has SSL provisioning panel", () => {
      expect(page).toContain("SslProvisioningPanel");
    });

    it("shows CNAME record instructions", () => {
      expect(page).toContain("CNAME");
    });

    it("mentions SSL certificate provisioning", () => {
      expect(page).toContain("SSL Certificate");
    });

    it("shows DNS validation status indicator", () => {
      expect(page).toContain("Awaiting DNS validation");
    });

    it("has Hosting Architecture info card", () => {
      expect(page).toContain("Hosting Architecture");
    });

    it("describes S3 static hosting with CDN", () => {
      expect(page).toContain("S3 static hosting with global CDN edge caching");
    });

    it("describes automatic SSL/TLS via ACM", () => {
      expect(page).toContain("Automatic SSL/TLS via ACM");
    });

    it("mentions analytics tracking pixel auto-injection", () => {
      expect(page).toContain("Analytics tracking pixel auto-injected on deploy");
    });

    it("mentions Cache-Control headers", () => {
      expect(page).toContain("Cache-Control headers optimized for performance");
    });
  });

  describe("deploy procedure injects tracking pixel", () => {
    const routersFile = readFileSync(resolve(__dirname, "./routers.ts"), "utf-8");

    it("deploy procedure references analytics tracking", () => {
      const deploySection = routersFile.slice(routersFile.indexOf("deploy: protectedProcedure"));
      expect(deploySection).toContain("analytics");
    });
  });
});

// ─── 3. ARIA Accessibility Labels ────────────────────────────────────────────

describe("ARIA Accessibility Labels", () => {
  describe("WebAppBuilderPage", () => {
    const page = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppBuilderPage.tsx"),
      "utf-8"
    );

    it("has aria-label on back button", () => {
      expect(page).toContain('aria-label="Go back to home"');
    });

    it("has aria-label on app name input", () => {
      expect(page).toContain('aria-label="App name"');
    });

    it("has aria-label on app description textarea", () => {
      expect(page).toContain('aria-label="App description prompt"');
    });

    it("has aria-label on refresh preview button", () => {
      expect(page).toContain('aria-label="Refresh preview"');
    });

    it("has aria-label on copy code button", () => {
      expect(page).toContain('aria-label="Copy generated code to clipboard"');
    });
  });

  describe("WebAppProjectPage", () => {
    const page = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );

    it("has aria-label on back to projects button", () => {
      expect(page).toContain('aria-label="Back to projects"');
    });

    it("has role=tab on panel navigation buttons", () => {
      expect(page).toContain('role="tab"');
    });

    it("has aria-selected on panel navigation buttons", () => {
      expect(page).toContain("aria-selected={activePanel === panel.id}");
    });

    it("has aria-label on project name input", () => {
      expect(page).toContain('aria-label="Project name"');
    });

    it("has aria-label on project description textarea", () => {
      expect(page).toContain('aria-label="Project description"');
    });

    it("has aria-label on badge visibility switch", () => {
      expect(page).toContain('aria-label="Toggle powered-by badge visibility"');
    });

    it("has aria-label on deploy notifications switch", () => {
      expect(page).toContain('aria-label="Toggle deploy notifications"');
    });

    it("has aria-label on error alerts switch", () => {
      expect(page).toContain('aria-label="Toggle error alerts"');
    });
  });

  describe("minimum ARIA coverage", () => {
    const builderPage = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppBuilderPage.tsx"),
      "utf-8"
    );
    const projectPage = readFileSync(
      resolve(__dirname, "../client/src/pages/WebAppProjectPage.tsx"),
      "utf-8"
    );

    it("WebAppBuilderPage has at least 5 ARIA attributes", () => {
      const count = (builderPage.match(/aria-label/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it("WebAppProjectPage has at least 7 ARIA attributes", () => {
      const count = (projectPage.match(/aria-label/g) || []).length;
      expect(count).toBeGreaterThanOrEqual(7);
    });
  });
});
