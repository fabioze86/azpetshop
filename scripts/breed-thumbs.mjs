// Gera as miniaturas dos atalhos de raça da home (public/img/racas/<slug>.webp)
// recortando a foto da raça da capa do artigo. As capas seguem o template
// 1600x1000 com a foto à direita (círculo ou moldura inclinada).
// Uso: node scripts/breed-thumbs.mjs  (rode de novo ao adicionar raça em src/lib/breeds.ts)
import sharp from "sharp";
import fs from "node:fs";

const OUT = "public/img/racas";
const CROP = { left: 990, top: 250, width: 520, height: 520 };

const slugs = [...fs.readFileSync("src/lib/breeds.ts", "utf8").matchAll(/^\s+"?([a-z-]+)"?:/gm)].map((m) => m[1]);
fs.mkdirSync(OUT, { recursive: true });

for (const slug of slugs) {
  const mdx = fs.readFileSync(`src/content/blog/caes/${slug}.mdx`, "utf8");
  const url = mdx.match(/^hero:\s*"([^"]+)"/m)?.[1];
  if (!url) {
    console.warn(`sem hero: ${slug}`);
    continue;
  }
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const { width, height } = await sharp(buf).metadata();
  if (width !== 1600 || height !== 1000) {
    console.warn(`capa fora do template (${width}x${height}): ${slug}`);
    continue;
  }
  await sharp(buf).extract(CROP).resize(160, 160).webp({ quality: 80 }).toFile(`${OUT}/${slug}.webp`);
  console.log(`ok ${slug}`);
}
