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
  
  // Navigate to the task page
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(5000);
  
  // Extract full text
  const fullText = await targetPage.evaluate(() => document.body.innerText);
  writeFileSync("/home/ubuntu/final_task_text.txt", fullText);
  console.log(`Full text: ${fullText.length} chars`);
  
  // Find all demonstration mentions
  const demoRegex = /Demonstration\s+(\d+)\/10[:\s]*([\w\s\/&]+)/g;
  let match;
  const demos = [];
  while ((match = demoRegex.exec(fullText)) !== null) {
    demos.push({ num: parseInt(match[1]), title: match[2].trim(), index: match.index });
  }
  
  // Unique demos by number
  const uniqueDemos = new Map();
  demos.forEach(d => {
    if (!uniqueDemos.has(d.num)) uniqueDemos.set(d.num, d);
  });
  
  console.log(`\n=== DEMONSTRATION VERIFICATION ===`);
  console.log(`Total unique demonstrations: ${uniqueDemos.size}/10`);
  for (let i = 1; i <= 10; i++) {
    const demo = uniqueDemos.get(i);
    if (demo) {
      const context = fullText.slice(demo.index, demo.index + 200).replace(/\n/g, ' ').trim();
      console.log(`\n✅ Demo ${i}/10: ${demo.title}`);
      console.log(`   Context: ${context.slice(0, 150)}...`);
    } else {
      console.log(`\n❌ Demo ${i}/10: NOT FOUND`);
    }
  }
  
  // Check completion indicators
  const hasRegenerate = fullText.includes("Regenerate");
  const hasSendMessage = fullText.includes("Send a message");
  const isRunning = fullText.includes("is writing") || fullText.includes("is thinking");
  const hasAllSummary = fullText.includes("all 10") || fullText.includes("All 10");
  
  console.log(`\n=== STATUS ===`);
  console.log(`Regenerate button: ${hasRegenerate}`);
  console.log(`Send message input: ${hasSendMessage}`);
  console.log(`Agent active: ${isRunning}`);
  console.log(`"All 10" summary: ${hasAllSummary}`);
  console.log(`VERDICT: ${uniqueDemos.size === 10 ? '✅ 10/10 COMPLETE' : `❌ ${uniqueDemos.size}/10 INCOMPLETE`}`);
  
  // Scroll through and take screenshots at multiple positions
  // First, scroll to the very top of the chat
  const chatContainer = await targetPage.$('[class*="overflow-y-auto"], [class*="chat"], main');
  
  // Scroll to top
  await targetPage.evaluate(() => {
    const scrollable = document.querySelector('[class*="overflow-y-auto"]') || document.querySelector('main');
    if (scrollable) scrollable.scrollTop = 0;
  });
  await targetPage.waitForTimeout(500);
  await targetPage.screenshot({ path: "/home/ubuntu/verify_top.png" });
  
  // Get scroll height
  const scrollInfo = await targetPage.evaluate(() => {
    const scrollable = document.querySelector('[class*="overflow-y-auto"]') || document.querySelector('main');
    if (!scrollable) return { height: 0, scrollHeight: 0 };
    return { height: scrollable.clientHeight, scrollHeight: scrollable.scrollHeight };
  });
  
  console.log(`\nScroll info: height=${scrollInfo.height}, scrollHeight=${scrollInfo.scrollHeight}`);
  
  // Take screenshots at 25%, 50%, 75%, 100% scroll positions
  const positions = [0.25, 0.5, 0.75, 1.0];
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    await targetPage.evaluate((p) => {
      const scrollable = document.querySelector('[class*="overflow-y-auto"]') || document.querySelector('main');
      if (scrollable) scrollable.scrollTop = scrollable.scrollHeight * p;
    }, pos);
    await targetPage.waitForTimeout(500);
    await targetPage.screenshot({ path: `/home/ubuntu/verify_${Math.round(pos * 100)}.png` });
  }
  
  console.log("\nScreenshots saved: verify_top.png, verify_25.png, verify_50.png, verify_75.png, verify_100.png");
  
  await browser.close();
}

main().catch(console.error);
