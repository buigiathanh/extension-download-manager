import {
  FOLDER_ORGANIZE_STORAGE_KEY,
  loadFolderOrganizeMode,
  type DownloadFolderOrganizeMode,
} from "./lib/folderOrganizeSettings";
import {
  TYPE_ORGANIZE_STORAGE_KEY,
  defaultTypeOrganizeResolved,
  loadTypeOrganizeConfig,
  type TypeOrganizeResolved,
} from "./lib/typeOrganizeSettings";
import {
  suggestedFilenameWithDownloadTimePrefix,
  suggestedRelativePathForOrganizeMode,
} from "./lib/downloadPathRouting";
import {
  attachDownloadImageContextMenuListener,
  registerDownloadImageContextMenu,
} from "./lib/downloadImageContextMenu";

const managerPath = "index.html";

function managerUrl(): string {
  return chrome.runtime.getURL(managerPath);
}

/** Cache chế độ phân thư mục — cập nhật khi mở extension / đổi Cài đặt. */
let cachedOrganizeMode: DownloadFolderOrganizeMode | null = null;

/** Cache tên thư mục + đuôi bổ sung theo loại file (chế độ by-type). */
let cachedTypeOrganize: TypeOrganizeResolved | null = null;

async function refreshCachedOrganizeMode(): Promise<void> {
  try {
    cachedOrganizeMode = await loadFolderOrganizeMode();
  } catch {
    cachedOrganizeMode = "default";
  }
}

async function refreshCachedTypeOrganize(): Promise<void> {
  try {
    cachedTypeOrganize = await loadTypeOrganizeConfig();
  } catch {
    cachedTypeOrganize = defaultTypeOrganizeResolved();
  }
}

void refreshCachedOrganizeMode();
void refreshCachedTypeOrganize();

attachDownloadImageContextMenuListener();
registerDownloadImageContextMenu();
chrome.runtime.onInstalled.addListener(() => {
  registerDownloadImageContextMenu();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[FOLDER_ORGANIZE_STORAGE_KEY]) {
    cachedOrganizeMode = null;
    void refreshCachedOrganizeMode();
  }
  if (changes[TYPE_ORGANIZE_STORAGE_KEY]) {
    cachedTypeOrganize = null;
    void refreshCachedTypeOrganize();
  }
});

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const rawUrl = downloadItem.url || downloadItem.finalUrl || "";
  if (rawUrl.includes("__DM_SETTINGS_PROBE__")) {
    suggest();
    return false;
  }

  void (async () => {
    try {
      const mode =
        cachedOrganizeMode != null ? cachedOrganizeMode : await loadFolderOrganizeMode();
      if (cachedOrganizeMode == null) cachedOrganizeMode = mode;

      const typeCfg =
        cachedTypeOrganize != null ? cachedTypeOrganize : await loadTypeOrganizeConfig();
      if (cachedTypeOrganize == null) cachedTypeOrganize = typeCfg;

      const relative = suggestedRelativePathForOrganizeMode(mode, downloadItem, typeCfg);
      if (relative == null) {
        suggest({
          filename: suggestedFilenameWithDownloadTimePrefix(downloadItem),
          conflictAction: "uniquify",
        });
        return;
      }
      suggest({ filename: relative, conflictAction: "uniquify" });
    } catch {
      suggest();
    }
  })();
  return true;
});

function isDownloadsChromeUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "chrome:" && u.hostname === "downloads";
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(() => {
  void chrome.tabs.create({ url: managerUrl() });
});

function redirectTab(tabId: number): void {
  const url = managerUrl();
  chrome.tabs.update(tabId, { url }).catch(() => {
    void chrome.tabs.create({ url }).then((t) => {
      if (t.id != null) chrome.tabs.remove(tabId).catch(() => undefined);
    });
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? tab.url ?? tab.pendingUrl;
  if (url && isDownloadsChromeUrl(url)) {
    redirectTab(tabId);
  }
});

chrome.webNavigation.onCommitted.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    if (isDownloadsChromeUrl(details.url)) {
      redirectTab(details.tabId);
    }
  },
  { url: [{ urlPrefix: "chrome://downloads" }] },
);
