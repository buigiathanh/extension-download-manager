import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useI18n } from "../i18n/I18nContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <div
      role="group"
      aria-label={t("themeGroupLabel")}
      className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <button
        type="button"
        aria-pressed={isDark}
        title={t("themeDark")}
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
          isDark
            ? "bg-zinc-800 text-zinc-100 shadow-sm dark:bg-zinc-800"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
        }`}
      >
        <Moon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t("themeDark")}
      </button>
      <button
        type="button"
        aria-pressed={!isDark}
        title={t("themeLight")}
        onClick={() => setTheme("light")}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
          !isDark
            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100"
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
        }`}
      >
        <Sun className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {t("themeLight")}
      </button>
    </div>
  );
}
