import { execFileSync as defaultExecFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const WRANGLER = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
const BUCKET = "azpetshop-images";
const CDN = "https://cdn.azpetshop.com.br";

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export function contentTypeFor(ext) {
  return MIME[ext.toLowerCase()];
}

export function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildKey(category, slug, filename) {
  return `posts/${category}/${slug}/${filename}`;
}

export function buildCdnUrl(key) {
  return `${CDN}/${key}`;
}

export function uploadFile({ category, slug, filename, filePath, contentType, execFileSync = defaultExecFileSync }) {
  const key = buildKey(category, slug, filename);
  execFileSync(
    WRANGLER,
    ["r2", "object", "put", `${BUCKET}/${key}`, "--file", filePath, "--content-type", contentType, "--remote", "-y"],
    { cwd: ROOT, stdio: "inherit" },
  );
  return buildCdnUrl(key);
}
