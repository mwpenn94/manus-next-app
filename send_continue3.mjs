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
  
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(3000);
  
  const input = await targetPage.$('textarea[placeholder*="Send a message"]');
  
  if (!input) {
    console.log("ERROR: Could not find message input");
    await targetPage.screenshot({ path: "/home/ubuntu/no_input3.png" });
    await browser.close();
    return;
  }
  
  const message = "Demo 9 (App/File Creation) is done. Now complete Demonstration 10/10: Voice/Multimodal. Then write a brief summary confirming all 10/10 demonstrations are complete.";
  
  await input.click();
  await targetPage.waitForTimeout(300);
  await input.fill(message);
  await targetPage.waitForTimeout(500);
  
  const sendButton = await targetPage.$('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]');
  if (sendButton) {
    await sendButton.click();
    console.log("Message sent");
  } else {
    await targetPage.keyboard.press("Enter");
    console.log("Message sent via Enter");
  }
  
  await targetPage.waitForTimeout(3000);
  await targetPage.screenshot({ path: "/home/ubuntu/after_send3.png" });
  console.log("Screenshot saved: after_send3.png");
  
  await browser.close();
}

main().catch(console.error);
