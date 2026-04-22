import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AUTH_STATE_PATH = join(__dirname, "e2e", ".auth", "user.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: "list",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ── Auth Setup (runs first) ──
    // Calls /api/test-login to create a session cookie and saves
    // browser state to e2e/.auth/user.json for downstream projects.
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },

    // ── Unauthenticated Tests ──
    // Tests that run without any stored session (guest/anonymous state).
    {
      name: "chromium",
      testIgnore: [/auth\.setup\.ts/, /\.auth\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },

    // ── Authenticated Tests (Desktop) ──
    // Tests that require a logged-in user. Uses the stored session
    // from auth-setup so every test starts already authenticated.
    {
      name: "chromium-authenticated",
      testMatch: /\.auth\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE_PATH,
      },
    },

    // ── Authenticated Tests (Mobile) ──
    {
      name: "mobile-authenticated",
      testMatch: /\.auth\.spec\.ts/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Pixel 7"],
        storageState: AUTH_STATE_PATH,
      },
    },

    // ── Unauthenticated Mobile ──
    {
      name: "mobile",
      testIgnore: [/auth\.setup\.ts/, /\.auth\.spec\.ts/],
      use: { ...devices["Pixel 7"] },
    },
  ],
});
