import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { requireArg, hasFlag } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, SelecionadosSchema, DossiesSchema, EscritaResponseSchema } from "../lib/schemas.ts";
import { pautaJsonPath, selecionadosJsonPath, dossiesJsonPath, blogMdxPath, REPO_ROOT } from "../lib/paths.ts";
import { loadKnowledge } from "../lib/knowledge.ts";
import { cdnImageUrl } from "../lib/images.ts";
import { buildEscreverPrompt } from "../lib/prompts.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildFrontmatter, assembleMdx } from "../lib/frontmatter.ts";

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(() => true).catch(() => false);
}

async function main() {
  const argv = process.argv.slice(2);
  const slug = requireArg(argv, "pauta");
  const force = hasFlag(argv, "force");

  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");
  const selecionados = await loadJson(
    selecionadosJsonPath(slug),
    SelecionadosSchema,
    "Edite content/pautas/<slug>/selecionados.json primeiro (copie de candidatos.json e adicione asin/linkAfiliado/angulo).",
  );
  const dossies = await loadJson(
    dossiesJsonPath(slug),
    DossiesSchema,
    `Rode: npm run content:pesquisa -- --pauta=${slug}`,
  );

  const targetPath = blogMdxPath(pauta.categoria, slug);
  if (!force && (await fileExists(targetPath))) {
    throw new Error(`Post já existe em ${targetPath}. Use --force pra sobrescrever.`);
  }

  const imagens = selecionados.map((s) => ({ nome: s.nome, url: cdnImageUrl(pauta.categoria, slug, s.nome) }));
  const knowledge = await loadKnowledge(join(REPO_ROOT, "content-hub", "knowledge"));
  const prompt = buildEscreverPrompt({ pauta, selecionados, dossies, knowledge, imagens });

  const client = createGeminiClient();
  const resultado = await generateJson(client, prompt, (v) => EscritaResponseSchema.parse(v));

  const frontmatter = buildFrontmatter({
    title: resultado.title,
    excerpt: resultado.excerpt,
    categoria: pauta.categoria,
    hero: imagens[0]?.url,
    publishedAt: new Date(),
    produtos: selecionados,
    dossies,
    imagens,
  });
  const mdx = assembleMdx(frontmatter, resultado.body);

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, mdx, "utf8");

  console.log(`✅ Artigo gerado em ${targetPath} (draft: true — revise antes de publicar)`);
  console.log(`\nLembrete: faça upload das imagens reais dos produtos com:`);
  for (const img of imagens) {
    const fileName = img.url.split("/").pop()?.replace(/\.jpg$/, "");
    console.log(
      `  npm run upload-image -- --post ${pauta.categoria}/${slug} --file <arquivo-local> --alt "${img.nome}" --name "${fileName}"`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
