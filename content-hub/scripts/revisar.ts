import { readFile } from "node:fs/promises";
import { join } from "node:path";
import matter from "gray-matter";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema } from "../lib/schemas.ts";
import { pautaJsonPath, blogMdxPath, REPO_ROOT } from "../lib/paths.ts";
import { runChecklist } from "../lib/checklist.ts";
import { loadKnowledge } from "../lib/knowledge.ts";
import { buildRevisaoPrompt } from "../lib/prompts.ts";
import { createGeminiClient } from "../lib/gemini.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");

  const mdxPath = blogMdxPath(pauta.categoria, slug);
  let raw: string;
  try {
    raw = await readFile(mdxPath, "utf8");
  } catch {
    throw new Error(`Post não encontrado: ${mdxPath}\nRode: npm run content:escrever -- --pauta=${slug}`);
  }
  const { data, content } = matter(raw);
  const title = String(data.title ?? "");
  const excerpt = String(data.excerpt ?? "");

  console.log(`\n=== Checklist técnico: ${slug} ===\n`);
  for (const item of runChecklist(title, excerpt, content)) {
    console.log(`${item.ok ? "✅" : "⚠️ "} ${item.label}: ${item.detail}`);
  }

  console.log(`\n=== Crítica editorial (Gemini) ===\n`);
  const knowledge = await loadKnowledge(join(REPO_ROOT, "content-hub", "knowledge"));
  const client = createGeminiClient();
  const critica = await client.generateGrounded(
    buildRevisaoPrompt({ title, excerpt, body: content, knowledge }),
  );
  console.log(critica);
  console.log(`\nLembrete: este relatório não bloqueia a publicação.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
