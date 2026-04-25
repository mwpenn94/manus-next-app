"""
Recursive Optimization Pass 2 — Fresh Deep Audit
Different angle from Pass 1: focuses on interaction flows, accessibility,
keyboard navigation, color contrast, and component-level checks.
"""
import os, time
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("BASE_URL", "https://3000-i3h28o36o1tgaq01hdtk1-56b46032.us2.manus.computer")
OUT_DIR = "/home/ubuntu/mobile-screenshots/pass2"
os.makedirs(OUT_DIR, exist_ok=True)

MOBILE_VP = {"width": 393, "height": 852}
DESKTOP_VP = {"width": 1280, "height": 800}

def dismiss_tour(page):
    """Dismiss the onboarding tour if it appears."""
    for _ in range(10):
        try:
            skip_btn = page.locator("text=Skip")
            if skip_btn.is_visible(timeout=1000):
                skip_btn.click()
                time.sleep(0.3)
                return True
        except:
            pass
    return False

def check_focus_visible(page, label):
    """Check if focus-visible styles exist for interactive elements."""
    result = page.evaluate("""() => {
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        let hasFocusVisible = false;
        for (const s of document.querySelectorAll('style')) {
            if (s.textContent.includes('focus-visible') || s.textContent.includes(':focus')) {
                hasFocusVisible = true;
                break;
            }
        }
        return hasFocusVisible;
    }""")
    if not result:
        print(f"  ⚠️  No focus-visible styles detected on {label}")
    return result

def check_aria_labels(page, label):
    """Check interactive elements have aria-labels or visible text."""
    missing = page.evaluate("""() => {
        const els = document.querySelectorAll('button, a[href], input, select, textarea');
        let missing = [];
        for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const hasLabel = el.getAttribute('aria-label') || 
                           el.getAttribute('aria-labelledby') ||
                           el.getAttribute('title') ||
                           el.textContent?.trim();
            if (!hasLabel) {
                missing.push({
                    tag: el.tagName,
                    classes: el.className?.toString().slice(0, 50) || '',
                    rect: `${Math.round(rect.width)}x${Math.round(rect.height)}`
                });
            }
        }
        return missing.slice(0, 5);
    }""")
    if missing:
        print(f"  ⚠️  {len(missing)} elements without labels on {label}: {missing}")
    return missing

def check_color_contrast(page, label):
    """Basic check for very low contrast text."""
    low_contrast = page.evaluate("""() => {
        const els = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label');
        let issues = [];
        for (const el of els) {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const bg = style.backgroundColor;
            // Check for invisible text (same color as bg or fully transparent)
            if (color === bg && color !== 'rgba(0, 0, 0, 0)') {
                issues.push({
                    text: el.textContent?.trim().slice(0, 20),
                    color: color,
                    bg: bg
                });
            }
        }
        return issues.slice(0, 3);
    }""")
    if low_contrast:
        print(f"  ⚠️  Potential invisible text on {label}: {low_contrast}")
    return low_contrast

def check_scrollable_content(page, label):
    """Verify page content is scrollable and not cut off."""
    result = page.evaluate("""() => {
        const body = document.body;
        const html = document.documentElement;
        const scrollHeight = Math.max(body.scrollHeight, html.scrollHeight);
        const clientHeight = Math.max(body.clientHeight, html.clientHeight);
        return {
            scrollHeight,
            clientHeight,
            isScrollable: scrollHeight > clientHeight + 10,
            ratio: (scrollHeight / clientHeight).toFixed(2)
        };
    }""")
    return result

def check_overlapping_fixed_elements(page, label):
    """Check for fixed/sticky elements that might overlap content."""
    overlaps = page.evaluate("""() => {
        const fixed = document.querySelectorAll('*');
        let fixedEls = [];
        for (const el of fixed) {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'sticky') {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    fixedEls.push({
                        tag: el.tagName,
                        position: style.position,
                        zIndex: style.zIndex,
                        rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
                        classes: el.className?.toString().slice(0, 40) || ''
                    });
                }
            }
        }
        return fixedEls;
    }""")
    return overlaps

def audit_interactions(page, label, viewport_label):
    """Test key interaction flows."""
    issues = []
    
    # Check if sidebar opens/closes on mobile
    if viewport_label == "mobile":
        try:
            hamburger = page.locator('button').filter(has=page.locator('svg')).first
            if hamburger.is_visible(timeout=1000):
                # Try clicking hamburger
                hamburger.click()
                time.sleep(0.5)
                page.screenshot(path=f"{OUT_DIR}/{viewport_label}-{label}-sidebar-open.png")
                
                # Check if sidebar appeared
                sidebar_visible = page.evaluate("""() => {
                    const sidebar = document.querySelector('[class*="sidebar"], [class*="Sidebar"], nav');
                    if (!sidebar) return false;
                    const rect = sidebar.getBoundingClientRect();
                    return rect.width > 100 && rect.x >= -10;
                }""")
                if not sidebar_visible:
                    issues.append(f"Sidebar may not have opened on {label}")
                
                # Close sidebar by clicking overlay or hamburger again
                try:
                    overlay = page.locator('[class*="overlay"], [class*="Overlay"]').first
                    if overlay.is_visible(timeout=500):
                        overlay.click()
                except:
                    hamburger.click()
                time.sleep(0.3)
        except Exception as e:
            pass
    
    return issues


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
    ("/discover", "discover"),
    ("/sovereign", "sovereign"),
    ("/task/test-audit-2", "taskview"),
]


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for viewport_label, vp in [("mobile", MOBILE_VP), ("desktop", DESKTOP_VP)]:
            print(f"\n=== {viewport_label.upper()} DEEP AUDIT ===")
            ctx = browser.new_context(viewport=vp, device_scale_factor=2 if viewport_label == "mobile" else 1)
            page = ctx.new_page()
            
            # Dismiss tour on first page
            page.goto(BASE_URL, wait_until="networkidle", timeout=15000)
            time.sleep(1)
            dismiss_tour(page)

            for route, name in ROUTES:
                url = f"{BASE_URL}{route}"
                try:
                    page.goto(url, wait_until="networkidle", timeout=10000)
                except:
                    try:
                        page.goto(url, wait_until="domcontentloaded", timeout=10000)
                    except:
                        print(f"  SKIP {name} ({viewport_label})")
                        continue

                time.sleep(0.5)
                dismiss_tour(page)
                time.sleep(0.3)

                print(f"\n  --- {name} ({viewport_label}) ---")

                # 1. Accessibility checks
                check_aria_labels(page, name)
                check_color_contrast(page, name)

                # 2. Scroll check
                scroll_info = check_scrollable_content(page, name)
                if scroll_info:
                    print(f"  Scroll: {scroll_info['scrollHeight']}px content / {scroll_info['clientHeight']}px viewport (ratio {scroll_info['ratio']})")

                # 3. Fixed element check
                fixed_els = check_overlapping_fixed_elements(page, name)
                if fixed_els:
                    fixed_summary = [f"{f['tag']}({f['position']}, z:{f['zIndex']})" for f in fixed_els[:5]]
                    print(f"  Fixed elements: {fixed_summary}")

                # 4. Interaction flows
                interaction_issues = audit_interactions(page, name, viewport_label)
                if interaction_issues:
                    for issue in interaction_issues:
                        print(f"  ⚠️  {issue}")

                # 5. Screenshot
                page.screenshot(path=f"{OUT_DIR}/{viewport_label}-{name}-pass2.png")
                print(f"  ✓ {name} ({viewport_label}) — complete")

            ctx.close()

        browser.close()

    print(f"\nPass 2 screenshots saved to {OUT_DIR}")
    print(f"Total: {len(os.listdir(OUT_DIR))} screenshots")


if __name__ == "__main__":
    main()
