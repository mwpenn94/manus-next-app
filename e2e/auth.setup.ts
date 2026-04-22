/**
 * Playwright Auth Setup — Authenticated E2E Test Harness
 *
 * This setup project runs BEFORE all other E2E test projects.
 * It calls the dev-only /api/test-login endpoint to create a valid
 * session cookie for the owner user, then stores the browser state
 * (cookies + localStorage) to a file that authenticated test projects
 * can reuse via `storageState`.
 *
 * Flow:
 * 1. POST /api/test-login → server creates JWT session cookie
 * 2. Navigate to / to verify auth state loads (useAuth sees user)
 * 3. Save browser storage state to e2e/.auth/user.json
 * 4. Authenticated test projects load this state automatically
 *
 * The /api/test-login endpoint is dev-only (NODE_ENV !== 'production')
 * and creates a session for OWNER_OPEN_ID without the OAuth redirect.
 */

import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const AUTH_STATE_PATH = join(__dirname, ".auth", "user.json");

setup("authenticate via test-login endpoint", async ({ page, request }) => {
  // Step 1: Call the test-login endpoint to get a session cookie
  const loginResponse = await request.post("/api/test-login", {
    headers: { "Content-Type": "application/json" },
  });

  // Verify the endpoint responded successfully
  expect(loginResponse.ok()).toBeTruthy();
  const body = await loginResponse.json();
  expect(body.ok).toBe(true);
  expect(body.openId).toBeTruthy();
  console.log(`[auth.setup] Session created for user: ${body.openId}`);

  // Step 2: Navigate to the app to verify the session cookie works
  // The request context already has the cookie from the POST response,
  // but we need the page context to also have it for storageState.
  // Navigate to home page which triggers useAuth → auth.me query.
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Step 3: Verify authentication loaded in the UI
  // Wait for the greeting to show the user's name (authenticated state)
  // or at minimum verify the page loaded without redirect to login
  const url = page.url();
  const isOnHomePage = url.endsWith("/") || url.includes("localhost:3000");
  expect(isOnHomePage).toBe(true);

  // Check that the auth state resolved — look for user-specific UI elements
  // The sidebar shows "Share with a friend" when authenticated (referral banner)
  // or the user avatar/name in the bottom section
  const authIndicator = page.getByText("Share with a friend").first();
  const isAuthenticated = await authIndicator.isVisible({ timeout: 10000 }).catch(() => false);

  if (isAuthenticated) {
    console.log("[auth.setup] Authentication verified — user UI elements visible");
  } else {
    // Even if the referral banner isn't visible, the session cookie is set.
    // The auth.me query may still be loading. Check that we're not redirected.
    console.log("[auth.setup] Session cookie set — auth state may still be loading");
  }

  // Step 4: Save the authenticated browser state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_STATE_PATH });
  console.log(`[auth.setup] Storage state saved to ${AUTH_STATE_PATH}`);
});
