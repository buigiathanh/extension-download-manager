import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Check,
  ChevronDown,
  History,
  FileArchive,
  FileCode,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  Globe,
  Loader2,
  ListFilter,
  Minus,
  MoreVertical,
  Music,
  Search,
  Trash2,
} from "lucide-react";
import {
  baseName,
  dayKey,
  deleteDownload,
  eraseDownloadsHistory,
  extensionOf,
  faviconUrlForHost,
  filePresenceStatusLabel,
  isDownloadFileRemovedFromDisk,
  matchesFilePresenceFilter,
  type FilePresenceFilter,
  formatDayHeading,
  isBase64DataUrlDownload,
  isLocalhostSourceHost,
  sortDownloads,
  sourceHost,
  sourceHostDisplay,
  type SortKey,
} from "../lib/downloads";
import { ConfirmDialog } from "./ConfirmDialog";
import { ThemeToggle } from "./ThemeToggle";

function formatBytes(n: number): string {
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

function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function FileKindIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  const cls = "h-4 w-4 text-zinc-600 dark:text-zinc-500";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg", "ico"].includes(e))
    return <FileImage className={cls} aria-hidden />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(e))
    return <FileArchive className={cls} aria-hidden />;
  if (["mp4", "webm", "mov", "mkv"].includes(e)) return <Film className={cls} aria-hidden />;
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(e))
    return <Music className={cls} aria-hidden />;
  if (["js", "ts", "tsx", "jsx", "json", "html", "css", "py", "rs", "go"].includes(e))
    return <FileCode className={cls} aria-hidden />;
  return <FileText className={cls} aria-hidden />;
}

/** % tiến độ khi đang tải; `null` nếu chưa biết tổng dung lượng. */
function downloadProgressPercent(d: chrome.downloads.DownloadItem): number | null {
  if (d.state !== "in_progress") return null;
  const total = d.totalBytes;
  const got = d.bytesReceived ?? 0;
  if (total == null || total <= 0) return null;
  return Math.min(100, Math.round((got / total) * 100));
}

function FileDownloadProgressRing({ percent }: { percent: number }) {
  const r = 12;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const dashOffset = c * (1 - clamped / 100);
  return (
    <span className="relative flex h-full w-full items-center justify-center text-cyan-400">
      <svg width={32} height={32} viewBox="0 0 32 32" className="-rotate-90" aria-hidden>
        <circle cx="16" cy="16" r={r} fill="none" strokeWidth="2.5" className="stroke-zinc-300 dark:stroke-zinc-800" />
        <circle
          cx="16"
          cy="16"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-cyan-500 transition-[stroke-dashoffset] duration-200"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="pointer-events-none absolute flex items-baseline justify-center leading-none">
        <span className="text-[9px] font-bold tabular-nums text-zinc-800 dark:text-zinc-100">{clamped}</span>
        <span className="text-[7px] font-semibold text-zinc-500 dark:text-zinc-400">%</span>
      </span>
    </span>
  );
}

function dotColor(ext: string): string {
  const e = ext.toLowerCase();
  if (["pdf"].includes(e)) return "bg-rose-500";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(e)) return "bg-sky-500";
  if (["zip", "rar", "7z"].includes(e)) return "bg-amber-500";
  if (["mp4", "webm", "mov"].includes(e)) return "bg-violet-500";
  if (["mp3", "wav", "flac"].includes(e)) return "bg-emerald-500";
  return "bg-zinc-500";
}

function filePresenceBadgeClass(d: chrome.downloads.DownloadItem): string {
  if (d.state === "in_progress") {
    return "border-amber-800/55 bg-amber-950/45 text-amber-400/95";
  }
  if (isDownloadFileRemovedFromDisk(d)) {
    return "border-zinc-300/90 bg-zinc-100 text-zinc-600 dark:border-zinc-700/90 dark:bg-zinc-900 dark:text-zinc-500";
  }
  if (d.state === "complete") {
    return "border-emerald-200/80 bg-emerald-50/90 text-emerald-700 dark:border-emerald-900/45 dark:bg-emerald-950/30 dark:text-emerald-400/85";
  }
  return "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400";
}

const FILE_PRESENCE_OPTIONS: { value: FilePresenceFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "present", label: "Còn file trên máy" },
  { value: "removed", label: "Đã xoá khỏi máy" },
  { value: "downloading", label: "Đang tải" },
];

/** Dưới `lg`: cố định khi cuộn ngang — checkbox trái, tên sau checkbox, thao tác phải. */
const STICKY_TD_CB =
  "max-lg:sticky max-lg:left-0 max-lg:z-[24] max-lg:bg-white max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.12)] dark:max-lg:bg-zinc-950 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.55)]";
const STICKY_TD_NAME =
  "max-lg:sticky max-lg:left-11 max-lg:z-[23] max-lg:bg-white max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.08)] dark:max-lg:bg-zinc-950 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.35)]";
const STICKY_TD_ACTION =
  "max-lg:sticky max-lg:right-0 max-lg:z-[24] max-lg:bg-white max-lg:shadow-[-4px_0_14px_-6px_rgba(0,0,0,0.12)] dark:max-lg:bg-zinc-950 dark:max-lg:shadow-[-4px_0_14px_-6px_rgba(0,0,0,0.55)]";
const STICKY_TH_CB =
  "max-lg:sticky max-lg:left-0 max-lg:z-[38] max-lg:bg-white/95 max-lg:backdrop-blur-md max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.18)] dark:max-lg:bg-zinc-950/95 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.55)]";
const STICKY_TH_NAME =
  "max-lg:sticky max-lg:left-11 max-lg:z-[37] max-lg:bg-white/95 max-lg:backdrop-blur-md max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.12)] dark:max-lg:bg-zinc-950/95 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.4)]";
const STICKY_TH_ACTION =
  "max-lg:sticky max-lg:right-0 max-lg:z-[38] max-lg:bg-white/95 max-lg:backdrop-blur-md max-lg:shadow-[-4px_0_14px_-6px_rgba(0,0,0,0.18)] dark:max-lg:bg-zinc-950/95 dark:max-lg:shadow-[-4px_0_14px_-6px_rgba(0,0,0,0.55)]";
const STICKY_DAY_TD_CB =
  "max-lg:sticky max-lg:left-0 max-lg:z-[22] max-lg:bg-zinc-100 max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.12)] dark:max-lg:bg-zinc-900 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.45)]";
const STICKY_DAY_TD_REST =
  "max-lg:sticky max-lg:left-11 max-lg:z-[21] max-lg:bg-zinc-100 max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.08)] dark:max-lg:bg-zinc-900 dark:max-lg:shadow-[4px_0_14px_-6px_rgba(0,0,0,0.25)]";

/** Menu hàng: min-width ~ 11rem — dùng khi đặt vị trí portal */
const ROW_MENU_MIN_WIDTH_PX = 176;

/** Nhóm đuôi file cho badge nhanh (chỉ bật các đuôi đang có trong lịch sử). */
const FORMAT_BADGE_GROUPS = [
  {
    id: "image",
    label: "Hình ảnh",
    exts: ["png", "jpg", "jpeg", "webp", "gif", "svg", "ico", "bmp", "heic", "avif"],
  },
  {
    id: "document",
    label: "Tài liệu",
    exts: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf", "odt", "csv", "md"],
  },
  {
    id: "video",
    label: "Video",
    exts: ["mp4", "webm", "mov", "mkv", "avi", "flv", "wmv", "m4v", "mpeg", "mpg"],
  },
  {
    id: "code",
    label: "Code",
    exts: [
      "js",
      "ts",
      "tsx",
      "jsx",
      "json",
      "html",
      "htm",
      "css",
      "scss",
      "less",
      "py",
      "rs",
      "go",
      "vue",
      "java",
      "c",
      "cpp",
      "h",
      "php",
      "rb",
      "swift",
      "kt",
      "xml",
      "yaml",
      "yml",
    ],
  },
  { id: "zip", label: "Zip", exts: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz"] },
] as const;

type Props = {
  selectedDownloadId: number | null;
  onSelectDownload: (id: number | null) => void;
};

export function DownloadsPanel({ selectedDownloadId, onSelectDownload }: Props) {
  const [raw, setRaw] = useState<chrome.downloads.DownloadItem[]>([]);
  const [query, setQuery] = useState("");
  /** Đuôi file đang lọc (rỗng = tất cả). Có thể chọn nhiều định dạng. */
  const [selectedExts, setSelectedExts] = useState<string[]>([]);
  const [extHeaderFilterOpen, setExtHeaderFilterOpen] = useState(false);
  const [headerFilterRect, setHeaderFilterRect] = useState<DOMRect | null>(null);
  const [sourceHeaderFilterOpen, setSourceHeaderFilterOpen] = useState(false);
  const [sourceHeaderFilterRect, setSourceHeaderFilterRect] = useState<DOMRect | null>(null);
  const [filePresenceFilter, setFilePresenceFilter] = useState<FilePresenceFilter>("all");
  const [presenceHeaderFilterOpen, setPresenceHeaderFilterOpen] = useState(false);
  const [presenceHeaderFilterRect, setPresenceHeaderFilterRect] = useState<DOMRect | null>(null);
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("none");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<number | null>(null);
  const [rowMenuPos, setRowMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | null
    | { kind: "single"; id: number; fileLabel: string }
    | { kind: "bulk"; ids: number[] }
    | { kind: "eraseHistorySingle"; id: number; fileLabel: string }
    | { kind: "eraseHistoryBulk"; ids: number[] }
  >(null);
  const bulkRef = useRef<HTMLDivElement>(null);
  const extHeaderFilterBtnRef = useRef<HTMLButtonElement>(null);
  const extHeaderFilterPanelRef = useRef<HTMLDivElement>(null);
  const sourceHeaderFilterBtnRef = useRef<HTMLButtonElement>(null);
  const sourceHeaderFilterPanelRef = useRef<HTMLDivElement>(null);
  const presenceHeaderFilterBtnRef = useRef<HTMLButtonElement>(null);
  const presenceHeaderFilterPanelRef = useRef<HTMLDivElement>(null);
  const sourceFilterSearchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const downloadsScrollRef = useRef<HTMLDivElement>(null);

  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform || navigator.userAgent || "");

  const refresh = useCallback(() => {
    if (typeof chrome === "undefined" || chrome.downloads?.search == null) {
      console.warn(
        "[Download Manager] Không có chrome.downloads — hãy mở giao diện trong tab extension (URL bắt đầu bằng chrome-extension://…), không mở localhost trực tiếp trong Chrome.",
      );
      return;
    }
    void chrome.downloads
      .search({ orderBy: ["-startTime"] })
      .then((items) => {
        setRaw(items);
      })
      .catch((err) => {
        console.error("[Download Manager] chrome.downloads.search thất bại:", err);
      });
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    chrome.downloads.onCreated.addListener(on);
    chrome.downloads.onErased.addListener(on);
    chrome.downloads.onChanged.addListener(on);
    return () => {
      chrome.downloads.onCreated.removeListener(on);
      chrome.downloads.onErased.removeListener(on);
      chrome.downloads.onChanged.removeListener(on);
    };
  }, [refresh]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!bulkRef.current?.contains(t)) setBulkOpen(false);
      if (
        !extHeaderFilterBtnRef.current?.contains(t) &&
        !extHeaderFilterPanelRef.current?.contains(t)
      ) {
        setExtHeaderFilterOpen(false);
      }
      if (
        !sourceHeaderFilterBtnRef.current?.contains(t) &&
        !sourceHeaderFilterPanelRef.current?.contains(t)
      ) {
        setSourceHeaderFilterOpen(false);
      }
      if (
        !presenceHeaderFilterBtnRef.current?.contains(t) &&
        !presenceHeaderFilterPanelRef.current?.contains(t)
      ) {
        setPresenceHeaderFilterOpen(false);
      }
      if (!menuRef.current?.contains(t)) setRowMenuId(null);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  useEffect(() => {
    if (!extHeaderFilterOpen) {
      setHeaderFilterRect(null);
      return;
    }
    const sync = () => {
      const el = extHeaderFilterBtnRef.current;
      setHeaderFilterRect(el ? el.getBoundingClientRect() : null);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const sc = downloadsScrollRef.current;
    sc?.addEventListener("scroll", sync, { passive: true });
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      sc?.removeEventListener("scroll", sync);
    };
  }, [extHeaderFilterOpen]);

  useEffect(() => {
    if (!sourceHeaderFilterOpen) {
      setSourceHeaderFilterRect(null);
      return;
    }
    const sync = () => {
      const el = sourceHeaderFilterBtnRef.current;
      setSourceHeaderFilterRect(el ? el.getBoundingClientRect() : null);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const sc = downloadsScrollRef.current;
    sc?.addEventListener("scroll", sync, { passive: true });
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      sc?.removeEventListener("scroll", sync);
    };
  }, [sourceHeaderFilterOpen]);

  useEffect(() => {
    if (!presenceHeaderFilterOpen) {
      setPresenceHeaderFilterRect(null);
      return;
    }
    const sync = () => {
      const el = presenceHeaderFilterBtnRef.current;
      setPresenceHeaderFilterRect(el ? el.getBoundingClientRect() : null);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const sc = downloadsScrollRef.current;
    sc?.addEventListener("scroll", sync, { passive: true });
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      sc?.removeEventListener("scroll", sync);
    };
  }, [presenceHeaderFilterOpen]);

  useEffect(() => {
    if (!extHeaderFilterOpen && !sourceHeaderFilterOpen && !presenceHeaderFilterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExtHeaderFilterOpen(false);
        setSourceHeaderFilterOpen(false);
        setPresenceHeaderFilterOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [extHeaderFilterOpen, sourceHeaderFilterOpen, presenceHeaderFilterOpen]);

  useEffect(() => {
    if (!sourceHeaderFilterOpen) {
      setSourceSearchQuery("");
      return;
    }
    const id = requestAnimationFrame(() => {
      sourceFilterSearchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [sourceHeaderFilterOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const withoutInterrupted = useMemo(
    () => raw.filter((d) => d.state !== "interrupted"),
    [raw],
  );

  const extensionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const d of withoutInterrupted) {
      const ex = extensionOf(d.filename);
      if (ex) s.add(ex);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [withoutInterrupted]);

  const sourceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const d of withoutInterrupted) {
      const h = sourceHost(d);
      if (h && h !== "—") s.add(h);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [withoutInterrupted]);

  const filteredSourceOptionsForDropdown = useMemo(() => {
    const q = sourceSearchQuery.trim().toLowerCase();
    if (!q) return sourceOptions;
    return sourceOptions.filter((h) => h.toLowerCase().includes(q));
  }, [sourceOptions, sourceSearchQuery]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withoutInterrupted.filter((d) => {
      const name = baseName(d.filename).toLowerCase();
      if (q && !name.includes(q)) return false;
      if (selectedExts.length > 0) {
        const ex = extensionOf(d.filename);
        if (!selectedExts.includes(ex)) return false;
      }
      if (sourceFilter && sourceHost(d) !== sourceFilter) return false;
      if (!matchesFilePresenceFilter(d, filePresenceFilter)) return false;
      return true;
    });
  }, [withoutInterrupted, query, selectedExts, sourceFilter, filePresenceFilter]);

  const sorted = useMemo(
    () => sortDownloads(filtered, sortKey),
    [filtered, sortKey],
  );

  const rowMenuDownload = useMemo(
    () => (rowMenuId != null ? sorted.find((d) => d.id === rowMenuId) : undefined),
    [rowMenuId, sorted],
  );

  useLayoutEffect(() => {
    if (rowMenuId == null) {
      setRowMenuPos(null);
      return;
    }
    if (!sorted.some((d) => d.id === rowMenuId)) {
      setRowMenuId(null);
      setRowMenuPos(null);
      return;
    }
    const sync = () => {
      const el = document.querySelector(`[data-row-menu-anchor="${rowMenuId}"]`);
      if (!(el instanceof HTMLElement)) {
        setRowMenuPos(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const menuW = ROW_MENU_MIN_WIDTH_PX;
      let left = r.right - menuW;
      left = Math.max(8, Math.min(left, vw - menuW - 8));
      let top = r.bottom + 4;
      const estimatedMenuH = 200;
      if (top + estimatedMenuH > vh - 8) {
        top = Math.max(8, r.top - estimatedMenuH - 4);
      }
      setRowMenuPos({ top, left });
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const sc = downloadsScrollRef.current;
    sc?.addEventListener("scroll", sync, { passive: true });
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      sc?.removeEventListener("scroll", sync);
    };
  }, [rowMenuId, sorted]);

  useEffect(() => {
    if (rowMenuId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRowMenuId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rowMenuId]);

  const byDay = useMemo(() => {
    const map = new Map<string, chrome.downloads.DownloadItem[]>();
    for (const d of sorted) {
      const k = dayKey(d.startTime);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(d);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  }, [sorted]);

  /** Chỉ chế độ mặc định (`none`) nhóm theo ngày; mọi sort khác → danh sách phẳng. */
  const groupTableByDay = sortKey === "none";

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const visibleIds = useMemo(() => sorted.map((d) => d.id), [sorted]);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected =
    visibleIds.some((id) => selectedIds.has(id)) && !allVisibleSelected;

  const toggleSelectAllVisible = () => {
    if (visibleIds.length === 0) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (visibleIds.every((id) => n.has(id))) {
        for (const id of visibleIds) n.delete(id);
      } else {
        for (const id of visibleIds) n.add(id);
      }
      return n;
    });
  };

  const toggleSelectDayGroup = (list: chrome.downloads.DownloadItem[]) => {
    const ids = list.map((d) => d.id);
    if (ids.length === 0) return;
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (ids.every((id) => n.has(id))) {
        for (const id of ids) n.delete(id);
      } else {
        for (const id of ids) n.add(id);
      }
      return n;
    });
  };

  const clearChecks = () => setSelectedIds(new Set());

  const executeDeleteConfirmed = async () => {
    const dc = deleteConfirm;
    if (!dc) return;
    setDeleteConfirm(null);
    if (dc.kind === "single") {
      await deleteDownload(dc.id);
      if (selectedDownloadId === dc.id) onSelectDownload(null);
      refresh();
    } else if (dc.kind === "bulk") {
      for (const id of dc.ids) await deleteDownload(id);
      if (selectedDownloadId != null && dc.ids.includes(selectedDownloadId)) {
        onSelectDownload(null);
      }
      clearChecks();
      refresh();
    } else if (dc.kind === "eraseHistorySingle") {
      await eraseDownloadsHistory([dc.id]);
      if (selectedDownloadId === dc.id) onSelectDownload(null);
      refresh();
    } else {
      await eraseDownloadsHistory(dc.ids);
      if (selectedDownloadId != null && dc.ids.includes(selectedDownloadId)) {
        onSelectDownload(null);
      }
      clearChecks();
      refresh();
    }
  };

  const selectedExtsSet = useMemo(() => new Set(selectedExts), [selectedExts]);

  const toggleExtFilter = (ext: string) => {
    setSelectedExts((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext].sort((a, b) => a.localeCompare(b)),
    );
  };

  const clearExtFilters = () => setSelectedExts([]);

  const toggleCategoryGroup = useCallback(
    (group: (typeof FORMAT_BADGE_GROUPS)[number]) => {
      const available = group.exts.filter((e) => extensionOptions.includes(e));
      if (available.length === 0) return;
      setSelectedExts((prev) => {
        const s = new Set(prev);
        const allOn = available.every((e) => s.has(e));
        if (allOn) {
          for (const e of available) s.delete(e);
        } else {
          for (const e of available) s.add(e);
        }
        return [...s].sort((a, b) => a.localeCompare(b));
      });
    },
    [extensionOptions],
  );

  const renderPresenceFilterPanel = () => (
    <>
      {FILE_PRESENCE_OPTIONS.map(({ value, label }) => {
        const on = filePresenceFilter === value;
        return (
          <button
            key={value}
            type="button"
            role="option"
            aria-selected={on}
            onClick={(e) => {
              e.stopPropagation();
              setFilePresenceFilter(value);
              setPresenceHeaderFilterOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-zinc-700 hover:bg-zinc-200/90 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                on ? "border-zinc-200 bg-white text-zinc-900 shadow-sm" : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
              }`}
              aria-hidden
            >
              {on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
          </button>
        );
      })}
    </>
  );

  const renderExtFormatFilterPanel = () => (
    <>
      <button
        type="button"
        role="option"
        aria-selected={selectedExts.length === 0}
        onClick={(e) => {
          e.stopPropagation();
          clearExtFilters();
        }}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-zinc-700 hover:bg-zinc-200/90 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
            selectedExts.length === 0
              ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
              : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
          }`}
          aria-hidden
        >
          {selectedExts.length === 0 ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Tất cả định dạng</span>
      </button>
      <div className="flex flex-wrap gap-1.5 px-3 pb-2 pt-1">
        {FORMAT_BADGE_GROUPS.map((g) => {
          const available = g.exts.filter((e) => extensionOptions.includes(e));
          if (available.length === 0) return null;
          const allOn = available.every((e) => selectedExtsSet.has(e));
          return (
            <button
              key={g.id}
              type="button"
              title={`${g.label}: .${available.join(", .")}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleCategoryGroup(g);
              }}
              className={`rounded-full border-[0.5px] px-2.5 py-1 text-[11px] font-medium transition ${
                allOn
                  ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                  : "border-zinc-400/90 bg-zinc-200/70 text-zinc-600 hover:border-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:border-zinc-600/90 dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>
      <div className="mx-2 border-t border-zinc-200 dark:border-zinc-800" />
      {extensionOptions.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-zinc-600 dark:text-zinc-500">Chưa có đuôi file trong lịch sử.</p>
      ) : (
        <ul className="ext-filter-dropdown-scroll max-h-56 overflow-y-auto py-0.5 pr-0.5">
          {extensionOptions.map((ext) => {
            const on = selectedExtsSet.has(ext);
            return (
              <li key={ext}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExtFilter(ext);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-200/90 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                      on
                        ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                    }`}
                    aria-hidden
                  >
                    {on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${dotColor(ext)}`}
                      aria-hidden
                    />
                    <span className="truncate font-mono text-zinc-900 dark:text-zinc-100">.{ext}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const renderSourceFilterPanel = () => (
    <>
      <div className="border-b border-zinc-200 px-2 pb-2 pt-1.5 dark:border-zinc-800">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500 dark:text-zinc-500"
            aria-hidden
          />
          <input
            ref={sourceFilterSearchInputRef}
            type="search"
            value={sourceSearchQuery}
            onChange={(e) => setSourceSearchQuery(e.target.value)}
            placeholder="Tìm tên miền…"
            className="w-full rounded-md border border-zinc-300 bg-white py-1.5 pl-8 pr-2 text-xs text-zinc-800 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
      <button
        type="button"
        role="option"
        aria-selected={sourceFilter === ""}
        onClick={(e) => {
          e.stopPropagation();
          setSourceFilter("");
          setSourceHeaderFilterOpen(false);
        }}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-zinc-700 hover:bg-zinc-200/90 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
      >
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
            sourceFilter === ""
              ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
              : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
          }`}
          aria-hidden
        >
          {sourceFilter === "" ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
        </span>
        <span className="font-medium text-zinc-800 dark:text-zinc-200">Mọi nguồn</span>
      </button>
      <div className="mx-2 border-t border-zinc-200 dark:border-zinc-800" />
      {filteredSourceOptionsForDropdown.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-zinc-600 dark:text-zinc-500">
          {sourceOptions.length === 0
            ? "Chưa có tên miền trong lịch sử."
            : "Không có tên miền khớp."}
        </p>
      ) : (
        <ul className="ext-filter-dropdown-scroll max-h-56 overflow-y-auto py-0.5 pr-0.5">
          {filteredSourceOptionsForDropdown.map((h) => {
            const fav = faviconUrlForHost(h);
            const showGlobe = isLocalhostSourceHost(h);
            const sel = sourceFilter === h;
            return (
              <li key={h}>
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSourceFilter(h);
                    setSourceHeaderFilterOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-200/90 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                      sel
                        ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                        : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                    }`}
                    aria-hidden
                  >
                    {sel ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {showGlobe ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-zinc-300/90 text-zinc-600">
                        <Globe className="h-3 w-3" strokeWidth={2} aria-hidden />
                      </span>
                    ) : fav ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-zinc-300/90">
                        <img
                          src={fav}
                          alt=""
                          width={12}
                          height={12}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          className="h-3 w-3 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </span>
                    ) : (
                      <span
                        className="h-4 w-4 shrink-0 rounded-full bg-white ring-1 ring-zinc-300/90"
                        aria-hidden
                      />
                    )}
                    <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{h}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const renderDownloadRow = (d: chrome.downloads.DownloadItem, rowIndex: number) => {
    const name = baseName(d.filename);
    const ext = extensionOf(d.filename);
    const size = d.totalBytes ?? 0;
    const checked = selectedIds.has(d.id);
    const isRowActive = selectedDownloadId === d.id;
    const host = sourceHost(d);
    const hostDisplay = sourceHostDisplay(d);
    const sourceFavicon = faviconUrlForHost(host);
    const sourceGlobe = isLocalhostSourceHost(host) || isBase64DataUrlDownload(d);
    const progressPct = downloadProgressPercent(d);
    const fileRemovedFromDisk = isDownloadFileRemovedFromDisk(d);
    const presenceLabel = filePresenceStatusLabel(d);
    const zebraBg =
      rowIndex % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900";
    const zebraSticky =
      rowIndex % 2 === 0
        ? "max-lg:bg-white dark:max-lg:bg-zinc-950"
        : "max-lg:bg-zinc-50 dark:max-lg:bg-zinc-900";
    const stickyRowBg = fileRemovedFromDisk
      ? `${zebraSticky} max-lg:group-hover:bg-zinc-100/90 dark:max-lg:group-hover:bg-zinc-950/75`
      : isRowActive
        ? "max-lg:bg-zinc-200/80 dark:max-lg:bg-zinc-800/50"
        : `${zebraSticky} max-lg:group-hover:bg-zinc-100/90 dark:max-lg:group-hover:bg-zinc-900/60`;
    return (
      <tr
        key={d.id}
        onClick={() => onSelectDownload(d.id)}
        title={fileRemovedFromDisk ? "File đã xoá khỏi máy" : undefined}
        className={`group border-t border-zinc-200/90 transition dark:border-zinc-900/80 ${
          fileRemovedFromDisk
            ? `cursor-not-allowed opacity-[0.78] hover:opacity-[0.92] hover:bg-zinc-100/80 dark:hover:bg-zinc-950/75 ${
                isRowActive
                  ? "bg-zinc-200/50 ring-1 ring-inset ring-zinc-300/80 dark:bg-zinc-900/40 dark:ring-zinc-700/50"
                  : zebraBg
              }`
            : `cursor-pointer ${
                isRowActive
                  ? "bg-zinc-200/70 ring-1 ring-inset ring-zinc-300/90 dark:bg-zinc-800/50 dark:ring-zinc-700/80"
                  : `${zebraBg} hover:bg-zinc-100/90 dark:hover:bg-zinc-900/60`
              }`
        }`}
      >
        <td
          className={`py-2.5 pl-4 pr-1 align-middle ${STICKY_TD_CB} ${stickyRowBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={`Chọn ${name}`}
            onClick={() => toggleSelect(d.id)}
            className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950 ${
              checked
                ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-zinc-500"
            }`}
          >
            {checked ? <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden /> : null}
          </button>
        </td>
        <td className={`py-2.5 pr-3 align-middle ${STICKY_TD_NAME} ${stickyRowBg}`}>
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
              aria-label={
                d.state === "in_progress"
                  ? progressPct != null
                    ? `Đang tải ${progressPct}%`
                    : "Đang tải"
                  : undefined
              }
            >
              {d.state === "in_progress" ? (
                progressPct != null ? (
                  <FileDownloadProgressRing percent={progressPct} />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" aria-hidden />
                )
              ) : (
                <FileKindIcon ext={ext} />
              )}
            </span>
            <span
              className={`truncate font-medium ${
                fileRemovedFromDisk
                  ? "inline-block max-w-full text-zinc-500/85 blur-[0.4px] contrast-[0.92]"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
              title={fileRemovedFromDisk ? "File đã xoá khỏi máy" : undefined}
            >
              {name}
            </span>
            {d.state !== "complete" && (
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-400/90">
                {d.state}
              </span>
            )}
          </div>
        </td>
        <td className="py-2.5 pr-3 align-middle text-xs text-zinc-600 tabular-nums dark:text-zinc-500">
          {formatShortDate(d.startTime)}
        </td>
        <td
          className={`py-2.5 pr-3 align-middle text-xs tabular-nums ${
            d.state === "complete" ? "text-emerald-600 dark:text-emerald-400/90" : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {formatBytes(size)}
        </td>
        <td className="py-2.5 pr-3 align-middle">
          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(ext)}`} />
            {ext ? `.${ext}` : "—"}
          </span>
        </td>
        <td className="py-2.5 pr-3 align-middle">
          <span
            className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight ${filePresenceBadgeClass(d)}`}
            title={presenceLabel}
          >
            <span className="truncate">{presenceLabel}</span>
          </span>
        </td>
        <td className="py-2.5 pr-3 align-middle">
          <span className="flex min-w-0 items-center gap-2" title={hostDisplay}>
            {sourceGlobe ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-zinc-300/90 text-zinc-600">
                <Globe className="h-3 w-3" strokeWidth={2} aria-hidden />
              </span>
            ) : sourceFavicon ? (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-zinc-300/90">
                <img
                  src={sourceFavicon}
                  alt=""
                  width={12}
                  height={12}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-3 w-3 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </span>
            ) : (
              <span
                className="h-4 w-4 shrink-0 rounded-full bg-white ring-1 ring-zinc-300/90"
                aria-hidden
              />
            )}
            <span className="min-w-0 truncate text-xs text-zinc-600 dark:text-zinc-500">{hostDisplay}</span>
          </span>
        </td>
        <td
          className={`downloads-table-action-col relative box-border px-2 py-2.5 text-center align-middle ${STICKY_TD_ACTION} ${stickyRowBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-row-menu-anchor={d.id}
            title="Thêm thao tác"
            onClick={(e) => {
              e.stopPropagation();
              setRowMenuId((id) => (id === d.id ? null : d.id));
            }}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            aria-label="Menu thao tác"
            aria-expanded={rowMenuId === d.id}
            aria-haspopup="menu"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-xl flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-600"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm file, nguồn…"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-24 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600 dark:focus:ring-zinc-600"
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 select-none items-center gap-0.5 rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-sans text-[10px] font-medium text-zinc-600 sm:inline-flex dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500">
              {isMac ? "⌘" : "Ctrl"}+K
            </kbd>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
            {selectedIds.size > 0 ? (
              <div className="relative flex items-center gap-2" ref={bulkRef}>
                <span className="text-xs text-zinc-600 dark:text-zinc-500">
                  {selectedIds.size} đã chọn
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBulkOpen((o) => !o);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Thao tác
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {bulkOpen && (
                  <div className="absolute right-0 top-full z-40 mt-1 min-w-[168px] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      onClick={() => {
                        setBulkOpen(false);
                        setDeleteConfirm({ kind: "eraseHistoryBulk", ids: [...selectedIds] });
                      }}
                    >
                      <History className="h-3.5 w-3.5 shrink-0" />
                      Xoá khỏi lịch sử
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-zinc-800"
                      onClick={() => {
                        setBulkOpen(false);
                        setDeleteConfirm({ kind: "bulk", ids: [...selectedIds] });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      Xoá file và lịch sử
                    </button>
                  </div>
                )}
              </div>
            ) : null}
            <ThemeToggle />
            <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500">
              Download Manager
            </span>
            <button
              type="button"
              title="Thông báo (tuỳ chọn)"
              className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
              aria-label="Thông báo"
            >
              <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto" ref={downloadsScrollRef}>
        {sorted.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-600 dark:text-zinc-400">Không có file phù hợp.</p>
        ) : (
          <table
            id="downloads-file-table"
            className="w-full min-w-[880px] table-fixed border-separate border-spacing-0 text-sm"
          >
            <colgroup>
              <col style={{ width: "2.75rem" }} />
              <col />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: 80, minWidth: 80, maxWidth: 80 }} />
            </colgroup>
            <thead className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
                <th className={`w-11 py-2.5 pl-4 pr-1 align-middle ${STICKY_TH_CB}`} scope="col">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={
                      allVisibleSelected ? true : someVisibleSelected ? "mixed" : false
                    }
                    aria-label="Chọn tất cả file đang hiển thị"
                    disabled={visibleIds.length === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectAllVisible();
                    }}
                    className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-zinc-950 ${
                      allVisibleSelected
                        ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                        : someVisibleSelected
                          ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                          : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:hover:border-zinc-500"
                    }`}
                  >
                    {allVisibleSelected ? (
                      <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    ) : someVisibleSelected ? (
                      <Minus className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    ) : null}
                  </button>
                </th>
                <th
                  className={`min-w-0 py-2.5 pr-3 align-middle ${STICKY_TH_NAME}`}
                  scope="col"
                >
                  Mô tả
                </th>
                <th className="w-[14%] py-2.5 pr-3 align-middle" scope="col">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortKey((k) => {
                        if (k === "date-desc") return "date-asc";
                        if (k === "date-asc") return "none";
                        return "date-desc";
                      });
                    }}
                    className="group inline-flex w-full min-w-0 items-center gap-1.5 rounded-md py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
                    aria-pressed={sortKey === "date-asc" || sortKey === "date-desc"}
                    title="Theo ngày: mới nhất trước → cũ nhất trước → tắt"
                  >
                    Ngày
                    {sortKey === "date-asc" ? (
                      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200" strokeWidth={2.5} aria-hidden />
                    ) : sortKey === "date-desc" ? (
                      <ArrowDown className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200" strokeWidth={2.5} aria-hidden />
                    ) : (
                      <ArrowUpDown
                        className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </button>
                </th>
                <th className="w-[11%] py-2.5 pr-3 align-middle tabular-nums" scope="col">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSortKey((k) => {
                        if (k === "size-desc") return "size-asc";
                        if (k === "size-asc") return "none";
                        return "size-desc";
                      });
                    }}
                    className="group inline-flex w-full min-w-0 items-center gap-1.5 rounded-md py-0.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-600 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
                    aria-pressed={sortKey === "size-asc" || sortKey === "size-desc"}
                    title="Sắp xếp theo dung lượng: lớn → nhỏ → nhỏ → lớn → tắt (khi bật sort: danh sách phẳng)"
                  >
                    Dung lượng
                    {sortKey === "size-asc" ? (
                      <ArrowUp className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200" strokeWidth={2.5} aria-hidden />
                    ) : sortKey === "size-desc" ? (
                      <ArrowDown className="h-3.5 w-3.5 shrink-0 text-zinc-800 dark:text-zinc-200" strokeWidth={2.5} aria-hidden />
                    ) : (
                      <ArrowUpDown
                        className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-zinc-400"
                        strokeWidth={2}
                        aria-hidden
                      />
                    )}
                  </button>
                </th>
                <th className="relative w-[9%] py-2.5 pr-3 align-middle" scope="col">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Loại
                    </span>
                    <button
                      ref={extHeaderFilterBtnRef}
                      type="button"
                      aria-expanded={extHeaderFilterOpen}
                      aria-haspopup="listbox"
                      aria-label="Lọc theo định dạng"
                      title="Lọc theo loại file"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSourceHeaderFilterOpen(false);
                        setPresenceHeaderFilterOpen(false);
                        setExtHeaderFilterOpen((o) => !o);
                      }}
                      className={`shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 ${
                        extHeaderFilterOpen || selectedExts.length > 0
                          ? "text-cyan-600/90 hover:text-cyan-800 dark:text-cyan-400/90 dark:hover:text-cyan-300"
                          : ""
                      }`}
                    >
                      <ListFilter className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </th>
                <th className="relative w-[11%] py-2.5 pr-3 align-middle" scope="col">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Trạng thái
                    </span>
                    <button
                      ref={presenceHeaderFilterBtnRef}
                      type="button"
                      aria-expanded={presenceHeaderFilterOpen}
                      aria-haspopup="listbox"
                      aria-label="Lọc theo trạng thái file"
                      title="Lọc theo trạng thái"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExtHeaderFilterOpen(false);
                        setSourceHeaderFilterOpen(false);
                        setPresenceHeaderFilterOpen((o) => !o);
                      }}
                      className={`shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 ${
                        presenceHeaderFilterOpen || filePresenceFilter !== "all"
                          ? "text-cyan-600/90 hover:text-cyan-800 dark:text-cyan-400/90 dark:hover:text-cyan-300"
                          : ""
                      }`}
                    >
                      <ListFilter className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </th>
                <th className="relative w-[11%] py-2.5 pr-3 align-middle" scope="col">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      Nguồn
                    </span>
                    <button
                      ref={sourceHeaderFilterBtnRef}
                      type="button"
                      aria-expanded={sourceHeaderFilterOpen}
                      aria-haspopup="listbox"
                      aria-label="Lọc theo nguồn"
                      title="Lọc theo tên miền"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExtHeaderFilterOpen(false);
                        setPresenceHeaderFilterOpen(false);
                        setSourceHeaderFilterOpen((o) => !o);
                      }}
                      className={`shrink-0 rounded p-0.5 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 ${
                        sourceHeaderFilterOpen || sourceFilter !== ""
                          ? "text-cyan-600/90 hover:text-cyan-800 dark:text-cyan-400/90 dark:hover:text-cyan-300"
                          : ""
                      }`}
                    >
                      <ListFilter className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </th>
                <th
                  className={`downloads-table-action-col box-border px-2 py-2.5 text-center align-middle ${STICKY_TH_ACTION}`}
                  scope="col"
                >
                  <span className="sr-only">Thao tác</span>
                </th>
              </tr>
            </thead>
            {groupTableByDay
              ? byDay.map(([day, list]) => {
                  const dayIds = list.map((d) => d.id);
                  const allInDay =
                    dayIds.length > 0 && dayIds.every((id) => selectedIds.has(id));
                  const someInDay =
                    dayIds.some((id) => selectedIds.has(id)) && !allInDay;
                  return (
                    <tbody
                      key={day}
                      className="border-b border-zinc-200 bg-zinc-100/95 dark:border-zinc-800 dark:bg-zinc-900/90"
                    >
                      <tr className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                        <td
                          className={`w-11 py-2.5 pl-4 pr-1 align-middle ${STICKY_DAY_TD_CB}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={
                              allInDay ? true : someInDay ? "mixed" : false
                            }
                            aria-label={`Chọn tất cả file trong ${formatDayHeading(day)}`}
                            disabled={dayIds.length === 0}
                            onClick={() => toggleSelectDayGroup(list)}
                            className={`flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-zinc-900 ${
                              allInDay
                                ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                                : someInDay
                                  ? "border-zinc-200 bg-white text-zinc-900 shadow-sm"
                                  : "border-zinc-300 bg-white hover:border-zinc-400 dark:border-zinc-500 dark:bg-zinc-800/80 dark:hover:border-zinc-400"
                            }`}
                          >
                            {allInDay ? (
                              <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                            ) : someInDay ? (
                              <Minus className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                            ) : null}
                          </button>
                        </td>
                        <td
                          colSpan={7}
                          className={`py-2.5 pr-4 align-middle text-[10px] font-semibold tracking-wide text-zinc-600 dark:text-zinc-400 sm:text-[11px] ${STICKY_DAY_TD_REST}`}
                        >
                          {formatDayHeading(day)}
                        </td>
                      </tr>
                      {list.map((d, i) => renderDownloadRow(d, i))}
                    </tbody>
                  );
                })
              : (
                  <tbody className="border-b border-zinc-200 dark:border-zinc-900">
                    {sorted.map((d, i) => renderDownloadRow(d, i))}
                  </tbody>
                )}
          </table>
        )}
      </div>
      {rowMenuId != null &&
        rowMenuPos &&
        rowMenuDownload &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[88] cursor-default"
              aria-label="Đóng menu"
              onClick={() => setRowMenuId(null)}
            />
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[90] min-w-[11rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
              style={{ top: rowMenuPos.top, left: rowMenuPos.left }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                onClick={() => {
                  setRowMenuId(null);
                  void chrome.downloads.show(rowMenuDownload.id);
                }}
              >
                <FolderOpen className="h-3.5 w-3.5" /> Thư mục
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-800 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                onClick={() => {
                  const id = rowMenuDownload.id;
                  const label = baseName(rowMenuDownload.filename);
                  setRowMenuId(null);
                  setDeleteConfirm({ kind: "eraseHistorySingle", id, fileLabel: label });
                }}
              >
                <History className="h-3.5 w-3.5" /> Xoá khỏi lịch sử
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-zinc-800"
                onClick={() => {
                  const id = rowMenuDownload.id;
                  const label = baseName(rowMenuDownload.filename);
                  setRowMenuId(null);
                  setDeleteConfirm({ kind: "single", id, fileLabel: label });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Xoá file và lịch sử
              </button>
            </div>
          </>,
          document.body,
        )}
      {extHeaderFilterOpen &&
        headerFilterRect &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[78] cursor-default"
              aria-label="Đóng lọc loại"
              onClick={() => setExtHeaderFilterOpen(false)}
            />
            <div
              ref={extHeaderFilterPanelRef}
              role="listbox"
              aria-label="Lọc theo định dạng"
              className="fixed z-[80] w-[min(100vw-2rem,300px)] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
              style={{
                top: headerFilterRect.bottom + 8,
                left: (() => {
                  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
                  const w = Math.min(300, vw - 16);
                  return Math.max(8, Math.min(headerFilterRect.left, vw - w - 8));
                })(),
              }}
            >
              {renderExtFormatFilterPanel()}
            </div>
          </>,
          document.body,
        )}
      {sourceHeaderFilterOpen &&
        sourceHeaderFilterRect &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[78] cursor-default"
              aria-label="Đóng lọc nguồn"
              onClick={() => setSourceHeaderFilterOpen(false)}
            />
            <div
              ref={sourceHeaderFilterPanelRef}
              role="listbox"
              aria-label="Lọc theo nguồn"
              className="fixed z-[80] w-[min(100vw-2rem,300px)] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
              style={{
                top: sourceHeaderFilterRect.bottom + 8,
                left: (() => {
                  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
                  const w = Math.min(300, vw - 16);
                  return Math.max(8, Math.min(sourceHeaderFilterRect.left, vw - w - 8));
                })(),
              }}
            >
              {renderSourceFilterPanel()}
            </div>
          </>,
          document.body,
        )}
      {presenceHeaderFilterOpen &&
        presenceHeaderFilterRect &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[78] cursor-default"
              aria-label="Đóng lọc trạng thái"
              onClick={() => setPresenceHeaderFilterOpen(false)}
            />
            <div
              ref={presenceHeaderFilterPanelRef}
              role="listbox"
              aria-label="Lọc theo trạng thái file"
              className="fixed z-[80] w-[min(100vw-2rem,260px)] rounded-lg border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
              style={{
                top: presenceHeaderFilterRect.bottom + 8,
                left: (() => {
                  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
                  const w = Math.min(260, vw - 16);
                  return Math.max(8, Math.min(presenceHeaderFilterRect.left, vw - w - 8));
                })(),
              }}
            >
              {renderPresenceFilterPanel()}
            </div>
          </>,
          document.body,
        )}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title={
          deleteConfirm?.kind === "eraseHistoryBulk" || deleteConfirm?.kind === "eraseHistorySingle"
            ? "Xoá khỏi lịch sử?"
            : deleteConfirm?.kind === "bulk"
              ? "Xoá nhiều mục?"
              : "Xoá mục tải xuống?"
        }
        message={
          deleteConfirm?.kind === "eraseHistoryBulk"
            ? `Chỉ xoá ${deleteConfirm.ids.length} mục khỏi danh sách tải xuống của Chrome. File trên máy (nếu còn) không bị xoá.`
            : deleteConfirm?.kind === "eraseHistorySingle"
              ? `Chỉ xoá “${deleteConfirm.fileLabel}” khỏi danh sách tải xuống. File trên máy (nếu còn) không bị xoá.`
              : deleteConfirm?.kind === "bulk"
                ? `Xoá ${deleteConfirm.ids.length} mục đã chọn khỏi lịch sử và file trên máy (nếu còn)?`
                : deleteConfirm?.kind === "single"
                  ? `Xoá “${deleteConfirm.fileLabel}” khỏi lịch sử và file trên máy (nếu còn)?`
                  : ""
        }
        confirmLabel={
          deleteConfirm?.kind === "eraseHistoryBulk" || deleteConfirm?.kind === "eraseHistorySingle"
            ? "Xoá khỏi lịch sử"
            : "Xoá"
        }
        cancelLabel="Huỷ"
        danger={
          deleteConfirm?.kind === "bulk" || deleteConfirm?.kind === "single"
        }
        onConfirm={() => void executeDeleteConfirmed()}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
