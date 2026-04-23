/**
 * P24 Tests — Dark/Light Theme Toggle + Persistence
 *
 * Updated for P25 3-mode system: ThemeContext now uses preference/cycleTheme
 * instead of toggleTheme, and Settings has 3 cards.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("P24 — Theme Toggle", () => {
  describe("ThemeContext", () => {
    const src = read("client/src/contexts/ThemeContext.tsx");

    it("exports ThemeProvider component", () => {
      expect(src).toContain("export function ThemeProvider");
    });

    it("exports useTheme hook", () => {
      expect(src).toContain("export function useTheme");
    });

    it("supports switchable prop", () => {
      expect(src).toContain("switchable");
    });

    it("exposes setTheme function", () => {
      expect(src).toContain("setTheme");
    });

    it("exposes cycleTheme function (replaced toggleTheme in P25)", () => {
      expect(src).toContain("cycleTheme");
    });

    it("persists theme to localStorage when switchable", () => {
      expect(src).toContain("localStorage.setItem");
      expect(src).toContain("localStorage.getItem");
    });

    it("adds/removes dark class on document root", () => {
      expect(src).toContain("root.classList.add(\"dark\")");
      expect(src).toContain("root.classList.remove(\"dark\")");
    });

    it("uses useCallback for setTheme", () => {
      expect(src).toContain("useCallback");
    });

    it("defines ThemePreference type with system|light|dark", () => {
      expect(src).toContain("ThemePreference");
    });
  });

  describe("CSS Variables — Light and Dark Themes", () => {
    const css = read("client/src/index.css");

    it("has :root with light theme variables", () => {
      expect(css).toContain(":root");
    });

    it("has .dark class with dark theme overrides", () => {
      expect(css).toContain(".dark");
    });

    it("defines --background in both themes", () => {
      const rootMatch = css.match(/:root\s*\{[^}]*--background/s);
      const darkMatch = css.match(/\.dark\s*\{[^}]*--background/s);
      expect(rootMatch).not.toBeNull();
      expect(darkMatch).not.toBeNull();
    });

    it("defines --foreground in both themes", () => {
      const rootMatch = css.match(/:root\s*\{[^}]*--foreground/s);
      const darkMatch = css.match(/\.dark\s*\{[^}]*--foreground/s);
      expect(rootMatch).not.toBeNull();
      expect(darkMatch).not.toBeNull();
    });

    it("defines --primary in both themes", () => {
      const rootMatch = css.match(/:root\s*\{[^}]*--primary/s);
      const darkMatch = css.match(/\.dark\s*\{[^}]*--primary/s);
      expect(rootMatch).not.toBeNull();
      expect(darkMatch).not.toBeNull();
    });

    it("defines --card in both themes", () => {
      const rootMatch = css.match(/:root\s*\{[^}]*--card/s);
      const darkMatch = css.match(/\.dark\s*\{[^}]*--card/s);
      expect(rootMatch).not.toBeNull();
      expect(darkMatch).not.toBeNull();
    });

    it("uses oklch color format", () => {
      expect(css).toMatch(/oklch\(/);
    });
  });

  describe("App.tsx — ThemeProvider Configuration", () => {
    const app = read("client/src/App.tsx");

    it("imports ThemeProvider and useTheme from ThemeContext", () => {
      expect(app).toContain("ThemeProvider");
      expect(app).toContain("useTheme");
    });

    it("enables switchable on ThemeProvider", () => {
      expect(app).toContain("switchable");
    });

    it("sets defaultTheme to light", () => {
      expect(app).toContain('defaultTheme="light"');
    });

    it("has ThemedToaster component that uses theme", () => {
      expect(app).toContain("ThemedToaster");
      expect(app).toContain("theme === 'dark'");
    });
  });

  describe("SettingsPage — Appearance Section", () => {
    const settings = read("client/src/pages/SettingsPage.tsx");

    it("imports Sun and Moon icons", () => {
      expect(settings).toContain("Sun");
      expect(settings).toContain("Moon");
    });

    it("imports useTheme", () => {
      expect(settings).toContain("useTheme");
    });

    it("has Appearance heading", () => {
      expect(settings).toContain("Appearance");
    });

    it("has Light theme option", () => {
      expect(settings).toContain("Warm Light theme");
    });

    it("has Dark theme option", () => {
      expect(settings).toContain("Warm Void theme");
    });

    it("calls setTheme on theme selection", () => {
      expect(settings).toContain("setTheme(opt.value)");
    });

    it("persists theme to DB via savePrefsMutation", () => {
      expect(settings).toContain("generalSettings: updated, capabilities: capabilityToggles");
    });

    it("shows toast on theme change", () => {
      expect(settings).toContain("toast.success");
      expect(settings).toContain("Theme:");
    });
  });

  describe("AppLayout — Sidebar Theme Toggle", () => {
    const layout = read("client/src/components/AppLayout.tsx");

    it("imports Sun and Moon icons", () => {
      expect(layout).toContain("Sun");
      expect(layout).toContain("Moon");
    });

    it("imports useTheme", () => {
      expect(layout).toContain("useTheme");
    });

    it("calls cycleTheme on button click", () => {
      expect(layout).toContain("onClick={cycleTheme}");
    });

    it("shows appropriate icon based on preference", () => {
      expect(layout).toContain("preference === 'system'");
      expect(layout).toContain("preference === 'light'");
    });

    it("has accessible aria-label for theme toggle", () => {
      expect(layout).toContain("Click to cycle");
    });
  });

  describe("Server — Theme in Preferences Default", () => {
    const routers = read("server/routers.ts");

    it("includes theme in default generalSettings", () => {
      expect(routers).toContain("theme: 'dark'");
    });
  });
});
