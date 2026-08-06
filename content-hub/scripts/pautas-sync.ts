import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseCsvRecords } from "../lib/csv.ts";
import { PautaSchema, type Pauta } from "../lib/schemas.ts";
import { pautaJsonPath, REPO_ROOT } from "../lib/paths.ts";

export function csvRecordToPauta(record: Record<string, string>): Pauta {
  return PautaSchema.parse({
    slug: record.slug,
    categoria: record.categoria,
    palavraChave: record.palavra_chave,
    tipoProduto: record.tipo_produto,
    prioridade: Number(record.prioridade),
  });
}

async function main() {
  const csvPath = join(REPO_ROOT, "content-hub", "pautas-master.csv");
  const raw = await readFile(csvPath, "utf8");
  const pautas = parseCsvRecords(raw).map(csvRecordToPauta);

  for (const pauta of pautas) {
    const outPath = pautaJsonPath(pauta.slug);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(pauta, null, 2) + "\n", "utf8");
  }

  console.log(`✅ ${pautas.length} pauta(s) sincronizada(s) a partir de ${csvPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
