import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { requireArg } from "../lib/cli.ts";
import { loadJson } from "../lib/store.ts";
import { PautaSchema, CandidatosSchema } from "../lib/schemas.ts";
import { pautaJsonPath, candidatosJsonPath } from "../lib/paths.ts";
import { createGeminiClient, generateJson } from "../lib/gemini.ts";
import { buildCandidatosPrompt } from "../lib/prompts.ts";

async function main() {
  const slug = requireArg(process.argv.slice(2), "pauta");
  const pauta = await loadJson(pautaJsonPath(slug), PautaSchema, "Rode: npm run content:pautas:sync");

  const client = createGeminiClient();
  const candidatos = await generateJson(client, buildCandidatosPrompt(pauta), (v) =>
    CandidatosSchema.parse(v),
  );

  const outPath = candidatosJsonPath(slug);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(candidatos, null, 2) + "\n", "utf8");
  console.log(`✅ ${candidatos.length} candidatos salvos em ${outPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
