/**
 * Playwright PWA Validation Tests
 *
 * Validates:
 * 1. Manifest link exists and is valid JSON
 * 2. Required manifest fields present
 * 3. Service worker registers successfully
 * 4. Apple PWA meta tags present
 * 5. Theme-color meta tags present
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("PWA Installability", () => {
  test("manifest.json is linked and contains required fields", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // Check manifest link exists
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.json");

    // Fetch and validate manifest
    const response = await page.request.get(`${BASE_URL}/manifest.json`);
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBe("Manus Next");
    expect(manifest.short_name).toBe("Manus");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    // Check for required icon sizes
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("service worker registers successfully", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "load" });

    // Wait for SW registration (happens on load event)
    const swRegistered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        // Give it a moment to register
        if (!reg) {
          await new Promise((r) => setTimeout(r, 2000));
          const reg2 = await navigator.serviceWorker.getRegistration("/");
          return !!reg2;
        }
        return true;
      } catch {
        return false;
      }
    });

    expect(swRegistered).toBeTruthy();
  });

  test("Apple PWA meta tags are present", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    // apple-mobile-web-app-capable
    const capable = page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(capable).toHaveAttribute("content", "yes");

    // apple-mobile-web-app-status-bar-style
    const barStyle = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
    await expect(barStyle).toHaveAttribute("content", "black-translucent");

    // apple-mobile-web-app-title
    const title = page.locator('meta[name="apple-mobile-web-app-title"]');
    await expect(title).toHaveAttribute("content", "Manus Next");

    // apple-touch-icon
    const touchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(touchIcon).toHaveCount(1);
  });

  test("theme-color meta tags for light and dark", async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

    const darkTheme = page.locator('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    await expect(darkTheme).toHaveAttribute("content", "#0a0a0b");

    const lightTheme = page.locator('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    await expect(lightTheme).toHaveAttribute("content", "#ffffff");
  });

  test("offline page is accessible", async ({ page }) => {
    const response = await page.request.get(`${BASE_URL}/offline.html`);
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).toContain("Offline");
    expect(text).toContain("Manus Next");
  });
});
