// scripts/lib/cf-images.mjs
// Upload de imagens do blog para o Cloudflare Images (imagedelivery.net).
// Usado por scripts/upload-image.mjs e pelo admin (scripts/admin/lib/upload.mjs).
//
// Cada imagem recebe um ID customizado "posts/<categoria>/<slug>/<nome>", então a
// URL é previsível e o reenvio é idempotente (apaga e sobe de novo).
//
// Credenciais (mesma conta do Hub Catálogo), em .env.local ou no ambiente:
//   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_IMAGES_TOKEN
//   CLOUDFLARE_IMAGES_DELIVERY_HASH (opcional; padrão abaixo)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.cloudflare.com/client/v4";
const DEFAULT_DELIVERY_HASH = "7gejTBBL2EU6tOfD2F5Elw";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function imageIdFor(category, slug, name) {
  return `posts/${category}/${slug}/${name}`;
}

export function deliveryUrl(id, { hash, variant = "public" }) {
  return `https://imagedelivery.net/${hash}/${id}/${variant}`;
}

export function parseEnvFile(text) {
  const env = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function readEnvLocal() {
  try {
    return parseEnvFile(readFileSync(join(ROOT, ".env.local"), "utf8"));
  } catch {
    return {};
  }
}

export function loadCredentials(env = { ...readEnvLocal(), ...process.env }) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = env.CLOUDFLARE_IMAGES_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error(
      "Faltam CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_IMAGES_TOKEN (defina em .env.local ou no ambiente; ver .env.example).",
    );
  }
  const hash = env.CLOUDFLARE_IMAGES_DELIVERY_HASH?.trim() || DEFAULT_DELIVERY_HASH;
  return { accountId, token, hash };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function apiError(action, response, body) {
  const detail = (body?.errors ?? []).map((e) => `${e.code}: ${e.message}`).join("; ") || `HTTP ${response.status}`;
  return new Error(`Cloudflare Images (${action}) falhou — ${detail}`);
}

function isConflict(response, body) {
  return response.status === 409 || (body?.errors ?? []).some((e) => e.code === 5409);
}

/**
 * Sobe uma imagem com ID customizado e devolve a URL de entrega. Se o ID já
 * existir, apaga a antiga e envia de novo.
 */
export async function uploadImage({ id, data, filename, contentType, creds, fetchImpl = fetch }) {
  const base = `${API}/accounts/${creds.accountId}/images/v1`;
  const headers = { Authorization: `Bearer ${creds.token}` };

  const send = () => {
    const form = new FormData();
    form.set("id", id);
    form.set("file", new Blob([data], { type: contentType }), filename);
    return fetchImpl(base, { method: "POST", headers, body: form });
  };

  let response = await send();
  let body = await readJson(response);

  if (!response.ok && isConflict(response, body)) {
    const del = await fetchImpl(`${base}/${id}`, { method: "DELETE", headers });
    const delBody = await readJson(del);
    if (!del.ok) throw apiError("apagar existente", del, delBody);
    response = await send();
    body = await readJson(response);
  }

  if (!response.ok || body?.success === false) throw apiError("upload", response, body);
  return deliveryUrl(id, { hash: creds.hash });
}
