"""
Pass 66 — Virtual User E2E Test in PRODUCTION
Tests the full flow: login → submit task → watch agent respond → verify webapp accessible

This tests against the DEPLOYED production site (manusnext-mlromfub.manus.space)
"""
import json
import time
import sys
from playwright.sync_api import sync_playwright

PROD_URL = "https://manusnext-mlromfub.manus.space"
TIMEOUT = 120_000  # 2 minutes max for agent to respond

def test_production_flow():
    results = {
        "page_loads": False,
        "user_authenticated": False,
        "can_submit_task": False,
        "agent_responds": False,
        "agent_completes_step": False,
        "webapp_card_shown": False,
        "webapp_accessible": False,
        "deployed_url_works": False,
        "errors": [],
        "console_errors": [],
        "network_errors": [],
        "screenshots": [],
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 390, "height": 844},  # iPhone 14 Pro
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
        )
        page = context.new_page()

        # Capture console errors
        page.on("console", lambda msg: results["console_errors"].append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        
        # Capture network failures
        page.on("requestfailed", lambda req: results["network_errors"].append(f"FAILED: {req.method} {req.url} - {req.failure}"))

        # Step 1: Load production page
        print("Step 1: Loading production page...")
        try:
            page.goto(PROD_URL, wait_until="networkidle", timeout=30000)
            results["page_loads"] = True
            page.screenshot(path="/tmp/e2e-prod-01-loaded.png")
            results["screenshots"].append("/tmp/e2e-prod-01-loaded.png")
            print(f"  ✓ Page loaded: {page.title()}")
        except Exception as e:
            results["errors"].append(f"Page load failed: {e}")
            print(f"  ✗ Page load failed: {e}")
            browser.close()
            return results

        # Step 2: Check authentication state
        print("Step 2: Checking authentication...")
        # Look for login button or user greeting
        greeting = page.locator("text=Hello").first
        login_btn = page.locator("text=Log in, text=Sign in, [href*='login']").first
        
        if greeting.is_visible(timeout=5000):
            results["user_authenticated"] = True
            print(f"  ✓ User authenticated (greeting visible)")
        elif login_btn.is_visible(timeout=3000):
            results["errors"].append("User not authenticated — login required")
            print("  ✗ Not authenticated — need to log in first")
            page.screenshot(path="/tmp/e2e-prod-02-not-authed.png")
            results["screenshots"].append("/tmp/e2e-prod-02-not-authed.png")
            # Try to proceed anyway to see what's available
        else:
            # Check page content
            content = page.content()
            if "Hello" in content or "What can I do" in content:
                results["user_authenticated"] = True
                print("  ✓ User authenticated (content check)")
            else:
                results["errors"].append(f"Unclear auth state. Page content snippet: {content[:500]}")
                print(f"  ? Unclear auth state")

        # Step 3: Dismiss onboarding if present
        print("Step 3: Dismissing onboarding if present...")
        skip_btn = page.locator("button:has-text('Skip')")
        try:
            if skip_btn.is_visible(timeout=3000):
                skip_btn.click()
                print("  ✓ Dismissed onboarding")
                page.wait_for_timeout(500)
            else:
                print("  - No onboarding to dismiss")
        except Exception:
            print("  - No onboarding to dismiss (or multiple skip elements)")

        # Step 4: Find and use the task input
        print("Step 4: Finding task input...")
        # Look for textarea/input for task submission
        textarea = page.locator("textarea").first
        input_field = page.locator("input[type='text']").first
        
        task_input = None
        if textarea.is_visible(timeout=5000):
            task_input = textarea
            print("  ✓ Found textarea")
        elif input_field.is_visible(timeout=3000):
            task_input = input_field
            print("  ✓ Found input field")
        else:
            # Try placeholder-based search
            task_input = page.locator("[placeholder*='task'], [placeholder*='Manus'], [placeholder*='message']").first
            if task_input.is_visible(timeout=3000):
                print("  ✓ Found input by placeholder")
            else:
                results["errors"].append("Cannot find task input field")
                print("  ✗ Cannot find task input")
                page.screenshot(path="/tmp/e2e-prod-04-no-input.png")
                results["screenshots"].append("/tmp/e2e-prod-04-no-input.png")
                browser.close()
                return results

        # Step 5: Submit a simple task
        print("Step 5: Submitting task: 'Create a simple calculator app'...")
        task_input.fill("Create a simple calculator app")
        page.wait_for_timeout(300)
        page.screenshot(path="/tmp/e2e-prod-05-filled.png")
        results["screenshots"].append("/tmp/e2e-prod-05-filled.png")

        # Find and click submit button
        submit_btn = page.locator("button[type='submit'], button[title='Submit'], button:has(svg)").last
        # Or try pressing Enter
        task_input.press("Enter")
        page.wait_for_timeout(1000)
        
        # Check if we navigated to a task page
        current_url = page.url
        if "/task/" in current_url:
            results["can_submit_task"] = True
            print(f"  ✓ Task submitted, navigated to: {current_url}")
        else:
            # Maybe still on home but task was created
            page.screenshot(path="/tmp/e2e-prod-05b-after-submit.png")
            results["screenshots"].append("/tmp/e2e-prod-05b-after-submit.png")
            # Check if we see any task-related UI
            if page.locator("text=Running, text=Processing, text=steps completed").first.is_visible(timeout=5000):
                results["can_submit_task"] = True
                print("  ✓ Task submitted (status visible)")
            else:
                results["errors"].append(f"Task submission unclear. URL: {current_url}")
                print(f"  ? Task submission unclear. URL: {current_url}")

        # Step 6: Wait for agent to respond
        print("Step 6: Waiting for agent response (up to 2 min)...")
        start_time = time.time()
        agent_responded = False
        
        while time.time() - start_time < 120:
            # Look for any sign of agent activity
            page_content = page.content()
            
            # Check for step completion indicators
            if "steps completed" in page_content or "step completed" in page_content:
                results["agent_responds"] = True
                results["agent_completes_step"] = True
                agent_responded = True
                print(f"  ✓ Agent responded with steps (after {int(time.time() - start_time)}s)")
                break
            
            # Check for streaming text
            if "Creating" in page_content or "Building" in page_content or "Generating" in page_content:
                results["agent_responds"] = True
                agent_responded = True
                print(f"  ✓ Agent is working (after {int(time.time() - start_time)}s)")
                # Wait a bit more for completion
                page.wait_for_timeout(10000)
                break
            
            # Check for error messages
            if "error" in page_content.lower() and "Something went wrong" in page_content:
                results["errors"].append("Agent error displayed to user")
                print("  ✗ Agent error displayed")
                break
            
            page.wait_for_timeout(3000)
        
        if not agent_responded:
            results["errors"].append("Agent did not respond within 2 minutes")
            print("  ✗ Agent did not respond within 2 minutes")
        
        page.screenshot(path="/tmp/e2e-prod-06-agent-response.png")
        results["screenshots"].append("/tmp/e2e-prod-06-agent-response.png")

        # Step 7: Wait for webapp card or deployed URL
        print("Step 7: Checking for webapp card or deployed URL...")
        # Wait up to 3 more minutes for full completion
        webapp_found = False
        start_time2 = time.time()
        
        while time.time() - start_time2 < 180 and not webapp_found:
            page_content = page.content()
            
            # Look for webapp preview card
            if "webapp-preview" in page_content or "Visit" in page_content or "Open App" in page_content:
                results["webapp_card_shown"] = True
                webapp_found = True
                print("  ✓ Webapp card found")
                break
            
            # Look for deployed URL
            if "deployed" in page_content.lower() or "live url" in page_content.lower():
                results["webapp_card_shown"] = True
                webapp_found = True
                print("  ✓ Deployment info found")
                break
            
            # Look for any clickable link to an app
            links = page.locator("a[href*='storage'], a[href*='webapp'], a[target='_blank']").all()
            if links:
                for link in links:
                    href = link.get_attribute("href")
                    if href and ("webapp" in href or "storage" in href or "s3" in href):
                        results["webapp_card_shown"] = True
                        results["webapp_accessible"] = True
                        webapp_found = True
                        print(f"  ✓ Found webapp link: {href}")
                        break
            
            if webapp_found:
                break
                
            page.wait_for_timeout(5000)
        
        if not webapp_found:
            # Check if the task is still running
            if "Running" in page.content():
                results["errors"].append("Task still running after 5 minutes — webapp not yet deployed")
                print("  ⏳ Task still running — webapp not deployed yet")
            else:
                results["errors"].append("No webapp card or deployed URL found")
                print("  ✗ No webapp card found")
        
        page.screenshot(path="/tmp/e2e-prod-07-final-state.png")
        results["screenshots"].append("/tmp/e2e-prod-07-final-state.png")

        # Step 8: Try to access the webapp if we found a URL
        print("Step 8: Attempting to access generated webapp...")
        if results["webapp_card_shown"]:
            # Try clicking "Visit" or "Open" button
            visit_btn = page.locator("text=Visit, text=Open, text=Open App, text=View App").first
            if visit_btn.is_visible(timeout=3000):
                # Open in new tab
                with context.expect_page() as new_page_info:
                    visit_btn.click()
                try:
                    new_page = new_page_info.value
                    new_page.wait_for_load_state("networkidle", timeout=15000)
                    if new_page.url and "about:blank" not in new_page.url:
                        results["webapp_accessible"] = True
                        results["deployed_url_works"] = True
                        print(f"  ✓ Webapp accessible at: {new_page.url}")
                        new_page.screenshot(path="/tmp/e2e-prod-08-webapp.png")
                        results["screenshots"].append("/tmp/e2e-prod-08-webapp.png")
                    else:
                        results["errors"].append("Webapp opened but URL is blank")
                        print("  ✗ Webapp URL is blank")
                except Exception as e:
                    results["errors"].append(f"Failed to access webapp: {e}")
                    print(f"  ✗ Failed to access webapp: {e}")
            else:
                print("  - No Visit/Open button found to click")
        else:
            print("  - Skipped (no webapp card found)")

        # Final screenshot
        page.screenshot(path="/tmp/e2e-prod-final.png")
        results["screenshots"].append("/tmp/e2e-prod-final.png")
        
        browser.close()

    return results


if __name__ == "__main__":
    print("=" * 60)
    print("PRODUCTION VIRTUAL USER E2E TEST")
    print(f"Target: {PROD_URL}")
    print("=" * 60)
    print()
    
    results = test_production_flow()
    
    print()
    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    
    checks = [
        ("Page loads", results["page_loads"]),
        ("User authenticated", results["user_authenticated"]),
        ("Can submit task", results["can_submit_task"]),
        ("Agent responds", results["agent_responds"]),
        ("Agent completes step", results["agent_completes_step"]),
        ("Webapp card shown", results["webapp_card_shown"]),
        ("Webapp accessible", results["webapp_accessible"]),
        ("Deployed URL works", results["deployed_url_works"]),
    ]
    
    for name, passed in checks:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"  {status}: {name}")
    
    if results["errors"]:
        print(f"\nErrors ({len(results['errors'])}):")
        for err in results["errors"]:
            print(f"  - {err}")
    
    if results["console_errors"]:
        print(f"\nConsole errors ({len(results['console_errors'])}):")
        for err in results["console_errors"][:10]:
            print(f"  - {err}")
    
    if results["network_errors"]:
        print(f"\nNetwork errors ({len(results['network_errors'])}):")
        for err in results["network_errors"][:10]:
            print(f"  - {err}")
    
    print(f"\nScreenshots saved: {len(results['screenshots'])}")
    for s in results["screenshots"]:
        print(f"  - {s}")
    
    # Write results to JSON for analysis
    with open("/tmp/e2e-prod-results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Exit with failure if critical checks failed
    critical_failures = not results["page_loads"] or not results["agent_responds"]
    sys.exit(1 if critical_failures else 0)
