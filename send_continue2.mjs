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
  const input = await targetPage.$('textarea[placeholder*="Send a message"]');
  
  if (!input) {
    console.log("ERROR: Could not find message input");
    await targetPage.screenshot({ path: "/home/ubuntu/no_input2.png" });
    await browser.close();
    return;
  }
  
  // Type the continuation message
  const message = "Your response was interrupted. Demo 7 (Code Execution with factorial) completed successfully. Now write the remaining demonstrations with full narrative:\n\nDemonstration 8/10: Email/Communication — use send_email\nDemonstration 9/10: App/File Creation — use create_file to create a small app\nDemonstration 10/10: Voice/Multimodal — describe voice capabilities\n\nFor each, include the heading 'Demonstration N/10: [Name]' and a brief description. After 10/10, write a summary confirming all 10 capability groups demonstrated.";
  
  await input.click();
  await targetPage.waitForTimeout(300);
  await input.fill(message);
  await targetPage.waitForTimeout(500);
  
  // Take screenshot before sending
  await targetPage.screenshot({ path: "/home/ubuntu/before_send2.png" });
  console.log("Screenshot saved: before_send2.png");
  
  // Find and click the send button
  const sendButton = await targetPage.$('button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]');
  
  if (sendButton) {
    console.log("Found send button, clicking...");
    await sendButton.click();
  } else {
    console.log("No send button found, pressing Enter...");
    await targetPage.keyboard.press("Enter");
  }
  
  await targetPage.waitForTimeout(3000);
  
  // Take screenshot after sending
  await targetPage.screenshot({ path: "/home/ubuntu/after_send2.png" });
  console.log("Screenshot saved: after_send2.png");
  
  // Verify the message was sent
  const pageText = await targetPage.evaluate(() => document.body.innerText);
  const hasContinue = pageText.includes("Demonstration 8/10") || pageText.includes("remaining demonstrations");
  console.log(`Continuation message visible: ${hasContinue}`);
  
  await browser.close();
}

main().catch(console.error);
