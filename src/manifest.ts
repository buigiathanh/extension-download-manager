import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Download Manager",
  version: "1.0.0",
  description: "Quản lý tải xuống Chrome — giao diện tối, lọc và nhóm theo ngày.",
  permissions: [
    "downloads",
    "contextMenus",
    "scripting",
    "tabs",
    "webNavigation",
    "identity",
    "identity.email",
    "storage",
  ],
  host_permissions: ["<all_urls>"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
  action: {
    default_title: "Mở Download Manager",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png",
    },
  },
  options_ui: {
    page: "index.html",
    open_in_tab: true,
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http: blob: file:; connect-src 'self' https: http:; worker-src 'self';",
  },
});
