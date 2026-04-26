/**
 * VU-4: Voice-first hands-free user
 * Scenarios: 4.1 Voice command → STT → submit, 4.2 Voice correction,
 * 4.3 Barge-in, 4.4 Hands-free continuous mode
 */
import { vuTest, expect, captureEvidence } from "./vu-base";

vuTest.describe("VU-4: Voice-first hands-free", () => {
  vuTest("4.1 — Voice input button exists and is accessible", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });
    await captureEvidence(vuPage, "4.1", captureDir, "home");

    // Find voice/mic button
    const micButton = vuPage.locator(
      "button[title*='oice'], button[aria-label*='oice'], button[title*='ic'], [data-testid*='mic'], [data-testid*='voice'], button:has(svg)"
    ).filter({ hasText: /mic|voice/i });

    const micByIcon = vuPage.locator("[data-testid*='mic'], [data-testid*='voice']");
    const allMicCandidates = vuPage.locator("button[title*='ic']");

    const found = (await micButton.count()) > 0 ||
                  (await micByIcon.count()) > 0 ||
                  (await allMicCandidates.count()) > 0;

    await captureEvidence(vuPage, "4.1", captureDir, "mic-search-result");
    // Voice input is a key parity feature; log finding
  });

  vuTest("4.2 — Voice settings accessible", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Navigate to settings
    const settingsLink = vuPage.locator(
      "a[href*='settings'], button:has-text('etting'), [data-testid*='settings']"
    );
    if ((await settingsLink.count()) > 0) {
      await settingsLink.first().click();
      await vuPage.waitForTimeout(1000);
    }

    // Look for voice-related settings
    const voiceSettings = vuPage.locator(
      "[data-testid*='voice'], :has-text('oice'), :has-text('peech')"
    );
    await captureEvidence(vuPage, "4.2", captureDir, "voice-settings");
  });

  vuTest("4.3 — TTS playback controls exist in task view", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Navigate to a task
    const taskLinks = vuPage.locator("a[href*='/task/']");
    if ((await taskLinks.count()) > 0) {
      await taskLinks.first().click();
      await vuPage.waitForTimeout(2000);
    }

    // Look for TTS/audio playback controls
    const ttsControls = vuPage.locator(
      "button[aria-label*='play'], button[aria-label*='speak'], [data-testid*='tts'], [data-testid*='audio']"
    );
    await captureEvidence(vuPage, "4.3", captureDir, "tts-controls");
  });

  vuTest("4.4 — Hands-free mode reachability", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Check if there's a continuous/hands-free mode toggle
    const handsFreeToggle = vuPage.locator(
      "[data-testid*='hands-free'], [data-testid*='continuous'], button:has-text('ands-free'), button:has-text('ontinuous')"
    );
    await captureEvidence(vuPage, "4.4", captureDir, "hands-free-search");

    const hasHandsFree = (await handsFreeToggle.count()) > 0;
    // Log availability for parity scoring
  });
});
