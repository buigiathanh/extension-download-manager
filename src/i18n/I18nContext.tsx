import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  dictionaries,
  type Locale,
  type MessageKey,
} from "./messages";

export const LOCALE_STORAGE_KEY = "appLocale";

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(x);
}

function readSyncStoredLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

function persistLocale(l: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, l);
  } catch {
    /* ignore — non-extension previews may not have localStorage */
  }
  void chrome.storage?.local?.set({ [LOCALE_STORAGE_KEY]: l }).catch(() => undefined);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  /* Hydrate synchronously from localStorage to avoid a flash of EN when the user picked VI. */
  const [locale, setLocaleState] = useState<Locale>(() => readSyncStoredLocale() ?? DEFAULT_LOCALE);

  /* Re-hydrate from chrome.storage.local on first mount (in case localStorage was cleared). */
  useEffect(() => {
    if (readSyncStoredLocale() != null) return;
    void chrome.storage?.local?.get(LOCALE_STORAGE_KEY).then((r) => {
      const v = r[LOCALE_STORAGE_KEY];
      if (isLocale(v)) setLocaleState(v);
    });
  }, []);

  /* Keep <html lang="…"> in sync for screen readers / spell-check. */
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persistLocale(l);
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>): string => {
      const dict = dictionaries[locale];
      const raw = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
      return interpolate(raw, vars);
    },
    [locale],
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
