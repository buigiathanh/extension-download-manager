const CHROME_DOWNLOADS_SETTINGS_URL = "chrome://settings/downloads";

/**
 * Mở trang «Tải xuống» trong `chrome://settings`.
 * Chrome không cho extension tắt trực tiếp tùy chọn «Hỏi vị trí lưu...» — người dùng cần tắt tay tại đây.
 */
export async function openChromeDownloadsSettingsTab(): Promise<boolean> {
  try {
    await chrome.tabs.create({ url: CHROME_DOWNLOADS_SETTINGS_URL });
    return true;
  } catch {
    return false;
  }
}
