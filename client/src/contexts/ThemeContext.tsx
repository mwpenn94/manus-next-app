import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** User-facing preference: "system" follows OS, "light"/"dark" are explicit. */
export type ThemePreference = "system" | "light" | "dark";

/** Resolved visual theme applied to the DOM. */
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  /** The user's stored preference (system | light | dark). */
  preference: ThemePreference;
  /** The resolved visual theme currently applied (light | dark). */
  theme: ResolvedTheme;
  /** Set an explicit preference. */
  setTheme: (t: ThemePreference) => void;
  /** Cycle through system → light → dark → system. */
  cycleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CYCLE_ORDER: ThemePreference[] = ["system", "light", "dark"];

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "system") return getSystemTheme();
  return pref;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  const [preference, _setPreference] = useState<ThemePreference>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      if (stored === "system" || stored === "light" || stored === "dark") return stored;
    }
    return defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme: ResolvedTheme = useMemo(() => {
    if (preference === "system") return systemTheme;
    return preference;
  }, [preference, systemTheme]);

  // Apply to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    if (switchable) {
      localStorage.setItem("theme", preference);
    }
  }, [theme, preference, switchable]);

  const setTheme = useCallback((t: ThemePreference) => {
    _setPreference(t);
  }, []);

  const cycleTheme = useCallback(() => {
    _setPreference(prev => {
      const idx = CYCLE_ORDER.indexOf(prev);
      return CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, theme, setTheme, cycleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
