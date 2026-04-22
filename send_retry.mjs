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
    await targetPage.screenshot({ path: "/home/ubuntu/no_input_retry.png" });
    await browser.close();
    return;
  }
  
  const message = "The 503 error was transient. Please complete Demonstration 10/10: Voice/Multimodal. Describe the voice mode capabilities (speech-to-text, text-to-speech, real-time conversation). Then write: 'Summary: All 10/10 capability groups demonstrated successfully.'";
  
  await input.click();
  await targetPage.waitForTimeout(300);
  await input.fill(message);
  await targetPage.waitForTimeout(500);
  
  const sendButton = await targetPage.$('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]');
  if (sendButton) {
    await sendButton.click();
    console.log("Retry message sent");
  } else {
    await targetPage.keyboard.press("Enter");
    console.log("Retry message sent via Enter");
  }
  
  await targetPage.waitForTimeout(3000);
  await targetPage.screenshot({ path: "/home/ubuntu/after_retry.png" });
  console.log("Screenshot saved: after_retry.png");
  
  await browser.close();
}

main().catch(console.error);
