import { useCallback, useEffect, useState } from "react";
import { Cloud, Folder, Plus } from "lucide-react";
import {
  CLOUD_FOLDERS_STORAGE_KEY,
  loadCloudFolders,
  newFolderId,
  saveCloudFolders,
  type CloudFolder,
} from "../lib/cloudFolders";
import { CreateFolderDialog } from "./CreateFolderDialog";

function fileCountLabel(n: number): string {
  if (n === 0) return "Chưa có tệp";
  if (n === 1) return "1 tệp";
  return `${n} tệp`;
}

export function CloudFoldersPanel() {
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await loadCloudFolders();
      setFolders(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local") return;
      if (changes[CLOUD_FOLDERS_STORAGE_KEY]) void refresh();
    };
    chrome.storage.onChanged.addListener(onStorage);
    return () => chrome.storage.onChanged.removeListener(onStorage);
  }, [refresh]);

  const openCreate = () => {
    setNameError(null);
    setDialogOpen(true);
  };

  const handleCreateConfirm = async (name: string) => {
    const normalized = name.trim();
    const dup = folders.some((f) => f.name.trim().toLowerCase() === normalized.toLowerCase());
    if (dup) {
      setNameError("Đã có thư mục trùng tên. Chọn tên khác.");
      return;
    }
    const next: CloudFolder = {
      id: newFolderId(),
      name: normalized,
      fileCount: 0,
    };
    const updated = [...folders, next];
    setFolders(updated);
    await saveCloudFolders(updated);
    setDialogOpen(false);
    setNameError(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="shrink-0 border-b border-zinc-200/90 bg-white/95 px-6 py-5 backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-950/95">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-cyan-600/10 ring-1 ring-sky-500/25">
            <Cloud className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Cloud</h1>
            <p className="mt-0.5 max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-500">
              Tổ chức tệp theo thư mục. Tạo thư mục để chuẩn bị đồng bộ hoặc phân loại — dữ liệu lưu trên máy bạn qua extension.
            </p>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-500">Đang tải…</p>
        ) : (
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(152px,1fr))] gap-4"
            aria-label="Danh sách thư mục cloud"
          >
            <li>
              <button
                type="button"
                onClick={openCreate}
                className="group flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-400/90 bg-zinc-100/80 p-4 text-zinc-600 transition hover:border-sky-500/45 hover:bg-sky-50/80 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:border-zinc-700/90 dark:bg-zinc-900/40 dark:text-zinc-500 dark:hover:bg-zinc-900/70 dark:hover:text-sky-400"
              >
                <span className="flex aspect-square w-full max-w-[140px] flex-col items-center justify-center rounded-xl bg-white/80 ring-1 ring-zinc-200/90 transition group-hover:ring-sky-500/30 dark:bg-zinc-950/60 dark:ring-zinc-800/80">
                  <Plus className="h-10 w-10" strokeWidth={1.5} aria-hidden />
                </span>
                <span className="mt-3 text-center text-xs font-medium text-zinc-600 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                  Thêm thư mục
                </span>
              </button>
            </li>

            {folders.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  title={f.name}
                  className="flex w-full flex-col items-center rounded-2xl border border-zinc-200 bg-white/90 p-4 text-center shadow-sm ring-0 transition hover:border-zinc-300 hover:bg-white hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
                >
                  <span className="flex aspect-square w-full max-w-[140px] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/12 via-zinc-100/80 to-cyan-600/8 ring-1 ring-sky-500/15 dark:via-zinc-900/40">
                    <Folder className="h-9 w-9 text-sky-600 drop-shadow-sm dark:text-sky-400" strokeWidth={1.5} aria-hidden />
                  </span>
                  <span className="mt-3 line-clamp-2 w-full text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                    {f.name}
                  </span>
                  <span className="mt-1 text-[11px] leading-none text-zinc-600 dark:text-zinc-500">{fileCountLabel(f.fileCount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {!loading && folders.length === 0 ? (
          <p className="mt-6 max-w-md text-xs text-zinc-600 dark:text-zinc-600">
            Chưa có thư mục nào. Bấm ô có dấu cộng để tạo thư mục đầu tiên.
          </p>
        ) : null}
      </div>

      <CreateFolderDialog
        open={dialogOpen}
        title="Tạo thư mục"
        errorMessage={nameError}
        confirmLabel="Tạo thư mục"
        cancelLabel="Huỷ"
        onConfirm={(name) => void handleCreateConfirm(name)}
        onCancel={() => {
          setDialogOpen(false);
          setNameError(null);
        }}
      />
    </div>
  );
}
