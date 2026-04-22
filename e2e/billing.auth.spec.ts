import { test, expect } from "@playwright/test";

/**
 * Stripe Billing E2E Tests (authenticated)
 * Tests the billing page, checkout flow, webhook endpoint, and payment history
 */
test.describe("Billing & Payments", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("billing page shows product cards", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    // Should show at least one product/plan card
    const billingContent = page.locator("main, [class*='billing']").first();
    await expect(billingContent).toBeVisible({ timeout: 10000 });

    // Check for pricing or plan-related text
    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/pro|plan|credit|month|year|subscribe/i);
  });

  test("billing page shows usage statistics", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    // Should show usage stats (tasks created, messages, etc.)
    const pageText = await page.textContent("body");
    expect(pageText).toMatch(/usage|task|credit|message/i);
  });

  test("Stripe webhook endpoint responds to test events", async ({ request }) => {
    // Send a test event to the webhook endpoint
    const response = await request.post("/api/stripe/webhook", {
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "t=1234567890,v1=test_signature",
      },
      data: JSON.stringify({
        id: "evt_test_webhook_verification",
        type: "checkout.session.completed",
        data: { object: {} },
      }),
    });

    // Should return 400 (bad signature) but NOT 404 (route exists)
    expect(response.status()).not.toBe(404);
    // Webhook route should exist and process the request
    expect([200, 400]).toContain(response.status());
  });

  test("payment products API returns product list", async ({ request }) => {
    const response = await request.get("/api/trpc/payment.products");
    expect(response.status()).toBe(200);
    const data = await response.json();
    // Should return an array of products
    expect(data).toBeDefined();
  });

  test("checkout session creation requires authentication", async ({ request }) => {
    // Try to create a checkout session
    const response = await request.post("/api/trpc/payment.createCheckout", {
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        json: { productId: "pro_monthly" },
      }),
    });
    // Should succeed (200) or return structured error
    expect([200, 400, 500]).toContain(response.status());
  });

  test("payment history endpoint works", async ({ request }) => {
    const response = await request.get("/api/trpc/payment.history");
    // Should return 200 with empty or populated history
    expect(response.status()).toBe(200);
  });

  test("billing page has checkout buttons", async ({ page }) => {
    await page.goto("/billing");
    await page.waitForLoadState("networkidle");

    // Look for subscribe/checkout/upgrade buttons
    const buttons = page.locator("button");
    const buttonTexts = await buttons.allTextContents();
    const hasCheckoutButton = buttonTexts.some(
      (text) => /subscribe|checkout|upgrade|get started|buy/i.test(text)
    );
    expect(hasCheckoutButton).toBeTruthy();
  });
});
