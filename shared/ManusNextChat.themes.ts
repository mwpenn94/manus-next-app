/**
 * ManusNextChat — Built-in Theme Presets
 *
 * Three presets per v8.3 spec:
 * - manus-dark: Default dark theme matching Manus.im
 * - manus-light: Light variant for embedding in light-themed apps
 * - stewardly-dark: Custom dark theme for Stewardly branding
 */
import type { ManusNextTheme, ThemePresetId } from "./ManusNextChat.types";

export const THEME_PRESETS: Record<ThemePresetId, ManusNextTheme> = {
  "manus-dark": {
    id: "manus-dark",
    name: "Manus Dark",
    mode: "dark",
    colors: {
      primary: "oklch(0.6565 0.1863 251.8)",
      primaryForeground: "oklch(1.0 0 0)",
      background: "oklch(0.2178 0 0)",
      foreground: "oklch(0.8884 0 0)",
      muted: "oklch(0.2393 0 0)",
      mutedForeground: "oklch(0.7984 0 0)",
      card: "oklch(0.2264 0 0)",
      cardForeground: "oklch(0.8884 0 0)",
      border: "oklch(0.2768 0 0)",
      accent: "oklch(0.2520 0 0)",
      accentForeground: "oklch(0.8884 0 0)",
      destructive: "oklch(0.6405 0.1947 24.5)",
    },
    fontHeading: "'Instrument Sans', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    radius: 0.5,
  },

  "manus-light": {
    id: "manus-light",
    name: "Manus Light",
    mode: "light",
    colors: {
      primary: "oklch(0.55 0.2 250)",
      primaryForeground: "oklch(0.98 0.005 250)",
      background: "oklch(0.98 0.005 60)",
      foreground: "oklch(0.15 0.01 60)",
      muted: "oklch(0.93 0.005 60)",
      mutedForeground: "oklch(0.45 0.01 60)",
      card: "oklch(1.0 0 0)",
      cardForeground: "oklch(0.15 0.01 60)",
      border: "oklch(0.88 0.005 60)",
      accent: "oklch(0.95 0.005 60)",
      accentForeground: "oklch(0.15 0.01 60)",
      destructive: "oklch(0.55 0.2 25)",
    },
    fontHeading: "'Instrument Sans', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    radius: 0.5,
  },

  "stewardly-dark": {
    id: "stewardly-dark",
    name: "Stewardly Dark",
    mode: "dark",
    colors: {
      primary: "oklch(0.65 0.15 160)",
      primaryForeground: "oklch(0.98 0.005 160)",
      background: "oklch(0.12 0.008 240)",
      foreground: "oklch(0.92 0.01 240)",
      muted: "oklch(0.18 0.008 240)",
      mutedForeground: "oklch(0.55 0.01 240)",
      card: "oklch(0.15 0.008 240)",
      cardForeground: "oklch(0.92 0.01 240)",
      border: "oklch(0.23 0.008 240)",
      accent: "oklch(0.20 0.01 240)",
      accentForeground: "oklch(0.92 0.01 240)",
      destructive: "oklch(0.55 0.2 25)",
    },
    fontHeading: "'Inter', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', monospace",
    radius: 0.625,
  },
};

/**
 * Resolve a theme preset ID or custom theme object into a ManusNextTheme.
 */
export function resolveTheme(
  theme: ThemePresetId | ManusNextTheme | undefined
): ManusNextTheme {
  if (!theme) return THEME_PRESETS["manus-dark"];
  if (typeof theme === "string") return THEME_PRESETS[theme] ?? THEME_PRESETS["manus-dark"];
  return theme;
}
