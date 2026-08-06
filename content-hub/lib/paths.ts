import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// content-hub/lib -> content-hub -> raiz do repo
export const REPO_ROOT = join(HERE, "..", "..");

export function pautaDir(slug: string): string {
  return join(REPO_ROOT, "content", "pautas", slug);
}

export function pautaJsonPath(slug: string): string {
  return join(pautaDir(slug), "pauta.json");
}

export function candidatosJsonPath(slug: string): string {
  return join(pautaDir(slug), "candidatos.json");
}

export function selecionadosJsonPath(slug: string): string {
  return join(pautaDir(slug), "selecionados.json");
}

export function dossiesJsonPath(slug: string): string {
  return join(pautaDir(slug), "dossies.json");
}

export function blogMdxPath(categoria: string, slug: string): string {
  return join(REPO_ROOT, "src", "content", "blog", categoria, `${slug}.mdx`);
}
