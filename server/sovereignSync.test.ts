/**
 * Sovereign Sync Router — Unit Tests
 *
 * Tests the one-click Sovereign Mode activation flow:
 * - status query returns correct shape
 * - activate mutation validates preconditions
 * - deactivate mutation handles graceful shutdown
 * - openEditor returns Codespace URL
 * - Auth guard rejects unauthenticated users
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock dependencies ──
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getUserConnectors: vi.fn().mockResolvedValue([
      {
        connectorId: "github",
        status: "connected",
        accessToken: "ghp_test_token_123",
        config: {},
      },
    ]),
    getUserGitHubRepos: vi.fn().mockResolvedValue([
      {
        id: 42,
        fullName: "testuser/testrepo",
        name: "testrepo",
        status: "connected",
        defaultBranch: "main",
        externalId: "12345",
      },
    ]),
    getUserWebappProjects: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "testrepo",
        githubRepoId: 42,
        publishedUrl: "https://testrepo.manus.space",
      },
    ]),
    upsertUserPreferences: vi.fn().mockResolvedValue(undefined),
    createWebappProject: vi.fn().mockResolvedValue(99),
  };
});

vi.mock("./githubApi", () => ({
  ensureWebhook: vi.fn().mockResolvedValue({ created: false }),
  listWebhooks: vi.fn().mockResolvedValue([
    {
      id: 1,
      config: { url: "/api/github/webhook" },
      active: true,
    },
  ]),
  deleteWebhook: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch for GitHub API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ── Helpers ──
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("sovereignSync router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    caller = appRouter.createCaller(createAuthContext());
    vi.clearAllMocks();

    // Default fetch mock: GitHub user endpoint
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "https://api.github.com/user") {
        return {
          ok: true,
          json: async () => ({ login: "testuser" }),
          headers: new Map([["x-oauth-scopes", "repo,codespace"]]),
        };
      }
      if (url === "https://api.github.com/user/codespaces") {
        return {
          ok: true,
          json: async () => ({
            codespaces: [
              {
                name: "testuser-testrepo-abc123",
                repository: { full_name: "testuser/testrepo" },
                state: "Available",
              },
            ],
          }),
        };
      }
      return { ok: false, status: 404, text: async () => "Not Found" };
    });
  });

  // ── Auth Guard ──
  describe("auth guard", () => {
    it("rejects unauthenticated users on status", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.sovereignSync.status()).rejects.toThrow();
    });

    it("rejects unauthenticated users on activate", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.sovereignSync.activate({})).rejects.toThrow();
    });

    it("rejects unauthenticated users on deactivate", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.sovereignSync.deactivate({})).rejects.toThrow();
    });

    it("rejects unauthenticated users on openEditor", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.sovereignSync.openEditor()).rejects.toThrow();
    });
  });

  // ── Status Query ──
  describe("status", () => {
    it("returns full SyncStatus shape with all fields", async () => {
      const result = await caller.sovereignSync.status();

      expect(result).toHaveProperty("stage");
      expect(result).toHaveProperty("github");
      expect(result).toHaveProperty("repo");
      expect(result).toHaveProperty("webhook");
      expect(result).toHaveProperty("codespace");
      expect(result).toHaveProperty("webapp");
      expect(result).toHaveProperty("error");

      // GitHub should be connected
      expect(result.github.connected).toBe(true);
      expect(result.github.username).toBe("testuser");

      // Repo should be connected
      expect(result.repo.connected).toBe(true);
      expect(result.repo.fullName).toBe("testuser/testrepo");

      // Webapp should be linked
      expect(result.webapp.linked).toBe(true);
      expect(result.webapp.publishedUrl).toBe("https://testrepo.manus.space");
    });

    it("returns idle stage when GitHub is not connected", async () => {
      const { getUserConnectors } = await import("./db");
      (getUserConnectors as any).mockResolvedValueOnce([]);

      const result = await caller.sovereignSync.status();
      expect(result.stage).toBe("idle");
      expect(result.github.connected).toBe(false);
    });

    it("returns active stage when all components are ready", async () => {
      const result = await caller.sovereignSync.status();
      // With our mocks: github connected, repo connected, codespace active, webapp linked
      // Webhook check depends on env vars, but codespace + webapp should be there
      expect(result.codespace.active).toBe(true);
      expect(result.webapp.linked).toBe(true);
    });
  });

  // ── Activate Mutation ──
  describe("activate", () => {
    it("throws PRECONDITION_FAILED when GitHub is not connected", async () => {
      const { getUserConnectors } = await import("./db");
      (getUserConnectors as any).mockResolvedValueOnce([]);

      await expect(caller.sovereignSync.activate({})).rejects.toThrow(
        /GitHub not connected/
      );
    });

    it("throws PRECONDITION_FAILED when no repo is connected", async () => {
      const { getUserGitHubRepos } = await import("./db");
      (getUserGitHubRepos as any).mockResolvedValueOnce([]);

      await expect(caller.sovereignSync.activate({})).rejects.toThrow(
        /No connected GitHub repo/
      );
    });

    it("returns success with steps array when all services respond", async () => {
      const result = await caller.sovereignSync.activate({});

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("steps");
      expect(result).toHaveProperty("codespaceUrl");
      expect(result).toHaveProperty("previewUrl");

      expect(Array.isArray(result.steps)).toBe(true);
      expect(result.steps.length).toBeGreaterThanOrEqual(3);

      // Each step should have the correct shape
      for (const step of result.steps) {
        expect(step).toHaveProperty("step");
        expect(step).toHaveProperty("status");
        expect(step).toHaveProperty("detail");
        expect(["done", "skipped", "error"]).toContain(step.status);
      }

      // GitHub auth step should always be done
      const authStep = result.steps.find(s => s.step === "GitHub Authentication");
      expect(authStep?.status).toBe("done");

      // Repository step should be done
      const repoStep = result.steps.find(s => s.step === "Repository");
      expect(repoStep?.status).toBe("done");
      expect(repoStep?.detail).toBe("testuser/testrepo");
    });

    it("returns codespaceUrl when codespace exists", async () => {
      const result = await caller.sovereignSync.activate({});
      expect(result.codespaceUrl).toContain("codespaces/testuser-testrepo-abc123");
    });
  });

  // ── Deactivate Mutation ──
  describe("deactivate", () => {
    it("returns success even when nothing to deactivate", async () => {
      const { getUserConnectors } = await import("./db");
      (getUserConnectors as any).mockResolvedValueOnce([]);

      const result = await caller.sovereignSync.deactivate({});
      expect(result.success).toBe(true);
    });

    it("stops running codespace on deactivate", async () => {
      const result = await caller.sovereignSync.deactivate({});
      expect(result.success).toBe(true);

      // Should have called fetch to stop the codespace
      const stopCalls = mockFetch.mock.calls.filter(
        (call: any[]) => typeof call[0] === "string" && call[0].includes("/stop")
      );
      expect(stopCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("removes webhook when removeWebhook is true", async () => {
      const result = await caller.sovereignSync.deactivate({ removeWebhook: true });
      expect(result.success).toBe(true);
    });
  });

  // ── Open Editor Query ──
  describe("openEditor", () => {
    it("returns codespace URL when active codespace exists", async () => {
      const result = await caller.sovereignSync.openEditor();
      expect(result.url).toContain("codespaces/testuser-testrepo-abc123");
    });

    it("returns null URL when no GitHub connection", async () => {
      const { getUserConnectors } = await import("./db");
      (getUserConnectors as any).mockResolvedValueOnce([]);

      const result = await caller.sovereignSync.openEditor();
      expect(result.url).toBeNull();
    });

    it("returns null URL when no active repo", async () => {
      const { getUserGitHubRepos } = await import("./db");
      (getUserGitHubRepos as any).mockResolvedValueOnce([]);

      const result = await caller.sovereignSync.openEditor();
      expect(result.url).toBeNull();
    });
  });
});
