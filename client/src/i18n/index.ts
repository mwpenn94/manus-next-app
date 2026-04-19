import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LOCALES = ["en", "es", "zh"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  en: "English",
  es: "Espa\u00f1ol",
  zh: "\u4e2d\u6587",
};

const messages: Record<SupportedLocale, Record<string, string>> = { en, es, zh };

export function getMessages(locale: SupportedLocale): Record<string, string> {
  return messages[locale] ?? messages.en;
}

export function detectLocale(): SupportedLocale {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("manus-locale");
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }
  const browserLang = navigator.language.split("-")[0];
  if (SUPPORTED_LOCALES.includes(browserLang as SupportedLocale)) {
    return browserLang as SupportedLocale;
  }
  return "en";
}

export function setLocale(locale: SupportedLocale): void {
  localStorage.setItem("manus-locale", locale);
  window.location.reload();
}
