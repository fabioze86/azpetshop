import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { imageIdFor, loadCredentials, uploadImage } from "../../lib/cf-images.mjs";

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

// O ID no Cloudflare Images é o caminho sem extensão: "posts/<cat>/<slug>/<nome>".
export function buildImageId(category, slug, filename) {
  const name = basename(filename, extname(filename));
  return imageIdFor(category, slug, name);
}

export async function uploadFile({
  category,
  slug,
  filename,
  filePath,
  contentType,
  creds = loadCredentials(),
  fetchImpl = fetch,
  readFileImpl = readFile,
}) {
  const id = buildImageId(category, slug, filename);
  const data = await readFileImpl(filePath);
  return uploadImage({ id, data, filename, contentType, creds, fetchImpl });
}
