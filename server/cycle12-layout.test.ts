import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

function readFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8");
}

describe("Cycle 12 — UI Component & Layout Parity Fixes", () => {
  describe("AppLayout sidebar structure", () => {
    const src = readFile("client/src/components/AppLayout.tsx");

    it("sidebar width is 260px (narrower than 280px)", () => {
      expect(src).toContain('w-[260px]');
      expect(src).not.toContain('w-[280px]');
    });

    it("has a scrollable middle section wrapping task list through referral", () => {
      expect(src).toContain("Scrollable Middle Section");
      expect(src).toContain("flex-1 overflow-y-auto overscroll-contain min-h-0");
    });

    it("auth section is pinned at bottom with shrink-0", () => {
    const layoutSrc = readFileSync(join(ROOT, "client/src/components/AppLayout.tsx"), "utf8");
    // Bottom icon bar is pinned with shrink-0
    expect(layoutSrc).toContain("shrink-0 bg-sidebar");
  });

    it("SidebarNav no longer has max-h-[40vh] constraint", () => {
      expect(src).not.toContain("max-h-[40vh]");
    });

    it("main content area has min-h-0 for proper flex overflow", () => {
      expect(src).toContain("flex-1 flex flex-col min-w-0 min-h-0");
    });

    it("main element has min-h-0", () => {
      expect(src).toContain("flex-1 overflow-hidden min-h-0");
    });

    it("mobile drawer has safe-area-inset padding", () => {
      expect(src).toContain("env(safe-area-inset-top, 0px)");
      expect(src).toContain("env(safe-area-inset-bottom, 0px)");
    });
  });

  describe("TaskView header fixes", () => {
    const src = readFile("client/src/pages/TaskView.tsx");

    it("header has gap-2 for proper spacing between left info and right actions", () => {
      expect(src).toContain("border-b border-border shrink-0 gap-2");
    });

    it("More menu dropdown has z-[60] and max-height with overflow", () => {
      expect(src).toContain("z-[60]");
      expect(src).toContain("max-h-[calc(100vh-6rem)] overflow-y-auto");
    });
  });

  describe("SettingsPage scrollability", () => {
    const src = readFile("client/src/pages/SettingsPage.tsx");

    it("outer container has min-h-0 for flex overflow", () => {
      expect(src).toContain("h-full flex flex-col md:flex-row min-h-0");
    });

    it("settings sidebar is scrollable", () => {
      expect(src).toContain("overflow-y-auto");
    });

    it("content area has min-h-0", () => {
      expect(src).toContain("flex-1 overflow-y-auto p-4 md:p-6 min-h-0");
    });
  });
});
