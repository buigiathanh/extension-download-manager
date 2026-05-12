import {
  baseName,
  extensionOf,
  dayKey,
  sourceHost,
  isImageDownload,
  isBase64DataUrlDownload,
  applyDownloadDatePrefixToBaseName,
} from "./downloads";
import type { DownloadFolderOrganizeMode } from "./folderOrganizeSettings";

/** Thư mục con ASCII — tương thích đa nền tảng. */
export const TYPE_FOLDER = {
  image: "Hinh-anh",
  video: "Video",
  document: "Tai-lieu",
  code: "Ma-nguon",
  software: "Phan-mem",
  other: "Khac",
} as const;

const VIDEO_EXT = new Set([
  "mp4",
  "webm",
  "mkv",
  "mov",
  "avi",
  "m4v",
  "wmv",
  "flv",
  "mpeg",
  "mpg",
  "3gp",
  "ogv",
]);

const DOCUMENT_EXT = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "odt",
  "ods",
  "odp",
  "rtf",
  "txt",
  "csv",
  "md",
  "epub",
  "mobi",
]);

const CODE_EXT = new Set([
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "vue",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "swift",
  "c",
  "h",
  "cpp",
  "cc",
  "cxx",
  "hpp",
  "cs",
  "php",
  "sql",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "bat",
  "cmd",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "json",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "env",
  "dockerfile",
  "gradle",
  "properties",
]);

const SOFTWARE_EXT = new Set([
  "exe",
  "msi",
  "dmg",
  "pkg",
  "apk",
  "deb",
  "rpm",
  "appimage",
  "iso",
  "img",
  "vhd",
  "vhdx",
  "msix",
  "appx",
  "jar",
  "run",
  "bin",
]);

export function sanitizePathSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return "_";
  const cleaned = t.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/^\.+$/, "_");
  const clipped = cleaned.slice(0, 180);
  return clipped || "_";
}

function fileBaseNameForItem(item: chrome.downloads.DownloadItem): string {
  const fromPath = baseName(item.filename || "").trim();
  if (fromPath) return fromPath;
  const raw = item.finalUrl || item.url || "";
  try {
    const u = new URL(raw);
    const last = decodeURIComponent(u.pathname.split("/").pop() || "").trim();
    if (last) return last;
  } catch {
    /* ignore */
  }
  return "download";
}

export function typeFolderForDownload(item: chrome.downloads.DownloadItem): string {
  const ext = extensionOf(item.filename || fileBaseNameForItem(item));
  const mime = (item.mime || "").toLowerCase();

  if (isImageDownload(item, ext)) return TYPE_FOLDER.image;
  if (mime.startsWith("video/") || VIDEO_EXT.has(ext)) return TYPE_FOLDER.video;
  if (SOFTWARE_EXT.has(ext)) return TYPE_FOLDER.software;
  if (DOCUMENT_EXT.has(ext)) return TYPE_FOLDER.document;
  if (CODE_EXT.has(ext)) return TYPE_FOLDER.code;
  if (mime.startsWith("text/") && ext) return TYPE_FOLDER.code;
  return TYPE_FOLDER.other;
}

function sourceFolderForDownload(item: chrome.downloads.DownloadItem): string {
  if (isBase64DataUrlDownload(item)) return sanitizePathSegment("Du-lieu-inline");
  const host = sourceHost(item);
  if (!host || host === "—") return sanitizePathSegment("Khong-ro-nguon");
  return sanitizePathSegment(host);
}

function dateFolderForDownload(item: chrome.downloads.DownloadItem): string {
  const d = dayKey(item.startTime);
  if (d === "unknown") return sanitizePathSegment("Khong-ro-ngay");
  return sanitizePathSegment(d);
}

/** Tên file một đoạn (tương đối so với thư mục Downloads) có tiền tố `DDMMYYYY_`. */
export function suggestedFilenameWithDownloadTimePrefix(
  item: chrome.downloads.DownloadItem,
): string {
  const safe = sanitizePathSegment(fileBaseNameForItem(item));
  return applyDownloadDatePrefixToBaseName(safe, item.startTime);
}

/**
 * Đường dẫn tương đối (dùng `/`) so với thư mục tải mặc định của Chrome.
 * Trả về `null` nếu không can thiệp (chế độ mặc định).
 */
export function suggestedRelativePathForOrganizeMode(
  mode: DownloadFolderOrganizeMode,
  item: chrome.downloads.DownloadItem,
): string | null {
  if (mode === "default") return null;

  const base = applyDownloadDatePrefixToBaseName(
    sanitizePathSegment(fileBaseNameForItem(item)),
    item.startTime,
  );

  if (mode === "by-date") {
    return `${dateFolderForDownload(item)}/${base}`;
  }
  if (mode === "by-type") {
    return `${typeFolderForDownload(item)}/${base}`;
  }
  if (mode === "by-source") {
    return `${sourceFolderForDownload(item)}/${base}`;
  }
  return null;
}
