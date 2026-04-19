import { IntlProvider } from "react-intl";
import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import enMessages from "./en.json";
import esMessages from "./es.json";
import zhMessages from "./locales/zh.json";

type Locale = "en" | "es" | "zh";

const messages: Record<Locale, Record<string, string>> = {
  en: enMessages,
  es: esMessages,
  zh: zhMessages,
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: { code: Locale; label: string }[];
}

const I18nContext = createContext<I18nContextValue>({
  locale: "en",
  setLocale: () => {},
  availableLocales: [],
});

export function useI18n() {
  return useContext(I18nContext);
}

const AVAILABLE_LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
];

function getDefaultLocale(): Locale {
  const stored = localStorage.getItem("manus-next-locale");
  if (stored === "en" || stored === "es" || stored === "zh") return stored;
  const browserLang = navigator.language.split("-")[0];
  if (browserLang === "es") return "es";
  if (browserLang === "zh") return "zh";
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getDefaultLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("manus-next-locale", newLocale);
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, availableLocales: AVAILABLE_LOCALES }}>
      <IntlProvider locale={locale} messages={messages[locale]} defaultLocale="en">
        {children}
      </IntlProvider>
    </I18nContext.Provider>
  );
}
