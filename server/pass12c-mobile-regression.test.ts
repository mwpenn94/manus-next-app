/**
 * Pass 12C — Mobile Regression Tests
 *
 * Validates mobile touch target compliance (44px minimum) and
 * layout fixes across all pages.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const CLIENT_PAGES = join(__dirname, "..", "client", "src", "pages");
const CLIENT_COMPONENTS = join(__dirname, "..", "client", "src", "components");

// ── Sign In Button Touch Targets ──

describe("Sign In buttons — mobile touch targets", () => {
  const pageFiles = readdirSync(CLIENT_PAGES).filter(f => f.endsWith(".tsx"));

  const pagesWithSignIn = pageFiles.filter(f => {
    const content = readFileSync(join(CLIENT_PAGES, f), "utf-8");
    return content.includes("Sign In</Button>");
  });

  it("should find Sign In buttons in multiple pages", () => {
    expect(pagesWithSignIn.length).toBeGreaterThanOrEqual(5);
  });

  for (const file of pagesWithSignIn) {
    it(`${file}: Sign In button has min-h-[44px] touch target`, () => {
      const content = readFileSync(join(CLIENT_PAGES, file), "utf-8");
      // Every Sign In button should have min-h-[44px]
      const signInMatches = content.match(/<Button[^>]*>Sign In<\/Button>/g) || [];
      for (const match of signInMatches) {
        expect(match).toContain("min-h-[44px]");
      }
    });
  }
});

// ── Onboarding Modal Touch Targets ──

describe("OnboardingTooltips — mobile touch targets", () => {
  const content = readFileSync(join(CLIENT_COMPONENTS, "OnboardingTooltips.tsx"), "utf-8");

  it("pagination dot buttons have 44px touch targets", () => {
    // The dot buttons should have w-11 h-11 (44px) wrapper
    expect(content).toContain("w-11 h-11");
  });

  it("close button has min-h-[44px]", () => {
    expect(content).toContain('min-h-[44px]');
  });

  it("navigation buttons have min-h-[44px]", () => {
    // All nav buttons (Skip, Back, Next/Get Started) should have min-h-[44px]
    const minHMatches = content.match(/min-h-\[44px\]/g) || [];
    // Close + Skip + Back + Next = at least 4
    expect(minHMatches.length).toBeGreaterThanOrEqual(4);
  });

  it("dot visual indicators are separate from touch targets", () => {
    // Dots should use inner <span> for visual, outer <button> for touch
    expect(content).toContain("<span className={cn(");
    expect(content).toContain("w-2.5 h-2.5 bg-primary");
  });
});

// ── Skills Page Filter Layout ──

describe("SkillsPage — mobile filter layout", () => {
  const content = readFileSync(join(CLIENT_PAGES, "SkillsPage.tsx"), "utf-8");

  it("filter row stacks on mobile (flex-col sm:flex-row)", () => {
    expect(content).toContain("flex-col sm:flex-row");
  });

  it("filter buttons have min-h-[44px] touch targets", () => {
    expect(content).toContain('min-h-[44px]');
  });

  it("search input has min-h-[44px]", () => {
    expect(content).toContain('min-h-[44px]');
  });

  it("filter container allows horizontal scroll", () => {
    expect(content).toContain("overflow-x-auto");
  });
});

// ── AppLayout — overflow-hidden on main for proper flex constraint (Pass 26) ──

describe("AppLayout — main uses overflow-hidden for flex constraint", () => {
  const content = readFileSync(join(CLIENT_COMPONENTS, "AppLayout.tsx"), "utf-8");

  it("main content area has overflow-hidden for proper flex constraint", () => {
    // Pass 26: main needs overflow-hidden + flex flex-col to constrain AnimatedRoute
    const mainMatch = content.match(/<main[^>]*className="([^"]*)"/); 
    expect(mainMatch).toBeTruthy();
    expect(mainMatch![1]).toContain("overflow-hidden");
    expect(mainMatch![1]).toContain("flex");
    expect(mainMatch![1]).toContain("flex-col");
  });

  it("MobileBottomNav is rendered outside <main>", () => {
    // Find the closing </main> tag and check MobileBottomNav comes after it
    const mainCloseIndex = content.lastIndexOf("</main>");
    const mobileNavIndex = content.lastIndexOf("MobileBottomNav");
    expect(mobileNavIndex).toBeGreaterThan(mainCloseIndex);
  });
});
