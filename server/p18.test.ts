/**
 * P18 Tests — Settings crash fix, Library bulk export, Kokoro voice preview, Offline mode
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

/* ─── P18-1: Settings crash fix ─── */
describe("P18-1: Settings crash fix (.toFixed on undefined)", () => {
  const settingsPage = read("client/src/pages/SettingsPage.tsx");

  it("merges server generalSettings with DEFAULT_GENERAL on hydration", () => {
    // The fix: { ...DEFAULT_GENERAL, ...gs } ensures missing fields get defaults
    expect(settingsPage).toMatch(/\{\s*\.\.\.DEFAULT_GENERAL,\s*\.\.\.gs\s*\}/);
  });

  it("has defensive guard on ttsRate.toFixed", () => {
    // Should use (generalSettings.ttsRate ?? 1.0).toFixed or similar
    expect(settingsPage).toMatch(/ttsRate\s*\?\?/);
  });

  it("GeneralSettings interface includes ttsRate field", () => {
    expect(settingsPage).toMatch(/ttsRate:\s*number/);
  });

  it("DEFAULT_GENERAL includes ttsRate with value 1.0", () => {
    expect(settingsPage).toMatch(/ttsRate:\s*1\.0/);
  });
});

/* ─── P18-2: Library bulk export ─── */
describe("P18-2: Library bulk export", () => {
  const library = read("client/src/pages/Library.tsx");

  it("dynamically imports JSZip for client-side ZIP creation", () => {
    expect(library).toMatch(/import\(["']jszip["']\)/);
  });

  it("has selectedIds state for multi-select", () => {
    expect(library).toMatch(/selectedIds/);
  });

  it("has selectMode toggle state", () => {
    expect(library).toMatch(/selectMode/);
  });

  it("has handleBulkExport function", () => {
    expect(library).toMatch(/handleBulkExport/);
  });

  it("creates ZIP file with selected items", () => {
    expect(library).toMatch(/new\s+JSZip/);
  });

  it("generates downloadable blob from ZIP", () => {
    expect(library).toMatch(/generateAsync/);
  });

  it("has Select All / Deselect All functionality", () => {
    expect(library).toMatch(/Select All|Deselect All/);
  });

  it("shows Download as ZIP button when items are selected", () => {
    expect(library).toMatch(/Download.*ZIP|Download as ZIP/);
  });
});

/* ─── P18-3: Kokoro voice preview ─── */
describe("P18-3: Kokoro voice preview", () => {
  const clientInference = read("client/src/pages/ClientInferencePage.tsx");

  it("has previewingVoice state", () => {
    expect(clientInference).toMatch(/previewingVoice/);
  });

  it("has handleVoicePreview function", () => {
    expect(clientInference).toMatch(/handleVoicePreview/);
  });

  it("speaks a preview phrase with the voice name", () => {
    expect(clientInference).toMatch(/Hi, I'm/);
  });

  it("renders Volume2 icon for preview button", () => {
    expect(clientInference).toMatch(/Volume2/);
  });

  it("shows loading spinner during preview", () => {
    expect(clientInference).toMatch(/previewingVoice === voice\.id/);
  });

  it("disables other preview buttons while one is playing", () => {
    expect(clientInference).toMatch(/disabled=\{!!previewingVoice\}/);
  });
});

/* ─── P18-4: Offline mode indicator ─── */
describe("P18-4: Offline mode indicator", () => {
  const settingsPage = read("client/src/pages/SettingsPage.tsx");
  const networkBanner = read("client/src/components/NetworkBanner.tsx");

  it("GeneralSettings interface includes offlineMode field", () => {
    expect(settingsPage).toMatch(/offlineMode:\s*boolean/);
  });

  it("DEFAULT_GENERAL includes offlineMode: false", () => {
    expect(settingsPage).toMatch(/offlineMode:\s*false/);
  });

  it("Settings has Offline mode toggle in the toggle list", () => {
    expect(settingsPage).toMatch(/offlineMode.*Offline mode/s);
  });

  it("NetworkBanner checks for offlineMode preference", () => {
    expect(networkBanner).toMatch(/offlineMode/);
  });

  it("NetworkBanner shows muted banner when offline mode is enabled", () => {
    // After P34 monochrome pass, amber replaced with muted
    expect(networkBanner).toMatch(/bg-muted/);
  });

  it("NetworkBanner displays 'Offline mode' text", () => {
    expect(networkBanner).toMatch(/Offline mode/);
  });

  it("NetworkBanner imports Zap icon for offline mode indicator", () => {
    expect(networkBanner).toMatch(/Zap/);
  });

  it("NetworkBanner queries user preferences to check offline mode", () => {
    expect(networkBanner).toMatch(/preferences\.get/);
  });
});

/* ─── Cross-cutting: no regressions ─── */
describe("P18: No regressions", () => {
  it("Home page still has Manus-aligned design", () => {
    const home = read("client/src/pages/Home.tsx");
    expect(home).toMatch(/Hello/);
    expect(home).toMatch(/SUGGESTIONS/);
    expect(home).toMatch(/QUICK_ACTIONS/);
  });

  it("NotFound page still renders", () => {
    const notFound = read("client/src/pages/NotFound.tsx");
    expect(notFound).toMatch(/404/);
  });

  it("App.tsx still has all core routes", () => {
    const app = read("client/src/App.tsx");
    expect(app).toMatch(/\/settings/);
    expect(app).toMatch(/\/library/);
    expect(app).toMatch(/\/client-inference/);
  });
});
