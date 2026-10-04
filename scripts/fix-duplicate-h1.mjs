// scripts/fix-duplicate-h1.mjs
// Remove, nos .mdx existentes, o H1 duplicado no início do corpo (o layout
// já renderiza um H1 a partir do frontmatter `title` — ter outro H1 logo no
// começo do corpo gera dois H1 na mesma página).
//
// Não usa gray-matter pra regravar o arquivo: só separa o bloco de
// frontmatter do corpo com uma regex e recola o frontmatter ORIGINAL sem
// reserializar — matter.stringify() reformata YAML (aspas, datas, quebra de
// linha em strings longas) e isso não é o objetivo desta correção.
//
//   node scripts/fix-duplicate-h1.mjs           <- aplica em tudo
//   DRY_RUN=1 node scripts/fix-duplicate-h1.mjs  <- só lista o que mudaria

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripDuplicateH1 } from "./admin/lib/posts.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "src", "content", "blog");
const DRY_RUN = Boolean(process.env.DRY_RUN);
const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;

async function walkMdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walkMdxFiles(full)));
    else if (entry.name.endsWith(".mdx")) files.push(full);
  }
  return files;
}

async function main() {
  const files = await walkMdxFiles(BLOG_DIR);
  let changed = 0;

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const match = raw.match(FRONTMATTER_RE);
    if (!match) {
      console.warn(`aviso: ${path.relative(ROOT, file)} sem bloco de frontmatter reconhecível, pulando`);
      continue;
    }
    const [, frontmatterBlock, body] = match;
    const stripped = stripDuplicateH1(body);
    if (stripped === body) continue;

    changed++;
    const rel = path.relative(ROOT, file);
    if (DRY_RUN) {
      console.log(`[dry-run] removeria H1 duplicado em ${rel}`);
      continue;
    }
    await writeFile(file, frontmatterBlock + stripped, "utf8");
    console.log(`corrigido: ${rel}`);
  }

  console.log(`\n${changed} arquivo(s) ${DRY_RUN ? "seriam alterados" : "alterados"} de ${files.length} total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
