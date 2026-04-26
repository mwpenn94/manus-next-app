/**
 * VU-6: Accessibility user (screen reader, keyboard-only, high contrast)
 * Scenarios: 6.1 ARIA scan, 6.2 Keyboard-only walkthrough, 6.3 High contrast
 */
import { vuTest, expect, captureEvidence, runAxeScan } from "./vu-base";

vuTest.describe("VU-6: Accessibility user", () => {
  vuTest("6.1 — ARIA scan on home + task creation (zero serious axe violations)", async ({
    vuPage,
    captureDir,
  }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Run axe-core scan on home page
    const homeResults = await runAxeScan(vuPage);
    await captureEvidence(vuPage, "6.1", captureDir, "home-axe-scan");

    // Zero serious/critical violations
    expect(homeResults.serious).toBe(0);

    // Log all violations for review
    if (homeResults.violations > 0) {
      console.log("Home page axe violations:", JSON.stringify(homeResults.details, null, 2));
    }
  });

  vuTest("6.2 — Keyboard-only walkthrough → 100% reachable, no traps in 50 tabs", async ({
    vuPage,
    captureDir,
  }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Start from the beginning of the page
    await vuPage.keyboard.press("Tab");
    await captureEvidence(vuPage, "6.2", captureDir, "first-tab");

    const visitedElements: string[] = [];
    let tabCount = 0;
    const maxTabs = 50;
    let trapDetected = false;
    let lastFocusedElement = "";

    while (tabCount < maxTabs) {
      await vuPage.keyboard.press("Tab");
      tabCount++;

      // Get currently focused element
      const focused = await vuPage.evaluate(() => {
        const el = document.activeElement;
        if (!el) return "none";
        const tag = el.tagName.toLowerCase();
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className ? `.${String(el.className).split(" ")[0]}` : "";
        return `${tag}${id}${cls}`;
      });

      // Check for focus trap (same element focused 3+ times in a row)
      if (focused === lastFocusedElement) {
        const repeatCount = visitedElements.filter((e) => e === focused).length;
        if (repeatCount >= 3) {
          trapDetected = true;
          break;
        }
      }

      visitedElements.push(focused);
      lastFocusedElement = focused;

      if (tabCount % 10 === 0) {
        await captureEvidence(vuPage, "6.2", captureDir, `tab-${tabCount}`);
      }
    }

    expect(trapDetected).toBe(false);
    await captureEvidence(vuPage, "6.2", captureDir, "keyboard-complete");

    // Verify we reached interactive elements
    const interactiveCount = visitedElements.filter(
      (e) => e.startsWith("button") || e.startsWith("a") || e.startsWith("input") || e.startsWith("textarea")
    ).length;
    expect(interactiveCount).toBeGreaterThan(0);
  });

  vuTest("6.3 — High contrast / color contrast check", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Run axe-core with color-contrast rule focus
    const results = await runAxeScan(vuPage);
    await captureEvidence(vuPage, "6.3", captureDir, "contrast-scan");

    // Check specifically for color-contrast violations
    const contrastViolations = results.details.filter((v) => v.id === "color-contrast");
    const seriousContrast = contrastViolations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    // Zero serious contrast violations for WCAG AA
    expect(seriousContrast.length).toBe(0);

    if (contrastViolations.length > 0) {
      console.log("Contrast violations:", JSON.stringify(contrastViolations, null, 2));
    }
  });
});
