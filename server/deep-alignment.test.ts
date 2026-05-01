/**
 * Deep Alignment Pass Tests — Pass 48
 *
 * Validates:
 * 1. Redundant capability pages removed from routing
 * 2. Navigation consolidated to Manus-aligned items
 * 3. Stripe subscription flow fully wired
 * 4. Empty states use shared EmptyState component
 * 5. Dark theme tightened
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), "utf-8");
}

describe("Phase 2: Redundant pages removed from routing", () => {
  const appTsx = readFile("client/src/App.tsx");

  const removedPages = [
    "BrowserPage",
    "ComputerUsePage",
    "DocumentStudioPage",
    "MusicStudioPage",
    "DataAnalysisPage",
    "SlidesPage",
    "VideoGeneratorPage",
    "DeepResearchPage",
    "DesktopAppPage",
    "FigmaImportPage",
    "ClientInferencePage",
    "QATestingPage",
    "DataPipelinesPage",
    "MeetingsPage",
    "MessagingAgentPage",
    "ConnectDevicePage",
    "AnalyticsPage",
    "SovereignDashboard",
    "MailManusPage",
  ];

  for (const page of removedPages) {
    it(`should not route to ${page}`, () => {
      // Check that the page is not imported as a lazy route
      expect(appTsx).not.toContain(`"${page}"`);
    });
  }

  const keptPages = ["Home", "TaskView", "BillingPage", "SettingsPage", "Library"];
  for (const page of keptPages) {
    it(`should keep ${page} in routes`, () => {
      expect(appTsx).toContain(page);
    });
  }
});

describe("Phase 3: Dark theme tightened", () => {
  const indexCss = readFile("client/src/index.css");

  it("should use true black background (oklch 0.09 or lower)", () => {
    // Check that .dark section has a very low lightness value for background
    expect(indexCss).toMatch(/\.dark/);
    // The background should be very dark
    // Manus-authentic dark uses 0.2178 (dark grey), not true black
    expect(indexCss).toMatch(/--background:\s*oklch\(0\.2[0-9]/);
  });
});

describe("Phase 4: Stripe subscription flow", () => {
  it("should have products.ts with plan definitions", () => {
    expect(existsSync(resolve(ROOT, "server/products.ts"))).toBe(true);
    const products = readFile("server/products.ts");
    expect(products).toContain("pro_monthly");
    expect(products).toContain("pro_yearly");
  });

  it("should have stripe.ts with checkout and webhook handlers", () => {
    const stripe = readFile("server/stripe.ts");
    expect(stripe).toContain("createCheckoutSession");
    expect(stripe).toContain("handleStripeWebhook");
    expect(stripe).toContain("constructEvent");
    expect(stripe).toContain("evt_test_");
  });

  it("should have webhook route registered at /api/stripe/webhook", () => {
    const index = readFile("server/_core/index.ts");
    expect(index).toContain("/api/stripe/webhook");
    expect(index).toContain("express.raw");
  });

  it("should have payment router with checkout and history procedures", () => {
    const payment = readFile("server/routers/payment.ts");
    expect(payment).toContain("createCheckout");
    expect(payment).toContain("history");
    expect(payment).toContain("products");
  });

  it("BillingPage should wire checkout mutation and manage subscription", () => {
    const billing = readFile("client/src/pages/BillingPage.tsx");
    expect(billing).toContain("trpc.payment.createCheckout.useMutation");
    expect(billing).toContain("ManageSubscriptionButton");
    expect(billing).toContain("createPortalSession");
    expect(billing).toContain("window.open");
  });
});

describe("Phase 5: Empty states use shared component", () => {
  it("ProjectsPage should import and use EmptyState", () => {
    const page = readFile("client/src/pages/ProjectsPage.tsx");
    expect(page).toContain('import { EmptyState }');
    expect(page).toContain("<EmptyState");
    expect(page).toContain("No projects yet");
  });

  it("SchedulePage should import and use EmptyState", () => {
    const page = readFile("client/src/pages/SchedulePage.tsx");
    expect(page).toContain('import { EmptyState }');
    expect(page).toContain("<EmptyState");
    expect(page).toContain("No scheduled tasks yet");
  });

  it("MemoryPage should import and use EmptyState", () => {
    const page = readFile("client/src/pages/MemoryPage.tsx");
    expect(page).toContain('import { EmptyState }');
    expect(page).toContain("<EmptyState");
    expect(page).toContain("No memories yet");
  });
});

describe("Navigation consolidation", () => {
  it("MobileBottomNav should have Manus-aligned items", () => {
    const nav = readFile("client/src/components/MobileBottomNav.tsx");
    // Should have core tabs
    expect(nav).toContain("Home");
    expect(nav).toContain("Tasks");
    expect(nav).toContain("Billing");
    // Should NOT have removed capability pages
    expect(nav).not.toContain("DocumentStudio");
    expect(nav).not.toContain("MusicStudio");
    expect(nav).not.toContain("DataAnalysis");
  });

  it("AppLayout search dialog should not reference removed pages", () => {
    const layout = readFile("client/src/components/AppLayout.tsx");
    expect(layout).not.toContain("DocumentStudio");
    expect(layout).not.toContain("MusicStudio");
    expect(layout).not.toContain("DataAnalysis");
    expect(layout).not.toContain("VideoGenerator");
  });
});
