/**
 * Browser Automation Engine — Playwright-based
 *
 * Provides a persistent browser session manager that the agent can use
 * for real web browsing, interaction, and screenshot capture.
 * Deeply aligned with Manus's browser automation capabilities.
 *
 * Features:
 * - Persistent browser sessions (reuse across tool calls)
 * - Real Chromium navigation with full JS rendering
 * - Screenshot capture → S3 upload → artifact URL
 * - Click, type, scroll, evaluate, and other interactions
 * - Console log capture for debugging
 * - Network request monitoring
 * - CDP protocol access for advanced automation
 *
 * @module browserAutomation
 */
import type { Browser, BrowserContext, Page, CDPSession } from "playwright";
import { execSync } from "child_process";
import { existsSync } from "fs";

// ── Chromium Binary Resolution ──
/**
 * Resolve the Chromium executable path with fallbacks.
 * Priority: 1) Playwright cache, 2) System chromium, 3) System google-chrome
 */
function resolveChromiumPath(): string | undefined {
  // Check common system paths
  const systemPaths = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
  ];
  for (const p of systemPaths) {
    if (existsSync(p)) return p;
  }
  // Try `which chromium`
  try {
    const result = execSync("which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome 2>/dev/null", { timeout: 3000 }).toString().trim();
    if (result && existsSync(result)) return result;
  } catch {}
  return undefined;
}

// ── Device User-Agent Presets ──
export const DEVICE_USER_AGENTS: Record<string, string> = {
  "iphone-se": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "iphone-14": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "iphone-14-pro-max": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "ipad-mini": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "ipad-pro": "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "pixel-7": "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "samsung-s23": "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "desktop-hd": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "desktop-4k": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// ── Types ──
export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  cdpSession?: CDPSession;
  createdAt: number;
  lastActivityAt: number;
  consoleLogs: Array<{ type: string; text: string; timestamp: number }>;
  networkRequests: Array<{ url: string; method: string; status?: number; timestamp: number; responseSize?: number; duration?: number }>;
  interceptedRoutes: string[];
  screenshotCount: number;
}

export interface BrowserActionResult {
  success: boolean;
  url: string;
  title: string;
  screenshotUrl?: string;
  content?: string;
  consoleLogs?: Array<{ type: string; text: string }>;
  error?: string;
}

// ── Session Manager ──
const sessions = new Map<string, BrowserSession>();
const SESSION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes idle timeout
const MAX_SESSIONS = 3;
const MAX_CONSOLE_LOGS = 100;
const MAX_NETWORK_REQUESTS = 200;

/** Clean up expired sessions periodically */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;
function startCleanup() {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(async () => {
    const now = Date.now();
    const entries = Array.from(sessions.entries());
    for (const [id, session] of entries) {
      if (now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
        console.log(`[BrowserAutomation] Closing idle session ${id}`);
        await closeSession(id);
      }
    }
  }, 60_000);
}

/** Get or create a browser session */
export async function getOrCreateSession(sessionId?: string): Promise<BrowserSession> {
  // Try to reuse existing session
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.lastActivityAt = Date.now();
    return session;
  }

  // Evict oldest session if at capacity
  if (sessions.size >= MAX_SESSIONS) {
    let oldest: [string, BrowserSession] | null = null;
    const allEntries = Array.from(sessions.entries());
    for (const entry of allEntries) {
      if (!oldest || entry[1].lastActivityAt < oldest[1].lastActivityAt) {
        oldest = entry;
      }
    }
    if (oldest) {
      console.log(`[BrowserAutomation] Evicting oldest session ${oldest[0]}`);
      await closeSession(oldest[0]);
    }
  }

  // Launch new browser with fallback to system Chromium
  const { chromium } = await import("playwright");
  const launchArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
  ];
  let browser: Browser;
  
  // Strategy: try multiple approaches to find a working browser
  const launchStrategies: Array<{ name: string; fn: () => Promise<Browser> }> = [
    {
      name: "Playwright bundled Chromium",
      fn: () => chromium.launch({ headless: true, args: launchArgs }),
    },
    {
      name: "System Chromium (fallback)",
      fn: async () => {
        const systemChromium = resolveChromiumPath();
        if (!systemChromium) throw new Error("No system Chromium found");
        console.log(`[BrowserAutomation] Using system Chromium: ${systemChromium}`);
        return chromium.launch({ headless: true, executablePath: systemChromium, args: launchArgs });
      },
    },
    {
      name: "Auto-install Playwright Chromium",
      fn: async () => {
        console.log("[BrowserAutomation] Attempting to auto-install Playwright Chromium...");
        try {
          execSync("npx playwright install chromium 2>&1", { timeout: 120000, cwd: process.cwd() });
          console.log("[BrowserAutomation] Playwright Chromium installed successfully");
        } catch (installErr: any) {
          // Try with --with-deps for Linux environments
          try {
            execSync("npx playwright install --with-deps chromium 2>&1", { timeout: 180000, cwd: process.cwd() });
            console.log("[BrowserAutomation] Playwright Chromium installed with deps");
          } catch {
            throw new Error(`Auto-install failed: ${installErr.message}`);
          }
        }
        return chromium.launch({ headless: true, args: launchArgs });
      },
    },
  ];

  let lastError: Error | null = null;
  for (const strategy of launchStrategies) {
    try {
      browser = await strategy.fn();
      console.log(`[BrowserAutomation] Browser launched via: ${strategy.name}`);
      break;
    } catch (err: any) {
      console.warn(`[BrowserAutomation] ${strategy.name} failed: ${err.message}`);
      lastError = err;
    }
  }

  if (!browser!) {
    throw new Error(
      `Browser automation is not available in this environment. ` +
      `All launch strategies failed. Last error: ${lastError?.message || "unknown"}. ` +
      `To fix: run 'npx playwright install chromium' or install system Chromium.`
    );
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ignoreHTTPSErrors: true,
    locale: "en-US",
    timezoneId: "America/Denver",
  });

  const page = await context.newPage();
  const id = sessionId || `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = Date.now();

  const session: BrowserSession = {
    id,
    browser,
    context,
    page,
    createdAt: now,
    lastActivityAt: now,
    consoleLogs: [],
    networkRequests: [],
    interceptedRoutes: [],
    screenshotCount: 0,
  };

  // Capture console logs
  page.on("console", (msg) => {
    session.consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
    });
    if (session.consoleLogs.length > MAX_CONSOLE_LOGS) {
      session.consoleLogs.shift();
    }
  });

  // Capture network requests with timing
  const requestTimings = new Map<string, number>();
  page.on("request", (req) => {
    const reqId = `${req.method()}-${req.url()}-${Date.now()}`;
    requestTimings.set(req.url(), Date.now());
    session.networkRequests.push({
      url: req.url(),
      method: req.method(),
      timestamp: Date.now(),
    });
    if (session.networkRequests.length > MAX_NETWORK_REQUESTS) {
      session.networkRequests.shift();
    }
  });

  page.on("response", async (resp) => {
    const entry = session.networkRequests.find(
      (r) => r.url === resp.url() && !r.status
    );
    if (entry) {
      entry.status = resp.status();
      const startTime = requestTimings.get(resp.url());
      if (startTime) entry.duration = Date.now() - startTime;
      try {
        const body = await resp.body();
        entry.responseSize = body.length;
      } catch {}
    }
  });

  sessions.set(id, session);
  startCleanup();
  console.log(`[BrowserAutomation] Created session ${id}`);
  return session;
}

/** Close a specific session */
export async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    await session.context.close();
    await session.browser.close();
  } catch (err) {
    console.error(`[BrowserAutomation] Error closing session ${sessionId}:`, err);
  }
  sessions.delete(sessionId);
}

/** Close all sessions */
export async function closeAllSessions(): Promise<void> {
  const allKeys = Array.from(sessions.keys());
  for (const id of allKeys) {
    await closeSession(id);
  }
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/** Get session info without the browser objects */
export function getSessionInfo(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  return {
    id: session.id,
    url: session.page.url(),
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
    screenshotCount: session.screenshotCount,
    consoleLogCount: session.consoleLogs.length,
    networkRequestCount: session.networkRequests.length,
  };
}

/** List all active sessions */
export function listSessions() {
  return Array.from(sessions.keys()).map((id) => getSessionInfo(id)).filter(Boolean);
}

// ── Browser Actions ──

/** Take a screenshot and upload to S3 */
async function captureScreenshot(session: BrowserSession, fullPage = false): Promise<string | undefined> {
  try {
    const buffer = await session.page.screenshot({
      type: "png",
      fullPage,
    });
    session.screenshotCount++;

    // Upload to S3
    const { storagePut } = await import("./storage");
    const key = `browser-screenshots/${session.id}/${Date.now()}-${session.screenshotCount}.png`;
    const { url } = await storagePut(key, buffer, "image/png");
    return url;
  } catch (err) {
    console.error("[BrowserAutomation] Screenshot failed:", err);
    return undefined;
  }
}

/** Extract readable text content from the page */
async function extractPageContent(page: Page, maxLength = 4000): Promise<string> {
  try {
    return await page.evaluate((max) => {
      // Try to get main content first
      const main = document.querySelector("main, article, [role='main'], #content, .content");
      const target = main || document.body;
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (["script", "style", "noscript", "svg", "path"].includes(tag)) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden") return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      });
      const texts: string[] = [];
      let totalLen = 0;
      let node: Node | null;
      while ((node = walker.nextNode()) && totalLen < max) {
        const text = (node.textContent || "").trim();
        if (text.length > 1) {
          texts.push(text);
          totalLen += text.length;
        }
      }
      return texts.join("\n").slice(0, max);
    }, maxLength);
  } catch {
    return "(Could not extract page content)";
  }
}

/** Navigate to a URL */
export async function navigate(
  sessionId: string | undefined,
  url: string,
  options?: { waitUntil?: "load" | "domcontentloaded" | "networkidle"; timeout?: number }
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.goto(url, {
      waitUntil: options?.waitUntil || "domcontentloaded",
      timeout: options?.timeout || 30000,
    });
    // Wait a bit for dynamic content
    await session.page.waitForTimeout(1000);

    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    const content = await extractPageContent(session.page);

    session.lastActivityAt = Date.now();
    return {
      success: true,
      url: session.page.url(),
      title,
      screenshotUrl,
      content,
    };
  } catch (err: any) {
    const screenshotUrl = await captureScreenshot(session);
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      screenshotUrl,
      error: err.message,
    };
  }
}

/** Click on an element */
export async function click(
  sessionId: string | undefined,
  selector: string,
  options?: { button?: "left" | "right" | "middle"; clickCount?: number; timeout?: number }
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.click(selector, {
      button: options?.button || "left",
      clickCount: options?.clickCount || 1,
      timeout: options?.timeout || 10000,
    });
    await session.page.waitForTimeout(500);

    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    const content = await extractPageContent(session.page);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl, content };
  } catch (err: any) {
    const screenshotUrl = await captureScreenshot(session);
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      screenshotUrl,
      error: `Click failed on "${selector}": ${err.message}`,
    };
  }
}

/** Type text into an element */
export async function type(
  sessionId: string | undefined,
  selector: string,
  text: string,
  options?: { delay?: number; clear?: boolean; pressEnter?: boolean; timeout?: number }
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    if (options?.clear) {
      await session.page.fill(selector, "");
    }
    await session.page.type(selector, text, {
      delay: options?.delay || 50,
    });
    if (options?.pressEnter) {
      await session.page.press(selector, "Enter");
    }
    await session.page.waitForTimeout(300);

    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    const screenshotUrl = await captureScreenshot(session);
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      screenshotUrl,
      error: `Type failed on "${selector}": ${err.message}`,
    };
  }
}

/** Scroll the page */
export async function scroll(
  sessionId: string | undefined,
  direction: "up" | "down" | "left" | "right",
  amount?: number
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    const px = amount || 500;
    const scrollMap = {
      up: [0, -px],
      down: [0, px],
      left: [-px, 0],
      right: [px, 0],
    };
    const [x, y] = scrollMap[direction];
    await session.page.evaluate(([sx, sy]) => window.scrollBy(sx, sy), [x, y]);
    await session.page.waitForTimeout(300);

    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Scroll failed: ${err.message}`,
    };
  }
}

/** Take a screenshot without any other action */
export async function screenshot(
  sessionId: string | undefined,
  options?: { fullPage?: boolean; selector?: string }
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    let buffer: Buffer;
    if (options?.selector) {
      const element = await session.page.$(options.selector);
      if (!element) throw new Error(`Element not found: ${options.selector}`);
      buffer = await element.screenshot({ type: "png" }) as Buffer;
    } else {
      buffer = await session.page.screenshot({
        type: "png",
        fullPage: options?.fullPage || false,
      }) as Buffer;
    }
    session.screenshotCount++;

    const { storagePut } = await import("./storage");
    const key = `browser-screenshots/${session.id}/${Date.now()}-${session.screenshotCount}.png`;
    const { url: screenshotUrl } = await storagePut(key, buffer, "image/png");

    const title = await session.page.title();
    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Screenshot failed: ${err.message}`,
    };
  }
}

/** Evaluate JavaScript in the page context */
export async function evaluate(
  sessionId: string | undefined,
  code: string
): Promise<BrowserActionResult & { evalResult?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    const result = await session.page.evaluate(code);
    const serialized = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return {
      success: true,
      url: session.page.url(),
      title,
      screenshotUrl,
      evalResult: serialized?.slice(0, 5000),
    };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Evaluate failed: ${err.message}`,
    };
  }
}

/** Wait for a selector to appear */
export async function waitForSelector(
  sessionId: string | undefined,
  selector: string,
  options?: { state?: "attached" | "detached" | "visible" | "hidden"; timeout?: number }
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.waitForSelector(selector, {
      state: options?.state || "visible",
      timeout: options?.timeout || 10000,
    });
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    const screenshotUrl = await captureScreenshot(session);
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      screenshotUrl,
      error: `Wait for "${selector}" failed: ${err.message}`,
    };
  }
}

/** Press a keyboard key */
export async function pressKey(
  sessionId: string | undefined,
  key: string
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.keyboard.press(key);
    await session.page.waitForTimeout(300);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Key press "${key}" failed: ${err.message}`,
    };
  }
}

/** Select an option from a dropdown */
export async function selectOption(
  sessionId: string | undefined,
  selector: string,
  value: string
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.selectOption(selector, value);
    await session.page.waitForTimeout(300);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);

    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Select option failed on "${selector}": ${err.message}`,
    };
  }
}

/** Get page accessibility tree (for understanding page structure) */
export async function getAccessibilityTree(
  sessionId: string | undefined
): Promise<{ success: boolean; tree?: string; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    // Use evaluate to get a simplified accessibility-like tree
    const tree = await session.page.evaluate(() => {
      function buildTree(el: Element, depth: number): any {
        if (depth > 4) return null;
        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute("role") || "";
        const text = el.textContent?.trim().slice(0, 80) || "";
        const children = Array.from(el.children).map(c => buildTree(c, depth + 1)).filter(Boolean);
        return { tag, role, text: children.length ? "" : text, children: children.length ? children : undefined };
      }
      return buildTree(document.body, 0);
    });
    const treeStr = JSON.stringify(tree, null, 2).slice(0, 8000);
    session.lastActivityAt = Date.now();
    return { success: true, tree: treeStr };
  } catch (err: any) {
    return { success: false, error: `Accessibility tree failed: ${err.message}` };
  }
}

/** Get console logs from the session */
export function getConsoleLogs(sessionId: string): Array<{ type: string; text: string; timestamp: number }> {
  const session = sessions.get(sessionId);
  return session?.consoleLogs || [];
}

/** Get network requests from the session */
export function getNetworkRequests(sessionId: string): Array<{ url: string; method: string; status?: number; timestamp: number }> {
  const session = sessions.get(sessionId);
  return session?.networkRequests || [];
}

/** Get the current page URL */
export function getCurrentUrl(sessionId: string): string | null {
  const session = sessions.get(sessionId);
  return session?.page.url() || null;
}

/** Go back in browser history */
export async function goBack(sessionId: string | undefined): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.goBack({ waitUntil: "domcontentloaded", timeout: 15000 });
    await session.page.waitForTimeout(500);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return { success: false, url: session.page.url(), title: "(error)", error: `Go back failed: ${err.message}` };
  }
}

/** Go forward in browser history */
export async function goForward(sessionId: string | undefined): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.goForward({ waitUntil: "domcontentloaded", timeout: 15000 });
    await session.page.waitForTimeout(500);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return { success: false, url: session.page.url(), title: "(error)", error: `Go forward failed: ${err.message}` };
  }
}

/** Reload the current page */
export async function reload(sessionId: string | undefined): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
    await session.page.waitForTimeout(500);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return { success: false, url: session.page.url(), title: "(error)", error: `Reload failed: ${err.message}` };
  }
}

/** Upload a file to a file input element */
export async function uploadFile(
  sessionId: string | undefined,
  selector: string,
  filePath: string
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    const input = await session.page.$(selector);
    if (!input) throw new Error(`File input not found: ${selector}`);
    await input.setInputFiles(filePath);
    await session.page.waitForTimeout(500);
    const title = await session.page.title();
    const screenshotUrl = await captureScreenshot(session);
    session.lastActivityAt = Date.now();
    return { success: true, url: session.page.url(), title, screenshotUrl };
  } catch (err: any) {
    return { success: false, url: session.page.url(), title: "(error)", error: `File upload failed: ${err.message}` };
  }
}

/** Get all interactive elements on the page (for agent decision-making) */
export async function getInteractiveElements(
  sessionId: string | undefined
): Promise<{ success: boolean; elements?: Array<{ tag: string; text: string; selector: string; type?: string; href?: string }>; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    const elements = await session.page.evaluate(() => {
      const interactiveSelectors = "a, button, input, select, textarea, [role='button'], [role='link'], [role='tab'], [onclick], [tabindex]";
      const els = Array.from(document.querySelectorAll(interactiveSelectors));
      return els.slice(0, 100).map((el, i) => {
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || "").trim().slice(0, 100);
        const type = el.getAttribute("type") || undefined;
        const href = el.getAttribute("href") || undefined;
        const id = el.id ? `#${el.id}` : "";
        const cls = el.className && typeof el.className === "string" ? `.${el.className.split(" ").filter(Boolean)[0] || ""}` : "";
        const nthType = `:nth-of-type(${Array.from(el.parentElement?.querySelectorAll(tag) || []).indexOf(el) + 1})`;
        const selector = id || `${tag}${cls}${nthType}`;
        return { tag, text, selector, type, href };
      });
    });
    session.lastActivityAt = Date.now();
    return { success: true, elements };
  } catch (err: any) {
    return { success: false, error: `Get interactive elements failed: ${err.message}` };
  }
}

/** Set the browser viewport size and optionally switch user-agent for device emulation */
export async function setViewport(
  sessionId: string | undefined,
  width: number,
  height: number,
  deviceName?: string
): Promise<BrowserActionResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.setViewportSize({ width, height });
    // Switch user-agent if a device preset is specified
    if (deviceName && DEVICE_USER_AGENTS[deviceName]) {
      await session.context.setExtraHTTPHeaders({});
      // Create a new page with the correct UA for the device
      const ua = DEVICE_USER_AGENTS[deviceName];
      await session.page.evaluate((userAgent) => {
        Object.defineProperty(navigator, 'userAgent', { get: () => userAgent, configurable: true });
      }, ua);
    }
    const screenshotUrl = await captureScreenshot(session);
    session.lastActivityAt = Date.now();
    return {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      screenshotUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      url: session.page.url(),
      title: await session.page.title().catch(() => "(error)"),
      error: `Set viewport failed: ${err.message}`,
    };
  }
}

/** Run a QA test suite server-side and return results */
export interface QAStep {
  action: "navigate" | "click" | "type" | "screenshot" | "assert" | "wait" | "scroll" | "evaluate" | "pressKey" | "setViewport";
  selector?: string;
  value?: string;
  description: string;
}

export interface QAStepResult {
  action: string;
  description: string;
  status: "passed" | "failed" | "skipped";
  duration: number;
  error?: string;
  screenshotUrl?: string;
}

export async function runQATestSuite(
  baseUrl: string,
  steps: QAStep[]
): Promise<{ results: QAStepResult[]; summary: { total: number; passed: number; failed: number; skipped: number; duration: number } }> {
  const results: QAStepResult[] = [];
  let sessionId: string | undefined;
  let hasFailed = false;
  const suiteStart = Date.now();

  for (const step of steps) {
    if (hasFailed) {
      results.push({
        action: step.action,
        description: step.description,
        status: "skipped",
        duration: 0,
      });
      continue;
    }

    const stepStart = Date.now();
    try {
      let result: BrowserActionResult & { evalResult?: string };

      switch (step.action) {
        case "navigate": {
          const url = step.value?.startsWith("http") ? step.value : `${baseUrl}${step.value || "/"}`;
          result = await navigate(sessionId, url);
          if (!sessionId) {
            // Capture the session ID from the first navigation
            const sessions = listSessions();
            if (sessions.length > 0) {
              sessionId = sessions[sessions.length - 1]?.id ?? sessionId;
            }
          }
          break;
        }
        case "click":
          result = await click(sessionId, step.selector || "body");
          break;
        case "type":
          result = await type(sessionId, step.selector || "input", step.value || "");
          break;
        case "screenshot":
          result = await screenshot(sessionId);
          break;
        case "assert": {
          const session = await getOrCreateSession(sessionId);
          const found = await session.page.$(step.selector || "body");
          result = {
            success: !!found,
            url: session.page.url(),
            title: await session.page.title(),
            error: found ? undefined : `Element not found: ${step.selector}`,
          };
          if (found) {
            const screenshotUrl = await captureScreenshot(session);
            result.screenshotUrl = screenshotUrl;
          }
          break;
        }
        case "wait":
          result = await waitForSelector(sessionId, step.selector || "body", { timeout: 5000 });
          break;
        case "scroll":
          result = await scroll(sessionId, (step.value as "up" | "down") || "down");
          break;
        case "evaluate":
          result = await evaluate(sessionId, step.value || "document.title");
          break;
        case "pressKey":
          result = await pressKey(sessionId, step.value || "Enter");
          break;
        case "setViewport": {
          const [w, h] = (step.value || "375x812").split("x").map(Number);
          result = await setViewport(sessionId, w || 375, h || 812);
          break;
        }
        default:
          result = { success: false, url: "", title: "", error: `Unknown action: ${step.action}` };
      }

      const duration = Date.now() - stepStart;
      if (result.success) {
        results.push({
          action: step.action,
          description: step.description,
          status: "passed",
          duration,
          screenshotUrl: result.screenshotUrl || undefined,
        });
      } else {
        hasFailed = true;
        results.push({
          action: step.action,
          description: step.description,
          status: "failed",
          duration,
          error: result.error || "Action failed",
          screenshotUrl: result.screenshotUrl || undefined,
        });
      }
    } catch (err: any) {
      hasFailed = true;
      results.push({
        action: step.action,
        description: step.description,
        status: "failed",
        duration: Date.now() - stepStart,
        error: err.message,
      });
    }
  }

  const summary = {
    total: results.length,
    passed: results.filter(r => r.status === "passed").length,
    failed: results.filter(r => r.status === "failed").length,
    skipped: results.filter(r => r.status === "skipped").length,
    duration: Date.now() - suiteStart,
  };

  // Clean up the session after the test suite
  if (sessionId) {
    try { await closeSession(sessionId); } catch {}
  }

  return { results, summary };
}

/** Predefined mobile viewport presets */
export const VIEWPORT_PRESETS = {
  "iphone-se": { width: 375, height: 667 },
  "iphone-14": { width: 390, height: 844 },
  "iphone-14-pro-max": { width: 430, height: 932 },
  "ipad-mini": { width: 768, height: 1024 },
  "ipad-pro": { width: 1024, height: 1366 },
  "pixel-7": { width: 412, height: 915 },
  "samsung-s23": { width: 360, height: 780 },
  "desktop-hd": { width: 1920, height: 1080 },
  "desktop-4k": { width: 3840, height: 2160 },
} as const;


// ── CDP Session Management ──

/** Get or create a CDP session for advanced protocol access */
export async function getCDPSession(sessionId: string | undefined): Promise<{ success: boolean; cdpSession?: CDPSession; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    if (!session.cdpSession) {
      session.cdpSession = await session.context.newCDPSession(session.page);
    }
    session.lastActivityAt = Date.now();
    return { success: true, cdpSession: session.cdpSession };
  } catch (err: any) {
    return { success: false, error: `CDP session failed: ${err.message}` };
  }
}

/** Performance metrics via CDP — captures Core Web Vitals (LCP, CLS, FID) and other metrics */
export interface PerformanceMetrics {
  lcp?: number;
  cls?: number;
  fid?: number;
  fcp?: number;
  ttfb?: number;
  domContentLoaded?: number;
  loadComplete?: number;
  jsHeapUsedSize?: number;
  jsHeapTotalSize?: number;
  layoutCount?: number;
  recalcStyleCount?: number;
  scriptDuration?: number;
  taskDuration?: number;
}

export async function getPerformanceMetrics(sessionId: string | undefined): Promise<{ success: boolean; metrics?: PerformanceMetrics; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    // Use CDP Performance domain
    const cdp = session.cdpSession || await session.context.newCDPSession(session.page);
    if (!session.cdpSession) session.cdpSession = cdp;

    await cdp.send("Performance.enable");
    const { metrics: rawMetrics } = await cdp.send("Performance.getMetrics");

    const metricsMap = new Map<string, number>();
    for (const m of rawMetrics) {
      metricsMap.set(m.name, m.value);
    }

    // Get Web Vitals from the page via PerformanceObserver
    const webVitals = await session.page.evaluate(() => {
      const result: any = {};
      // LCP
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      if (lcpEntries.length > 0) result.lcp = (lcpEntries[lcpEntries.length - 1] as any).startTime;
      // FCP
      const fcpEntries = performance.getEntriesByType("paint");
      const fcp = fcpEntries.find((e: any) => e.name === "first-contentful-paint");
      if (fcp) result.fcp = fcp.startTime;
      // Navigation timing
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        result.ttfb = nav.responseStart - nav.requestStart;
        result.domContentLoaded = nav.domContentLoadedEventEnd - nav.startTime;
        result.loadComplete = nav.loadEventEnd - nav.startTime;
      }
      // CLS (approximate from layout-shift entries)
      const clsEntries = performance.getEntriesByType("layout-shift");
      if (clsEntries.length > 0) {
        result.cls = clsEntries.reduce((sum: number, e: any) => sum + (e.hadRecentInput ? 0 : e.value), 0);
      }
      return result;
    });

    const metrics: PerformanceMetrics = {
      ...webVitals,
      jsHeapUsedSize: metricsMap.get("JSHeapUsedSize"),
      jsHeapTotalSize: metricsMap.get("JSHeapTotalSize"),
      layoutCount: metricsMap.get("LayoutCount"),
      recalcStyleCount: metricsMap.get("RecalcStyleCount"),
      scriptDuration: metricsMap.get("ScriptDuration"),
      taskDuration: metricsMap.get("TaskDuration"),
    };

    session.lastActivityAt = Date.now();
    return { success: true, metrics };
  } catch (err: any) {
    return { success: false, error: `Performance metrics failed: ${err.message}` };
  }
}

// ── Accessibility Audit ──

export interface A11yViolation {
  rule: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  selector: string;
  html: string;
}

export interface A11yAuditResult {
  success: boolean;
  violations?: A11yViolation[];
  passes?: number;
  incomplete?: number;
  score?: number;
  error?: string;
}

/** Run a comprehensive accessibility audit using WCAG rules (DOM-based, no axe-core dependency) */
export async function runAccessibilityAudit(sessionId: string | undefined): Promise<A11yAuditResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    const violations = await session.page.evaluate(() => {
      const issues: Array<{ rule: string; impact: string; description: string; selector: string; html: string }> = [];

      // Rule 1: Images without alt text
      document.querySelectorAll("img").forEach((img) => {
        if (!img.hasAttribute("alt")) {
          issues.push({
            rule: "image-alt",
            impact: "critical",
            description: "Images must have alternative text",
            selector: img.id ? `#${img.id}` : `img[src="${img.src?.slice(0, 80)}"]`,
            html: img.outerHTML.slice(0, 200),
          });
        }
      });

      // Rule 2: Form inputs without labels
      document.querySelectorAll("input, select, textarea").forEach((input) => {
        const el = input as HTMLInputElement;
        if (el.type === "hidden" || el.type === "submit" || el.type === "button") return;
        const hasLabel = el.id && document.querySelector(`label[for="${el.id}"]`);
        const hasAriaLabel = el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
        const wrappedInLabel = el.closest("label");
        if (!hasLabel && !hasAriaLabel && !wrappedInLabel) {
          issues.push({
            rule: "label",
            impact: "critical",
            description: "Form elements must have labels",
            selector: el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}[name="${el.name || ""}"]`,
            html: el.outerHTML.slice(0, 200),
          });
        }
      });

      // Rule 3: Missing document language
      if (!document.documentElement.hasAttribute("lang")) {
        issues.push({
          rule: "html-has-lang",
          impact: "serious",
          description: "html element must have a lang attribute",
          selector: "html",
          html: "<html>",
        });
      }

      // Rule 4: Empty buttons/links
      document.querySelectorAll("button, a").forEach((el) => {
        const text = (el.textContent || "").trim();
        const ariaLabel = el.getAttribute("aria-label") || "";
        const title = el.getAttribute("title") || "";
        const hasImg = el.querySelector("img[alt], svg[aria-label]");
        if (!text && !ariaLabel && !title && !hasImg) {
          issues.push({
            rule: el.tagName === "A" ? "link-name" : "button-name",
            impact: "critical",
            description: `${el.tagName === "A" ? "Links" : "Buttons"} must have discernible text`,
            selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
            html: el.outerHTML.slice(0, 200),
          });
        }
      });

      // Rule 5: Color contrast (approximate check for text on backgrounds)
      document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th").forEach((el) => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bg = style.backgroundColor;
        if (color === bg && color !== "rgba(0, 0, 0, 0)") {
          issues.push({
            rule: "color-contrast",
            impact: "serious",
            description: "Elements must have sufficient color contrast",
            selector: el.id ? `#${el.id}` : el.tagName.toLowerCase(),
            html: el.outerHTML.slice(0, 200),
          });
        }
      });

      // Rule 6: Missing heading structure
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let lastLevel = 0;
      headings.forEach((h) => {
        const level = parseInt(h.tagName[1]);
        if (level > lastLevel + 1 && lastLevel > 0) {
          issues.push({
            rule: "heading-order",
            impact: "moderate",
            description: `Heading levels should only increase by one (found h${level} after h${lastLevel})`,
            selector: h.id ? `#${h.id}` : h.tagName.toLowerCase(),
            html: h.outerHTML.slice(0, 200),
          });
        }
        lastLevel = level;
      });

      // Rule 7: Missing skip navigation
      const firstLink = document.querySelector("a");
      if (firstLink && !firstLink.getAttribute("href")?.startsWith("#")) {
        const hasSkipLink = Array.from(document.querySelectorAll("a")).some(
          (a) => a.getAttribute("href")?.startsWith("#") && a.textContent?.toLowerCase().includes("skip")
        );
        if (!hasSkipLink && document.querySelectorAll("nav, [role='navigation']").length > 0) {
          issues.push({
            rule: "skip-link",
            impact: "moderate",
            description: "Page should have a skip navigation link",
            selector: "body",
            html: "<body>",
          });
        }
      }

      // Rule 8: ARIA roles validation
      document.querySelectorAll("[role]").forEach((el) => {
        const role = el.getAttribute("role") || "";
        const validRoles = ["alert", "alertdialog", "application", "article", "banner", "button", "cell", "checkbox", "columnheader", "combobox", "complementary", "contentinfo", "definition", "dialog", "directory", "document", "feed", "figure", "form", "grid", "gridcell", "group", "heading", "img", "link", "list", "listbox", "listitem", "log", "main", "marquee", "math", "menu", "menubar", "menuitem", "menuitemcheckbox", "menuitemradio", "navigation", "none", "note", "option", "presentation", "progressbar", "radio", "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar", "search", "searchbox", "separator", "slider", "spinbutton", "status", "switch", "tab", "table", "tablist", "tabpanel", "term", "textbox", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem"];
        if (!validRoles.includes(role)) {
          issues.push({
            rule: "aria-roles",
            impact: "serious",
            description: `Invalid ARIA role: ${role}`,
            selector: el.id ? `#${el.id}` : `[role="${role}"]`,
            html: el.outerHTML.slice(0, 200),
          });
        }
      });

      return issues;
    });

    const typedViolations = violations.map(v => ({
      ...v,
      impact: v.impact as "critical" | "serious" | "moderate" | "minor",
    }));

    const totalChecks = typedViolations.length + 50; // approximate total checks
    const score = Math.max(0, Math.round((1 - typedViolations.length / totalChecks) * 100));

    session.lastActivityAt = Date.now();
    return {
      success: true,
      violations: typedViolations,
      passes: totalChecks - typedViolations.length,
      incomplete: 0,
      score,
    };
  } catch (err: any) {
    return { success: false, error: `Accessibility audit failed: ${err.message}` };
  }
}

// ── Screenshot Diff / Visual Regression ──

export interface ScreenshotDiffResult {
  success: boolean;
  baselineUrl?: string;
  currentUrl?: string;
  diffUrl?: string;
  diffPixels?: number;
  totalPixels?: number;
  diffPercentage?: number;
  matched: boolean;
  error?: string;
}

/** Compare two screenshots pixel-by-pixel for visual regression detection */
export async function screenshotDiff(
  sessionId: string | undefined,
  baselineUrl: string,
  threshold: number = 0.1
): Promise<ScreenshotDiffResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    // Take current screenshot
    const currentBuffer = await session.page.screenshot({ type: "png", fullPage: false });
    session.screenshotCount++;

    // Fetch baseline image
    const baselineResp = await fetch(baselineUrl);
    if (!baselineResp.ok) {
      return { success: false, matched: false, error: `Failed to fetch baseline: ${baselineResp.status}` };
    }
    const baselineBuffer = Buffer.from(await baselineResp.arrayBuffer());

    // Use sharp or raw pixel comparison
    // We'll use a simple approach: compare raw PNG buffers
    // For production, pixelmatch would be better, but we can do byte-level comparison
    const { PNG } = await import("pngjs");

    const baselinePng = PNG.sync.read(baselineBuffer);
    const currentPng = PNG.sync.read(currentBuffer);

    // Resize check
    if (baselinePng.width !== currentPng.width || baselinePng.height !== currentPng.height) {
      // Upload both for comparison
      const { storagePut } = await import("./storage");
      const currentKey = `browser-screenshots/${session.id}/diff-current-${Date.now()}.png`;
      const { url: currentUrl } = await storagePut(currentKey, currentBuffer, "image/png");
      return {
        success: true,
        baselineUrl,
        currentUrl,
        matched: false,
        diffPercentage: 100,
        error: `Size mismatch: baseline ${baselinePng.width}x${baselinePng.height} vs current ${currentPng.width}x${currentPng.height}`,
      };
    }

    // Pixel-by-pixel comparison
    const totalPixels = baselinePng.width * baselinePng.height;
    let diffPixels = 0;
    const diffData = new Uint8Array(baselinePng.data.length);

    for (let i = 0; i < baselinePng.data.length; i += 4) {
      const rDiff = Math.abs(baselinePng.data[i] - currentPng.data[i]);
      const gDiff = Math.abs(baselinePng.data[i + 1] - currentPng.data[i + 1]);
      const bDiff = Math.abs(baselinePng.data[i + 2] - currentPng.data[i + 2]);
      const maxDiff = Math.max(rDiff, gDiff, bDiff);

      if (maxDiff > threshold * 255) {
        diffPixels++;
        // Mark diff pixels in red
        diffData[i] = 255;     // R
        diffData[i + 1] = 0;   // G
        diffData[i + 2] = 0;   // B
        diffData[i + 3] = 255; // A
      } else {
        // Dim the matching pixels
        diffData[i] = Math.floor(currentPng.data[i] * 0.3);
        diffData[i + 1] = Math.floor(currentPng.data[i + 1] * 0.3);
        diffData[i + 2] = Math.floor(currentPng.data[i + 2] * 0.3);
        diffData[i + 3] = 255;
      }
    }

    const diffPercentage = (diffPixels / totalPixels) * 100;
    const matched = diffPercentage < 1; // Less than 1% diff = matched

    // Create diff image
    const diffPng = new PNG({ width: baselinePng.width, height: baselinePng.height });
    diffPng.data = Buffer.from(diffData);
    const diffBuffer = PNG.sync.write(diffPng);

    // Upload all images to S3
    const { storagePut } = await import("./storage");
    const ts = Date.now();
    const currentKey = `browser-screenshots/${session.id}/diff-current-${ts}.png`;
    const diffKey = `browser-screenshots/${session.id}/diff-overlay-${ts}.png`;
    const { url: currentUrl } = await storagePut(currentKey, currentBuffer, "image/png");
    const { url: diffUrl } = await storagePut(diffKey, diffBuffer, "image/png");

    session.lastActivityAt = Date.now();
    return {
      success: true,
      baselineUrl,
      currentUrl,
      diffUrl,
      diffPixels,
      totalPixels,
      diffPercentage: Math.round(diffPercentage * 100) / 100,
      matched,
    };
  } catch (err: any) {
    return { success: false, matched: false, error: `Screenshot diff failed: ${err.message}` };
  }
}

// ── Network Interception ──

/** Add a network route interception rule */
export async function interceptRoute(
  sessionId: string | undefined,
  urlPattern: string,
  action: "block" | "modify" | "log",
  modifyOptions?: { status?: number; body?: string; contentType?: string }
): Promise<{ success: boolean; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.route(urlPattern, async (route) => {
      if (action === "block") {
        await route.abort("blockedbyclient");
      } else if (action === "modify" && modifyOptions) {
        await route.fulfill({
          status: modifyOptions.status || 200,
          body: modifyOptions.body || "",
          contentType: modifyOptions.contentType || "text/plain",
        });
      } else {
        // Log and continue
        console.log(`[NetworkIntercept] ${route.request().method()} ${route.request().url()}`);
        await route.continue();
      }
    });
    session.interceptedRoutes.push(urlPattern);
    session.lastActivityAt = Date.now();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Route interception failed: ${err.message}` };
  }
}

/** Remove all network interception rules */
export async function clearInterceptions(sessionId: string | undefined): Promise<{ success: boolean; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    await session.page.unrouteAll({ behavior: "wait" });
    session.interceptedRoutes = [];
    session.lastActivityAt = Date.now();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Clear interceptions failed: ${err.message}` };
  }
}

// ── Code Coverage via CDP ──

/** Start collecting JavaScript and CSS code coverage */
export async function startCoverage(sessionId: string | undefined): Promise<{ success: boolean; error?: string }> {
  const session = await getOrCreateSession(sessionId);
  try {
    const cdp = session.cdpSession || await session.context.newCDPSession(session.page);
    if (!session.cdpSession) session.cdpSession = cdp;
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.startPreciseCoverage", { callCount: true, detailed: true });
    await cdp.send("CSS.enable");
    await cdp.send("CSS.startRuleUsageTracking");
    session.lastActivityAt = Date.now();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Start coverage failed: ${err.message}` };
  }
}

export interface CoverageResult {
  success: boolean;
  jsCoverage?: Array<{ url: string; usedBytes: number; totalBytes: number; usedPercent: number }>;
  cssCoverage?: Array<{ url: string; usedBytes: number; totalBytes: number; usedPercent: number }>;
  error?: string;
}

/** Stop coverage collection and return results */
export async function stopCoverage(sessionId: string | undefined): Promise<CoverageResult> {
  const session = await getOrCreateSession(sessionId);
  try {
    const cdp = session.cdpSession;
    if (!cdp) return { success: false, error: "No CDP session — call startCoverage first" };

    // JS coverage
    const { result: jsResult } = await cdp.send("Profiler.takePreciseCoverage");
    await cdp.send("Profiler.stopPreciseCoverage");
    await cdp.send("Profiler.disable");

    const jsCoverage = jsResult.slice(0, 50).map((script: any) => {
      const totalBytes = script.functions.reduce((sum: number, fn: any) => {
        return sum + fn.ranges.reduce((s: number, r: any) => s + (r.endOffset - r.startOffset), 0);
      }, 0);
      const usedBytes = script.functions.reduce((sum: number, fn: any) => {
        return sum + fn.ranges.filter((r: any) => r.count > 0).reduce((s: number, r: any) => s + (r.endOffset - r.startOffset), 0);
      }, 0);
      return {
        url: script.url || "(inline)",
        totalBytes,
        usedBytes,
        usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0,
      };
    });

    // CSS coverage
    const { ruleUsage } = await cdp.send("CSS.stopRuleUsageTracking");
    const cssMap = new Map<string, { used: number; total: number }>();
    for (const rule of ruleUsage) {
      const key = rule.styleSheetId || "(inline)";
      if (!cssMap.has(key)) cssMap.set(key, { used: 0, total: 0 });
      const entry = cssMap.get(key)!;
      entry.total++;
      if (rule.used) entry.used++;
    }
    const cssCoverage = Array.from(cssMap.entries()).slice(0, 50).map(([url, data]) => ({
      url,
      usedBytes: data.used,
      totalBytes: data.total,
      usedPercent: data.total > 0 ? Math.round((data.used / data.total) * 100) : 0,
    }));

    session.lastActivityAt = Date.now();
    return { success: true, jsCoverage, cssCoverage };
  } catch (err: any) {
    return { success: false, error: `Stop coverage failed: ${err.message}` };
  }
}
