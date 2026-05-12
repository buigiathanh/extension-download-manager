import { createWriteStream } from "node:fs";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import archiver from "archiver";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("zip-dist: dist/ not found — run vite build first.");
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const safeName = String(pkg.name).replace(/[^a-zA-Z0-9._-]/g, "-");
const zipDir = join(root, "zip");
mkdirSync(zipDir, { recursive: true });
const zipPath = join(zipDir, `${safeName}-v${pkg.version}.zip`);

const output = createWriteStream(zipPath);
const archive = archiver("zip", { zlib: { level: 9 } });

const finished = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
});

archive.pipe(output);
archive.directory(dist, false);
void archive.finalize();
await finished;

console.log(`zip-dist: ${zipPath} (${archive.pointer()} bytes)`);
