/** Tên đoạn đường dẫn an toàn — tương thích đa nền tảng (Windows / macOS / Linux). */
export function sanitizePathSegment(raw: string): string {
  const t = raw.trim();
  if (!t) return "_";
  const cleaned = t.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/^\.+$/, "_");
  const clipped = cleaned.slice(0, 180);
  return clipped || "_";
}
