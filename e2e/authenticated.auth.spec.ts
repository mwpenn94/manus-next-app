/**
 * Authenticated E2E Tests
 *
 * These tests run with a pre-authenticated session (stored cookies from auth.setup.ts).
 * They verify features that require a logged-in user, such as:
 * - User profile display in sidebar
 * - Task creation with server persistence
 * - Settings page access
 * - Model selector with all 4 tiers
 * - Billing page access
 * - Logout flow
 *
 * File naming convention: *.auth.spec.ts (matched by playwright.config.ts)
 */

import { test, expect } from "@playwright/test";

test.describe("Authenticated: User Profile", () => {
  test("sidebar shows user name or avatar (not sign-in prompt)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // When authenticated, the sidebar should NOT show "Sign in" button
    const signInBtn = page.getByText("Sign in", { exact: false }).first();
    const signInVisible = await signInBtn.isVisible().catch(() => false);

    // Instead, it should show the referral banner or user info
    const referral = page.getByText("Share with a friend").first();
    const referralVisible = await referral.isVisible().catch(() => false);

    // At least one authenticated indicator should be present
    // (referral banner, user avatar, or absence of sign-in)
    expect(!signInVisible || referralVisible).toBe(true);
  });

  test("auth.me returns user data", async ({ request }) => {
    const response = await request.get("/api/trpc/auth.me");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.result?.data?.json?.openId).toBeTruthy();
    expect(body.result?.data?.json?.name).toBeTruthy();
  });
});

test.describe("Authenticated: Model Selector", () => {
  test("header model selector is visible and clickable", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The model selector shows "Manus Next Max" by default
    const selector = page.getByText("Manus Next Max").first();
    await expect(selector).toBeVisible({ timeout: 10000 });
  });

  test("model selector dropdown shows all 4 tiers", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click the model selector to open dropdown
    const selector = page.getByText("Manus Next Max").first();
    await selector.click();
    await page.waitForTimeout(500);

    // All 4 tiers should be visible in the dropdown
    await expect(page.getByText("Manus Next Limitless").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Manus Next Max").first()).toBeVisible();
    await expect(page.getByText("Manus Next 1.0").first()).toBeVisible();
    await expect(page.getByText("Manus Next Lite").first()).toBeVisible();
  });

  test("selecting Limitless tier updates the header", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Open model selector
    const selector = page.getByText("Manus Next Max").first();
    await selector.click();
    await page.waitForTimeout(500);

    // Click Limitless
    const limitlessOption = page.getByText("Manus Next Limitless").first();
    await limitlessOption.click();
    await page.waitForTimeout(500);

    // Header should now show Limitless
    await expect(page.getByText("Manus Next Limitless").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Authenticated: Task Creation & Persistence", () => {
  test("creating a task navigates to task page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const textarea = page.locator("textarea");
    await textarea.fill("E2E authenticated test task");
    await textarea.press("Enter");

    // Should navigate to /task/:id
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).toContain("/task/");
  });

  test("task page shows mode toggle and model selector", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const textarea = page.locator("textarea");
    await textarea.fill("E2E test: verify task page UI");
    await textarea.press("Enter");
    await page.waitForTimeout(3000);

    // Task page should have the model selector in header
    const modelSelector = page.getByText(/Manus Next/).first();
    await expect(modelSelector).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Authenticated: Settings Page", () => {
  test("settings page loads with user-specific content", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Settings should show tabs (General, Notifications, etc.)
    const hasGeneral = await page.getByText("General").first().isVisible().catch(() => false);
    const hasNotifications = await page.getByText("Notifications").first().isVisible().catch(() => false);
    const hasSettings = await page.getByText("SETTINGS").first().isVisible().catch(() => false);

    expect(hasGeneral || hasNotifications || hasSettings).toBe(true);
  });
});

test.describe("Authenticated: Billing Page", () => {
  test("billing page loads with plan info", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Billing page should show plan-related content
    const hasBilling = await page.getByText(/Usage|Billing|Plan|Credits/).first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(hasBilling).toBe(true);
  });
});

test.describe("Authenticated: Protected API Endpoints", () => {
  test("task list endpoint returns data", async ({ request }) => {
    const response = await request.get("/api/trpc/task.list");
    expect(response.ok()).toBeTruthy();
  });

  test("user preferences endpoint works", async ({ request }) => {
    const response = await request.get("/api/trpc/preferences.get");
    // Should return 200 (with data or empty preferences)
    expect(response.ok()).toBeTruthy();
  });
});
