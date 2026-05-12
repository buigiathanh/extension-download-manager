import { useEffect, useState } from "react";
import { DownloadDetailPanel } from "./components/DownloadDetailPanel";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { LeftRail, type NavKey } from "./components/LeftRail";
import { ThemeToggle } from "./components/ThemeToggle";

export default function App() {
  const [nav, setNav] = useState<NavKey>("files");
  const [selectedDownloadId, setSelectedDownloadId] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("Người dùng Chrome");
  const [accountLabel, setAccountLabel] = useState("Tài khoản cục bộ");

  useEffect(() => {
    void chrome.identity
      .getProfileUserInfo({ accountStatus: "ANY" })
      .then((info) => {
        if (info.email) {
          setDisplayName(info.email.split("@")[0] || info.email);
          setAccountLabel("Google");
        } else if (info.id) {
          setDisplayName(`ID ${info.id.slice(0, 8)}…`);
          setAccountLabel("Đồng bộ Chrome");
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (nav !== "files") setSelectedDownloadId(null);
  }, [nav]);

  return (
    <div className="flex h-screen min-h-[480px] flex-col bg-zinc-100 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-200">
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
              ? "relative flex min-h-0 min-w-0 flex-1 flex-col lg:flex-row"
              : "relative flex min-h-0 min-w-0 flex-1 flex-col"
          }
        >
          {nav !== "files" ? (
            <div className="absolute right-4 top-3 z-30">
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
