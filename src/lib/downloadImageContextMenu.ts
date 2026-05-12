/** Mục menu chuột phải trên ảnh — tải qua extension để `onDeterminingFilename` áp dụng phân thư mục. */
export const CONTEXT_MENU_DOWNLOAD_IMAGE_ID = "dm_download_image_via_manager";

export function registerDownloadImageContextMenu(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      {
        id: CONTEXT_MENU_DOWNLOAD_IMAGE_ID,
        title: "Download Image (Download manager)",
        contexts: ["image"],
      },
      () => {
        const err = chrome.runtime.lastError;
        if (err) {
          console.warn("[Download Manager] contextMenus.create:", err.message);
        }
      },
    );
  });
}

function triggerDownload(url: string): void {
  chrome.downloads.download({ url, saveAs: false, conflictAction: "uniquify" }, () => {
    const err = chrome.runtime.lastError;
    if (err) {
      console.warn("[Download Manager] Tải ảnh:", err.message);
    }
    if (url.startsWith("blob:")) {
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    }
  });
}

/**
 * `Referer`/`Cookie`/… nằm trong danh sách forbidden header — `chrome.downloads.download`
 * sẽ trả về "Unsafe request header name". Vì vậy ở đây KHÔNG đặt header thủ công;
 * Chrome sẽ tự dùng referrer mặc định (thường là rỗng đối với download nền). Trang nào
 * yêu cầu referer sẽ rơi xuống fallback fetch trong page context bên dưới.
 */
function downloadViaApi(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.downloads.download(
      { url, saveAs: false, conflictAction: "uniquify" },
      (downloadId) => {
        /* Chỉ tin `downloadId` — `lastError` có thể còn sót từ lần gọi API trước. */
        if (downloadId === undefined) {
          const msg = chrome.runtime.lastError?.message;
          if (msg) console.warn("[Download Manager] downloads.download:", msg);
          resolve(false);
          return;
        }
        resolve(true);
      },
    );
  });
}

/**
 * Fetch ảnh từ context của trang đang xem — trình duyệt tự gắn đúng `Referer`,
 * cookie và session, vượt qua được anti-hotlink. Trả về `data:` URL để tải.
 */
async function fetchImageAsDataUrlInPage(
  tabId: number,
  frameId: number | undefined,
  imageUrl: string,
): Promise<string | null> {
  try {
    const target: chrome.scripting.InjectionTarget =
      typeof frameId === "number"
        ? { tabId, frameIds: [frameId] }
        : { tabId, allFrames: false };
    const injected = await chrome.scripting.executeScript({
      target,
      func: async (u: string) => {
        const res = await fetch(u, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const b = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onloadend = () => resolve(fr.result as string);
          fr.onerror = () => reject(new Error("read"));
          fr.readAsDataURL(b);
        });
      },
      args: [imageUrl],
    });
    const result = injected[0]?.result;
    return typeof result === "string" && result.startsWith("data:") ? result : null;
  } catch {
    return null;
  }
}

async function handleDownloadImageContextClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  const url = (info.srcUrl || "").trim();
  if (!url) return;

  console.info("[Download Manager] Tải ảnh từ menu:", url.slice(0, 160));

  if (url.startsWith("data:")) {
    triggerDownload(url);
    return;
  }

  if (url.startsWith("blob:")) {
    if (tab?.id == null) return;
    const dataUrl = await fetchImageAsDataUrlInPage(tab.id, info.frameId, url);
    if (dataUrl) triggerDownload(dataUrl);
    return;
  }

  if (!/^https?:\/\//i.test(url)) return;

  /* Thử tải trực tiếp qua downloads API trước — nhanh, streaming, không tốn RAM. */
  const directOk = await downloadViaApi(url);
  if (directOk) return;

  /* Fallback: fetch trong page context để có đúng `Referer`/cookie (anti-hotlink). */
  if (tab?.id != null) {
    const dataUrl = await fetchImageAsDataUrlInPage(tab.id, info.frameId, url);
    if (dataUrl) {
      triggerDownload(dataUrl);
      return;
    }
  }

  console.warn("[Download Manager] Không tải được ảnh (CORS / mạng / URL).");
}

export function attachDownloadImageContextMenuListener(): void {
  /* `async` để trả về Promise — Chrome giữ service worker sống đến khi xong (MV3). */
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_DOWNLOAD_IMAGE_ID) return;
    try {
      await handleDownloadImageContextClick(info, tab);
    } catch (e) {
      console.warn("[Download Manager] Lỗi xử lý tải ảnh:", e);
    }
  });
}
