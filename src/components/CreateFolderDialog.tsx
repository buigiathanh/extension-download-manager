import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  title?: string;
  /** Hiển thị dưới ô nhập (vd. trùng tên). */
  errorMessage?: string | null;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
};

export function CreateFolderDialog({
  open,
  title = "Thư mục mới",
  errorMessage,
  confirmLabel = "Tạo",
  cancelLabel = "Huỷ",
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setValue("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open || typeof document === "undefined") return null;

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onConfirm(trimmed);
  };

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default bg-black/60"
        aria-label="Đóng"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-folder-title"
        className="fixed left-1/2 top-1/2 z-[101] w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl ring-1 ring-black/10 dark:border-zinc-800 dark:bg-zinc-900 dark:ring-black/40"
      >
        <h2 id="create-folder-title" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h2>
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-500">Đặt tên cho thư mục trên cloud (lưu cục bộ trong extension).</p>
        <label htmlFor="create-folder-name" className="mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Tên thư mục
        </label>
        <input
          ref={inputRef}
          id="create-folder-name"
          type="text"
          autoComplete="off"
          maxLength={120}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none ring-0 transition focus:border-sky-600/80 focus:ring-2 focus:ring-sky-600/30 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          placeholder="Ví dụ: Tài liệu dự án"
        />
        {errorMessage ? (
          <p className="mt-2 text-xs text-red-400" role="alert">
            {errorMessage}
          </p>
        ) : null}
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
            disabled={!canSubmit}
            className="rounded-lg border border-sky-700/80 bg-sky-950/60 px-3 py-2 text-xs font-medium text-sky-100 hover:bg-sky-900/70 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={submit}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body,
  );
}
