/**
 * Single source of truth for UI translations.
 *
 * English is the canonical locale: every key MUST exist in `en`, and `vi` is
 * type-checked against it. Add new strings to `en` first, then mirror the
 * Vietnamese translation in `vi`. Missing entries fall back to `en` at runtime.
 *
 * Chrome's `chrome.i18n.getMessage` API is intentionally not used for runtime
 * UI strings because it locks the locale to the browser's UI language and
 * cannot be switched per-extension. We persist the user's choice in
 * `chrome.storage.local` instead.
 */
export const SUPPORTED_LOCALES = ["en", "vi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const en = {
  /* App-level */
  appName: "Download Manager",

  /* Navigation rail */
  navFiles: "Files",
  navSettings: "Settings",
  navOpenSource: "Open source on GitHub",
  navAccount: "Account",

  /* Settings panel */
  settingsTitle: "Settings",
  settingsOrganizeSectionTitle: "Folder organization for downloads",
  settingsOrganizeSectionLead:
    "Choose how new downloads are suggested inside your Chrome Downloads folder. Paths stay under that root.",
  settingsOrganizeOptionsAria: "Folder organization options",
  settingsOrganizeAskWarning:
    'Please turn off "Ask where to save each file before downloading" in Chrome Downloads if it is still on.',
  settingsOrganizeOpenChromeBtn: "Open Chrome download settings",
  settingsOrganizeProbing: "Checking Chrome download settings…",
  settingsLoading: "Loading…",
  settingsBadgeActive: "Active",
  organizeDefault: "Default",
  organizeByDate: "By date",
  organizeByType: "By file type",
  organizeBySource: "By source",
  organizeDefaultDesc:
    "Chrome’s usual location only — this extension does not add extra subfolders.",
  organizeByDateDesc: "Each file goes into a dated folder (YYYY-MM-DD) under Downloads.",
  organizeByTypeDesc:
    "Files are grouped into category folders such as images, documents, or videos.",
  organizeBySourceDesc:
    "Each file goes into a folder named after the site or domain it was downloaded from.",

  settingsTypeFoldersSectionTitle: "By-type folders & extra extensions",
  settingsTypeFoldersSectionLead:
    "Applies when “By file type” is active. Built-in categories first, then your own folders (by extension), then “Other”. Anything that still matches none of those goes into Other. Tags with × turn off a default extension.",
  settingsTypeFolderNameLabel: "Subfolder name",
  settingsTypeExtensionsLabel: "File extensions",
  settingsTypeExtensionsEmpty: "No file extensions have been added yet.",
  settingsTypeAddExtPlaceholder: "Extension (e.g. zip)",
  settingsTypeAddExtButton: "Add",
  settingsTypeRemoveExtAria: "Remove extension {ext}",
  settingsTypeOtherExtNote:
    "“Other” is the fallback for anything that does not match the categories above. Only its folder name can be customized here.",
  settingsTypeResetDefaults: "Restore defaults",
  settingsTypeCatImage: "Images",
  settingsTypeCatVideo: "Videos",
  settingsTypeCatDocument: "Documents",
  settingsTypeCatCode: "Code & text",
  settingsTypeCatSoftware: "Software & disk images",
  settingsTypeCatOther: "Other",

  settingsTypeCustomSectionTitle: "Your own folders",
  settingsTypeCustomSectionLead:
    "Checked in list order after the built-in types and before “Other”. Add at least one extension so downloads can be routed here. Do not add an extension that is still assigned to a built-in category — those files are always sent there first.",
  settingsTypeCustomFolderCardLabel: "Custom folder",
  settingsTypeAddCustomFolder: "Add folder",
  settingsTypeCustomFolderDefaultName: "My-folder",
  settingsTypeDeleteCustomFolder: "Remove folder",
  settingsTypeDeleteCustomFolderAria: "Remove custom folder {name}",
  settingsTypeCustomMaxFolders: "You can add up to {max} custom folders.",
  settingsTypeCustomExtConflictBuiltin:
    "The extension “.{ext}” is already used by a default category ({groups}). Downloads with that extension go there, not into this custom folder.",
  settingsTypeCollapsedHint: "{folder} · {count} ext",
  settingsTypeToggleRowAria: "Expand or collapse {name}",

  settingsNavOrganize: "Download folders",
  settingsNavByType: "Folder types",
  settingsNavDownloadAsk: "Ask before saving",
  settingsDownloadAskSectionTitle: "Turn off “Ask where to save”",
  settingsDownloadAskSectionLead:
    "Chrome can ask for a folder before every download. Turn that off so this extension can suggest paths. Opens Chrome’s Download settings in a new tab.",
  settingsDownloadAskOpenButton: "Open Chrome download settings",

  /* Ask-location dialog */
  askLocationTitle: "Reminder: turn off ask-where-to-save",
  askLocationMessage:
    "Chrome may be set to ask where to save each file before downloading. Organizing by date, type or source only works when that option is off.",
  askLocationAlreadyOff: "I've turned it off",
  askLocationOpenSettings: "Open settings",
  askLocationCancel: "Cancel",

  /* Downloads panel header */
  downloadsSearchPlaceholder: "Search files, sources…",
  downloadsSelectedSuffix: "selected",
  downloadsBulkActions: "Actions",
  downloadsBulkEraseHistory: "Remove from history",
  downloadsBulkDeleteFiles: "Delete files and history",
  downloadsNotifications: "Notifications",
  downloadsNoResults: "No matching downloads.",
  downloadsFooterBuiltBy: "Built by",
  downloadsFooterAuthorName: "ThanhBui",
  downloadsFooterAuthorLinkAria: "Open ThanhBui on X",
  downloadsFooterSponsorBefore: "Sponsored by",
  downloadsFooterSponsorBrand: "Extension.vn",
  downloadsFooterSponsorLinkAria: "Visit extension.vn",

  /* Table columns */
  colDescription: "Description",
  colDate: "Date",
  colSize: "Size",
  colType: "Type",
  colStatus: "Status",
  colSource: "Source",
  colActionsSr: "Actions",
  sortByDateTitle: "By date: newest first → oldest first → off",
  sortBySizeTitle: "Sort by size: large → small → small → large → off (flat list while sorting)",
  filterByExtAria: "Filter by file extension",
  filterByExtTitle: "Filter by file type",
  filterByStatusAria: "Filter by file status",
  filterByStatusTitle: "Filter by status",
  filterBySourceAria: "Filter by source",
  filterBySourceTitle: "Filter by domain",

  /* File presence */
  presenceAll: "All",
  presencePresent: "Present on disk",
  presenceRemoved: "Removed from disk",
  presenceDownloading: "Downloading",
  presenceComplete: "Complete",
  presenceDownloadingShort: "Downloading",
  presenceRemovedShort: "Removed",

  /* Format groups */
  formatImage: "Images",
  formatDocument: "Documents",
  formatVideo: "Videos",
  formatCode: "Code",
  formatZip: "Archives",

  /* Filter panels */
  filterAllFormats: "All formats",
  filterNoExtensions: "No extensions in history yet.",
  filterSourceSearchPlaceholder: "Search domains…",
  filterAllSources: "All sources",
  filterNoDomains: "No domains in history yet.",
  filterNoMatchingDomains: "No matching domains.",
  filterSelectedSourcesAria: "Selected sources",
  filterRemoveSource: "Remove {name}",
  filterClearAllSources: "Clear all sources",

  /* Row */
  rowSelectAriaPrefix: "Select",
  rowFileRemovedTitle: "File has been removed from disk",
  rowMoreActions: "More actions",
  rowDownloadingPercent: "Downloading {pct}%",
  rowDownloading: "Downloading",
  rowCloseMenu: "Close menu",
  rowOpenFolder: "Open folder",
  rowEraseHistory: "Remove from history",
  rowDeleteFileAndHistory: "Delete file and history",
  rowFolder: "Folder",

  /* Confirm dialogs */
  confirmEraseHistoryTitle: "Remove from history?",
  confirmDeleteBulkTitle: "Delete several items?",
  confirmDeleteSingleTitle: "Delete this download?",
  confirmEraseHistoryBulkMessage:
    "Removes {count} item(s) from Chrome's download history only. Files on disk are kept.",
  confirmEraseHistorySingleMessage:
    'Removes "{name}" from Chrome\'s download history only. The file on disk is kept.',
  confirmDeleteBulkMessage:
    "Delete {count} selected item(s) from history and from disk (if still present)?",
  confirmDeleteSingleMessage:
    'Delete "{name}" from history and from disk (if still present)?',
  confirmEraseHistoryCta: "Remove from history",
  confirmDelete: "Delete",
  confirmCancel: "Cancel",
  confirmDefault: "Confirm",
  confirmCloseAria: "Close",

  /* Detail panel */
  detailSectionLabel: "Details",
  detailNotFound: "Download not found.",
  detailPathLabel: "Local path",
  detailUrlLabel: "URL",
  detailTagsLabel: "Tags",
  detailAttachmentLabel: "Attachment",
  detailRevealInFolder: "Show in folder",
  detailOpenInFolder: "Open in folder",
  detailOpenUrlNewTab: "Open URL in a new tab",
  detailOpenUrl: "Open URL",
  detailEraseHistoryShort: "Remove history",
  detailEraseHistoryTitle: "Remove from history only",
  detailDeleteFileTitle: "Delete file and history",
  detailClosePanel: "Close panel",
  detailPreviewLoading: "Loading preview…",
  detailPreviewUnavailable: "Image preview is not available.",
  detailPreviewCaption: "Preview",
  detailPreviewCaptionSystemThumb: "Preview (system thumbnail)",
  detailPreviewAlt: "Preview of {name}",

  /* Account / identity */
  accountDefaultName: "Chrome user",
  accountLabelLocal: "Local account",
  accountLabelGoogle: "Google",
  accountLabelChromeSync: "Chrome sync",
  accountIdPrefix: "ID",

  /* Theme + language toggle */
  themeGroupLabel: "Color mode",
  themeDark: "Dark",
  themeLight: "Light",
  langGroupLabel: "Language",
  langEnglish: "English",
  langVietnamese: "Tiếng Việt",
  langEnglishShort: "EN",
  langVietnameseShort: "VI",
} as const;

export type MessageKey = keyof typeof en;

/** Vietnamese translation — typed against `en` so missing/extra keys are compile errors. */
export const vi: Record<MessageKey, string> = {
  appName: "Download Manager",

  navFiles: "Quản lý file",
  navSettings: "Cài đặt",
  navOpenSource: "Mã nguồn mở trên GitHub",
  navAccount: "Tài khoản",

  settingsTitle: "Cài đặt",
  settingsOrganizeSectionTitle: "Cách phân thư mục khi tải",
  settingsOrganizeSectionLead:
    "Chọn cách gợi ý đường dẫn cho file tải mới trong thư mục Tải xuống của Chrome. Đường dẫn luôn nằm trong thư mục đó.",
  settingsOrganizeOptionsAria: "Tuỳ chọn phân thư mục",
  settingsOrganizeAskWarning:
    "Hãy tắt “Hỏi vị trí lưu tệp trước khi tải xuống” trong phần Tải xuống của Chrome nếu bạn vẫn bật.",
  settingsOrganizeOpenChromeBtn: "Mở Cài đặt Tải xuống (Chrome)",
  settingsOrganizeProbing: "Đang kiểm tra cài đặt tải xuống của Chrome…",
  settingsLoading: "Đang tải…",
  settingsBadgeActive: "Đang dùng",
  organizeDefault: "Mặc định",
  organizeByDate: "Theo ngày",
  organizeByType: "Theo loại file",
  organizeBySource: "Theo nguồn",
  organizeDefaultDesc:
    "Giữ cách lưu theo Chrome — extension không thêm thư mục con.",
  organizeByDateDesc: "Mỗi file nằm trong thư mục theo ngày tải (YYYY-MM-DD).",
  organizeByTypeDesc:
    "File được gom vào thư mục theo nhóm loại (hình, tài liệu, video…).",
  organizeBySourceDesc:
    "Mỗi file nằm trong thư mục theo trang web hoặc tên miền nguồn.",

  settingsTypeFoldersSectionTitle: "Thư mục theo loại & đuôi file thêm",
  settingsTypeFoldersSectionLead:
    "Áp dụng khi chọn “Theo loại file”. Nhóm mặc định trước, rồi thư mục tự tạo (theo đuôi), cuối cùng là “Khác”. File nào không khớp nhóm nào ở trên sẽ vào “Khác”. Thẻ có × để tắt đuôi mặc định.",
  settingsTypeFolderNameLabel: "Tên thư mục con",
  settingsTypeExtensionsLabel: "Đuôi file",
  settingsTypeExtensionsEmpty: "Chưa có định dạng (đuôi file) nào được thêm.",
  settingsTypeAddExtPlaceholder: "Đuôi file (vd: zip)",
  settingsTypeAddExtButton: "Thêm",
  settingsTypeRemoveExtAria: "Gỡ đuôi {ext}",
  settingsTypeOtherExtNote:
    "“Khác” là thư mục dự phòng cho file không khớp các nhóm trên. Ở đây chỉ đổi được tên thư mục.",
  settingsTypeResetDefaults: "Khôi phục mặc định",
  settingsTypeCatImage: "Hình ảnh",
  settingsTypeCatVideo: "Video",
  settingsTypeCatDocument: "Tài liệu",
  settingsTypeCatCode: "Mã & văn bản",
  settingsTypeCatSoftware: "Phần mềm & ảnh đĩa",
  settingsTypeCatOther: "Khác",

  settingsTypeCustomSectionTitle: "Thư mục riêng",
  settingsTypeCustomSectionLead:
    "Được xét theo thứ tự danh sách sau các nhóm mặc định và trước “Khác”. Cần ít nhất một đuôi file để file tải được đưa vào đây. Không thêm đuôi vẫn đang thuộc nhóm mặc định — file đó luôn được đưa vào nhóm đó trước.",
  settingsTypeCustomFolderCardLabel: "Thư mục tùy chỉnh",
  settingsTypeAddCustomFolder: "Thêm thư mục",
  settingsTypeCustomFolderDefaultName: "My-folder",
  settingsTypeDeleteCustomFolder: "Xoá thư mục",
  settingsTypeDeleteCustomFolderAria: "Xoá thư mục tùy chỉnh {name}",
  settingsTypeCustomMaxFolders: "Tối đa {max} thư mục tùy chỉnh.",
  settingsTypeCustomExtConflictBuiltin:
    "Đuôi “.{ext}” đã thuộc nhóm mặc định ({groups}) — file có đuôi đó sẽ vào nhóm đó, không vào thư mục tùy chỉnh này.",
  settingsTypeCollapsedHint: "{folder} · {count} đuôi",
  settingsTypeToggleRowAria: "Mở rộng hoặc thu gọn {name}",

  settingsNavOrganize: "Thư mục download",
  settingsNavByType: "Loại thư mục",
  settingsNavDownloadAsk: "Hỏi trước khi lưu",
  settingsDownloadAskSectionTitle: "Tắt “Hỏi vị trí lưu trước khi tải”",
  settingsDownloadAskSectionLead:
    "Chrome có thể hỏi thư mục trước mỗi lần tải. Tắt tùy chọn đó để extension gợi ý đường dẫn. Mở trang Tải xuống trong Cài đặt Chrome (tab mới).",
  settingsDownloadAskOpenButton: "Mở Cài đặt Tải xuống (Chrome)",

  askLocationTitle: "Nhắc tắt hỏi vị trí trước khi lưu",
  askLocationMessage:
    "Chrome có thể đang bật hỏi vị trí lưu trước khi tải. Phân thư mục theo ngày, loại hoặc nguồn chỉ áp dụng được khi tùy chọn đó đã tắt trong Cài đặt Chrome.",
  askLocationAlreadyOff: "Tôi đã tắt",
  askLocationOpenSettings: "Mở cài đặt",
  askLocationCancel: "Huỷ",

  downloadsSearchPlaceholder: "Tìm file, nguồn…",
  downloadsSelectedSuffix: "đã chọn",
  downloadsBulkActions: "Thao tác",
  downloadsBulkEraseHistory: "Xoá khỏi lịch sử",
  downloadsBulkDeleteFiles: "Xoá file và lịch sử",
  downloadsNotifications: "Thông báo",
  downloadsNoResults: "Không có file phù hợp.",
  downloadsFooterBuiltBy: "Xây dựng bởi",
  downloadsFooterAuthorName: "ThanhBui",
  downloadsFooterAuthorLinkAria: "Mở trang ThanhBui trên X",
  downloadsFooterSponsorBefore: "Tài trợ bởi",
  downloadsFooterSponsorBrand: "Extension.vn",
  downloadsFooterSponsorLinkAria: "Truy cập extension.vn",

  colDescription: "Mô tả",
  colDate: "Ngày",
  colSize: "Dung lượng",
  colType: "Loại",
  colStatus: "Trạng thái",
  colSource: "Nguồn",
  colActionsSr: "Thao tác",
  sortByDateTitle: "Theo ngày: mới nhất trước → cũ nhất trước → tắt",
  sortBySizeTitle:
    "Sắp xếp theo dung lượng: lớn → nhỏ → nhỏ → lớn → tắt (khi bật sort: danh sách phẳng)",
  filterByExtAria: "Lọc theo định dạng",
  filterByExtTitle: "Lọc theo loại file",
  filterByStatusAria: "Lọc theo trạng thái file",
  filterByStatusTitle: "Lọc theo trạng thái",
  filterBySourceAria: "Lọc theo nguồn",
  filterBySourceTitle: "Lọc theo tên miền",

  presenceAll: "Tất cả",
  presencePresent: "Còn file trên máy",
  presenceRemoved: "Đã xoá khỏi máy",
  presenceDownloading: "Đang tải",
  presenceComplete: "Hoàn thành",
  presenceDownloadingShort: "Đang tải",
  presenceRemovedShort: "Đã xoá",

  formatImage: "Hình ảnh",
  formatDocument: "Tài liệu",
  formatVideo: "Video",
  formatCode: "Mã nguồn",
  formatZip: "Nén",

  filterAllFormats: "Tất cả định dạng",
  filterNoExtensions: "Chưa có đuôi file trong lịch sử.",
  filterSourceSearchPlaceholder: "Tìm tên miền…",
  filterAllSources: "Mọi nguồn",
  filterNoDomains: "Chưa có tên miền trong lịch sử.",
  filterNoMatchingDomains: "Không có tên miền khớp.",
  filterSelectedSourcesAria: "Nguồn đang lọc",
  filterRemoveSource: "Bỏ {name}",
  filterClearAllSources: "Xoá tất cả nguồn",

  rowSelectAriaPrefix: "Chọn",
  rowFileRemovedTitle: "File đã xoá khỏi máy",
  rowMoreActions: "Thêm thao tác",
  rowDownloadingPercent: "Đang tải {pct}%",
  rowDownloading: "Đang tải",
  rowCloseMenu: "Đóng menu",
  rowOpenFolder: "Mở thư mục",
  rowEraseHistory: "Xoá khỏi lịch sử",
  rowDeleteFileAndHistory: "Xoá file và lịch sử",
  rowFolder: "Thư mục",

  confirmEraseHistoryTitle: "Xoá khỏi lịch sử?",
  confirmDeleteBulkTitle: "Xoá nhiều mục?",
  confirmDeleteSingleTitle: "Xoá mục tải xuống?",
  confirmEraseHistoryBulkMessage:
    "Chỉ xoá {count} mục khỏi danh sách tải xuống của Chrome. File trên máy (nếu còn) không bị xoá.",
  confirmEraseHistorySingleMessage:
    "Chỉ xoá “{name}” khỏi danh sách tải xuống. File trên máy (nếu còn) không bị xoá.",
  confirmDeleteBulkMessage:
    "Xoá {count} mục đã chọn khỏi lịch sử và file trên máy (nếu còn)?",
  confirmDeleteSingleMessage:
    "Xoá “{name}” khỏi lịch sử và file trên máy (nếu còn)?",
  confirmEraseHistoryCta: "Xoá khỏi lịch sử",
  confirmDelete: "Xoá",
  confirmCancel: "Huỷ",
  confirmDefault: "Xác nhận",
  confirmCloseAria: "Đóng",

  detailSectionLabel: "Chi tiết",
  detailNotFound: "Không tìm thấy mục tải xuống.",
  detailPathLabel: "Đường dẫn cục bộ",
  detailUrlLabel: "URL",
  detailTagsLabel: "Thẻ",
  detailAttachmentLabel: "Tệp đính kèm",
  detailRevealInFolder: "Hiện file trong thư mục",
  detailOpenInFolder: "Mở trong thư mục",
  detailOpenUrlNewTab: "Mở URL trong tab mới",
  detailOpenUrl: "Mở URL",
  detailEraseHistoryShort: "Xoá lịch sử",
  detailEraseHistoryTitle: "Chỉ xoá khỏi danh sách tải xuống",
  detailDeleteFileTitle: "Xoá file và lịch sử",
  detailClosePanel: "Đóng panel",
  detailPreviewLoading: "Đang tải xem trước…",
  detailPreviewUnavailable: "Không thể hiển thị xem trước ảnh.",
  detailPreviewCaption: "Xem trước",
  detailPreviewCaptionSystemThumb: "Xem trước (ảnh thu nhỏ hệ thống)",
  detailPreviewAlt: "Xem trước {name}",

  accountDefaultName: "Người dùng Chrome",
  accountLabelLocal: "Tài khoản cục bộ",
  accountLabelGoogle: "Google",
  accountLabelChromeSync: "Đồng bộ Chrome",
  accountIdPrefix: "ID",

  themeGroupLabel: "Chế độ màu",
  themeDark: "Tối",
  themeLight: "Sáng",
  langGroupLabel: "Ngôn ngữ",
  langEnglish: "English",
  langVietnamese: "Tiếng Việt",
  langEnglishShort: "EN",
  langVietnameseShort: "VI",
};

export const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, vi };
