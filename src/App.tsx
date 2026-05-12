import { useEffect, useState } from "react";
import { DownloadDetailPanel } from "./components/DownloadDetailPanel";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { LeftRail, type NavKey } from "./components/LeftRail";
import { ThemeToggle } from "./components/ThemeToggle";
import { LanguageToggle } from "./components/LanguageToggle";
import { useI18n } from "./i18n/I18nContext";

export default function App() {
  const { t } = useI18n();
  const [nav, setNav] = useState<NavKey>("files");
  const [selectedDownloadId, setSelectedDownloadId] = useState<number | null>(null);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);
  const [identityId, setIdentityId] = useState<string | null>(null);

  const displayName = identityEmail
    ? identityEmail.split("@")[0] || identityEmail
    : identityId
      ? `${t("accountIdPrefix")} ${identityId.slice(0, 8)}…`
      : t("accountDefaultName");
  const accountLabel = identityEmail
    ? t("accountLabelGoogle")
    : identityId
      ? t("accountLabelChromeSync")
      : t("accountLabelLocal");

  useEffect(() => {
    void chrome.identity
      .getProfileUserInfo({ accountStatus: "ANY" })
      .then((info) => {
        if (info.email) {
          setIdentityEmail(info.email);
        } else if (info.id) {
          setIdentityId(info.id);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (nav !== "files") setSelectedDownloadId(null);
  }, [nav]);

  return (
    <div className="flex h-screen min-h-[480px] flex-col overflow-hidden bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-200">
      <div className="flex min-h-0 flex-1">
        <LeftRail
          active={nav}
          onNavigate={setNav}
          displayName={displayName}
          accountLabel={accountLabel}
        />
        <div
          className={
            nav === "files"
              ? "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row"
              : "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          }
        >
          {nav !== "files" ? (
            <div className="absolute right-4 top-3 z-30 flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          ) : null}
          {nav === "files" ? (
            <>
              <DownloadsPanel
                selectedDownloadId={selectedDownloadId}
                onSelectDownload={setSelectedDownloadId}
              />
              {selectedDownloadId != null ? (
                <DownloadDetailPanel
                  downloadId={selectedDownloadId}
                  onClose={() => setSelectedDownloadId(null)}
                  onDeleted={() => setSelectedDownloadId(null)}
                />
              ) : null}
            </>
          ) : (
            <SettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
}
