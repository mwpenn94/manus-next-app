import { chromium } from "playwright";
import { writeFileSync } from "fs";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  
  let targetPage = null;
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      if (page.url().includes("manusnext-mlromfub.manus.space")) {
        targetPage = page;
        break;
      }
    }
    if (targetPage) break;
  }
  
  if (!targetPage) {
    console.log("ERROR: No page found");
    await browser.close();
    return;
  }
  
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(5000);
  
  // Find the scrollable chat container
  const chatSelector = '[class*="overflow-y-auto"]';
  
  // Scroll to the very top of the chat
  await targetPage.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollTop = 0;
  }, chatSelector);
  await targetPage.waitForTimeout(1000);
  
  // Take a series of screenshots scrolling through the entire chat
  const scrollHeight = await targetPage.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.scrollHeight : 0;
  }, chatSelector);
  
  const viewportHeight = await targetPage.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.clientHeight : 0;
  }, chatSelector);
  
  console.log(`Chat scroll height: ${scrollHeight}, viewport: ${viewportHeight}`);
  
  const numScreenshots = Math.ceil(scrollHeight / (viewportHeight * 0.8));
  console.log(`Taking ${numScreenshots} screenshots...`);
  
  for (let i = 0; i < numScreenshots; i++) {
    const scrollPos = Math.min(i * viewportHeight * 0.8, scrollHeight - viewportHeight);
    await targetPage.evaluate((args) => {
      const el = document.querySelector(args.sel);
      if (el) el.scrollTop = args.pos;
    }, { sel: chatSelector, pos: scrollPos });
    await targetPage.waitForTimeout(500);
    await targetPage.screenshot({ path: `/home/ubuntu/evidence_${String(i + 1).padStart(2, '0')}.png` });
    console.log(`  Screenshot ${i + 1}/${numScreenshots} at scroll ${scrollPos}`);
  }
  
  console.log("\nAll evidence screenshots captured!");
  
  await browser.close();
}

main().catch(console.error);
