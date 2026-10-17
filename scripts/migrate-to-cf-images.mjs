// scripts/migrate-to-cf-images.mjs
// Migração única das imagens do blog para o Cloudflare Images.
//
//   covers  — capas hoje em https://cdn.azpetshop.com.br/... (R2 fora do ar).
//             Os originais vêm de --src (padrão: capas finais do MarketingOS).
//   wayback — imagens em https://www.azpetshop.com.br/img/... (loja antiga, 404)
//             que ainda existem no Wayback Machine.
//
//   node scripts/migrate-to-cf-images.mjs covers  --dry-run
//   node scripts/migrate-to-cf-images.mjs covers  [--only caes/adotar-um-cachorro]
//   node scripts/migrate-to-cf-images.mjs wayback --dry-run
//   node scripts/migrate-to-cf-images.mjs wayback
//
// Idempotente: reenviar apaga a imagem de mesmo ID e sobe de novo.

import { createHash } from "node:crypto";
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { deliveryUrl, imageIdFor, loadCredentials, uploadImage } from "./lib/cf-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const DEFAULT_SRC = "C:/Projetos/MarketingOS/tmp/azpetshop-capas-template/final";

const args = process.argv.slice(2);
const mode = args[0];
const flag = (name) => args.includes(name);
const opt = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const DRY = flag("--dry-run");
const ONLY = opt("--only");
const SRC = opt("--src") ?? DEFAULT_SRC;

async function listMdx(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listMdx(full)));
    else if (e.name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

const postKey = (file) => relative(BLOG_DIR, file).replace(/\\/g, "/").replace(/\.mdx$/, "");
const exists = (p) => access(p).then(() => true, () => false);

async function covers() {
  const creds = DRY ? null : loadCredentials();
  const hash = creds?.hash ?? "7gejTBBL2EU6tOfD2F5Elw";
  const report = { ok: 0, missing: [], hashMismatch: [] };

  for (const file of (await listMdx(BLOG_DIR)).sort()) {
    const key = postKey(file);
    if (ONLY && key !== ONLY) continue;
    let mdx = await readFile(file, "utf8");
    const m = mdx.match(/^hero: "(https:\/\/cdn\.azpetshop\.com\.br\/[^"]+)"$/m);
    if (!m) continue;

    const [categoria, slug] = key.split("/");
    const local = join(SRC, `${categoria}__${slug}.webp`);
    if (!(await exists(local))) {
      report.missing.push(key);
      continue;
    }

    const data = await readFile(local);
    const sha = createHash("sha1").update(data).digest("hex").slice(0, 8);
    const v = m[1].match(/\?v=([0-9a-f]+)/)?.[1];
    if (v && v !== sha) report.hashMismatch.push(`${key} (R2 tinha v=${v}, local=${sha})`);

    const id = imageIdFor(categoria, slug, "hero");
    const url = deliveryUrl(id, { hash });
    console.log(`${DRY ? "[dry] " : ""}${key} -> ${url}`);
    if (DRY) {
      report.ok += 1;
      continue;
    }
    await uploadImage({ id, data, filename: "hero.webp", contentType: "image/webp", creds });
    await writeFile(file, mdx.replace(m[0], `hero: "${url}"`), "utf8");
    report.ok += 1;
  }

  console.log(`\nCapas ${DRY ? "(simulação) " : ""}migradas: ${report.ok}`);
  if (report.missing.length) console.log(`Sem original local (${report.missing.length}):\n  ${report.missing.join("\n  ")}`);
  if (report.hashMismatch.length)
    console.log(`Arquivo local difere do que subiu ao R2 (${report.hashMismatch.length}):\n  ${report.hashMismatch.join("\n  ")}`);
}

async function waybackSnapshot(url) {
  const r = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}`);
  const j = await r.json();
  const c = j.archived_snapshots?.closest;
  return c?.available && c.status === "200" ? c.timestamp : null;
}

async function wayback() {
  const creds = DRY ? null : loadCredentials();
  const hash = creds?.hash ?? "7gejTBBL2EU6tOfD2F5Elw";
  const files = await listMdx(BLOG_DIR);
  const contents = new Map(await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")])));

  const urls = new Set();
  for (const text of contents.values()) {
    for (const u of text.match(/https:\/\/www\.azpetshop\.com\.br\/img\/[^\s")]+/g) ?? []) urls.add(u);
  }

  const replacements = new Map();
  const unresolved = [];
  for (const url of [...urls].sort()) {
    const ts = await waybackSnapshot(url);
    if (!ts) {
      unresolved.push(url);
      continue;
    }
    const path = new URL(url).pathname.replace(/^\/img\//, "").replace(/\.[a-z0-9]+$/i, "");
    const id = `legacy/${path}`;
    const newUrl = deliveryUrl(id, { hash });
    console.log(`${DRY ? "[dry] " : ""}${url} (snapshot ${ts}) -> ${newUrl}`);
    if (!DRY) {
      const res = await fetch(`https://web.archive.org/web/${ts}id_/${url}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.startsWith("image/") || buf.length === 0) {
        unresolved.push(`${url} (download inválido: HTTP ${res.status}, ${type}, ${buf.length}B)`);
        continue;
      }
      await uploadImage({ id, data: buf, filename: path.split("/").pop(), contentType: type.split(";")[0], creds });
    }
    replacements.set(url, newUrl);
  }

  if (!DRY) {
    for (const [file, text] of contents) {
      let next = text;
      for (const [from, to] of replacements) next = next.split(from).join(to);
      if (next !== text) await writeFile(file, next, "utf8");
    }
  }

  console.log(`\nImagens ${DRY ? "(simulação) " : ""}restauradas do Wayback: ${replacements.size}`);
  if (unresolved.length) console.log(`Sem snapshot/inválidas (${unresolved.length}):\n  ${unresolved.join("\n  ")}`);
}

if (mode === "covers") await covers();
else if (mode === "wayback") await wayback();
else {
  console.error("Uso: node scripts/migrate-to-cf-images.mjs <covers|wayback> [--dry-run] [--only cat/slug] [--src dir]");
  process.exit(1);
}
