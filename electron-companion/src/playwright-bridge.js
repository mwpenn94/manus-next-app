/**
 * Playwright Browser Bridge
 *
 * Provides robust browser automation using Playwright as an alternative to raw CDP.
 * Falls back to CDP if Playwright is not available.
 *
 * Capabilities:
 * - Navigate to URLs
 * - Execute JavaScript in page context
 * - Take page screenshots (not just full screen)
 * - Fill forms, click elements by selector
 * - Wait for elements/navigation
 * - Extract text/HTML content
 * - Handle file downloads
 */

let browser = null;
let context = null;
let page = null;

/**
 * Launch or connect to a browser instance.
 * Tries Playwright first, falls back to Puppeteer, then raw CDP.
 */
async function ensureBrowser(options = {}) {
  if (browser && page) {
    try {
      await page.title(); // Check if page is still alive
      return { browser, context, page };
    } catch {
      // Page died, reconnect
      browser = null;
      context = null;
      page = null;
    }
  }

  // Strategy 1: Playwright (preferred)
  try {
    const { chromium } = require("playwright-core");

    if (options.cdpPort) {
      // Connect to existing Chrome with CDP
      browser = await chromium.connectOverCDP(`http://localhost:${options.cdpPort}`);
      context = browser.contexts()[0] || await browser.newContext();
      page = context.pages()[0] || await context.newPage();
    } else if (options.executablePath) {
      // Launch new browser
      browser = await chromium.launch({
        executablePath: options.executablePath,
        headless: false,
        args: ["--remote-debugging-port=9222"],
      });
      context = await browser.newContext();
      page = await context.newPage();
    } else {
      // Try to find Chrome/Chromium
      const paths = getChromePaths();
      for (const p of paths) {
        try {
          browser = await chromium.launch({
            executablePath: p,
            headless: false,
            args: ["--remote-debugging-port=9222"],
          });
          context = await browser.newContext();
          page = await context.newPage();
          break;
        } catch {
          continue;
        }
      }
    }

    if (browser) {
      console.log("[PlaywrightBridge] Connected via Playwright");
      return { browser, context, page };
    }
  } catch (err) {
    console.log("[PlaywrightBridge] Playwright not available:", err.message);
  }

  // Strategy 2: Puppeteer
  try {
    const puppeteer = require("puppeteer-core");
    const port = options.cdpPort || 9222;
    browser = await puppeteer.connect({
      browserURL: `http://localhost:${port}`,
    });
    const pages = await browser.pages();
    page = pages[0] || await browser.newPage();
    console.log("[PlaywrightBridge] Connected via Puppeteer");
    return { browser, context: null, page };
  } catch (err) {
    console.log("[PlaywrightBridge] Puppeteer not available:", err.message);
  }

  throw new Error("No browser automation library available. Install playwright-core or puppeteer-core.");
}

/**
 * Get common Chrome/Chromium executable paths by platform.
 */
function getChromePaths() {
  const platform = process.platform;
  if (platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  } else if (platform === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  } else {
    return [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ];
  }
}

/**
 * Handle browser commands from the WebSocket relay.
 */
async function handleBrowserCommand(msg) {
  switch (msg.type) {
    case "browser_navigate": {
      const { page } = await ensureBrowser(msg.options);
      await page.goto(msg.url, { waitUntil: msg.waitUntil || "domcontentloaded", timeout: msg.timeout || 30000 });
      return { type: "browser_navigate_result", success: true, url: msg.url, title: await page.title() };
    }

    case "browser_screenshot": {
      const { page } = await ensureBrowser(msg.options);
      const buffer = await page.screenshot({
        type: "png",
        fullPage: msg.fullPage || false,
        ...(msg.selector ? { clip: await page.locator(msg.selector).boundingBox() } : {}),
      });
      return { type: "browser_screenshot_result", data: buffer.toString("base64"), format: "png" };
    }

    case "browser_eval": {
      const { page } = await ensureBrowser(msg.options);
      const result = await page.evaluate(msg.expression);
      return { type: "browser_eval_result", value: result };
    }

    case "browser_click": {
      const { page } = await ensureBrowser(msg.options);
      if (msg.selector) {
        await page.click(msg.selector, { timeout: msg.timeout || 5000 });
      } else if (msg.x !== undefined && msg.y !== undefined) {
        await page.mouse.click(msg.x, msg.y);
      }
      return { type: "browser_click_result", success: true };
    }

    case "browser_fill": {
      const { page } = await ensureBrowser(msg.options);
      await page.fill(msg.selector, msg.value, { timeout: msg.timeout || 5000 });
      return { type: "browser_fill_result", success: true };
    }

    case "browser_type": {
      const { page } = await ensureBrowser(msg.options);
      await page.type(msg.selector, msg.text, { delay: msg.delay || 50 });
      return { type: "browser_type_result", success: true };
    }

    case "browser_wait": {
      const { page } = await ensureBrowser(msg.options);
      if (msg.selector) {
        await page.waitForSelector(msg.selector, { timeout: msg.timeout || 10000 });
      } else if (msg.url) {
        await page.waitForURL(msg.url, { timeout: msg.timeout || 10000 });
      } else {
        await page.waitForTimeout(msg.ms || 1000);
      }
      return { type: "browser_wait_result", success: true };
    }

    case "browser_extract": {
      const { page } = await ensureBrowser(msg.options);
      let content;
      if (msg.selector) {
        const el = page.locator(msg.selector);
        content = msg.html ? await el.innerHTML() : await el.textContent();
      } else {
        content = msg.html ? await page.content() : await page.innerText("body");
      }
      return { type: "browser_extract_result", content };
    }

    case "browser_pdf": {
      const { page } = await ensureBrowser(msg.options);
      const buffer = await page.pdf({ format: "A4", printBackground: true });
      return { type: "browser_pdf_result", data: buffer.toString("base64"), format: "pdf" };
    }

    case "browser_close": {
      if (browser) {
        await browser.close();
        browser = null;
        context = null;
        page = null;
      }
      return { type: "browser_close_result", success: true };
    }

    default:
      return { type: "error", error: `Unknown browser command: ${msg.type}` };
  }
}

module.exports = { ensureBrowser, handleBrowserCommand, getChromePaths };
