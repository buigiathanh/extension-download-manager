import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FolderOpen,
  History,
  Globe,
  Trash2,
  X,
} from "lucide-react";
import {
  baseName,
  deleteDownload,
  eraseDownloadHistory,
  extensionOf,
  getDownloadFileIconDataUrl,
  isImageDownload,
  previewPageImageUrl,
  isBase64DataUrlDownload,
  isLocalhostSourceHost,
  sourceHost,
  sourceHostDisplay,
  isDownloadFileRemovedFromDisk,
} from "../lib/downloads";
import { ConfirmDialog } from "./ConfirmDialog";

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

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

type Props = {
  downloadId: number;
  onClose: () => void;
  onDeleted: () => void;
};

export function DownloadDetailPanel({ downloadId, onClose, onDeleted }: Props) {
  const [item, setItem] = useState<chrome.downloads.DownloadItem | null>(null);
  const [destructiveDialog, setDestructiveDialog] = useState<null | "delete" | "eraseHistory">(
    null,
  );

  useEffect(() => {
    const load = () => {
      void chrome.downloads.search({ id: downloadId }).then((r) => {
        setItem(r[0] ?? null);
      });
    };
    load();
    const onDelta = () => load();
    chrome.downloads.onChanged.addListener(onDelta);
    chrome.downloads.onErased.addListener(onDelta);
    return () => {
      chrome.downloads.onChanged.removeListener(onDelta);
      chrome.downloads.onErased.removeListener(onDelta);
    };
  }, [downloadId]);

  const ext = item ? extensionOf(item.filename) : "";

  /**
   * Không dùng `file://` trong `<img>` — Chrome chặn extension pages tải local resource.
   * Thứ tự: URL trang (http/https/data:image) → ảnh thu nhỏ `downloads.getFileIcon`.
   */
  const previewSources = useMemo(() => {
    if (!item || !isImageDownload(item, ext)) return [];
    const page = previewPageImageUrl(item);
    return page ? [page] : [];
  }, [item, ext]);

  const [previewStep, setPreviewStep] = useState(0);
  const [iconPreviewUrl, setIconPreviewUrl] = useState<string | null>(null);
  const [iconResolved, setIconResolved] = useState(false);

  useEffect(() => {
    setPreviewStep(0);
    setIconPreviewUrl(null);
    setIconResolved(false);
  }, [item?.id, previewSources.join("|")]);

  useEffect(() => {
    if (!item || !isImageDownload(item, ext)) return;
    if (previewStep < previewSources.length) return;
    setIconResolved(false);
    void getDownloadFileIconDataUrl(item.id, 32).then((u) => {
      setIconPreviewUrl(u);
      setIconResolved(true);
    });
  }, [item, ext, previewStep, previewSources.length]);

  const activePreviewSrc =
    previewStep < previewSources.length ? previewSources[previewStep] : iconPreviewUrl;

  const showImagePreviewBox =
    item &&
    isImageDownload(item, ext) &&
    (previewSources.length > 0 || item.state === "complete");

  if (!item) {
    return (
      <aside className="flex h-full min-h-0 w-full max-w-[380px] shrink-0 flex-col border-zinc-200 bg-zinc-50 max-lg:border-t dark:border-zinc-800 dark:bg-zinc-950 lg:border-l">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">Chi tiết</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
            aria-label="Đóng panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="p-4 text-sm text-zinc-600 dark:text-zinc-500">Không tìm thấy mục tải xuống.</p>
      </aside>
    );
  }

  const name = baseName(item.filename);
  const size = item.totalBytes ?? 0;
  const url = item.finalUrl || item.url || "";
  const hostLine = sourceHost(item);
  const showSourceGlobe =
    isLocalhostSourceHost(hostLine) || isBase64DataUrlDownload(item);
  const canOpenLocalFile =
    Boolean(item.filename) &&
    item.state === "complete" &&
    item.exists !== false;

  const canOpenSourceUrl =
    url.trim().length > 0 &&
    (/^https?:\/\//i.test(url) || /^data:/i.test(url) || /^blob:/i.test(url));

  const fileRemovedFromDisk = isDownloadFileRemovedFromDisk(item);

  return (
    <>
    <aside
      title={fileRemovedFromDisk ? "File đã xoá khỏi máy" : undefined}
      className={`flex h-full min-h-0 w-full max-w-[380px] shrink-0 flex-col border-zinc-200 bg-zinc-50 max-lg:border-t dark:border-zinc-800 dark:bg-zinc-950 lg:border-l ${
        fileRemovedFromDisk
          ? "opacity-[0.88] transition-opacity hover:opacity-100"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
            {formatDate(item.startTime)}
          </p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-zinc-600 dark:text-zinc-600">
            {showSourceGlobe ? (
              <Globe className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-500" strokeWidth={2} aria-hidden />
            ) : null}
            <span className="truncate">{sourceHostDisplay(item)}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
          aria-label="Đóng panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {showImagePreviewBox ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100/90 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="relative flex min-h-[120px] max-h-[min(50vh,320px)] w-full items-center justify-center p-2">
              {activePreviewSrc ? (
                <img
                  key={`${item.id}-${previewStep}-${activePreviewSrc.slice(0, 48)}`}
                  src={activePreviewSrc}
                  alt={`Xem trước ${name}`}
                  referrerPolicy="no-referrer"
                  className="h-auto w-auto max-h-[min(50vh,320px)] max-w-full object-contain"
                  onError={() =>
                    setPreviewStep((s) => {
                      const maxStep = previewSources.length + 1;
                      return s >= maxStep ? s : s + 1;
                    })
                  }
                />
              ) : previewStep >= previewSources.length && !iconResolved ? (
                <p className="animate-pulse px-3 py-6 text-center text-xs text-zinc-600 dark:text-zinc-500">
                  Đang tải xem trước…
                </p>
              ) : (
                <p className="px-3 py-6 text-center text-xs text-zinc-600 dark:text-zinc-500">
                  Không thể hiển thị xem trước ảnh.
                </p>
              )}
            </div>
            <p className="border-t border-zinc-200 px-3 py-1.5 text-center text-[10px] text-zinc-600 dark:border-zinc-800 dark:text-zinc-500">
              {previewStep >= previewSources.length && iconPreviewUrl
                ? "Xem trước (ảnh thu nhỏ hệ thống)"
                : "Xem trước"}
            </p>
          </div>
        ) : null}

        <h2
          className={`break-words text-lg font-semibold leading-snug ${
            fileRemovedFromDisk
              ? "text-zinc-500/85 blur-[0.4px] contrast-[0.92]"
              : "text-zinc-900 dark:text-white"
          }`}
          title={fileRemovedFromDisk ? "File đã xoá khỏi máy" : undefined}
        >
          {name}
        </h2>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-zinc-900 dark:text-zinc-100">
          {formatBytes(size)}
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              Đường dẫn cục bộ
            </label>
            <div className="mt-1.5 flex min-h-[2.25rem] items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/80">
              <input
                readOnly
                value={item.filename || "—"}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-xs text-zinc-700 outline-none ring-0 dark:text-zinc-300"
              />
              <button
                type="button"
                title="Hiện file trong thư mục"
                aria-label="Hiện file trong thư mục"
                disabled={!canOpenLocalFile}
                onClick={() => void chrome.downloads.show(item.id)}
                className="flex shrink-0 items-center justify-center border-l border-zinc-200 px-2.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-cyan-400 dark:disabled:hover:text-zinc-400"
              >
                <FolderOpen className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              URL
            </label>
            <div className="mt-1.5 flex min-h-[2.25rem] items-stretch overflow-hidden rounded-lg border border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-900/80">
              <input
                readOnly
                value={url || "—"}
                className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-xs text-zinc-700 outline-none ring-0 dark:text-zinc-300"
              />
              <button
                type="button"
                title="Mở URL trong tab mới"
                aria-label="Mở URL trong tab mới"
                disabled={!canOpenSourceUrl}
                onClick={() => {
                  if (!canOpenSourceUrl) return;
                  void chrome.tabs.create({ url });
                }}
                className="flex shrink-0 items-center justify-center border-l border-zinc-200 px-2.5 text-zinc-600 transition hover:bg-zinc-100 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-cyan-400 dark:disabled:hover:text-zinc-400"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">Thẻ</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ext ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  .{ext}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 px-2.5 py-0.5 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    item.state === "complete" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {item.state}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-500">
              Tệp đính kèm
            </p>
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-100/50 p-3 dark:border-zinc-700 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white/90 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="min-w-0">
                  <p
                    className={`truncate text-xs font-medium ${
                      fileRemovedFromDisk
                        ? "inline-block max-w-full text-zinc-500/85 blur-[0.4px] contrast-[0.92]"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                    title={fileRemovedFromDisk ? "File đã xoá khỏi máy" : undefined}
                  >
                    {name}
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-500">{formatBytes(size)}</p>
                </div>
                <button
                  type="button"
                  title="Mở trong thư mục"
                  onClick={() => void chrome.downloads.show(item.id)}
                  className="shrink-0 rounded-md p-2 text-zinc-600 hover:bg-zinc-200 hover:text-cyan-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-cyan-400"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <div className="flex flex-wrap gap-2">
          {/^https?:\/\//i.test(url) && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-100 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở URL
            </a>
          )}
          <button
            type="button"
            onClick={() => setDestructiveDialog("eraseHistory")}
            className="inline-flex min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-100 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            title="Chỉ xoá khỏi danh sách tải xuống"
          >
            <History className="h-3.5 w-3.5" />
            Xoá lịch sử
          </button>
          <button
            type="button"
            onClick={() => setDestructiveDialog("delete")}
            className="inline-flex items-center justify-center rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/70"
            title="Xoá file và lịch sử"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
    <ConfirmDialog
      open={destructiveDialog !== null}
      title={destructiveDialog === "eraseHistory" ? "Xoá khỏi lịch sử?" : "Xoá mục tải xuống?"}
      message={
        destructiveDialog === "eraseHistory"
          ? `Chỉ xoá “${name}” khỏi danh sách tải xuống của Chrome. File trên máy (nếu còn) không bị xoá.`
          : `Xoá “${name}” khỏi lịch sử và file trên máy (nếu còn)?`
      }
      confirmLabel={destructiveDialog === "eraseHistory" ? "Xoá khỏi lịch sử" : "Xoá"}
      cancelLabel="Huỷ"
      danger={destructiveDialog === "delete"}
      onCancel={() => setDestructiveDialog(null)}
      onConfirm={() => {
        const mode = destructiveDialog;
        setDestructiveDialog(null);
        if (mode === "eraseHistory") {
          void eraseDownloadHistory(item.id).then(() => {
            onDeleted();
            onClose();
          });
        } else if (mode === "delete") {
          void deleteDownload(item.id).then(() => {
            onDeleted();
            onClose();
          });
        }
      }}
    />
    </>
  );
}
