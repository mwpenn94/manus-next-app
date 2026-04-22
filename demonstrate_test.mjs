import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  
  // Find the manus.im auth page or the app page
  let targetPage = null;
  for (const ctx of contexts) {
    for (const page of ctx.pages()) {
      const url = page.url();
      if (url.includes("manus.im/app-auth") || url.includes("manusnext-mlromfub.manus.space")) {
        targetPage = page;
        console.log(`Found target page: ${url}`);
        break;
      }
    }
    if (targetPage) break;
  }
  
  if (!targetPage) {
    console.log("No target page found, creating one...");
    targetPage = await contexts[0].newPage();
  }
  
  // Navigate to the app
  console.log("Navigating to app...");
  await targetPage.goto("https://manusnext-mlromfub.manus.space", { waitUntil: "networkidle", timeout: 30000 });
  console.log(`After navigation: ${targetPage.url()}`);
  
  // Check if we're on the login page
  if (targetPage.url().includes("manus.im")) {
    console.log("On login page - need to authenticate first");
    // Try clicking Continue with Google
    const googleBtn = await targetPage.$('text=Continue with Google');
    if (googleBtn) {
      console.log("Clicking Continue with Google...");
      await googleBtn.click();
      await targetPage.waitForTimeout(10000);
      console.log(`After Google auth: ${targetPage.url()}`);
    } else {
      console.log("Google button not found, taking screenshot...");
      await targetPage.screenshot({ path: "/home/ubuntu/login_debug.png" });
    }
  }
  
  // Check if we made it to the app
  if (targetPage.url().includes("manusnext-mlromfub.manus.space")) {
    console.log("On app page! Looking for textarea...");
    await targetPage.waitForTimeout(3000);
    
    // Find textarea
    const textarea = await targetPage.$("textarea");
    if (textarea) {
      console.log("Found textarea, typing prompt...");
      await textarea.click();
      await textarea.fill("What can you do? Demonstrate each capability with a real example. Complete ALL 10 capability groups — 10/10 required.");
      await targetPage.waitForTimeout(500);
      
      // Press Enter to submit (since Shift+Enter is newline, Enter submits)
      await targetPage.keyboard.press("Enter");
      console.log("Submitted! Waiting for navigation...");
      await targetPage.waitForTimeout(5000);
      console.log(`Task URL: ${targetPage.url()}`);
      
      // Take a screenshot to confirm
      await targetPage.screenshot({ path: "/home/ubuntu/demonstrate_submitted.png" });
      console.log("Screenshot saved");
    } else {
      console.log("No textarea found, taking screenshot...");
      await targetPage.screenshot({ path: "/home/ubuntu/app_debug.png" });
    }
  } else {
    console.log(`Not on app page. Current URL: ${targetPage.url()}`);
    await targetPage.screenshot({ path: "/home/ubuntu/navigate_debug.png" });
  }
  
  await browser.close();
}

main().catch(console.error);
