/**
 * Chrome không cung cấp API đọc «Hỏi vị trí lưu...».
 * Dùng một lần tải dữ liệu cực nhỏ (data URL) + theo dõi trạng thái:
 * - Hoàn thành nhanh → coi như không bị hộp thoại chặn (trả về false).
 * - Lỗi khởi tạo / gián đoạn USER_CANCELED / quá thời gian → coi như có thể đang bật hỏi vị trí (trả về true).
 */
const PROBE_DIR = ".dm-download-settings-probe";

export function probeChromeAskWhereToSaveLikelyEnabled(): Promise<boolean> {
  const url =
    "data:text/plain;charset=utf-8," + encodeURIComponent("__DM_SETTINGS_PROBE__");
  const filename = `${PROBE_DIR}/settings-check-${Date.now()}.txt`;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (likelyAskOn: boolean) => {
      if (settled) return;
      settled = true;
      resolve(likelyAskOn);
    };

    chrome.downloads.download(
      {
        url,
        filename,
        saveAs: false,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          finish(true);
          return;
        }
        if (downloadId === undefined) {
          finish(true);
          return;
        }

        const cleanup = async () => {
          try {
            await chrome.downloads.removeFile(downloadId);
          } catch {
            /* */
          }
          try {
            await chrome.downloads.erase({ id: downloadId });
          } catch {
            /* */
          }
        };

        const timeoutMs = 2800;
        const t = window.setTimeout(() => {
          chrome.downloads.onChanged.removeListener(onChanged);
          void chrome.downloads.cancel(downloadId).catch(() => undefined);
          void cleanup();
          finish(true);
        }, timeoutMs);

        const onChanged = (d: chrome.downloads.DownloadDelta) => {
          if (d.id !== downloadId) return;
          if (d.state?.current === "complete") {
            window.clearTimeout(t);
            chrome.downloads.onChanged.removeListener(onChanged);
            void cleanup();
            finish(false);
          }
          if (d.state?.current === "interrupted") {
            window.clearTimeout(t);
            chrome.downloads.onChanged.removeListener(onChanged);
            const err = d.error?.current;
            void cleanup();
            finish(err === "USER_CANCELED");
          }
        };

        chrome.downloads.onChanged.addListener(onChanged);
      },
    );
  });
}
