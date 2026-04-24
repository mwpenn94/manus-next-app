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
import type { Browser, BrowserContext, Page } from "playwright";

// ── Types ──
export interface BrowserSession {
  id: string;
  browser: Browser;
  context: BrowserContext;
  page: Page;
  createdAt: number;
  lastActivityAt: number;
  consoleLogs: Array<{ type: string; text: string; timestamp: number }>;
  networkRequests: Array<{ url: string; method: string; status?: number; timestamp: number }>;
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

  // Launch new browser
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
    ],
  });

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

  // Capture network requests
  page.on("request", (req) => {
    session.networkRequests.push({
      url: req.url(),
      method: req.method(),
      timestamp: Date.now(),
    });
    if (session.networkRequests.length > MAX_NETWORK_REQUESTS) {
      session.networkRequests.shift();
    }
  });

  page.on("response", (resp) => {
    const entry = session.networkRequests.find(
      (r) => r.url === resp.url() && !r.status
    );
    if (entry) entry.status = resp.status();
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
