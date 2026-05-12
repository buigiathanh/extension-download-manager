import {
  baseName,
  extensionOf,
  dayKey,
  sourceHost,
  isBase64DataUrlDownload,
  applyDownloadDatePrefixToBaseName,
} from "./downloads";
import type { DownloadFolderOrganizeMode } from "./folderOrganizeSettings";
import type { TypeCategoryId, TypeOrganizeResolved } from "./typeOrganizeSettings";
import { sanitizePathSegment } from "./pathSegment";
import {
  builtinCodeExtSet,
  builtinDocumentExtSet,
  builtinImageExtSet,
  builtinSoftwareExtSet,
  builtinVideoExtSet,
} from "./typeBuiltinExtensions";

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

function extraHas(list: string[], ext: string): boolean {
  return ext.length > 0 && list.includes(ext);
}

function builtinExtActive(removed: string[], ext: string, set: Set<string>): boolean {
  return set.has(ext) && !removed.includes(ext);
}

/** Thứ tự khớp nhóm mặc định trước thư mục tùy chỉnh (trùng với `typeFolderForDownload`). */
const BUILTIN_TYPE_ROUTE_ORDER: Array<Exclude<TypeCategoryId, "other">> = [
  "image",
  "video",
  "software",
  "document",
  "code",
];

/**
 * Các nhóm mặc định (không gồm Other) đang “giữ” đuôi `ext` qua danh sách built-in hoặc extra,
 * chỉ dựa trên đuôi (không xét MIME). Dùng UI để cảnh báo: routing luôn xét các nhóm này trước thư mục tùy chỉnh.
 */
export function builtinCategoriesClaimingExtensionOnly(
  ext: string,
  typeCfg: TypeOrganizeResolved,
): Array<Exclude<TypeCategoryId, "other">> {
  if (!ext) return [];
  const x = typeCfg.extraExtensions;
  const r = typeCfg.removedBuiltinExtensions;
  const out: Array<Exclude<TypeCategoryId, "other">> = [];
  for (const id of BUILTIN_TYPE_ROUTE_ORDER) {
    const set =
      id === "image"
        ? builtinImageExtSet
        : id === "video"
          ? builtinVideoExtSet
          : id === "software"
            ? builtinSoftwareExtSet
            : id === "document"
              ? builtinDocumentExtSet
              : builtinCodeExtSet;
    if (builtinExtActive(r[id], ext, set) || extraHas(x[id], ext)) {
      out.push(id);
    }
  }
  return out;
}

export function typeFolderForDownload(
  item: chrome.downloads.DownloadItem,
  typeCfg: TypeOrganizeResolved,
): string {
  const ext = extensionOf(item.filename || fileBaseNameForItem(item));
  const mime = (item.mime || "").toLowerCase();
  const f = typeCfg.folderNames;
  const x = typeCfg.extraExtensions;
  const r = typeCfg.removedBuiltinExtensions;

  if (
    mime.startsWith("image/") ||
    builtinExtActive(r.image, ext, builtinImageExtSet) ||
    extraHas(x.image, ext)
  ) {
    return f.image;
  }
  if (
    mime.startsWith("video/") ||
    builtinExtActive(r.video, ext, builtinVideoExtSet) ||
    extraHas(x.video, ext)
  ) {
    return f.video;
  }
  if (builtinExtActive(r.software, ext, builtinSoftwareExtSet) || extraHas(x.software, ext)) {
    return f.software;
  }
  if (builtinExtActive(r.document, ext, builtinDocumentExtSet) || extraHas(x.document, ext)) {
    return f.document;
  }
  if (
    builtinExtActive(r.code, ext, builtinCodeExtSet) ||
    extraHas(x.code, ext) ||
    (mime.startsWith("text/") && ext)
  ) {
    return f.code;
  }
  for (const g of typeCfg.customTypeFolders) {
    if (g.extensions.length > 0 && g.extensions.includes(ext)) {
      return g.folderName;
    }
  }
  /* Không khớp nhóm mặc định (theo MIME/đuôi) hay thư mục tùy chỉnh → thư mục Other. */
  return f.other;
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
 * `typeOrganize` chỉ dùng khi `mode === "by-type"`; caller nên luôn truyền cấu hình đã load.
 */
export function suggestedRelativePathForOrganizeMode(
  mode: DownloadFolderOrganizeMode,
  item: chrome.downloads.DownloadItem,
  typeOrganize: TypeOrganizeResolved,
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
    return `${typeFolderForDownload(item, typeOrganize)}/${base}`;
  }
  if (mode === "by-source") {
    return `${sourceFolderForDownload(item)}/${base}`;
  }
  return null;
}
