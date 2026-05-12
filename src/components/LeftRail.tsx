import { Download, Settings } from "lucide-react";

const SOURCE_CODE_URL = "https://github.com/buigiathanh/extension-download-manager";

function openSourceCode(): void {
  void chrome.tabs.create({ url: SOURCE_CODE_URL });
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable={false}
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.97 3.22 9.18 7.69 10.67.56.1.77-.24.77-.54 0-.27-.01-1.15-.02-2.09-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.68.08-.68 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.23 3.27.94.1-.73.39-1.23.71-1.51-2.5-.28-5.12-1.25-5.12-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.11 1.15.9-.25 1.87-.38 2.83-.38s1.93.13 2.83.38c2.16-1.46 3.11-1.15 3.11-1.15.61 1.54.23 2.68.11 2.96.72.79 1.16 1.79 1.16 3.02 0 4.32-2.62 5.28-5.13 5.55.4.34.76 1.02.76 2.06 0 1.49-.01 2.69-.01 3.05 0 .3.2.65.78.54 4.46-1.5 7.68-5.7 7.68-10.67C23.25 5.48 18.27.5 12 .5z" />
    </svg>
  );
}

export type NavKey = "files" | "settings";

type Props = {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  displayName: string;
  accountLabel: string;
};

const modules: { key: NavKey; label: string; icon: typeof Download }[] = [
  { key: "files", label: "Quản lý file", icon: Download },
  { key: "settings", label: "Cài đặt", icon: Settings },
];

export function LeftRail({ active, onNavigate, displayName, accountLabel }: Props) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="flex h-full w-[52px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex justify-center py-4">
        <img
          src={chrome.runtime.getURL("icons/icon-128.png")}
          alt="Download Manager"
          title="Download Manager"
          className="h-9 w-9 rounded-lg object-contain shadow-lg shadow-black/40 ring-1 ring-white/10"
          draggable={false}
        />
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 px-1.5">
        {modules.map(({ key, label, icon: Icon }) => {
          const on = active === key;
          return (
            <button
              key={key}
              type="button"
              title={label}
              aria-label={label}
              aria-current={on ? "page" : undefined}
              onClick={() => onNavigate(key)}
              className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
                on
                  ? "bg-zinc-200 text-cyan-600 shadow-inner ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-cyan-400 dark:ring-zinc-700"
                  : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2 : 1.75} />
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 border-t border-zinc-200/90 py-3 dark:border-zinc-800/80">
        <button
          type="button"
          title="Mã nguồn mở trên GitHub"
          aria-label="Mở mã nguồn trên GitHub"
          onClick={openSourceCode}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 dark:text-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-300"
        >
          <GithubIcon className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          title={`${displayName} — ${accountLabel}`}
          aria-label={`Tài khoản: ${displayName}`}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-500 to-zinc-600 text-xs font-semibold text-white ring-2 ring-zinc-200 ring-offset-0 hover:ring-zinc-400 dark:from-zinc-700 dark:to-zinc-800 dark:text-zinc-100 dark:ring-zinc-900 dark:hover:ring-zinc-600"
        >
          {initial}
        </button>
      </div>
    </aside>
  );
}
