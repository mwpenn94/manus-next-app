import { test, expect } from "@playwright/test";

/**
 * Mobile Responsive Layout E2E Tests (authenticated)
 * Tests the app on mobile viewports for responsive design
 */
test.describe("Mobile Responsive Layout", () => {
  test.use({
    storageState: "e2e/.auth/user.json",
    viewport: { width: 375, height: 812 }, // iPhone 13 viewport
  });

  test("home page renders correctly on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Main content should be visible
    const mainContent = page.locator("main, [class*='content']").first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });

    // Input area should be accessible
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
  });

  test("sidebar collapses on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // On mobile, sidebar should be hidden or collapsed
    const sidebar = page.locator('[class*="sidebar"], aside, nav').first();
    if (await sidebar.isVisible()) {
      // If visible, it should be an overlay/drawer, not taking full width
      const box = await sidebar.boundingBox();
      if (box) {
        expect(box.width).toBeLessThan(300);
      }
    }
  });

  test("task creation works on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const textarea = page.locator("textarea").first();
    await textarea.fill("Mobile test task");
    await textarea.press("Enter");
    await page.waitForURL(/\/task\//, { timeout: 10000 });

    // Task page should load on mobile
    const taskContent = page.locator("main, [role='main']").first();
    await expect(taskContent).toBeVisible({ timeout: 5000 });
  });

  test("billing page is responsive on mobile", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    // Content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // 10px tolerance
  });

  test("settings page is responsive on mobile", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    // Content should not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });

  test("navigation is accessible via hamburger menu on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Look for hamburger/menu button
    const menuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], [class*="hamburger"], [class*="menu-toggle"]'
    );
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // After clicking, navigation should appear
      await page.waitForTimeout(500);
      const nav = page.locator("nav, [role='navigation']").first();
      await expect(nav).toBeVisible({ timeout: 3000 });
    }
  });
});
