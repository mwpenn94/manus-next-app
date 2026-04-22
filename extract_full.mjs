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
  
  // Navigate to ensure fresh content
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(5000);
  
  // Extract all text content
  const fullText = await targetPage.evaluate(() => document.body.innerText);
  
  // Save to file
  writeFileSync("/home/ubuntu/full_task_text.txt", fullText);
  console.log("Full text saved to /home/ubuntu/full_task_text.txt");
  console.log(`Total length: ${fullText.length} chars`);
  
  // Find all demonstration mentions
  const demoRegex = /Demonstration\s+(\d+)\/10/g;
  let match;
  const demos = [];
  while ((match = demoRegex.exec(fullText)) !== null) {
    demos.push({ num: match[1], index: match.index });
  }
  console.log(`\nFound ${demos.length} demonstration mentions:`);
  demos.forEach(d => {
    const context = fullText.slice(d.index, d.index + 100).replace(/\n/g, ' ');
    console.log(`  ${d.num}/10: ...${context}...`);
  });
  
  // Check for completion indicators
  const has10of10 = fullText.includes("Demonstration 10/10");
  const hasAllDone = fullText.includes("all 10") || fullText.includes("All 10");
  const hasInterrupted = fullText.includes("interrupted");
  
  console.log(`\nDemonstration 10/10 found: ${has10of10}`);
  console.log(`"All 10" found: ${hasAllDone}`);
  console.log(`"Interrupted" found: ${hasInterrupted}`);
  
  // Take screenshots at different scroll positions
  // Top
  await targetPage.evaluate(() => window.scrollTo(0, 0));
  await targetPage.waitForTimeout(500);
  await targetPage.screenshot({ path: "/home/ubuntu/task_top.png" });
  
  // Middle
  const height = await targetPage.evaluate(() => document.body.scrollHeight);
  await targetPage.evaluate((h) => window.scrollTo(0, h / 2), height);
  await targetPage.waitForTimeout(500);
  await targetPage.screenshot({ path: "/home/ubuntu/task_middle.png" });
  
  // Bottom
  await targetPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await targetPage.waitForTimeout(500);
  await targetPage.screenshot({ path: "/home/ubuntu/task_bottom.png" });
  
  console.log("\nScreenshots saved: task_top.png, task_middle.png, task_bottom.png");
  
  await browser.close();
}

main().catch(console.error);
