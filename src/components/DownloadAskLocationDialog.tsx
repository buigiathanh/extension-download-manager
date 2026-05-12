import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title: string;
  message: string;
  alreadyOffLabel: string;
  openSettingsLabel: string;
  cancelLabel: string;
  onAlreadyOff: () => void;
  onOpenSettings: () => void;
  onCancel: () => void;
};

export function DownloadAskLocationDialog({
  open,
  title,
  message,
  alreadyOffLabel,
  openSettingsLabel,
  cancelLabel,
  onAlreadyOff,
  onOpenSettings,
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

  const btnBase =
    "rounded-lg px-3 py-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50";

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
        aria-labelledby="download-ask-dialog-title"
        className="fixed left-1/2 top-1/2 z-[101] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
      >
        <h2
          id="download-ask-dialog-title"
          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={`${btnBase} border border-cyan-700/50 bg-cyan-600 text-white hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600`}
            onClick={onAlreadyOff}
          >
            {alreadyOffLabel}
          </button>
          <button
            type="button"
            className={`${btnBase} border border-cyan-600/50 bg-white text-cyan-800 hover:bg-cyan-50 dark:border-cyan-500/40 dark:bg-zinc-900 dark:text-cyan-300 dark:hover:bg-zinc-800`}
            onClick={onOpenSettings}
          >
            {openSettingsLabel}
          </button>
          <button
            type="button"
            className={`${btnBase} border border-zinc-300 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
