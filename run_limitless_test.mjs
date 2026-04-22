/**
 * Live Limitless-Mode Test v2
 * 
 * The ModeToggle (Speed/Quality/Max/Limitless) is inside the TaskView,
 * not on the Home page. So we need to:
 * 1. Navigate to the app
 * 2. Type a prompt on the Home page to create a task
 * 3. Wait for TaskView to load
 * 4. Find the ModeToggle and click "Limitless"
 * 5. Send the complex multi-step prompt
 * 6. Monitor for auto-continuation without "Continue" buttons
 */
import puppeteer from "puppeteer";
import fs from "fs";

const APP_URL = "https://3000-i4m0hisijpvy88uv0iqeg-4d8e8ed2.us2.manus.computer";
const EVIDENCE_DIR = "/home/ubuntu/limitless_evidence";

const COMPLEX_TASK = `Research the current state of autonomous AI agents in 2025-2026. I need you to:

1. Search the web for the latest developments in AI agent frameworks (at least 3 different searches)
2. Generate an image visualizing the AI agent ecosystem landscape
3. Write a comprehensive analysis document (at least 2000 words) covering:
   - Key players and their architectures
   - Technical comparison of approaches
   - Market trends and adoption rates
   - Future predictions for 2027
4. Execute code to create a data visualization comparing the top 5 AI agent platforms by capability score
5. Provide a final executive summary with actionable recommendations

Be thorough and use multiple tools. Do not cut corners or abbreviate.`;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  console.log("[Test] Launching browser...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Step 1: Navigate to the app
    console.log("[Test] Navigating to app...");
    await page.goto(APP_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await sleep(3000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/01_home.png` });
    console.log("[Test] Home page loaded");

    // Step 2: Type a short initial prompt on the Home page to create a task
    console.log("[Test] Creating task from Home page...");
    const textarea = await page.$("textarea");
    if (textarea) {
      await textarea.click();
      await textarea.type("Research AI agents comprehensively", { delay: 10 });
      await sleep(500);
      
      // Press Enter to submit (Home page creates task on Enter)
      await page.keyboard.press("Enter");
      console.log("[Test] Initial task created via Enter");
    } else {
      console.log("[Test] ERROR: No textarea found on Home page");
      await page.screenshot({ path: `${EVIDENCE_DIR}/ERROR_no_textarea.png` });
      await browser.close();
      return;
    }

    // Step 3: Wait for TaskView to load (URL should change to /task/...)
    console.log("[Test] Waiting for TaskView to load...");
    await sleep(5000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/02_taskview_loading.png` });
    
    // Wait for the ModeToggle to appear (it's inside TaskView)
    let modeToggleFound = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text === "Limitless") {
          modeToggleFound = true;
          break;
        }
      }
      if (modeToggleFound) break;
      console.log(`[Test] ModeToggle not found yet, attempt ${attempt + 1}/10...`);
      await sleep(2000);
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/03_taskview_loaded.png` });

    // Step 4: Click the Limitless button in the ModeToggle
    if (modeToggleFound) {
      console.log("[Test] Found ModeToggle, clicking Limitless...");
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text === "Limitless") {
          await btn.click();
          console.log("[Test] Limitless mode selected!");
          break;
        }
      }
    } else {
      console.log("[Test] WARNING: ModeToggle not found. Checking if mode can be set via title attribute...");
      const limitlessBtn = await page.$('[title*="Limitless"]');
      if (limitlessBtn) {
        await limitlessBtn.click();
        console.log("[Test] Limitless mode selected via title attribute!");
        modeToggleFound = true;
      } else {
        console.log("[Test] WARNING: Could not find Limitless button. Proceeding with default mode.");
      }
    }

    await sleep(1000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/04_limitless_selected.png` });

    // Step 5: Wait for the initial task's response to finish (the short prompt we sent)
    console.log("[Test] Waiting for initial response to complete...");
    let initialDone = false;
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      const pageText = await page.evaluate(() => document.body.innerText);
      // Check if the agent finished the initial task
      const isRunning = pageText.includes("Thinking") || 
                        pageText.includes("Processing") ||
                        pageText.includes("Optimizing") ||
                        pageText.includes("Step ");
      if (!isRunning && i > 2) {
        initialDone = true;
        console.log(`[Test] Initial response appears complete after ${(i + 1) * 5}s`);
        break;
      }
      if (i % 6 === 0) {
        console.log(`[Test] Still waiting for initial response... ${(i + 1) * 5}s`);
      }
    }

    await page.screenshot({ path: `${EVIDENCE_DIR}/05_initial_done.png` });

    // Step 6: Now send the COMPLEX task in Limitless mode
    console.log("[Test] Sending complex multi-step task in Limitless mode...");
    
    // Find the chat input textarea
    const chatTextarea = await page.$("textarea");
    if (chatTextarea) {
      await chatTextarea.click();
      // Type the complex task
      await chatTextarea.evaluate((el, text) => {
        el.value = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, COMPLEX_TASK);
      await sleep(500);
      
      // Find and click the submit/send button
      const allBtns = await page.$$("button");
      let submitted = false;
      for (const btn of allBtns) {
        const title = await page.evaluate(el => el.getAttribute("title") || "", btn);
        const ariaLabel = await page.evaluate(el => el.getAttribute("aria-label") || "", btn);
        if (title.includes("Send") || title.includes("Submit") || ariaLabel.includes("Send")) {
          await btn.click();
          submitted = true;
          console.log("[Test] Complex task submitted via Send button");
          break;
        }
      }
      
      if (!submitted) {
        // Try keyboard submit
        await page.keyboard.down("Control");
        await page.keyboard.press("Enter");
        await page.keyboard.up("Control");
        console.log("[Test] Complex task submitted via Ctrl+Enter");
      }
    }

    await sleep(2000);
    await page.screenshot({ path: `${EVIDENCE_DIR}/06_complex_task_sent.png` });

    // Step 7: Monitor execution for up to 10 minutes
    console.log("[Test] === MONITORING LIMITLESS MODE EXECUTION ===");
    const startTime = Date.now();
    const MAX_WAIT = 10 * 60 * 1000; // 10 minutes
    let screenshotCount = 7;
    let lastScreenshotTime = Date.now();
    let continuationEvents = 0;
    let toolCallsSeen = 0;
    let continueButtonFound = false;
    let maxToolsInOneCheck = 0;

    while (Date.now() - startTime < MAX_WAIT) {
      await sleep(15000); // Check every 15 seconds

      // Take periodic screenshots every 45 seconds
      if (Date.now() - lastScreenshotTime > 45000) {
        const filename = `${EVIDENCE_DIR}/${String(screenshotCount).padStart(2, "0")}_progress.png`;
        await page.screenshot({ path: filename });
        screenshotCount++;
        lastScreenshotTime = Date.now();
      }

      const pageText = await page.evaluate(() => document.body.innerText);

      // Count tool calls
      const toolMatches = pageText.match(/Searching|Generating image|Analyzing|Reading|Writing document|Browsing|Researching|Executing|Running code/g);
      if (toolMatches) {
        const newCount = toolMatches.length;
        if (newCount > toolCallsSeen) {
          console.log(`[Test] Tool calls: ${newCount} (+${newCount - toolCallsSeen}) at ${Math.round((Date.now() - startTime) / 1000)}s`);
          toolCallsSeen = newCount;
        }
        if (newCount > maxToolsInOneCheck) maxToolsInOneCheck = newCount;
      }

      // Check for continuation events
      const contMatches = pageText.match(/continuing|continuation|round \d+/gi);
      if (contMatches && contMatches.length > continuationEvents) {
        continuationEvents = contMatches.length;
        console.log(`[Test] CONTINUATION EVENT DETECTED: ${continuationEvents} at ${Math.round((Date.now() - startTime) / 1000)}s`);
      }

      // CRITICAL CHECK: Look for "Continue" button (should NOT exist in Limitless mode)
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text === "Continue" || text === "Continue generating") {
          continueButtonFound = true;
          console.log(`[Test] FAIL: "Continue" button found at ${Math.round((Date.now() - startTime) / 1000)}s!`);
          await page.screenshot({ path: `${EVIDENCE_DIR}/FAIL_continue_button.png` });
        }
      }

      // Check for completion
      const isRunning = pageText.includes("Thinking") || 
                        pageText.includes("Processing") ||
                        pageText.includes("Optimizing recursively") ||
                        pageText.includes("Searching") ||
                        pageText.includes("Generating") ||
                        pageText.match(/Step \d+/);

      // Check for "Regenerate" button (completion indicator)
      let regenerateVisible = false;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text?.includes("Regenerate")) {
          regenerateVisible = true;
          break;
        }
      }

      if (regenerateVisible && !isRunning) {
        console.log(`[Test] Agent completed at ${Math.round((Date.now() - startTime) / 1000)}s`);
        break;
      }

      // Also check for approval gates and auto-approve
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent?.trim(), btn);
        if (text === "Approve" || text === "Allow") {
          console.log(`[Test] Auto-approving action at ${Math.round((Date.now() - startTime) / 1000)}s`);
          await btn.click();
          await sleep(1000);
        }
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (elapsed % 60 < 16) {
        console.log(`[Test] Running... ${elapsed}s elapsed | tools: ${toolCallsSeen} | continuations: ${continuationEvents}`);
      }
    }

    // Final evidence capture
    console.log("[Test] Capturing final evidence...");
    await page.screenshot({ path: `${EVIDENCE_DIR}/${String(screenshotCount).padStart(2, "0")}_final.png` });
    screenshotCount++;

    // Scroll through the chat to capture full response
    const chatContainer = await page.$('[class*="overflow-y-auto"]');
    if (chatContainer) {
      // Scroll to top
      await page.evaluate(el => el.scrollTop = 0, chatContainer);
      await sleep(500);
      await page.screenshot({ path: `${EVIDENCE_DIR}/${String(screenshotCount).padStart(2, "0")}_scroll_top.png` });
      screenshotCount++;

      // Scroll to middle
      await page.evaluate(el => el.scrollTop = el.scrollHeight / 2, chatContainer);
      await sleep(500);
      await page.screenshot({ path: `${EVIDENCE_DIR}/${String(screenshotCount).padStart(2, "0")}_scroll_mid.png` });
      screenshotCount++;

      // Scroll to bottom
      await page.evaluate(el => el.scrollTop = el.scrollHeight, chatContainer);
      await sleep(500);
      await page.screenshot({ path: `${EVIDENCE_DIR}/${String(screenshotCount).padStart(2, "0")}_scroll_bottom.png` });
      screenshotCount++;
    }

    // Extract full text
    const fullText = await page.evaluate(() => document.body.innerText);
    fs.writeFileSync(`${EVIDENCE_DIR}/full_response_text.txt`, fullText);

    // Generate summary
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const summary = {
      mode: "limitless",
      mode_toggle_found: modeToggleFound,
      task_prompt: COMPLEX_TASK.slice(0, 100) + "...",
      elapsed_seconds: elapsed,
      tool_calls_observed: toolCallsSeen,
      continuation_events_detected: continuationEvents,
      continue_button_found: continueButtonFound,
      screenshots_captured: screenshotCount,
      verdict: continueButtonFound 
        ? "FAIL — Continue button appeared, breaking unlimited flow"
        : toolCallsSeen > 3 
          ? "PASS — Agent ran autonomously without Continue prompts"
          : "INCONCLUSIVE — Not enough tool calls observed to verify",
    };

    fs.writeFileSync(`${EVIDENCE_DIR}/test_summary.json`, JSON.stringify(summary, null, 2));
    console.log("\n[Test] ═══════════════════════════════════════════");
    console.log("[Test] LIMITLESS MODE TEST RESULTS");
    console.log("[Test] ═══════════════════════════════════════════");
    console.log(JSON.stringify(summary, null, 2));
    console.log(`[Test] Evidence saved to: ${EVIDENCE_DIR}`);

  } catch (err) {
    console.error("[Test] Error:", err.message);
    await page.screenshot({ path: `${EVIDENCE_DIR}/ERROR.png` });
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
