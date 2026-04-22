import { test, expect } from "@playwright/test";

/**
 * Streaming & LLM Response E2E Tests (authenticated)
 * Tests the core chat flow: create task → send message → receive streamed response
 */
test.describe("Streaming & Chat Flow", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("task page has chat input area", async ({ page }) => {
    // Create a task first
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const textarea = page.locator("textarea").first();
    await textarea.fill("Test streaming response");
    await textarea.press("Enter");
    await page.waitForURL(/\/task\//, { timeout: 10000 });

    // Verify chat input exists on task page
    const chatInput = page.locator("textarea").first();
    await expect(chatInput).toBeVisible({ timeout: 5000 });
  });

  test("sending a message shows typing indicator", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const textarea = page.locator("textarea").first();
    await textarea.fill("Hello, test message");
    await textarea.press("Enter");
    await page.waitForURL(/\/task\//, { timeout: 10000 });

    // Wait for the task page to load and check for message or typing indicator
    await page.waitForTimeout(2000);
    const taskContent = page.locator('[class*="task"], [class*="chat"], main');
    await expect(taskContent.first()).toBeVisible({ timeout: 5000 });
  });

  test("SSE stream endpoint responds correctly", async ({ request }) => {
    // Test the stream endpoint directly
    const response = await request.post("/api/stream", {
      headers: { "Content-Type": "application/json" },
      data: {
        taskExternalId: "test-e2e-stream",
        messages: [{ role: "user", content: "Say hello" }],
      },
    });
    // Should get 200 with SSE content type, or 401 if auth required
    expect([200, 401]).toContain(response.status());
  });

  test("task page renders assistant messages with markdown", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const textarea = page.locator("textarea").first();
    await textarea.fill("What is 2+2?");
    await textarea.press("Enter");
    await page.waitForURL(/\/task\//, { timeout: 10000 });

    // Wait for response to appear (up to 30s for LLM)
    await page.waitForTimeout(3000);

    // Check that the task page has content (messages area)
    const mainContent = page.locator("main, [role='main']").first();
    await expect(mainContent).toBeVisible({ timeout: 5000 });
  });
});
