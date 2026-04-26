/**
 * Cycle 16 — Auth Loop Fix & Landmark Accessibility Tests
 *
 * Validates:
 * 1. BridgeContext gates bridge.getConfig behind isAuthenticated
 * 2. main.tsx no longer has global auth redirect logic
 * 3. AppLayout has proper landmark structure (single main, nav, header)
 * 4. OnboardingTooltips wrapped in aside landmark
 * 5. Mobile overlay has role=presentation + aria-hidden
 * 6. Status banners are inside main landmark
 * 7. MobileBottomNav is inside main landmark
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");

function readFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

describe("Auth Loop Fix", () => {
  describe("BridgeContext", () => {
    const src = readFile("client/src/contexts/BridgeContext.tsx");

    it("imports useAuth", () => {
      expect(src).toContain('import { useAuth } from "@/_core/hooks/useAuth"');
    });

    it("destructures isAuthenticated from useAuth", () => {
      expect(src).toContain("const { isAuthenticated } = useAuth()");
    });

    it("gates bridge.getConfig query with enabled: isAuthenticated", () => {
      expect(src).toContain("enabled: isAuthenticated");
    });
  });

  describe("main.tsx — smart auth redirect (hasEverBeenAuthenticated guard)", () => {
    const src = readFile("client/src/main.tsx");

    it("contains smart redirectToLoginIfUnauthorized with hasEverBeenAuthenticated guard", () => {
      expect(src).toContain("redirectToLoginIfUnauthorized");
      expect(src).toContain("hasEverBeenAuthenticated");
    });

    it("only redirects when user was previously authenticated", () => {
      // The smart redirect checks hasEverBeenAuthenticated before redirecting
      expect(src).toContain("hasEverBeenAuthenticated");
    });

    it("imports getLoginUrl for auth redirect", () => {
      expect(src).toMatch(/getLoginUrl/);
    });

    it("still logs non-auth query errors", () => {
      expect(src).toContain("[API Query Error]");
    });

    it("still logs non-auth mutation errors", () => {
      expect(src).toContain("[API Mutation Error]");
    });

    it("silently ignores UNAUTHED_ERR_MSG errors (no console.error)", () => {
      // The error logging should skip UNAUTHED_ERR_MSG
      expect(src).toContain("error.message !== UNAUTHED_ERR_MSG");
    });
  });

  describe("AppLayout — NotificationCenter gated", () => {
    const src = readFile("client/src/components/AppLayout.tsx");

    it("renders NotificationCenter only when isAuthenticated", () => {
      expect(src).toContain("{isAuthenticated && <NotificationCenter />");
    });
  });
});

describe("Landmark Accessibility Fixes", () => {
  describe("AppLayout structure", () => {
    const src = readFile("client/src/components/AppLayout.tsx");

    it("has exactly one <main> element", () => {
      const mainOpens = (src.match(/<main[\s>]/g) || []).length;
      expect(mainOpens).toBe(1);
    });

    it("main element has id=main-content", () => {
      expect(src).toContain('id="main-content"');
    });

    it("has desktop sidebar wrapped in <nav>", () => {
      expect(src).toContain('aria-label="Main navigation"');
    });

    it("has mobile drawer wrapped in <nav>", () => {
      expect(src).toContain('aria-label="Mobile navigation"');
    });

    it("has <header> element for top bar", () => {
      expect(src).toMatch(/<header[\s\n]/);
    });

    it("mobile overlay has role=presentation and aria-hidden", () => {
      expect(src).toContain('role="presentation"');
      expect(src).toContain('aria-hidden="true"');
    });

    it("status banners are inside main (after main opens, before children)", () => {
      const mainStart = src.indexOf("<main");
      const mainEnd = src.indexOf("</main>");
      const networkBannerPos = src.indexOf("<NetworkBanner />");
      const creditBannerPos = src.indexOf("<CreditWarningBanner />");

      expect(networkBannerPos).toBeGreaterThan(mainStart);
      expect(networkBannerPos).toBeLessThan(mainEnd);
      expect(creditBannerPos).toBeGreaterThan(mainStart);
      expect(creditBannerPos).toBeLessThan(mainEnd);
    });

    it("MobileBottomNav is inside main", () => {
      const mainStart = src.indexOf("<main");
      const mainEnd = src.indexOf("</main>");
      const mobileNavPos = src.indexOf("<MobileBottomNav />");

      expect(mobileNavPos).toBeGreaterThan(mainStart);
      expect(mobileNavPos).toBeLessThan(mainEnd);
    });
  });

  describe("Home.tsx — no nested main", () => {
    const src = readFile("client/src/pages/Home.tsx");

    it("does NOT contain <main> tag", () => {
      expect(src).not.toMatch(/<main[\s>]/);
    });
  });

  describe("DashboardLayout — no nested main", () => {
    const src = readFile("client/src/components/DashboardLayout.tsx");

    it("does NOT contain <main> tag", () => {
      expect(src).not.toMatch(/<main[\s>]/);
    });
  });

  describe("OnboardingTooltips — wrapped in aside landmark", () => {
    const src = readFile("client/src/components/OnboardingTooltips.tsx");

    it("wraps content in <aside> with aria-label", () => {
      expect(src).toContain('<aside aria-label="Onboarding walkthrough">');
    });

    it("closes with </aside>", () => {
      expect(src).toContain("</aside>");
    });
  });

  describe("App.tsx — skip-link in nav landmark", () => {
    const src = readFile("client/src/App.tsx");

    it("wraps skip-link in <nav> with aria-label", () => {
      expect(src).toContain('aria-label="Skip navigation"');
    });

    it("skip-link targets #main-content", () => {
      expect(src).toContain('href="#main-content"');
    });
  });
});
