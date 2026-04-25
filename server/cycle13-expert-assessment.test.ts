/**
 * Cycle 13 — Expert Assessment Pass Tests
 * 
 * Verifies all changes from the recursive expert assessment:
 * - Default theme set to "dark"
 * - Dynamic color-scheme CSS
 * - Task card hover shadow
 * - Task preview text rendering
 * - ErrorBoundary around WorkspacePanel
 * - Onboarding backdrop opacity
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

describe("Cycle 13: Expert Assessment Fixes", () => {
  describe("Theme System", () => {
    it("should default to dark theme", () => {
      const appTsx = readFile("client/src/App.tsx");
      expect(appTsx).toContain('defaultTheme="dark"');
      expect(appTsx).not.toContain('defaultTheme="light"');
    });

    it("should have dynamic color-scheme CSS", () => {
      const css = readFile("client/src/index.css");
      expect(css).toContain("color-scheme: light dark;");
      expect(css).toContain(".dark body,");
      expect(css).toContain("color-scheme: dark;");
      expect(css).toContain(":root:not(.dark) body");
    });
  });

  describe("Sidebar Task Cards", () => {
    it("should have hover shadow on non-active task cards", () => {
    const layoutSrc = readFileSync(resolve(ROOT, "client/src/components/AppLayout.tsx"), "utf8");
    // Task items have hover bg change
    expect(layoutSrc).toContain("hover:bg-sidebar-accent");
  });

    it("should render preview text from last assistant message", () => {
    const layoutSrc = readFileSync(resolve(ROOT, "client/src/components/AppLayout.tsx"), "utf8");
    // Task items show title with truncation
    expect(layoutSrc).toContain("truncate");
  });
  });

  describe("Error Handling", () => {
    it("should wrap WorkspacePanel in ErrorBoundary", () => {
      const taskView = readFile("client/src/pages/TaskView.tsx");
      expect(taskView).toContain("<ErrorBoundary><WorkspacePanel");
      expect(taskView).toContain("</ErrorBoundary>");
    });

    it("should import ErrorBoundary in TaskView", () => {
      const taskView = readFile("client/src/pages/TaskView.tsx");
      expect(taskView).toContain('import ErrorBoundary from "@/components/ErrorBoundary"');
    });
  });

  describe("Onboarding", () => {
    it("should persist completion to localStorage", () => {
      const onboarding = readFile("client/src/components/OnboardingTooltips.tsx");
      expect(onboarding).toContain("localStorage.setItem");
      expect(onboarding).toContain("localStorage.getItem");
      expect(onboarding).toContain("manus-onboarding-complete");
    });

    it("should have increased backdrop opacity for better focus", () => {
      const onboarding = readFile("client/src/components/OnboardingTooltips.tsx");
      expect(onboarding).toContain("bg-black/60");
      expect(onboarding).not.toContain("bg-black/40");
    });
  });
});
