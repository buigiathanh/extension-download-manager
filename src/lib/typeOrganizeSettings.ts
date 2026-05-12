import { sanitizePathSegment } from "./pathSegment";
import { listBuiltinExtensionsForOrganizeCategory } from "./typeBuiltinExtensions";

export const TYPE_ORGANIZE_STORAGE_KEY = "downloadTypeOrganize";

/** Giới hạn số thư mục tùy chỉnh (tránh payload quá lớn). */
export const MAX_CUSTOM_TYPE_FOLDERS = 24;

export type TypeCategoryId =
  | "image"
  | "video"
  | "document"
  | "code"
  | "software"
  | "other";

export const TYPE_CATEGORY_IDS: TypeCategoryId[] = [
  "image",
  "video",
  "document",
  "code",
  "software",
  "other",
];

export type CustomTypeFolder = {
  id: string;
  folderName: string;
  extensions: string[];
};

const DEFAULT_FOLDERS: Record<TypeCategoryId, string> = {
  image: "Images",
  video: "Videos",
  document: "Documents",
  code: "Code",
  software: "Software",
  other: "Other",
};

/** Tên thư mục mặc định cũ (trước khi đổi sang tiếng Anh) — migrate khi khớp chính xác. */
const LEGACY_DEFAULT_FOLDERS: Partial<Record<TypeCategoryId, string>> = {
  image: "Hinh-anh",
  document: "Tai-lieu",
  code: "Ma-nguon",
  software: "Phan-mem",
  other: "Khac",
};

export type TypeOrganizePersisted = {
  folderNames?: Partial<Record<TypeCategoryId, string>>;
  extraExtensions?: Partial<Record<TypeCategoryId, string[]>>;
  removedBuiltinExtensions?: Partial<Record<TypeCategoryId, string[]>>;
  customTypeFolders?: CustomTypeFolder[];
};

export type TypeOrganizeResolved = {
  folderNames: Record<TypeCategoryId, string>;
  extraExtensions: Record<TypeCategoryId, string[]>;
  removedBuiltinExtensions: Record<TypeCategoryId, string[]>;
  customTypeFolders: CustomTypeFolder[];
};

export function newCustomTypeFolderId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeExtToken(s: string): string {
  let t = s.trim().toLowerCase();
  while (t.startsWith(".")) t = t.slice(1);
  return t.replace(/[^a-z0-9.+_-]/g, "");
}

export function parseExtensionsFromInput(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[\s,;]+/u)) {
    const n = normalizeExtToken(part);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function resolveFolderNameInput(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!t) return fallback;
  const s = sanitizePathSegment(t);
  return s || fallback;
}

/** Chuẩn hoá tên thư mục con do người dùng nhập (dùng trong UI). */
export function coerceTypeFolderName(raw: string, fallback: string): string {
  return resolveFolderNameInput(raw, fallback);
}

function emptyRemovedRecord(): Record<TypeCategoryId, string[]> {
  return {
    image: [],
    video: [],
    document: [],
    code: [],
    software: [],
    other: [],
  };
}

export function defaultTypeOrganizeResolved(): TypeOrganizeResolved {
  return {
    folderNames: { ...DEFAULT_FOLDERS },
    extraExtensions: {
      image: [],
      video: [],
      document: [],
      code: [],
      software: [],
      other: [],
    },
    removedBuiltinExtensions: emptyRemovedRecord(),
    customTypeFolders: [],
  };
}

function sanitizeRemovedList(
  id: TypeCategoryId,
  raw: string[] | undefined,
): string[] {
  if (!raw || id === "other") return [];
  const allowed = new Set(listBuiltinExtensionsForOrganizeCategory(id));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const e of raw) {
    const n = normalizeExtToken(typeof e === "string" ? e : "");
    if (!n || !allowed.has(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

function normalizeCustomTypeFolders(raw: unknown): CustomTypeFolder[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomTypeFolder[] = [];
  const seenIds = new Set<string>();
  for (const row of raw) {
    if (out.length >= MAX_CUSTOM_TYPE_FOLDERS) break;
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const idRaw = typeof r.id === "string" ? r.id.trim() : "";
    const id = idRaw ? idRaw.slice(0, 120) : newCustomTypeFolderId();
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const fallback = sanitizePathSegment(`Folder-${id.slice(0, 6)}`) || "Folder";
    const rawName = typeof r.folderName === "string" ? r.folderName : "";
    const folderName = resolveFolderNameInput(rawName, fallback);
    const exArr = Array.isArray(r.extensions) ? r.extensions : [];
    const extensions = parseExtensionsFromInput(
      exArr.filter((x): x is string => typeof x === "string").join(" "),
    );
    out.push({ id, folderName, extensions });
  }
  return out;
}

export function resolveTypeOrganize(raw: unknown): TypeOrganizeResolved {
  const base = defaultTypeOrganizeResolved();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as TypeOrganizePersisted;

  for (const id of TYPE_CATEGORY_IDS) {
    const fn = o.folderNames?.[id];
    if (typeof fn === "string") {
      base.folderNames[id] = resolveFolderNameInput(fn, DEFAULT_FOLDERS[id]);
    }
    const ex = o.extraExtensions?.[id];
    if (Array.isArray(ex)) {
      base.extraExtensions[id] = parseExtensionsFromInput(ex.join(" "));
    }
    const rm = o.removedBuiltinExtensions?.[id];
    if (Array.isArray(rm)) {
      base.removedBuiltinExtensions[id] = sanitizeRemovedList(id, rm);
    }
  }

  for (const id of TYPE_CATEGORY_IDS) {
    const legacy = LEGACY_DEFAULT_FOLDERS[id];
    if (legacy != null && base.folderNames[id] === legacy) {
      base.folderNames[id] = DEFAULT_FOLDERS[id];
    }
  }

  for (const id of TYPE_CATEGORY_IDS) {
    if (id === "other") continue;
    const allowed = new Set(listBuiltinExtensionsForOrganizeCategory(id));
    base.extraExtensions[id] = base.extraExtensions[id].filter(
      (e) => !allowed.has(e) || base.removedBuiltinExtensions[id].includes(e),
    );
  }

  base.customTypeFolders = normalizeCustomTypeFolders(o.customTypeFolders);

  return base;
}

export async function loadTypeOrganizeConfig(): Promise<TypeOrganizeResolved> {
  const r = await chrome.storage.local.get(TYPE_ORGANIZE_STORAGE_KEY);
  return resolveTypeOrganize(r[TYPE_ORGANIZE_STORAGE_KEY]);
}

export async function saveTypeOrganizeConfig(cfg: TypeOrganizeResolved): Promise<void> {
  const payload: TypeOrganizePersisted = {
    folderNames: { ...cfg.folderNames },
    extraExtensions: { ...cfg.extraExtensions },
    removedBuiltinExtensions: { ...cfg.removedBuiltinExtensions },
    customTypeFolders: cfg.customTypeFolders.map((c) => ({
      id: c.id,
      folderName: c.folderName,
      extensions: [...c.extensions],
    })),
  };
  await chrome.storage.local.set({ [TYPE_ORGANIZE_STORAGE_KEY]: payload });
}
