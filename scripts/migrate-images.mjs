// scripts/migrate-images.mjs
// Baixa as imagens hotlinkadas em https://www.azpetshop.com.br/img/... (hero dos
// posts + imagens inline no corpo) e reenvia para o bucket R2 "azpetshop-images",
// preservando o caminho original como key (img/news/104/000.webp etc).
// Depois disso, troca o domínio nos .mdx: www.azpetshop.com.br/img -> cdn.azpetshop.com.br/img
//
// node scripts/migrate-images.mjs           <- roda tudo
// $env:DRY_RUN="1"; node scripts/migrate-images.mjs   <- só lista o que faria

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const OLD_DOMAIN = "https://www.azpetshop.com.br";
const NEW_DOMAIN = "https://cdn.azpetshop.com.br";
const BUCKET = "azpetshop-images";
const TMP_DIR = join(ROOT, ".tmp-image-migration");
const DRY_RUN = !!process.env.DRY_RUN;

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

async function listMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listMdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

async function main() {
  const files = await listMdxFiles(BLOG_DIR);
  const urlPattern = new RegExp(`${OLD_DOMAIN}/img/[^\\s")]+`, "g");

  const urls = new Set();
  for (const file of files) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(urlPattern)) urls.add(match[0]);
  }

  console.log(`${files.length} posts, ${urls.size} imagens únicas para migrar.\n`);
  if (DRY_RUN) {
    for (const url of urls) console.log(url);
    return;
  }

  await mkdir(TMP_DIR, { recursive: true });

  let ok = 0;
  const failed = [];
  let i = 0;
  for (const url of urls) {
    i++;
    const key = url.slice(`${OLD_DOMAIN}/`.length); // ex: img/news/104/000.webp
    const localPath = join(TMP_DIR, key);
    const ext = extname(key).toLowerCase();
    const contentType = MIME[ext] ?? "application/octet-stream";

    process.stdout.write(`[${i}/${urls.size}] ${key} ... `);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "azpetshop-image-migrator/1.0" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      await mkdir(dirname(localPath), { recursive: true });
      await writeFile(localPath, bytes);

      execFileSync(
        "npx",
        [
          "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
          "--file", localPath,
          "--content-type", contentType,
          "--remote",
          "-y",
        ],
        { cwd: ROOT, stdio: "pipe", shell: true },
      );
      ok++;
      console.log("ok");
    } catch (err) {
      failed.push({ url, key, error: String(err?.message ?? err) });
      console.log(`FALHOU (${String(err?.message ?? err).slice(0, 120)})`);
    }
  }

  console.log(`\n${ok}/${urls.size} imagens migradas para R2.`);
  if (failed.length) {
    console.log(`${failed.length} falharam:`);
    for (const f of failed) console.log(`  - ${f.key}: ${f.error}`);
    console.log("\nAs URLs que falharam NÃO serão trocadas no conteúdo (ficam apontando pro domínio antigo).");
  }

  // Troca o domínio nos .mdx só para as imagens que migraram com sucesso.
  const failedUrls = new Set(failed.map((f) => f.url));
  let filesChanged = 0;
  for (const file of files) {
    const content = await readFile(file, "utf8");
    const updated = content.replace(urlPattern, (match) =>
      failedUrls.has(match) ? match : match.replace(OLD_DOMAIN, NEW_DOMAIN),
    );
    if (updated !== content) {
      await writeFile(file, updated, "utf8");
      filesChanged++;
    }
  }
  console.log(`${filesChanged} arquivos .mdx atualizados para usar ${NEW_DOMAIN}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
