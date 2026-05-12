import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ColorTheme = "dark" | "light";

const STORAGE_KEY = "colorTheme";

type ThemeContextValue = {
  theme: ColorTheme;
  setTheme: (t: ColorTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ColorTheme | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

function persistTheme(t: ColorTheme): void {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
  void chrome.storage?.local?.set({ [STORAGE_KEY]: t }).catch(() => undefined);
}

function applyHtmlClass(theme: ColorTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.colorTheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorTheme>(() => readStoredTheme() ?? "dark");

  useLayoutEffect(() => {
    applyHtmlClass(readStoredTheme() ?? "dark");
  }, []);

  useEffect(() => {
    applyHtmlClass(theme);
  }, [theme]);

  useEffect(() => {
    if (readStoredTheme() != null) return;
    void chrome.storage?.local?.get(STORAGE_KEY).then((r) => {
      const v = r[STORAGE_KEY];
      if (v === "light" || v === "dark") setThemeState(v);
    });
  }, []);

  const setTheme = useCallback((t: ColorTheme) => {
    setThemeState(t);
    persistTheme(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: ColorTheme = prev === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
