"""
Recursive Pass 1: Exhaustive virtual user audit
"""
import asyncio
from playwright.async_api import async_playwright
import os

BASE = "https://3000-i3h28o36o1tgaq01hdtk1-56b46032.us2.manus.computer"
OUT = "/home/ubuntu/mobile-screenshots/pass1"
os.makedirs(OUT, exist_ok=True)

MOBILE = {"width": 393, "height": 852}
DESKTOP = {"width": 1280, "height": 800}

PAGES = [
    ("/", "home"),
    ("/tasks", "tasks"),
    ("/billing", "billing"),
    ("/settings", "settings"),
    ("/library", "library"),
    ("/search", "search"),
    ("/schedule", "schedule"),
    ("/github", "github"),
]

async def dismiss_tour(page):
    try:
        skip = page.locator("text=Skip")
        if await skip.is_visible(timeout=2000):
            await skip.click()
            await page.wait_for_timeout(500)
    except:
        pass

async def audit_page(page, path, name, vp_name, vp):
    await page.set_viewport_size(vp)
    await page.goto(f"{BASE}{path}", wait_until="load", timeout=15000)
    await page.wait_for_timeout(1500)
    await dismiss_tour(page)
    await page.wait_for_timeout(500)

    prefix = f"{OUT}/{vp_name}-{name}"
    await page.screenshot(path=f"{prefix}-top.png", full_page=False)
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await page.wait_for_timeout(500)
    await page.screenshot(path=f"{prefix}-bottom.png", full_page=False)
    await page.evaluate("window.scrollTo(0, 0)")
    await page.wait_for_timeout(300)

    if name == "home":
        try:
            plus_btn = page.locator("button[aria-label='Open action menu']")
            if await plus_btn.is_visible(timeout=2000):
                await plus_btn.click()
                await page.wait_for_timeout(800)
                await page.screenshot(path=f"{prefix}-plusmenu.png", full_page=False)
                await page.keyboard.press("Escape")
                await page.wait_for_timeout(300)
        except Exception as e:
            print(f"  PlusMenu fail: {e}")

    if name == "settings":
        for tab in ["Account", "General", "Notifications", "Secrets"]:
            try:
                t = page.locator(f"text={tab}").first
                if await t.is_visible(timeout=1000):
                    await t.click()
                    await page.wait_for_timeout(500)
                    await page.screenshot(path=f"{prefix}-{tab.lower()}.png")
                    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                    await page.wait_for_timeout(300)
                    await page.screenshot(path=f"{prefix}-{tab.lower()}-btm.png")
                    await page.evaluate("window.scrollTo(0, 0)")
            except Exception as e:
                print(f"  Settings {tab} fail: {e}")

    if name == "library":
        for tab in ["Artifacts", "Files"]:
            try:
                t = page.locator(f"text={tab}").first
                if await t.is_visible(timeout=1000):
                    await t.click()
                    await page.wait_for_timeout(500)
                    await page.screenshot(path=f"{prefix}-{tab.lower()}.png")
            except Exception as e:
                print(f"  Library {tab} fail: {e}")

    print(f"  OK: {vp_name}-{name}")

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        for vp_name, vp in [("mobile", MOBILE), ("desktop", DESKTOP)]:
            print(f"\n=== {vp_name.upper()} ===")
            ctx = await browser.new_context(viewport=vp)
            page = await ctx.new_page()
            for path, name in PAGES:
                try:
                    await audit_page(page, path, name, vp_name, vp)
                except Exception as e:
                    print(f"  FAIL: {vp_name}-{name}: {e}")
            await ctx.close()
        await browser.close()
    print(f"\nTotal: {len(os.listdir(OUT))} screenshots in {OUT}")

asyncio.run(main())
