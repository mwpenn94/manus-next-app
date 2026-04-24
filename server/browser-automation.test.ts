/**
 * Browser Automation — tRPC Procedure Tests
 *
 * Tests the browser router procedures (navigate, click, type, screenshot,
 * scroll, evaluate, close, sessions, consoleLogs, networkRequests, etc.)
 * using the appRouter.createCaller pattern.
 *
 * Since Playwright requires a real Chromium binary, these tests mock the
 * browserAutomation module to verify procedure wiring, input validation,
 * and return-shape contracts.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock the browserAutomation module ──
const mockResult = {
  success: true,
  url: "https://example.com",
  title: "Example Domain",
  screenshotUrl: "https://cdn.example.com/screenshot.png",
  content: null,
  error: null,
};

vi.mock("./browserAutomation", () => ({
  navigate: vi.fn().mockResolvedValue(mockResult),
  click: vi.fn().mockResolvedValue(mockResult),
  type: vi.fn().mockResolvedValue(mockResult),
  screenshot: vi.fn().mockResolvedValue(mockResult),
  scroll: vi.fn().mockResolvedValue(mockResult),
  evaluate: vi.fn().mockResolvedValue({ ...mockResult, content: "42" }),
  waitForSelector: vi.fn().mockResolvedValue(mockResult),
  pressKey: vi.fn().mockResolvedValue(mockResult),
  getInteractiveElements: vi.fn().mockResolvedValue({
    success: true,
    elements: [
      { tag: "button", text: "Submit", selector: "button.submit", type: "submit" },
    ],
  }),
  getConsoleLogs: vi.fn().mockReturnValue([
    { type: "log", text: "Hello", timestamp: Date.now() },
  ]),
  getNetworkRequests: vi.fn().mockReturnValue([
    { url: "https://example.com", method: "GET", status: 200, timestamp: Date.now() },
  ]),
  listSessions: vi.fn().mockReturnValue([
    {
      id: "sess-1",
      url: "https://example.com",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      screenshotCount: 1,
      consoleLogCount: 1,
      networkRequestCount: 1,
    },
  ]),
  closeSession: vi.fn().mockResolvedValue(undefined),
  goBack: vi.fn().mockResolvedValue(mockResult),
  goForward: vi.fn().mockResolvedValue(mockResult),
  reload: vi.fn().mockResolvedValue(mockResult),
  getAccessibilityTree: vi.fn().mockResolvedValue({
    success: true,
    content: "document\n  heading 'Example Domain'",
  }),
}));

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

describe("browser router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    caller = appRouter.createCaller(createAuthContext());
    vi.clearAllMocks();
  });

  // ── Auth Guard ──
  describe("auth guard", () => {
    it("rejects unauthenticated users on navigate", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(
        unauth.browser.navigate({ url: "https://example.com" })
      ).rejects.toThrow();
    });

    it("rejects unauthenticated users on screenshot", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.browser.screenshot({})).rejects.toThrow();
    });

    it("rejects unauthenticated users on sessions query", async () => {
      const unauth = appRouter.createCaller(createUnauthContext());
      await expect(unauth.browser.sessions()).rejects.toThrow();
    });
  });

  // ── Navigate ──
  describe("navigate", () => {
    it("navigates to a URL and returns result", async () => {
      const result = await caller.browser.navigate({ url: "https://example.com" });
      expect(result.success).toBe(true);
      expect(result.url).toBe("https://example.com");
      expect(result.title).toBe("Example Domain");
      expect(result.screenshotUrl).toBeTruthy();
    });

    it("accepts optional sessionId", async () => {
      const result = await caller.browser.navigate({
        sessionId: "sess-1",
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL", async () => {
      await expect(
        caller.browser.navigate({ url: "not-a-url" })
      ).rejects.toThrow();
    });
  });

  // ── Click ──
  describe("click", () => {
    it("clicks an element by selector", async () => {
      const result = await caller.browser.click({ selector: "button.submit" });
      expect(result.success).toBe(true);
    });

    it("requires selector", async () => {
      await expect(
        // @ts-expect-error — testing missing required field
        caller.browser.click({})
      ).rejects.toThrow();
    });
  });

  // ── Type ──
  describe("type", () => {
    it("types text into a selector", async () => {
      const result = await caller.browser.type({
        selector: "input#email",
        text: "test@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("supports clear option", async () => {
      const result = await caller.browser.type({
        selector: "input#email",
        text: "new@example.com",
        clear: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Screenshot ──
  describe("screenshot", () => {
    it("takes a screenshot", async () => {
      const result = await caller.browser.screenshot({});
      expect(result.success).toBe(true);
      expect(result.screenshotUrl).toBeTruthy();
    });

    it("supports fullPage option", async () => {
      const result = await caller.browser.screenshot({ fullPage: true });
      expect(result.success).toBe(true);
    });
  });

  // ── Scroll ──
  describe("scroll", () => {
    it("scrolls down", async () => {
      const result = await caller.browser.scroll({ direction: "down", amount: 500 });
      expect(result.success).toBe(true);
    });

    it("scrolls up", async () => {
      const result = await caller.browser.scroll({ direction: "up" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid direction", async () => {
      await expect(
        // @ts-expect-error — testing invalid enum
        caller.browser.scroll({ direction: "diagonal" })
      ).rejects.toThrow();
    });
  });

  // ── Evaluate ──
  describe("evaluate", () => {
    it("evaluates JavaScript and returns result", async () => {
      const result = await caller.browser.evaluate({ code: "1 + 1" });
      expect(result.success).toBe(true);
      expect(result.content).toBe("42");
    });
  });

  // ── Wait for Selector ──
  describe("waitForSelector", () => {
    it("waits for a selector to appear", async () => {
      const result = await caller.browser.waitForSelector({
        selector: "h1",
        state: "visible",
        timeout: 5000,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Press Key ──
  describe("pressKey", () => {
    it("presses a keyboard key", async () => {
      const result = await caller.browser.pressKey({ key: "Enter" });
      expect(result.success).toBe(true);
    });
  });

  // ── Get Elements ──
  describe("getElements", () => {
    it("returns interactive elements", async () => {
      const result = await caller.browser.getElements({});
      expect(result.success).toBe(true);
      expect(result.elements).toBeDefined();
      expect(Array.isArray(result.elements)).toBe(true);
    });
  });

  // ── Console Logs ──
  describe("consoleLogs", () => {
    it("returns console logs for a session", async () => {
      const logs = await caller.browser.consoleLogs({ sessionId: "sess-1" });
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]).toHaveProperty("type");
      expect(logs[0]).toHaveProperty("text");
      expect(logs[0]).toHaveProperty("timestamp");
    });
  });

  // ── Network Requests ──
  describe("networkRequests", () => {
    it("returns network requests for a session", async () => {
      const reqs = await caller.browser.networkRequests({ sessionId: "sess-1" });
      expect(Array.isArray(reqs)).toBe(true);
      expect(reqs[0]).toHaveProperty("url");
      expect(reqs[0]).toHaveProperty("method");
      expect(reqs[0]).toHaveProperty("status");
    });
  });

  // ── Sessions ──
  describe("sessions", () => {
    it("lists active sessions", async () => {
      const sessions = await caller.browser.sessions();
      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions[0]).toHaveProperty("id");
      expect(sessions[0]).toHaveProperty("url");
    });
  });

  // ── Close ──
  describe("close", () => {
    it("closes a session", async () => {
      const result = await caller.browser.close({ sessionId: "sess-1" });
      expect(result.success).toBe(true);
    });
  });

  // ── Navigation History ──
  describe("goBack", () => {
    it("goes back in browser history", async () => {
      const result = await caller.browser.goBack({});
      expect(result.success).toBe(true);
    });
  });

  describe("goForward", () => {
    it("goes forward in browser history", async () => {
      const result = await caller.browser.goForward({});
      expect(result.success).toBe(true);
    });
  });

  describe("reload", () => {
    it("reloads the current page", async () => {
      const result = await caller.browser.reload({});
      expect(result.success).toBe(true);
    });
  });

  // ── Accessibility Tree ──
  describe("accessibilityTree", () => {
    it("returns accessibility tree", async () => {
      const result = await caller.browser.accessibilityTree({});
      expect(result.success).toBe(true);
      expect(result.content).toContain("heading");
    });
  });
});
