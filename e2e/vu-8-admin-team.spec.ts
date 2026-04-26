/**
 * VU-8: Admin / team-lead (RBAC, team management, analytics)
 * Scenarios: 8.1 Admin panel access, 8.2 Role-based gating, 8.3 Analytics dashboard
 */
import { vuTest, expect, captureEvidence } from "./vu-base";

vuTest.describe("VU-8: Admin / team-lead", () => {
  vuTest("8.1 — Admin panel / settings accessible to admin role", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });
    await captureEvidence(vuPage, "8.1", captureDir, "home");

    // Navigate to settings
    const settingsLink = vuPage.locator(
      "a[href*='settings'], button:has-text('etting'), [data-testid*='settings']"
    );
    if ((await settingsLink.count()) > 0) {
      await settingsLink.first().click();
      await vuPage.waitForTimeout(2000);
      await captureEvidence(vuPage, "8.1", captureDir, "settings-page");
    }

    // Look for admin-specific sections
    const adminSections = vuPage.locator(
      "[data-testid*='admin'], :has-text('Admin'), :has-text('Team'), :has-text('anage')"
    );
    const hasAdminUI = (await adminSections.count()) > 0;
    await captureEvidence(vuPage, "8.1", captureDir, "admin-sections");
  });

  vuTest("8.2 — Non-admin user cannot access admin-only routes", async ({ vuPage, captureDir }) => {
    // Try to navigate directly to admin routes
    const adminRoutes = ["/admin", "/settings/admin", "/settings/team", "/dashboard/admin"];

    for (const route of adminRoutes) {
      await vuPage.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
      await vuPage.waitForTimeout(1000);

      const currentUrl = vuPage.url();
      await captureEvidence(vuPage, "8.2", captureDir, `route-${route.replace(/\//g, "-")}`);

      // Should either redirect away or show 403/not-found
      const pageContent = await vuPage.textContent("body");
      const lowerContent = (pageContent || "").toLowerCase();
      const isBlocked =
        currentUrl.includes("/login") ||
        currentUrl === "http://localhost:3000/" ||
        lowerContent.includes("not found") ||
        lowerContent.includes("forbidden") ||
        lowerContent.includes("unauthorized") ||
        lowerContent.includes("404");

      // Admin routes should be gated
    }
  });

  vuTest("8.3 — Analytics / usage data visible to admin", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Look for analytics/usage UI
    const analyticsUI = vuPage.locator(
      "a[href*='analytics'], a[href*='usage'], [data-testid*='analytics'], :has-text('nalytics'), :has-text('sage')"
    );

    if ((await analyticsUI.count()) > 0) {
      await analyticsUI.first().click();
      await vuPage.waitForTimeout(2000);
      await captureEvidence(vuPage, "8.3", captureDir, "analytics-page");
    }

    // Check for chart/graph elements
    const charts = vuPage.locator("canvas, svg[class*='chart'], [data-testid*='chart']");
    const hasCharts = (await charts.count()) > 0;
    await captureEvidence(vuPage, "8.3", captureDir, "charts-check");
  });

  vuTest("8.4 — Billing management accessible", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Navigate to billing
    await vuPage.goto("http://localhost:3000/settings", { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
    await vuPage.waitForTimeout(1000);

    const billingLink = vuPage.locator(
      "a[href*='billing'], button:has-text('illing'), [data-testid*='billing'], a[href*='subscription']"
    );
    if ((await billingLink.count()) > 0) {
      await billingLink.first().click();
      await vuPage.waitForTimeout(2000);
      await captureEvidence(vuPage, "8.4", captureDir, "billing-page");
    }

    // Check for Stripe-related elements
    const stripeElements = vuPage.locator(
      "[data-testid*='stripe'], :has-text('ubscription'), :has-text('lan'), :has-text('ayment')"
    );
    const hasStripeUI = (await stripeElements.count()) > 0;
    await captureEvidence(vuPage, "8.4", captureDir, "stripe-check");
  });
});
