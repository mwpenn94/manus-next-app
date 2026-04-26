/**
 * Pass 12B: Layout Regression Fix Tests (Updated Pass 26)
 * 
 * Pass 26 fix: main now uses flex flex-col overflow-hidden to properly constrain
 * the AnimatedRoute wrapper and page roots. Pages use h-full overflow-y-auto to
 * scroll within the constrained space. CSS rule adds padding-bottom on mobile.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const readFile = (relPath: string) =>
  fs.readFileSync(path.resolve(__dirname, "..", relPath), "utf-8");

describe("Pass 12B: Layout Regression Fix", () => {
  const appLayout = readFile("client/src/components/AppLayout.tsx");

  describe("AppLayout main content area", () => {
    it("main element has overflow-hidden for proper flex constraint", () => {
      // Pass 26: main needs overflow-hidden + flex flex-col to constrain AnimatedRoute
      const mainMatch = appLayout.match(/<main[^>]*className="([^"]+)"/);
      expect(mainMatch).toBeTruthy();
      const mainClasses = mainMatch![1];
      expect(mainClasses).toContain("overflow-hidden");
      expect(mainClasses).toContain("flex");
      expect(mainClasses).toContain("flex-col");
    });

    it("main element has flex-1 and min-h-0 for proper flex layout", () => {
      const mainMatch = appLayout.match(/<main[^>]*className="([^"]+)"/);
      expect(mainMatch).toBeTruthy();
      const mainClasses = mainMatch![1];
      expect(mainClasses).toContain("flex-1");
      expect(mainClasses).toContain("min-h-0");
    });

    it("children are rendered inside main via AnimatedRoute", () => {
      // Find the <main> block
      const mainStart = appLayout.indexOf("<main");
      const mainEnd = appLayout.indexOf("</main>");
      const mainBlock = appLayout.slice(mainStart, mainEnd);
      
      // Children should be rendered inside main (via AnimatedRoute wrapper)
      expect(mainBlock).toContain("{children}");
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

      it(`${name} mobile bottom nav spacing handled by universal CSS rule`, () => {
        // pb-mobile-nav is now handled universally via #main-content > * CSS rule in index.css
        const css = readFile("client/src/index.css");
        expect(css).toContain("#main-content > *");
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

    it("ConnectorsPage has OAuth capable connectors set", () => {
      expect(connectorsSrc).toContain("OAUTH_CAPABLE_CONNECTORS");
    });

    it("ConnectorsPage has scrollable root", () => {
      const hasScroll = connectorsSrc.includes("overflow-y-auto") || connectorsSrc.includes("overflow-auto");
      expect(hasScroll).toBe(true);
    });
  });
});
