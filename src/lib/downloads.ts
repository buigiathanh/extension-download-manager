import { builtinImageExtSet } from "./typeBuiltinExtensions";

export type SortKey =
  | "none"
  | "name-asc"
  | "name-desc"
  | "date-asc"
  | "date-desc"
  | "size-asc"
  | "size-desc";

export function baseName(fullPath: string): string {
  const parts = fullPath.split(/[/\\]/);
  return parts[parts.length - 1] || fullPath;
}

export function extensionOf(filename: string): string {
  const base = baseName(filename);
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function isImageDownload(item: chrome.downloads.DownloadItem, ext: string): boolean {
  const mime = (item.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return true;
  return builtinImageExtSet.has(ext.toLowerCase());
}

/**
 * Chuyển đường dẫn tuyệt đối sang `file://` (vd. mở tab).
 * Không dùng làm `src` của `<img>` trong trang extension — Chrome chặn.
 */
export function pathToFileUrl(absPath: string): string | null {
  if (!absPath) return null;
  try {
    const normalized = absPath.replace(/\\/g, "/");
    if (/^[a-zA-Z]:\//.test(normalized)) {
      return new URL(`file:///${normalized}`).href;
    }
    if (normalized.startsWith("/")) {
      return new URL(`file://${normalized}`).href;
    }
    return null;
  } catch {
    return null;
  }
}

export function httpImageUrl(item: chrome.downloads.DownloadItem): string | null {
  const u = item.finalUrl || item.url || "";
  return /^https?:\/\//i.test(u) ? u : null;
}

/**
 * URL ảnh lấy từ chính trang tải (https / http / data:image) — dùng trong `<img src>` khi không dùng file cục bộ.
 */
export function previewPageImageUrl(item: chrome.downloads.DownloadItem): string | null {
  const u = (item.finalUrl || item.url || "").trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (/^data:image\//i.test(u)) return u;
  return null;
}

/**
 * Ảnh thumbnail / icon hệ thống cho một download (data URL), qua `chrome.downloads.getFileIcon`.
 * API chỉ cho phép 16×16 hoặc 32×32 — tham số `sizeHint` được map sang một trong hai giá trị đó.
 */
export function getDownloadFileIconDataUrl(
  downloadId: number,
  sizeHint: number = 32,
): Promise<string | null> {
  const size: 16 | 32 = sizeHint <= 16 ? 16 : 32;
  return new Promise((resolve) => {
    try {
      chrome.downloads.getFileIcon(downloadId, { size }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(dataUrl ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/** `blob:https://site/uuid` → `https://site/uuid` để parse host / favicon. */
export function unwrapBlobUrl(url: string): string {
  const u = url.trim();
  if (u.toLowerCase().startsWith("blob:")) return u.slice(5);
  return u;
}

export function sourceHost(d: chrome.downloads.DownloadItem): string {
  const raw = d.finalUrl || d.url || d.referrer || "";
  const toParse = unwrapBlobUrl(raw);
  try {
    return new URL(toParse).hostname || "—";
  } catch {
    return "—";
  }
}

/** Link tải dạng `data:...;base64,...` (không có host — dùng icon Globe giống localhost). */
export function isBase64DataUrlDownload(d: chrome.downloads.DownloadItem): boolean {
  const raw = (d.finalUrl || d.url || "").trim();
  if (!/^data:/i.test(raw)) return false;
  return /;base64,/i.test(raw);
}

/** Nhãn hiển thị cột nguồn (kèm trường hợp đặc biệt). */
export function sourceHostDisplay(d: chrome.downloads.DownloadItem): string {
  if (isBase64DataUrlDownload(d)) return "Dữ liệu (base64)";
  return sourceHost(d);
}

export function isLocalhostSourceHost(hostname: string): boolean {
  const h = hostname.trim().toLowerCase();
  if (!h || h === "—") return false;
  if (h === "localhost") return true;
  if (h === "127.0.0.1" || h === "0.0.0.0") return true;
  if (h === "::1" || h === "[::1]") return true;
  if (h.endsWith(".localhost")) return true;
  return false;
}

/** URL favicon (Google s2) — HTTPS, không cần quyền host. Localhost → null (dùng icon Globe ở UI). */
export function faviconUrlForHost(hostname: string): string | null {
  const h = hostname.trim();
  if (!h || h === "—") return null;
  if (isLocalhostSourceHost(h)) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=32`;
}

export function dayKey(iso: string | undefined): string {
  if (!iso) return "unknown";
  return iso.slice(0, 10);
}

/** Tiền tố thời điểm bắt đầu tải: `DDMMYYYY_` (ví dụ `12052026_` cho 12/05/2026). */
export function downloadDatePrefixFromIso(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${dd}${mm}${yyyy}_`;
}

/** Nối tiền tố vào đầu tên file; không lặp nếu đã đúng tiền tố của cùng `startTime`. */
export function applyDownloadDatePrefixToBaseName(
  baseFileName: string,
  startTimeIso: string | undefined,
): string {
  const prefix = downloadDatePrefixFromIso(startTimeIso);
  if (!prefix) return baseFileName;
  if (baseFileName.startsWith(prefix)) return baseFileName;
  return `${prefix}${baseFileName}`;
}

export function formatDayHeading(day: string): string {
  if (day === "unknown") return "Không rõ ngày";
  const d = new Date(`${day}T12:00:00`);
  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function sortDownloads(
  items: chrome.downloads.DownloadItem[],
  key: SortKey,
): chrome.downloads.DownloadItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const na = baseName(a.filename).toLowerCase();
    const nb = baseName(b.filename).toLowerCase();
    const sa = a.totalBytes ?? 0;
    const sb = b.totalBytes ?? 0;
    const ta = a.startTime || "";
    const tb = b.startTime || "";
    if (key === "none") return tb.localeCompare(ta);
    if (key === "name-asc") return na.localeCompare(nb, "vi");
    if (key === "name-desc") return nb.localeCompare(na, "vi");
    if (key === "date-asc") return ta.localeCompare(tb);
    if (key === "date-desc") return tb.localeCompare(ta);
    if (key === "size-asc") return sa - sb;
    if (key === "size-desc") return sb - sa;
    return 0;
  });
  return copy;
}

export async function deleteDownload(id: number): Promise<void> {
  try {
    await chrome.downloads.removeFile(id);
  } catch {
    /* file có thể đã bị xóa */
  }
  await chrome.downloads.erase({ id });
}

/** Chỉ xoá khỏi lịch sử tải xuống của Chrome; không xoá file trên đĩa. */
export async function eraseDownloadHistory(id: number): Promise<void> {
  await chrome.downloads.erase({ id });
}

export async function eraseDownloadsHistory(ids: number[]): Promise<void> {
  for (const id of ids) {
    await chrome.downloads.erase({ id });
  }
}

export async function shareDownload(d: chrome.downloads.DownloadItem): Promise<void> {
  const httpUrl = d.finalUrl || d.url;
  if (httpUrl && /^https?:\/\//i.test(httpUrl)) {
    try {
      await navigator.share({ title: baseName(d.filename), url: httpUrl });
      return;
    } catch {
      /* user cancelled hoặc không hỗ trợ */
    }
  }
  if (d.filename) {
    await navigator.clipboard.writeText(d.filename);
  }
}

/** Hiển thị kích thước file trong UI (B, KB, …). */
export function formatDownloadBytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}

/** Đã tải xong nhưng file không còn trên đĩa (xoá / di chuyển) — `chrome.downloads` báo `exists: false`. */
export function isDownloadFileRemovedFromDisk(d: chrome.downloads.DownloadItem): boolean {
  return d.state === "complete" && d.exists === false;
}

export type FilePresenceFilter = "all" | "present" | "removed" | "downloading";

export function matchesFilePresenceFilter(
  d: chrome.downloads.DownloadItem,
  f: FilePresenceFilter,
): boolean {
  if (f === "all") return true;
  if (f === "present") {
    return d.state === "complete" && d.exists !== false && Boolean(d.filename);
  }
  if (f === "removed") {
    return isDownloadFileRemovedFromDisk(d);
  }
  if (f === "downloading") {
    return d.state === "in_progress";
  }
  return true;
}

/** Nhãn cột trạng thái (file trên máy / đã xoá / đang tải…). */
export function filePresenceStatusLabel(d: chrome.downloads.DownloadItem): string {
  if (d.state === "in_progress") return "Đang tải";
  if (isDownloadFileRemovedFromDisk(d)) return "Đã xoá";
  if (d.state === "complete") {
    if (d.filename && d.exists !== false) return "Còn file";
    return "Hoàn thành";
  }
  return d.state;
}
