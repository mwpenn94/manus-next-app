/**
 * P26 Tests — Mobile Responsive Polish
 *
 * Covers: viewport-fit, theme-color meta, MobileBottomNav, safe-area-insets,
 * responsive grid patterns, touch targets, and Analytics page mobile layout.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8");
}

describe("P26 — Mobile Responsive Polish", () => {
  describe("Viewport & Meta Tags", () => {
    it("index.html has viewport-fit=cover for iOS safe areas", () => {
      const html = readFile("client/index.html");
      expect(html).toContain("viewport-fit=cover");
    });

    it("has theme-color meta tags for both dark and light modes", () => {
      const html = readFile("client/index.html");
      expect(html).toContain('media="(prefers-color-scheme: dark)"');
      expect(html).toContain('media="(prefers-color-scheme: light)"');
    });

    it("has apple-mobile-web-app-capable meta tag", () => {
      const html = readFile("client/index.html");
      expect(html).toContain("apple-mobile-web-app-capable");
    });
  });

  describe("MobileBottomNav", () => {
    const nav = readFile("client/src/components/MobileBottomNav.tsx");

    it("includes core navigation items in MORE_ITEMS", () => {
      // Analytics is not a separate mobile nav item (embedded in billing/settings)
      // Core items: Projects, Library, Skills, Schedule, Connectors, Settings, Help
      expect(nav).toContain('path: "/projects"');
      expect(nav).toContain('path: "/library"');
      expect(nav).toContain('path: "/skills"');
      expect(nav).toContain('path: "/schedule"');
      expect(nav).toContain('path: "/connectors"');
    });

    it("includes Settings in MORE_ITEMS (Manus alignment)", () => {
      expect(nav).toContain('path: "/settings"');
      expect(nav).toContain("Settings");
    });

    it("uses safe-area-inset-bottom for bottom nav padding", () => {
      expect(nav).toContain("safe-area-inset-bottom");
    });

    it("has minimum 44px touch targets", () => {
      expect(nav).toContain("min-h-[44px]");
    });

    it("has accessible touch targets in More menu", () => {
      // More menu items have adequate touch targets via py-2.5 padding
      expect(nav).toContain("py-2.5");
    });

    it("auto-closes More menu on navigation via useEffect", () => {
      expect(nav).toContain("useEffect");
      expect(nav).toContain("setMoreOpen(false)");
    });

    it("uses md:hidden to only show on mobile", () => {
      expect(nav).toContain("md:hidden");
    });

    it("has backdrop-blur on bottom nav bar", () => {
      expect(nav).toContain("backdrop-blur-md");
    });

    it("has list layout for More menu items (current design)", () => {
      // More menu uses vertical list layout with space-y spacing
      expect(nav).toContain("space-y-0.5");
    });

    it("positions More panel above the bottom nav using safe-area calc", () => {
      expect(nav).toContain("calc(3.5rem + env(safe-area-inset-bottom, 0px))");
    });
  });

  describe("AnalyticsPage Mobile Layout", () => {
    const analytics = readFile("client/src/pages/AnalyticsPage.tsx");

    it("uses responsive padding (px-4 md:px-6)", () => {
      expect(analytics).toContain("px-4 md:px-6");
    });

    it("uses responsive vertical padding (py-6 md:py-8)", () => {
      expect(analytics).toContain("py-6 md:py-8");
    });

    it("header stacks on mobile (flex-col sm:flex-row)", () => {
      expect(analytics).toContain("flex-col sm:flex-row");
    });

    it("day selector buttons wrap on mobile", () => {
      expect(analytics).toContain("flex-wrap");
    });

    it("metric cards use responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-4)", () => {
      expect(analytics).toContain("grid-cols-1 sm:grid-cols-2 lg:grid-cols-4");
    });

    it("chart containers use responsive padding (p-4 md:p-5)", () => {
      expect(analytics).toContain("p-4 md:p-5");
    });

    it("chart grid uses responsive gap (gap-4 md:gap-6)", () => {
      expect(analytics).toContain("gap-4 md:gap-6");
    });
  });

  describe("SettingsPage Mobile Layout", () => {
    const settings = readFile("client/src/pages/SettingsPage.tsx");

    it("Appearance grid stacks on mobile (grid-cols-1 sm:grid-cols-3)", () => {
      expect(settings).toContain("grid-cols-1 sm:grid-cols-3");
    });

    it("Connection stats grid stacks on mobile", () => {
      const matches = settings.match(/grid-cols-1 sm:grid-cols-3/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("TaskView Mobile Input", () => {
    const taskView = readFile("client/src/pages/TaskView.tsx");

    it("input container uses mobile padding (px-3 md:px-6)", () => {
      expect(taskView).toContain("px-3 md:px-6");
    });

    it("input container uses safe-area-inset-bottom", () => {
      expect(taskView).toContain("safe-area-inset-bottom");
    });

    it("plus button has larger touch target on mobile (w-8 h-8 md:w-7 md:h-7)", () => {
      expect(taskView).toContain("w-8 h-8 md:w-7 md:h-7");
    });
  });

  describe("Home Page Mobile Layout", () => {
    const home = readFile("client/src/pages/Home.tsx");

    it("suggestion cards use horizontal scroll layout", () => {
      // P34: Cards now use horizontal scroll like Manus instead of grid
      expect(home).toContain("overflow-x-auto");
    });

    it("input has max-width constraint", () => {
      expect(home).toContain("max-w-[640px]");
    });

    it("quick action chips are horizontally scrollable", () => {
      expect(home).toContain("overflow-x-auto");
    });
  });
});
