#!/usr/bin/env python3
"""
§L.27 Live Benchmark Sweep — Execute tasks on manus-next-app via Playwright.
Drives the real UI, captures screenshots, logs results.
"""
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

BASE_URL = os.environ.get("APP_URL", "https://3000-i4m0hisijpvy88uv0iqeg-4d8e8ed2.us2.manus.computer")
RESULTS_DIR = Path("/home/ubuntu/manus-next-app/docs/manus-study/benchmarks/runs")
SCREENSHOTS_DIR = Path("/home/ubuntu/manus-next-app/docs/manus-study/benchmarks/screenshots")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Representative tasks from TASK_CATALOG covering multiple categories
BENCHMARK_TASKS = [
    {
        "id": "TASK-001",
        "category": "plan",
        "title": "Multi-step research plan",
        "prompt": "Create a detailed research plan for comparing AI agent frameworks including Manus, AutoGPT, and CrewAI. Include methodology, data sources, and timeline.",
        "expected_signals": ["structured output", "multiple steps", "methodology"],
    },
    {
        "id": "TASK-003",
        "category": "execute",
        "title": "Code generation",
        "prompt": "Write a Python function that implements binary search on a sorted array. Include type hints, docstring, and edge case handling.",
        "expected_signals": ["code block", "function definition", "type hints"],
    },
    {
        "id": "TASK-007",
        "category": "verify",
        "title": "Fact-checking with sources",
        "prompt": "Fact-check this claim: 'GPT-4 was released in March 2023 and has 1.7 trillion parameters.' Provide sources for your verification.",
        "expected_signals": ["verification", "sources", "correct/incorrect"],
    },
    {
        "id": "TASK-010",
        "category": "memory",
        "title": "Context continuity",
        "prompt": "I'm working on a financial planning app called WealthBridge. Remember this context. What are the key features I should prioritize for the MVP?",
        "expected_signals": ["acknowledgment", "feature list", "prioritization"],
    },
    {
        "id": "TASK-013",
        "category": "tool-use",
        "title": "Web search integration",
        "prompt": "Search for the latest developments in AI agent technology in 2026 and summarize the top 3 trends.",
        "expected_signals": ["search results", "trends", "2026"],
    },
    {
        "id": "TASK-016",
        "category": "reasoning",
        "title": "Multi-step logical reasoning",
        "prompt": "A company has 3 products. Product A costs $10 and sells 1000 units/month. Product B costs $25 and sells 400 units/month. Product C costs $50 and sells 150 units/month. Which product generates the most revenue? If we can only invest in improving one product's sales by 20%, which should we choose and why?",
        "expected_signals": ["calculation", "comparison", "recommendation"],
    },
    {
        "id": "TASK-019",
        "category": "browser",
        "title": "Navigate and extract",
        "prompt": "Go to the Wikipedia page for 'Artificial Intelligence' and tell me the first three sentences of the introduction.",
        "expected_signals": ["navigation", "extraction", "accurate content"],
    },
    {
        "id": "TASK-025",
        "category": "computer-use",
        "title": "File creation and management",
        "prompt": "Create a simple HTML file with a table showing the top 5 programming languages by popularity in 2026. Save it and show me the result.",
        "expected_signals": ["file creation", "HTML", "table"],
    },
]


def take_screenshot(page, name):
    """Capture screenshot and save to benchmarks dir."""
    path = SCREENSHOTS_DIR / f"{name}-{int(time.time())}.png"
    page.screenshot(path=str(path), full_page=True)
    return str(path)


def wait_for_response(page, timeout_ms=120000):
    """Wait for the assistant response to complete streaming."""
    # Wait for the streaming indicator to disappear or content to stabilize
    start = time.time()
    last_content = ""
    stable_count = 0
    
    while time.time() - start < timeout_ms / 1000:
        time.sleep(2)
        
        # Check if there's a streaming indicator
        streaming = page.query_selector('[data-streaming="true"], .animate-pulse, .streaming-indicator')
        if streaming:
            stable_count = 0
            continue
        
        # Check if content has stabilized
        messages = page.query_selector_all('[data-role="assistant"], .assistant-message, [class*="assistant"]')
        if messages:
            current = messages[-1].inner_text()
            if current == last_content and len(current) > 10:
                stable_count += 1
                if stable_count >= 3:  # 3 consecutive checks with same content = done
                    return current
            else:
                last_content = current
                stable_count = 0
        
        # Also check for error states
        errors = page.query_selector_all('[class*="error"], [data-error]')
        if errors:
            return f"ERROR: {errors[0].inner_text()}"
    
    return last_content or "TIMEOUT: No response received"


def authenticate(page):
    """Navigate to app and handle OAuth if needed."""
    print(f"[auth] Navigating to {BASE_URL}")
    page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
    time.sleep(2)
    
    # Check if we're on the login page
    url = page.url
    print(f"[auth] Current URL: {url}")
    
    if "app-auth" in url or "login" in url.lower():
        print("[auth] On login page — need to authenticate")
        # Take screenshot of login page
        take_screenshot(page, "login-page")
        
        # Look for login button
        login_btn = page.query_selector('button:has-text("Login"), button:has-text("Sign in"), a:has-text("Login"), a:has-text("Sign in"), [data-testid="login-button"]')
        if login_btn:
            print("[auth] Found login button, clicking...")
            login_btn.click()
            time.sleep(3)
            take_screenshot(page, "after-login-click")
        
        # Check if we need to handle Manus OAuth
        url = page.url
        print(f"[auth] After click URL: {url}")
        
        # If still on auth page, try to find and fill credentials
        if "manus.im" in url or "app-auth" in url:
            print("[auth] On Manus OAuth page")
            take_screenshot(page, "manus-oauth")
            # The browser should have persistent login state
            # Wait for redirect
            try:
                page.wait_for_url(f"{BASE_URL}/**", timeout=15000)
                print("[auth] Successfully redirected back to app")
            except PWTimeout:
                print("[auth] Timeout waiting for redirect — may need manual login")
                return False
    
    # Verify we're on the app
    take_screenshot(page, "app-home")
    title = page.title()
    print(f"[auth] Page title: {title}")
    
    # Check for authenticated state
    page.wait_for_timeout(2000)
    content = page.content()
    if "Hello" in content or "task" in content.lower() or "manus" in content.lower():
        print("[auth] App loaded successfully")
        return True
    
    print(f"[auth] Uncertain auth state. URL: {page.url}")
    return True  # Proceed anyway


def execute_task(page, task):
    """Execute a single benchmark task on manus-next-app."""
    result = {
        "task_id": task["id"],
        "category": task["category"],
        "title": task["title"],
        "prompt": task["prompt"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "platform": "manus-next-app",
    }
    
    print(f"\n[task] Executing {task['id']}: {task['title']}")
    
    try:
        # Navigate to home / new task
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        time.sleep(2)
        take_screenshot(page, f"{task['id']}-start")
        
        # Find the input area
        textarea = page.query_selector('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]')
        if not textarea:
            # Try clicking "New task" button first
            new_task_btn = page.query_selector('button:has-text("New task"), a:has-text("New task"), [data-testid="new-task"]')
            if new_task_btn:
                new_task_btn.click()
                time.sleep(1)
            textarea = page.query_selector('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]')
        
        if not textarea:
            result["status"] = "FAIL"
            result["error"] = "Could not find input area"
            result["screenshot"] = take_screenshot(page, f"{task['id']}-no-input")
            return result
        
        # Type the prompt
        textarea.click()
        textarea.fill(task["prompt"])
        time.sleep(0.5)
        take_screenshot(page, f"{task['id']}-typed")
        
        # Submit
        submit_btn = page.query_selector('button[type="submit"], button:has-text("Send"), button[title="Submit"], button[aria-label="Send"]')
        if submit_btn:
            submit_btn.click()
        else:
            textarea.press("Enter")
        
        print(f"[task] Submitted prompt, waiting for response...")
        time.sleep(3)
        
        # Wait for response
        response_text = wait_for_response(page, timeout_ms=120000)
        take_screenshot(page, f"{task['id']}-response")
        
        result["response_length"] = len(response_text)
        result["response_preview"] = response_text[:500] if response_text else ""
        
        # Score against expected signals
        signals_found = []
        signals_missing = []
        for signal in task["expected_signals"]:
            if signal.lower() in response_text.lower():
                signals_found.append(signal)
            else:
                signals_missing.append(signal)
        
        result["signals_found"] = signals_found
        result["signals_missing"] = signals_missing
        result["signal_score"] = len(signals_found) / len(task["expected_signals"]) if task["expected_signals"] else 0
        
        if response_text.startswith("ERROR:") or response_text.startswith("TIMEOUT:"):
            result["status"] = "FAIL"
            result["error"] = response_text
        elif len(response_text) < 20:
            result["status"] = "PARTIAL"
            result["error"] = "Response too short"
        else:
            result["status"] = "PASS"
        
        print(f"[task] {task['id']} — {result['status']} (signals: {len(signals_found)}/{len(task['expected_signals'])}, {len(response_text)} chars)")
        
    except Exception as e:
        result["status"] = "ERROR"
        result["error"] = str(e)
        print(f"[task] {task['id']} — ERROR: {e}")
        try:
            result["screenshot"] = take_screenshot(page, f"{task['id']}-error")
        except:
            pass
    
    return result


def main():
    iso = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    all_results = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        # Authenticate
        if not authenticate(page):
            print("[FATAL] Authentication failed. Proceeding with unauthenticated testing.")
        
        # Execute each benchmark task
        for task in BENCHMARK_TASKS:
            result = execute_task(page, task)
            all_results.append(result)
            time.sleep(2)  # Brief pause between tasks
        
        browser.close()
    
    # Write results
    output_path = RESULTS_DIR / f"sweep-live-{iso}.json"
    with open(output_path, "w") as f:
        json.dump({
            "sweep_id": f"live-{iso}",
            "platform": "manus-next-app",
            "timestamp": iso,
            "task_count": len(all_results),
            "pass_count": sum(1 for r in all_results if r["status"] == "PASS"),
            "fail_count": sum(1 for r in all_results if r["status"] in ("FAIL", "ERROR")),
            "partial_count": sum(1 for r in all_results if r["status"] == "PARTIAL"),
            "results": all_results,
        }, f, indent=2)
    
    print(f"\n{'='*60}")
    print(f"SWEEP COMPLETE: {output_path}")
    print(f"  Tasks: {len(all_results)}")
    print(f"  PASS:  {sum(1 for r in all_results if r['status'] == 'PASS')}")
    print(f"  FAIL:  {sum(1 for r in all_results if r['status'] in ('FAIL', 'ERROR'))}")
    print(f"  PARTIAL: {sum(1 for r in all_results if r['status'] == 'PARTIAL')}")
    print(f"{'='*60}")
    
    return output_path


if __name__ == "__main__":
    main()
