import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Nút xác nhận kiểu cảnh báo (đỏ). */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default bg-black/60"
        aria-label="Đóng"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed left-1/2 top-1/2 z-[101] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              danger
                ? "rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/80"
                : "rounded-lg border border-zinc-400 bg-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
