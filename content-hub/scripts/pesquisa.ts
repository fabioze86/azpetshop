import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, SelecionadosSchema, DossieContentSchema, type Dossie } from "../lib/schemas.ts";
import { pautaJsonPath, selecionadosJsonPath, dossiesJsonPath } from "../lib/paths.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildDossiePrompt } from "../lib/prompts.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");
  const selecionados = await loadJson(
    selecionadosJsonPath(slug),
    SelecionadosSchema,
    "Edite content/pautas/<slug>/selecionados.json primeiro (copie de candidatos.json e adicione asin/linkAfiliado/angulo).",
  );

  const client = createGeminiClient();
  const dossies: Dossie[] = [];
  for (const selecionado of selecionados) {
    const conteudo = await generateJson(client, buildDossiePrompt(pauta, selecionado), (v) =>
      DossieContentSchema.parse(v),
    );
    dossies.push({ nome: selecionado.nome, ...conteudo });
  }

  const outPath = dossiesJsonPath(slug);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(dossies, null, 2) + "\n", "utf8");
  console.log(`✅ ${dossies.length} dossiê(s) salvos em ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
