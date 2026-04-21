/**
 * P25 Tests — System/Auto Theme Option
 *
 * Covers: ThemeContext 3-mode (system/light/dark), prefers-color-scheme listener,
 * cycleTheme, Settings 3-card grid, sidebar cycle toggle, DB persistence
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, "..", p), "utf-8");

describe("P25 — System/Auto Theme", () => {
  describe("ThemeContext — 3-mode support", () => {
    const src = read("client/src/contexts/ThemeContext.tsx");

    it("exports ThemePreference type with system|light|dark", () => {
      expect(src).toContain("ThemePreference");
      expect(src).toMatch(/system.*light.*dark/s);
    });

    it("exports ResolvedTheme type with light|dark", () => {
      expect(src).toContain("ResolvedTheme");
    });

    it("exposes preference (user choice) and theme (resolved) in context", () => {
      expect(src).toContain("preference");
      expect(src).toContain("theme: ResolvedTheme");
    });

    it("exposes setTheme accepting ThemePreference", () => {
      expect(src).toContain("setTheme: (t: ThemePreference)");
    });

    it("exposes cycleTheme function", () => {
      expect(src).toContain("cycleTheme");
    });

    it("defines CYCLE_ORDER as system → light → dark", () => {
      expect(src).toContain("CYCLE_ORDER");
      expect(src).toMatch(/\["system",\s*"light",\s*"dark"\]/);
    });

    it("has getSystemTheme using prefers-color-scheme", () => {
      expect(src).toContain("prefers-color-scheme");
      expect(src).toContain("getSystemTheme");
    });

    it("listens for OS theme changes with addEventListener", () => {
      expect(src).toContain("addEventListener(\"change\"");
      expect(src).toContain("removeEventListener(\"change\"");
    });

    it("resolves system preference to OS theme", () => {
      expect(src).toContain("resolveTheme");
      expect(src).toMatch(/if\s*\(pref\s*===\s*"system"\)/);
    });

    it("stores 'system' as valid localStorage value", () => {
      expect(src).toContain('stored === "system"');
    });

    it("persists preference (not resolved theme) to localStorage", () => {
      expect(src).toContain("localStorage.setItem(\"theme\", preference)");
    });

    it("adds/removes dark class based on resolved theme", () => {
      expect(src).toContain("root.classList.add(\"dark\")");
      expect(src).toContain("root.classList.remove(\"dark\")");
    });

    it("uses useMemo for resolved theme computation", () => {
      expect(src).toContain("useMemo");
    });
  });

  describe("Settings — 3-card Appearance section", () => {
    const settings = read("client/src/pages/SettingsPage.tsx");

    it("has 3-column grid for theme cards", () => {
      expect(settings).toContain("grid-cols-3");
    });

    it("has System theme option with Monitor icon", () => {
      expect(settings).toContain('"system"');
      expect(settings).toContain("Monitor");
      expect(settings).toContain("Follow OS preference");
    });

    it("has Light theme option with Sun icon", () => {
      expect(settings).toContain("Warm Light theme");
      expect(settings).toContain("Sun");
    });

    it("has Dark theme option with Moon icon", () => {
      expect(settings).toContain("Warm Void theme");
      expect(settings).toContain("Moon");
    });

    it("uses preference (not theme) for active card highlight", () => {
      expect(settings).toContain("preference === opt.value");
    });

    it("uses setTheme from new API (not toggleTheme)", () => {
      expect(settings).toContain("setTheme(opt.value)");
      expect(settings).not.toContain("toggleTheme");
    });

    it("shows resolved theme in toast for system mode", () => {
      expect(settings).toContain("opt.value === 'system'");
    });
  });

  describe("AppLayout — Sidebar cycle toggle", () => {
    const layout = read("client/src/components/AppLayout.tsx");

    it("uses cycleTheme (not toggleTheme)", () => {
      expect(layout).toContain("cycleTheme");
      expect(layout).not.toContain("toggleTheme");
    });

    it("uses preference for icon selection", () => {
      expect(layout).toContain("preference === 'system'");
      expect(layout).toContain("preference === 'light'");
    });

    it("shows Monitor icon for system mode", () => {
      expect(layout).toContain("<Monitor");
    });

    it("shows Sun icon for light mode", () => {
      expect(layout).toContain("<Sun");
    });

    it("shows Moon icon for dark mode", () => {
      expect(layout).toContain("<Moon");
    });

    it("has accessible aria-label showing current mode", () => {
      expect(layout).toContain("Click to cycle");
    });
  });

  describe("Server — Theme default in preferences", () => {
    const routers = read("server/routers.ts");

    it("includes theme: 'dark' in default generalSettings", () => {
      expect(routers).toContain("theme: 'dark'");
    });
  });

  describe("CSS — Both light and dark theme variables", () => {
    const css = read("client/src/index.css");

    it("has :root with light theme variables", () => {
      expect(css).toContain(":root");
    });

    it("has .dark class with dark theme overrides", () => {
      expect(css).toContain(".dark");
    });

    it("defines --background in both themes", () => {
      expect(css).toMatch(/:root\s*\{[^}]*--background/s);
      expect(css).toMatch(/\.dark\s*\{[^}]*--background/s);
    });

    it("defines --foreground in both themes", () => {
      expect(css).toMatch(/:root\s*\{[^}]*--foreground/s);
      expect(css).toMatch(/\.dark\s*\{[^}]*--foreground/s);
    });

    it("uses oklch color format", () => {
      expect(css).toMatch(/oklch\(/);
    });
  });
});
