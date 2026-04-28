/**
 * Pass 46 Completion Tests — Validates PDF export, Tauri scaffold,
 * illustrations router, and mobile nav additions.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

describe("Pass 46 Completion: Slide PDF Export", () => {
  it("slides router exports exportPdf procedure", async () => {
    const content = readFileSync(resolve(ROOT, "server/routers/slides.ts"), "utf-8");
    expect(content).toContain("exportPdf:");
    expect(content).toContain("protectedProcedure");
    expect(content).toContain("storagePut");
  });

  it("SlidesPage renders ExportPdfButton", () => {
    const content = readFileSync(resolve(ROOT, "client/src/pages/SlidesPage.tsx"), "utf-8");
    expect(content).toContain("ExportPdfButton");
    expect(content).toContain("slides.exportPdf");
    expect(content).toContain("Export PDF");
  });
});

describe("Pass 46 Completion: Tauri Scaffold & Artifact Download", () => {
  it("appPublish router has generateTauriScaffold procedure", () => {
    const content = readFileSync(resolve(ROOT, "server/routers/appPublish.ts"), "utf-8");
    expect(content).toContain("generateTauriScaffold:");
    expect(content).toContain("bundleId");
    expect(content).toContain("tauri.conf.json");
    expect(content).toContain("Cargo.toml");
    expect(content).toContain("main.rs");
  });

  it("appPublish router has getArtifactUrl procedure", () => {
    const content = readFileSync(resolve(ROOT, "server/routers/appPublish.ts"), "utf-8");
    expect(content).toContain("getArtifactUrl:");
    expect(content).toContain("buildId");
    expect(content).toContain("artifactUrl");
  });

  it("appPublish imports storagePut", () => {
    const content = readFileSync(resolve(ROOT, "server/routers/appPublish.ts"), "utf-8");
    expect(content).toContain('import { storagePut }');
  });
});

describe("Pass 46 Completion: Illustrations Router", () => {
  it("illustrations router file exists", () => {
    expect(existsSync(resolve(ROOT, "server/routers/illustrations.ts"))).toBe(true);
  });

  it("illustrations router has listTypes, generate, and generateBatch", () => {
    const content = readFileSync(resolve(ROOT, "server/routers/illustrations.ts"), "utf-8");
    expect(content).toContain("listTypes:");
    expect(content).toContain("generate:");
    expect(content).toContain("generateBatch:");
  });

  it("illustrations router has hero, icon, and empty prompt categories", () => {
    const content = readFileSync(resolve(ROOT, "server/routers/illustrations.ts"), "utf-8");
    expect(content).toContain('"hero-documents"');
    expect(content).toContain('"icon-browser"');
    expect(content).toContain('"empty-tasks"');
  });

  it("illustrations router is registered in main routers.ts", () => {
    const content = readFileSync(resolve(ROOT, "server/routers.ts"), "utf-8");
    expect(content).toContain("illustrationsRouter");
    expect(content).toContain("illustrations: illustrationsRouter");
  });
});

describe("Pass 46 Completion: DevToolsSplitView Component", () => {
  it("DevToolsSplitView component exists", () => {
    expect(existsSync(resolve(ROOT, "client/src/components/DevToolsSplitView.tsx"))).toBe(true);
  });

  it("DevToolsSplitView uses ResizablePanelGroup for desktop", () => {
    const content = readFileSync(resolve(ROOT, "client/src/components/DevToolsSplitView.tsx"), "utf-8");
    expect(content).toContain("ResizablePanelGroup");
    expect(content).toContain("ResizableHandle");
    expect(content).toContain("ResizablePanel");
  });

  it("DevToolsSplitView has mobile tabbed fallback", () => {
    const content = readFileSync(resolve(ROOT, "client/src/components/DevToolsSplitView.tsx"), "utf-8");
    expect(content).toContain("md:hidden");
    expect(content).toContain("mobileTab");
    expect(content).toContain("leftLabel");
    expect(content).toContain("rightLabel");
  });
});

describe("Pass 46 Completion: Mobile Navigation", () => {
  it("MobileBottomNav includes all new capability pages", () => {
    const content = readFileSync(resolve(ROOT, "client/src/components/MobileBottomNav.tsx"), "utf-8");
    expect(content).toContain('"/documents"');
    expect(content).toContain('"/slides"');
    expect(content).toContain('"/music"');
    expect(content).toContain('"/research"');
    expect(content).toContain('"/data-analysis"');
    expect(content).toContain('"/desktop"');
    expect(content).toContain('"/webapp"');
  });

  it("MobileBottomNav imports new icons", () => {
    const content = readFileSync(resolve(ROOT, "client/src/components/MobileBottomNav.tsx"), "utf-8");
    expect(content).toContain("FileText");
    expect(content).toContain("Presentation");
    expect(content).toContain("Music");
    expect(content).toContain("FlaskConical");
    expect(content).toContain("Monitor");
    expect(content).toContain("Wand2");
  });
});

describe("Pass 46 Completion: Mobile Responsive Padding", () => {
  it("new pages use responsive padding (px-4 sm:px-6)", () => {
    const pages = ["DeepResearchPage", "MusicStudioPage", "DataAnalysisPage", "DocumentStudioPage"];
    for (const page of pages) {
      const content = readFileSync(resolve(ROOT, `client/src/pages/${page}.tsx`), "utf-8");
      expect(content).toContain("px-4 sm:px-6");
    }
  });
});

describe("Pass 46 Completion: Todo.md Convergence", () => {
  it("has zero uncompleted items", () => {
    const content = readFileSync(resolve(ROOT, "todo.md"), "utf-8");
    const uncompleted = content.match(/^- \[ \]/gm);
    expect(uncompleted).toBeNull();
  });
});
