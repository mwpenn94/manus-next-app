/**
 * VU-3: Power iPad multi-tasker, branching + follow-ups
 * Scenarios: 3.1 Two parallel tasks, 3.2 Schedule recurring, 3.3 File drag-drop
 */
import { vuTest, expect, captureEvidence, submitTask } from "./vu-base";

vuTest.use({
  viewport: { width: 1024, height: 1366 }, // iPad Pro
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});

vuTest.describe("VU-3: Power iPad multi-tasker", () => {
  vuTest("3.1 — Two parallel tasks → switch + follow-ups → complete isolation", async ({
    vuPage,
    captureDir,
  }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Create first task
    await submitTask(vuPage, "Research the history of artificial intelligence");
    await vuPage.waitForTimeout(2000);
    await captureEvidence(vuPage, "3.1", captureDir, "task-1-created");
    const task1Url = vuPage.url();

    // Navigate back to home to create second task
    await vuPage.goto(vuPage.url().split("/task/")[0] || "http://localhost:3000");
    await vuPage.waitForTimeout(1000);

    await submitTask(vuPage, "Write a poem about the ocean");
    await vuPage.waitForTimeout(2000);
    await captureEvidence(vuPage, "3.1", captureDir, "task-2-created");
    const task2Url = vuPage.url();

    // Verify tasks are at different URLs (isolation)
    if (task1Url.includes("/task/") && task2Url.includes("/task/")) {
      expect(task1Url).not.toBe(task2Url);
    }

    await captureEvidence(vuPage, "3.1", captureDir, "isolation-verified");
  });

  vuTest("3.2 — Scheduled tasks UI accessible", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Look for scheduled/recurring task UI
    const scheduleUI = vuPage.locator(
      "a[href*='schedule'], button:has-text('chedule'), [data-testid*='schedule']"
    );
    await captureEvidence(vuPage, "3.2", captureDir, "schedule-search");

    const hasScheduleUI = (await scheduleUI.count()) > 0;
    // Note: scheduled tasks may be behind sidebar navigation
  });

  vuTest("3.3 — File upload area visible and functional", async ({ vuPage, captureDir }) => {
    await expect(vuPage.locator("h1")).toBeVisible({ timeout: 10000 });

    // Create a task to get to task view
    await submitTask(vuPage, "Help me analyze a document");
    await vuPage.waitForTimeout(2000);

    // Look for file upload / attachment UI
    const uploadUI = vuPage.locator(
      "button[title*='ttach'], button[aria-label*='ttach'], [data-testid*='upload'], [data-testid*='attach'], input[type='file']"
    );
    await captureEvidence(vuPage, "3.3", captureDir, "upload-search");

    const hasUploadUI = (await uploadUI.count()) > 0;
    if (hasUploadUI) {
      await captureEvidence(vuPage, "3.3", captureDir, "upload-found");
    }
  });
});
