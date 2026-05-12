/** Khóa `chrome.storage.local` — dùng khi lắng nghe `storage.onChanged`. */
export const CLOUD_FOLDERS_STORAGE_KEY = "cloudFolders";

export type CloudFolder = {
  id: string;
  name: string;
  /** Số tệp trong thư mục (UI; có thể đồng bộ sau khi tích hợp API). */
  fileCount: number;
};

export function newFolderId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function loadCloudFolders(): Promise<CloudFolder[]> {
  const r = await chrome.storage.local.get(CLOUD_FOLDERS_STORAGE_KEY);
  const raw = r[CLOUD_FOLDERS_STORAGE_KEY];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (x): x is CloudFolder =>
        x != null &&
        typeof x === "object" &&
        typeof (x as CloudFolder).id === "string" &&
        typeof (x as CloudFolder).name === "string",
    )
    .map((f) => ({
      ...f,
      fileCount: typeof f.fileCount === "number" && f.fileCount >= 0 ? f.fileCount : 0,
    }));
}

export async function saveCloudFolders(folders: CloudFolder[]): Promise<void> {
  await chrome.storage.local.set({ [CLOUD_FOLDERS_STORAGE_KEY]: folders });
}
