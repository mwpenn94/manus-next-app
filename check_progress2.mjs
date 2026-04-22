import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  
  let targetPage = null;
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      if (page.url().includes("manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb")) {
        targetPage = page;
        break;
      }
    }
    if (targetPage) break;
  }
  
  if (!targetPage) {
    console.log("Task page not found in open tabs, navigating...");
    for (const ctx of contexts) {
      for (const page of ctx.pages()) {
        if (page.url().includes("manusnext-mlromfub.manus.space")) {
          targetPage = page;
          break;
        }
      }
      if (targetPage) break;
    }
    if (targetPage) {
      await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
    }
  }
  
  if (!targetPage) {
    console.log("ERROR: No page found");
    await browser.close();
    return;
  }
  
  console.log(`Page URL: ${targetPage.url()}`);
  
  // Scroll to bottom to see latest content
  await targetPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await targetPage.waitForTimeout(2000);
  
  // Take screenshot
  await targetPage.screenshot({ path: "/home/ubuntu/progress_check2.png", fullPage: false });
  console.log("Screenshot saved");
  
  // Check for approve buttons and step progress
  const info = await targetPage.evaluate(() => {
    const allText = document.body.innerText;
    
    // Find all "Demonstration X/10" mentions
    const demoMatches = allText.match(/Demonstration\s+\d+\/10/g) || [];
    
    // Find step progress
    const stepMatch = allText.match(/(\d+)\s+steps?\s+completed/);
    
    // Find any "Approve" text
    const hasApprove = allText.includes("Approve");
    
    // Check if task is still running or completed
    const isRunning = allText.includes("Running") || allText.includes("writing") || allText.includes("is thinking");
    const isComplete = allText.includes("completed") && !allText.includes("steps completed");
    
    // Get last 500 chars of visible text
    const lastChars = allText.slice(-500);
    
    return {
      demonstrations: [...new Set(demoMatches)],
      stepsCompleted: stepMatch ? stepMatch[0] : null,
      hasApprove,
      isRunning,
      isComplete,
      lastContent: lastChars,
    };
  });
  
  console.log("\n=== Progress Report ===");
  console.log("Demonstrations:", info.demonstrations.join(", "));
  console.log("Steps completed:", info.stepsCompleted);
  console.log("Has Approve button:", info.hasApprove);
  console.log("Is Running:", info.isRunning);
  console.log("Is Complete:", info.isComplete);
  console.log("\nLast content:", info.lastContent.slice(0, 300));
  
  // Click Approve buttons if found
  if (info.hasApprove) {
    console.log("\nLooking for Approve buttons...");
    const buttons = await targetPage.$$("button");
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => "");
      if (text.includes("Approve")) {
        console.log(`Clicking Approve button: "${text}"`);
        await btn.click();
        await targetPage.waitForTimeout(2000);
        console.log("Clicked!");
      }
    }
  }
  
  await browser.close();
}

main().catch(console.error);
