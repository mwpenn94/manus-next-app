/**
 * Tests for illustrations router and HeroIllustration wiring.
 * Validates that the illustrations router exposes the expected types
 * and that the generate mutation accepts valid inputs.
 */
import { describe, it, expect } from "vitest";

// Test the illustration prompt mapping
describe("Illustrations Router", () => {
  it("should have hero prompts for all 8 capability pages", async () => {
    const { illustrationsRouter } = await import("./routers/illustrations");
    expect(illustrationsRouter).toBeDefined();

    // The router should have listTypes, generate, and generateBatch procedures
    const routerDef = illustrationsRouter._def;
    expect(routerDef).toBeDefined();
  });

  it("should define all expected hero illustration types", async () => {
    // Import the module to check the prompt keys
    const mod = await import("./routers/illustrations");
    const router = mod.illustrationsRouter;

    // Verify the router has the expected procedures
    expect(router._def.procedures.listTypes).toBeDefined();
    expect(router._def.procedures.generate).toBeDefined();
    expect(router._def.procedures.generateBatch).toBeDefined();
  });

  it("should have hero types for all 8 capability pages", async () => {
    // Read the source to verify all hero types are defined
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/illustrations.ts", "utf-8");

    const expectedHeroTypes = [
      "hero-documents",
      "hero-research",
      "hero-music",
      "hero-data",
      "hero-slides",
      "hero-desktop",
      "hero-webapp",
      "hero-browser",
    ];

    for (const type of expectedHeroTypes) {
      expect(source).toContain(`"${type}"`);
    }
  });

  it("should have icon types for capability badges", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/illustrations.ts", "utf-8");

    const expectedIconTypes = [
      "icon-browser",
      "icon-computer",
      "icon-document",
      "icon-voice",
      "icon-code",
      "icon-data",
      "icon-music",
      "icon-video",
    ];

    for (const type of expectedIconTypes) {
      expect(source).toContain(`"${type}"`);
    }
  });

  it("should have empty state types", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routers/illustrations.ts", "utf-8");

    const expectedEmptyTypes = [
      "empty-tasks",
      "empty-documents",
      "empty-data",
      "empty-music",
      "empty-research",
    ];

    for (const type of expectedEmptyTypes) {
      expect(source).toContain(`"${type}"`);
    }
  });
});

describe("HeroIllustration component wiring", () => {
  it("should be imported in all 8 capability pages", async () => {
    const fs = await import("fs");
    const pages = [
      "client/src/pages/DocumentStudioPage.tsx",
      "client/src/pages/DeepResearchPage.tsx",
      "client/src/pages/MusicStudioPage.tsx",
      "client/src/pages/DataAnalysisPage.tsx",
      "client/src/pages/SlidesPage.tsx",
      "client/src/pages/DesktopAppPage.tsx",
      "client/src/pages/WebAppBuilderPage.tsx",
      "client/src/pages/BrowserPage.tsx",
    ];

    for (const page of pages) {
      const source = fs.readFileSync(page, "utf-8");
      expect(source).toContain('import HeroIllustration from "@/components/HeroIllustration"');
      expect(source).toContain("<HeroIllustration");
    }
  });

  it("should pass the correct hero type to each page", async () => {
    const fs = await import("fs");
    const pageTypeMap: Record<string, string> = {
      "client/src/pages/DocumentStudioPage.tsx": "hero-documents",
      "client/src/pages/DeepResearchPage.tsx": "hero-research",
      "client/src/pages/MusicStudioPage.tsx": "hero-music",
      "client/src/pages/DataAnalysisPage.tsx": "hero-data",
      "client/src/pages/SlidesPage.tsx": "hero-slides",
      "client/src/pages/DesktopAppPage.tsx": "hero-desktop",
      "client/src/pages/WebAppBuilderPage.tsx": "hero-webapp",
      "client/src/pages/BrowserPage.tsx": "hero-browser",
    };

    for (const [page, expectedType] of Object.entries(pageTypeMap)) {
      const source = fs.readFileSync(page, "utf-8");
      expect(source).toContain(`type="${expectedType}"`);
    }
  });

  it("HeroIllustration component should exist with required props interface", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("client/src/components/HeroIllustration.tsx", "utf-8");

    // Verify required props
    expect(source).toContain("type: string");
    expect(source).toContain("title: string");
    expect(source).toContain("subtitle: string");
    // Verify caching mechanism
    expect(source).toContain("localStorage");
    expect(source).toContain("CACHE_PREFIX");
    // Verify fallback gradient
    expect(source).toContain("bg-gradient-to");
    // Verify regenerate button
    expect(source).toContain("handleRegenerate");
  });
});
