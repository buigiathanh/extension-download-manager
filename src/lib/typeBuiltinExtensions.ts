/**
 * Danh sách đuôi file mặc định theo nhóm — dùng chung cho routing và UI Cài đặt.
 */
export const BUILTIN_IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "ico",
  "bmp",
  "heic",
  "avif",
] as const;

export const BUILTIN_VIDEO_EXTENSIONS = [
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
] as const;

export const BUILTIN_DOCUMENT_EXTENSIONS = [
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
] as const;

export const BUILTIN_CODE_EXTENSIONS = [
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
] as const;

export const BUILTIN_SOFTWARE_EXTENSIONS = [
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
] as const;

export type BuiltinOrganizeCategoryId =
  | "image"
  | "video"
  | "document"
  | "code"
  | "software"
  | "other";

export function listBuiltinExtensionsForOrganizeCategory(
  id: BuiltinOrganizeCategoryId,
): readonly string[] {
  switch (id) {
    case "image":
      return BUILTIN_IMAGE_EXTENSIONS;
    case "video":
      return BUILTIN_VIDEO_EXTENSIONS;
    case "document":
      return BUILTIN_DOCUMENT_EXTENSIONS;
    case "code":
      return BUILTIN_CODE_EXTENSIONS;
    case "software":
      return BUILTIN_SOFTWARE_EXTENSIONS;
    default:
      return [];
  }
}

export const builtinImageExtSet = new Set<string>(BUILTIN_IMAGE_EXTENSIONS);
export const builtinVideoExtSet = new Set<string>(BUILTIN_VIDEO_EXTENSIONS);
export const builtinDocumentExtSet = new Set<string>(BUILTIN_DOCUMENT_EXTENSIONS);
export const builtinCodeExtSet = new Set<string>(BUILTIN_CODE_EXTENSIONS);
export const builtinSoftwareExtSet = new Set<string>(BUILTIN_SOFTWARE_EXTENSIONS);
