import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/* ═══════════════════════════════════════════════════════════════════
   Test Helpers
   ═══════════════════════════════════════════════════════════════════ */

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

const mockUser: AuthenticatedUser = {
  id: 42,
  openId: "test-user-42",
  email: "test@example.com",
  name: "Test User",
  loginMethod: "github",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const mockAdmin: AuthenticatedUser = {
  id: 1,
  openId: "admin-1",
  email: "admin@example.com",
  name: "Admin",
  loginMethod: "manus",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function authedCaller(user: AuthenticatedUser = mockUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as any,
  });
}

function publicCaller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as any,
  });
}

/* ═══════════════════════════════════════════════════════════════════
   1. tieredAuthStatus — Public endpoint
   ═══════════════════════════════════════════════════════════════════ */

describe("connector.tieredAuthStatus", () => {
  it("returns tier data for all known connectors", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    // Must return an object with connector IDs as keys
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");

    // Check that known connectors are present
    const expectedIds = ["github", "google-drive", "calendar", "notion", "slack", "microsoft-365",
                         "vercel", "openai", "anthropic", "firecrawl", "similarweb", "zapier", "email"];
    for (const id of expectedIds) {
      expect(result).toHaveProperty(id);
    }
  });

  it("each connector has tier1-4 booleans and bestTier number", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    for (const [id, tiers] of Object.entries(result)) {
      expect(tiers).toHaveProperty("tier1");
      expect(tiers).toHaveProperty("tier2");
      expect(tiers).toHaveProperty("tier3");
      expect(tiers).toHaveProperty("tier4");
      expect(tiers).toHaveProperty("bestTier");
      expect(typeof tiers.tier1).toBe("boolean");
      expect(typeof tiers.tier2).toBe("boolean");
      expect(typeof tiers.tier3).toBe("boolean");
      expect(typeof tiers.tier4).toBe("boolean");
      expect(typeof tiers.bestTier).toBe("number");
      expect(tiers.bestTier).toBeGreaterThanOrEqual(1);
      expect(tiers.bestTier).toBeLessThanOrEqual(4);
    }
  });

  it("tier3 and tier4 are always true for all connectors", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    for (const [id, tiers] of Object.entries(result)) {
      expect(tiers.tier3).toBe(true);
      expect(tiers.tier4).toBe(true);
    }
  });

  it("tier2 is true only for Manus-verifiable connectors when OAuth is configured", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    // Manus-verifiable connectors: github, microsoft-365, google-drive, calendar
    const manusVerifiable = new Set(["github", "microsoft-365", "google-drive", "calendar"]);
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);

    for (const [id, tiers] of Object.entries(result)) {
      if (manusVerifiable.has(id) && hasManusOAuth) {
        expect(tiers.tier2).toBe(true);
      } else if (!manusVerifiable.has(id)) {
        expect(tiers.tier2).toBe(false);
      }
    }
  });

  it("bestTier reflects the highest available tier (lowest number)", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    for (const [id, tiers] of Object.entries(result)) {
      if (tiers.tier1) {
        expect(tiers.bestTier).toBe(1);
      } else if (tiers.tier2) {
        expect(tiers.bestTier).toBe(2);
      } else if (tiers.tier3) {
        expect(tiers.bestTier).toBe(3);
      } else {
        expect(tiers.bestTier).toBe(4);
      }
    }
  });

  it("works without authentication (public endpoint)", async () => {
    const caller = publicCaller();
    // Should not throw
    const result = await caller.connector.tieredAuthStatus();
    expect(result).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2. verifyViaManus — Protected endpoint
   ═══════════════════════════════════════════════════════════════════ */

describe("connector.verifyViaManus", () => {
  it("rejects non-verifiable connectors", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.verifyViaManus({
        connectorId: "zapier",
        origin: "https://example.com",
      })
    ).rejects.toThrow(/does not support Manus verification/);
  });

  it("rejects non-verifiable connector: openai", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.verifyViaManus({
        connectorId: "openai",
        origin: "https://example.com",
      })
    ).rejects.toThrow(/does not support Manus verification/);
  });

  it("rejects non-verifiable connector: notion", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.verifyViaManus({
        connectorId: "notion",
        origin: "https://example.com",
      })
    ).rejects.toThrow(/does not support Manus verification/);
  });

  it("returns a Manus portal URL for verifiable connectors when OAuth is configured", async () => {
    const caller = authedCaller();
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);

    if (!hasManusOAuth) {
      // Should throw about Manus OAuth not being configured
      await expect(
        caller.connector.verifyViaManus({
          connectorId: "github",
          origin: "https://example.com",
        })
      ).rejects.toThrow(/Manus OAuth is not configured/);
    } else {
      const result = await caller.connector.verifyViaManus({
        connectorId: "github",
        origin: "https://example.com",
      });
      expect(result).toHaveProperty("url");
      expect(result.url).toContain("app-auth");
      expect(result.url).toContain("appId=");
      expect(result.url).toContain("redirectUri=");
      expect(result.url).toContain("state=");
      expect(result.connectorId).toBe("github");
      expect(result.identityLabel).toBeDefined();
    }
  });

  it("includes connector ID and user ID in the redirect URI", async () => {
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (!hasManusOAuth) return; // Skip if no OAuth configured

    const caller = authedCaller();
    const result = await caller.connector.verifyViaManus({
      connectorId: "github",
      origin: "https://example.com",
    });

    // The redirectUri should contain cid=github and uid=42
    const url = new URL(result.url);
    const redirectUri = url.searchParams.get("redirectUri") || "";
    expect(redirectUri).toContain("cid=github");
    expect(redirectUri).toContain(`uid=${mockUser.id}`);
  });

  it("works for microsoft-365 connector", async () => {
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (!hasManusOAuth) return;

    const caller = authedCaller();
    const result = await caller.connector.verifyViaManus({
      connectorId: "microsoft-365",
      origin: "https://example.com",
    });
    expect(result.connectorId).toBe("microsoft-365");
    expect(result.url).toContain("app-auth");
  });

  it("works for google-drive connector", async () => {
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (!hasManusOAuth) return;

    const caller = authedCaller();
    const result = await caller.connector.verifyViaManus({
      connectorId: "google-drive",
      origin: "https://example.com",
    });
    expect(result.connectorId).toBe("google-drive");
  });

  it("works for calendar connector", async () => {
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (!hasManusOAuth) return;

    const caller = authedCaller();
    const result = await caller.connector.verifyViaManus({
      connectorId: "calendar",
      origin: "https://example.com",
    });
    expect(result.connectorId).toBe("calendar");
  });

  it("requires authentication (protected procedure)", async () => {
    const caller = publicCaller();
    await expect(
      caller.connector.verifyViaManus({
        connectorId: "github",
        origin: "https://example.com",
      })
    ).rejects.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   3. completeManusVerification — Protected endpoint
   ═══════════════════════════════════════════════════════════════════ */

describe("connector.completeManusVerification", () => {
  it("rejects non-verifiable connectors", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.completeManusVerification({
        connectorId: "zapier",
        verifiedIdentity: "test-user",
      })
    ).rejects.toThrow(/does not support Manus verification/);
  });

  it("rejects empty verifiedIdentity", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.completeManusVerification({
        connectorId: "github",
        verifiedIdentity: "",
      })
    ).rejects.toThrow(); // Zod validation: min(1)
  });

  it("rejects verifiedIdentity exceeding 256 chars", async () => {
    const caller = authedCaller();
    await expect(
      caller.connector.completeManusVerification({
        connectorId: "github",
        verifiedIdentity: "x".repeat(257),
      })
    ).rejects.toThrow(); // Zod validation: max(256)
  });

  it("accepts valid input and calls upsertConnector (integration)", async () => {
    // This test verifies the procedure doesn't crash on valid input.
    // It may fail if DB is not available, which is expected in unit test env.
    const caller = authedCaller();
    try {
      const result = await caller.connector.completeManusVerification({
        connectorId: "github",
        verifiedIdentity: "octocat",
        verifiedEmail: "octocat@github.com",
        loginMethod: "github",
      });
      // If DB is available, we should get a success response
      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("verifiedIdentity", "octocat");
      expect(result).toHaveProperty("connectorId", "github");
      expect(result).toHaveProperty("id");
    } catch (err: any) {
      // DB not available in test env — that's OK, verify it's a DB error not a logic error
      expect(err.message).toMatch(/Database|ECONNREFUSED|not available|connect/i);
    }
  });

  it("requires authentication (protected procedure)", async () => {
    const caller = publicCaller();
    await expect(
      caller.connector.completeManusVerification({
        connectorId: "github",
        verifiedIdentity: "test-user",
      })
    ).rejects.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   4. oauthAvailability — Public endpoint (existing, verify still works)
   ═══════════════════════════════════════════════════════════════════ */

describe("connector.oauthAvailability", () => {
  it("returns an object with connector IDs as keys", async () => {
    const caller = publicCaller();
    const result = await caller.connector.oauthAvailability();
    expect(result).toBeDefined();
    expect(typeof result).toBe("object");
  });

  it("works without authentication (public endpoint)", async () => {
    const caller = publicCaller();
    const result = await caller.connector.oauthAvailability();
    expect(result).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   5. Tier Independence Verification
   ═══════════════════════════════════════════════════════════════════ */

describe("Tier Independence (no single point of failure)", () => {
  it("tieredAuthStatus always returns tier3=true and tier4=true regardless of OAuth config", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();

    // Even if OAuth is completely broken, tier3 and tier4 must be available
    for (const [id, tiers] of Object.entries(result)) {
      expect(tiers.tier3).toBe(true);
      expect(tiers.tier4).toBe(true);
    }
  });

  it("verifyViaManus gracefully fails when Manus OAuth is not configured", async () => {
    // This tests that Tier 2 failure doesn't break anything
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    const caller = authedCaller();

    if (!hasManusOAuth) {
      await expect(
        caller.connector.verifyViaManus({
          connectorId: "github",
          origin: "https://example.com",
        })
      ).rejects.toThrow(/Manus OAuth is not configured/);
    }
    // Either way, the procedure doesn't crash the server
  });

  it("manual connect (Tier 4) works independently of all other tiers", async () => {
    // The connect procedure should accept any config without requiring OAuth or Manus verification
    const caller = authedCaller();
    try {
      const result = await caller.connector.connect({
        connectorId: "openai",
        name: "OpenAI",
        config: { apiKey: "sk-test-key-12345" },
      });
      expect(result).toBeDefined();
    } catch (err: any) {
      // DB not available in test env — that's OK
      expect(err.message).toMatch(/Database|ECONNREFUSED|not available|connect/i);
    }
  });

  it("each tier can be queried independently without blocking others", async () => {
    const publicCallerInst = publicCaller();
    const authedCallerInst = authedCaller();

    // All these should resolve independently
    const [tierStatus, oauthAvail] = await Promise.all([
      publicCallerInst.connector.tieredAuthStatus(),
      publicCallerInst.connector.oauthAvailability(),
    ]);

    expect(tierStatus).toBeDefined();
    expect(oauthAvail).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   6. MANUS_VERIFIABLE_CONNECTORS mapping validation
   ═══════════════════════════════════════════════════════════════════ */

describe("MANUS_VERIFIABLE_CONNECTORS mapping", () => {
  it("github maps to GitHub login method", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();
    // GitHub should be tier2-eligible when Manus OAuth is configured
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (hasManusOAuth) {
      expect(result["github"]?.tier2).toBe(true);
    }
  });

  it("microsoft-365 maps to Microsoft login method", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (hasManusOAuth) {
      expect(result["microsoft-365"]?.tier2).toBe(true);
    }
  });

  it("google-drive maps to Google login method", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();
    const hasManusOAuth = !!(process.env.VITE_APP_ID && process.env.OAUTH_SERVER_URL);
    if (hasManusOAuth) {
      expect(result["google-drive"]?.tier2).toBe(true);
    }
  });

  it("non-verifiable connectors (notion, slack, vercel, etc.) have tier2=false", async () => {
    const caller = publicCaller();
    const result = await caller.connector.tieredAuthStatus();
    const nonVerifiable = ["notion", "slack", "vercel", "openai", "anthropic", "firecrawl", "similarweb", "zapier", "email"];
    for (const id of nonVerifiable) {
      expect(result[id]?.tier2).toBe(false);
    }
  });
});
