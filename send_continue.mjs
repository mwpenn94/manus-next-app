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
  
  // Navigate to the task page
  await targetPage.goto("https://manusnext-mlromfub.manus.space/task/TbtSq2GlWtJb", { waitUntil: "networkidle", timeout: 30000 });
  await targetPage.waitForTimeout(3000);
  
  // Find the message input
  const inputSelector = 'textarea[placeholder*="Send a message"], input[placeholder*="Send a message"], [contenteditable="true"]';
  const input = await targetPage.$(inputSelector);
  
  if (!input) {
    console.log("ERROR: Could not find message input. Trying alternative selectors...");
    // Try clicking the input area first
    const inputArea = await targetPage.$('textarea, [data-testid="message-input"], .message-input');
    if (inputArea) {
      console.log("Found alternative input");
      await inputArea.click();
      await targetPage.waitForTimeout(500);
    } else {
      console.log("No input found at all. Taking screenshot...");
      await targetPage.screenshot({ path: "/home/ubuntu/no_input.png" });
      await browser.close();
      return;
    }
  }
  
  // Type the continuation message
  const message = "Continue from Demonstration 7/10. You stopped at 6/10 (Wide Research). Complete the remaining demonstrations: 7/10 Code Execution, 8/10 Email/Communication, 9/10 App/File Creation, 10/10 Voice/Multimodal. Do NOT repeat demonstrations 1-6. Start immediately with Demonstration 7/10.";
  
  if (input) {
    await input.click();
    await targetPage.waitForTimeout(300);
    await input.fill(message);
    await targetPage.waitForTimeout(500);
  } else {
    // Type using keyboard
    await targetPage.keyboard.type(message, { delay: 10 });
    await targetPage.waitForTimeout(500);
  }
  
  // Take screenshot before sending
  await targetPage.screenshot({ path: "/home/ubuntu/before_send.png" });
  console.log("Screenshot saved: before_send.png");
  
  // Find and click the send button
  const sendButton = await targetPage.$('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]');
  
  if (sendButton) {
    console.log("Found send button, clicking...");
    await sendButton.click();
  } else {
    // Try pressing Enter
    console.log("No send button found, pressing Enter...");
    await targetPage.keyboard.press("Enter");
  }
  
  await targetPage.waitForTimeout(3000);
  
  // Take screenshot after sending
  await targetPage.screenshot({ path: "/home/ubuntu/after_send.png" });
  console.log("Screenshot saved: after_send.png");
  
  // Verify the message was sent
  const pageText = await targetPage.evaluate(() => document.body.innerText);
  const hasContinue = pageText.includes("Continue from Demonstration 7/10") || pageText.includes("7/10");
  console.log(`Continuation message visible: ${hasContinue}`);
  
  await browser.close();
}

main().catch(console.error);
