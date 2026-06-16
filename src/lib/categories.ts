import { getCollection } from "astro:content";

export const CATEGORY_LABELS: Record<string, string> = {
  caes: "Cães",
  gatos: "Gatos",
  passaros: "Pássaros",
  roedores: "Roedores",
  hamster: "Roedores",
  peixes: "Peixes",
};

export function labelFor(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

// Categorias que realmente existem no conteúdo (gera nav e páginas sem 404).
export async function existingCategories(): Promise<string[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return [...new Set(posts.map((p) => p.data.category))].sort();
}
