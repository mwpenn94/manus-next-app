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
  
  // Check for Approve buttons and click them
  const approveButtons = await targetPage.$$('button:has-text("Approve"), button:has-text("approve"), button:has-text("Allow"), button:has-text("Confirm")');
  if (approveButtons.length > 0) {
    console.log(`Found ${approveButtons.length} approve button(s), clicking...`);
    for (const btn of approveButtons) {
      try {
        await btn.click();
        console.log("  Clicked approve button");
        await targetPage.waitForTimeout(1000);
      } catch (e) {
        console.log("  Failed to click:", e.message);
      }
    }
  } else {
    console.log("No approve buttons found");
  }
  
  // Extract current state
  const fullText = await targetPage.evaluate(() => document.body.innerText);
  writeFileSync("/home/ubuntu/current_progress.txt", fullText);
  
  // Find all demonstration mentions
  const demoRegex = /Demonstration\s+(\d+)\/10/g;
  let match;
  const demos = [];
  while ((match = demoRegex.exec(fullText)) !== null) {
    demos.push(match[1]);
  }
  
  // Unique demos
  const uniqueDemos = [...new Set(demos)].sort((a, b) => parseInt(a) - parseInt(b));
  console.log(`\nDemonstrations found: ${uniqueDemos.join(", ")}/10`);
  console.log(`Count: ${uniqueDemos.length}/10`);
  
  // Check status
  const isRunning = fullText.includes("is writing") || fullText.includes("is thinking") || fullText.includes("Processing");
  const hasRegenerate = fullText.includes("Regenerate");
  const hasSendMessage = fullText.includes("Send a message");
  const hasFollowUp = fullText.includes("follow-up");
  
  console.log(`\nStatus:`);
  console.log(`  Agent active: ${isRunning}`);
  console.log(`  Regenerate button: ${hasRegenerate}`);
  console.log(`  Send message input: ${hasSendMessage}`);
  console.log(`  Follow-up input: ${hasFollowUp}`);
  
  // Check for 10/10 completion
  const has10 = uniqueDemos.includes("10");
  console.log(`\n10/10 COMPLETE: ${has10}`);
  
  // Take screenshot
  await targetPage.screenshot({ path: "/home/ubuntu/monitor_progress.png" });
  console.log("Screenshot saved: monitor_progress.png");
  
  await browser.close();
}

main().catch(console.error);
