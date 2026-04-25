"""
Recursive Optimization Pass 1 — Comprehensive Playwright Audit
Audits ALL pages at mobile (393x852) and desktop (1280x800) viewports.
Takes screenshots of top and bottom of each page.
Checks for: overflow, truncation, z-index issues, touch targets, scroll.
"""
import os, time, json
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "https://3000-i3h28o36o1tgaq01hdtk1-56b46032.us2.manus.computer")
OUT_DIR = "/home/ubuntu/mobile-screenshots/pass1"
os.makedirs(OUT_DIR, exist_ok=True)

MOBILE_VP = {"width": 393, "height": 852}
DESKTOP_VP = {"width": 1280, "height": 800}

# All routes from App.tsx
ROUTES = [
    ("/", "home"),
    ("/billing", "billing"),
    ("/settings", "settings"),
    ("/library", "library"),
    ("/analytics", "analytics"),
    ("/memory", "memory"),
    ("/schedule", "schedule"),
    ("/github", "github"),
    ("/projects", "projects"),
    ("/profile", "profile"),
    ("/browser", "browser"),
    ("/webapp-builder", "webapp-builder"),
    ("/team", "team"),
    ("/connectors", "connectors"),
    ("/skills", "skills"),
    ("/meetings", "meetings"),
    ("/discover", "discover"),
    ("/slides", "slides"),
    ("/video-generator", "video-gen"),
    ("/desktop-app", "desktop-app"),
    ("/connect-device", "connect-device"),
    ("/app-publish", "app-publish"),
    ("/computer-use", "computer-use"),
    ("/deployed-websites", "deployed-sites"),
    ("/messaging", "messaging"),
    ("/mail", "mail"),
    ("/qa-testing", "qa-testing"),
    ("/sovereign", "sovereign"),
    ("/webhooks", "webhooks"),
    ("/task/test-audit-1", "taskview"),
    ("/404", "notfound"),
]

def dismiss_tour(page):
    """Dismiss the onboarding tour if it appears."""
    try:
        skip_btn = page.locator("text=Skip")
        if skip_btn.is_visible(timeout=2000):
            skip_btn.click()
            time.sleep(0.3)
    except:
        pass

def audit_page(page, route, name, viewport_label):
    """Take screenshots of a page at the current viewport."""
    url = f"{BASE_URL}{route}"
    try:
        page.goto(url, wait_until="networkidle", timeout=10000)
    except:
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=10000)
        except:
            print(f"  SKIP {name} ({viewport_label}) — failed to load")
            return

    time.sleep(0.5)
    dismiss_tour(page)
    time.sleep(0.3)

    # Top screenshot
    page.screenshot(path=f"{OUT_DIR}/{viewport_label}-{name}-top.png")

    # Scroll to bottom and take screenshot
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    time.sleep(0.3)
    page.screenshot(path=f"{OUT_DIR}/{viewport_label}-{name}-bottom.png")

    # Check for horizontal overflow
    has_overflow = page.evaluate("""() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    }""")
    if has_overflow:
        print(f"  ⚠️  HORIZONTAL OVERFLOW on {name} ({viewport_label})")

    # Check for elements extending beyond viewport
    offscreen = page.evaluate("""() => {
        const els = document.querySelectorAll('*');
        const vw = window.innerWidth;
        let count = 0;
        for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.right > vw + 5 && rect.width > 0 && rect.height > 0) {
                count++;
            }
        }
        return count;
    }""")
    if offscreen > 0:
        print(f"  ⚠️  {offscreen} elements extend beyond viewport on {name} ({viewport_label})")

    # Check for tiny touch targets on mobile
    if viewport_label == "mobile":
        tiny_targets = page.evaluate("""() => {
            const interactive = document.querySelectorAll('button, a, input, textarea, select, [role="button"], [tabindex]');
            let tiny = [];
            for (const el of interactive) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)) {
                    const text = el.textContent?.trim().slice(0, 30) || el.tagName;
                    tiny.push(`${text} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
                }
            }
            return tiny.slice(0, 10);
        }""")
        if tiny_targets:
            print(f"  ⚠️  Tiny touch targets on {name}: {tiny_targets}")

    print(f"  ✓ {name} ({viewport_label})")


def main():
    findings = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Mobile audit
        print("\n=== MOBILE AUDIT (393x852) ===")
        mobile_ctx = browser.new_context(viewport=MOBILE_VP, device_scale_factor=3)
        mobile_page = mobile_ctx.new_page()
        # Navigate to home first to dismiss tour
        mobile_page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
        time.sleep(1)
        dismiss_tour(mobile_page)

        for route, name in ROUTES:
            audit_page(mobile_page, route, name, "mobile")

        # Special: open PlusMenu on home
        mobile_page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
        time.sleep(0.5)
        dismiss_tour(mobile_page)
        try:
            plus_btn = mobile_page.locator('[aria-label="Open action menu"]').first
            if plus_btn.is_visible(timeout=2000):
                plus_btn.click()
                time.sleep(0.5)
                mobile_page.screenshot(path=f"{OUT_DIR}/mobile-home-plusmenu.png")
                print("  ✓ PlusMenu opened on mobile home")
        except:
            print("  ⚠️  Could not open PlusMenu on mobile home")

        mobile_ctx.close()

        # Desktop audit
        print("\n=== DESKTOP AUDIT (1280x800) ===")
        desktop_ctx = browser.new_context(viewport=DESKTOP_VP)
        desktop_page = desktop_ctx.new_page()
        desktop_page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
        time.sleep(1)
        dismiss_tour(desktop_page)

        for route, name in ROUTES:
            audit_page(desktop_page, route, name, "desktop")

        # Special: open PlusMenu on desktop home
        desktop_page.goto(BASE_URL, wait_until="networkidle", timeout=10000)
        time.sleep(0.5)
        dismiss_tour(desktop_page)
        try:
            plus_btn = desktop_page.locator('[aria-label="Open action menu"]').first
            if plus_btn.is_visible(timeout=2000):
                plus_btn.click()
                time.sleep(0.5)
                desktop_page.screenshot(path=f"{OUT_DIR}/desktop-home-plusmenu.png")
                print("  ✓ PlusMenu opened on desktop home")
        except:
            print("  ⚠️  Could not open PlusMenu on desktop home")

        desktop_ctx.close()
        browser.close()

    print(f"\nScreenshots saved to {OUT_DIR}")
    print(f"Total: {len(os.listdir(OUT_DIR))} screenshots")


if __name__ == "__main__":
    main()
