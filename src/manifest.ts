import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "__MSG_app_name__",
  version: "1.0.0",
  description: "__MSG_app_description__",
  default_locale: "en",
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
    default_title: "__MSG_action_title__",
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
