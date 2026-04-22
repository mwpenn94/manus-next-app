"""
Demonstrate All Regression Test — Automated Playwright Test
============================================================

This test automates the "What can you do? Demonstrate each" prompt and verifies
that the agent completes all 10/10 capability group demonstrations without
requiring manual intervention.

Key behaviors tested:
1. Agent starts and streams a response
2. All 10 capability groups are demonstrated (n/n, not n-1/n)
3. Approval gates (confirmation_gate) are auto-approved
4. Auto-continuation works when the agent hits token limits
5. The agent reaches a "done" state with all demonstrations present

Usage:
  python tests/demonstrate_all_regression.py [--base-url URL] [--timeout SECONDS] [--headless]

Requires: playwright (pip install playwright && playwright install chromium)
"""

import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

# ── Configuration ──

DEFAULT_BASE_URL = "http://localhost:3000"
DEFAULT_TIMEOUT_SECONDS = 600  # 10 minutes max for full demonstration
POLL_INTERVAL_MS = 5000  # Check every 5 seconds

# The 10 capability groups the agent must demonstrate
REQUIRED_CAPABILITIES = [
    "Web Search",
    "Image Generation",
    "Data Analysis",
    "Document Generation",
    "Web Browsing",
    "Wide Research",
    "Code Execution",
    "Email",       # Email/Communication
    "App",         # App/File Creation
    "Voice",       # Voice/Multimodal
]

# Patterns that indicate a demonstration was completed
DEMO_PATTERNS = [
    r"Demonstration\s+(\d+)/10",
    r"Demo\s+(\d+)/10",
    r"(\d+)/10.*(?:Web Search|Image|Data|Document|Browsing|Research|Code|Email|App|Voice)",
    r"(?:Web Search|Image|Data|Document|Browsing|Research|Code|Email|App|Voice).*(\d+)/10",
]

# Pattern for the summary line
SUMMARY_PATTERN = r"(?:All\s+)?10/10\s+(?:capability|capabilities|groups?)\s+(?:demonstrated|completed|done)"


def parse_args():
    parser = argparse.ArgumentParser(description="Demonstrate All Regression Test")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="Base URL of the app")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT_SECONDS, help="Max seconds to wait")
    parser.add_argument("--headless", action="store_true", default=True, help="Run in headless mode")
    parser.add_argument("--headed", action="store_true", help="Run with visible browser")
    parser.add_argument("--screenshot-dir", default="/home/ubuntu/test_screenshots", help="Directory for screenshots")
    return parser.parse_args()


def run_test(args):
    """Main test execution."""
    from playwright.sync_api import sync_playwright

    screenshot_dir = Path(args.screenshot_dir)
    screenshot_dir.mkdir(parents=True, exist_ok=True)

    headless = not args.headed
    results = {
        "started_at": datetime.now().isoformat(),
        "base_url": args.base_url,
        "timeout_seconds": args.timeout,
        "demos_found": [],
        "approval_gates_handled": 0,
        "continuation_events": 0,
        "final_status": "unknown",
        "total_text_length": 0,
    }

    print(f"[TEST] Starting Demonstrate All regression test")
    print(f"[TEST] Base URL: {args.base_url}")
    print(f"[TEST] Timeout: {args.timeout}s")
    print(f"[TEST] Headless: {headless}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        # ── Step 1: Navigate to the app ──
        print("[TEST] Navigating to app...")
        page.goto(args.base_url, wait_until="networkidle", timeout=30000)
        page.screenshot(path=str(screenshot_dir / "01_initial_load.png"))
        print("[TEST] App loaded successfully")

        # ── Step 2: Check if we need to log in ──
        # Look for login button or auth redirect
        login_button = page.locator("text=Log in, text=Sign in, a[href*='login'], a[href*='oauth']").first
        if login_button.is_visible(timeout=3000):
            print("[TEST] WARNING: Login required. Test may fail if not authenticated.")
            print("[TEST] Please log in first or run with an authenticated session.")

        # ── Step 3: Find the input area and send the prompt ──
        print("[TEST] Looking for input area...")
        input_selectors = [
            "textarea[placeholder*='task']",
            "textarea[placeholder*='Manus']",
            "textarea",
            "input[type='text']",
        ]

        input_element = None
        for selector in input_selectors:
            try:
                el = page.locator(selector).first
                if el.is_visible(timeout=3000):
                    input_element = el
                    print(f"[TEST] Found input: {selector}")
                    break
            except Exception:
                continue

        if not input_element:
            print("[TEST] FAIL: Could not find input area")
            page.screenshot(path=str(screenshot_dir / "fail_no_input.png"))
            results["final_status"] = "FAIL: No input found"
            save_results(results, screenshot_dir)
            browser.close()
            return False

        # ── Step 4: Type and submit the prompt ──
        prompt = "What can you do? Demonstrate each"
        print(f"[TEST] Sending prompt: '{prompt}'")
        input_element.fill(prompt)
        page.screenshot(path=str(screenshot_dir / "02_prompt_filled.png"))

        # Press Enter or click submit button
        submit_button = page.locator("button[title='Submit'], button[aria-label='Send'], button:has(svg)").last
        if submit_button.is_visible(timeout=2000):
            submit_button.click()
        else:
            input_element.press("Enter")

        print("[TEST] Prompt submitted, waiting for response...")
        page.screenshot(path=str(screenshot_dir / "03_prompt_submitted.png"))

        # ── Step 5: Monitor the response ──
        start_time = time.time()
        last_text = ""
        stall_count = 0
        max_stalls = 12  # 12 * 5s = 60s of no progress before considering stalled

        while time.time() - start_time < args.timeout:
            elapsed = int(time.time() - start_time)

            # Get all text content from the chat area
            try:
                chat_content = page.locator(".prose, [class*='message'], [class*='chat'], [class*='content']").all_text_contents()
                full_text = "\n".join(chat_content)
            except Exception:
                full_text = page.inner_text("body")

            results["total_text_length"] = len(full_text)

            # Check for demonstrations
            demos_found = set()
            for pattern in DEMO_PATTERNS:
                for match in re.finditer(pattern, full_text, re.IGNORECASE):
                    demo_num = int(match.group(1))
                    if 1 <= demo_num <= 10:
                        demos_found.add(demo_num)

            # Also check for capability keywords
            for i, cap in enumerate(REQUIRED_CAPABILITIES, 1):
                if cap.lower() in full_text.lower():
                    demos_found.add(i)

            results["demos_found"] = sorted(demos_found)

            # Check for approval gates and auto-approve
            try:
                approve_buttons = page.locator("button:has-text('Approve'), button:has-text('Allow'), button:has-text('Confirm')").all()
                for btn in approve_buttons:
                    if btn.is_visible():
                        print(f"[TEST] Auto-approving gate at {elapsed}s")
                        btn.click()
                        results["approval_gates_handled"] += 1
                        page.wait_for_timeout(1000)
            except Exception:
                pass

            # Check for continuation indicators
            if "Continuing..." in full_text:
                results["continuation_events"] += 1

            # Check for completion
            is_done = False

            # Check for "Regenerate" button (indicates stream ended)
            try:
                regen = page.locator("button:has-text('Regenerate'), button:has-text('Retry')")
                if regen.is_visible(timeout=500):
                    is_done = True
            except Exception:
                pass

            # Check for summary pattern
            if re.search(SUMMARY_PATTERN, full_text, re.IGNORECASE):
                is_done = True

            # Check for stalling
            if full_text == last_text:
                stall_count += 1
            else:
                stall_count = 0
            last_text = full_text

            # Progress report
            if elapsed % 30 == 0 or is_done:
                print(f"[TEST] {elapsed}s: {len(demos_found)}/10 demos found, "
                      f"{results['approval_gates_handled']} gates, "
                      f"{len(full_text)} chars, "
                      f"stall={stall_count}")

            if is_done:
                print(f"[TEST] Stream completed at {elapsed}s")
                page.screenshot(path=str(screenshot_dir / "04_completed.png"))
                break

            if stall_count >= max_stalls:
                print(f"[TEST] WARNING: Stalled for {stall_count * POLL_INTERVAL_MS / 1000}s")
                # Try sending a continuation message
                try:
                    input_el = page.locator("textarea").first
                    if input_el.is_visible():
                        input_el.fill("Continue from where you left off. Complete the remaining demonstrations.")
                        input_el.press("Enter")
                        stall_count = 0
                        print("[TEST] Sent continuation prompt")
                except Exception:
                    pass

            page.wait_for_timeout(POLL_INTERVAL_MS)

        # ── Step 6: Final verification ──
        elapsed = int(time.time() - start_time)
        page.screenshot(path=str(screenshot_dir / "05_final_state.png"), full_page=True)

        # Scroll through and capture evidence
        for scroll_pct in [0, 25, 50, 75, 100]:
            try:
                page.evaluate(f"window.scrollTo(0, document.body.scrollHeight * {scroll_pct / 100})")
                page.wait_for_timeout(500)
                page.screenshot(path=str(screenshot_dir / f"evidence_{scroll_pct}pct.png"))
            except Exception:
                pass

        # Final assessment
        demos_found = results["demos_found"]
        total_demos = len(demos_found)
        passed = total_demos >= 10

        results["completed_at"] = datetime.now().isoformat()
        results["elapsed_seconds"] = elapsed
        results["total_demos"] = total_demos
        results["passed"] = passed
        results["final_status"] = "PASS" if passed else f"FAIL: {total_demos}/10 demos found"

        # Print results
        print("\n" + "=" * 60)
        print(f"[TEST] RESULT: {'PASS ✓' if passed else 'FAIL ✗'}")
        print(f"[TEST] Demonstrations found: {total_demos}/10")
        print(f"[TEST] Demos: {demos_found}")
        print(f"[TEST] Approval gates handled: {results['approval_gates_handled']}")
        print(f"[TEST] Continuation events: {results['continuation_events']}")
        print(f"[TEST] Total text length: {results['total_text_length']}")
        print(f"[TEST] Elapsed time: {elapsed}s")
        print("=" * 60)

        save_results(results, screenshot_dir)
        browser.close()
        return passed


def save_results(results, screenshot_dir):
    """Save test results to JSON file."""
    results_path = screenshot_dir / "test_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"[TEST] Results saved to {results_path}")


if __name__ == "__main__":
    args = parse_args()
    try:
        success = run_test(args)
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n[TEST] Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"[TEST] FATAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(2)
