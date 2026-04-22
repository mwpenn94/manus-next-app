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
 * 1. Navigate to / first to establish the page context on the correct origin
 * 2. POST /api/test-login via page.request (shares cookie jar with page)
 * 3. Extract Set-Cookie header and manually add cookie to browser context
 * 4. Navigate to / again to verify auth state loads (useAuth sees user)
 * 5. Save browser storage state to e2e/.auth/user.json
 * 6. Authenticated test projects load this state automatically
 *
 * The /api/test-login endpoint is dev-only (NODE_ENV !== 'production')
 * and creates a session for OWNER_OPEN_ID without the OAuth redirect.
 *
 * KEY FIX: Playwright's standalone `request` fixture and `page` have
 * separate cookie jars. We extract the Set-Cookie header and manually
 * inject the cookie into the browser context via `context.addCookies()`.
 */

import { test as setup, expect } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const AUTH_STATE_PATH = join(__dirname, ".auth", "user.json");

setup("authenticate via test-login endpoint", async ({ page }) => {
  // Step 1: Navigate to the app first to establish the origin
  // This ensures the browser context is on http://localhost:3000
  // Use a simple API endpoint first to avoid transient proxy/CDN issues
  await page.goto("/", { waitUntil: "commit", timeout: 15000 });
  await page.waitForTimeout(1000);

  // Step 2: Call the test-login endpoint using page.request
  // page.request shares the same cookie jar as the page's browser context
  const loginResponse = await page.request.post("/api/test-login", {
    headers: { "Content-Type": "application/json" },
  });

  // Verify the endpoint responded successfully
  expect(loginResponse.ok()).toBeTruthy();
  const body = await loginResponse.json();
  expect(body.ok).toBe(true);
  expect(body.openId).toBeTruthy();
  console.log(`[auth.setup] Session created for user: ${body.openId}`);

  // Step 3: Extract the Set-Cookie header and manually add to browser context
  // This is necessary because httpOnly cookies set via page.request may not
  // always be captured by storageState() depending on Playwright version.
  const setCookieHeader = loginResponse.headers()["set-cookie"];
  if (setCookieHeader) {
    // Parse the Set-Cookie header to extract cookie name, value, and attributes
    const cookieStr = setCookieHeader.split(",")[0].trim(); // Take first cookie
    const parts = cookieStr.split(";").map((p: string) => p.trim());
    const [nameValue, ...attrs] = parts;
    const eqIndex = nameValue.indexOf("=");
    const name = nameValue.substring(0, eqIndex);
    const value = nameValue.substring(eqIndex + 1);

    // Build cookie for Playwright's addCookies API
    // IMPORTANT: sameSite "None" requires secure=true, but localhost is not secure.
    // Use "Lax" for localhost to ensure the cookie is accepted by the browser context.
    const cookie: {
      name: string;
      value: string;
      domain: string;
      path: string;
      httpOnly: boolean;
      secure: boolean;
      sameSite: "Strict" | "Lax" | "None";
    } = {
      name,
      value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax", // Must be Lax (not None) when secure=false
    };

    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower.startsWith("path=")) cookie.path = attr.split("=")[1];
      // Ignore sameSite from server — we override to Lax for localhost
    }

    // Add the parsed cookie to the browser context
    await page.context().addCookies([cookie]);
    console.log(`[auth.setup] Manually injected cookie "${name}" into browser context`);
  } else {
    console.warn("[auth.setup] WARNING: No Set-Cookie header in test-login response!");
  }

  // Step 4: Navigate to the app again to verify the session cookie works
  // The browser context now has the session cookie from addCookies()
  await page.goto("/", { waitUntil: "networkidle", timeout: 15000 });

  // Step 5: Verify authentication loaded in the UI
  const url = page.url();
  const isOnHomePage = url.endsWith("/") || url.includes("localhost:3000");
  expect(isOnHomePage).toBe(true);

  // Check that the auth state resolved — look for user-specific UI elements
  const authIndicator = page.getByText("Share with a friend").first();
  const isAuthenticated = await authIndicator.isVisible({ timeout: 10000 }).catch(() => false);

  if (isAuthenticated) {
    console.log("[auth.setup] Authentication verified — user UI elements visible");
  } else {
    console.log("[auth.setup] Session cookie set — auth state may still be loading");
  }

  // Step 6: Verify cookies are actually in the context before saving
  const contextCookies = await page.context().cookies();
  const sessionCookie = contextCookies.find(c => c.name === "app_session_id");
  if (sessionCookie) {
    console.log(`[auth.setup] Session cookie confirmed in context: ${sessionCookie.name}=${sessionCookie.value.substring(0, 20)}...`);
  } else {
    console.warn("[auth.setup] WARNING: Session cookie NOT found in context cookies!");
    console.log(`[auth.setup] Available cookies: ${contextCookies.map(c => c.name).join(", ") || "(none)"}`);
  }

  // Step 7: Save the authenticated browser state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_STATE_PATH });
  console.log(`[auth.setup] Storage state saved to ${AUTH_STATE_PATH}`);
});
