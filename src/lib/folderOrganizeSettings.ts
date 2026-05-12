/** Khóa `chrome.storage.local` — cách phân cấp thư mục tải xuống (UI + background sau này). */
export const FOLDER_ORGANIZE_STORAGE_KEY = "downloadFolderOrganize";

/**
 * Cách sắp xếp file khi tải.
 * `default` — theo cấu hình tải của Chrome / người dùng, không thêm quy tắc thư mục con từ extension.
 */
export type DownloadFolderOrganizeMode = "default" | "by-date" | "by-type" | "by-source";

export const DEFAULT_FOLDER_ORGANIZE_MODE: DownloadFolderOrganizeMode = "default";

function isMode(x: unknown): x is DownloadFolderOrganizeMode {
  return x === "default" || x === "by-date" || x === "by-type" || x === "by-source";
}

export async function loadFolderOrganizeMode(): Promise<DownloadFolderOrganizeMode> {
  const r = await chrome.storage.local.get(FOLDER_ORGANIZE_STORAGE_KEY);
  const v = r[FOLDER_ORGANIZE_STORAGE_KEY];
  return isMode(v) ? v : DEFAULT_FOLDER_ORGANIZE_MODE;
}

export async function saveFolderOrganizeMode(mode: DownloadFolderOrganizeMode): Promise<void> {
  await chrome.storage.local.set({ [FOLDER_ORGANIZE_STORAGE_KEY]: mode });
}
