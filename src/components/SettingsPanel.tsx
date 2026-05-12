import { useCallback, useEffect, useState } from "react";
import { Calendar, FolderOpen, FolderTree, Globe2, Settings } from "lucide-react";
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

/** Đặt `true` khi cần bật lại thanh tab (Cài đặt folder / Chung). */
const SETTINGS_TOP_TABS_ENABLED = false;

type SettingsTabId = "folder" | "general";

const tabs: { id: SettingsTabId; label: string }[] = [
  { id: "folder", label: "Cài đặt folder" },
  { id: "general", label: "Chung" },
];

const organizeOptions: {
  value: DownloadFolderOrganizeMode;
  title: string;
  description: string;
  icon: typeof Calendar;
}[] = [
  {
    value: "default",
    title: "Mặc định",
    description:
      "Giữ hành vi tải của Chrome: file vào đúng thư mục bạn đã chọn trong Cài đặt Chrome, không tạo thư mục con theo quy tắc của extension.",
    icon: FolderOpen,
  },
  {
    value: "by-date",
    title: "Theo ngày",
    description:
      "Mỗi ngày một thư mục con (ví dụ 2026-05-12), dễ tìm theo thời điểm tải.",
    icon: Calendar,
  },
  {
    value: "by-type",
    title: "Theo loại file",
    description:
      "Phân loại: Hình ảnh, Video, Tài liệu, Mã nguồn, Phần mềm — dựa trên phần mở rộng và loại MIME.",
    icon: FolderTree,
  },
  {
    value: "by-source",
    title: "Theo nguồn",
    description: "Một thư mục cho mỗi trang / hostname nơi file được tải (ví dụ example.com).",
    icon: Globe2,
  },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("folder");
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
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <DownloadAskLocationDialog
        open={askLocationDialogOpen}
        title="Nhắc tắt hỏi vị trí trước khi lưu"
        message="Chrome có thể đang bật hỏi vị trí lưu trước khi tải. Phân thư mục theo ngày, loại hoặc nguồn chỉ áp dụng được khi tùy chọn đó đã tắt trong Cài đặt Chrome."
        alreadyOffLabel="Tôi đã tắt"
        openSettingsLabel="Mở cài đặt"
        cancelLabel="Huỷ"
        onAlreadyOff={() => void handleAskLocationDialogAlreadyOff()}
        onOpenSettings={() => void handleAskLocationDialogOpenSettings()}
        onCancel={() => void handleAskLocationDialogCancel()}
      />
      <header className="shrink-0 border-b border-zinc-200/90 bg-white/95 px-6 py-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/95">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/15 to-cyan-600/10 ring-1 ring-violet-500/25">
            <Settings className="h-5 w-5 text-violet-600 dark:text-violet-400" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Cài đặt
            </h1>
            <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
              Tuỳ chỉnh cách tổ chức tải xuống và các tuỳ chọn chung của extension.
            </p>
          </div>
        </div>

        {SETTINGS_TOP_TABS_ENABLED ? (
          <div
            className="mt-5 flex w-full max-w-2xl gap-1 rounded-xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/80 dark:bg-zinc-900/60 dark:ring-zinc-800/80"
            role="tablist"
            aria-label="Nhóm cài đặt"
          >
            {tabs.map(({ id, label }) => {
              const on = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  id={`settings-tab-${id}`}
                  aria-controls={`settings-panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`min-h-[40px] flex-1 rounded-lg px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 ${
                    on
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700/80"
                      : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        {SETTINGS_TOP_TABS_ENABLED && activeTab === "general" ? (
          <section
            role="tabpanel"
            id="settings-panel-general"
            aria-labelledby="settings-tab-general"
            className="mx-auto max-w-2xl"
          >
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Chung</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
              Giao diện sáng / tối có thể bật bằng nút góc phải trên trang. Các mục như thông báo
              hoặc đồng bộ sẽ bổ sung ở đây khi có.
            </p>
          </section>
        ) : (
          <section
            role={SETTINGS_TOP_TABS_ENABLED ? "tabpanel" : undefined}
            id={SETTINGS_TOP_TABS_ENABLED ? "settings-panel-folder" : undefined}
            aria-labelledby={SETTINGS_TOP_TABS_ENABLED ? "settings-tab-folder" : undefined}
            className="mx-auto max-w-2xl"
          >
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Cách phân thư mục khi tải
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
              Mỗi lựa chọn quyết định Chrome đặt file vào thư mục con nào trong thư mục tải mặc định: theo
              ngày tải, theo loại nội dung, hoặc theo hostname nguồn. Chế độ Mặc định không thêm thư mục
              con — đường dẫn theo đúng cấu hình tải của Chrome.
            </p>
            {organizeMode !== "default" ? (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-sm leading-relaxed text-amber-950 dark:text-amber-100/95">
                  Hãy tắt{" "}
                  <strong className="font-semibold text-amber-950 dark:text-amber-50">
                    Hỏi vị trí lưu tệp trước khi tải xuống
                  </strong>{" "}
                  trong phần Tải xuống nếu bạn vẫn bật.
                </p>
                <button
                  type="button"
                  onClick={() => void openChromeDownloadsSettingsTab()}
                  className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 dark:bg-amber-700 dark:hover:bg-amber-600"
                >
                  Mở Cài đặt Tải xuống (Chrome)
                </button>
              </div>
            ) : null}

            {organizeProbeBusy ? (
              <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-500" aria-live="polite">
                Đang kiểm tra cài đặt tải xuống của Chrome…
              </p>
            ) : null}

            {loading ? (
              <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-500">Đang tải…</p>
            ) : (
              <ul className="mt-6 flex flex-col gap-3" aria-label="Tuỳ chọn phân thư mục">
                {organizeOptions.map(({ value, title, description, icon: Icon }) => {
                  const selected = organizeMode === value;
                  return (
                    <li key={value}>
                      <button
                        type="button"
                        disabled={organizeProbeBusy || loading}
                        onClick={() => void selectOrganize(value)}
                        className={`flex w-full gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45 disabled:pointer-events-none disabled:opacity-60 ${
                          selected
                            ? "border-cyan-500/40 bg-cyan-50/80 ring-1 ring-cyan-500/25 dark:border-cyan-500/35 dark:bg-cyan-950/25 dark:ring-cyan-500/20"
                            : "border-zinc-200 bg-white/90 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/95"
                        }`}
                      >
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${
                            selected
                              ? "bg-cyan-500/15 text-cyan-700 ring-cyan-500/25 dark:text-cyan-300"
                              : "bg-zinc-100 text-zinc-600 ring-zinc-200/90 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700/80"
                          }`}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">
                              {title}
                            </span>
                            {selected ? (
                              <span className="rounded-full bg-cyan-600/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                                Đang dùng
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
                            {description}
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center pt-1">
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
        )}
      </div>
    </div>
  );
}
