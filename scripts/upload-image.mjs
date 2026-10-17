// scripts/upload-image.mjs
// Sobe uma imagem local pro Cloudflare Images (ID "posts/<categoria>/<slug>/<nome>")
// e, se for a capa do post, já atualiza o "hero:" (e "heroAlt:") no .mdx correspondente.
// Credenciais: CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_IMAGES_TOKEN em .env.local (ver .env.example).
//
// Capa do post:
//   node scripts/upload-image.mjs --post caes/rottweiler --file ./rottweiler.jpg --hero --alt "Rottweiler deitado no jardim"
//
// Imagem solta (produto, foto dentro do corpo do post etc.) — só sobe e
// devolve a URL + um snippet Markdown pra você colar onde quiser no .mdx:
//   node scripts/upload-image.mjs --post caes/rottweiler --file ./racao-x.jpg --alt "Ração X"
//   node scripts/upload-image.mjs --post caes/rottweiler --file ./racao-x.jpg --alt "Ração X" --name racao-x

import { readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { imageIdFor, loadCredentials, uploadImage } from "./lib/cf-images.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = join(ROOT, "src", "content", "blog");
const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  const args = { hero: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--hero") args.hero = true;
    else if (a === "--post") args.post = argv[++i];
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--alt") args.alt = argv[++i];
    else if (a === "--name") args.name = argv[++i];
  }
  return args;
}

function slugify(str) {
  return str
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function usageAndExit(msg) {
  if (msg) console.error(`Erro: ${msg}\n`);
  console.error(
    "Uso: node scripts/upload-image.mjs --post <categoria>/<slug> --file <caminho> [--hero] [--alt \"texto\"] [--name nome-do-arquivo]",
  );
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.post) usageAndExit("faltou --post <categoria>/<slug>");
  if (!args.file) usageAndExit("faltou --file <caminho local>");

  const mdxPath = join(BLOG_DIR, `${args.post}.mdx`);
  try {
    await access(mdxPath);
  } catch {
    usageAndExit(`post não encontrado: ${mdxPath}`);
  }

  const ext = extname(args.file).toLowerCase();
  const contentType = MIME[ext];
  if (!contentType) usageAndExit(`extensão não suportada: ${ext || "(nenhuma)"}`);

  const fileName = args.hero
    ? `hero${ext}`
    : `${slugify(args.name ?? basename(args.file, ext))}${ext}`;
  const [categoria, slug] = args.post.split("/");
  const id = imageIdFor(categoria, slug, basename(fileName, ext));

  console.log(`Subindo ${args.file} -> Cloudflare Images (${id}) ...`);
  const url = await uploadImage({
    id,
    data: await readFile(args.file),
    filename: fileName,
    contentType,
    creds: loadCredentials(),
  });

  if (args.hero) {
    let content = await readFile(mdxPath, "utf8");

    content = /^hero: ".*"$/m.test(content)
      ? content.replace(/^hero: ".*"$/m, `hero: "${url}"`)
      : content.replace(/^(category: .*)$/m, `$1\nhero: "${url}"`);

    if (args.alt) {
      content = /^heroAlt: ".*"$/m.test(content)
        ? content.replace(/^heroAlt: ".*"$/m, `heroAlt: "${args.alt}"`)
        : content.replace(/^(hero: ".*")$/m, `$1\nheroAlt: "${args.alt}"`);
    }

    await writeFile(mdxPath, content, "utf8");
    console.log(`\n✅ hero de "${args.post}" atualizado para:\n${url}`);
  } else {
    console.log(`\n✅ Upload concluído: ${url}`);
    console.log(`\nCole isso onde quiser no corpo do post:\n![${args.alt ?? ""}](${url})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
