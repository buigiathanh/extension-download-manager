import { useI18n } from "../i18n/I18nContext";
import type { Locale } from "../i18n/messages";

const OPTIONS: { value: Locale; shortKey: "langEnglishShort" | "langVietnameseShort"; fullKey: "langEnglish" | "langVietnamese" }[] = [
  { value: "en", shortKey: "langEnglishShort", fullKey: "langEnglish" },
  { value: "vi", shortKey: "langVietnameseShort", fullKey: "langVietnamese" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("langGroupLabel")}
      className="inline-flex rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {OPTIONS.map(({ value, shortKey, fullKey }) => {
        const on = locale === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={on}
            title={t(fullKey)}
            onClick={() => setLocale(value)}
            className={`min-w-[2.25rem] rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
              on
                ? "bg-zinc-800 text-zinc-100 shadow-sm dark:bg-zinc-700"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {t(shortKey)}
          </button>
        );
      })}
    </div>
  );
}
