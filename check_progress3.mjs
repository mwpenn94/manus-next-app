import { chromium } from "playwright";

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
  
  // Reload the page to get fresh state
  console.log("Reloading page...");
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(5000);
  
  // Scroll to the very bottom of the chat
  for (let i = 0; i < 20; i++) {
    await targetPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await targetPage.waitForTimeout(300);
  }
  
  await targetPage.waitForTimeout(2000);
  
  // Take screenshot
  await targetPage.screenshot({ path: "/home/ubuntu/progress_check3.png", fullPage: false });
  console.log("Screenshot saved");
  
  // Get comprehensive info
  const info = await targetPage.evaluate(() => {
    const allText = document.body.innerText;
    
    const demoMatches = allText.match(/Demonstration\s+\d+\/10/g) || [];
    const stepMatch = allText.match(/(\d+)\s+steps?\s+completed/g);
    const hasApprove = allText.includes("Approve");
    const hasRegenerate = allText.includes("Regenerate");
    const hasSendMessage = allText.includes("Send a message");
    const isRunning = allText.includes("Running");
    
    // Check for "Response interrupted" or completion indicators
    const interrupted = allText.includes("interrupted");
    const completed10 = allText.includes("10/10") || allText.includes("Demonstration 10/10");
    
    return {
      demonstrations: [...new Set(demoMatches)],
      stepsCompleted: stepMatch || [],
      hasApprove,
      hasRegenerate,
      hasSendMessage,
      isRunning,
      interrupted,
      completed10,
      lastContent: allText.slice(-800),
    };
  });
  
  console.log("\n=== Progress Report ===");
  console.log("Demonstrations:", info.demonstrations.join(", "));
  console.log("Steps completed:", info.stepsCompleted.join(", "));
  console.log("Has Approve:", info.hasApprove);
  console.log("Has Regenerate:", info.hasRegenerate);
  console.log("Has Send Message:", info.hasSendMessage);
  console.log("Is Running:", info.isRunning);
  console.log("Interrupted:", info.interrupted);
  console.log("Completed 10/10:", info.completed10);
  console.log("\nLast content:\n", info.lastContent);
  
  // Click Approve buttons if found
  if (info.hasApprove) {
    console.log("\nClicking Approve buttons...");
    const buttons = await targetPage.$$("button");
    for (const btn of buttons) {
      const text = await btn.innerText().catch(() => "");
      if (text.includes("Approve")) {
        console.log(`Clicking: "${text}"`);
        await btn.click();
        await targetPage.waitForTimeout(2000);
      }
    }
  }
  
  await browser.close();
}

main().catch(console.error);
