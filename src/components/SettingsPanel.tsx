import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Calendar, Folder, FolderDown, Globe, HelpCircle, Layers } from "lucide-react";
import {
  DEFAULT_FOLDER_ORGANIZE_MODE,
  FOLDER_ORGANIZE_STORAGE_KEY,
  loadFolderOrganizeMode,
  saveFolderOrganizeMode,
  type DownloadFolderOrganizeMode,
} from "../lib/folderOrganizeSettings";
import { probeChromeAskWhereToSaveLikelyEnabled } from "../lib/chromeDownloadAskLocationProbe";
import { openChromeDownloadsSettingsTab } from "../lib/openChromeDownloadsSettings";
import { DownloadAskLocationDialog } from "./DownloadAskLocationDialog";
import { TypeOrganizeSettingsSection } from "./TypeOrganizeSettingsSection";
import { useI18n } from "../i18n/I18nContext";
import type { MessageKey } from "../i18n/messages";

const organizeOptions: {
  value: DownloadFolderOrganizeMode;
  titleKey: MessageKey;
  descKey: MessageKey;
  Icon: LucideIcon;
}[] = [
  { value: "default", titleKey: "organizeDefault", descKey: "organizeDefaultDesc", Icon: Folder },
  { value: "by-date", titleKey: "organizeByDate", descKey: "organizeByDateDesc", Icon: Calendar },
  { value: "by-type", titleKey: "organizeByType", descKey: "organizeByTypeDesc", Icon: Layers },
  { value: "by-source", titleKey: "organizeBySource", descKey: "organizeBySourceDesc", Icon: Globe },
];

type SettingsSection = "organize" | "byType" | "downloadAsk";

const NAV_ITEMS: { id: SettingsSection; labelKey: MessageKey; Icon: LucideIcon }[] = [
  { id: "organize", labelKey: "settingsNavOrganize", Icon: FolderDown },
  { id: "byType", labelKey: "settingsNavByType", Icon: Layers },
  { id: "downloadAsk", labelKey: "settingsNavDownloadAsk", Icon: HelpCircle },
];

export function SettingsPanel() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<SettingsSection>("organize");
  const [organizeMode, setOrganizeMode] = useState<DownloadFolderOrganizeMode>(
    DEFAULT_FOLDER_ORGANIZE_MODE,
  );
  const [loading, setLoading] = useState(true);
  const [organizeProbeBusy, setOrganizeProbeBusy] = useState(false);
  const [askLocationDialogOpen, setAskLocationDialogOpen] = useState(false);
  const [pendingOrganizeMode, setPendingOrganizeMode] =
    useState<DownloadFolderOrganizeMode | null>(null);

  const refreshOrganize = useCallback(async () => {
    setLoading(true);
    try {
      const m = await loadFolderOrganizeMode();
      setOrganizeMode(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOrganize();
  }, [refreshOrganize]);

  useEffect(() => {
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local") return;
      if (changes[FOLDER_ORGANIZE_STORAGE_KEY]) void refreshOrganize();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [refreshOrganize]);

  const selectOrganize = async (mode: DownloadFolderOrganizeMode) => {
    if (mode === organizeMode) return;

    if (mode === "default") {
      setOrganizeMode("default");
      await saveFolderOrganizeMode("default");
      return;
    }

    setOrganizeProbeBusy(true);
    try {
      let likelyAskOn = true;
      try {
        likelyAskOn = await probeChromeAskWhereToSaveLikelyEnabled();
      } catch {
        likelyAskOn = true;
      }

      if (!likelyAskOn) {
        setOrganizeMode(mode);
        await saveFolderOrganizeMode(mode);
        return;
      }

      setPendingOrganizeMode(mode);
      setAskLocationDialogOpen(true);
    } finally {
      setOrganizeProbeBusy(false);
    }
  };

  const applyPendingOrganizeMode = async () => {
    const next = pendingOrganizeMode;
    if (next == null || next === "default") {
      setAskLocationDialogOpen(false);
      setPendingOrganizeMode(null);
      return;
    }
    setOrganizeMode(next);
    await saveFolderOrganizeMode(next);
    setAskLocationDialogOpen(false);
    setPendingOrganizeMode(null);
  };

  const handleAskLocationDialogAlreadyOff = () => {
    void applyPendingOrganizeMode();
  };

  const handleAskLocationDialogOpenSettings = () => {
    void (async () => {
      await applyPendingOrganizeMode();
      void openChromeDownloadsSettingsTab();
    })();
  };

  const handleAskLocationDialogCancel = async () => {
    setOrganizeMode("default");
    await saveFolderOrganizeMode("default");
    setAskLocationDialogOpen(false);
    setPendingOrganizeMode(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <DownloadAskLocationDialog
        open={askLocationDialogOpen}
        title={t("askLocationTitle")}
        message={t("askLocationMessage")}
        alreadyOffLabel={t("askLocationAlreadyOff")}
        openSettingsLabel={t("askLocationOpenSettings")}
        cancelLabel={t("askLocationCancel")}
        onAlreadyOff={() => void handleAskLocationDialogAlreadyOff()}
        onOpenSettings={() => void handleAskLocationDialogOpenSettings()}
        onCancel={() => void handleAskLocationDialogCancel()}
      />
      <header className="shrink-0 border-b border-zinc-200/90 bg-white/95 px-6 py-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/95">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t("settingsTitle")}
        </h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b border-zinc-200 bg-white/95 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/95 md:w-72 md:border-b-0 md:border-r md:px-4 md:py-4">
          <nav className="flex gap-1 overflow-x-auto pb-0.5 md:flex-col md:gap-0.5 md:overflow-visible md:pb-0">
            {NAV_ITEMS.map(({ id, labelKey, Icon }) => {
              const on = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveSection(id)}
                  className={`flex min-w-0 items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-[13px] font-medium transition md:w-full ${
                    on
                      ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900/80"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      on
                        ? "border-zinc-300/90 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/80 dark:text-zinc-100"
                        : "border-zinc-200/90 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-400"
                    }`}
                    aria-hidden
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.85} />
                  </span>
                  <span className="min-w-0 leading-snug">{t(labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-5 md:px-6">
          {activeSection === "organize" ? (
            <section className="mx-auto max-w-2xl">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {t("settingsOrganizeSectionTitle")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t("settingsOrganizeSectionLead")}
              </p>
              {organizeMode !== "default" ? (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-100/95">
                    {t("settingsOrganizeAskWarning")}
                  </p>
                  <button
                    type="button"
                    onClick={() => void openChromeDownloadsSettingsTab()}
                    className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:bg-amber-700 dark:hover:bg-amber-600"
                  >
                    {t("settingsOrganizeOpenChromeBtn")}
                  </button>
                </div>
              ) : null}

              {organizeProbeBusy ? (
                <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-500" aria-live="polite">
                  {t("settingsOrganizeProbing")}
                </p>
              ) : null}

              {loading ? (
                <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-500">{t("settingsLoading")}</p>
              ) : (
                <ul className="mt-6 flex flex-col gap-3" aria-label={t("settingsOrganizeOptionsAria")}>
                  {organizeOptions.map(({ value, titleKey, descKey, Icon }) => {
                    const selected = organizeMode === value;
                    return (
                      <li key={value}>
                        <button
                          type="button"
                          disabled={organizeProbeBusy || loading}
                          onClick={() => void selectOrganize(value)}
                          className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45 disabled:pointer-events-none disabled:opacity-60 ${
                            selected
                              ? "border-cyan-500/40 bg-cyan-50/80 ring-1 ring-cyan-500/25 dark:border-cyan-500/35 dark:bg-cyan-950/25 dark:ring-cyan-500/20"
                              : "border-zinc-200 bg-white/90 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/95"
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                              selected
                                ? "border-cyan-500/35 bg-cyan-100/80 text-cyan-800 dark:border-cyan-500/30 dark:bg-cyan-950/50 dark:text-cyan-200"
                                : "border-zinc-200/90 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
                            }`}
                            aria-hidden
                          >
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {t(titleKey)}
                              </span>
                              {selected ? (
                                <span className="rounded-full bg-cyan-600/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                                  {t("settingsBadgeActive")}
                                </span>
                              ) : null}
                            </span>
                            <span className="text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                              {t(descKey)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center pt-0.5">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                selected
                                  ? "border-cyan-600 bg-cyan-600 dark:border-cyan-500 dark:bg-cyan-500"
                                  : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                              }`}
                              aria-hidden
                            >
                              {selected ? (
                                <span className="h-2 w-2 rounded-full bg-white dark:bg-zinc-950" />
                              ) : null}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}

          {activeSection === "byType" ? (
            <div className="mx-auto max-w-2xl">
              <TypeOrganizeSettingsSection embedded />
            </div>
          ) : null}

          {activeSection === "downloadAsk" ? (
            <section className="mx-auto max-w-2xl">
              <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {t("settingsDownloadAskSectionTitle")}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {t("settingsDownloadAskSectionLead")}
              </p>
              <button
                type="button"
                onClick={() => void openChromeDownloadsSettingsTab()}
                className="mt-5 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                {t("settingsDownloadAskOpenButton")}
              </button>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
