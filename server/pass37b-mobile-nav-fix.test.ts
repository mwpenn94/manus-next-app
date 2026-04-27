/**
 * Pass 37b: Mobile Bottom Nav Content Overlap Fix
 *
 * Validates that AppLayout.tsx has proper bottom padding on mobile
 * to prevent the fixed MobileBottomNav from overlapping page content.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const APP_LAYOUT_PATH = resolve(__dirname, "../client/src/components/AppLayout.tsx");
const MOBILE_NAV_PATH = resolve(__dirname, "../client/src/components/MobileBottomNav.tsx");
const APP_TSX_PATH = resolve(__dirname, "../client/src/App.tsx");

describe("Pass 37b: Mobile Bottom Nav Content Overlap Fix", () => {
  const appLayoutSrc = readFileSync(APP_LAYOUT_PATH, "utf-8");
  const mobileNavSrc = readFileSync(MOBILE_NAV_PATH, "utf-8");
  const appTsxSrc = readFileSync(APP_TSX_PATH, "utf-8");

  describe("AppLayout main content padding", () => {
    it("should have bottom padding on mobile for the main content area", () => {
      // The main element with id="main-content" must have mobile bottom padding
      // to account for the fixed MobileBottomNav (h-14 = 3.5rem = 56px)
      expect(appLayoutSrc).toMatch(/id="main-content"/);
      // Must have pb- class that accounts for 3.5rem (56px) on mobile
      expect(appLayoutSrc).toMatch(/pb-\[calc\(3\.5rem\+env\(safe-area-inset-bottom/);
    });

    it("should have zero bottom padding on desktop (md:pb-0)", () => {
      // Desktop should not have bottom padding since MobileBottomNav is hidden
      expect(appLayoutSrc).toMatch(/md:pb-0/);
    });

    it("should render MobileBottomNav component", () => {
      expect(appLayoutSrc).toContain("MobileBottomNav");
      expect(appLayoutSrc).toContain("<MobileBottomNav");
    });
  });

  describe("MobileBottomNav structure", () => {
    it("should be fixed at the bottom", () => {
      expect(mobileNavSrc).toMatch(/fixed\s+bottom-0/);
    });

    it("should have h-14 height (56px)", () => {
      expect(mobileNavSrc).toContain("h-14");
    });

    it("should be hidden on desktop (md:hidden)", () => {
      expect(mobileNavSrc).toContain("md:hidden");
    });

    it("should include safe-area-inset-bottom for iOS", () => {
      expect(mobileNavSrc).toContain("safe-area-inset-bottom");
    });

    it("should have primary nav items: Home, Tasks, Billing", () => {
      expect(mobileNavSrc).toContain('"Home"');
      expect(mobileNavSrc).toContain('"Tasks"');
      expect(mobileNavSrc).toContain('"Billing"');
    });

    it("should include GitHub in MORE_ITEMS", () => {
      expect(mobileNavSrc).toContain('"GitHub"');
      expect(mobileNavSrc).toContain('"/github"');
    });
  });

  describe("Routing: /github → GitHubPage", () => {
    it("should import GitHubPage as lazy component", () => {
      expect(appTsxSrc).toMatch(/GitHubPage.*=.*lazy.*import.*GitHubPage/);
    });

    it("should have /github route mapping to GitHubPage", () => {
      expect(appTsxSrc).toMatch(/path="\/github"/);
      expect(appTsxSrc).toContain("<GitHubPage />");
    });

    it("should have /github/:repoId route for repo detail", () => {
      expect(appTsxSrc).toMatch(/path="\/github\/:repoId"/);
    });

    it("should place /github routes before the catch-all NotFound", () => {
      const githubIdx = appTsxSrc.indexOf('path="/github"');
      const notFoundIdx = appTsxSrc.lastIndexOf("component={NotFound}");
      expect(githubIdx).toBeGreaterThan(-1);
      expect(notFoundIdx).toBeGreaterThan(-1);
      expect(githubIdx).toBeLessThan(notFoundIdx);
    });
  });

  describe("Depth scan: edge cases", () => {
    it("main content should use flex-1 min-h-0 to constrain children", () => {
      // The main element must use flex-1 and min-h-0 so children with h-full
      // are properly constrained within the available space
      expect(appLayoutSrc).toMatch(/id="main-content"[\s\S]*?flex-1[\s\S]*?min-h-0/);
    });

    it("MobileBottomNav should be outside the main content area", () => {
      // MobileBottomNav must be rendered after </main> to avoid clipping
      const mainCloseIdx = appLayoutSrc.indexOf("</main>");
      const mobileNavIdx = appLayoutSrc.indexOf("<MobileBottomNav");
      expect(mainCloseIdx).toBeGreaterThan(-1);
      expect(mobileNavIdx).toBeGreaterThan(-1);
      expect(mobileNavIdx).toBeGreaterThan(mainCloseIdx);
    });

    it("should not have duplicate bottom padding classes", () => {
      // Ensure we don't have conflicting pb- classes
      const mainContentLine = appLayoutSrc
        .split("\n")
        .find((l) => l.includes('id="main-content"') || l.includes("flex-1 min-h-0 flex flex-col"));
      // Find the className line near main-content
      const lines = appLayoutSrc.split("\n");
      const mainIdx = lines.findIndex((l) => l.includes('id="main-content"'));
      // Check the surrounding lines for the className
      const classLine = lines.slice(Math.max(0, mainIdx - 2), mainIdx + 5).join(" ");
      // Should have exactly one pb- pattern (the calc one) and one md:pb-0
      const pbMatches = classLine.match(/pb-/g);
      expect(pbMatches).toBeTruthy();
      // Should have 2: the mobile pb and the md:pb-0
      expect(pbMatches!.length).toBe(2);
    });
  });
});
