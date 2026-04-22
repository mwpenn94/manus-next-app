import { chromium } from "playwright";

async function main() {
  // Connect to the running browser via CDP
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  console.log(`Found ${contexts.length} browser contexts`);
  
  // Find the page with our app
  let targetPage = null;
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      const url = page.url();
      console.log(`  Page: ${url}`);
      if (url.includes("manusnext-mlromfub.manus.space")) {
        targetPage = page;
      }
    }
  }
  
  if (!targetPage) {
    console.log("App page not found, navigating...");
    const ctx = contexts[0] || await browser.newContext();
    targetPage = await ctx.newPage();
    await targetPage.goto("https://manusnext-mlromfub.manus.space", { waitUntil: "networkidle" });
  }
  
  console.log(`Using page: ${targetPage.url()}`);
  
  // Wait for the page to be ready
  await targetPage.waitForTimeout(3000);
  
  // Find and click the textarea
  const textarea = await targetPage.$("textarea");
  if (textarea) {
    console.log("Found textarea, typing prompt...");
    await textarea.click();
    await textarea.fill("What can you do? Demonstrate each capability with a real example. Complete ALL 10 capability groups — 10/10 required.");
    await targetPage.waitForTimeout(500);
    
    // Find and click the submit button (ArrowUp icon button)
    const submitBtn = await targetPage.$('button[title="Submit"]');
    if (submitBtn) {
      console.log("Found submit button, clicking...");
      await submitBtn.click();
    } else {
      // Try pressing Enter
      console.log("Submit button not found, pressing Enter...");
      await textarea.press("Enter");
    }
    
    console.log("Task submitted! Waiting for navigation...");
    await targetPage.waitForTimeout(5000);
    console.log(`Current URL: ${targetPage.url()}`);
  } else {
    console.log("Textarea not found!");
    // Take a screenshot to debug
    await targetPage.screenshot({ path: "/home/ubuntu/submit_debug.png" });
    console.log("Screenshot saved to /home/ubuntu/submit_debug.png");
  }
  
  await browser.close();
}

main().catch(console.error);
