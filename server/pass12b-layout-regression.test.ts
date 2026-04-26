/**
 * Pass 12B: Layout Regression Fix Tests
 * 
 * Verifies that the AppLayout children wrapper does NOT have overflow-hidden,
 * which was causing content cutoff on Billing, Settings, Discover, and other pages.
 * 
 * Root cause: In Passes 6-10, the children wrapper was changed from:
 *   <main className="flex-1 overflow-hidden min-h-0">{children}</main>
 * to:
 *   <main className="flex-1 flex flex-col overflow-hidden min-h-0">
 *     <div className="flex-1 overflow-hidden min-h-0">{children}</div>
 *     <MobileBottomNav />
 *   </main>
 * 
 * The nested overflow-hidden div clipped all page content.
 * Fix: Reverted to simple <main className="flex-1 min-h-0">{children}</main>
 * with MobileBottomNav outside <main>.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const readFile = (relPath: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");

describe("Pass 12B: Layout Regression Fix", () => {
  const appLayout = readFile("client/src/components/AppLayout.tsx");

  describe("AppLayout main content area", () => {
    it("main element does NOT have overflow-hidden class", () => {
      // Find the <main element and its className
      const mainMatch = appLayout.match(/<main[^>]*className="([^"]+)"/);
      expect(mainMatch).toBeTruthy();
      const mainClasses = mainMatch![1];
      expect(mainClasses).not.toContain("overflow-hidden");
    });

    it("main element has flex-1 and min-h-0 for proper flex layout", () => {
      const mainMatch = appLayout.match(/<main[^>]*className="([^"]+)"/);
      expect(mainMatch).toBeTruthy();
      const mainClasses = mainMatch![1];
      expect(mainClasses).toContain("flex-1");
      expect(mainClasses).toContain("min-h-0");
    });

    it("children are rendered directly inside main without overflow-hidden wrapper", () => {
      // Find the <main> block
      const mainStart = appLayout.indexOf("<main");
      const mainEnd = appLayout.indexOf("</main>");
      const mainBlock = appLayout.slice(mainStart, mainEnd);
      
      // There should be {children} directly in main, not wrapped in overflow-hidden div
      expect(mainBlock).toContain("{children}");
      // No overflow-hidden div wrapping children
      const childrenPos = mainBlock.indexOf("{children}");
      const beforeChildren = mainBlock.slice(0, childrenPos);
      expect(beforeChildren).not.toContain('overflow-hidden');
    });

    it("MobileBottomNav is outside main element", () => {
      const mainEnd = appLayout.indexOf("</main>");
      const mobileNavPos = appLayout.indexOf("<MobileBottomNav />");
      expect(mobileNavPos).toBeGreaterThan(mainEnd);
    });
  });

  describe("Pages with scrollable content", () => {
    const pages = [
      { name: "SettingsPage", path: "client/src/pages/SettingsPage.tsx" },
      { name: "BillingPage", path: "client/src/pages/BillingPage.tsx" },
      { name: "DiscoverPage", path: "client/src/pages/DiscoverPage.tsx" },
      { name: "Home", path: "client/src/pages/Home.tsx" },
    ];

    pages.forEach(({ name, path: filePath }) => {
      it(`${name} has overflow-y-auto or overflow-auto for scrolling`, () => {
        const src = readFile(filePath);
        const hasScroll = src.includes("overflow-y-auto") || src.includes("overflow-auto");
        expect(hasScroll).toBe(true);
      });

      it(`${name} has pb-mobile-nav for bottom nav spacing`, () => {
        const src = readFile(filePath);
        expect(src).toContain("pb-mobile-nav");
      });
    });
  });

  describe("Discover page category pills", () => {
    const discoverSrc = readFile("client/src/pages/DiscoverPage.tsx");

    it("category pills have whitespace-nowrap to prevent text wrapping", () => {
      expect(discoverSrc).toContain("whitespace-nowrap");
    });

    it("category container has overflow-x-auto for horizontal scrolling", () => {
      expect(discoverSrc).toContain("overflow-x-auto");
    });
  });

  describe("Connectors page exists and has OAuth providers", () => {
    const connectorsSrc = readFile("client/src/pages/ConnectorsPage.tsx");

    it("ConnectorsPage has GitHub connector", () => {
      expect(connectorsSrc).toContain("GitHub");
    });

    it("ConnectorsPage has OAuth connectors set", () => {
      expect(connectorsSrc).toContain("OAUTH_CONNECTORS");
    });

    it("ConnectorsPage has scrollable root", () => {
      const hasScroll = connectorsSrc.includes("overflow-y-auto") || connectorsSrc.includes("overflow-auto");
      expect(hasScroll).toBe(true);
    });
  });
});
