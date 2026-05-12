import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Trash2, X } from "lucide-react";
import { useI18n } from "../i18n/I18nContext";
import type { MessageKey } from "../i18n/messages";
import { builtinCategoriesClaimingExtensionOnly } from "../lib/downloadPathRouting";
import { sanitizePathSegment } from "../lib/pathSegment";
import { listBuiltinExtensionsForOrganizeCategory } from "../lib/typeBuiltinExtensions";
import {
  MAX_CUSTOM_TYPE_FOLDERS,
  TYPE_CATEGORY_IDS,
  TYPE_ORGANIZE_STORAGE_KEY,
  coerceTypeFolderName,
  defaultTypeOrganizeResolved,
  loadTypeOrganizeConfig,
  newCustomTypeFolderId,
  normalizeExtToken,
  saveTypeOrganizeConfig,
  type TypeCategoryId,
  type TypeOrganizeResolved,
} from "../lib/typeOrganizeSettings";

const CATEGORY_LABEL_KEY: Record<TypeCategoryId, MessageKey> = {
  image: "settingsTypeCatImage",
  video: "settingsTypeCatVideo",
  document: "settingsTypeCatDocument",
  code: "settingsTypeCatCode",
  software: "settingsTypeCatSoftware",
  other: "settingsTypeCatOther",
};

function sortedUnique(list: readonly string[]): string[] {
  return [...new Set(list)].sort((a, b) => a.localeCompare(b));
}

type RowKey = `builtin:${TypeCategoryId}` | `custom:${string}`;

function builtinRowKey(id: TypeCategoryId): RowKey {
  return `builtin:${id}`;
}

function customRowKey(id: string): RowKey {
  return `custom:${id}`;
}

function activeExtensionCount(cfg: TypeOrganizeResolved, id: TypeCategoryId): number {
  if (id === "other") return 0;
  const kept = listBuiltinExtensionsForOrganizeCategory(id).filter(
    (b) => !cfg.removedBuiltinExtensions[id].includes(b),
  );
  return kept.length + cfg.extraExtensions[id].length;
}

export type TypeOrganizeSettingsSectionProps = {
  embedded?: boolean;
};

export function TypeOrganizeSettingsSection({ embedded = false }: TypeOrganizeSettingsSectionProps) {
  const { t } = useI18n();
  const defaults = useMemo(() => defaultTypeOrganizeResolved(), []);
  const [cfg, setCfg] = useState<TypeOrganizeResolved | null>(null);
  const [typingFolders, setTypingFolders] = useState<Partial<Record<TypeCategoryId, string>>>({});
  const [extDraft, setExtDraft] = useState<Partial<Record<TypeCategoryId, string>>>({});
  const [typingCustomFolders, setTypingCustomFolders] = useState<Record<string, string>>({});
  const [extDraftCustom, setExtDraftCustom] = useState<Record<string, string>>({});
  const [openRowKey, setOpenRowKey] = useState<RowKey | null>(null);
  const [customBuiltinExtConflict, setCustomBuiltinExtConflict] = useState<{
    groupId: string;
    message: string;
  } | null>(null);
  const skipSaveRef = useRef(true);

  const toggleRow = (key: RowKey) => {
    setOpenRowKey((k) => (k === key ? null : key));
  };

  /** Sync `cfg` from storage only; keep expanded row and extension drafts (avoids collapse after debounced save). */
  const applyConfigFromStorage = useCallback(async () => {
    const c = await loadTypeOrganizeConfig();
    skipSaveRef.current = true;
    setCfg(c);
  }, []);

  const refresh = useCallback(async () => {
    const c = await loadTypeOrganizeConfig();
    skipSaveRef.current = true;
    setTypingFolders({});
    setExtDraft({});
    setTypingCustomFolders({});
    setExtDraftCustom({});
    setOpenRowKey(null);
    setCustomBuiltinExtConflict(null);
    setCfg(c);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !changes[TYPE_ORGANIZE_STORAGE_KEY]) return;
      void applyConfigFromStorage();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [applyConfigFromStorage]);

  useEffect(() => {
    if (cfg == null) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    const tmr = setTimeout(() => {
      void saveTypeOrganizeConfig(cfg);
    }, 450);
    return () => clearTimeout(tmr);
  }, [cfg]);

  useEffect(() => {
    if (cfg == null || openRowKey == null) return;
    if (openRowKey.startsWith("custom:")) {
      const cid = openRowKey.slice("custom:".length);
      if (!cfg.customTypeFolders.some((c) => c.id === cid)) setOpenRowKey(null);
    }
  }, [cfg, openRowKey]);

  const resetDefaults = () => {
    const next = defaultTypeOrganizeResolved();
    skipSaveRef.current = true;
    setTypingFolders({});
    setExtDraft({});
    setTypingCustomFolders({});
    setExtDraftCustom({});
    setOpenRowKey(null);
    setCustomBuiltinExtConflict(null);
    setCfg(next);
    void saveTypeOrganizeConfig(next);
  };

  const commitAddExt = (id: TypeCategoryId) => {
    const raw = extDraft[id] ?? "";
    const token = normalizeExtToken(raw);
    if (!token) return;
    setExtDraft((d) => ({ ...d, [id]: "" }));

    const builtins = [...listBuiltinExtensionsForOrganizeCategory(id)];
    const isBuiltin = builtins.includes(token);

    setCfg((p) => {
      if (!p) return p;
      if (isBuiltin) {
        const removed = [...p.removedBuiltinExtensions[id]];
        const ri = removed.indexOf(token);
        if (ri < 0) return p;
        removed.splice(ri, 1);
        return { ...p, removedBuiltinExtensions: { ...p.removedBuiltinExtensions, [id]: removed } };
      }
      const extras = [...p.extraExtensions[id]];
      if (extras.includes(token)) return p;
      extras.push(token);
      return { ...p, extraExtensions: { ...p.extraExtensions, [id]: extras } };
    });
  };

  const removeExtBadge = (id: TypeCategoryId, token: string) => {
    const builtins = [...listBuiltinExtensionsForOrganizeCategory(id)];
    const isBuiltin = builtins.includes(token);
    setCfg((p) => {
      if (!p) return p;
      if (isBuiltin) {
        if (p.removedBuiltinExtensions[id].includes(token)) return p;
        return {
          ...p,
          removedBuiltinExtensions: {
            ...p.removedBuiltinExtensions,
            [id]: [...p.removedBuiltinExtensions[id], token],
          },
        };
      }
      return {
        ...p,
        extraExtensions: {
          ...p.extraExtensions,
          [id]: p.extraExtensions[id].filter((e) => e !== token),
        },
      };
    });
  };

  const addCustomFolder = () => {
    if (!cfg || cfg.customTypeFolders.length >= MAX_CUSTOM_TYPE_FOLDERS) return;
    const defaultName = coerceTypeFolderName(t("settingsTypeCustomFolderDefaultName"), "My-folder");
    const newId = newCustomTypeFolderId();
    setCfg((p) => {
      if (!p || p.customTypeFolders.length >= MAX_CUSTOM_TYPE_FOLDERS) return p;
      if (p.customTypeFolders.some((c) => c.id === newId)) return p;
      return {
        ...p,
        customTypeFolders: [
          ...p.customTypeFolders,
          { id: newId, folderName: defaultName, extensions: [] },
        ],
      };
    });
    setOpenRowKey(customRowKey(newId));
  };

  const removeCustomFolder = (id: string) => {
    setTypingCustomFolders((m) => {
      const { [id]: _a, ...rest } = m;
      return rest;
    });
    setExtDraftCustom((m) => {
      const { [id]: _b, ...rest } = m;
      return rest;
    });
    setCustomBuiltinExtConflict((c) => (c?.groupId === id ? null : c));
    setCfg((p) => (p ? { ...p, customTypeFolders: p.customTypeFolders.filter((c) => c.id !== id) } : p));
  };

  const commitAddCustomExt = (groupId: string) => {
    const raw = extDraftCustom[groupId] ?? "";
    const token = normalizeExtToken(raw);
    if (!token || !cfg) return;

    const claiming = builtinCategoriesClaimingExtensionOnly(token, cfg);
    if (claiming.length > 0) {
      const groups = claiming.map((id) => t(CATEGORY_LABEL_KEY[id])).join(", ");
      setCustomBuiltinExtConflict({
        groupId,
        message: t("settingsTypeCustomExtConflictBuiltin", { ext: token, groups }),
      });
      return;
    }

    setCustomBuiltinExtConflict((c) => (c?.groupId === groupId ? null : c));
    setExtDraftCustom((m) => ({ ...m, [groupId]: "" }));
    setCfg((p) => {
      if (!p) return p;
      return {
        ...p,
        customTypeFolders: p.customTypeFolders.map((c) => {
          if (c.id !== groupId) return c;
          if (c.extensions.includes(token)) return c;
          return { ...c, extensions: [...c.extensions, token] };
        }),
      };
    });
  };

  const removeCustomExt = (groupId: string, token: string) => {
    setCfg((p) => {
      if (!p) return p;
      return {
        ...p,
        customTypeFolders: p.customTypeFolders.map((c) =>
          c.id === groupId
            ? { ...c, extensions: c.extensions.filter((e) => e !== token) }
            : c,
        ),
      };
    });
  };

  if (cfg == null) {
    return (
      <p className={`text-sm text-zinc-600 dark:text-zinc-500 ${embedded ? "mt-0" : "mt-4"}`}>
        {t("settingsLoading")}
      </p>
    );
  }

  return (
    <section
      className={`mx-auto max-w-2xl ${
        embedded
          ? ""
          : "mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {t("settingsTypeFoldersSectionTitle")}
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("settingsTypeFoldersSectionLead")}
          </p>
        </div>
        <button
          type="button"
          onClick={resetDefaults}
          className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {t("settingsTypeResetDefaults")}
        </button>
      </div>

      <ul className="mt-6 flex flex-col gap-2">
        {TYPE_CATEGORY_IDS.map((id) => {
          const fallback = defaults.folderNames[id];
          const folderValue = typingFolders[id] ?? cfg.folderNames[id];
          const rowKey = builtinRowKey(id);
          const open = openRowKey === rowKey;
          const panelId = `type-folder-builtin-${id}`;
          const rowTitle = t(CATEGORY_LABEL_KEY[id]);
          const collapsedSub =
            id === "other"
              ? cfg.folderNames.other
              : t("settingsTypeCollapsedHint", {
                  folder: cfg.folderNames[id],
                  count: activeExtensionCount(cfg, id),
                });
          const keptBuiltinExts =
            id === "other"
              ? []
              : sortedUnique(
                  listBuiltinExtensionsForOrganizeCategory(id).filter(
                    (b) => !cfg.removedBuiltinExtensions[id].includes(b),
                  ),
                );
          const extraExts = id === "other" ? [] : sortedUnique(cfg.extraExtensions[id]);
          const hasAnyBuiltinExt = keptBuiltinExts.length > 0 || extraExts.length > 0;
          return (
            <li
              key={id}
              className={`rounded-2xl border border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/50 ${
                open ? "p-4" : "px-3 py-1"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45"
                aria-expanded={open}
                aria-controls={panelId}
                aria-label={t("settingsTypeToggleRowAria", { name: rowTitle })}
                onClick={() => toggleRow(rowKey)}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{rowTitle}</span>
                  {!open ? (
                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {collapsedSub}
                    </span>
                  ) : null}
                </div>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 ease-out will-change-transform dark:text-zinc-400 ${
                    open ? "rotate-180" : "rotate-0"
                  }`}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  id={panelId}
                  className="border-t border-zinc-100 pt-3 dark:border-zinc-800/90"
                >
                  <label className="block">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {t("settingsTypeFolderNameLabel")}
                    </span>
                    <input
                      type="text"
                      value={folderValue}
                      onChange={(e) =>
                        setTypingFolders((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                      onBlur={() => {
                        const raw = typingFolders[id] ?? cfg.folderNames[id];
                        const next = coerceTypeFolderName(raw, fallback);
                        setTypingFolders(({ [id]: _removed, ...rest }) => rest);
                        setCfg((p) => {
                          if (!p || p.folderNames[id] === next) return p;
                          return { ...p, folderNames: { ...p.folderNames, [id]: next } };
                        });
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-cyan-500/40 focus:border-cyan-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </label>
                  {id === "other" ? (
                    <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t("settingsTypeOtherExtNote")}
                    </p>
                  ) : (
                    <div className="mt-3">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        {t("settingsTypeExtensionsLabel")}
                      </span>
                      <div className="mt-2 flex min-h-[2rem] flex-wrap items-center gap-2">
                        {!hasAnyBuiltinExt ? (
                          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {t("settingsTypeExtensionsEmpty")}
                          </p>
                        ) : (
                          <>
                            {keptBuiltinExts.map((ext) => (
                              <span
                                key={`b-${ext}`}
                                className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100/90 pl-2.5 pr-1 py-0.5 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100"
                              >
                                <span className="select-all">.{ext}</span>
                                <button
                                  type="button"
                                  onClick={() => removeExtBadge(id, ext)}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
                                  aria-label={t("settingsTypeRemoveExtAria", { ext })}
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </button>
                              </span>
                            ))}
                            {extraExts.map((ext) => (
                              <span
                                key={`e-${ext}`}
                                className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-50/90 pl-2.5 pr-1 py-0.5 text-xs font-medium text-cyan-950 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100"
                              >
                                <span className="select-all">.{ext}</span>
                                <button
                                  type="button"
                                  onClick={() => removeExtBadge(id, ext)}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-cyan-700/80 transition hover:bg-cyan-200/80 hover:text-cyan-950 dark:text-cyan-300/90 dark:hover:bg-cyan-900/80 dark:hover:text-cyan-50"
                                  aria-label={t("settingsTypeRemoveExtAria", { ext })}
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </button>
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={extDraft[id] ?? ""}
                          onChange={(e) =>
                            setExtDraft((d) => ({ ...d, [id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitAddExt(id);
                            }
                          }}
                          placeholder={t("settingsTypeAddExtPlaceholder")}
                          autoComplete="off"
                          spellCheck={false}
                          className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-cyan-500/40 placeholder:text-zinc-400 focus:border-cyan-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                        <button
                          type="button"
                          onClick={() => commitAddExt(id)}
                          className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 dark:bg-cyan-700 dark:hover:bg-cyan-600"
                        >
                          {t("settingsTypeAddExtButton")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {t("settingsTypeCustomSectionTitle")}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("settingsTypeCustomSectionLead")}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {t("settingsTypeCustomMaxFolders", { max: MAX_CUSTOM_TYPE_FOLDERS })}
            </p>
          </div>
          <button
            type="button"
            disabled={cfg.customTypeFolders.length >= MAX_CUSTOM_TYPE_FOLDERS}
            onClick={addCustomFolder}
            className="shrink-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t("settingsTypeAddCustomFolder")}
          </button>
        </div>

        {cfg.customTypeFolders.length > 0 ? (
          <ul className="mt-5 flex flex-col gap-2">
            {cfg.customTypeFolders.map((g) => {
              const nameFb =
                sanitizePathSegment(`Folder-${g.id.slice(0, 6)}`) ||
                coerceTypeFolderName(t("settingsTypeCustomFolderDefaultName"), "My-folder");
              const folderDisplay = typingCustomFolders[g.id] ?? g.folderName;
              const rowKey = customRowKey(g.id);
              const open = openRowKey === rowKey;
              const panelId = `type-folder-custom-${g.id}`;
              const toggleName = `${g.folderName} (${t("settingsTypeCustomFolderCardLabel")})`;
              const customExtsSorted = sortedUnique(g.extensions);
              return (
                <li
                  key={g.id}
                  className={`rounded-2xl border border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/50 ${
                    open ? "p-4" : "px-3 py-1"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg py-2 pl-1 pr-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45"
                      aria-expanded={open}
                      aria-controls={panelId}
                      aria-label={t("settingsTypeToggleRowAria", { name: toggleName })}
                      onClick={() => toggleRow(rowKey)}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {g.folderName}
                        </span>
                        {!open ? (
                          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {t("settingsTypeCollapsedHint", {
                              folder: t("settingsTypeCustomFolderCardLabel"),
                              count: g.extensions.length,
                            })}
                          </span>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 ease-out will-change-transform dark:text-zinc-400 ${
                          open ? "rotate-180" : "rotate-0"
                        }`}
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomFolder(g.id);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                      aria-label={t("settingsTypeDeleteCustomFolderAria", { name: g.folderName })}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                  {open ? (
                    <div
                      id={panelId}
                      className="border-t border-zinc-100 pt-3 dark:border-zinc-800/90"
                    >
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t("settingsTypeFolderNameLabel")}
                        </span>
                        <input
                          type="text"
                          value={folderDisplay}
                          onChange={(e) =>
                            setTypingCustomFolders((m) => ({ ...m, [g.id]: e.target.value }))
                          }
                          onBlur={() => {
                            const raw = typingCustomFolders[g.id] ?? g.folderName;
                            const next = coerceTypeFolderName(raw, nameFb);
                            setTypingCustomFolders(({ [g.id]: _x, ...rest }) => rest);
                            setCfg((p) => {
                              if (!p) return p;
                              return {
                                ...p,
                                customTypeFolders: p.customTypeFolders.map((c) =>
                                  c.id === g.id && c.folderName !== next
                                    ? { ...c, folderName: next }
                                    : c,
                                ),
                              };
                            });
                          }}
                          autoComplete="off"
                          spellCheck={false}
                          className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-cyan-500/40 focus:border-cyan-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        />
                      </label>
                      <div className="mt-3">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                          {t("settingsTypeExtensionsLabel")}
                        </span>
                        <div className="mt-2 flex min-h-[2rem] flex-wrap items-center gap-2">
                          {customExtsSorted.length === 0 ? (
                            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                              {t("settingsTypeExtensionsEmpty")}
                            </p>
                          ) : (
                            customExtsSorted.map((ext) => (
                              <span
                                key={ext}
                                className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-50/90 pl-2.5 pr-1 py-0.5 text-xs font-medium text-cyan-950 dark:border-cyan-500/30 dark:bg-cyan-950/40 dark:text-cyan-100"
                              >
                                <span className="select-all">.{ext}</span>
                                <button
                                  type="button"
                                  onClick={() => removeCustomExt(g.id, ext)}
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-cyan-700/80 transition hover:bg-cyan-200/80 hover:text-cyan-950 dark:text-cyan-300/90 dark:hover:bg-cyan-900/80 dark:hover:text-cyan-50"
                                  aria-label={t("settingsTypeRemoveExtAria", { ext })}
                                >
                                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                                </button>
                              </span>
                            ))
                          )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          {customBuiltinExtConflict?.groupId === g.id ? (
                            <p
                              className="rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-sm leading-snug text-amber-950 dark:border-amber-900/55 dark:bg-amber-950/35 dark:text-amber-100/95"
                              role="alert"
                            >
                              {customBuiltinExtConflict.message}
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="text"
                              value={extDraftCustom[g.id] ?? ""}
                              onChange={(e) => {
                                setExtDraftCustom((m) => ({ ...m, [g.id]: e.target.value }));
                                setCustomBuiltinExtConflict((c) => (c?.groupId === g.id ? null : c));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitAddCustomExt(g.id);
                                }
                              }}
                              placeholder={t("settingsTypeAddExtPlaceholder")}
                              autoComplete="off"
                              spellCheck={false}
                              className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-cyan-500/40 placeholder:text-zinc-400 focus:border-cyan-500/50 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                            />
                            <button
                              type="button"
                              onClick={() => commitAddCustomExt(g.id)}
                              className="shrink-0 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 dark:bg-cyan-700 dark:hover:bg-cyan-600"
                            >
                              {t("settingsTypeAddExtButton")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
