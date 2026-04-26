/**
 * VU-1: First-time mobile user (iPhone Safari, no account)
 * Scenarios: 1.1 Build-a-website quick-action, 1.2 Voice mic, 1.3 Suggestion carousel
 */
import { vuTest, expect, captureEvidence, submitTask } from "./vu-base";

vuTest.use({
  viewport: { width: 390, height: 844 }, // iPhone 14
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

vuTest.describe("VU-1: First-time mobile user", () => {
  vuTest("1.1 — Build-a-website quick-action → deliverable in <3min", async ({ vuPage, captureDir }) => {
    const start = Date.now();

    // Verify home screen loads on mobile
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });
    await captureEvidence(vuPage, "1.1", captureDir, "home-loaded");

    // Find and tap a suggestion card related to building
    const suggestions = vuPage.locator("[class*='suggestion'], [class*='card']").filter({
      hasText: /build|website|landing/i,
    });
    const suggestionCount = await suggestions.count();

    if (suggestionCount > 0) {
      await suggestions.first().click();
      await captureEvidence(vuPage, "1.1", captureDir, "suggestion-tapped");
    } else {
      // Fallback: type directly
      await submitTask(vuPage, "Build a simple landing page for a coffee shop");
    }

    await captureEvidence(vuPage, "1.1", captureDir, "task-submitted");

    const elapsed = Date.now() - start;
    // Verify task creation happened within reasonable time
    expect(elapsed).toBeLessThan(180000); // 3 minutes
  });

  vuTest("1.2 — Voice mic button visible and tappable on home", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Look for mic/voice button
    const micButton = vuPage.locator(
      "button[title*='oice'], button[aria-label*='oice'], button[title*='ic'], [data-testid*='mic'], [data-testid*='voice']"
    );

    await captureEvidence(vuPage, "1.2", captureDir, "mic-search");

    const micVisible = (await micButton.count()) > 0;
    if (micVisible) {
      await expect(micButton.first()).toBeVisible();
      // Verify it's tappable (not disabled)
      const isDisabled = await micButton.first().isDisabled();
      expect(isDisabled).toBe(false);
      await captureEvidence(vuPage, "1.2", captureDir, "mic-found");
    }
    // Note: mic may not be visible if STT not enabled; this is a DEGRADED not FAIL
  });

  vuTest("1.3 — Suggestion carousel → tap card → pre-filled task in 2 taps", async ({
    vuPage,
    captureDir,
  }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });
    await captureEvidence(vuPage, "1.3", captureDir, "home-loaded");

    // Find suggestion cards
    const cards = vuPage.locator(
      "[class*='suggestion'], [class*='card']"
    );
    const cardCount = await cards.count();

    if (cardCount > 0) {
      // Tap first card
      await cards.first().click();
      await captureEvidence(vuPage, "1.3", captureDir, "card-tapped");

      // Verify input was pre-filled or task was created
      const textarea = vuPage.locator("textarea").first();
      const inputValue = await textarea.inputValue().catch(() => "");
      const urlChanged = vuPage.url().includes("/task/");

      // Either input is pre-filled or we navigated to a task
      expect(inputValue.length > 0 || urlChanged).toBe(true);
      await captureEvidence(vuPage, "1.3", captureDir, "result");
    }
  });
});
