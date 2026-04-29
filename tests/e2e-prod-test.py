"""
Pass 66 — Virtual User E2E Test on Production
Tests the full user journey: home → submit task → watch agent → verify webapp card
"""
import asyncio
import json
import time
from playwright.async_api import async_playwright

PROD_URL = "https://manusnext-mlromfub.manus.space"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},  # iPhone 14 Pro
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        )
        page = await context.new_page()
        
        # Collect console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)
        
        # Collect network failures
        network_errors = []
        page.on("requestfailed", lambda req: network_errors.append(f"FAIL: {req.method} {req.url} - {req.failure}"))
        
        print("=" * 60)
        print("PASS 66 — PRODUCTION E2E VIRTUAL USER TEST")
        print(f"Target: {PROD_URL}")
        print(f"Device: iPhone 14 Pro (390x844)")
        print("=" * 60)
        
        # Step 1: Load home page
        print("\n[STEP 1] Loading home page...")
        try:
            resp = await page.goto(PROD_URL, wait_until="networkidle", timeout=30000)
            print(f"  Status: {resp.status}")
            print(f"  URL: {page.url}")
        except Exception as e:
            print(f"  ERROR: {e}")
            await browser.close()
            return
        
        await page.screenshot(path="/tmp/prod-step1-home.png")
        
        # Check if we're on the home page or redirected to login
        current_url = page.url
        if "login" in current_url or "oauth" in current_url:
            print("  RESULT: Redirected to login — NOT logged in")
            print("  This means unauthenticated users can't even see the home page")
            # Try to find the login button or form
            login_elements = await page.query_selector_all("button, a, input[type='submit']")
            for el in login_elements[:5]:
                text = await el.inner_text() if await el.is_visible() else ""
                print(f"    Found: {text}")
        else:
            print(f"  RESULT: Home page loaded (no redirect)")
        
        # Step 2: Check what's visible on the page
        print("\n[STEP 2] Checking visible elements...")
        
        # Check for the input field
        textarea = await page.query_selector("textarea")
        if textarea:
            placeholder = await textarea.get_attribute("placeholder")
            print(f"  Input field found: placeholder='{placeholder}'")
        else:
            print("  WARNING: No textarea found")
            input_field = await page.query_selector("input[type='text']")
            if input_field:
                print(f"  Found input[type='text'] instead")
            else:
                print("  ERROR: No input field found at all")
        
        # Check for suggestion cards
        suggestion_buttons = await page.query_selector_all("button")
        visible_buttons = []
        for btn in suggestion_buttons:
            if await btn.is_visible():
                text = (await btn.inner_text()).strip()
                if text and len(text) > 5:
                    visible_buttons.append(text[:60])
        print(f"  Visible buttons ({len(visible_buttons)}):")
        for b in visible_buttons[:8]:
            print(f"    - {b}")
        
        # Check for navigation
        nav_elements = await page.query_selector_all("nav, [role='navigation'], .sidebar, aside")
        print(f"  Navigation elements: {len(nav_elements)}")
        
        # Check for user avatar/profile (login indicator)
        avatar = await page.query_selector("img[alt*='avatar'], img[alt*='profile'], .avatar, [data-testid='user-avatar']")
        if avatar:
            print("  User avatar found — appears logged in")
        else:
            print("  No user avatar — may not be logged in")
        
        # Step 3: Check if there's a sidebar with task history
        print("\n[STEP 3] Checking for task history sidebar...")
        sidebar = await page.query_selector(".sidebar, aside, [data-sidebar], nav")
        if sidebar and await sidebar.is_visible():
            sidebar_text = await sidebar.inner_text()
            print(f"  Sidebar content (first 200 chars): {sidebar_text[:200]}")
        else:
            # Try hamburger menu on mobile
            hamburger = await page.query_selector("button[aria-label*='menu'], button[aria-label*='Menu'], .hamburger, [data-testid='menu-toggle']")
            if hamburger:
                print("  Hamburger menu found — clicking...")
                await hamburger.click()
                await page.wait_for_timeout(500)
                await page.screenshot(path="/tmp/prod-step3-sidebar.png")
                sidebar = await page.query_selector(".sidebar, aside, [data-sidebar], nav")
                if sidebar and await sidebar.is_visible():
                    sidebar_text = await sidebar.inner_text()
                    print(f"  Sidebar content: {sidebar_text[:200]}")
                else:
                    print("  Sidebar still not visible after hamburger click")
            else:
                print("  No sidebar or hamburger menu found")
        
        # Step 4: Try submitting a task
        print("\n[STEP 4] Attempting to submit a task...")
        if textarea:
            await textarea.fill("What is 2 + 2?")
            await page.wait_for_timeout(300)
            
            # Find the submit button
            submit_btn = await page.query_selector("button[title='Submit'], button[type='submit'], button:has(svg)")
            if not submit_btn:
                # Try finding by arrow icon or position
                all_buttons = await page.query_selector_all("button")
                for btn in all_buttons:
                    if await btn.is_visible():
                        # Check if it's near the textarea
                        box = await btn.bounding_box()
                        if box and box["y"] > 400:  # Below the textarea
                            submit_btn = btn
                            break
            
            if submit_btn:
                print("  Submit button found, clicking...")
                await page.screenshot(path="/tmp/prod-step4-before-submit.png")
                
                # Listen for navigation or network requests
                stream_requests = []
                page.on("request", lambda req: stream_requests.append(req.url) if "stream" in req.url or "trpc" in req.url else None)
                
                await submit_btn.click()
                await page.wait_for_timeout(2000)
                
                await page.screenshot(path="/tmp/prod-step4-after-submit.png")
                
                new_url = page.url
                print(f"  After submit URL: {new_url}")
                
                if "login" in new_url or "oauth" in new_url:
                    print("  CRITICAL: Redirected to login after submit — user must be authenticated")
                elif "task" in new_url:
                    print("  Navigated to task page — good!")
                    
                    # Wait for agent response
                    print("  Waiting for agent response (up to 60s)...")
                    start = time.time()
                    agent_responded = False
                    
                    for i in range(12):  # 12 * 5s = 60s
                        await page.wait_for_timeout(5000)
                        content = await page.content()
                        
                        # Check for various indicators
                        has_steps = "steps completed" in content.lower() or "step_progress" in content
                        has_thinking = "thinking" in content.lower() or "agent_thinking" in content
                        has_delta = len(content) > 5000  # Content growing
                        has_webapp_card = "webapp" in content.lower() and ("preview" in content.lower() or "deployed" in content.lower())
                        has_error = "error" in content.lower() and "authentication" in content.lower()
                        
                        elapsed = time.time() - start
                        print(f"    [{elapsed:.0f}s] steps={has_steps} thinking={has_thinking} webapp={has_webapp_card} error={has_error}")
                        
                        if has_steps or has_thinking or has_webapp_card:
                            agent_responded = True
                            
                        if has_webapp_card:
                            print("  WEBAPP CARD DETECTED!")
                            break
                            
                        if has_error:
                            print("  AUTH ERROR detected in page content")
                            break
                    
                    await page.screenshot(path="/tmp/prod-step4-final.png")
                    
                    if agent_responded:
                        print(f"  Agent responded after {time.time() - start:.0f}s")
                    else:
                        print(f"  Agent did NOT respond after {time.time() - start:.0f}s")
                    
                    # Check stream requests
                    print(f"  Stream/tRPC requests: {len(stream_requests)}")
                    for req in stream_requests[:5]:
                        print(f"    {req[:100]}")
                else:
                    print(f"  Unexpected URL after submit: {new_url}")
            else:
                print("  ERROR: Could not find submit button")
        else:
            print("  Cannot submit — no input field found")
        
        # Step 5: Check for any existing tasks with webapp cards
        print("\n[STEP 5] Checking for existing tasks with webapp cards...")
        # Navigate to the task list if there's a sidebar
        all_links = await page.query_selector_all("a[href*='task']")
        print(f"  Task links found: {len(all_links)}")
        for link in all_links[:5]:
            href = await link.get_attribute("href")
            text = (await link.inner_text()).strip()
            print(f"    {text[:40]} → {href}")
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Console errors: {len(console_errors)}")
        for err in console_errors[:10]:
            print(f"  {err[:100]}")
        print(f"Network errors: {len(network_errors)}")
        for err in network_errors[:5]:
            print(f"  {err[:100]}")
        
        await browser.close()

asyncio.run(main())
