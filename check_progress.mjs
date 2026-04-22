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
    console.log("Task page not found, navigating...");
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
    console.log("ERROR: Could not find or navigate to task page");
    await browser.close();
    return;
  }
  
  console.log(`Page URL: ${targetPage.url()}`);
  
  // Take screenshot
  await targetPage.screenshot({ path: "/home/ubuntu/progress_check.png", fullPage: false });
  console.log("Screenshot saved to /home/ubuntu/progress_check.png");
  
  // Check for step progress indicator
  const stepText = await targetPage.evaluate(() => {
    // Look for step progress text like "Step 5/10"
    const allText = document.body.innerText;
    const stepMatch = allText.match(/Step\s+(\d+)\/(\d+)/);
    const progressMatch = allText.match(/Task Progress\s+(\d+)\/(\d+)/);
    const demoMatch = allText.match(/Demonstration\s+(\d+)\/10/g);
    
    return {
      step: stepMatch ? stepMatch[0] : null,
      progress: progressMatch ? progressMatch[0] : null,
      demonstrations: demoMatch || [],
      hasApproveBtn: !!document.querySelector('button:has-text("Approve")') || 
                     allText.includes("Approve"),
    };
  });
  
  console.log("Step:", stepText.step);
  console.log("Progress:", stepText.progress);
  console.log("Demonstrations found:", stepText.demonstrations);
  console.log("Has Approve button:", stepText.hasApproveBtn);
  
  // If there's an Approve button, click it
  if (stepText.hasApproveBtn) {
    console.log("Looking for Approve button to click...");
    const approveBtn = await targetPage.$('button:has-text("Approve")');
    if (approveBtn) {
      console.log("Clicking Approve...");
      await approveBtn.click();
      await targetPage.waitForTimeout(2000);
      console.log("Approved!");
    }
  }
  
  // Get the last visible text to understand where the agent is
  const lastText = await targetPage.evaluate(() => {
    const msgs = document.querySelectorAll('[class*="message"], [class*="chat"], [class*="content"]');
    const texts = [];
    msgs.forEach(m => {
      const t = m.innerText?.trim();
      if (t && t.length > 20) texts.push(t.slice(-200));
    });
    return texts.slice(-3);
  });
  
  console.log("\nLast visible content:");
  lastText.forEach((t, i) => console.log(`  [${i}]: ${t}`));
  
  await browser.close();
}

main().catch(console.error);
